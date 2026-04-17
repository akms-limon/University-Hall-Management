import { StatusCodes } from "http-status-codes";
import { Student } from "../models/Student.js";
import { TRANSACTION_STATUS, TRANSACTION_TYPES, Transaction } from "../models/Transaction.js";
import { ApiError } from "../utils/ApiError.js";

const debitTypes = [
  TRANSACTION_TYPES.MEAL_TOKEN,
  TRANSACTION_TYPES.ROOM_FEE,
  TRANSACTION_TYPES.FINE,
];

function toMoney(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return 0;
  return Number(amount.toFixed(2));
}

function toPipelineMatch(studentId) {
  return {
    student: studentId,
    status: TRANSACTION_STATUS.COMPLETED,
  };
}

function createAdjustmentReference() {
  const date = new Date();
  const y = String(date.getUTCFullYear());
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `ADJ-${y}${m}${d}-${suffix}`;
}

export async function summarizeWalletLedger(studentId, { session = null } = {}) {
  const summaryQuery = Transaction.aggregate([
    { $match: toPipelineMatch(studentId) },
    {
      $group: {
        _id: null,
        totalDeposits: {
          $sum: {
            $cond: [{ $eq: ["$transactionType", TRANSACTION_TYPES.DEPOSIT] }, "$amount", 0],
          },
        },
        totalPaid: {
          $sum: {
            $cond: [{ $in: ["$transactionType", debitTypes] }, "$amount", 0],
          },
        },
        totalRefunds: {
          $sum: {
            $cond: [{ $eq: ["$transactionType", TRANSACTION_TYPES.REFUND] }, "$amount", 0],
          },
        },
        totalAdjustmentCredits: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$transactionType", TRANSACTION_TYPES.ADJUSTMENT] },
                  { $ne: ["$metadata.adjustmentDirection", "debit"] },
                ],
              },
              "$amount",
              0,
            ],
          },
        },
        totalAdjustmentDebits: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$transactionType", TRANSACTION_TYPES.ADJUSTMENT] },
                  { $eq: ["$metadata.adjustmentDirection", "debit"] },
                ],
              },
              "$amount",
              0,
            ],
          },
        },
      },
    },
  ]);

  if (session) {
    summaryQuery.session(session);
  }

  const [summaryRows, student] = await Promise.all([
    summaryQuery,
    Student.findById(studentId, { balance: 1 }, { session }).lean(),
  ]);

  if (!student) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Student not found");
  }

  const row = summaryRows?.[0] || {};
  const totalDeposits = toMoney(row.totalDeposits || 0);
  const totalPaid = toMoney(row.totalPaid || 0);
  const totalRefunds = toMoney(row.totalRefunds || 0);
  const totalAdjustmentCredits = toMoney(row.totalAdjustmentCredits || 0);
  const totalAdjustmentDebits = toMoney(row.totalAdjustmentDebits || 0);
  const expectedBalance = toMoney(
    totalDeposits - totalPaid + totalRefunds + totalAdjustmentCredits - totalAdjustmentDebits
  );
  const currentBalance = toMoney(student.balance || 0);

  return {
    totalDeposits,
    totalPaid,
    totalRefunds,
    totalAdjustmentCredits,
    totalAdjustmentDebits,
    expectedBalance,
    currentBalance,
    isConsistent: Math.abs(expectedBalance - currentBalance) <= 0.01,
  };
}

export async function assertWalletConsistency(studentId, { session = null } = {}) {
  const summary = await summarizeWalletLedger(studentId, { session });
  if (summary.isConsistent) {
    return summary;
  }

  throw new ApiError(
    StatusCodes.CONFLICT,
    "Wallet consistency check failed. Expected balance does not match transaction ledger.",
    [
      {
        path: "wallet",
        message: `expectedBalance=${summary.expectedBalance}, currentBalance=${summary.currentBalance}, totalDeposits=${summary.totalDeposits}, totalPaid=${summary.totalPaid}, totalRefunds=${summary.totalRefunds}`,
      },
    ]
  );
}

export async function reconcileWalletConsistency(
  studentId,
  { session = null, processedByUserId = null, reason = "Ledger reconciliation adjustment" } = {}
) {
  const summary = await summarizeWalletLedger(studentId, { session });
  if (summary.isConsistent) {
    return summary;
  }

  const difference = toMoney(summary.currentBalance - summary.expectedBalance);
  const amount = Math.abs(difference);
  if (amount <= 0) {
    return summary;
  }

  const isDebit = difference < 0;
  const balanceBefore = toMoney(
    isDebit ? summary.currentBalance + amount : summary.currentBalance - amount
  );
  const balanceAfter = summary.currentBalance;
  const reference = createAdjustmentReference();

  const [created] = await Transaction.create(
    [{
      student: studentId,
      transactionType: TRANSACTION_TYPES.ADJUSTMENT,
      type: TRANSACTION_TYPES.ADJUSTMENT,
      amount,
      currency: "BDT",
      status: TRANSACTION_STATUS.COMPLETED,
      referenceId: reference,
      paymentMethod: "system",
      provider: "internal_wallet",
      providerReference: reference,
      description: reason,
      balanceBefore,
      balanceAfter,
      processedBy: processedByUserId || null,
      remarks: reason,
      metadata: {
        adjustmentDirection: isDebit ? "debit" : "credit",
        autoReconciled: true,
      },
    }],
    session ? { session } : {}
  );

  const refreshed = await summarizeWalletLedger(studentId, { session });
  if (!refreshed.isConsistent) {
    throw new ApiError(
      StatusCodes.CONFLICT,
      "Wallet reconciliation failed. Ledger is still inconsistent after adjustment.",
      [
        {
          path: "wallet",
          message: `expectedBalance=${refreshed.expectedBalance}, currentBalance=${refreshed.currentBalance}`,
        },
      ]
    );
  }

  return {
    ...refreshed,
    reconciliationTransactionId: created?._id?.toString?.() || null,
  };
}

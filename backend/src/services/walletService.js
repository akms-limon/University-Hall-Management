import { StatusCodes } from "http-status-codes";
import { withMongoTransaction } from "../db/withMongoTransaction.js";
import { env } from "../config/env.js";
import { USER_ROLES } from "../constants/roles.js";
import { MEAL_ORDER_STATUS, MEAL_PAYMENT_STATUS, MEAL_TOKEN_TYPES, MealOrder } from "../models/MealOrder.js";
import {
  PAYMENT_METHODS,
  TRANSACTION_STATUS,
  TRANSACTION_TYPES,
  Transaction,
} from "../models/Transaction.js";
import { Student } from "../models/Student.js";
import { User } from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";
import { addDaysToDateKey, dateFromDateKey, getDateKeyInTimezone } from "../utils/dateInTimezone.js";
import { sanitizeTransaction } from "../utils/sanitizeTransaction.js";
import {
  assertWalletConsistency,
  reconcileWalletConsistency,
  summarizeWalletLedger,
} from "./walletConsistencyService.js";
import { paymentService } from "./paymentService.js";
import { notificationService } from "./notificationService.js";
import { sslcommerzService } from "./sslcommerzService.js";

const studentUserProjection = "name email phone role profilePhoto isActive";
const statusActorProjection = "name email phone role profilePhoto isActive";
const LOW_BALANCE_THRESHOLD = 100;
const mealBusinessTimezone = env.APP_TIMEZONE || "Asia/Dhaka";
const dateKeyPattern = /^\d{4}-\d{2}-\d{2}$/;

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStringOrEmpty(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function startOfDay(dateValue = new Date()) {
  const date = new Date(dateValue);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfDay(dateValue = new Date()) {
  const date = new Date(dateValue);
  date.setHours(23, 59, 59, 999);
  return date;
}

function endOfUtcDay(dateValue = new Date()) {
  const date = new Date(dateValue);
  date.setUTCHours(23, 59, 59, 999);
  return date;
}

function getBusinessDateKey(dateValue = new Date()) {
  return getDateKeyInTimezone(dateValue, mealBusinessTimezone);
}

function normalizeDiningDateKeyInput(value, fallbackDate = new Date()) {
  if (typeof value === "string" && dateKeyPattern.test(value.trim())) {
    return value.trim();
  }

  if (!value) {
    return getBusinessDateKey(fallbackDate);
  }

  return getBusinessDateKey(value);
}

function dateKeyExpression(fieldName) {
  return {
    $dateToString: {
      format: "%Y-%m-%d",
      date: `$${fieldName}`,
      timezone: mealBusinessTimezone,
    },
  };
}

function randomSuffix() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function createReference(prefix) {
  const date = new Date();
  const y = String(date.getUTCFullYear());
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${prefix}-${y}${m}${d}-${randomSuffix()}`;
}

function normalizeTransactionSort(sortBy = "createdAt", sortOrder = "desc") {
  const direction = sortOrder === "asc" ? 1 : -1;
  const mappedPath = {
    createdAt: "createdAt",
    amount: "amount",
    transactionType: "transactionType",
    status: "status",
    paymentMethod: "paymentMethod",
  };
  return { [mappedPath[sortBy] || "createdAt"]: direction, _id: 1 };
}

async function ensureStudentProfile(userId) {
  let student = await Student.findOne({ userId }).populate("userId", studentUserProjection);
  if (student) return student;

  const user = await User.findById(userId);
  if (!user || user.role !== USER_ROLES.STUDENT) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Student profile not found");
  }

  student = await Student.create({
    userId: user._id,
    profilePhoto: user.profilePhoto || "",
  });

  return Student.findById(student._id).populate("userId", studentUserProjection);
}

async function resolveStudentIdsBySearch(search) {
  const searchRegex = new RegExp(escapeRegex(search), "i");
  const [users, studentsByRegistration] = await Promise.all([
    User.find({
      role: USER_ROLES.STUDENT,
      $or: [{ name: searchRegex }, { email: searchRegex }],
    })
      .select("_id")
      .lean(),
    Student.find({ registrationNumber: searchRegex })
      .select("_id userId")
      .lean(),
  ]);

  const userIds = users.map((entry) => entry._id);
  const studentsByUser = userIds.length
    ? await Student.find({ userId: { $in: userIds } }).select("_id").lean()
    : [];

  return Array.from(
    new Set(
      [...studentsByRegistration, ...studentsByUser]
        .map((entry) => entry?._id?.toString?.())
        .filter(Boolean)
    )
  );
}

function buildDateFilters(query) {
  if (!query.from && !query.to) return {};

  return {
    createdAt: {
      ...(query.from ? { $gte: startOfDay(query.from) } : {}),
      ...(query.to ? { $lte: endOfDay(query.to) } : {}),
    },
  };
}

function paymentMethodToProvider(paymentMethod) {
  if (paymentMethod === PAYMENT_METHODS.CASH) return "cash";
  if (paymentMethod === PAYMENT_METHODS.SYSTEM) return "internal_wallet";
  return paymentMethod || "gateway";
}

function resolveSslTranId(payload = {}) {
  return (
    normalizeStringOrEmpty(payload.tran_id) ||
    normalizeStringOrEmpty(payload.tranId) ||
    normalizeStringOrEmpty(payload.referenceId) ||
    normalizeStringOrEmpty(payload.providerReference)
  );
}

function resolveSslPaymentStatus(payload = {}) {
  return normalizeStringOrEmpty(payload.status).toUpperCase();
}

function toMoney(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return 0;
  return Number(amount.toFixed(2));
}

function buildStudentPaymentResultUrl({ status, transactionId = "", referenceId = "", message = "" }) {
  const baseClientUrl = normalizeStringOrEmpty(env.CLIENT_URL).replace(/\/+$/, "");
  if (!baseClientUrl) return "";

  const query = new URLSearchParams({
    ...(transactionId ? { transactionId } : {}),
    ...(referenceId ? { referenceId } : {}),
    ...(message ? { message } : {}),
  });

  const suffix = query.toString() ? `?${query.toString()}` : "";
  return `${baseClientUrl}/student/wallet/payment/${status}${suffix}`;
}

async function loadTransactionByReferenceOrTranId(payload = {}) {
  const transactionId = normalizeStringOrEmpty(payload.transactionId);
  if (transactionId && /^[0-9a-fA-F]{24}$/.test(transactionId)) {
    const byId = await Transaction.findById(transactionId);
    if (byId) return byId;
  }

  const tranId = resolveSslTranId(payload);
  if (!tranId) return null;

  return Transaction.findOne({
    $or: [{ referenceId: tranId }, { providerReference: tranId }],
  });
}

async function createTransactionRecord(payload, session = null) {
  const [created] = await Transaction.create(
    [{
      student: payload.studentId || null,
      mealOrder: payload.mealOrderId || null,
    amount: Number(payload.amount || 0),
    currency: payload.currency || "BDT",
    transactionType: payload.transactionType || TRANSACTION_TYPES.ADJUSTMENT,
    type: payload.transactionType || TRANSACTION_TYPES.ADJUSTMENT,
    description: normalizeString(payload.description),
    referenceId: normalizeString(payload.referenceId),
    paymentMethod: payload.paymentMethod || PAYMENT_METHODS.SYSTEM,
    status: payload.status || TRANSACTION_STATUS.PENDING,
    provider: normalizeString(payload.provider) || paymentMethodToProvider(payload.paymentMethod),
    providerReference: normalizeString(payload.providerReference) || normalizeString(payload.referenceId),
    balanceBefore: Number(payload.balanceBefore || 0),
    balanceAfter: Number(payload.balanceAfter || 0),
    processedBy: payload.processedByUserId || null,
    remarks: normalizeString(payload.remarks),
      metadata: payload.metadata ?? null,
    }],
    session ? { session } : {}
  );

  return created;
}

async function notifyLowBalanceIfRequired(student, actorUserId = null) {
  if (!student?.userId || Number(student.balance || 0) > LOW_BALANCE_THRESHOLD) return;

  try {
    await notificationService.createNotification({
      recipientUserId: student.userId,
      actorUserId,
      type: "wallet_low_balance",
      title: "Low Wallet Balance",
      message: `Your wallet balance is BDT ${Number(student.balance || 0).toFixed(2)}. Please deposit to continue buying tokens.`,
      link: "/student/wallet",
      entityType: "Student",
      entityId: student._id.toString(),
    });
  } catch {
    // Ignore notification failures.
  }
}

async function loadTransactionForStudent(transactionId, studentId) {
  const transaction = await Transaction.findOne({
    _id: transactionId,
    student: studentId,
  })
    .populate({
      path: "student",
      populate: { path: "userId", select: studentUserProjection },
    })
    .populate("processedBy", statusActorProjection);

  if (!transaction) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Transaction not found");
  }

  return transaction;
}

function buildTransactionSummary(transactions = []) {
  return transactions.reduce(
    (summary, transaction) => {
      const amount = Number(transaction.amount || 0);
      summary.totalTransactions += 1;
      if (transaction.status === TRANSACTION_STATUS.COMPLETED) summary.completed += 1;
      if (transaction.status === TRANSACTION_STATUS.PENDING) summary.pending += 1;
      if (transaction.status === TRANSACTION_STATUS.FAILED) summary.failed += 1;
      if (transaction.transactionType === TRANSACTION_TYPES.DEPOSIT && transaction.status === TRANSACTION_STATUS.COMPLETED) {
        summary.totalDeposits += amount;
      }
      if (transaction.transactionType === TRANSACTION_TYPES.MEAL_TOKEN && transaction.status === TRANSACTION_STATUS.COMPLETED) {
        summary.totalMealTokenSpend += amount;
      }
      if (transaction.transactionType === TRANSACTION_TYPES.REFUND && transaction.status === TRANSACTION_STATUS.COMPLETED) {
        summary.totalRefunds += amount;
      }
      return summary;
    },
    {
      totalTransactions: 0,
      completed: 0,
      pending: 0,
      failed: 0,
      totalDeposits: 0,
      totalMealTokenSpend: 0,
      totalRefunds: 0,
    }
  );
}

export const walletService = {
  async deductBalanceForMealToken({
    studentId,
    studentUserId = null,
    amount,
    mealOrderId = null,
    actorUserId = null,
    description = "Meal token purchase",
    remarks = "",
    referenceId = "",
    session = null,
  }) {
    let studentForNotification = null;

    const result = await withMongoTransaction(session, async (activeSession) => {
      await reconcileWalletConsistency(studentId, {
        session: activeSession,
        processedByUserId: actorUserId,
      });

      const tokenAmount = Number(amount || 0);
      if (tokenAmount <= 0) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Token amount must be greater than zero");
      }

      const updatedStudent = await Student.findOneAndUpdate(
        {
          _id: studentId,
          balance: { $gte: tokenAmount },
        },
        {
          $inc: { balance: -tokenAmount },
        },
        { new: true, session: activeSession || undefined }
      );

      if (!updatedStudent) {
        throw new ApiError(StatusCodes.CONFLICT, "Insufficient wallet balance. Please deposit money first.");
      }

      const balanceAfter = Number(updatedStudent.balance || 0);
      const balanceBefore = Number(balanceAfter + tokenAmount);

      const transaction = await createTransactionRecord(
        {
          studentId,
          mealOrderId,
          amount: tokenAmount,
          transactionType: TRANSACTION_TYPES.MEAL_TOKEN,
          description,
          referenceId: referenceId || createReference("MEAL"),
          paymentMethod: PAYMENT_METHODS.SYSTEM,
          status: TRANSACTION_STATUS.COMPLETED,
          provider: "internal_wallet",
          providerReference: referenceId || createReference("MEAL"),
          balanceBefore,
          balanceAfter,
          processedByUserId: actorUserId,
          remarks,
        },
        activeSession
      );

      await assertWalletConsistency(studentId, { session: activeSession });

      studentForNotification = studentUserId
        ? { _id: studentId, userId: studentUserId, balance: balanceAfter }
        : {
            _id: updatedStudent._id,
            userId: updatedStudent.userId,
            balance: balanceAfter,
          };

      return {
        transaction,
        balanceBefore,
        balanceAfter,
      };
    });

    await notifyLowBalanceIfRequired(studentForNotification, actorUserId);
    return result;
  },

  async creditBalance({
    studentId,
    amount,
    transactionType = TRANSACTION_TYPES.REFUND,
    description = "Wallet credit",
    paymentMethod = PAYMENT_METHODS.SYSTEM,
    referenceId = "",
    processedByUserId = null,
    remarks = "",
    mealOrderId = null,
    metadata = null,
    session = null,
  }) {
    return withMongoTransaction(session, async (activeSession) => {
      await reconcileWalletConsistency(studentId, {
        session: activeSession,
        processedByUserId,
      });

      const creditAmount = Number(amount || 0);
      if (creditAmount <= 0) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Credit amount must be greater than zero");
      }

      const updatedStudent = await Student.findByIdAndUpdate(
        studentId,
        {
          $inc: { balance: creditAmount },
        },
        { new: true, session: activeSession || undefined }
      );

      if (!updatedStudent) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Student not found for balance credit");
      }

      const balanceAfter = Number(updatedStudent.balance || 0);
      const balanceBefore = Number(balanceAfter - creditAmount);

      const transaction = await createTransactionRecord(
        {
          studentId,
          mealOrderId,
          amount: creditAmount,
          transactionType,
          description,
          referenceId: referenceId || createReference("CRD"),
          paymentMethod,
          status: TRANSACTION_STATUS.COMPLETED,
          provider: paymentMethodToProvider(paymentMethod),
          providerReference: referenceId || createReference("CRD"),
          balanceBefore,
          balanceAfter,
          processedByUserId,
          remarks,
          metadata,
        },
        activeSession
      );

      await assertWalletConsistency(studentId, { session: activeSession });

      return {
        transaction,
        balanceBefore,
        balanceAfter,
      };
    });
  },

  async getMyBalance(actor) {
    const student = await ensureStudentProfile(actor.id);
    const ledger = await summarizeWalletLedger(student._id);
    return {
      studentId: student._id.toString(),
      balance: Number(student.balance || 0),
      currency: "BDT",
      updatedAt: student.updatedAt,
      ledger,
    };
  },

  async listMyTransactions(actor, query) {
    const student = await ensureStudentProfile(actor.id);
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);
    const skip = (page - 1) * limit;
    const sort = normalizeTransactionSort(query.sortBy, query.sortOrder);

    const filters = {
      student: student._id,
      ...(query.transactionType ? { transactionType: query.transactionType } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.paymentMethod ? { paymentMethod: query.paymentMethod } : {}),
      ...buildDateFilters(query),
    };

    if (query.search) {
      const regex = new RegExp(escapeRegex(query.search), "i");
      filters.$or = [
        { description: regex },
        { referenceId: regex },
        { providerReference: regex },
        { remarks: regex },
      ];
    }

    const [items, total] = await Promise.all([
      Transaction.find(filters)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate({
          path: "student",
          populate: { path: "userId", select: studentUserProjection },
        })
        .populate("processedBy", statusActorProjection),
      Transaction.countDocuments(filters),
    ]);
    const ledger = await summarizeWalletLedger(student._id);

    return {
      items: items.map((entry) => sanitizeTransaction(entry)),
      summary: {
        ...buildTransactionSummary(items),
        currentBalance: Number(student.balance || 0),
        ledger,
      },
      meta: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
        sortBy: query.sortBy || "createdAt",
        sortOrder: query.sortOrder || "desc",
      },
    };
  },

  async createDepositRequest(actor, payload) {
    const student = await ensureStudentProfile(actor.id);
    const amount = Number(payload.amount || 0);
    if (amount <= 0) {
      throw new ApiError(StatusCodes.BAD_REQUEST, "Deposit amount must be greater than zero");
    }

    const referenceId = createReference("DEP");
    const currentBalance = Number(student.balance || 0);

    let transaction = await createTransactionRecord({
      studentId: student._id,
      amount,
      transactionType: TRANSACTION_TYPES.DEPOSIT,
      description: "Wallet deposit initiated",
      referenceId,
      paymentMethod: payload.paymentMethod,
      status: TRANSACTION_STATUS.PENDING,
      provider: paymentMethodToProvider(payload.paymentMethod),
      providerReference: referenceId,
      balanceBefore: currentBalance,
      balanceAfter: currentBalance,
      remarks: payload.remarks || "",
      metadata: {
        initiatedAt: new Date().toISOString(),
      },
    });

    const paymentResult = await paymentService.initializeDepositPayment({
      transaction,
      student: {
        id: student._id.toString(),
        user: student.userId,
      },
      actor,
      paymentMethod: payload.paymentMethod,
      remarks: payload.remarks || "",
    });

    if (paymentResult.status === TRANSACTION_STATUS.COMPLETED) {
      transaction = await this.completeDepositTransaction(transaction._id, {
        providerReference: paymentResult.providerReference,
        provider: paymentResult.provider,
        remarks: paymentResult.message,
        metadata: paymentResult.raw,
      });
    } else if (paymentResult.status === TRANSACTION_STATUS.FAILED) {
      transaction = await this.failDepositTransaction(transaction._id, {
        providerReference: paymentResult.providerReference,
        provider: paymentResult.provider,
        remarks: paymentResult.message,
        metadata: paymentResult.raw,
      });
    } else {
      transaction.provider = paymentResult.provider || transaction.provider;
      transaction.providerReference = paymentResult.providerReference || transaction.providerReference;
      transaction.referenceId = transaction.referenceId || paymentResult.providerReference || referenceId;
      transaction.remarks = paymentResult.message || transaction.remarks;
      transaction.metadata = {
        ...(transaction.metadata || {}),
        paymentUrl: paymentResult.paymentUrl || "",
        gatewayResponse: paymentResult.raw || null,
      };
      await transaction.save();
    }

    const refreshed = await loadTransactionForStudent(transaction._id, student._id);
    return {
      transaction: sanitizeTransaction(refreshed),
      payment: {
        status: paymentResult.status,
        provider: paymentResult.provider,
        providerReference: paymentResult.providerReference,
        paymentUrl: paymentResult.paymentUrl || "",
        message: paymentResult.message || "",
      },
    };
  },

  async completeDepositTransaction(transactionId, payload = {}, actorUserId = null, { session = null } = {}) {
    let notifyRecipientUserId = null;
    let shouldNotify = false;

    const transaction = await withMongoTransaction(session, async (activeSession) => {
      let existing = await Transaction.findById(transactionId, null, { session: activeSession || undefined });
      if (!existing) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Deposit transaction not found");
      }

      if (existing.transactionType !== TRANSACTION_TYPES.DEPOSIT) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Transaction is not a deposit");
      }

      if (existing.status !== TRANSACTION_STATUS.PENDING) {
        return existing;
      }

      await reconcileWalletConsistency(existing.student, {
        session: activeSession,
        processedByUserId: actorUserId,
      });

      const claimed = await Transaction.findOneAndUpdate(
        {
          _id: existing._id,
          status: TRANSACTION_STATUS.PENDING,
        },
        {
          $set: {
            status: TRANSACTION_STATUS.COMPLETED,
            provider: normalizeString(payload.provider) || existing.provider,
            providerReference: normalizeString(payload.providerReference) || existing.providerReference,
            referenceId:
              normalizeString(payload.referenceId) ||
              existing.referenceId ||
              normalizeString(payload.providerReference) ||
              existing.providerReference,
            remarks: normalizeString(payload.remarks) || existing.remarks,
            processedBy: actorUserId || existing.processedBy || null,
            metadata: {
              ...(existing.metadata || {}),
              callbackPayload: payload.metadata || null,
            },
          },
        },
        { new: true, session: activeSession || undefined }
      );

      if (!claimed) {
        existing = await Transaction.findById(transactionId, null, { session: activeSession || undefined });
        return existing;
      }

      const updatedStudent = await Student.findByIdAndUpdate(
        claimed.student,
        {
          $inc: { balance: Number(claimed.amount || 0) },
        },
        { new: true, session: activeSession || undefined }
      );

      if (!updatedStudent) {
        claimed.status = TRANSACTION_STATUS.FAILED;
        claimed.remarks = "Student profile not found while processing deposit";
        await claimed.save({ session: activeSession || undefined });
        throw new ApiError(StatusCodes.NOT_FOUND, "Student profile not found");
      }

      claimed.balanceAfter = Number(updatedStudent.balance || 0);
      claimed.balanceBefore = Number(claimed.balanceAfter - Number(claimed.amount || 0));
      await claimed.save({ session: activeSession || undefined });

      await assertWalletConsistency(claimed.student, { session: activeSession });

      notifyRecipientUserId = updatedStudent.userId?.toString?.() || updatedStudent.userId || null;
      shouldNotify = true;
      return claimed;
    });

    if (shouldNotify && notifyRecipientUserId) {
      try {
        await notificationService.createNotification({
          recipientUserId: notifyRecipientUserId,
          actorUserId: actorUserId || null,
          type: "wallet_deposit_success",
          title: "Deposit Successful",
          message: `BDT ${Number(transaction.amount || 0).toFixed(2)} has been added to your wallet.`,
          link: "/student/wallet",
          entityType: "Transaction",
          entityId: transaction._id.toString(),
        });
      } catch {
        // Ignore notification errors.
      }
    }

    return transaction;
  },

  async failDepositTransaction(transactionId, payload = {}, actorUserId = null, { session = null } = {}) {
    let notifyRecipientUserId = null;
    let shouldNotify = false;

    const transaction = await withMongoTransaction(session, async (activeSession) => {
      const tx = await Transaction.findById(transactionId, null, { session: activeSession || undefined });
      if (!tx) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Deposit transaction not found");
      }

      if (tx.transactionType !== TRANSACTION_TYPES.DEPOSIT) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Transaction is not a deposit");
      }

      if (tx.status !== TRANSACTION_STATUS.PENDING) {
        return tx;
      }

      tx.status = TRANSACTION_STATUS.FAILED;
      tx.provider = normalizeString(payload.provider) || tx.provider;
      tx.providerReference = normalizeString(payload.providerReference) || tx.providerReference;
      tx.referenceId =
        normalizeString(payload.referenceId) ||
        tx.referenceId ||
        normalizeString(payload.providerReference) ||
        tx.providerReference;
      tx.remarks = normalizeString(payload.remarks) || "Deposit payment failed";
      tx.processedBy = actorUserId || tx.processedBy || null;
      tx.metadata = {
        ...(tx.metadata || {}),
        callbackPayload: payload.metadata || null,
      };
      await tx.save({ session: activeSession || undefined });

      const student = await Student.findById(tx.student, { userId: 1 }, { session: activeSession || undefined }).lean();
      notifyRecipientUserId = student?.userId?.toString?.() || student?.userId || null;
      shouldNotify = true;
      return tx;
    });

    if (shouldNotify && notifyRecipientUserId) {
      try {
        await notificationService.createNotification({
          recipientUserId: notifyRecipientUserId,
          actorUserId: actorUserId || null,
          type: "wallet_deposit_failed",
          title: "Deposit Failed",
          message: `Your wallet deposit of BDT ${Number(transaction.amount || 0).toFixed(2)} could not be completed.`,
          link: "/student/wallet/deposit",
          entityType: "Transaction",
          entityId: transaction._id.toString(),
        });
      } catch {
        // Ignore notification errors.
      }
    }

    return transaction;
  },

  async getMyDepositStatus(actor, transactionId) {
    const student = await ensureStudentProfile(actor.id);
    const transaction = await loadTransactionForStudent(transactionId, student._id);
    if (transaction.transactionType !== TRANSACTION_TYPES.DEPOSIT) {
      throw new ApiError(StatusCodes.BAD_REQUEST, "Transaction is not a deposit");
    }

    return sanitizeTransaction(transaction);
  },

  async handleDepositCallback(payload, callbackSecret = "") {
    if (!paymentService.verifyCallbackSecret(callbackSecret)) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, "Invalid payment callback secret");
    }

    const transactionId = normalizeString(payload.transactionId);
    const referenceId = normalizeString(payload.referenceId);
    const providerReference = normalizeString(payload.providerReference);

    let transaction = null;
    if (transactionId) {
      transaction = await Transaction.findById(transactionId);
    }

    if (!transaction && (referenceId || providerReference)) {
      transaction = await Transaction.findOne({
        $or: [
          ...(referenceId ? [{ referenceId }] : []),
          ...(providerReference ? [{ providerReference }] : []),
        ],
      });
    }

    if (!transaction) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Deposit transaction not found");
    }

    const callbackStatus = paymentService.normalizeCallbackStatus(payload.status);

    if (callbackStatus === TRANSACTION_STATUS.COMPLETED) {
      const completed = await this.completeDepositTransaction(transaction._id, {
        provider: payload.provider,
        providerReference: providerReference || referenceId,
        referenceId: referenceId || providerReference,
        remarks: payload.message || "Deposit completed from callback",
        metadata: payload,
      });
      return sanitizeTransaction(completed);
    }

    if (callbackStatus === TRANSACTION_STATUS.FAILED) {
      const failed = await this.failDepositTransaction(transaction._id, {
        provider: payload.provider,
        providerReference: providerReference || referenceId,
        referenceId: referenceId || providerReference,
        remarks: payload.message || "Deposit failed from callback",
        metadata: payload,
      });
      return sanitizeTransaction(failed);
    }

    if (transaction.status === TRANSACTION_STATUS.PENDING) {
      transaction.provider = normalizeString(payload.provider) || transaction.provider;
      transaction.providerReference = providerReference || transaction.providerReference;
      transaction.referenceId = referenceId || transaction.referenceId;
      transaction.remarks = normalizeString(payload.message) || transaction.remarks;
      transaction.metadata = {
        ...(transaction.metadata || {}),
        callbackPayload: payload,
      };
      await transaction.save();
    }

    return sanitizeTransaction(transaction);
  },

  async processSslCommerzSuccess(payload = {}) {
    const transaction = await loadTransactionByReferenceOrTranId(payload);
    if (!transaction) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Deposit transaction not found for SSLCommerz callback");
    }

    if (transaction.transactionType !== TRANSACTION_TYPES.DEPOSIT) {
      throw new ApiError(StatusCodes.BAD_REQUEST, "Transaction is not a deposit");
    }

    if (transaction.status === TRANSACTION_STATUS.COMPLETED) {
      return sanitizeTransaction(transaction);
    }

    const tranId = resolveSslTranId(payload) || transaction.referenceId;
    const valId = normalizeStringOrEmpty(payload.val_id || payload.valId);
    const validation = await sslcommerzService.validatePayment({ valId, tranId });

    if (!validation.isValid) {
      const failed = await this.failDepositTransaction(transaction._id, {
        provider: "sslcommerz",
        providerReference: normalizeStringOrEmpty(payload.bank_tran_id) || transaction.providerReference,
        referenceId: tranId,
        remarks: validation.message || "SSLCommerz payment validation failed",
        metadata: {
          callbackPayload: payload,
          validation,
        },
      });
      return sanitizeTransaction(failed);
    }

    const expectedAmount = toMoney(transaction.amount);
    const paidAmount = toMoney(payload.amount || validation.amount);
    if (expectedAmount > 0 && paidAmount > 0 && expectedAmount !== paidAmount) {
      const failed = await this.failDepositTransaction(transaction._id, {
        provider: "sslcommerz",
        providerReference: normalizeStringOrEmpty(payload.bank_tran_id) || transaction.providerReference,
        referenceId: tranId,
        remarks: "Amount mismatch detected during SSLCommerz verification",
        metadata: {
          callbackPayload: payload,
          validation,
          expectedAmount,
          paidAmount,
        },
      });
      return sanitizeTransaction(failed);
    }

    const completed = await this.completeDepositTransaction(transaction._id, {
      provider: "sslcommerz",
      providerReference: normalizeStringOrEmpty(payload.bank_tran_id) || validation.bankTranId || transaction.providerReference,
      referenceId: validation.tranId || tranId,
      remarks: "Deposit completed from SSLCommerz",
      metadata: {
        callbackPayload: payload,
        validation,
      },
    });

    return sanitizeTransaction(completed);
  },

  async processSslCommerzFailed(payload = {}, { cancelled = false } = {}) {
    const transaction = await loadTransactionByReferenceOrTranId(payload);
    if (!transaction) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Deposit transaction not found for SSLCommerz callback");
    }

    if (transaction.transactionType !== TRANSACTION_TYPES.DEPOSIT) {
      throw new ApiError(StatusCodes.BAD_REQUEST, "Transaction is not a deposit");
    }

    if (transaction.status === TRANSACTION_STATUS.COMPLETED) {
      return sanitizeTransaction(transaction);
    }

    const failed = await this.failDepositTransaction(transaction._id, {
      provider: "sslcommerz",
      providerReference: normalizeStringOrEmpty(payload.bank_tran_id) || transaction.providerReference,
      referenceId: resolveSslTranId(payload) || transaction.referenceId,
      remarks: cancelled ? "Deposit cancelled on SSLCommerz page" : "Deposit failed on SSLCommerz page",
      metadata: {
        callbackPayload: payload,
        cancelled,
      },
    });

    return sanitizeTransaction(failed);
  },

  async handleSslCommerzGatewayReturn(kind, payload = {}) {
    const normalizedKind = normalizeStringOrEmpty(kind).toLowerCase();

    let transaction = null;
    let status = "pending";
    let message = "Payment status is pending";

    if (normalizedKind === "success" || resolveSslPaymentStatus(payload) === "VALID") {
      transaction = await this.processSslCommerzSuccess(payload);
      status = transaction.status === TRANSACTION_STATUS.COMPLETED ? "success" : "fail";
      message =
        status === "success"
          ? "Wallet deposit completed successfully."
          : "Payment could not be validated. Please contact support.";
    } else if (normalizedKind === "cancel") {
      transaction = await this.processSslCommerzFailed(payload, { cancelled: true });
      status = "cancel";
      message = "Payment was cancelled.";
    } else {
      transaction = await this.processSslCommerzFailed(payload, { cancelled: false });
      status = "fail";
      message = "Payment failed.";
    }

    const redirectUrl = buildStudentPaymentResultUrl({
      status,
      transactionId: transaction?.id || "",
      referenceId: transaction?.referenceId || resolveSslTranId(payload),
      message,
    });

    return {
      transaction,
      status,
      message,
      redirectUrl,
    };
  },

  async handleSslCommerzIpn(payload = {}) {
    const status = resolveSslPaymentStatus(payload);

    if (["VALID", "VALIDATED", "SUCCESS"].includes(status)) {
      const transaction = await this.processSslCommerzSuccess(payload);
      return {
        acknowledged: true,
        status: "success",
        transaction,
      };
    }

    const transaction = await this.processSslCommerzFailed(payload, {
      cancelled: status === "CANCELLED" || status === "CANCELED",
    });
    return {
      acknowledged: true,
      status: status === "CANCELLED" || status === "CANCELED" ? "cancel" : "fail",
      transaction,
    };
  },

  async getDiningTodaySummary(query) {
    const targetDateKey = normalizeDiningDateKeyInput(query.date, new Date());
    const targetDate = dateFromDateKey(targetDateKey);
    const match = {
      $expr: {
        $eq: [dateKeyExpression("validDate"), targetDateKey],
      },
      paymentStatus: MEAL_PAYMENT_STATUS.PAID,
      status: { $ne: MEAL_ORDER_STATUS.CANCELLED },
    };

    const [summaryRows] = await Promise.all([
      MealOrder.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalTokens: { $sum: 1 },
            breakfastCount: {
              $sum: {
                $cond: [{ $eq: ["$mealType", MEAL_TOKEN_TYPES.BREAKFAST] }, 1, 0],
              },
            },
            lunchCount: {
              $sum: {
                $cond: [{ $eq: ["$mealType", MEAL_TOKEN_TYPES.LUNCH] }, 1, 0],
              },
            },
            dinnerCount: {
              $sum: {
                $cond: [{ $eq: ["$mealType", MEAL_TOKEN_TYPES.DINNER] }, 1, 0],
              },
            },
            totalAmount: { $sum: "$amount" },
            consumedCount: {
              $sum: {
                $cond: [{ $eq: ["$status", MEAL_ORDER_STATUS.CONSUMED] }, 1, 0],
              },
            },
            notEatenCount: {
              $sum: {
                $cond: [{ $eq: ["$status", MEAL_ORDER_STATUS.NOT_EATEN] }, 1, 0],
              },
            },
            remainingCount: {
              $sum: {
                $cond: [{ $eq: ["$status", MEAL_ORDER_STATUS.ACTIVE] }, 1, 0],
              },
            },
          },
        },
      ]),
    ]);

    const summary = summaryRows?.[0] || {};
    return {
      date: targetDate,
      summary: {
        totalTokens: summary.totalTokens || 0,
        breakfastCount: summary.breakfastCount || 0,
        lunchCount: summary.lunchCount || 0,
        dinnerCount: summary.dinnerCount || 0,
        totalAmount: Number(summary.totalAmount || 0),
        consumedCount: summary.consumedCount || 0,
        notEatenCount: summary.notEatenCount || 0,
        remainingCount: summary.remainingCount || 0,
      },
    };
  },

  async getDiningDateSummary(query) {
    const toDateKey = normalizeDiningDateKeyInput(query.to, new Date());
    const fromDateKey = normalizeDiningDateKeyInput(
      query.from,
      dateFromDateKey(addDaysToDateKey(toDateKey, -6))
    );

    const rows = await MealOrder.aggregate([
      {
        $match: {
          $expr: {
            $and: [
              { $gte: [dateKeyExpression("validDate"), fromDateKey] },
              { $lte: [dateKeyExpression("validDate"), toDateKey] },
            ],
          },
          paymentStatus: MEAL_PAYMENT_STATUS.PAID,
          status: { $ne: MEAL_ORDER_STATUS.CANCELLED },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$validDate",
              timezone: mealBusinessTimezone,
            },
          },
          totalTokens: { $sum: 1 },
          breakfastCount: {
            $sum: {
              $cond: [{ $eq: ["$mealType", MEAL_TOKEN_TYPES.BREAKFAST] }, 1, 0],
            },
          },
          lunchCount: {
            $sum: {
              $cond: [{ $eq: ["$mealType", MEAL_TOKEN_TYPES.LUNCH] }, 1, 0],
            },
          },
          dinnerCount: {
            $sum: {
              $cond: [{ $eq: ["$mealType", MEAL_TOKEN_TYPES.DINNER] }, 1, 0],
            },
          },
          totalAmount: { $sum: "$amount" },
          consumedCount: {
            $sum: {
              $cond: [{ $eq: ["$status", MEAL_ORDER_STATUS.CONSUMED] }, 1, 0],
            },
          },
          notEatenCount: {
            $sum: {
              $cond: [{ $eq: ["$status", MEAL_ORDER_STATUS.NOT_EATEN] }, 1, 0],
            },
          },
          remainingCount: {
            $sum: {
              $cond: [{ $eq: ["$status", MEAL_ORDER_STATUS.ACTIVE] }, 1, 0],
            },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return {
      range: {
        from: dateFromDateKey(fromDateKey),
        to: endOfUtcDay(dateFromDateKey(toDateKey)),
      },
      items: rows.map((row) => ({
        date: row._id,
        totalTokens: row.totalTokens || 0,
        breakfastCount: row.breakfastCount || 0,
        lunchCount: row.lunchCount || 0,
        dinnerCount: row.dinnerCount || 0,
        totalAmount: Number(row.totalAmount || 0),
        consumedCount: row.consumedCount || 0,
        notEatenCount: row.notEatenCount || 0,
        remainingCount: row.remainingCount || 0,
      })),
    };
  },

  async listProvostTransactions(query) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 25);
    const skip = (page - 1) * limit;
    const sort = normalizeTransactionSort(query.sortBy, query.sortOrder);

    const filters = {
      ...(query.transactionType ? { transactionType: query.transactionType } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.paymentMethod ? { paymentMethod: query.paymentMethod } : {}),
      ...(query.studentId ? { student: query.studentId } : {}),
      ...buildDateFilters(query),
    };

    if (query.search) {
      const regex = new RegExp(escapeRegex(query.search), "i");
      const matchedStudentIds = await resolveStudentIdsBySearch(query.search);
      filters.$or = [
        { description: regex },
        { referenceId: regex },
        { providerReference: regex },
        { remarks: regex },
        ...(matchedStudentIds.length ? [{ student: { $in: matchedStudentIds } }] : []),
      ];
    }

    const [items, total, summaryRows, byTypeRows] = await Promise.all([
      Transaction.find(filters)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate({
          path: "student",
          populate: { path: "userId", select: studentUserProjection },
        })
        .populate("processedBy", statusActorProjection),
      Transaction.countDocuments(filters),
      Transaction.aggregate([
        { $match: filters },
        {
          $group: {
            _id: null,
            totalTransactions: { $sum: 1 },
            completed: {
              $sum: {
                $cond: [{ $eq: ["$status", TRANSACTION_STATUS.COMPLETED] }, 1, 0],
              },
            },
            pending: {
              $sum: {
                $cond: [{ $eq: ["$status", TRANSACTION_STATUS.PENDING] }, 1, 0],
              },
            },
            failed: {
              $sum: {
                $cond: [{ $eq: ["$status", TRANSACTION_STATUS.FAILED] }, 1, 0],
              },
            },
            totalAmount: {
              $sum: {
                $cond: [{ $eq: ["$status", TRANSACTION_STATUS.COMPLETED] }, "$amount", 0],
              },
            },
            totalDeposits: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$transactionType", TRANSACTION_TYPES.DEPOSIT] },
                      { $eq: ["$status", TRANSACTION_STATUS.COMPLETED] },
                    ],
                  },
                  "$amount",
                  0,
                ],
              },
            },
            totalTokenSales: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$transactionType", TRANSACTION_TYPES.MEAL_TOKEN] },
                      { $eq: ["$status", TRANSACTION_STATUS.COMPLETED] },
                    ],
                  },
                  "$amount",
                  0,
                ],
              },
            },
            totalRefunds: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$transactionType", TRANSACTION_TYPES.REFUND] },
                      { $eq: ["$status", TRANSACTION_STATUS.COMPLETED] },
                    ],
                  },
                  "$amount",
                  0,
                ],
              },
            },
          },
        },
      ]),
      Transaction.aggregate([
        { $match: filters },
        {
          $group: {
            _id: "$transactionType",
            count: { $sum: 1 },
            amount: {
              $sum: {
                $cond: [{ $eq: ["$status", TRANSACTION_STATUS.COMPLETED] }, "$amount", 0],
              },
            },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const summary = summaryRows?.[0] || {
      totalTransactions: 0,
      completed: 0,
      pending: 0,
      failed: 0,
      totalAmount: 0,
      totalDeposits: 0,
      totalTokenSales: 0,
      totalRefunds: 0,
    };

    return {
      items: items.map((entry) => sanitizeTransaction(entry)),
      summary: {
        totalTransactions: summary.totalTransactions || 0,
        completed: summary.completed || 0,
        pending: summary.pending || 0,
        failed: summary.failed || 0,
        totalAmount: Number(summary.totalAmount || 0),
        totalDeposits: Number(summary.totalDeposits || 0),
        totalTokenSales: Number(summary.totalTokenSales || 0),
        totalRefunds: Number(summary.totalRefunds || 0),
        byType: byTypeRows.map((entry) => ({
          transactionType: entry._id,
          count: entry.count || 0,
          amount: Number(entry.amount || 0),
        })),
      },
      meta: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
        sortBy: query.sortBy || "createdAt",
        sortOrder: query.sortOrder || "desc",
      },
    };
  },

  async getProvostFinancialSummary(query) {
    const toDate = query.to || new Date();
    const fromDate =
      query.from || new Date(new Date(toDate).getTime() - 29 * 24 * 60 * 60 * 1000);

    const match = {
      createdAt: {
        $gte: startOfDay(fromDate),
        $lte: endOfDay(toDate),
      },
    };

    const [overviewRows, dailyRows] = await Promise.all([
      Transaction.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalDeposits: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$transactionType", TRANSACTION_TYPES.DEPOSIT] },
                      { $eq: ["$status", TRANSACTION_STATUS.COMPLETED] },
                    ],
                  },
                  "$amount",
                  0,
                ],
              },
            },
            totalTokenSales: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$transactionType", TRANSACTION_TYPES.MEAL_TOKEN] },
                      { $eq: ["$status", TRANSACTION_STATUS.COMPLETED] },
                    ],
                  },
                  "$amount",
                  0,
                ],
              },
            },
            totalRefunds: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$transactionType", TRANSACTION_TYPES.REFUND] },
                      { $eq: ["$status", TRANSACTION_STATUS.COMPLETED] },
                    ],
                  },
                  "$amount",
                  0,
                ],
              },
            },
            pendingTransactions: {
              $sum: {
                $cond: [{ $eq: ["$status", TRANSACTION_STATUS.PENDING] }, 1, 0],
              },
            },
            failedTransactions: {
              $sum: {
                $cond: [{ $eq: ["$status", TRANSACTION_STATUS.FAILED] }, 1, 0],
              },
            },
          },
        },
      ]),
      Transaction.aggregate([
        { $match: match },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            depositAmount: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$transactionType", TRANSACTION_TYPES.DEPOSIT] },
                      { $eq: ["$status", TRANSACTION_STATUS.COMPLETED] },
                    ],
                  },
                  "$amount",
                  0,
                ],
              },
            },
            tokenSalesAmount: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$transactionType", TRANSACTION_TYPES.MEAL_TOKEN] },
                      { $eq: ["$status", TRANSACTION_STATUS.COMPLETED] },
                    ],
                  },
                  "$amount",
                  0,
                ],
              },
            },
            refundAmount: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$transactionType", TRANSACTION_TYPES.REFUND] },
                      { $eq: ["$status", TRANSACTION_STATUS.COMPLETED] },
                    ],
                  },
                  "$amount",
                  0,
                ],
              },
            },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const overview = overviewRows?.[0] || {
      totalDeposits: 0,
      totalTokenSales: 0,
      totalRefunds: 0,
      pendingTransactions: 0,
      failedTransactions: 0,
    };

    const netRevenue =
      Number(overview.totalTokenSales || 0) - Number(overview.totalRefunds || 0);

    return {
      range: {
        from: startOfDay(fromDate),
        to: endOfDay(toDate),
      },
      overview: {
        totalDeposits: Number(overview.totalDeposits || 0),
        totalTokenSales: Number(overview.totalTokenSales || 0),
        totalRefunds: Number(overview.totalRefunds || 0),
        netRevenue: Number(netRevenue || 0),
        pendingTransactions: overview.pendingTransactions || 0,
        failedTransactions: overview.failedTransactions || 0,
      },
      dailyRevenue: dailyRows.map((row) => ({
        date: row._id,
        totalDeposits: Number(row.depositAmount || 0),
        totalTokenSales: Number(row.tokenSalesAmount || 0),
        totalRefunds: Number(row.refundAmount || 0),
        netRevenue: Number((row.tokenSalesAmount || 0) - (row.refundAmount || 0)),
      })),
    };
  },
};

import { sanitizeStudent } from "./sanitizeStudent.js";
import { sanitizeUser } from "./sanitizeUser.js";

function toNullableString(value) {
  if (value === null || value === undefined) {
    return null;
  }

  return String(value);
}

function sanitizeStudentSnapshot(studentValue) {
  if (!studentValue || typeof studentValue !== "object") {
    return null;
  }

  return sanitizeStudent(studentValue);
}

function sanitizeUserSnapshot(userValue) {
  if (!userValue || typeof userValue !== "object") {
    return null;
  }

  return sanitizeUser(userValue);
}

export function sanitizeTransaction(transactionDocument) {
  const transaction = transactionDocument?.toObject
    ? transactionDocument.toObject()
    : transactionDocument;

  const student = sanitizeStudentSnapshot(transaction?.student);
  const processedBy = sanitizeUserSnapshot(transaction?.processedBy);

  return {
    id: transaction?._id?.toString?.() || transaction?.id,
    studentId: student?.id || toNullableString(transaction?.student),
    student,
    mealOrderId: toNullableString(transaction?.mealOrder),
    amount: Number.isFinite(transaction?.amount) ? transaction.amount : 0,
    currency: transaction?.currency || "BDT",
    transactionType: transaction?.transactionType || transaction?.type || "adjustment",
    type: transaction?.transactionType || transaction?.type || "adjustment",
    description: transaction?.description || "",
    referenceId: transaction?.referenceId || transaction?.providerReference || "",
    paymentMethod: transaction?.paymentMethod || "system",
    status: transaction?.status || "pending",
    balanceBefore: Number.isFinite(transaction?.balanceBefore) ? transaction.balanceBefore : 0,
    balanceAfter: Number.isFinite(transaction?.balanceAfter) ? transaction.balanceAfter : 0,
    processedById: processedBy?.id || toNullableString(transaction?.processedBy),
    processedBy,
    provider: transaction?.provider || "",
    providerReference: transaction?.providerReference || "",
    remarks: transaction?.remarks || "",
    metadata: transaction?.metadata ?? null,
    createdAt: transaction?.createdAt,
    updatedAt: transaction?.updatedAt,
  };
}


import { sanitizeFoodMenu } from "./sanitizeFoodMenu.js";
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

function sanitizeFoodItemSnapshot(foodValue) {
  if (!foodValue || typeof foodValue !== "object") {
    return null;
  }

  return sanitizeFoodMenu(foodValue);
}

export function sanitizeMealOrder(mealOrderDocument) {
  const mealOrder = mealOrderDocument?.toObject ? mealOrderDocument.toObject() : mealOrderDocument;
  const student = sanitizeStudentSnapshot(mealOrder.student);
  const foodItem = sanitizeFoodItemSnapshot(mealOrder.foodItem);
  const statusUpdatedBy =
    mealOrder.statusUpdatedBy && typeof mealOrder.statusUpdatedBy === "object"
      ? sanitizeUser(mealOrder.statusUpdatedBy)
      : null;

  return {
    id: mealOrder?._id?.toString?.() || mealOrder?.id,
    studentId: student?.id || toNullableString(mealOrder?.student),
    student,
    foodItemId: foodItem?.id || toNullableString(mealOrder?.foodItem),
    foodItem,
    tokenCode: mealOrder?.tokenCode || "",
    mealType: mealOrder?.mealType || foodItem?.category || "",
    validDate: mealOrder?.validDate || mealOrder?.deliveryDate || null,
    consumedAt: mealOrder?.consumedAt || null,
    consumedMarkedById: toNullableString(mealOrder?.consumedMarkedBy),
    checkedAt: mealOrder?.checkedAt || null,
    checkedById: toNullableString(mealOrder?.checkedBy),
    quantity: Number.isFinite(mealOrder?.quantity) ? mealOrder.quantity : 0,
    amount: Number.isFinite(mealOrder?.amount) ? mealOrder.amount : Number(mealOrder?.totalPrice || 0),
    totalPrice: Number.isFinite(mealOrder?.totalPrice) ? mealOrder.totalPrice : 0,
    orderDate: mealOrder?.orderDate || null,
    deliveryDate: mealOrder?.validDate || mealOrder?.deliveryDate || null,
    status: mealOrder?.status || "active",
    paymentStatus: mealOrder?.paymentStatus || "pending",
    isEaten: mealOrder?.status === "consumed",
    isMarkedNotEaten: mealOrder?.status === "not_eaten",
    specialRequests: mealOrder?.specialRequests || "",
    cancelledReason: mealOrder?.cancelledReason || "",
    statusUpdatedById: statusUpdatedBy ? statusUpdatedBy.id : toNullableString(mealOrder?.statusUpdatedBy),
    statusUpdatedBy,
    transactionId: toNullableString(mealOrder?.transactionId),
    createdAt: mealOrder?.createdAt,
    updatedAt: mealOrder?.updatedAt,
  };
}

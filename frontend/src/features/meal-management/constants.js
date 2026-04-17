export const mealCategoryOptions = [
  { label: "Breakfast", value: "breakfast" },
  { label: "Lunch", value: "lunch" },
  { label: "Dinner", value: "dinner" },
  { label: "Snacks", value: "snacks" },
  { label: "Extras", value: "extras" },
];

export const mealCategoryLabelMap = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snacks: "Snacks",
  extras: "Extras",
};

export const mealOrderStatusOptions = [
  { label: "Active", value: "active" },
  { label: "Consumed", value: "consumed" },
  { label: "Not Eaten", value: "not_eaten" },
  { label: "Expired", value: "expired" },
  { label: "Cancelled", value: "cancelled" },
];

export const mealPaymentStatusOptions = [
  { label: "Pending", value: "pending" },
  { label: "Paid", value: "paid" },
  { label: "Failed", value: "failed" },
];

export const reportGroupByOptions = [
  { label: "By Day", value: "day" },
  { label: "By Meal Type", value: "mealType" },
];

export function mealCategoryLabel(category) {
  return mealCategoryLabelMap[category] || "Other";
}

export function mealOrderStatusTone(status) {
  if (status === "active") return "warning";
  if (status === "consumed") return "success";
  if (status === "not_eaten") return "danger";
  if (status === "expired") return "neutral";
  if (status === "cancelled") return "danger";
  return "neutral";
}

export function mealPaymentStatusTone(status) {
  if (status === "paid") return "success";
  if (status === "pending") return "warning";
  if (status === "failed") return "danger";
  return "neutral";
}

export function availabilityTone(isAvailable) {
  if (!isAvailable) return "danger";
  return "success";
}

export function availabilityLabel(isAvailable) {
  if (!isAvailable) return "Unavailable";
  return "Available";
}

export function mealOrderStatusLabel(status) {
  return mealOrderStatusOptions.find((entry) => entry.value === status)?.label || "Unknown";
}

export function mealPaymentStatusLabel(status) {
  return mealPaymentStatusOptions.find((entry) => entry.value === status)?.label || "Unknown";
}

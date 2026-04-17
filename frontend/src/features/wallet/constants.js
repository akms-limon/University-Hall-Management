export const transactionTypeOptions = [
  { label: "Deposit", value: "deposit" },
  { label: "Meal Token", value: "meal_token" },
  { label: "Room Fee", value: "room_fee" },
  { label: "Fine", value: "fine" },
  { label: "Refund", value: "refund" },
  { label: "Adjustment", value: "adjustment" },
];

export const paymentMethodOptions = [
  { label: "SSLCommerz", value: "sslcommerz" },
  { label: "bKash", value: "bkash" },
  { label: "Nagad", value: "nagad" },
  { label: "Rocket", value: "rocket" },
  { label: "Card", value: "card" },
  { label: "Bank Transfer", value: "bank_transfer" },
  { label: "Cash", value: "cash" },
  { label: "System", value: "system" },
];

export const transactionStatusOptions = [
  { label: "Pending", value: "pending" },
  { label: "Completed", value: "completed" },
  { label: "Failed", value: "failed" },
];

export function transactionTypeLabel(value) {
  return transactionTypeOptions.find((entry) => entry.value === value)?.label || "Unknown";
}

export function transactionStatusLabel(value) {
  if (value === "success") return "Completed";
  return transactionStatusOptions.find((entry) => entry.value === value)?.label || "Unknown";
}

export function paymentMethodLabel(value) {
  return paymentMethodOptions.find((entry) => entry.value === value)?.label || "Unknown";
}

export function transactionStatusTone(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "completed" || normalized === "success") return "success";
  if (normalized === "pending") return "warning";
  if (normalized === "failed") return "danger";
  return "neutral";
}

export function transactionTypeTone(type) {
  if (type === "deposit") return "success";
  if (type === "meal_token" || type === "room_fee" || type === "fine") return "warning";
  if (type === "refund" || type === "adjustment") return "info";
  return "neutral";
}

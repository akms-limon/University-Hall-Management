export const taskTypeOptions = [
  { label: "Cleaning", value: "cleaning" },
  { label: "Maintenance", value: "maintenance" },
  { label: "Inspection", value: "inspection" },
  { label: "Repair", value: "repair" },
  { label: "Other", value: "other" },
];

export const taskPriorityOptions = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
  { label: "Urgent", value: "urgent" },
];

export const taskStatusOptions = [
  { label: "Pending", value: "pending" },
  { label: "In Progress", value: "in-progress" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

export const taskStatusByStaffOptions = [
  { label: "In Progress", value: "in-progress" },
  { label: "Completed", value: "completed" },
];

const typeLabelMap = {
  cleaning: "Cleaning",
  maintenance: "Maintenance",
  inspection: "Inspection",
  repair: "Repair",
  other: "Other",
};

const priorityLabelMap = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

const statusLabelMap = {
  pending: "Pending",
  "in-progress": "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function taskStatusTone(status) {
  if (status === "pending") return "warning";
  if (status === "in-progress") return "info";
  if (status === "completed") return "success";
  if (status === "cancelled") return "neutral";
  return "neutral";
}

export function taskPriorityTone(priority) {
  if (priority === "urgent") return "danger";
  if (priority === "high") return "warning";
  if (priority === "medium") return "info";
  if (priority === "low") return "neutral";
  return "neutral";
}

export function taskTypeLabel(taskType) {
  return typeLabelMap[taskType] || "Unknown";
}

export function taskPriorityLabel(priority) {
  return priorityLabelMap[priority] || "Unknown";
}

export function taskStatusLabel(status) {
  return statusLabelMap[status] || "Unknown";
}


export const supportTicketCategoryOptions = [
  { label: "Academic", value: "academic" },
  { label: "Health", value: "health" },
  { label: "Personal", value: "personal" },
  { label: "Financial", value: "financial" },
  { label: "Technical", value: "technical" },
  { label: "Other", value: "other" },
];

export const supportTicketPriorityOptions = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
  { label: "Urgent", value: "urgent" },
];

export const supportTicketStatusOptions = [
  { label: "Open", value: "open" },
  { label: "In Progress", value: "in-progress" },
  { label: "Resolved", value: "resolved" },
  { label: "Closed", value: "closed" },
];

export const supportTicketStatusByStaffOptions = [
  { label: "In Progress", value: "in-progress" },
  { label: "Resolved", value: "resolved" },
];

const categoryLabelMap = {
  academic: "Academic",
  health: "Health",
  personal: "Personal",
  financial: "Financial",
  technical: "Technical",
  other: "Other",
};

const priorityLabelMap = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

const statusLabelMap = {
  open: "Open",
  "in-progress": "In Progress",
  resolved: "Resolved",
  closed: "Closed",
};

export function supportTicketStatusTone(status) {
  if (status === "open") return "warning";
  if (status === "in-progress") return "info";
  if (status === "resolved") return "success";
  if (status === "closed") return "neutral";
  return "neutral";
}

export function supportTicketPriorityTone(priority) {
  if (priority === "urgent") return "danger";
  if (priority === "high") return "warning";
  if (priority === "medium") return "info";
  if (priority === "low") return "neutral";
  return "neutral";
}

export function supportTicketStatusLabel(status) {
  return statusLabelMap[status] || "Unknown";
}

export function supportTicketCategoryLabel(category) {
  return categoryLabelMap[category] || "Unknown";
}

export function supportTicketPriorityLabel(priority) {
  return priorityLabelMap[priority] || "Unknown";
}


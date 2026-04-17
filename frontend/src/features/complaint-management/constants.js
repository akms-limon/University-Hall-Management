export const complaintCategoryOptions = [
  { label: "Maintenance", value: "maintenance" },
  { label: "Food Quality", value: "food_quality" },
  { label: "Room Condition", value: "room_condition" },
  { label: "Roommate", value: "roommate" },
  { label: "Facility", value: "facility" },
  { label: "Hygiene", value: "hygiene" },
  { label: "Other", value: "other" },
];

export const complaintSeverityOptions = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
  { label: "Critical", value: "critical" },
];

export const complaintStatusOptions = [
  { label: "Open", value: "open" },
  { label: "In Progress", value: "in-progress" },
  { label: "Resolved", value: "resolved" },
  { label: "Closed", value: "closed" },
];

export const complaintStatusByStaffOptions = [
  { label: "In Progress", value: "in-progress" },
  { label: "Resolved", value: "resolved" },
];

const categoryLabelMap = {
  maintenance: "Maintenance",
  food_quality: "Food Quality",
  room_condition: "Room Condition",
  roommate: "Roommate",
  facility: "Facility",
  hygiene: "Hygiene",
  other: "Other",
};

const severityLabelMap = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

const statusLabelMap = {
  open: "Open",
  "in-progress": "In Progress",
  resolved: "Resolved",
  closed: "Closed",
};

export function complaintStatusTone(status) {
  if (status === "open") return "warning";
  if (status === "in-progress") return "info";
  if (status === "resolved") return "success";
  if (status === "closed") return "neutral";
  return "neutral";
}

export function complaintSeverityTone(severity) {
  if (severity === "critical") return "danger";
  if (severity === "high") return "warning";
  if (severity === "medium") return "info";
  if (severity === "low") return "neutral";
  return "neutral";
}

export function complaintStatusLabel(status) {
  return statusLabelMap[status] || "Unknown";
}

export function complaintCategoryLabel(category) {
  return categoryLabelMap[category] || "Unknown";
}

export function complaintSeverityLabel(severity) {
  return severityLabelMap[severity] || "Unknown";
}

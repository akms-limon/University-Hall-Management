export const maintenanceCategoryOptions = [
  { label: "Electrical", value: "electrical" },
  { label: "Plumbing", value: "plumbing" },
  { label: "Structural", value: "structural" },
  { label: "Furniture", value: "furniture" },
  { label: "Appliance", value: "appliance" },
  { label: "Other", value: "other" },
];

export const maintenanceSeverityOptions = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
  { label: "Critical", value: "critical" },
];

export const maintenanceStatusOptions = [
  { label: "Reported", value: "reported" },
  { label: "Inspected", value: "inspected" },
  { label: "In Progress", value: "in-progress" },
  { label: "Completed", value: "completed" },
  { label: "Closed", value: "closed" },
];

export const maintenanceStatusByStaffOptions = [
  { label: "Inspected", value: "inspected" },
  { label: "In Progress", value: "in-progress" },
  { label: "Completed", value: "completed" },
];

export const maintenanceStatusByProvostOptions = [
  { label: "Reported", value: "reported" },
  { label: "Inspected", value: "inspected" },
  { label: "In Progress", value: "in-progress" },
  { label: "Completed", value: "completed" },
  { label: "Closed", value: "closed" },
];

const categoryLabelMap = {
  electrical: "Electrical",
  plumbing: "Plumbing",
  structural: "Structural",
  furniture: "Furniture",
  appliance: "Appliance",
  other: "Other",
};

const severityLabelMap = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

const statusLabelMap = {
  reported: "Reported",
  inspected: "Inspected",
  "in-progress": "In Progress",
  completed: "Completed",
  closed: "Closed",
};

export function maintenanceStatusTone(status) {
  if (status === "reported") return "warning";
  if (status === "inspected") return "info";
  if (status === "in-progress") return "primary";
  if (status === "completed") return "success";
  if (status === "closed") return "neutral";
  return "neutral";
}

export function maintenanceSeverityTone(severity) {
  if (severity === "critical") return "danger";
  if (severity === "high") return "warning";
  if (severity === "medium") return "info";
  if (severity === "low") return "neutral";
  return "neutral";
}

export function maintenanceStatusLabel(status) {
  return statusLabelMap[status] || "Unknown";
}

export function maintenanceCategoryLabel(category) {
  return categoryLabelMap[category] || "Unknown";
}

export function maintenanceSeverityLabel(severity) {
  return severityLabelMap[severity] || "Unknown";
}

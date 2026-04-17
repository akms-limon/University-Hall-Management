export const noticeCategoryOptions = [
  { label: "Announcement", value: "announcement" },
  { label: "Emergency", value: "emergency" },
  { label: "Maintenance", value: "maintenance" },
  { label: "Event", value: "event" },
  { label: "Rule Update", value: "rule_update" },
  { label: "Other", value: "other" },
];

export const noticeAudienceOptions = [
  { label: "All", value: "all" },
  { label: "Students", value: "students" },
  { label: "Staff", value: "staff" },
  { label: "Provost", value: "provost" },
  { label: "Specific Users", value: "specific" },
];

const categoryLabelMap = {
  announcement: "Announcement",
  emergency: "Emergency",
  maintenance: "Maintenance",
  event: "Event",
  rule_update: "Rule Update",
  other: "Other",
};

const audienceLabelMap = {
  all: "All",
  students: "Students",
  staff: "Staff",
  provost: "Provost",
  specific: "Specific",
};

export function noticeCategoryLabel(category) {
  return categoryLabelMap[category] || "Unknown";
}

export function noticeAudienceLabel(audience) {
  return audienceLabelMap[audience] || "Unknown";
}

export function noticeCategoryTone(category) {
  if (category === "emergency") return "danger";
  if (category === "maintenance") return "warning";
  if (category === "event") return "info";
  if (category === "rule_update") return "primary";
  return "neutral";
}


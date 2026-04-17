export const hallApplicationStatusOptions = [
  { label: "Pending", value: "pending" },
  { label: "Under Review", value: "under_review" },
  { label: "Meeting Scheduled", value: "meeting_scheduled" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
  { label: "Waitlisted", value: "waitlisted" },
];

export const hallApplicationStatusLabelMap = {
  pending: "Pending",
  under_review: "Under Review",
  meeting_scheduled: "Meeting Scheduled",
  approved: "Approved",
  rejected: "Rejected",
  waitlisted: "Waitlisted",
};

export const hallApplicationActiveStatuses = ["pending", "under_review", "meeting_scheduled", "waitlisted"];

export const hallApplicationRequestTypeOptions = [
  { label: "New Room Request", value: "new_room_request" },
  { label: "Transfer Request", value: "transfer_request" },
];

export const hallApplicationRequestTypeLabelMap = {
  new_room_request: "New Room Request",
  transfer_request: "Transfer Request",
};

export const semesterOptions = Array.from({ length: 12 }, (_, index) => ({
  label: `Semester ${index + 1}`,
  value: String(index + 1),
}));

export function hallApplicationStatusTone(status) {
  if (status === "approved") return "success";
  if (status === "pending") return "warning";
  if (status === "under_review") return "info";
  if (status === "meeting_scheduled") return "info";
  if (status === "rejected") return "danger";
  if (status === "waitlisted") return "warning";
  return "neutral";
}

export function hallApplicationStatusLabel(status) {
  return hallApplicationStatusLabelMap[status] || "Unknown";
}

export function hallApplicationRequestTypeLabel(requestType) {
  return hallApplicationRequestTypeLabelMap[requestType] || "New Room Request";
}

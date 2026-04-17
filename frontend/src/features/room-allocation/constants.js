export const roomAllocationStatusOptions = [
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
  { label: "Active", value: "active" },
  { label: "Completed", value: "completed" },
];

export const roomAllocationRequestTypeOptions = [
  { label: "New Room Request", value: "new_room_request" },
  { label: "Transfer Request", value: "transfer_request" },
];

export const roomAllocationRequestTypeLabelMap = {
  new_room_request: "New Room Request",
  transfer_request: "Transfer Request",
};

export const roomAllocationStatusLabelMap = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  active: "Active",
  completed: "Completed",
};

export const roomAllocationOpenStatuses = ["pending", "approved", "active"];

export const semesterOptions = Array.from({ length: 12 }, (_, index) => ({
  label: `Semester ${index + 1}`,
  value: String(index + 1),
}));

const currentYear = new Date().getFullYear();
export const allocationYearOptions = Array.from({ length: 6 }, (_, index) => {
  const year = currentYear - 1 + index;
  return {
    label: String(year),
    value: String(year),
  };
});

export function roomAllocationStatusTone(status) {
  if (status === "pending") return "warning";
  if (status === "approved") return "info";
  if (status === "rejected") return "danger";
  if (status === "active") return "success";
  if (status === "completed") return "neutral";
  return "neutral";
}

export function roomAllocationStatusLabel(status) {
  return roomAllocationStatusLabelMap[status] || "Unknown";
}

export function roomAllocationRequestTypeLabel(requestType) {
  return roomAllocationRequestTypeLabelMap[requestType] || "New Room Request";
}

export const allocationStatusOptions = [
  { label: "None", value: "none" },
  { label: "Pending", value: "pending" },
  { label: "Requested", value: "requested" },
  { label: "Allocated", value: "allocated" },
];

export const semesterOptions = Array.from({ length: 12 }, (_, index) => ({
  label: `Semester ${index + 1}`,
  value: String(index + 1),
}));

export const roomStatusOptions = [
  { label: "Vacant", value: "vacant" },
  { label: "Occupied", value: "occupied" },
  { label: "Maintenance", value: "maintenance" },
  { label: "Closed", value: "closed" },
];

export const roomStatusLabelMap = {
  vacant: "Vacant",
  occupied: "Occupied",
  maintenance: "Maintenance",
  closed: "Closed",
};

export function roomStatusTone(status) {
  if (status === "vacant") return "success";
  if (status === "occupied") return "info";
  if (status === "maintenance") return "warning";
  if (status === "closed") return "danger";
  return "neutral";
}

export function roomStatusLabel(status) {
  return roomStatusLabelMap[status] || "Unknown";
}

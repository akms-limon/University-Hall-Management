import { sanitizeUser } from "./sanitizeUser.js";

function toNullableString(value) {
  if (value === null || value === undefined) {
    return null;
  }

  return String(value);
}

function sanitizeStringArray(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  return values.map((value) => String(value).trim()).filter(Boolean);
}

function sanitizeOccupant(occupantValue) {
  if (!occupantValue || typeof occupantValue !== "object") {
    return {
      id: toNullableString(occupantValue),
      userId: null,
      user: null,
      registrationNumber: "",
      department: "",
      semester: null,
    };
  }

  const occupant = occupantValue.toObject ? occupantValue.toObject() : occupantValue;
  const userCandidate = occupant.userId || occupant.user;
  const user = userCandidate && typeof userCandidate === "object" ? sanitizeUser(userCandidate) : null;
  const userId = user ? user.id : toNullableString(userCandidate);

  return {
    id: occupant._id?.toString?.() || occupant.id || null,
    userId,
    user,
    registrationNumber: occupant.registrationNumber || "",
    department: occupant.department || "",
    semester: Number.isFinite(occupant.semester) ? occupant.semester : null,
  };
}

function buildOccupancySummary(room) {
  const occupants = Array.isArray(room.occupants) ? room.occupants : [];
  const occupantCount = occupants.length;
  const capacity = Number.isFinite(room.capacity) ? room.capacity : 0;
  const availableSeatCount = Math.max(0, capacity - occupantCount);

  return {
    occupantCount,
    availableSeatCount,
    occupancyLabel: `${occupantCount}/${capacity}`,
  };
}

export function sanitizeRoom(roomDocument) {
  const room = roomDocument?.toObject ? roomDocument.toObject() : roomDocument;
  const occupancy = buildOccupancySummary(room || {});

  return {
    id: room?._id?.toString?.() || room?.id,
    roomNumber: room?.roomNumber || "",
    floor: Number.isFinite(room?.floor) ? room.floor : null,
    wing: room?.wing || "",
    capacity: Number.isFinite(room?.capacity) ? room.capacity : 0,
    occupants: Array.isArray(room?.occupants) ? room.occupants.map(sanitizeOccupant) : [],
    ...occupancy,
    status: room?.status || "vacant",
    maintenanceNotes: room?.maintenanceNotes || "",
    lastCleaned: room?.lastCleaned || null,
    features: sanitizeStringArray(room?.features),
    amenities: sanitizeStringArray(room?.amenities),
    isActive: Boolean(room?.isActive),
    createdAt: room?.createdAt,
    updatedAt: room?.updatedAt,
  };
}

export function sanitizeRoomPublic(roomDocument) {
  const room = roomDocument?.toObject ? roomDocument.toObject() : roomDocument;
  const occupancy = buildOccupancySummary(room || {});

  return {
    id: room?._id?.toString?.() || room?.id,
    roomNumber: room?.roomNumber || "",
    floor: Number.isFinite(room?.floor) ? room.floor : null,
    wing: room?.wing || "",
    capacity: Number.isFinite(room?.capacity) ? room.capacity : 0,
    ...occupancy,
    status: room?.status || "vacant",
    lastCleaned: room?.lastCleaned || null,
    features: sanitizeStringArray(room?.features),
    amenities: sanitizeStringArray(room?.amenities),
    createdAt: room?.createdAt,
    updatedAt: room?.updatedAt,
  };
}

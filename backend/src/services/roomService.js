import { StatusCodes } from "http-status-codes";
import { USER_ROLES } from "../constants/roles.js";
import { ROOM_STATUS, Room } from "../models/Room.js";
import { notificationService } from "./notificationService.js";
import { ApiError } from "../utils/ApiError.js";
import { sanitizeRoom, sanitizeRoomPublic } from "../utils/sanitizeRoom.js";

const occupantProjection = "registrationNumber department semester userId";
const occupantUserProjection = "name email phone role profilePhoto isActive";

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeString(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function normalizeStringArray(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  return values.map((value) => normalizeString(value)).filter(Boolean);
}

function normalizeRoomNumber(value) {
  return normalizeString(value).toUpperCase();
}

function normalizeObjectIdArray(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  return Array.from(new Set(values.map((value) => String(value).trim()).filter(Boolean)));
}

function normalizeSortStage(sortBy = "createdAt", sortOrder = "desc") {
  const direction = sortOrder === "asc" ? 1 : -1;
  const mappedPath = {
    createdAt: "createdAt",
    updatedAt: "updatedAt",
    roomNumber: "roomNumber",
    floor: "floor",
    wing: "wing",
    capacity: "capacity",
    status: "status",
    lastCleaned: "lastCleaned",
  };

  const field = mappedPath[sortBy] || "createdAt";
  return { [field]: direction, _id: 1 };
}

function normalizeRoomSummary(summary) {
  return {
    totalRooms: summary?.totalRooms || 0,
    vacantRooms: summary?.vacantRooms || 0,
    occupiedRooms: summary?.occupiedRooms || 0,
    maintenanceRooms: summary?.maintenanceRooms || 0,
    closedRooms: summary?.closedRooms || 0,
    activeRooms: summary?.activeRooms || 0,
    inactiveRooms: summary?.inactiveRooms || 0,
  };
}

function syncRoomStatusFromOccupants(room) {
  if (!room) return;

  if ([ROOM_STATUS.MAINTENANCE, ROOM_STATUS.CLOSED].includes(room.status)) {
    return;
  }

  const occupantCount = Array.isArray(room.occupants) ? room.occupants.length : 0;
  const capacity = Number.isFinite(room.capacity) ? room.capacity : 0;
  room.status = capacity > 0 && occupantCount >= capacity ? ROOM_STATUS.OCCUPIED : ROOM_STATUS.VACANT;
}

function makeSummaryStage() {
  return {
    $group: {
      _id: null,
      totalRooms: { $sum: 1 },
      vacantRooms: {
        $sum: {
          $cond: [{ $eq: ["$status", ROOM_STATUS.VACANT] }, 1, 0],
        },
      },
      occupiedRooms: {
        $sum: {
          $cond: [{ $eq: ["$status", ROOM_STATUS.OCCUPIED] }, 1, 0],
        },
      },
      maintenanceRooms: {
        $sum: {
          $cond: [{ $eq: ["$status", ROOM_STATUS.MAINTENANCE] }, 1, 0],
        },
      },
      closedRooms: {
        $sum: {
          $cond: [{ $eq: ["$status", ROOM_STATUS.CLOSED] }, 1, 0],
        },
      },
      activeRooms: {
        $sum: {
          $cond: [{ $eq: ["$isActive", true] }, 1, 0],
        },
      },
      inactiveRooms: {
        $sum: {
          $cond: [{ $eq: ["$isActive", false] }, 1, 0],
        },
      },
    },
  };
}

function buildRoomFilters(query, { publicView = false } = {}) {
  const filters = {};

  if (query.search) {
    filters.roomNumber = new RegExp(escapeRegex(query.search), "i");
  }

  if (typeof query.floor === "number") {
    filters.floor = query.floor;
  }

  if (query.wing) {
    filters.wing = query.wing;
  }

  if (query.status) {
    filters.status = query.status;
  } else if (publicView) {
    filters.status = { $ne: ROOM_STATUS.CLOSED };
  }

  if (publicView) {
    filters.isActive = true;
  } else if (typeof query.isActive === "boolean") {
    filters.isActive = query.isActive;
  }

  return filters;
}

async function loadRoomById(roomId, { includeOccupants = false } = {}) {
  let query = Room.findById(roomId);
  if (includeOccupants) {
    query = query.populate({
      path: "occupants",
      select: occupantProjection,
      populate: {
        path: "userId",
        select: occupantUserProjection,
      },
    });
  }

  const room = await query;
  if (!room) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Room not found");
  }

  return room;
}

function mapDuplicateKeyError(error) {
  if (error?.code !== 11000) {
    return null;
  }

  const duplicatedField = Object.keys(error.keyPattern || {})[0];
  if (!duplicatedField) {
    return new ApiError(StatusCodes.CONFLICT, "Duplicate value is not allowed");
  }

  if (duplicatedField === "roomNumber") {
    return new ApiError(StatusCodes.CONFLICT, "Room number already exists");
  }

  return new ApiError(StatusCodes.CONFLICT, `${duplicatedField} already exists`);
}

function formatStatus(status) {
  return String(status || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

async function notifyRoomStatusChange(room, previousStatus, actor) {
  if (!previousStatus || previousStatus === room.status) {
    return;
  }

  const movedToRestricted = [ROOM_STATUS.MAINTENANCE, ROOM_STATUS.CLOSED].includes(room.status);
  const reopened =
    [ROOM_STATUS.MAINTENANCE, ROOM_STATUS.CLOSED].includes(previousStatus) &&
    room.status === ROOM_STATUS.VACANT;

  if (!movedToRestricted && !reopened) {
    return;
  }

  try {
    await notificationService.notifyRole(USER_ROLES.PROVOST, {
      actorUserId: actor?.id || null,
      type: reopened ? "room_reopened" : "room_status_changed",
      title: reopened ? "Room Available Again" : "Room Status Updated",
      message: reopened
        ? `Room ${room.roomNumber} is now vacant and available again.`
        : `Room ${room.roomNumber} moved from ${formatStatus(previousStatus)} to ${formatStatus(room.status)}.`,
      link: `/provost/room-management/${room._id}`,
      entityType: "Room",
      entityId: room._id.toString(),
      metadata: {
        previousStatus,
        status: room.status,
      },
    });
  } catch {
    // Notification failures must not block room updates.
  }
}

export const roomService = {
  async createRoom(payload) {
    const roomPayload = {
      roomNumber: normalizeRoomNumber(payload.roomNumber),
      floor: payload.floor,
      wing: normalizeString(payload.wing),
      capacity: payload.capacity ?? 4,
      occupants: normalizeObjectIdArray(payload.occupants),
      status: payload.status || ROOM_STATUS.VACANT,
      maintenanceNotes: normalizeString(payload.maintenanceNotes),
      lastCleaned: payload.lastCleaned ?? null,
      features: normalizeStringArray(payload.features),
      amenities: normalizeStringArray(payload.amenities),
      isActive: payload.isActive ?? true,
    };

    if (![ROOM_STATUS.MAINTENANCE, ROOM_STATUS.CLOSED].includes(roomPayload.status)) {
      const nextOccupantCount = Array.isArray(roomPayload.occupants) ? roomPayload.occupants.length : 0;
      roomPayload.status =
        roomPayload.capacity > 0 && nextOccupantCount >= roomPayload.capacity
          ? ROOM_STATUS.OCCUPIED
          : ROOM_STATUS.VACANT;
    }

    const room = await Room.create(roomPayload).catch((error) => {
      const duplicateKeyError = mapDuplicateKeyError(error);
      if (duplicateKeyError) {
        throw duplicateKeyError;
      }
      throw error;
    });

    const created = await loadRoomById(room._id, { includeOccupants: true });
    return sanitizeRoom(created);
  },

  async listRooms(query) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);
    const skip = (page - 1) * limit;
    const sort = normalizeSortStage(query.sortBy, query.sortOrder);
    const filters = buildRoomFilters(query);

    const [items, total, summaryRows] = await Promise.all([
      Room.find(filters).sort(sort).skip(skip).limit(limit).lean(),
      Room.countDocuments(filters),
      Room.aggregate([{ $match: filters }, makeSummaryStage()]),
    ]);

    return {
      items: items.map((item) => sanitizeRoom(item)),
      summary: normalizeRoomSummary(summaryRows[0]),
      meta: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
        sortBy: query.sortBy || "createdAt",
        sortOrder: query.sortOrder || "desc",
      },
    };
  },

  async getRoomById(roomId) {
    const room = await loadRoomById(roomId, { includeOccupants: true });
    return sanitizeRoom(room);
  },

  async updateRoomById(roomId, payload, actor = null) {
    const room = await loadRoomById(roomId, { includeOccupants: true });
    const previousStatus = room.status;

    const incomingOccupants =
      payload.occupants !== undefined ? normalizeObjectIdArray(payload.occupants) : room.occupants;
    const nextOccupantCount = Array.isArray(incomingOccupants) ? incomingOccupants.length : 0;
    const nextCapacity = payload.capacity !== undefined ? payload.capacity : room.capacity;

    if (nextCapacity < nextOccupantCount) {
      throw new ApiError(StatusCodes.BAD_REQUEST, "Capacity cannot be less than current occupant count");
    }

    if (payload.roomNumber !== undefined) {
      room.roomNumber = normalizeRoomNumber(payload.roomNumber);
    }
    if (payload.floor !== undefined) {
      room.floor = payload.floor;
    }
    if (payload.wing !== undefined) {
      room.wing = normalizeString(payload.wing);
    }
    if (payload.capacity !== undefined) {
      room.capacity = payload.capacity;
    }
    if (payload.occupants !== undefined) {
      room.occupants = incomingOccupants;
    }
    if (payload.status !== undefined) {
      room.status = payload.status;
    }
    if (payload.maintenanceNotes !== undefined) {
      room.maintenanceNotes = normalizeString(payload.maintenanceNotes);
    }
    if (payload.lastCleaned !== undefined) {
      room.lastCleaned = payload.lastCleaned;
    }
    if (payload.features !== undefined) {
      room.features = normalizeStringArray(payload.features);
    }
    if (payload.amenities !== undefined) {
      room.amenities = normalizeStringArray(payload.amenities);
    }
    if (payload.isActive !== undefined) {
      room.isActive = payload.isActive;
    }

    syncRoomStatusFromOccupants(room);

    try {
      await room.save();
    } catch (error) {
      const duplicateKeyError = mapDuplicateKeyError(error);
      if (duplicateKeyError) {
        throw duplicateKeyError;
      }
      throw error;
    }

    await notifyRoomStatusChange(room, previousStatus, actor);
    const refreshed = await loadRoomById(room._id, { includeOccupants: true });
    return sanitizeRoom(refreshed);
  },

  async updateRoomStatus(roomId, isActive) {
    const room = await loadRoomById(roomId, { includeOccupants: true });
    room.isActive = isActive;
    await room.save();
    return sanitizeRoom(room);
  },

  async listPublicRooms(query) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);
    const skip = (page - 1) * limit;
    const sort = normalizeSortStage(query.sortBy || "roomNumber", query.sortOrder || "asc");
    const filters = buildRoomFilters(query, { publicView: true });

    const [items, total, summaryRows] = await Promise.all([
      Room.find(filters).sort(sort).skip(skip).limit(limit).lean(),
      Room.countDocuments(filters),
      Room.aggregate([{ $match: filters }, makeSummaryStage()]),
    ]);

    return {
      items: items.map((item) => sanitizeRoomPublic(item)),
      summary: normalizeRoomSummary(summaryRows[0]),
      meta: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
        sortBy: query.sortBy || "roomNumber",
        sortOrder: query.sortOrder || "asc",
      },
    };
  },

  async getPublicRoomById(roomId) {
    const room = await Room.findById(roomId).lean();
    if (!room || !room.isActive || room.status === ROOM_STATUS.CLOSED) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Room is not available");
    }

    return sanitizeRoomPublic(room);
  },
};

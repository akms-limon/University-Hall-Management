import { StatusCodes } from "http-status-codes";
import { USER_ROLES } from "../constants/roles.js";
import { ROOM_STATUS, Room } from "../models/Room.js";
import {
  ROOM_ALLOCATION_REQUEST_TYPE,
  ROOM_ALLOCATION_STATUS,
  RoomAllocation,
  roomAllocationRequestTypeList,
  roomAllocationOpenStatusList,
} from "../models/RoomAllocation.js";
import { STUDENT_ALLOCATION_STATUS, Student } from "../models/Student.js";
import { User } from "../models/User.js";
import { notificationService } from "./notificationService.js";
import { ApiError } from "../utils/ApiError.js";
import { sanitizeRoomAllocation } from "../utils/sanitizeRoomAllocation.js";

const studentUserProjection = "name email phone role profilePhoto isActive";
const approvedByProjection = "name email phone role profilePhoto isActive";
const occupantProjection = "registrationNumber department semester userId";
const roomProjection =
  "roomNumber floor wing capacity occupants status maintenanceNotes lastCleaned features amenities isActive createdAt updatedAt";

const studentPopulate = {
  path: "student",
  populate: {
    path: "userId",
    select: studentUserProjection,
  },
};

const roomPopulate = {
  path: "room",
  select: roomProjection,
  populate: {
    path: "occupants",
    select: occupantProjection,
    populate: {
      path: "userId",
      select: studentUserProjection,
    },
  },
};

function normalizeString(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeSortStage(sortBy = "allocationDate", sortOrder = "desc") {
  const direction = sortOrder === "asc" ? 1 : -1;
  const mappedPath = {
    allocationDate: "allocationDate",
    status: "status",
    semester: "semester",
    allocationYear: "allocationYear",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  };

  const field = mappedPath[sortBy] || "allocationDate";
  return { [field]: direction, _id: 1 };
}

function buildStatusSummary(entries) {
  const summary = {
    totalAllocations: 0,
    totalNewRequests: 0,
    totalTransferRequests: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    active: 0,
    completed: 0,
  };

  entries.forEach((entry) => {
    if (entry._id === ROOM_ALLOCATION_STATUS.PENDING) summary.pending = entry.count;
    if (entry._id === ROOM_ALLOCATION_STATUS.APPROVED) summary.approved = entry.count;
    if (entry._id === ROOM_ALLOCATION_STATUS.REJECTED) summary.rejected = entry.count;
    if (entry._id === ROOM_ALLOCATION_STATUS.ACTIVE) summary.active = entry.count;
    if (entry._id === ROOM_ALLOCATION_STATUS.COMPLETED) summary.completed = entry.count;
  });

  summary.totalAllocations =
    summary.pending + summary.approved + summary.rejected + summary.active + summary.completed;

  return summary;
}

function applyRequestTypeCounts(summary, groupedRequestType = []) {
  const normalized = summary || {
    totalAllocations: 0,
    totalNewRequests: 0,
    totalTransferRequests: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    active: 0,
    completed: 0,
  };

  normalized.totalNewRequests =
    groupedRequestType.find((entry) => entry._id === ROOM_ALLOCATION_REQUEST_TYPE.NEW_ROOM_REQUEST)?.count || 0;
  normalized.totalTransferRequests =
    groupedRequestType.find((entry) => entry._id === ROOM_ALLOCATION_REQUEST_TYPE.TRANSFER_REQUEST)?.count || 0;

  return normalized;
}

function roomContainsStudent(room, studentId) {
  return (room.occupants || []).some((occupantId) => occupantId.toString() === studentId.toString());
}

function syncRoomStatusFromOccupants(room) {
  if (!room) {
    return;
  }

  if ([ROOM_STATUS.MAINTENANCE, ROOM_STATUS.CLOSED].includes(room.status)) {
    return;
  }

  const occupantCount = Array.isArray(room.occupants) ? room.occupants.length : 0;
  const capacity = Number.isFinite(room.capacity) ? room.capacity : 0;
  room.status = capacity > 0 && occupantCount >= capacity ? ROOM_STATUS.OCCUPIED : ROOM_STATUS.VACANT;
}

function ensureRoomCanHostStudent(room, studentId) {
  if (!room) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Room not found");
  }

  if (!room.isActive) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Selected room is inactive");
  }

  if ([ROOM_STATUS.MAINTENANCE, ROOM_STATUS.CLOSED].includes(room.status)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Selected room cannot receive allocations");
  }

  const alreadyInside = roomContainsStudent(room, studentId);
  if (alreadyInside) {
    return;
  }

  if ((room.occupants || []).length >= room.capacity) {
    throw new ApiError(StatusCodes.CONFLICT, "Selected room is full");
  }
}

async function ensureStudentProfile(userId) {
  let student = await Student.findOne({ userId }).populate("userId", studentUserProjection);
  if (student) {
    return student;
  }

  const user = await User.findById(userId);
  if (!user || user.role !== USER_ROLES.STUDENT) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Student profile not found");
  }

  student = await Student.create({
    userId: user._id,
    profilePhoto: user.profilePhoto || "",
  });

  return Student.findById(student._id).populate("userId", studentUserProjection);
}

async function loadAllocationById(allocationId) {
  const allocation = await RoomAllocation.findById(allocationId)
    .populate(studentPopulate)
    .populate(roomPopulate)
    .populate({
      path: "currentRoom",
      select: roomProjection,
      populate: {
        path: "occupants",
        select: occupantProjection,
        populate: {
          path: "userId",
          select: studentUserProjection,
        },
      },
    })
    .populate("approvedBy", approvedByProjection);

  if (!allocation) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Room allocation not found");
  }

  return allocation;
}

function ensureAllocationOwnership(allocation, studentId) {
  if (allocation.student?._id?.toString() !== studentId.toString()) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Room allocation not found");
  }
}

async function ensureNoConflictingOpenAllocation(
  studentId,
  excludeAllocationId = null,
  statusList = roomAllocationOpenStatusList,
  extraFilters = {}
) {
  const filters = {
    student: studentId,
    status: {
      $in: statusList,
    },
    ...extraFilters,
  };

  if (excludeAllocationId) {
    filters._id = { $ne: excludeAllocationId };
  }

  const existing = await RoomAllocation.findOne(filters).lean();
  if (existing) {
    throw new ApiError(
      StatusCodes.CONFLICT,
      "Student already has an open room allocation request or assignment"
    );
  }
}

async function resolveSearchStudentIds(searchRegex) {
  const matchedUsers = await User.find({
    role: USER_ROLES.STUDENT,
    $or: [{ name: searchRegex }, { email: searchRegex }],
  })
    .select("_id")
    .lean();

  const userIds = matchedUsers.map((entry) => entry._id);
  const studentQuery = [{ registrationNumber: searchRegex }];
  if (userIds.length) {
    studentQuery.push({ userId: { $in: userIds } });
  }

  const matchedStudents = await Student.find({ $or: studentQuery }).select("_id").lean();
  return matchedStudents.map((entry) => entry._id);
}

function shouldRollBack(previousArray, nextArray) {
  if (previousArray.length !== nextArray.length) {
    return true;
  }

  return previousArray.some((value, index) => value.toString() !== nextArray[index].toString());
}

async function syncStudentAllocationSnapshot(studentId) {
  const student = await Student.findById(studentId);
  if (!student) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Student profile not found");
  }

  const activeAllocation = await RoomAllocation.findOne({
    student: studentId,
    status: ROOM_ALLOCATION_STATUS.ACTIVE,
  })
    .sort({ allocationDate: -1, _id: -1 })
    .lean();

  if (activeAllocation) {
    student.currentRoom = activeAllocation.room;
    student.allocationStatus = STUDENT_ALLOCATION_STATUS.ALLOCATED;
    await student.save();
    return student;
  }

  const pendingExists = await RoomAllocation.exists({
    student: studentId,
    status: ROOM_ALLOCATION_STATUS.PENDING,
  });
  const approvedExists = await RoomAllocation.exists({
    student: studentId,
    status: ROOM_ALLOCATION_STATUS.APPROVED,
  });

  student.currentRoom = null;
  if (pendingExists) {
    student.allocationStatus = STUDENT_ALLOCATION_STATUS.PENDING;
  } else if (approvedExists) {
    student.allocationStatus = STUDENT_ALLOCATION_STATUS.REQUESTED;
  } else {
    student.allocationStatus = STUDENT_ALLOCATION_STATUS.NONE;
  }

  await student.save();
  return student;
}

async function resolveStudentCurrentRoomContext(studentId) {
  const activeAllocation = await RoomAllocation.findOne({
    student: studentId,
    status: ROOM_ALLOCATION_STATUS.ACTIVE,
  })
    .sort({ allocationDate: -1, _id: -1 })
    .populate({
      path: "room",
      select: "roomNumber floor wing status isActive occupants capacity",
    });

  if (activeAllocation?.room) {
    return {
      allocation: activeAllocation,
      room: activeAllocation.room,
      roomId: activeAllocation.room._id,
      roomNumber: activeAllocation.room.roomNumber || "",
    };
  }

  const approvedAllocation = await RoomAllocation.findOne({
    student: studentId,
    status: ROOM_ALLOCATION_STATUS.APPROVED,
  })
    .sort({ allocationDate: -1, _id: -1 })
    .populate({
      path: "room",
      select: "roomNumber floor wing status isActive occupants capacity",
    });

  if (approvedAllocation?.room) {
    return {
      allocation: approvedAllocation,
      room: approvedAllocation.room,
      roomId: approvedAllocation.room._id,
      roomNumber: approvedAllocation.room.roomNumber || "",
    };
  }

  return {
    allocation: null,
    room: null,
    roomId: null,
    roomNumber: "",
  };
}

async function createStudentNotification(allocation, actorUserId, payload) {
  const studentUserId = allocation.student?.userId?._id || allocation.student?.userId;
  if (!studentUserId) {
    return;
  }

  await notificationService.createNotification({
    recipientUserId: studentUserId,
    actorUserId: actorUserId || null,
    type: payload.type,
    title: payload.title,
    message: payload.message,
    link: payload.link || `/student/room-allocation/${allocation._id}`,
    entityType: "RoomAllocation",
    entityId: allocation._id.toString(),
    metadata: payload.metadata || null,
  });
}

export const roomAllocationService = {
  async createMyRequest(actor, payload) {
    const student = await ensureStudentProfile(actor.id);
    const requestType = payload.requestType || ROOM_ALLOCATION_REQUEST_TYPE.NEW_ROOM_REQUEST;
    if (!roomAllocationRequestTypeList.includes(requestType)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid request type");
    }

    const room = await Room.findById(payload.roomId);
    ensureRoomCanHostStudent(room, student._id);

    let currentRoom = null;
    let currentRoomNumber = "";

    if (requestType === ROOM_ALLOCATION_REQUEST_TYPE.NEW_ROOM_REQUEST) {
      const currentRoomContext = await resolveStudentCurrentRoomContext(student._id);
      if (currentRoomContext.roomId) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          "You already have a room allocation. Please submit a transfer request."
        );
      }

      await ensureNoConflictingOpenAllocation(student._id, null, [
        ROOM_ALLOCATION_STATUS.PENDING,
        ROOM_ALLOCATION_STATUS.APPROVED,
      ]);
    }

    if (requestType === ROOM_ALLOCATION_REQUEST_TYPE.TRANSFER_REQUEST) {
      const currentRoomContext = await resolveStudentCurrentRoomContext(student._id);
      if (!currentRoomContext.roomId) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          "Transfer request is allowed only for students with an active room allocation."
        );
      }

      if (currentRoomContext.roomId.toString() === room._id.toString()) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          "Desired room must be different from your current room."
        );
      }

      await ensureNoConflictingOpenAllocation(student._id, null, [
        ROOM_ALLOCATION_STATUS.PENDING,
      ]);
      await ensureNoConflictingOpenAllocation(
        student._id,
        null,
        [ROOM_ALLOCATION_STATUS.APPROVED],
        { requestType: ROOM_ALLOCATION_REQUEST_TYPE.TRANSFER_REQUEST }
      );

      currentRoom = currentRoomContext.roomId;
      currentRoomNumber = currentRoomContext.roomNumber;
    }

    const allocation = await RoomAllocation.create({
      student: student._id,
      room: room._id,
      currentRoom,
      currentRoomNumber,
      requestType,
      allocationDate: new Date(),
      status: ROOM_ALLOCATION_STATUS.PENDING,
      approvedBy: null,
      requestReason: normalizeString(payload.requestReason),
      rejectionReason: "",
      semester: payload.semester,
      allocationYear: payload.allocationYear,
    });

    await syncStudentAllocationSnapshot(student._id);

    await notificationService.notifyRole(USER_ROLES.PROVOST, {
      actorUserId: actor.id,
      type: "room_allocation_requested",
      title:
        requestType === ROOM_ALLOCATION_REQUEST_TYPE.TRANSFER_REQUEST
          ? "New Transfer Request"
          : "New Room Allocation Request",
      message:
        requestType === ROOM_ALLOCATION_REQUEST_TYPE.TRANSFER_REQUEST
          ? `${student.userId?.name || "A student"} submitted a transfer request.`
          : `${student.userId?.name || "A student"} submitted a room allocation request.`,
      link: `/provost/room-allocation/${allocation._id}`,
      entityType: "RoomAllocation",
      entityId: allocation._id.toString(),
    });

    const populated = await loadAllocationById(allocation._id);
    return sanitizeRoomAllocation(populated);
  },

  async listMyAllocations(actor, query) {
    const student = await ensureStudentProfile(actor.id);
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);
    const skip = (page - 1) * limit;
    const sort = normalizeSortStage(query.sortBy, query.sortOrder);

    const filters = {
      student: student._id,
      ...(query.status ? { status: query.status } : {}),
      ...(query.requestType ? { requestType: query.requestType } : {}),
    };

    const [items, total, grouped, groupedRequestType] = await Promise.all([
      RoomAllocation.find(filters)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate(studentPopulate)
        .populate(roomPopulate)
        .populate({
          path: "currentRoom",
          select: roomProjection,
          populate: {
            path: "occupants",
            select: occupantProjection,
            populate: {
              path: "userId",
              select: studentUserProjection,
            },
          },
        })
        .populate("approvedBy", approvedByProjection),
      RoomAllocation.countDocuments(filters),
      RoomAllocation.aggregate([
        { $match: filters },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),
      RoomAllocation.aggregate([
        { $match: filters },
        {
          $group: {
            _id: "$requestType",
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const summary = applyRequestTypeCounts(buildStatusSummary(grouped), groupedRequestType);
    summary.totalAllocations = total;

    return {
      items: items.map((entry) => sanitizeRoomAllocation(entry)),
      summary,
      meta: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
        sortBy: query.sortBy || "allocationDate",
        sortOrder: query.sortOrder || "desc",
      },
    };
  },

  async getMyLatestAllocation(actor) {
    const student = await ensureStudentProfile(actor.id);
    const allocation = await RoomAllocation.findOne({ student: student._id })
      .sort({ allocationDate: -1, _id: -1 })
      .populate(studentPopulate)
      .populate(roomPopulate)
      .populate({
        path: "currentRoom",
        select: roomProjection,
        populate: {
          path: "occupants",
          select: occupantProjection,
          populate: {
            path: "userId",
            select: studentUserProjection,
          },
        },
      })
      .populate("approvedBy", approvedByProjection);

    return allocation ? sanitizeRoomAllocation(allocation) : null;
  },

  async getMyAllocationById(actor, allocationId) {
    const student = await ensureStudentProfile(actor.id);
    const allocation = await loadAllocationById(allocationId);
    ensureAllocationOwnership(allocation, student._id);
    return sanitizeRoomAllocation(allocation);
  },

  async listAllocations(query) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);
    const skip = (page - 1) * limit;
    const sort = normalizeSortStage(query.sortBy, query.sortOrder);
    const filters = {};

    if (query.roomId) {
      filters.room = query.roomId;
    }
    if (typeof query.semester === "number") {
      filters.semester = query.semester;
    }
    if (typeof query.allocationYear === "number") {
      filters.allocationYear = query.allocationYear;
    }
    if (query.status) {
      filters.status = query.status;
    }
    if (query.requestType) {
      filters.requestType = query.requestType;
    }

    if (query.search) {
      const searchRegex = new RegExp(escapeRegex(query.search), "i");
      const studentIds = await resolveSearchStudentIds(searchRegex);
      if (!studentIds.length) {
        return {
          items: [],
          summary: buildStatusSummary([]),
          meta: {
            page,
            limit,
            total: 0,
            totalPages: 0,
            sortBy: query.sortBy || "allocationDate",
            sortOrder: query.sortOrder || "desc",
          },
        };
      }
      filters.student = { $in: studentIds };
    }

    if (typeof query.isActiveStudent === "boolean") {
      const studentIds = await Student.find({ isActive: query.isActiveStudent })
        .select("_id")
        .lean();
      const ids = studentIds.map((entry) => entry._id);
      if (!ids.length) {
        return {
          items: [],
          summary: buildStatusSummary([]),
          meta: {
            page,
            limit,
            total: 0,
            totalPages: 0,
            sortBy: query.sortBy || "allocationDate",
            sortOrder: query.sortOrder || "desc",
          },
        };
      }
      filters.student = filters.student ? { $in: ids.filter((id) => filters.student.$in.some((s) => s.toString() === id.toString())) } : { $in: ids };
      if (!filters.student.$in.length) {
        return {
          items: [],
          summary: buildStatusSummary([]),
          meta: {
            page,
            limit,
            total: 0,
            totalPages: 0,
            sortBy: query.sortBy || "allocationDate",
            sortOrder: query.sortOrder || "desc",
          },
        };
      }
    }

    const [items, total, grouped, groupedRequestType] = await Promise.all([
      RoomAllocation.find(filters)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate(studentPopulate)
        .populate(roomPopulate)
        .populate({
          path: "currentRoom",
          select: roomProjection,
          populate: {
            path: "occupants",
            select: occupantProjection,
            populate: {
              path: "userId",
              select: studentUserProjection,
            },
          },
        })
        .populate("approvedBy", approvedByProjection),
      RoomAllocation.countDocuments(filters),
      RoomAllocation.aggregate([
        { $match: filters },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),
      RoomAllocation.aggregate([
        { $match: filters },
        {
          $group: {
            _id: "$requestType",
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const summary = applyRequestTypeCounts(buildStatusSummary(grouped), groupedRequestType);
    summary.totalAllocations = total;

    return {
      items: items.map((entry) => sanitizeRoomAllocation(entry)),
      summary,
      meta: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
        sortBy: query.sortBy || "allocationDate",
        sortOrder: query.sortOrder || "desc",
      },
    };
  },

  async getAllocationById(allocationId) {
    const allocation = await loadAllocationById(allocationId);
    return sanitizeRoomAllocation(allocation);
  },

  async approveAllocation(allocationId, actor, payload = {}) {
    const allocation = await loadAllocationById(allocationId);

    if (allocation.status !== ROOM_ALLOCATION_STATUS.PENDING) {
      throw new ApiError(StatusCodes.CONFLICT, "Only pending allocations can be approved");
    }

    const assignedRoomId = normalizeString(payload.roomId);
    if (!assignedRoomId) {
      throw new ApiError(StatusCodes.BAD_REQUEST, "Room number must be assigned before approval");
    }

    const room = await Room.findById(assignedRoomId);
    ensureRoomCanHostStudent(room, allocation.student._id);

    allocation.room = room._id;
    allocation.status = ROOM_ALLOCATION_STATUS.APPROVED;
    allocation.approvedBy = actor.id;
    allocation.rejectionReason = "";
    await allocation.save();
    await syncStudentAllocationSnapshot(allocation.student._id);

    await createStudentNotification(allocation, actor.id, {
      type: "room_allocation_approved",
      title: "Room Allocation Approved",
      message: `Your room allocation request for room ${room.roomNumber || ""} has been approved.`,
    });

    const refreshed = await loadAllocationById(allocation._id);
    return sanitizeRoomAllocation(refreshed);
  },

  async rejectAllocation(allocationId, actor, payload) {
    const allocation = await loadAllocationById(allocationId);

    if (![ROOM_ALLOCATION_STATUS.PENDING, ROOM_ALLOCATION_STATUS.APPROVED].includes(allocation.status)) {
      throw new ApiError(StatusCodes.CONFLICT, "Only pending or approved allocations can be rejected");
    }

    allocation.status = ROOM_ALLOCATION_STATUS.REJECTED;
    allocation.approvedBy = actor.id;
    allocation.rejectionReason = normalizeString(payload.rejectionReason);
    await allocation.save();
    await syncStudentAllocationSnapshot(allocation.student._id);

    await createStudentNotification(allocation, actor.id, {
      type: "room_allocation_rejected",
      title: "Room Allocation Rejected",
      message: "Your room allocation request was rejected by the provost office.",
      metadata: {
        rejectionReason: allocation.rejectionReason,
      },
    });

    const refreshed = await loadAllocationById(allocation._id);
    return sanitizeRoomAllocation(refreshed);
  },

  async activateAllocation(allocationId, actor, payload = {}) {
    const allocation = await loadAllocationById(allocationId);

    if (allocation.status !== ROOM_ALLOCATION_STATUS.APPROVED) {
      throw new ApiError(StatusCodes.CONFLICT, "Only approved allocations can be activated");
    }

    const studentId = allocation.student._id;
    const roomId = allocation.room?._id || allocation.room;

    const conflictingActive = await RoomAllocation.findOne({
      student: studentId,
      status: ROOM_ALLOCATION_STATUS.ACTIVE,
      _id: { $ne: allocation._id },
    }).lean();
    if (conflictingActive) {
      throw new ApiError(StatusCodes.CONFLICT, "Student already has an active room allocation");
    }

    const room = await Room.findById(roomId);
    ensureRoomCanHostStudent(room, studentId);
    const previousOccupants = [...(room.occupants || [])];
    const hadStudent = roomContainsStudent(room, studentId);

    if (!hadStudent) {
      room.occupants.push(studentId);
    }
    syncRoomStatusFromOccupants(room);

    try {
      await room.save();

      allocation.status = ROOM_ALLOCATION_STATUS.ACTIVE;
      allocation.approvedBy = actor.id;
      if (payload.allocationDate) {
        allocation.allocationDate = payload.allocationDate;
      }
      allocation.rejectionReason = "";
      await allocation.save();

      await syncStudentAllocationSnapshot(studentId);
    } catch (error) {
      if (shouldRollBack(previousOccupants, room.occupants || [])) {
        room.occupants = previousOccupants;
        await room.save().catch(() => {});
      }
      throw error;
    }

    await createStudentNotification(allocation, actor.id, {
      type: "room_allocation_activated",
      title: "Room Allocation Activated",
      message: `Your room allocation is now active for room ${allocation.room?.roomNumber || ""}.`,
    });

    const refreshed = await loadAllocationById(allocation._id);
    return sanitizeRoomAllocation(refreshed);
  },

  async completeAllocation(allocationId, actor, payload = {}) {
    const allocation = await loadAllocationById(allocationId);

    if (allocation.status !== ROOM_ALLOCATION_STATUS.ACTIVE) {
      throw new ApiError(StatusCodes.CONFLICT, "Only active allocations can be completed");
    }

    const studentId = allocation.student._id;
    const roomId = allocation.room?._id || allocation.room;
    const room = await Room.findById(roomId);
    const previousOccupants = room ? [...(room.occupants || [])] : [];

    if (room) {
      room.occupants = (room.occupants || []).filter((entry) => entry.toString() !== studentId.toString());
      syncRoomStatusFromOccupants(room);
    }

    try {
      if (room) {
        await room.save();
      }

      allocation.status = ROOM_ALLOCATION_STATUS.COMPLETED;
      allocation.approvedBy = actor.id;
      allocation.releaseDate = payload.releaseDate || new Date();
      await allocation.save();

      await syncStudentAllocationSnapshot(studentId);
    } catch (error) {
      if (room && shouldRollBack(previousOccupants, room.occupants || [])) {
        room.occupants = previousOccupants;
        await room.save().catch(() => {});
      }
      throw error;
    }

    await createStudentNotification(allocation, actor.id, {
      type: "room_allocation_completed",
      title: "Room Allocation Completed",
      message: `Your room allocation for room ${allocation.room?.roomNumber || ""} has been completed.`,
    });

    const refreshed = await loadAllocationById(allocation._id);
    return sanitizeRoomAllocation(refreshed);
  },

  async transferAllocation(allocationId, actor, payload) {
    const currentAllocation = await loadAllocationById(allocationId);
    if (currentAllocation.status !== ROOM_ALLOCATION_STATUS.ACTIVE) {
      throw new ApiError(StatusCodes.CONFLICT, "Only active allocations can be transferred");
    }

    const studentId = currentAllocation.student._id;
    const fromRoomId = currentAllocation.room?._id || currentAllocation.room;
    const toRoomId = payload.toRoomId;

    if (fromRoomId.toString() === toRoomId.toString()) {
      throw new ApiError(StatusCodes.BAD_REQUEST, "Destination room must be different from current room");
    }

    const [fromRoom, toRoom] = await Promise.all([Room.findById(fromRoomId), Room.findById(toRoomId)]);
    if (!fromRoom) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Current room not found");
    }
    ensureRoomCanHostStudent(toRoom, studentId);

    const previousFromOccupants = [...(fromRoom.occupants || [])];
    const previousToOccupants = [...(toRoom.occupants || [])];

    fromRoom.occupants = (fromRoom.occupants || []).filter((entry) => entry.toString() !== studentId.toString());
    syncRoomStatusFromOccupants(fromRoom);
    if (!roomContainsStudent(toRoom, studentId)) {
      toRoom.occupants.push(studentId);
    }
    syncRoomStatusFromOccupants(toRoom);

    let newAllocation;
    try {
      await fromRoom.save();
      await toRoom.save();

      currentAllocation.status = ROOM_ALLOCATION_STATUS.COMPLETED;
      currentAllocation.releaseDate = new Date();
      currentAllocation.approvedBy = actor.id;
      await currentAllocation.save();

      newAllocation = await RoomAllocation.create({
        student: studentId,
        room: toRoom._id,
        currentRoom: fromRoom._id,
        currentRoomNumber: fromRoom.roomNumber || "",
        requestType: ROOM_ALLOCATION_REQUEST_TYPE.TRANSFER_REQUEST,
        allocationDate: new Date(),
        releaseDate: null,
        status: ROOM_ALLOCATION_STATUS.ACTIVE,
        approvedBy: actor.id,
        requestReason:
          normalizeString(payload.transferReason) ||
          `Transferred from room ${fromRoom.roomNumber} to room ${toRoom.roomNumber}`,
        rejectionReason: "",
        semester: payload.semester || currentAllocation.semester,
        allocationYear: payload.allocationYear || currentAllocation.allocationYear,
      });

      await syncStudentAllocationSnapshot(studentId);
    } catch (error) {
      if (shouldRollBack(previousFromOccupants, fromRoom.occupants || [])) {
        fromRoom.occupants = previousFromOccupants;
        await fromRoom.save().catch(() => {});
      }
      if (shouldRollBack(previousToOccupants, toRoom.occupants || [])) {
        toRoom.occupants = previousToOccupants;
        await toRoom.save().catch(() => {});
      }
      throw error;
    }

    const populatedNew = await loadAllocationById(newAllocation._id);
    await createStudentNotification(populatedNew, actor.id, {
      type: "room_allocation_transferred",
      title: "Room Allocation Transferred",
      message: `Your room assignment was transferred from ${fromRoom.roomNumber} to ${toRoom.roomNumber}.`,
      metadata: {
        fromRoomId: fromRoom._id.toString(),
        toRoomId: toRoom._id.toString(),
      },
    });

    return {
      allocation: sanitizeRoomAllocation(populatedNew),
      previousAllocation: sanitizeRoomAllocation(currentAllocation),
    };
  },
};

import request from "supertest";
import app from "../src/app.js";
import { USER_ROLES } from "../src/constants/roles.js";
import { Notification } from "../src/models/Notification.js";
import { Room } from "../src/models/Room.js";
import { RoomAllocation } from "../src/models/RoomAllocation.js";
import { Student, STUDENT_ALLOCATION_STATUS } from "../src/models/Student.js";
import { User } from "../src/models/User.js";

function uniqueEmail(prefix) {
  return `${prefix}.${Date.now()}.${Math.random().toString(16).slice(2)}@example.com`;
}

async function createAndLoginProvost(agent, emailPrefix = "provost-room-allocation") {
  const email = uniqueEmail(emailPrefix);
  const password = "StrongPass#123";

  await User.create({
    name: "Provost User",
    email,
    phone: "+8801700040001",
    password,
    role: USER_ROLES.PROVOST,
    isActive: true,
  });

  const login = await agent.post("/api/v1/auth/login").send({ email, password });
  expect(login.status).toBe(200);
}

async function registerStudent(agent, prefix = "student-room-allocation") {
  const response = await agent.post("/api/v1/auth/register").send({
    name: "Student User",
    email: uniqueEmail(prefix),
    phone: "+8801700040002",
    password: "StrongPass#123",
  });

  expect(response.status).toBe(201);
  return response.body.data.user;
}

describe("Room Allocation", () => {
  it("allows student to submit a room allocation request", async () => {
    const provostAgent = request.agent(app);
    await createAndLoginProvost(provostAgent, "provost-allocation-submit");

    const studentAgent = request.agent(app);
    const studentUser = await registerStudent(studentAgent, "student-allocation-submit");
    const student = await Student.findOne({ userId: studentUser.id });

    const room = await Room.create({
      roomNumber: "RA-101",
      floor: 1,
      wing: "North",
      capacity: 3,
      occupants: [],
      status: "vacant",
      isActive: true,
    });

    const response = await studentAgent.post("/api/v1/room-allocations/me").send({
      roomId: room._id.toString(),
      requestReason: "Need room near department",
      semester: 2,
      allocationYear: 2026,
    });

    expect(response.status).toBe(201);
    expect(response.body.data.allocation.status).toBe("pending");
    expect(response.body.data.allocation.roomId).toBe(room._id.toString());

    const refreshedStudent = await Student.findById(student._id).lean();
    expect(refreshedStudent.allocationStatus).toBe(STUDENT_ALLOCATION_STATUS.PENDING);

    const provostNotifications = await Notification.find({
      type: "room_allocation_requested",
      entityType: "RoomAllocation",
    }).lean();
    expect(provostNotifications.length).toBeGreaterThan(0);
  });

  it("supports approve + activate flow and updates room/student consistency", async () => {
    const provostAgent = request.agent(app);
    await createAndLoginProvost(provostAgent, "provost-allocation-approve");

    const studentAgent = request.agent(app);
    const studentUser = await registerStudent(studentAgent, "student-allocation-approve");
    const student = await Student.findOne({ userId: studentUser.id });

    const room = await Room.create({
      roomNumber: "RA-201",
      floor: 2,
      wing: "East",
      capacity: 2,
      occupants: [],
      status: "vacant",
      isActive: true,
    });

    const createResponse = await studentAgent.post("/api/v1/room-allocations/me").send({
      roomId: room._id.toString(),
      requestReason: "Closer to lab",
      semester: 4,
      allocationYear: 2026,
    });
    expect(createResponse.status).toBe(201);
    const allocationId = createResponse.body.data.allocation.id;

    const approveResponse = await provostAgent
      .patch(`/api/v1/room-allocations/${allocationId}/approve`)
      .send({ roomId: room._id.toString() });
    expect(approveResponse.status).toBe(200);
    expect(approveResponse.body.data.allocation.status).toBe("approved");

    const activateResponse = await provostAgent.patch(`/api/v1/room-allocations/${allocationId}/activate`).send({});
    expect(activateResponse.status).toBe(200);
    expect(activateResponse.body.data.allocation.status).toBe("active");

    const refreshedRoom = await Room.findById(room._id).lean();
    expect(refreshedRoom.occupants.map(String)).toContain(student._id.toString());
    expect(refreshedRoom.status).toBe("vacant");

    const refreshedStudent = await Student.findById(student._id).lean();
    expect(refreshedStudent.currentRoom?.toString()).toBe(room._id.toString());
    expect(refreshedStudent.allocationStatus).toBe(STUDENT_ALLOCATION_STATUS.ALLOCATED);

    const approvedNotification = await Notification.findOne({
      recipient: student.userId,
      type: "room_allocation_approved",
      entityType: "RoomAllocation",
    }).lean();
    expect(approvedNotification).toBeTruthy();

    const activatedNotification = await Notification.findOne({
      recipient: student.userId,
      type: "room_allocation_activated",
      entityType: "RoomAllocation",
    }).lean();
    expect(activatedNotification).toBeTruthy();
  });

  it("supports rejection flow and stores rejection reason", async () => {
    const provostAgent = request.agent(app);
    await createAndLoginProvost(provostAgent, "provost-allocation-reject");

    const studentAgent = request.agent(app);
    await registerStudent(studentAgent, "student-allocation-reject");
    const student = await Student.findOne({});

    const room = await Room.create({
      roomNumber: "RA-301",
      floor: 3,
      wing: "West",
      capacity: 3,
      occupants: [],
      status: "vacant",
      isActive: true,
    });

    const createResponse = await studentAgent.post("/api/v1/room-allocations/me").send({
      roomId: room._id.toString(),
      requestReason: "Need quiet place",
      semester: 3,
      allocationYear: 2026,
    });
    const allocationId = createResponse.body.data.allocation.id;

    const rejectResponse = await provostAgent
      .patch(`/api/v1/room-allocations/${allocationId}/reject`)
      .send({ rejectionReason: "No seat available for this semester." });

    expect(rejectResponse.status).toBe(200);
    expect(rejectResponse.body.data.allocation.status).toBe("rejected");
    expect(rejectResponse.body.data.allocation.rejectionReason).toContain("No seat available");

    const refreshedRoom = await Room.findById(room._id).lean();
    expect(refreshedRoom.occupants).toHaveLength(0);

    const refreshedStudent = await Student.findById(student._id).lean();
    expect(refreshedStudent.currentRoom).toBe(null);
  });

  it("transfers an active allocation and keeps room occupancy consistent", async () => {
    const provostAgent = request.agent(app);
    await createAndLoginProvost(provostAgent, "provost-allocation-transfer");

    const studentAgent = request.agent(app);
    const studentUser = await registerStudent(studentAgent, "student-allocation-transfer");
    const student = await Student.findOne({ userId: studentUser.id });

    const fromRoom = await Room.create({
      roomNumber: "RA-401",
      floor: 4,
      wing: "North",
      capacity: 2,
      occupants: [],
      status: "vacant",
      isActive: true,
    });

    const toRoom = await Room.create({
      roomNumber: "RA-402",
      floor: 4,
      wing: "North",
      capacity: 2,
      occupants: [],
      status: "vacant",
      isActive: true,
    });

    const createResponse = await studentAgent.post("/api/v1/room-allocations/me").send({
      roomId: fromRoom._id.toString(),
      requestReason: "Transfer flow test",
      semester: 5,
      allocationYear: 2026,
    });
    const allocationId = createResponse.body.data.allocation.id;

    await provostAgent
      .patch(`/api/v1/room-allocations/${allocationId}/approve`)
      .send({ roomId: fromRoom._id.toString() });
    await provostAgent.patch(`/api/v1/room-allocations/${allocationId}/activate`).send({});

    const transferResponse = await provostAgent
      .patch(`/api/v1/room-allocations/${allocationId}/transfer`)
      .send({
        toRoomId: toRoom._id.toString(),
        transferReason: "Operational reassignment",
        semester: 5,
        allocationYear: 2026,
      });

    expect(transferResponse.status).toBe(200);
    expect(transferResponse.body.data.allocation.status).toBe("active");
    expect(transferResponse.body.data.allocation.roomId).toBe(toRoom._id.toString());
    expect(transferResponse.body.data.previousAllocation.status).toBe("completed");

    const refreshedFromRoom = await Room.findById(fromRoom._id).lean();
    const refreshedToRoom = await Room.findById(toRoom._id).lean();
    expect(refreshedFromRoom.occupants.map(String)).not.toContain(student._id.toString());
    expect(refreshedToRoom.occupants.map(String)).toContain(student._id.toString());

    const refreshedStudent = await Student.findById(student._id).lean();
    expect(refreshedStudent.currentRoom?.toString()).toBe(toRoom._id.toString());

    const transferNotification = await Notification.findOne({
      recipient: student.userId,
      type: "room_allocation_transferred",
    }).lean();
    expect(transferNotification).toBeTruthy();
  });

  it("blocks activation when target room is already full", async () => {
    const provostAgent = request.agent(app);
    await createAndLoginProvost(provostAgent, "provost-allocation-capacity");

    const studentAgent = request.agent(app);
    const studentUser = await registerStudent(studentAgent, "student-allocation-capacity");
    const student = await Student.findOne({ userId: studentUser.id });

    const otherStudentAgent = request.agent(app);
    const otherStudentUser = await registerStudent(otherStudentAgent, "student-allocation-capacity-other");
    const otherStudent = await Student.findOne({ userId: otherStudentUser.id });

    const room = await Room.create({
      roomNumber: "RA-501",
      floor: 5,
      wing: "South",
      capacity: 1,
      occupants: [],
      status: "vacant",
      isActive: true,
    });

    const createResponse = await studentAgent.post("/api/v1/room-allocations/me").send({
      roomId: room._id.toString(),
      requestReason: "Capacity test",
      semester: 6,
      allocationYear: 2026,
    });
    const allocationId = createResponse.body.data.allocation.id;

    await provostAgent
      .patch(`/api/v1/room-allocations/${allocationId}/approve`)
      .send({ roomId: room._id.toString() });

    room.occupants = [otherStudent._id];
    room.status = "occupied";
    await room.save();

    const activateResponse = await provostAgent.patch(`/api/v1/room-allocations/${allocationId}/activate`).send({});
    expect(activateResponse.status).toBe(409);

    const refreshedStudent = await Student.findById(student._id).lean();
    expect(refreshedStudent.currentRoom).toBe(null);
    expect(refreshedStudent.allocationStatus).not.toBe(STUDENT_ALLOCATION_STATUS.ALLOCATED);
  });

  it("prevents non-provost users from provost allocation actions", async () => {
    const studentAgent = request.agent(app);
    await registerStudent(studentAgent, "student-allocation-rbac");
    const student = await Student.findOne({});

    const room = await Room.create({
      roomNumber: "RA-601",
      floor: 6,
      wing: "East",
      capacity: 2,
      occupants: [],
      status: "vacant",
      isActive: true,
    });

    const createResponse = await studentAgent.post("/api/v1/room-allocations/me").send({
      roomId: room._id.toString(),
      semester: 2,
      allocationYear: 2026,
    });
    expect(createResponse.status).toBe(201);
    const allocationId = createResponse.body.data.allocation.id;

    const approveResponse = await studentAgent.patch(`/api/v1/room-allocations/${allocationId}/approve`).send({});
    expect(approveResponse.status).toBe(403);

    const myAllocations = await studentAgent.get("/api/v1/room-allocations/me");
    expect(myAllocations.status).toBe(200);
    expect(myAllocations.body.data.items[0].studentId).toBe(student._id.toString());
  });

  it("lists allocation records for provost with filters and pagination", async () => {
    const provostAgent = request.agent(app);
    await createAndLoginProvost(provostAgent, "provost-allocation-list");

    const studentAgent = request.agent(app);
    await registerStudent(studentAgent, "student-allocation-list");
    const student = await Student.findOne({});

    const room = await Room.create({
      roomNumber: "RA-701",
      floor: 7,
      wing: "West",
      capacity: 3,
      occupants: [],
      status: "vacant",
      isActive: true,
    });

    await RoomAllocation.create({
      student: student._id,
      room: room._id,
      allocationDate: new Date("2026-01-05"),
      status: "pending",
      semester: 7,
      allocationYear: 2026,
      requestReason: "List query test",
    });

    const response = await provostAgent.get("/api/v1/room-allocations").query({
      search: student.registrationNumber || "",
      roomId: room._id.toString(),
      semester: 7,
      allocationYear: 2026,
      status: "pending",
      page: 1,
      limit: 10,
      sortBy: "allocationDate",
      sortOrder: "desc",
    });

    expect(response.status).toBe(200);
    expect(response.body.data.items.length).toBeGreaterThan(0);
    expect(response.body.data.summary.totalAllocations).toBeGreaterThan(0);
    expect(response.body.meta.page).toBe(1);
  });
});

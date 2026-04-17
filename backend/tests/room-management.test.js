import request from "supertest";
import app from "../src/app.js";
import { USER_ROLES } from "../src/constants/roles.js";
import { Notification } from "../src/models/Notification.js";
import { ROOM_STATUS, Room } from "../src/models/Room.js";
import { User } from "../src/models/User.js";

function uniqueEmail(prefix) {
  return `${prefix}.${Date.now()}.${Math.random().toString(16).slice(2)}@example.com`;
}

async function createAndLoginProvost(agent, emailPrefix = "provost-room-mgmt") {
  const email = uniqueEmail(emailPrefix);
  const password = "StrongPass#123";

  await User.create({
    name: "Provost User",
    email,
    phone: "+8801700030001",
    password,
    role: USER_ROLES.PROVOST,
    isActive: true,
  });

  const login = await agent.post("/api/v1/auth/login").send({ email, password });
  expect(login.status).toBe(200);
}

describe("Room Management", () => {
  it("allows provost to create a room", async () => {
    const provostAgent = request.agent(app);
    await createAndLoginProvost(provostAgent);

    const response = await provostAgent.post("/api/v1/rooms").send({
      roomNumber: "A-201",
      floor: 2,
      wing: "North",
      capacity: 4,
      status: ROOM_STATUS.VACANT,
      features: ["Balcony", "Study Desk"],
      amenities: ["WiFi"],
    });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.room.roomNumber).toBe("A-201");
    expect(response.body.data.room.status).toBe(ROOM_STATUS.VACANT);

    const savedRoom = await Room.findOne({ roomNumber: "A-201" }).lean();
    expect(savedRoom).toBeTruthy();
    expect(savedRoom.floor).toBe(2);
    expect(savedRoom.capacity).toBe(4);
  });

  it("supports provost list query with search, filters, sort, and pagination", async () => {
    const provostAgent = request.agent(app);
    await createAndLoginProvost(provostAgent, "provost-room-list");

    await Room.create({
      roomNumber: "B-301",
      floor: 3,
      wing: "East",
      capacity: 4,
      status: ROOM_STATUS.VACANT,
      isActive: true,
    });

    await Room.create({
      roomNumber: "C-101",
      floor: 1,
      wing: "West",
      capacity: 2,
      status: ROOM_STATUS.MAINTENANCE,
      isActive: true,
    });

    const response = await provostAgent.get("/api/v1/rooms").query({
      search: "B-3",
      floor: 3,
      wing: "East",
      status: ROOM_STATUS.VACANT,
      isActive: true,
      page: 1,
      limit: 10,
      sortBy: "roomNumber",
      sortOrder: "asc",
    });

    expect(response.status).toBe(200);
    expect(response.body.data.items).toHaveLength(1);
    expect(response.body.data.items[0].roomNumber).toBe("B-301");
    expect(response.body.meta.page).toBe(1);
    expect(response.body.data.summary.totalRooms).toBe(1);
  });

  it("blocks non-provost users from provost room endpoints", async () => {
    const studentAgent = request.agent(app);
    await studentAgent.post("/api/v1/auth/register").send({
      name: "Blocked Student",
      email: uniqueEmail("blocked-room"),
      phone: "+8801700030002",
      password: "StrongPass#123",
    });

    const listResponse = await studentAgent.get("/api/v1/rooms");
    expect(listResponse.status).toBe(403);

    const createResponse = await studentAgent.post("/api/v1/rooms").send({
      roomNumber: "X-001",
      floor: 0,
      wing: "Test",
      capacity: 2,
    });
    expect(createResponse.status).toBe(403);
  });

  it("supports student-safe room listing and detail access rules", async () => {
    const studentAgent = request.agent(app);
    const register = await studentAgent.post("/api/v1/auth/register").send({
      name: "Room Student",
      email: uniqueEmail("student-room-public"),
      phone: "+8801700030003",
      password: "StrongPass#123",
    });
    expect(register.status).toBe(201);

    const activeRoom = await Room.create({
      roomNumber: "D-401",
      floor: 4,
      wing: "South",
      capacity: 4,
      status: ROOM_STATUS.VACANT,
      isActive: true,
    });

    const inactiveRoom = await Room.create({
      roomNumber: "D-402",
      floor: 4,
      wing: "South",
      capacity: 4,
      status: ROOM_STATUS.OCCUPIED,
      isActive: false,
    });

    const listResponse = await studentAgent.get("/api/v1/rooms/public");
    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data.items.map((room) => room.roomNumber)).toContain("D-401");
    expect(listResponse.body.data.items.map((room) => room.roomNumber)).not.toContain("D-402");

    const activeDetail = await studentAgent.get(`/api/v1/rooms/public/${activeRoom._id}`);
    expect(activeDetail.status).toBe(200);
    expect(activeDetail.body.data.room.roomNumber).toBe("D-401");

    const inactiveDetail = await studentAgent.get(`/api/v1/rooms/public/${inactiveRoom._id}`);
    expect(inactiveDetail.status).toBe(404);
  });

  it("creates internal notifications on maintenance/closed and reopened status transitions", async () => {
    const actingProvostAgent = request.agent(app);
    await createAndLoginProvost(actingProvostAgent, "provost-actor-room");

    await User.create({
      name: "Second Provost",
      email: uniqueEmail("provost-second-room"),
      phone: "+8801700030004",
      password: "StrongPass#123",
      role: USER_ROLES.PROVOST,
      isActive: true,
    });

    const room = await Room.create({
      roomNumber: "E-501",
      floor: 5,
      wing: "North",
      capacity: 4,
      status: ROOM_STATUS.VACANT,
      isActive: true,
    });

    const maintenanceUpdate = await actingProvostAgent.patch(`/api/v1/rooms/${room._id}`).send({
      status: ROOM_STATUS.MAINTENANCE,
      maintenanceNotes: "Plumbing issue",
    });
    expect(maintenanceUpdate.status).toBe(200);
    expect(maintenanceUpdate.body.data.room.status).toBe(ROOM_STATUS.MAINTENANCE);

    const statusChangedNotifications = await Notification.find({
      entityType: "Room",
      entityId: room._id.toString(),
      type: "room_status_changed",
    }).lean();
    expect(statusChangedNotifications.length).toBeGreaterThan(0);

    const reopenedUpdate = await actingProvostAgent.patch(`/api/v1/rooms/${room._id}`).send({
      status: ROOM_STATUS.VACANT,
      maintenanceNotes: "Issue resolved",
    });
    expect(reopenedUpdate.status).toBe(200);
    expect(reopenedUpdate.body.data.room.status).toBe(ROOM_STATUS.VACANT);

    const reopenedNotifications = await Notification.find({
      entityType: "Room",
      entityId: room._id.toString(),
      type: "room_reopened",
    }).lean();
    expect(reopenedNotifications.length).toBeGreaterThan(0);
  });

  it("allows provost to activate and deactivate room records", async () => {
    const provostAgent = request.agent(app);
    await createAndLoginProvost(provostAgent, "provost-room-status");

    const room = await Room.create({
      roomNumber: "F-601",
      floor: 6,
      wing: "East",
      capacity: 4,
      status: ROOM_STATUS.VACANT,
      isActive: true,
    });

    const deactivate = await provostAgent.patch(`/api/v1/rooms/${room._id}/status`).send({ isActive: false });
    expect(deactivate.status).toBe(200);
    expect(deactivate.body.data.room.isActive).toBe(false);

    const activate = await provostAgent.patch(`/api/v1/rooms/${room._id}/status`).send({ isActive: true });
    expect(activate.status).toBe(200);
    expect(activate.body.data.room.isActive).toBe(true);
  });
});

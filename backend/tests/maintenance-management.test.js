import request from "supertest";
import app from "../src/app.js";
import { USER_ROLES } from "../src/constants/roles.js";
import { Maintenance } from "../src/models/Maintenance.js";
import { Notification } from "../src/models/Notification.js";
import { Room } from "../src/models/Room.js";
import { Staff } from "../src/models/Staff.js";
import { User } from "../src/models/User.js";

function uniqueEmail(prefix) {
  return `${prefix}.${Date.now()}.${Math.random().toString(16).slice(2)}@example.com`;
}

async function registerStudent(agent, overrides = {}) {
  const email = overrides.email || uniqueEmail("student-maintenance");
  const password = overrides.password || "StrongPass#123";

  const response = await agent.post("/api/v1/auth/register").send({
    name: overrides.name || "Maintenance Student",
    email,
    phone: overrides.phone || "+8801700060001",
    password,
  });

  expect(response.status).toBe(201);
  return { email, password };
}

async function createAndLoginProvost(agent, overrides = {}) {
  const email = overrides.email || uniqueEmail("provost-maintenance");
  const password = overrides.password || "StrongPass#123";

  await User.create({
    name: overrides.name || "Maintenance Provost",
    email,
    phone: overrides.phone || "+8801700060002",
    password,
    role: USER_ROLES.PROVOST,
    isActive: true,
  });

  const login = await agent.post("/api/v1/auth/login").send({ email, password });
  expect(login.status).toBe(200);
}

async function createAndLoginStaff(agent, overrides = {}) {
  const email = overrides.email || uniqueEmail("staff-maintenance");
  const password = overrides.password || "StrongPass#123";

  const user = await User.create({
    name: overrides.name || "Maintenance Staff",
    email,
    phone: overrides.phone || "+8801700060003",
    password,
    role: USER_ROLES.STAFF,
    isActive: overrides.userIsActive ?? true,
  });

  const staff = await Staff.create({
    userId: user._id,
    staffId: overrides.staffId || `STF-MNT-${Math.random().toString(16).slice(2, 7).toUpperCase()}`,
    department: overrides.department || "Maintenance",
    designation: overrides.designation || "Technician",
    joiningDate: new Date("2025-01-01"),
    isActive: overrides.staffIsActive ?? true,
  });

  const login = await agent.post("/api/v1/auth/login").send({ email, password });
  expect(login.status).toBe(200);

  return { user, staff };
}

async function createRoom(overrides = {}) {
  return Room.create({
    roomNumber: overrides.roomNumber || `A-${Math.floor(Math.random() * 900 + 100)}`,
    floor: overrides.floor ?? 2,
    wing: overrides.wing || "East",
    capacity: overrides.capacity ?? 4,
    status: overrides.status || "occupied",
    isActive: overrides.isActive ?? true,
  });
}

function buildMaintenancePayload(roomId, overrides = {}) {
  return {
    room: roomId.toString(),
    issue: "Electrical short circuit near room switchboard",
    description: "There is a repeated short circuit issue in the switchboard and sparks appear at night.",
    category: "electrical",
    severity: "high",
    beforePhotos: ["https://example.com/before-photo.jpg"],
    ...overrides,
  };
}

describe("Maintenance Management", () => {
  it("allows student create/list/detail and blocks access to other students' requests", async () => {
    const room = await createRoom({ roomNumber: "A-201" });

    const studentAgent = request.agent(app);
    await registerStudent(studentAgent, {
      name: "Owner Student",
      phone: "+8801700060100",
    });
    await createAndLoginProvost(request.agent(app), {
      name: "Notified Provost",
      phone: "+8801700060101",
    });

    const create = await studentAgent.post("/api/v1/maintenance/me").send(buildMaintenancePayload(room._id));
    expect(create.status).toBe(201);
    expect(create.body.data.maintenance.status).toBe("reported");

    const list = await studentAgent.get("/api/v1/maintenance/me").query({
      page: 1,
      limit: 10,
      status: "reported",
    });
    expect(list.status).toBe(200);
    expect(list.body.data.items).toHaveLength(1);
    expect(list.body.data.summary.reported).toBe(1);

    const detail = await studentAgent.get(`/api/v1/maintenance/me/${create.body.data.maintenance.id}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.maintenance.room.roomNumber).toBe("A-201");

    const otherStudentAgent = request.agent(app);
    await registerStudent(otherStudentAgent, {
      name: "Other Student",
      phone: "+8801700060102",
    });

    const blocked = await otherStudentAgent.get(`/api/v1/maintenance/me/${create.body.data.maintenance.id}`);
    expect(blocked.status).toBe(404);

    const provostUsers = await User.find({ role: USER_ROLES.PROVOST }).lean();
    const notification = await Notification.findOne({
      recipient: { $in: provostUsers.map((entry) => entry._id) },
      type: "maintenance_submitted",
      entityId: create.body.data.maintenance.id,
    }).lean();
    expect(notification).toBeTruthy();
  });

  it("supports provost assignment and staff update workflow with completion notification", async () => {
    const room = await createRoom({ roomNumber: "B-305" });

    const studentAgent = request.agent(app);
    await registerStudent(studentAgent, {
      name: "Workflow Student",
      phone: "+8801700060200",
    });

    const provostAgent = request.agent(app);
    await createAndLoginProvost(provostAgent, {
      name: "Workflow Provost",
      phone: "+8801700060201",
    });

    const staffAgent = request.agent(app);
    const { staff, user: staffUser } = await createAndLoginStaff(staffAgent, {
      name: "Workflow Staff",
      phone: "+8801700060202",
      staffId: "STF-MNT-WORKFLOW",
    });

    const create = await studentAgent.post("/api/v1/maintenance/me").send(buildMaintenancePayload(room._id));
    expect(create.status).toBe(201);
    const maintenanceId = create.body.data.maintenance.id;

    const assign = await provostAgent.patch(`/api/v1/maintenance/${maintenanceId}/assign`).send({
      staffId: staff._id.toString(),
    });
    expect(assign.status).toBe(200);
    expect(assign.body.data.maintenance.assignedTo.id).toBe(staff._id.toString());

    const assignedNotification = await Notification.findOne({
      recipient: staffUser._id,
      type: "maintenance_assigned",
      entityId: maintenanceId,
    }).lean();
    expect(assignedNotification).toBeTruthy();

    const update = await staffAgent.patch(`/api/v1/maintenance/assigned/${maintenanceId}`).send({
      status: "completed",
      workLog: "Inspected panel, replaced damaged wire and switch, tested full load.",
      estimatedCost: 1200,
      actualCost: 1050,
      materialUsed: [
        { name: "Switch", quantity: 1, cost: 250 },
        { name: "Copper wire", quantity: 2, cost: 800 },
      ],
      afterPhotos: ["https://example.com/after-photo.jpg"],
      invoiceDocument: "https://example.com/invoice.pdf",
    });
    expect(update.status).toBe(200);
    expect(update.body.data.maintenance.status).toBe("completed");
    expect(update.body.data.maintenance.completionDate).toBeTruthy();

    const ownerUser = await User.findOne({ email: /student-maintenance/ }).sort({ createdAt: -1 }).lean();
    const completionNotification = await Notification.findOne({
      recipient: ownerUser._id,
      type: "maintenance_completed",
      entityId: maintenanceId,
    }).lean();
    expect(completionNotification).toBeTruthy();
  });

  it("enforces staff scope and supports provost monitoring filters/search/date range", async () => {
    const roomA = await createRoom({ roomNumber: "C-110" });
    const roomB = await createRoom({ roomNumber: "C-111" });

    const alphaStudentAgent = request.agent(app);
    await registerStudent(alphaStudentAgent, {
      name: "Alpha Resident",
      phone: "+8801700060300",
    });

    const betaStudentAgent = request.agent(app);
    await registerStudent(betaStudentAgent, {
      name: "Beta Resident",
      phone: "+8801700060301",
    });

    const provostAgent = request.agent(app);
    await createAndLoginProvost(provostAgent, {
      name: "Filter Provost",
      phone: "+8801700060302",
    });

    const staffAgent = request.agent(app);
    const { staff: staffA } = await createAndLoginStaff(staffAgent, {
      name: "Staff A",
      phone: "+8801700060303",
      staffId: "STF-MNT-A",
    });

    const otherStaffAgent = request.agent(app);
    await createAndLoginStaff(otherStaffAgent, {
      name: "Staff B",
      phone: "+8801700060304",
      staffId: "STF-MNT-B",
    });

    const alphaCreate = await alphaStudentAgent.post("/api/v1/maintenance/me").send(
      buildMaintenancePayload(roomA._id, {
        issue: "Alpha ceiling fan not rotating",
        category: "appliance",
        severity: "critical",
      })
    );
    expect(alphaCreate.status).toBe(201);

    const betaCreate = await betaStudentAgent.post("/api/v1/maintenance/me").send(
      buildMaintenancePayload(roomB._id, {
        issue: "Beta door lock issue",
        category: "structural",
        severity: "medium",
      })
    );
    expect(betaCreate.status).toBe(201);

    const assign = await provostAgent.patch(`/api/v1/maintenance/${alphaCreate.body.data.maintenance.id}/assign`).send({
      staffId: staffA._id.toString(),
    });
    expect(assign.status).toBe(200);

    const blockedStaffAccess = await otherStaffAgent.get(`/api/v1/maintenance/assigned/${alphaCreate.body.data.maintenance.id}`);
    expect(blockedStaffAccess.status).toBe(404);

    const list = await provostAgent.get("/api/v1/maintenance").query({
      search: "C-110",
      category: "appliance",
      severity: "critical",
      assignedTo: staffA._id.toString(),
      startDate: "2020-01-01",
      endDate: "2030-12-31",
      page: 1,
      limit: 10,
      sortBy: "createdAt",
      sortOrder: "desc",
    });

    expect(list.status).toBe(200);
    expect(list.body.data.items).toHaveLength(1);
    expect(list.body.data.items[0].issue).toBe("Alpha ceiling fan not rotating");
    expect(list.body.meta.page).toBe(1);
    expect(list.body.data.summary.total).toBe(1);

    const count = await Maintenance.countDocuments();
    expect(count).toBe(2);
  });
});

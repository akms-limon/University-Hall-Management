import request from "supertest";
import app from "../src/app.js";
import { USER_ROLES } from "../src/constants/roles.js";
import { Notification } from "../src/models/Notification.js";
import { Room } from "../src/models/Room.js";
import { Staff } from "../src/models/Staff.js";
import { Task } from "../src/models/Task.js";
import { User } from "../src/models/User.js";

function uniqueEmail(prefix) {
  return `${prefix}.${Date.now()}.${Math.random().toString(16).slice(2)}@example.com`;
}

async function createAndLoginProvost(agent, overrides = {}) {
  const email = overrides.email || uniqueEmail("provost-task");
  const password = overrides.password || "StrongPass#123";

  await User.create({
    name: overrides.name || "Task Provost",
    email,
    phone: overrides.phone || "+8801700080001",
    password,
    role: USER_ROLES.PROVOST,
    isActive: true,
  });

  const login = await agent.post("/api/v1/auth/login").send({ email, password });
  expect(login.status).toBe(200);
}

async function createAndLoginStaff(agent, overrides = {}) {
  const email = overrides.email || uniqueEmail("staff-task");
  const password = overrides.password || "StrongPass#123";

  const user = await User.create({
    name: overrides.name || "Task Staff",
    email,
    phone: overrides.phone || "+8801700080002",
    password,
    role: USER_ROLES.STAFF,
    isActive: overrides.userIsActive ?? true,
  });

  const staff = await Staff.create({
    userId: user._id,
    staffId: overrides.staffId || `STF-TSK-${Math.random().toString(16).slice(2, 7).toUpperCase()}`,
    department: overrides.department || "Operations",
    designation: overrides.designation || "Supervisor",
    joiningDate: new Date("2025-01-01"),
    isActive: overrides.staffIsActive ?? true,
  });

  const login = await agent.post("/api/v1/auth/login").send({ email, password });
  expect(login.status).toBe(200);

  return { user, staff };
}

async function createRoom(overrides = {}) {
  return Room.create({
    roomNumber: overrides.roomNumber || `T-${Math.floor(Math.random() * 900 + 100)}`,
    floor: overrides.floor ?? 2,
    wing: overrides.wing || "East",
    capacity: overrides.capacity ?? 4,
    status: overrides.status || "occupied",
    isActive: overrides.isActive ?? true,
  });
}

function buildTaskPayload(staffId, roomId, overrides = {}) {
  return {
    title: "Deep clean dining area",
    description: "Clean floor, tables, and service counters before dinner shift starts.",
    assignedTo: staffId.toString(),
    room: roomId ? roomId.toString() : undefined,
    taskType: "cleaning",
    priority: "high",
    dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    attachments: ["https://example.com/task-checklist.pdf"],
    ...overrides,
  };
}

describe("Staff Task Management", () => {
  it("allows provost to create/list/detail tasks and notifies assigned staff", async () => {
    const provostAgent = request.agent(app);
    await createAndLoginProvost(provostAgent, {
      name: "Create Provost",
      phone: "+8801700080100",
    });

    const { staff, user: staffUser } = await createAndLoginStaff(request.agent(app), {
      name: "Assigned Staff",
      phone: "+8801700080101",
      staffId: "STF-TSK-1",
    });
    const room = await createRoom({ roomNumber: "D-101" });

    const create = await provostAgent.post("/api/v1/tasks").send(buildTaskPayload(staff._id, room._id));
    expect(create.status).toBe(201);
    expect(create.body.data.task.status).toBe("pending");
    expect(create.body.data.task.assignedTo.id).toBe(staff._id.toString());

    const list = await provostAgent.get("/api/v1/tasks").query({
      search: "dining",
      taskType: "cleaning",
      priority: "high",
      page: 1,
      limit: 10,
    });
    expect(list.status).toBe(200);
    expect(list.body.data.items).toHaveLength(1);

    const detail = await provostAgent.get(`/api/v1/tasks/${create.body.data.task.id}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.task.room.roomNumber).toBe("D-101");

    const notification = await Notification.findOne({
      recipient: staffUser._id,
      type: "task_assigned",
      entityId: create.body.data.task.id,
    }).lean();
    expect(notification).toBeTruthy();
  });

  it("allows staff to access only assigned tasks and update progress/completion", async () => {
    const provostAgent = request.agent(app);
    await createAndLoginProvost(provostAgent, {
      name: "Workflow Provost",
      phone: "+8801700080200",
    });

    const ownerStaffAgent = request.agent(app);
    const { staff: ownerStaff } = await createAndLoginStaff(ownerStaffAgent, {
      name: "Owner Staff",
      phone: "+8801700080201",
      staffId: "STF-TSK-2",
    });

    const otherStaffAgent = request.agent(app);
    await createAndLoginStaff(otherStaffAgent, {
      name: "Other Staff",
      phone: "+8801700080202",
      staffId: "STF-TSK-3",
    });

    const create = await provostAgent.post("/api/v1/tasks").send(
      buildTaskPayload(ownerStaff._id, null, {
        title: "Inspect water tanks",
        taskType: "inspection",
        priority: "urgent",
      })
    );
    expect(create.status).toBe(201);
    const taskId = create.body.data.task.id;

    const assignedList = await ownerStaffAgent.get("/api/v1/tasks/assigned").query({
      status: "pending",
      taskType: "inspection",
      page: 1,
      limit: 10,
    });
    expect(assignedList.status).toBe(200);
    expect(assignedList.body.data.items).toHaveLength(1);

    const blocked = await otherStaffAgent.get(`/api/v1/tasks/assigned/${taskId}`);
    expect(blocked.status).toBe(404);

    const update = await ownerStaffAgent.patch(`/api/v1/tasks/assigned/${taskId}`).send({
      status: "completed",
      completionNotes: "Tank valves checked and cleaned, no leak detected.",
      completionPhotos: ["https://example.com/completion-photo.jpg"],
    });
    expect(update.status).toBe(200);
    expect(update.body.data.task.status).toBe("completed");
    expect(update.body.data.task.completionDate).toBeTruthy();

    const provostUsers = await User.find({ role: USER_ROLES.PROVOST }).lean();
    const completionNotification = await Notification.findOne({
      recipient: { $in: provostUsers.map((entry) => entry._id) },
      type: "task_completed",
      entityId: taskId,
    }).lean();
    expect(completionNotification).toBeTruthy();
  });

  it("supports reassignment, provost status updates, and provost filters", async () => {
    const provostAgent = request.agent(app);
    await createAndLoginProvost(provostAgent, {
      name: "Monitor Provost",
      phone: "+8801700080300",
    });

    const { staff: staffA, user: staffAUser } = await createAndLoginStaff(request.agent(app), {
      name: "Staff A",
      phone: "+8801700080301",
      staffId: "STF-TSK-4",
    });
    const { staff: staffB, user: staffBUser } = await createAndLoginStaff(request.agent(app), {
      name: "Staff B",
      phone: "+8801700080302",
      staffId: "STF-TSK-5",
    });

    const room = await createRoom({ roomNumber: "E-301" });

    const create = await provostAgent.post("/api/v1/tasks").send(
      buildTaskPayload(staffA._id, room._id, {
        title: "Repair study room fan",
        taskType: "repair",
        priority: "medium",
      })
    );
    expect(create.status).toBe(201);
    const taskId = create.body.data.task.id;

    const reassign = await provostAgent.patch(`/api/v1/tasks/${taskId}`).send({
      assignedTo: staffB._id.toString(),
      priority: "high",
      dueDate: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    });
    expect(reassign.status).toBe(200);
    expect(reassign.body.data.task.assignedTo.id).toBe(staffB._id.toString());

    const newAssigneeNotification = await Notification.findOne({
      recipient: staffBUser._id,
      type: "task_assigned",
      entityId: taskId,
    }).lean();
    expect(newAssigneeNotification).toBeTruthy();

    const previousAssigneeNotification = await Notification.findOne({
      recipient: staffAUser._id,
      type: "task_reassigned",
      entityId: taskId,
    }).lean();
    expect(previousAssigneeNotification).toBeTruthy();

    const cancel = await provostAgent.patch(`/api/v1/tasks/${taskId}/status`).send({
      status: "cancelled",
      completionNotes: "Task cancelled due to room closure.",
    });
    expect(cancel.status).toBe(200);
    expect(cancel.body.data.task.status).toBe("cancelled");

    const list = await provostAgent.get("/api/v1/tasks").query({
      search: "repair",
      taskType: "repair",
      priority: "high",
      status: "cancelled",
      assignedTo: staffB._id.toString(),
      startDate: "2020-01-01",
      endDate: "2030-12-31",
      page: 1,
      limit: 10,
    });
    expect(list.status).toBe(200);
    expect(list.body.data.items).toHaveLength(1);
    expect(list.body.data.summary.cancelled).toBe(1);

    const count = await Task.countDocuments();
    expect(count).toBe(1);
  });
});


import request from "supertest";
import app from "../src/app.js";
import { USER_ROLES } from "../src/constants/roles.js";
import { Notification } from "../src/models/Notification.js";
import { Staff } from "../src/models/Staff.js";
import { SupportTicket } from "../src/models/SupportTicket.js";
import { User } from "../src/models/User.js";

function uniqueEmail(prefix) {
  return `${prefix}.${Date.now()}.${Math.random().toString(16).slice(2)}@example.com`;
}

async function registerStudent(agent, overrides = {}) {
  const email = overrides.email || uniqueEmail("student-support");
  const password = overrides.password || "StrongPass#123";

  const response = await agent.post("/api/v1/auth/register").send({
    name: overrides.name || "Support Student",
    email,
    phone: overrides.phone || "+8801700070001",
    password,
  });

  expect(response.status).toBe(201);
  return { email, password };
}

async function createAndLoginProvost(agent, overrides = {}) {
  const email = overrides.email || uniqueEmail("provost-support");
  const password = overrides.password || "StrongPass#123";

  await User.create({
    name: overrides.name || "Support Provost",
    email,
    phone: overrides.phone || "+8801700070002",
    password,
    role: USER_ROLES.PROVOST,
    isActive: true,
  });

  const login = await agent.post("/api/v1/auth/login").send({ email, password });
  expect(login.status).toBe(200);
}

async function createAndLoginStaff(agent, overrides = {}) {
  const email = overrides.email || uniqueEmail("staff-support");
  const password = overrides.password || "StrongPass#123";

  const user = await User.create({
    name: overrides.name || "Support Staff",
    email,
    phone: overrides.phone || "+8801700070003",
    password,
    role: USER_ROLES.STAFF,
    isActive: overrides.userIsActive ?? true,
  });

  const staff = await Staff.create({
    userId: user._id,
    staffId: overrides.staffId || `STF-SUP-${Math.random().toString(16).slice(2, 8).toUpperCase()}`,
    department: overrides.department || "Support",
    designation: overrides.designation || "Assistant",
    joiningDate: new Date("2025-01-01"),
    isActive: overrides.staffIsActive ?? true,
  });

  const login = await agent.post("/api/v1/auth/login").send({ email, password });
  expect(login.status).toBe(200);

  return { user, staff };
}

async function createStaffAccount(overrides = {}) {
  const email = overrides.email || uniqueEmail("staff-support");
  const password = overrides.password || "StrongPass#123";

  const user = await User.create({
    name: overrides.name || "Support Staff",
    email,
    phone: overrides.phone || "+8801700070004",
    password,
    role: USER_ROLES.STAFF,
    isActive: overrides.userIsActive ?? true,
  });

  const staff = await Staff.create({
    userId: user._id,
    staffId: overrides.staffId || `STF-SUP-${Math.random().toString(16).slice(2, 8).toUpperCase()}`,
    department: overrides.department || "Support",
    designation: overrides.designation || "Assistant",
    joiningDate: new Date("2025-01-01"),
    isActive: overrides.staffIsActive ?? true,
  });

  return { user, staff };
}

function buildTicketPayload(overrides = {}) {
  return {
    subject: "Meal payment issue",
    description: "I made a meal payment but my token is not visible in the list for tomorrow lunch.",
    category: "financial",
    priority: "high",
    attachments: ["https://example.com/payment-screenshot.png"],
    ...overrides,
  };
}

describe("Support Ticket Management", () => {
  it("allows student create/list/detail and blocks access to other students", async () => {
    const studentAgent = request.agent(app);
    await registerStudent(studentAgent, {
      name: "Owner Student",
      phone: "+8801700070100",
    });

    await createAndLoginProvost(request.agent(app), {
      name: "Provost Notified",
      phone: "+8801700070101",
    });

    const create = await studentAgent.post("/api/v1/support-tickets/me").send(buildTicketPayload());
    expect(create.status).toBe(201);
    expect(create.body.data.ticket.status).toBe("open");

    const list = await studentAgent.get("/api/v1/support-tickets/me").query({
      status: "open",
      page: 1,
      limit: 10,
      sortBy: "createdAt",
      sortOrder: "desc",
    });
    expect(list.status).toBe(200);
    expect(list.body.data.items).toHaveLength(1);
    expect(list.body.data.summary.open).toBe(1);

    const detail = await studentAgent.get(`/api/v1/support-tickets/me/${create.body.data.ticket.id}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.ticket.subject).toBe("Meal payment issue");

    const otherStudentAgent = request.agent(app);
    await registerStudent(otherStudentAgent, {
      name: "Other Student",
      phone: "+8801700070102",
    });

    const blocked = await otherStudentAgent.get(`/api/v1/support-tickets/me/${create.body.data.ticket.id}`);
    expect(blocked.status).toBe(404);

    const provostUsers = await User.find({ role: USER_ROLES.PROVOST }).lean();
    const notification = await Notification.findOne({
      recipient: { $in: provostUsers.map((entry) => entry._id) },
      type: "support_ticket_submitted",
      entityId: create.body.data.ticket.id,
    }).lean();
    expect(notification).toBeTruthy();
  });

  it("supports assignment, staff response/status update, and student notifications", async () => {
    const studentAgent = request.agent(app);
    const studentRegistration = await registerStudent(studentAgent, {
      name: "Workflow Student",
      phone: "+8801700070200",
    });

    const provostAgent = request.agent(app);
    await createAndLoginProvost(provostAgent, {
      name: "Workflow Provost",
      phone: "+8801700070201",
    });

    const staffAgent = request.agent(app);
    const { staff, user: staffUser } = await createAndLoginStaff(staffAgent, {
      name: "Workflow Staff",
      phone: "+8801700070202",
      staffId: "STF-SUP-WORKFLOW",
    });

    const create = await studentAgent.post("/api/v1/support-tickets/me").send(buildTicketPayload());
    expect(create.status).toBe(201);
    const ticketId = create.body.data.ticket.id;

    const assign = await provostAgent.patch(`/api/v1/support-tickets/${ticketId}/assign`).send({
      staffId: staff._id.toString(),
    });
    expect(assign.status).toBe(200);
    expect(assign.body.data.ticket.assignedTo.id).toBe(staff._id.toString());

    const assignedNotification = await Notification.findOne({
      recipient: staffUser._id,
      type: "support_ticket_assigned",
      entityId: ticketId,
    }).lean();
    expect(assignedNotification).toBeTruthy();

    const staffReply = await staffAgent.post(`/api/v1/support-tickets/assigned/${ticketId}/messages`).send({
      message: "We are checking your payment records with the finance system.",
    });
    expect(staffReply.status).toBe(200);
    expect(staffReply.body.data.ticket.messages.length).toBe(1);

    const studentUser = await User.findOne({ email: studentRegistration.email }).lean();
    const messageNotification = await Notification.findOne({
      recipient: studentUser._id,
      type: "support_ticket_message",
      entityId: ticketId,
    }).lean();
    expect(messageNotification).toBeTruthy();

    const update = await staffAgent.patch(`/api/v1/support-tickets/assigned/${ticketId}`).send({
      status: "resolved",
      resolution: "Payment sync completed and token generated successfully.",
    });
    expect(update.status).toBe(200);
    expect(update.body.data.ticket.status).toBe("resolved");
    expect(update.body.data.ticket.resolutionDate).toBeTruthy();

    const resolvedNotification = await Notification.findOne({
      recipient: studentUser._id,
      type: "support_ticket_resolved",
      entityId: ticketId,
    }).lean();
    expect(resolvedNotification).toBeTruthy();

    const studentReply = await studentAgent.post(`/api/v1/support-tickets/me/${ticketId}/messages`).send({
      message: "Thanks, I can now see the token.",
    });
    expect(studentReply.status).toBe(200);
    expect(studentReply.body.data.ticket.messages.length).toBe(2);
  });

  it("enforces staff scope and blocks inactive assignee", async () => {
    const studentAgent = request.agent(app);
    await registerStudent(studentAgent, {
      name: "Restricted Student",
      phone: "+8801700070300",
    });

    const provostAgent = request.agent(app);
    await createAndLoginProvost(provostAgent, {
      name: "Restriction Provost",
      phone: "+8801700070301",
    });

    const ownerStaffAgent = request.agent(app);
    const { staff: ownerStaff } = await createAndLoginStaff(ownerStaffAgent, {
      name: "Owner Staff",
      phone: "+8801700070302",
      staffId: "STF-SUP-OWNER",
    });

    const otherStaffAgent = request.agent(app);
    await createAndLoginStaff(otherStaffAgent, {
      name: "Other Staff",
      phone: "+8801700070303",
      staffId: "STF-SUP-OTHER",
    });

    const { staff: inactiveStaff } = await createStaffAccount({
      name: "Inactive Staff",
      phone: "+8801700070304",
      staffId: "STF-SUP-INACTIVE",
      staffIsActive: false,
      userIsActive: false,
    });

    const create = await studentAgent.post("/api/v1/support-tickets/me").send(
      buildTicketPayload({
        subject: "Wifi is down in room block",
        category: "technical",
        priority: "urgent",
      })
    );
    expect(create.status).toBe(201);
    const ticketId = create.body.data.ticket.id;

    const assignInactive = await provostAgent.patch(`/api/v1/support-tickets/${ticketId}/assign`).send({
      staffId: inactiveStaff._id.toString(),
    });
    expect(assignInactive.status).toBe(409);

    const assignOwner = await provostAgent.patch(`/api/v1/support-tickets/${ticketId}/assign`).send({
      staffId: ownerStaff._id.toString(),
    });
    expect(assignOwner.status).toBe(200);

    const blockedAccess = await otherStaffAgent.get(`/api/v1/support-tickets/assigned/${ticketId}`);
    expect(blockedAccess.status).toBe(404);
  });

  it("supports provost filters, pagination, search, date range, and status update", async () => {
    const alphaStudentAgent = request.agent(app);
    await registerStudent(alphaStudentAgent, {
      name: "Alpha Resident",
      phone: "+8801700070400",
    });

    const betaStudentAgent = request.agent(app);
    await registerStudent(betaStudentAgent, {
      name: "Beta Resident",
      phone: "+8801700070401",
    });

    const provostAgent = request.agent(app);
    await createAndLoginProvost(provostAgent, {
      name: "Monitor Provost",
      phone: "+8801700070402",
    });

    const { staff } = await createAndLoginStaff(request.agent(app), {
      name: "Monitor Staff",
      phone: "+8801700070403",
      staffId: "STF-SUP-MONITOR",
    });

    const alphaCreate = await alphaStudentAgent.post("/api/v1/support-tickets/me").send(
      buildTicketPayload({
        subject: "Alpha scholarship payment mismatch",
        category: "financial",
        priority: "urgent",
      })
    );
    expect(alphaCreate.status).toBe(201);

    const betaCreate = await betaStudentAgent.post("/api/v1/support-tickets/me").send(
      buildTicketPayload({
        subject: "Beta room portal login issue",
        category: "technical",
        priority: "low",
      })
    );
    expect(betaCreate.status).toBe(201);

    const assign = await provostAgent.patch(`/api/v1/support-tickets/${alphaCreate.body.data.ticket.id}/assign`).send({
      staffId: staff._id.toString(),
    });
    expect(assign.status).toBe(200);

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const list = await provostAgent.get("/api/v1/support-tickets").query({
      search: "alpha",
      category: "financial",
      priority: "urgent",
      assignedTo: staff._id.toString(),
      startDate: yesterday,
      endDate: tomorrow,
      page: 1,
      limit: 10,
      sortBy: "createdAt",
      sortOrder: "desc",
    });
    expect(list.status).toBe(200);
    expect(list.body.data.items).toHaveLength(1);
    expect(list.body.data.items[0].subject).toBe("Alpha scholarship payment mismatch");
    expect(list.body.meta.page).toBe(1);

    const close = await provostAgent.patch(`/api/v1/support-tickets/${alphaCreate.body.data.ticket.id}/status`).send({
      status: "closed",
      resolution: "Final confirmation completed and ticket closed by provost.",
    });
    expect(close.status).toBe(200);
    expect(close.body.data.ticket.status).toBe("closed");

    const ticketCount = await SupportTicket.countDocuments();
    expect(ticketCount).toBe(2);
  });
});

import request from "supertest";
import app from "../src/app.js";
import { USER_ROLES } from "../src/constants/roles.js";
import { Complaint } from "../src/models/Complaint.js";
import { Notification } from "../src/models/Notification.js";
import { Staff } from "../src/models/Staff.js";
import { User } from "../src/models/User.js";

function uniqueEmail(prefix) {
  return `${prefix}.${Date.now()}.${Math.random().toString(16).slice(2)}@example.com`;
}

async function registerStudent(agent, overrides = {}) {
  const email = overrides.email || uniqueEmail("student-complaint");
  const password = overrides.password || "StrongPass#123";

  const response = await agent.post("/api/v1/auth/register").send({
    name: overrides.name || "Complaint Student",
    email,
    phone: overrides.phone || "+8801700050001",
    password,
  });

  expect(response.status).toBe(201);
  return { email, password, user: response.body.data.user };
}

async function createAndLoginProvost(agent, overrides = {}) {
  const email = overrides.email || uniqueEmail("provost-complaint");
  const password = overrides.password || "StrongPass#123";

  await User.create({
    name: overrides.name || "Provost Complaint",
    email,
    phone: overrides.phone || "+8801700050002",
    password,
    role: USER_ROLES.PROVOST,
    isActive: true,
  });

  const login = await agent.post("/api/v1/auth/login").send({ email, password });
  expect(login.status).toBe(200);
}

async function createAndLoginStaff(agent, overrides = {}) {
  const email = overrides.email || uniqueEmail("staff-complaint");
  const password = overrides.password || "StrongPass#123";

  const user = await User.create({
    name: overrides.name || "Complaint Staff",
    email,
    phone: overrides.phone || "+8801700050003",
    password,
    role: USER_ROLES.STAFF,
    isActive: overrides.userIsActive ?? true,
  });

  const staff = await Staff.create({
    userId: user._id,
    staffId: overrides.staffId || `STF-${Math.random().toString(16).slice(2, 8).toUpperCase()}`,
    department: overrides.department || "Maintenance",
    designation: overrides.designation || "Technician",
    joiningDate: new Date("2025-01-01"),
    isActive: overrides.staffIsActive ?? true,
  });

  const login = await agent.post("/api/v1/auth/login").send({ email, password });
  expect(login.status).toBe(200);

  return { user, staff };
}

async function createStaffAccount(overrides = {}) {
  const email = overrides.email || uniqueEmail("staff-complaint");
  const password = overrides.password || "StrongPass#123";

  const user = await User.create({
    name: overrides.name || "Complaint Staff",
    email,
    phone: overrides.phone || "+8801700050004",
    password,
    role: USER_ROLES.STAFF,
    isActive: overrides.userIsActive ?? true,
  });

  const staff = await Staff.create({
    userId: user._id,
    staffId: overrides.staffId || `STF-${Math.random().toString(16).slice(2, 8).toUpperCase()}`,
    department: overrides.department || "Maintenance",
    designation: overrides.designation || "Technician",
    joiningDate: new Date("2025-01-01"),
    isActive: overrides.staffIsActive ?? true,
  });

  return { user, staff, email, password };
}

function buildComplaintPayload(overrides = {}) {
  return {
    title: "Water leakage in block A",
    description: "There is continuous water leakage from the washroom ceiling on the second floor.",
    category: "maintenance",
    severity: "high",
    attachments: ["https://example.com/leak-photo.jpg"],
    ...overrides,
  };
}

describe("Complaint Management", () => {
  it("allows a student to create, list, and fetch only their own complaints", async () => {
    const studentAgent = request.agent(app);
    await registerStudent(studentAgent, {
      name: "Owner Student",
      phone: "+8801700050100",
    });
    await createAndLoginProvost(request.agent(app), {
      name: "Provost Notified",
      phone: "+8801700050102",
    });

    const create = await studentAgent.post("/api/v1/complaints/me").send(buildComplaintPayload());
    expect(create.status).toBe(201);
    expect(create.body.data.complaint.status).toBe("open");

    const list = await studentAgent.get("/api/v1/complaints/me").query({
      status: "open",
      page: 1,
      limit: 10,
      sortBy: "createdAt",
      sortOrder: "desc",
    });
    expect(list.status).toBe(200);
    expect(list.body.data.items).toHaveLength(1);
    expect(list.body.data.summary.open).toBe(1);

    const detail = await studentAgent.get(`/api/v1/complaints/me/${create.body.data.complaint.id}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.complaint.title).toBe("Water leakage in block A");

    const otherStudentAgent = request.agent(app);
    await registerStudent(otherStudentAgent, {
      name: "Other Student",
      phone: "+8801700050101",
    });

    const blocked = await otherStudentAgent.get(`/api/v1/complaints/me/${create.body.data.complaint.id}`);
    expect(blocked.status).toBe(404);

    const provostUsers = await User.find({ role: USER_ROLES.PROVOST }).lean();
    const notification = await Notification.findOne({
      recipient: { $in: provostUsers.map((entry) => entry._id) },
      type: "complaint_submitted",
    }).lean();
    expect(notification).toBeTruthy();
  });

  it("supports provost assignment, staff resolution, and student feedback with notifications", async () => {
    const studentAgent = request.agent(app);
    const studentRegistration = await registerStudent(studentAgent, {
      name: "Feedback Student",
      phone: "+8801700050200",
    });

    const provostAgent = request.agent(app);
    await createAndLoginProvost(provostAgent, {
      name: "Provost Resolver",
      phone: "+8801700050201",
    });

    const staffAgent = request.agent(app);
    const { staff, user: staffUser } = await createAndLoginStaff(staffAgent, {
      name: "Assigned Staff",
      phone: "+8801700050202",
      staffId: "STF-COMPLAINT-1",
    });

    const create = await studentAgent.post("/api/v1/complaints/me").send(buildComplaintPayload());
    expect(create.status).toBe(201);
    const complaintId = create.body.data.complaint.id;

    const assign = await provostAgent.patch(`/api/v1/complaints/${complaintId}/assign`).send({
      staffId: staff._id.toString(),
    });
    expect(assign.status).toBe(200);
    expect(assign.body.data.complaint.assignedTo.id).toBe(staff._id.toString());

    const assignedNotification = await Notification.findOne({
      recipient: staffUser._id,
      type: "complaint_assigned",
      entityId: complaintId,
    }).lean();
    expect(assignedNotification).toBeTruthy();

    const resolve = await staffAgent.patch(`/api/v1/complaints/assigned/${complaintId}`).send({
      status: "resolved",
      resolution: "Plumbing line repaired and the leakage source was sealed.",
    });
    expect(resolve.status).toBe(200);
    expect(resolve.body.data.complaint.status).toBe("resolved");
    expect(resolve.body.data.complaint.resolution).toContain("Plumbing line repaired");

    const studentUser = await User.findOne({ email: studentRegistration.email }).lean();
    const statusNotification = await Notification.findOne({
      recipient: studentUser._id,
      type: "complaint_status_updated",
      entityId: complaintId,
    }).lean();
    expect(statusNotification).toBeTruthy();

    const feedback = await studentAgent.patch(`/api/v1/complaints/me/${complaintId}/feedback`).send({
      feedback: "The issue was resolved quickly and properly.",
      rating: 4.5,
    });
    expect(feedback.status).toBe(200);
    expect(feedback.body.data.complaint.rating).toBe(4.5);

    const feedbackNotification = await Notification.findOne({
      type: "complaint_feedback_submitted",
      entityId: complaintId,
    }).lean();
    expect(feedbackNotification).toBeTruthy();
  });

  it("enforces staff scope, staff status rules, and feedback timing restrictions", async () => {
    const studentAgent = request.agent(app);
    await registerStudent(studentAgent, {
      name: "Restricted Student",
      phone: "+8801700050300",
    });

    const provostAgent = request.agent(app);
    await createAndLoginProvost(provostAgent, {
      name: "Provost Restriction",
      phone: "+8801700050301",
    });

    const ownerStaffAgent = request.agent(app);
    const { staff: ownerStaff } = await createAndLoginStaff(ownerStaffAgent, {
      name: "Owner Staff",
      phone: "+8801700050302",
      staffId: "STF-COMPLAINT-2",
    });

    const otherStaffAgent = request.agent(app);
    await createAndLoginStaff(otherStaffAgent, {
      name: "Other Staff",
      phone: "+8801700050303",
      staffId: "STF-COMPLAINT-3",
    });

    const create = await studentAgent.post("/api/v1/complaints/me").send(buildComplaintPayload({
      title: "Dining hall hygiene issue",
      category: "hygiene",
      severity: "medium",
    }));
    expect(create.status).toBe(201);
    const complaintId = create.body.data.complaint.id;

    const prematureFeedback = await studentAgent.patch(`/api/v1/complaints/me/${complaintId}/feedback`).send({
      rating: 3,
    });
    expect(prematureFeedback.status).toBe(409);

    const assign = await provostAgent.patch(`/api/v1/complaints/${complaintId}/assign`).send({
      staffId: ownerStaff._id.toString(),
    });
    expect(assign.status).toBe(200);

    const unrelatedAccess = await otherStaffAgent.get(`/api/v1/complaints/assigned/${complaintId}`);
    expect(unrelatedAccess.status).toBe(404);

    const blockedClose = await ownerStaffAgent.patch(`/api/v1/complaints/assigned/${complaintId}`).send({
      status: "closed",
      resolution: "Trying to close without provost approval.",
    });
    expect(blockedClose.status).toBe(400);
  });

  it("supports provost search, filters, pagination, and blocks inactive assignee selection", async () => {
    const alphaStudentAgent = request.agent(app);
    await registerStudent(alphaStudentAgent, {
      name: "Alpha Resident",
      phone: "+8801700050400",
    });

    const betaStudentAgent = request.agent(app);
    await registerStudent(betaStudentAgent, {
      name: "Beta Resident",
      phone: "+8801700050401",
    });

    const provostAgent = request.agent(app);
    await createAndLoginProvost(provostAgent, {
      name: "Provost Monitor",
      phone: "+8801700050402",
    });

    const { staff: activeStaff } = await createAndLoginStaff(request.agent(app), {
      name: "Active Staff",
      phone: "+8801700050403",
      staffId: "STF-COMPLAINT-4",
    });

    const { staff: inactiveStaff } = await createStaffAccount({
      name: "Inactive Staff",
      phone: "+8801700050404",
      staffId: "STF-COMPLAINT-5",
      staffIsActive: false,
      userIsActive: false,
    });

    const alphaCreate = await alphaStudentAgent.post("/api/v1/complaints/me").send(buildComplaintPayload({
      title: "Alpha room fan is broken",
      category: "facility",
      severity: "critical",
    }));
    expect(alphaCreate.status).toBe(201);

    const betaCreate = await betaStudentAgent.post("/api/v1/complaints/me").send(buildComplaintPayload({
      title: "Beta meal quality concern",
      category: "food_quality",
      severity: "low",
    }));
    expect(betaCreate.status).toBe(201);

    const assignActive = await provostAgent.patch(`/api/v1/complaints/${alphaCreate.body.data.complaint.id}/assign`).send({
      staffId: activeStaff._id.toString(),
    });
    expect(assignActive.status).toBe(200);

    const assignInactive = await provostAgent.patch(`/api/v1/complaints/${betaCreate.body.data.complaint.id}/assign`).send({
      staffId: inactiveStaff._id.toString(),
    });
    expect(assignInactive.status).toBe(409);

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const list = await provostAgent.get("/api/v1/complaints").query({
      search: "alpha",
      category: "facility",
      severity: "critical",
      assignedTo: activeStaff._id.toString(),
      startDate: yesterday,
      endDate: tomorrow,
      page: 1,
      limit: 10,
      sortBy: "createdAt",
      sortOrder: "desc",
    });

    expect(list.status).toBe(200);
    expect(list.body.data.items).toHaveLength(1);
    expect(list.body.data.items[0].title).toBe("Alpha room fan is broken");
    expect(list.body.meta.page).toBe(1);
    expect(list.body.data.summary.totalComplaints).toBe(1);

    const complaintCount = await Complaint.countDocuments();
    expect(complaintCount).toBe(2);
  });
});

import request from "supertest";
import app from "../src/app.js";
import { USER_ROLES } from "../src/constants/roles.js";
import { Notification } from "../src/models/Notification.js";
import { Staff } from "../src/models/Staff.js";
import { User } from "../src/models/User.js";

function uniqueEmail(prefix) {
  return `${prefix}.${Date.now()}.${Math.random().toString(16).slice(2)}@example.com`;
}

async function registerStudent(agent, overrides = {}) {
  const email = overrides.email || uniqueEmail("student-notice");
  const password = overrides.password || "StrongPass#123";

  const response = await agent.post("/api/v1/auth/register").send({
    name: overrides.name || "Notice Student",
    email,
    phone: overrides.phone || "+8801700090001",
    password,
  });

  expect(response.status).toBe(201);
  const user = await User.findOne({ email });
  return { email, password, user };
}

async function createAndLoginProvost(agent, overrides = {}) {
  const email = overrides.email || uniqueEmail("provost-notice");
  const password = overrides.password || "StrongPass#123";

  await User.create({
    name: overrides.name || "Notice Provost",
    email,
    phone: overrides.phone || "+8801700090002",
    password,
    role: USER_ROLES.PROVOST,
    isActive: true,
  });

  const login = await agent.post("/api/v1/auth/login").send({ email, password });
  expect(login.status).toBe(200);
}

async function createAndLoginStaff(agent, overrides = {}) {
  const email = overrides.email || uniqueEmail("staff-notice");
  const password = overrides.password || "StrongPass#123";

  const user = await User.create({
    name: overrides.name || "Notice Staff",
    email,
    phone: overrides.phone || "+8801700090003",
    password,
    role: USER_ROLES.STAFF,
    isActive: true,
  });

  await Staff.create({
    userId: user._id,
    staffId: overrides.staffId || `STF-NOT-${Math.random().toString(16).slice(2, 8).toUpperCase()}`,
    department: "Operations",
    designation: "Supervisor",
    joiningDate: new Date("2025-01-01"),
    isActive: true,
  });

  const login = await agent.post("/api/v1/auth/login").send({ email, password });
  expect(login.status).toBe(200);

  return { user };
}

function buildNoticePayload(overrides = {}) {
  return {
    title: "Dining hall update",
    content: "Dinner service will start 30 minutes late due to kitchen maintenance.",
    category: "announcement",
    targetAudience: "all",
    attachments: ["https://example.com/notice.pdf"],
    isUrgent: false,
    isActive: true,
    ...overrides,
  };
}

describe("Notice Board and Notification Management", () => {
  it("allows provost to create/list/detail/update/publish/activate notices", async () => {
    const provostAgent = request.agent(app);
    await createAndLoginProvost(provostAgent, {
      name: "Publish Provost",
      phone: "+8801700090100",
    });

    const studentAgent = request.agent(app);
    const { user: studentUser } = await registerStudent(studentAgent, {
      name: "Recipient Student",
      phone: "+8801700090101",
    });

    const staffAgent = request.agent(app);
    await createAndLoginStaff(staffAgent, {
      name: "Non Recipient Staff",
      phone: "+8801700090102",
      staffId: "STF-NOT-1",
    });

    const create = await provostAgent.post("/api/v1/notices").send(
      buildNoticePayload({
        title: "Urgent campus alert",
        category: "emergency",
        targetAudience: "students",
        isUrgent: true,
      })
    );
    expect(create.status).toBe(201);
    expect(create.body.data.notice.targetAudience).toBe("students");
    const noticeId = create.body.data.notice.id;

    const list = await provostAgent.get("/api/v1/notices").query({
      category: "emergency",
      targetAudience: "students",
      isUrgent: true,
      page: 1,
      limit: 10,
    });
    expect(list.status).toBe(200);
    expect(list.body.data.items).toHaveLength(1);
    expect(list.body.data.summary.urgent).toBe(1);

    const detail = await provostAgent.get(`/api/v1/notices/${noticeId}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.notice.id).toBe(noticeId);

    const update = await provostAgent.patch(`/api/v1/notices/${noticeId}`).send({
      title: "Urgent campus alert - updated",
      content: "Emergency drill starts at 8 PM.",
    });
    expect(update.status).toBe(200);
    expect(update.body.data.notice.title).toBe("Urgent campus alert - updated");

    const deactivate = await provostAgent.patch(`/api/v1/notices/${noticeId}/active`).send({ isActive: false });
    expect(deactivate.status).toBe(200);
    expect(deactivate.body.data.notice.isActive).toBe(false);

    const publish = await provostAgent.patch(`/api/v1/notices/${noticeId}/publish`).send();
    expect(publish.status).toBe(200);
    expect(publish.body.data.notice.isActive).toBe(true);

    const notification = await Notification.findOne({
      recipient: studentUser._id,
      type: "notice_urgent",
      entityId: noticeId,
    }).lean();
    expect(notification).toBeTruthy();
  });

  it("enforces audience visibility for student/staff feeds and scoped detail access", async () => {
    const provostAgent = request.agent(app);
    await createAndLoginProvost(provostAgent, {
      name: "Visibility Provost",
      phone: "+8801700090200",
    });

    const ownerStudentAgent = request.agent(app);
    const { user: ownerStudentUser } = await registerStudent(ownerStudentAgent, {
      name: "Owner Student",
      phone: "+8801700090201",
    });

    const otherStudentAgent = request.agent(app);
    await registerStudent(otherStudentAgent, {
      name: "Other Student",
      phone: "+8801700090202",
    });

    const staffAgent = request.agent(app);
    await createAndLoginStaff(staffAgent, {
      name: "Assigned Staff",
      phone: "+8801700090203",
      staffId: "STF-NOT-2",
    });

    const allNotice = await provostAgent.post("/api/v1/notices").send(buildNoticePayload({ title: "All users notice" }));
    const studentsNotice = await provostAgent.post("/api/v1/notices").send(
      buildNoticePayload({ title: "Students notice", targetAudience: "students" })
    );
    const staffNotice = await provostAgent.post("/api/v1/notices").send(
      buildNoticePayload({ title: "Staff notice", targetAudience: "staff" })
    );
    const specificNotice = await provostAgent.post("/api/v1/notices").send(
      buildNoticePayload({
        title: "Specific student notice",
        targetAudience: "specific",
        targetUsers: [ownerStudentUser._id.toString()],
      })
    );
    await provostAgent.post("/api/v1/notices").send(
      buildNoticePayload({
        title: "Expired notice",
        targetAudience: "students",
        expiryDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      })
    );
    await provostAgent.post("/api/v1/notices").send(
      buildNoticePayload({
        title: "Inactive notice",
        targetAudience: "students",
        isActive: false,
      })
    );

    const ownerList = await ownerStudentAgent.get("/api/v1/notices/me").query({ page: 1, limit: 20 });
    expect(ownerList.status).toBe(200);
    expect(ownerList.body.data.items.map((item) => item.title).sort()).toEqual(
      ["All users notice", "Specific student notice", "Students notice"].sort()
    );

    const otherList = await otherStudentAgent.get("/api/v1/notices/me").query({ page: 1, limit: 20 });
    expect(otherList.status).toBe(200);
    expect(otherList.body.data.items.map((item) => item.title).sort()).toEqual(
      ["All users notice", "Students notice"].sort()
    );

    const staffList = await staffAgent.get("/api/v1/notices/me").query({ page: 1, limit: 20 });
    expect(staffList.status).toBe(200);
    expect(staffList.body.data.items.map((item) => item.title).sort()).toEqual(
      ["All users notice", "Staff notice"].sort()
    );

    const blockedStudentDetail = await ownerStudentAgent.get(`/api/v1/notices/me/${staffNotice.body.data.notice.id}`);
    expect(blockedStudentDetail.status).toBe(404);

    const accessibleStudentDetail = await ownerStudentAgent.get(`/api/v1/notices/me/${studentsNotice.body.data.notice.id}`);
    expect(accessibleStudentDetail.status).toBe(200);

    const specificForOwner = await ownerStudentAgent.get(`/api/v1/notices/me/${specificNotice.body.data.notice.id}`);
    expect(specificForOwner.status).toBe(200);

    const blockedSpecificForOther = await otherStudentAgent.get(`/api/v1/notices/me/${specificNotice.body.data.notice.id}`);
    expect(blockedSpecificForOther.status).toBe(404);

    const provostDetail = await provostAgent.get(`/api/v1/notices/${allNotice.body.data.notice.id}`);
    expect(provostDetail.status).toBe(200);
  });

  it("blocks non-provost users from provost notice management endpoints", async () => {
    const staffAgent = request.agent(app);
    await createAndLoginStaff(staffAgent, {
      name: "Blocked Staff",
      phone: "+8801700090300",
      staffId: "STF-NOT-3",
    });

    const blockedCreate = await staffAgent.post("/api/v1/notices").send(buildNoticePayload());
    expect(blockedCreate.status).toBe(403);

    const blockedList = await staffAgent.get("/api/v1/notices");
    expect(blockedList.status).toBe(403);
  });
});

import request from "supertest";
import app from "../src/app.js";
import { USER_ROLES } from "../src/constants/roles.js";
import { Notification } from "../src/models/Notification.js";
import { User } from "../src/models/User.js";

function uniqueEmail(prefix) {
  return `${prefix}.${Date.now()}.${Math.random().toString(16).slice(2)}@example.com`;
}

async function createAndLoginProvost(agent) {
  const email = uniqueEmail("provost-notification");
  const password = "StrongPass#123";

  await User.create({
    name: "Provost User",
    email,
    phone: "+8801700060001",
    password,
    role: USER_ROLES.PROVOST,
    isActive: true,
  });

  const login = await agent.post("/api/v1/auth/login").send({ email, password });
  expect(login.status).toBe(200);
}

async function createAndLoginStudent(agent) {
  const email = uniqueEmail("student-notification");
  const password = "StrongPass#123";
  const register = await agent.post("/api/v1/auth/register").send({
    name: "Student User",
    email,
    phone: "+8801700060002",
    password,
  });
  expect(register.status).toBe(201);
  return { email, password, user: register.body.data.user };
}

describe("Notification system", () => {
  it("lists and marks notifications as read for authenticated user", async () => {
    const studentAgent = request.agent(app);
    const { user } = await createAndLoginStudent(studentAgent);

    const saved = await Notification.create({
      recipient: user.id,
      type: "test_notification",
      title: "Test Notification",
      message: "This is a test notification for read state flow.",
      link: "/student/dashboard",
    });

    const unreadCount = await studentAgent.get("/api/v1/notifications/unread-count");
    expect(unreadCount.status).toBe(200);
    expect(unreadCount.body.data.unreadCount).toBe(1);

    const list = await studentAgent.get("/api/v1/notifications").query({ unreadOnly: true });
    expect(list.status).toBe(200);
    expect(list.body.data.items).toHaveLength(1);
    expect(list.body.data.items[0].id).toBe(saved._id.toString());

    const markOne = await studentAgent.patch(`/api/v1/notifications/${saved._id}/read`);
    expect(markOne.status).toBe(200);
    expect(markOne.body.data.notification.isRead).toBe(true);

    const markAll = await studentAgent.patch("/api/v1/notifications/read-all");
    expect(markAll.status).toBe(200);
    expect(markAll.body.data.updatedCount).toBe(0);
  });

  it("creates notifications on hall application events", async () => {
    const provostAgent = request.agent(app);
    await createAndLoginProvost(provostAgent);

    const studentAgent = request.agent(app);
    await createAndLoginStudent(studentAgent);

    const submit = await studentAgent.post("/api/v1/hall-applications/me").send({
      registrationNumber: "CSE-24-9001",
      department: "CSE",
      semester: 2,
      contactPhone: "+8801700060003",
      emergencyContact: {
        name: "Guardian Name",
        phone: "+8801700060004",
        relation: "Father",
      },
      reason: "I need hall accommodation due to distance and early morning classes.",
    });
    expect(submit.status).toBe(201);

    const provostNotifications = await provostAgent.get("/api/v1/notifications");
    expect(provostNotifications.status).toBe(200);
    expect(provostNotifications.body.data.items.length).toBeGreaterThan(0);
    expect(provostNotifications.body.data.items[0].type).toBe("hall_application_submitted");

    const approve = await provostAgent.patch(`/api/v1/hall-applications/${submit.body.data.application.id}/approve`).send({
      approvalNote: "Approved after document verification.",
    });
    expect(approve.status).toBe(200);

    const studentNotifications = await studentAgent.get("/api/v1/notifications");
    expect(studentNotifications.status).toBe(200);
    expect(studentNotifications.body.data.items.length).toBeGreaterThan(0);
    expect(studentNotifications.body.data.items[0].type).toBe("hall_application_status_changed");
  });

  it("rejects unauthenticated notification access", async () => {
    const response = await request(app).get("/api/v1/notifications");
    expect(response.status).toBe(401);
  });
});

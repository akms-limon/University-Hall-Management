import request from "supertest";
import app from "../src/app.js";
import { USER_ROLES } from "../src/constants/roles.js";
import { HALL_APPLICATION_STATUS } from "../src/models/HallApplication.js";
import { Student } from "../src/models/Student.js";
import { User } from "../src/models/User.js";

function uniqueEmail(prefix) {
  return `${prefix}.${Date.now()}.${Math.random().toString(16).slice(2)}@example.com`;
}

async function registerStudent(agent, overrides = {}) {
  const email = overrides.email || uniqueEmail("student-hall");
  const password = overrides.password || "StrongPass#123";

  const response = await agent.post("/api/v1/auth/register").send({
    name: overrides.name || "Student Applicant",
    email,
    phone: overrides.phone || "+8801700010001",
    password,
  });

  expect(response.status).toBe(201);
  return { email, password, user: response.body.data.user };
}

async function createAndLoginProvost(agent) {
  const email = uniqueEmail("provost-hall");
  const password = "StrongPass#123";

  await User.create({
    name: "Provost Reviewer",
    email,
    phone: "+8801700099999",
    password,
    role: USER_ROLES.PROVOST,
    isActive: true,
  });

  const login = await agent.post("/api/v1/auth/login").send({ email, password });
  expect(login.status).toBe(200);
}

function buildApplicationPayload(overrides = {}) {
  return {
    registrationNumber: "CSE-24-1001",
    department: "CSE",
    semester: 2,
    contactPhone: "+8801700010100",
    emergencyContact: {
      name: "Guardian Name",
      phone: "+8801700010200",
      relation: "Father",
    },
    reason: "I need hall accommodation due to long commute distance and regular morning classes.",
    attachments: ["https://example.com/document-1.pdf"],
    ...overrides,
  };
}

describe("Hall Application", () => {
  it("allows a student to submit and view own hall application", async () => {
    const studentAgent = request.agent(app);
    await registerStudent(studentAgent);

    const submit = await studentAgent.post("/api/v1/hall-applications/me").send(buildApplicationPayload());
    expect(submit.status).toBe(201);
    expect(submit.body.data.application.status).toBe(HALL_APPLICATION_STATUS.PENDING);

    const list = await studentAgent.get("/api/v1/hall-applications/me");
    expect(list.status).toBe(200);
    expect(list.body.data.items).toHaveLength(1);

    const latest = await studentAgent.get("/api/v1/hall-applications/me/latest");
    expect(latest.status).toBe(200);
    expect(latest.body.data.application.id).toBe(submit.body.data.application.id);

    const details = await studentAgent.get(`/api/v1/hall-applications/me/${submit.body.data.application.id}`);
    expect(details.status).toBe(200);
    expect(details.body.data.application.registrationNumber).toBe("CSE-24-1001");
  });

  it("blocks duplicate active applications from the same student", async () => {
    const studentAgent = request.agent(app);
    await registerStudent(studentAgent);

    const first = await studentAgent.post("/api/v1/hall-applications/me").send(buildApplicationPayload());
    expect(first.status).toBe(201);

    const second = await studentAgent.post("/api/v1/hall-applications/me").send(
      buildApplicationPayload({
        reason: "I am submitting another request with a different reason to test duplication.",
      })
    );

    expect(second.status).toBe(409);
  });

  it("blocks transfer request in general application module for both allocated and non-allocated students", async () => {
    const allocatedStudentAgent = request.agent(app);
    const allocatedRegistration = await registerStudent(allocatedStudentAgent, {
      name: "Allocated Student",
      phone: "+8801700010999",
    });

    const allocatedStudent = await Student.findOne({ userId: allocatedRegistration.user.id });
    allocatedStudent.allocationStatus = "allocated";
    await allocatedStudent.save();

    const transferSubmit = await allocatedStudentAgent.post("/api/v1/hall-applications/me").send(
      buildApplicationPayload({
        registrationNumber: "CSE-24-TRANSFER-1",
        requestType: "transfer_request",
      })
    );
    expect(transferSubmit.status).toBe(400);

    const nonAllocatedAgent = request.agent(app);
    await registerStudent(nonAllocatedAgent, {
      name: "Non Allocated Student",
      phone: "+8801700010888",
    });

    const blockedTransfer = await nonAllocatedAgent.post("/api/v1/hall-applications/me").send(
      buildApplicationPayload({
        registrationNumber: "CSE-24-TRANSFER-2",
        requestType: "transfer_request",
      })
    );
    expect(blockedTransfer.status).toBe(400);
  });

  it("allows student edit only while application is pending", async () => {
    const studentAgent = request.agent(app);
    await registerStudent(studentAgent, {
      name: "Pending Edit Student",
      phone: "+8801700010300",
    });

    const submit = await studentAgent.post("/api/v1/hall-applications/me").send(buildApplicationPayload());
    expect(submit.status).toBe(201);
    const applicationId = submit.body.data.application.id;

    const editPending = await studentAgent.patch(`/api/v1/hall-applications/me/${applicationId}`).send({
      reason: "Updated pending reason because additional transport challenges emerged recently.",
    });
    expect(editPending.status).toBe(200);

    const provostAgent = request.agent(app);
    await createAndLoginProvost(provostAgent);
    const review = await provostAgent.patch(`/api/v1/hall-applications/${applicationId}/status`).send({
      status: HALL_APPLICATION_STATUS.UNDER_REVIEW,
      reviewNote: "Documents verified, moving to under review.",
    });
    expect(review.status).toBe(200);

    const editAfterReview = await studentAgent.patch(`/api/v1/hall-applications/me/${applicationId}`).send({
      reason: "Trying to edit after review.",
    });
    expect(editAfterReview.status).toBe(409);
  });

  it("supports provost list, search/filter, and review actions", async () => {
    const alphaAgent = request.agent(app);
    await registerStudent(alphaAgent, {
      name: "Alpha Applicant",
      phone: "+8801700010400",
    });
    const alphaSubmit = await alphaAgent.post("/api/v1/hall-applications/me").send(
      buildApplicationPayload({
        registrationNumber: "CSE-24-ALPHA",
        department: "CSE",
        semester: 3,
      })
    );
    expect(alphaSubmit.status).toBe(201);

    const betaAgent = request.agent(app);
    await registerStudent(betaAgent, {
      name: "Beta Applicant",
      phone: "+8801700010500",
    });
    const betaSubmit = await betaAgent.post("/api/v1/hall-applications/me").send(
      buildApplicationPayload({
        registrationNumber: "EEE-24-BETA",
        department: "EEE",
        semester: 2,
        reason: "I need hall support because my residence is outside city and I have evening labs.",
      })
    );
    expect(betaSubmit.status).toBe(201);

    const provostAgent = request.agent(app);
    await createAndLoginProvost(provostAgent);

    const list = await provostAgent.get("/api/v1/hall-applications").query({
      search: "alpha",
      department: "CSE",
      status: HALL_APPLICATION_STATUS.PENDING,
      requestType: "new_room_request",
      page: 1,
      limit: 10,
      sortBy: "applicationDate",
      sortOrder: "desc",
    });
    expect(list.status).toBe(200);
    expect(list.body.data.items).toHaveLength(1);
    expect(list.body.data.items[0].registrationNumber).toBe("CSE-24-ALPHA");

    const schedule = await provostAgent
      .patch(`/api/v1/hall-applications/${alphaSubmit.body.data.application.id}/schedule-meeting`)
      .send({
        meetingDate: "2026-03-20T10:00:00.000Z",
        meetingNote: "Bring original student ID card.",
      });
    expect(schedule.status).toBe(200);
    expect(schedule.body.data.application.status).toBe(HALL_APPLICATION_STATUS.MEETING_SCHEDULED);
    expect(schedule.body.data.application.reviewedBy.role).toBe(USER_ROLES.PROVOST);

    const approve = await provostAgent
      .patch(`/api/v1/hall-applications/${alphaSubmit.body.data.application.id}/approve`)
      .send({
        approvalNote: "Approved after successful interview.",
      });
    expect(approve.status).toBe(200);
    expect(approve.body.data.application.status).toBe(HALL_APPLICATION_STATUS.APPROVED);
    expect(approve.body.data.application.approvalNote).toBe("Approved after successful interview.");

    const rejectWithoutReason = await provostAgent
      .patch(`/api/v1/hall-applications/${betaSubmit.body.data.application.id}/status`)
      .send({
        status: HALL_APPLICATION_STATUS.REJECTED,
      });
    expect(rejectWithoutReason.status).toBe(400);
  });

  it("blocks non-provost users from provost hall application endpoints", async () => {
    const studentAgent = request.agent(app);
    await registerStudent(studentAgent, {
      name: "Blocked Student",
      phone: "+8801700010600",
    });

    const list = await studentAgent.get("/api/v1/hall-applications");
    expect(list.status).toBe(403);
  });
});

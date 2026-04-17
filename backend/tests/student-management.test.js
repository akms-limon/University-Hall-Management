import request from "supertest";
import app from "../src/app.js";
import { USER_ROLES } from "../src/constants/roles.js";
import { Student, STUDENT_ALLOCATION_STATUS } from "../src/models/Student.js";
import { User } from "../src/models/User.js";

function uniqueEmail(prefix) {
  return `${prefix}.${Date.now()}.${Math.random().toString(16).slice(2)}@example.com`;
}

async function createAndLoginProvost(agent) {
  const email = uniqueEmail("provost-student-mgmt");
  const password = "StrongPass#123";

  await User.create({
    name: "Provost User",
    email,
    phone: "+8801700001001",
    password,
    role: USER_ROLES.PROVOST,
    isActive: true,
  });

  const login = await agent.post("/api/v1/auth/login").send({ email, password });
  expect(login.status).toBe(200);
}

describe("Student Management", () => {
  it("allows provost to create a student account and profile", async () => {
    const provostAgent = request.agent(app);
    await createAndLoginProvost(provostAgent);

    const email = uniqueEmail("created-student");
    const response = await provostAgent.post("/api/v1/students").send({
      name: "New Student",
      email,
      password: "StrongPass#123",
      phone: "+8801700001002",
      registrationNumber: "CSE-24-001",
      department: "CSE",
      semester: 2,
      allocationStatus: STUDENT_ALLOCATION_STATUS.PENDING,
      emergencyContact: {
        name: "Guardian One",
        phone: "+8801700001003",
        relation: "Father",
      },
    });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.student.user.role).toBe(USER_ROLES.STUDENT);
    expect(response.body.data.student.department).toBe("CSE");

    const savedUser = await User.findOne({ email }).lean();
    const savedStudent = await Student.findOne({ userId: savedUser._id }).lean();

    expect(savedUser).toBeTruthy();
    expect(savedUser.role).toBe(USER_ROLES.STUDENT);
    expect(savedStudent).toBeTruthy();
    expect(savedStudent.registrationNumber).toBe("CSE-24-001");
  });

  it("supports provost list query with search, filter, sort, and pagination", async () => {
    const provostAgent = request.agent(app);
    await createAndLoginProvost(provostAgent);

    const alphaUser = await User.create({
      name: "Alpha Student",
      email: uniqueEmail("alpha"),
      phone: "+8801700001004",
      password: "StrongPass#123",
      role: USER_ROLES.STUDENT,
      isActive: true,
    });

    const betaUser = await User.create({
      name: "Beta Student",
      email: uniqueEmail("beta"),
      phone: "+8801700001005",
      password: "StrongPass#123",
      role: USER_ROLES.STUDENT,
      isActive: true,
    });

    await Student.create({
      userId: alphaUser._id,
      registrationNumber: "CSE-24-ALPHA",
      department: "CSE",
      semester: 2,
      allocationStatus: STUDENT_ALLOCATION_STATUS.ALLOCATED,
      isActive: true,
    });

    await Student.create({
      userId: betaUser._id,
      registrationNumber: "EEE-24-BETA",
      department: "EEE",
      semester: 3,
      allocationStatus: STUDENT_ALLOCATION_STATUS.PENDING,
      isActive: true,
    });

    const response = await provostAgent
      .get("/api/v1/students")
      .query({
        search: "alpha",
        department: "CSE",
        semester: 2,
        allocationStatus: STUDENT_ALLOCATION_STATUS.ALLOCATED,
        isActive: true,
        page: 1,
        limit: 10,
        sortBy: "name",
        sortOrder: "asc",
      });

    expect(response.status).toBe(200);
    expect(response.body.data.items).toHaveLength(1);
    expect(response.body.data.items[0].user.name).toBe("Alpha Student");
    expect(response.body.meta.page).toBe(1);
    expect(response.body.meta.limit).toBe(10);
    expect(response.body.data.summary.totalStudents).toBe(1);
  });

  it("blocks non-provost users from provost student management endpoints", async () => {
    const studentAgent = request.agent(app);
    const studentEmail = uniqueEmail("student-blocked");
    const password = "StrongPass#123";

    await studentAgent.post("/api/v1/auth/register").send({
      name: "Blocked Student",
      email: studentEmail,
      phone: "+8801700001006",
      password,
    });

    const listResponse = await studentAgent.get("/api/v1/students");
    expect(listResponse.status).toBe(403);
  });

  it("supports student self-profile read and safe self-update", async () => {
    const studentAgent = request.agent(app);
    const email = uniqueEmail("self-profile");
    const password = "StrongPass#123";

    await studentAgent.post("/api/v1/auth/register").send({
      name: "Self Profile Student",
      email,
      phone: "+8801700001007",
      password,
    });

    const me = await studentAgent.get("/api/v1/students/me");
    expect(me.status).toBe(200);
    expect(me.body.data.student.user.email).toBe(email);

    const update = await studentAgent.patch("/api/v1/students/me").send({
      phone: "+8801700001999",
      semester: 4,
      emergencyContact: {
        name: "Mother",
        phone: "+8801700001888",
      },
    });

    expect(update.status).toBe(200);
    expect(update.body.data.student.semester).toBe(4);
    expect(update.body.data.student.emergencyContact.name).toBe("Mother");
    expect(update.body.data.student.user.phone).toBe("+8801700001999");

    const invalidUpdate = await studentAgent.patch("/api/v1/students/me").send({
      balance: 500,
    });
    expect(invalidUpdate.status).toBe(400);
  });

  it("allows provost to deactivate a student and sync user.isActive", async () => {
    const provostAgent = request.agent(app);
    await createAndLoginProvost(provostAgent);

    const user = await User.create({
      name: "Toggle Student",
      email: uniqueEmail("toggle-student"),
      phone: "+8801700001010",
      password: "StrongPass#123",
      role: USER_ROLES.STUDENT,
      isActive: true,
    });

    const student = await Student.create({
      userId: user._id,
      department: "CSE",
      semester: 1,
      isActive: true,
    });

    const response = await provostAgent.patch(`/api/v1/students/${student._id}/status`).send({
      isActive: false,
    });

    expect(response.status).toBe(200);
    expect(response.body.data.student.isActive).toBe(false);

    const refreshedUser = await User.findById(user._id).lean();
    const refreshedStudent = await Student.findById(student._id).lean();
    expect(refreshedUser.isActive).toBe(false);
    expect(refreshedStudent.isActive).toBe(false);
  });
});

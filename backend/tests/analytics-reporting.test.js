import request from "supertest";
import app from "../src/app.js";
import { USER_ROLES } from "../src/constants/roles.js";
import { Complaint } from "../src/models/Complaint.js";
import { FOOD_CATEGORIES, FoodMenu } from "../src/models/FoodMenu.js";
import { HallApplication } from "../src/models/HallApplication.js";
import { Maintenance } from "../src/models/Maintenance.js";
import { MealOrder, MEAL_ORDER_STATUS, MEAL_PAYMENT_STATUS, MEAL_TOKEN_TYPES } from "../src/models/MealOrder.js";
import { Notice } from "../src/models/Notice.js";
import { Room, ROOM_STATUS } from "../src/models/Room.js";
import { RoomAllocation, ROOM_ALLOCATION_STATUS } from "../src/models/RoomAllocation.js";
import { Staff } from "../src/models/Staff.js";
import { Student } from "../src/models/Student.js";
import { SupportTicket } from "../src/models/SupportTicket.js";
import { Task } from "../src/models/Task.js";
import { Transaction, TRANSACTION_STATUS, TRANSACTION_TYPES } from "../src/models/Transaction.js";
import { User } from "../src/models/User.js";

function uniqueEmail(prefix) {
  return `${prefix}.${Date.now()}.${Math.random().toString(16).slice(2)}@example.com`;
}

async function createAndLoginProvost(agent, overrides = {}) {
  const email = overrides.email || uniqueEmail("provost-analytics");
  const password = overrides.password || "StrongPass#123";

  const user = await User.create({
    name: overrides.name || "Analytics Provost",
    email,
    phone: overrides.phone || "+8801700100001",
    password,
    role: USER_ROLES.PROVOST,
    isActive: true,
  });

  const login = await agent.post("/api/v1/auth/login").send({ email, password });
  expect(login.status).toBe(200);
  return { user };
}

async function createAndLoginStaff(agent, overrides = {}) {
  const email = overrides.email || uniqueEmail("staff-analytics");
  const password = overrides.password || "StrongPass#123";

  const user = await User.create({
    name: overrides.name || "Analytics Staff",
    email,
    phone: overrides.phone || "+8801700100002",
    password,
    role: USER_ROLES.STAFF,
    isActive: true,
  });

  const staff = await Staff.create({
    userId: user._id,
    staffId: overrides.staffId || `STF-ANL-${Math.random().toString(16).slice(2, 8).toUpperCase()}`,
    department: "Operations",
    designation: "Supervisor",
    joiningDate: new Date("2025-01-01"),
    isActive: true,
  });

  const login = await agent.post("/api/v1/auth/login").send({ email, password });
  expect(login.status).toBe(200);
  return { user, staff };
}

async function registerStudent(agent, overrides = {}) {
  const email = overrides.email || uniqueEmail("student-analytics");
  const password = overrides.password || "StrongPass#123";

  const response = await agent.post("/api/v1/auth/register").send({
    name: overrides.name || "Analytics Student",
    email,
    phone: overrides.phone || "+8801700100003",
    password,
  });
  expect(response.status).toBe(201);

  const login = await agent.post("/api/v1/auth/login").send({ email, password });
  expect(login.status).toBe(200);

  const user = await User.findOne({ email });
  const student = await Student.findOne({ userId: user._id });
  return { user, student };
}

describe("Analytics and Reporting", () => {
  it("returns provost global analytics summary using real module data", async () => {
    const provostAgent = request.agent(app);
    const { user: provostUser } = await createAndLoginProvost(provostAgent, {
      name: "Summary Provost",
      phone: "+8801700100100",
    });

    const studentAgent = request.agent(app);
    const { user: studentUser, student } = await registerStudent(studentAgent, {
      name: "Summary Student",
      phone: "+8801700100101",
    });

    const { staff } = await createAndLoginStaff(request.agent(app), {
      name: "Summary Staff",
      phone: "+8801700100102",
      staffId: "STF-ANL-1",
    });

    const [vacantRoom, occupiedRoom, maintenanceRoom, closedRoom] = await Promise.all([
      Room.create({ roomNumber: "AN-101", floor: 1, wing: "A", capacity: 4, status: ROOM_STATUS.VACANT, isActive: true }),
      Room.create({ roomNumber: "AN-102", floor: 1, wing: "A", capacity: 4, status: ROOM_STATUS.OCCUPIED, isActive: true }),
      Room.create({ roomNumber: "AN-103", floor: 1, wing: "A", capacity: 4, status: ROOM_STATUS.MAINTENANCE, isActive: true }),
      Room.create({ roomNumber: "AN-104", floor: 1, wing: "A", capacity: 4, status: ROOM_STATUS.CLOSED, isActive: true }),
    ]);

    await Promise.all([
      HallApplication.create({
        student: student._id,
        registrationNumber: "REG-ANL-1",
        department: "CSE",
        semester: 5,
        reason: "Need residence support",
        status: "pending",
      }),
      RoomAllocation.create({
        student: student._id,
        room: occupiedRoom._id,
        semester: 5,
        allocationYear: new Date().getUTCFullYear(),
        status: ROOM_ALLOCATION_STATUS.ACTIVE,
      }),
      Complaint.create({
        student: student._id,
        title: "Water leakage",
        description: "Leakage from ceiling.",
        category: "maintenance",
        status: "open",
      }),
      Maintenance.create({
        room: maintenanceRoom._id,
        issue: "Broken fan",
        description: "Fan is not working.",
        category: "electrical",
        reportedBy: studentUser._id,
        assignedTo: staff._id,
        status: "reported",
      }),
      SupportTicket.create({
        student: student._id,
        subject: "Portal support needed",
        description: "Unable to submit profile form.",
        category: "technical",
        status: "open",
        assignedTo: staff._id,
      }),
      Task.create({
        title: "Room inspection",
        description: "Inspect occupied room condition.",
        assignedTo: staff._id,
        room: occupiedRoom._id,
        taskType: "inspection",
        status: "pending",
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      }),
      Notice.create({
        title: "Routine update",
        content: "General update for all residents.",
        publishedBy: provostUser._id,
        targetAudience: "all",
        category: "announcement",
        isActive: true,
        isUrgent: false,
      }),
    ]);

    const breakfastItem = await FoodMenu.create({
      itemName: "Paratha",
      category: FOOD_CATEGORIES.BREAKFAST,
      price: 40,
      availableDate: new Date(),
      isAvailable: true,
      createdBy: provostUser._id,
    });

    await Promise.all([
      MealOrder.create({
        student: student._id,
        foodItem: breakfastItem._id,
        mealType: MEAL_TOKEN_TYPES.BREAKFAST,
        validDate: new Date(),
        tokenCode: `ANL-B-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
        quantity: 1,
        amount: 40,
        totalPrice: 40,
        orderDate: new Date(),
        status: MEAL_ORDER_STATUS.CONSUMED,
        paymentStatus: MEAL_PAYMENT_STATUS.PAID,
      }),
      Transaction.create({
        student: student._id,
        amount: 500,
        transactionType: TRANSACTION_TYPES.DEPOSIT,
        type: TRANSACTION_TYPES.DEPOSIT,
        status: TRANSACTION_STATUS.COMPLETED,
        paymentMethod: "system",
        referenceId: `ANL-DEP-${Date.now()}`,
      }),
      Transaction.create({
        student: student._id,
        amount: 40,
        transactionType: TRANSACTION_TYPES.MEAL_TOKEN,
        type: TRANSACTION_TYPES.MEAL_TOKEN,
        status: TRANSACTION_STATUS.COMPLETED,
        paymentMethod: "system",
        referenceId: `ANL-MEAL-${Date.now()}`,
      }),
    ]);

    const response = await provostAgent.get("/api/v1/analytics/provost/summary").query({
      period: "month",
    });

    expect(response.status).toBe(200);
    expect(response.body.data.hallOverview.totalStudents).toBeGreaterThanOrEqual(1);
    expect(response.body.data.hallOverview.totalStaff).toBeGreaterThanOrEqual(1);
    expect(response.body.data.hallOverview.totalRooms).toBe(4);
    expect(response.body.data.hallApplications.total).toBeGreaterThanOrEqual(1);
    expect(response.body.data.roomAllocations.total).toBeGreaterThanOrEqual(1);
    expect(response.body.data.complaints.total).toBeGreaterThanOrEqual(1);
    expect(response.body.data.maintenance.total).toBeGreaterThanOrEqual(1);
    expect(response.body.data.supportTickets.total).toBeGreaterThanOrEqual(1);
    expect(response.body.data.tasks.total).toBeGreaterThanOrEqual(1);
    expect(response.body.data.notices.total).toBeGreaterThanOrEqual(1);
    expect(response.body.data.dining.today.totalTokens).toBeGreaterThanOrEqual(1);
    expect(response.body.data.financial.totalDeposits).toBeGreaterThanOrEqual(500);
  });

  it("allows staff dining analytics and blocks non-authorized roles for global analytics", async () => {
    const staffAgent = request.agent(app);
    await createAndLoginStaff(staffAgent, {
      name: "Dining Staff",
      phone: "+8801700100200",
      staffId: "STF-ANL-2",
    });

    const staffDining = await staffAgent.get("/api/v1/analytics/staff/dining-summary").query({
      period: "week",
    });
    expect(staffDining.status).toBe(200);
    expect(Array.isArray(staffDining.body.data.trend)).toBe(true);
    expect(staffDining.body.data.today).toBeTruthy();

    const blockedProvostSummary = await staffAgent.get("/api/v1/analytics/provost/summary");
    expect(blockedProvostSummary.status).toBe(403);

    const studentAgent = request.agent(app);
    await registerStudent(studentAgent, {
      name: "Blocked Student",
      phone: "+8801700100201",
    });
    const blockedStudentAccess = await studentAgent.get("/api/v1/analytics/staff/dining-summary");
    expect(blockedStudentAccess.status).toBe(403);
  });
});

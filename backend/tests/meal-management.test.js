import request from "supertest";
import app from "../src/app.js";
import { USER_ROLES } from "../src/constants/roles.js";
import { FoodMenu } from "../src/models/FoodMenu.js";
import { MEAL_ORDER_STATUS, MEAL_PAYMENT_STATUS, MealOrder } from "../src/models/MealOrder.js";
import { Notification } from "../src/models/Notification.js";
import { TRANSACTION_STATUS, Transaction } from "../src/models/Transaction.js";
import { User } from "../src/models/User.js";
import { Student } from "../src/models/Student.js";

function uniqueEmail(prefix) {
  return `${prefix}.${Date.now()}.${Math.random().toString(16).slice(2)}@example.com`;
}

function tomorrowDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date;
}

function dateAfterDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

function todayDate() {
  return new Date();
}

async function createAndLoginUser(agent, role, emailPrefix) {
  const email = uniqueEmail(emailPrefix);
  const password = "StrongPass#123";

  await User.create({
    name: `${role} user`,
    email,
    phone: "+8801700080001",
    password,
    role,
    isActive: true,
  });

  const login = await agent.post("/api/v1/auth/login").send({ email, password });
  expect(login.status).toBe(200);

  return {
    user: await User.findOne({ email }).lean(),
    password,
  };
}

async function registerStudent(agent, emailPrefix = "student-meal-module") {
  const register = await agent.post("/api/v1/auth/register").send({
    name: "Meal Student",
    email: uniqueEmail(emailPrefix),
    phone: "+8801700080002",
    password: "StrongPass#123",
  });

  expect(register.status).toBe(201);
  return register.body.data.user;
}

async function setStudentBalanceByUserId(userId, balance) {
  await Student.findOneAndUpdate(
    { userId },
    { $set: { balance: Number(balance || 0) } },
    { new: true }
  );
}

describe("Meal Token Management", () => {
  it("shows newly created future meal items in staff menu without requiring date filter", async () => {
    const staffAgent = request.agent(app);
    await createAndLoginUser(staffAgent, USER_ROLES.STAFF, "staff-menu-default");

    const tomorrowItem = await staffAgent.post("/api/v1/meals/staff/menu").send({
      itemName: "Tomorrow Rice",
      category: "lunch",
      description: "For tomorrow service",
      price: 110,
      quantity: 20,
      availableDate: dateAfterDays(1).toISOString(),
      isAvailable: true,
    });
    expect(tomorrowItem.status).toBe(201);

    const dayAfterItem = await staffAgent.post("/api/v1/meals/staff/menu").send({
      itemName: "Day After Rice",
      category: "dinner",
      description: "For day-after service",
      price: 130,
      quantity: 15,
      availableDate: dateAfterDays(2).toISOString(),
      isAvailable: true,
    });
    expect(dayAfterItem.status).toBe(201);

    const staffList = await staffAgent.get("/api/v1/meals/staff/menu");
    expect(staffList.status).toBe(200);
    expect(staffList.body.data.items.some((entry) => entry.itemName === "Tomorrow Rice")).toBe(true);
    expect(staffList.body.data.items.some((entry) => entry.itemName === "Day After Rice")).toBe(true);
  });

  it("allows staff to create meal items without quantity", async () => {
    const staffAgent = request.agent(app);
    await createAndLoginUser(staffAgent, USER_ROLES.STAFF, "staff-menu-no-quantity");

    const createResponse = await staffAgent.post("/api/v1/meals/staff/menu").send({
      itemName: "No Quantity Meal",
      category: "breakfast",
      description: "Pricing and metadata only",
      price: 60,
      availableDate: dateAfterDays(1).toISOString(),
      isAvailable: true,
    });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.data.item.itemName).toBe("No Quantity Meal");
  });

  it("defaults student menu to next-day items and excludes same-day query", async () => {
    const staffAgent = request.agent(app);
    await createAndLoginUser(staffAgent, USER_ROLES.STAFF, "staff-student-menu-date");

    const todayItem = await staffAgent.post("/api/v1/meals/staff/menu").send({
      itemName: "Today Curry",
      category: "lunch",
      description: "Same-day meal",
      price: 95,
      quantity: 8,
      availableDate: dateAfterDays(0).toISOString(),
      isAvailable: true,
    });
    expect(todayItem.status).toBe(201);

    const tomorrowItem = await staffAgent.post("/api/v1/meals/staff/menu").send({
      itemName: "Tomorrow Curry",
      category: "lunch",
      description: "Future meal",
      price: 105,
      quantity: 12,
      availableDate: dateAfterDays(1).toISOString(),
      isAvailable: true,
    });
    expect(tomorrowItem.status).toBe(201);

    const studentAgent = request.agent(app);
    await registerStudent(studentAgent, "student-menu-default-date");

    const defaultMenu = await studentAgent.get("/api/v1/meals/menu");
    expect(defaultMenu.status).toBe(200);
    expect(defaultMenu.body.data.items.some((entry) => entry.itemName === "Tomorrow Curry")).toBe(true);
    expect(defaultMenu.body.data.items.some((entry) => entry.itemName === "Today Curry")).toBe(false);

    const sameDayMenu = await studentAgent.get("/api/v1/meals/menu").query({
      date: todayDate().toISOString(),
    });
    expect(sameDayMenu.status).toBe(200);
    expect(sameDayMenu.body.data.items).toHaveLength(0);
  });

  it("allows staff to create meal items and students to view daily menu", async () => {
    const staffAgent = request.agent(app);
    await createAndLoginUser(staffAgent, USER_ROLES.STAFF, "staff-menu-create");

    const validDate = tomorrowDate().toISOString();
    const createResponse = await staffAgent.post("/api/v1/meals/staff/menu").send({
      itemName: "Chicken Khichuri",
      category: "lunch",
      description: "Rice, lentils and chicken",
      price: 120,
      quantity: 25,
      availableDate: validDate,
      isAvailable: true,
    });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.data.item.itemName).toBe("Chicken Khichuri");

    const studentAgent = request.agent(app);
    await registerStudent(studentAgent, "student-menu-view");
    const menuResponse = await studentAgent.get("/api/v1/meals/menu").query({
      date: validDate,
    });

    expect(menuResponse.status).toBe(200);
    expect(menuResponse.body.data.items.some((entry) => entry.itemName === "Chicken Khichuri")).toBe(true);
  });

  it("creates paid meal tokens for future dates and stores payment transaction", async () => {
    const staffAgent = request.agent(app);
    const { user: staffUser } = await createAndLoginUser(staffAgent, USER_ROLES.STAFF, "staff-token-purchase");

    const validDate = tomorrowDate().toISOString();
    const createItem = await staffAgent.post("/api/v1/meals/staff/menu").send({
      itemName: "Egg Fried Rice",
      category: "dinner",
      price: 100,
      quantity: 10,
      availableDate: validDate,
      isAvailable: true,
    });
    expect(createItem.status).toBe(201);

    const studentAgent = request.agent(app);
    const studentUser = await registerStudent(studentAgent, "student-token-purchase");
    await setStudentBalanceByUserId(studentUser.id, 500);

    const purchase = await studentAgent.post("/api/v1/meals/orders/me").send({
      foodItemId: createItem.body.data.item.id,
      validDate,
    });

    expect(purchase.status).toBe(201);
    expect(purchase.body.data.paymentFailed).toBe(false);
    expect(purchase.body.data.order.status).toBe(MEAL_ORDER_STATUS.ACTIVE);
    expect(purchase.body.data.order.paymentStatus).toBe(MEAL_PAYMENT_STATUS.PAID);
    expect(purchase.body.data.order.mealType).toBe("dinner");
    expect(Boolean(purchase.body.data.order.tokenCode)).toBe(true);

    const paymentTransaction = await Transaction.findOne({
      mealOrder: purchase.body.data.order.id,
      transactionType: "meal_token",
    }).lean();
    expect(paymentTransaction).toBeTruthy();
    expect(paymentTransaction.status).toBe(TRANSACTION_STATUS.COMPLETED);

    const staffNotification = await Notification.findOne({
      recipient: staffUser._id,
      type: "meal_token_purchased",
      entityType: "MealOrder",
      entityId: purchase.body.data.order.id,
    }).lean();
    expect(staffNotification).toBeTruthy();
  });

  it("rejects same-day token purchase requests", async () => {
    const staffAgent = request.agent(app);
    await createAndLoginUser(staffAgent, USER_ROLES.STAFF, "staff-same-day");

    const createItem = await staffAgent.post("/api/v1/meals/staff/menu").send({
      itemName: "Beef Curry",
      category: "lunch",
      price: 180,
      quantity: 3,
      availableDate: todayDate().toISOString(),
      isAvailable: true,
    });
    expect(createItem.status).toBe(201);

    const studentAgent = request.agent(app);
    await registerStudent(studentAgent, "student-same-day");

    const purchase = await studentAgent.post("/api/v1/meals/orders/me").send({
      foodItemId: createItem.body.data.item.id,
      validDate: todayDate().toISOString(),
      quantity: 1,
    });

    expect(purchase.status).toBe(400);
    expect(String(purchase.body.message || "").toLowerCase()).toContain("future");
  });

  it("rejects token purchase when wallet balance is insufficient", async () => {
    const staffAgent = request.agent(app);
    await createAndLoginUser(staffAgent, USER_ROLES.STAFF, "staff-payment-fail");

    const validDate = tomorrowDate().toISOString();
    const createItem = await staffAgent.post("/api/v1/meals/staff/menu").send({
      itemName: "Vegetable Noodles",
      category: "dinner",
      price: 90,
      quantity: 5,
      availableDate: validDate,
      isAvailable: true,
    });
    const itemId = createItem.body.data.item.id;

    const studentAgent = request.agent(app);
    await registerStudent(studentAgent, "student-payment-fail");

    const failedPurchase = await studentAgent.post("/api/v1/meals/orders/me").send({
      foodItemId: itemId,
      validDate,
    });

    expect(failedPurchase.status).toBe(409);
    expect(String(failedPurchase.body.message || "").toLowerCase()).toContain("insufficient");
  });

  it("allows staff to mark a valid token as consumed", async () => {
    const staffAgent = request.agent(app);
    await createAndLoginUser(staffAgent, USER_ROLES.STAFF, "staff-consume");

    const studentAgent = request.agent(app);
    const studentUser = await registerStudent(studentAgent, "student-consume");
    const studentProfile = await Student.findOne({ userId: studentUser.id }).lean();

    const foodItem = await FoodMenu.create({
      itemName: "Breakfast Meal",
      category: "breakfast",
      price: 70,
      quantity: 5,
      availableDate: todayDate(),
      isAvailable: true,
    });

    const token = await MealOrder.create({
      student: studentProfile._id,
      foodItem: foodItem._id,
      mealType: "breakfast",
      validDate: todayDate(),
      tokenCode: `BRK-${Date.now()}`,
      quantity: 1,
      amount: 70,
      totalPrice: 70,
      orderDate: new Date(),
      status: MEAL_ORDER_STATUS.ACTIVE,
      paymentStatus: MEAL_PAYMENT_STATUS.PAID,
    });

    const consumeResponse = await staffAgent.patch(`/api/v1/meals/staff/orders/${token._id.toString()}/status`).send({
      status: MEAL_ORDER_STATUS.CONSUMED,
    });

    expect(consumeResponse.status).toBe(200);
    expect(consumeResponse.body.data.order.status).toBe(MEAL_ORDER_STATUS.CONSUMED);
    expect(Boolean(consumeResponse.body.data.order.consumedAt)).toBe(true);
  });

  it("allows staff to mark a valid token as not eaten", async () => {
    const staffAgent = request.agent(app);
    await createAndLoginUser(staffAgent, USER_ROLES.STAFF, "staff-not-eaten");

    const studentAgent = request.agent(app);
    const studentUser = await registerStudent(studentAgent, "student-not-eaten");
    const studentProfile = await Student.findOne({ userId: studentUser.id }).lean();

    const foodItem = await FoodMenu.create({
      itemName: "Lunch Meal",
      category: "lunch",
      price: 90,
      availableDate: todayDate(),
      isAvailable: true,
    });

    const token = await MealOrder.create({
      student: studentProfile._id,
      foodItem: foodItem._id,
      mealType: "lunch",
      validDate: todayDate(),
      tokenCode: `LUN-${Date.now()}`,
      quantity: 1,
      amount: 90,
      totalPrice: 90,
      orderDate: new Date(),
      status: MEAL_ORDER_STATUS.ACTIVE,
      paymentStatus: MEAL_PAYMENT_STATUS.PAID,
    });

    const markNotEaten = await staffAgent.patch(`/api/v1/meals/staff/orders/${token._id.toString()}/status`).send({
      status: MEAL_ORDER_STATUS.NOT_EATEN,
    });

    expect(markNotEaten.status).toBe(200);
    expect(markNotEaten.body.data.order.status).toBe(MEAL_ORDER_STATUS.NOT_EATEN);
  });

  it("blocks student token cancellation once token day has started", async () => {
    const studentAgent = request.agent(app);
    const studentUser = await registerStudent(studentAgent, "student-cancel-window");
    const studentProfile = await Student.findOne({ userId: studentUser.id }).lean();

    const foodItem = await FoodMenu.create({
      itemName: "Cancellation Rule Meal",
      category: "breakfast",
      price: 50,
      availableDate: todayDate(),
      isAvailable: true,
    });

    const token = await MealOrder.create({
      student: studentProfile._id,
      foodItem: foodItem._id,
      mealType: "breakfast",
      validDate: todayDate(),
      tokenCode: `CAN-${Date.now()}`,
      quantity: 1,
      amount: 50,
      totalPrice: 50,
      orderDate: new Date(),
      status: MEAL_ORDER_STATUS.ACTIVE,
      paymentStatus: MEAL_PAYMENT_STATUS.PAID,
    });

    const cancelResponse = await studentAgent.patch(`/api/v1/meals/orders/me/${token._id.toString()}/cancel`).send({
      cancelledReason: "Can no longer attend dining",
    });

    expect(cancelResponse.status).toBe(409);
    expect(String(cancelResponse.body.message || "").toLowerCase()).toContain("cancellation window");
  });

  it("allows provost reports and blocks students from staff endpoints", async () => {
    const provostAgent = request.agent(app);
    await createAndLoginUser(provostAgent, USER_ROLES.PROVOST, "provost-token-reports");

    const reportsResponse = await provostAgent.get("/api/v1/meals/provost/reports");
    expect(reportsResponse.status).toBe(200);
    expect(reportsResponse.body.success).toBe(true);
    expect(reportsResponse.body.data.reports).toBeTruthy();

    const studentAgent = request.agent(app);
    await registerStudent(studentAgent, "student-staff-block");
    const blockedResponse = await studentAgent.get("/api/v1/meals/staff/menu");
    expect(blockedResponse.status).toBe(403);
  });
});

import request from "supertest";
import app from "../src/app.js";
import { USER_ROLES } from "../src/constants/roles.js";
import { FoodMenu } from "../src/models/FoodMenu.js";
import { Notification } from "../src/models/Notification.js";
import { TRANSACTION_STATUS, Transaction } from "../src/models/Transaction.js";
import { Student } from "../src/models/Student.js";
import { User } from "../src/models/User.js";
import { env } from "../src/config/env.js";

function uniqueEmail(prefix) {
  return `${prefix}.${Date.now()}.${Math.random().toString(16).slice(2)}@example.com`;
}

function tomorrowDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString();
}

async function createAndLoginUser(agent, role, emailPrefix) {
  const email = uniqueEmail(emailPrefix);
  const password = "StrongPass#123";

  await User.create({
    name: `${role} user`,
    email,
    phone: "+8801700090001",
    password,
    role,
    isActive: true,
  });

  const login = await agent.post("/api/v1/auth/login").send({ email, password });
  expect(login.status).toBe(200);

  return {
    user: await User.findOne({ email }).lean(),
  };
}

async function registerStudent(agent, emailPrefix = "student-wallet-module") {
  const register = await agent.post("/api/v1/auth/register").send({
    name: "Wallet Student",
    email: uniqueEmail(emailPrefix),
    phone: "+8801700090002",
    password: "StrongPass#123",
  });

  expect(register.status).toBe(201);
  return register.body.data.user;
}

describe("Wallet, Deposit and Token Payment", () => {
  it("creates deposit and increases student wallet balance", async () => {
    const studentAgent = request.agent(app);
    const studentUser = await registerStudent(studentAgent, "wallet-deposit");

    const deposit = await studentAgent.post("/api/v1/wallet/me/deposits").send({
      amount: 1500,
      paymentMethod: "bkash",
      remarks: "Initial topup",
    });

    expect(deposit.status).toBe(201);
    expect(deposit.body.data.transaction.transactionType).toBe("deposit");
    expect(deposit.body.data.transaction.status).toBe("completed");

    const studentProfile = await Student.findOne({ userId: studentUser.id }).lean();
    expect(Number(studentProfile.balance || 0)).toBe(1500);

    const notification = await Notification.findOne({
      recipient: studentUser.id,
      type: "wallet_deposit_success",
    }).lean();
    expect(notification).toBeTruthy();
  });

  it("initiates SSLCommerz deposit as pending and credits wallet after verified success callback", async () => {
    const studentAgent = request.agent(app);
    const studentUser = await registerStudent(studentAgent, "wallet-sslcommerz");

    const previousProvider = env.PAYMENT_PROVIDER;
    const previousStoreId = env.SSLCOMMERZ_STORE_ID;
    const previousStorePassword = env.SSLCOMMERZ_STORE_PASSWORD;
    const previousSuccessUrl = env.SSLCOMMERZ_SUCCESS_URL;
    const previousFailUrl = env.SSLCOMMERZ_FAIL_URL;
    const previousCancelUrl = env.SSLCOMMERZ_CANCEL_URL;
    const previousIpnUrl = env.SSLCOMMERZ_IPN_URL;

    env.PAYMENT_PROVIDER = "sslcommerz";
    env.SSLCOMMERZ_STORE_ID = "sandbox_store";
    env.SSLCOMMERZ_STORE_PASSWORD = "sandbox_password";
    env.SSLCOMMERZ_SUCCESS_URL = "http://localhost:5000/api/v1/wallet/deposits/sslcommerz/success";
    env.SSLCOMMERZ_FAIL_URL = "http://localhost:5000/api/v1/wallet/deposits/sslcommerz/fail";
    env.SSLCOMMERZ_CANCEL_URL = "http://localhost:5000/api/v1/wallet/deposits/sslcommerz/cancel";
    env.SSLCOMMERZ_IPN_URL = "http://localhost:5000/api/v1/wallet/deposits/sslcommerz/ipn";

    const fetchMock = vi
      .spyOn(global, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            status: "SUCCESS",
            GatewayPageURL: "https://sandbox.sslcommerz.com/gwprocess/v4/mock",
            sessionkey: "SESSION123",
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            status: "VALID",
            tran_id: "",
            amount: "1200.00",
            currency: "BDT",
            bank_tran_id: "BANKTXN123",
            val_id: "VAL123",
          }),
      });

    try {
      const deposit = await studentAgent.post("/api/v1/wallet/me/deposits").send({
        amount: 1200,
        paymentMethod: "sslcommerz",
        remarks: "Gateway top-up",
      });

      expect(deposit.status).toBe(201);
      expect(deposit.body.data.transaction.status).toBe(TRANSACTION_STATUS.PENDING);
      expect(deposit.body.data.payment.status).toBe(TRANSACTION_STATUS.PENDING);
      expect(deposit.body.data.payment.paymentUrl).toContain("sandbox.sslcommerz.com");

      const transactionId = deposit.body.data.transaction.id;
      const transactionRef = deposit.body.data.transaction.referenceId;

      const callback = await request(app)
        .post("/api/v1/wallet/deposits/sslcommerz/success")
        .type("form")
        .send({
          tran_id: transactionRef,
          val_id: "VAL123",
          amount: "1200.00",
          status: "VALID",
          bank_tran_id: "BANKTXN123",
        });

      expect(callback.status).toBe(302);
      expect(callback.headers.location).toContain("/student/wallet/payment/success");
      expect(callback.headers.location).toContain(transactionId);

      const studentProfile = await Student.findOne({ userId: studentUser.id }).lean();
      expect(Number(studentProfile.balance || 0)).toBe(1200);

      const transaction = await Transaction.findById(transactionId).lean();
      expect(transaction.status).toBe(TRANSACTION_STATUS.COMPLETED);
      expect(transaction.provider).toBe("sslcommerz");
    } finally {
      fetchMock.mockRestore();
      env.PAYMENT_PROVIDER = previousProvider;
      env.SSLCOMMERZ_STORE_ID = previousStoreId;
      env.SSLCOMMERZ_STORE_PASSWORD = previousStorePassword;
      env.SSLCOMMERZ_SUCCESS_URL = previousSuccessUrl;
      env.SSLCOMMERZ_FAIL_URL = previousFailUrl;
      env.SSLCOMMERZ_CANCEL_URL = previousCancelUrl;
      env.SSLCOMMERZ_IPN_URL = previousIpnUrl;
    }
  });

  it("deducts wallet balance when student purchases a meal token", async () => {
    const staffAgent = request.agent(app);
    await createAndLoginUser(staffAgent, USER_ROLES.STAFF, "wallet-staff-create-item");

    const createItem = await staffAgent.post("/api/v1/meals/staff/menu").send({
      itemName: "Wallet Dinner",
      category: "dinner",
      price: 220,
      quantity: 5,
      availableDate: tomorrowDate(),
      isAvailable: true,
    });
    expect(createItem.status).toBe(201);

    const studentAgent = request.agent(app);
    const studentUser = await registerStudent(studentAgent, "wallet-token-purchase");

    const deposit = await studentAgent.post("/api/v1/wallet/me/deposits").send({
      amount: 500,
      paymentMethod: "bkash",
    });
    expect(deposit.status).toBe(201);

    const purchase = await studentAgent.post("/api/v1/meals/orders/me").send({
      foodItemId: createItem.body.data.item.id,
      validDate: tomorrowDate(),
      quantity: 1,
    });
    expect(purchase.status).toBe(201);
    expect(purchase.body.data.order.paymentStatus).toBe("paid");

    const studentProfile = await Student.findOne({ userId: studentUser.id }).lean();
    expect(Number(studentProfile.balance || 0)).toBe(280);

    const mealTx = await Transaction.findOne({
      mealOrder: purchase.body.data.order.id,
      transactionType: "meal_token",
      status: "completed",
    }).lean();
    expect(mealTx).toBeTruthy();
    expect(Number(mealTx.amount || 0)).toBe(220);
  });

  it("serves student, staff, and provost finance endpoints with role protection", async () => {
    const studentAgent = request.agent(app);
    await registerStudent(studentAgent, "wallet-student-endpoints");

    const myBalance = await studentAgent.get("/api/v1/wallet/me/balance");
    expect(myBalance.status).toBe(200);

    const myTransactions = await studentAgent.get("/api/v1/wallet/me/transactions");
    expect(myTransactions.status).toBe(200);

    const forbiddenProvostSummary = await studentAgent.get("/api/v1/wallet/provost/summary");
    expect(forbiddenProvostSummary.status).toBe(403);

    const staffAgent = request.agent(app);
    await createAndLoginUser(staffAgent, USER_ROLES.STAFF, "wallet-staff-summary");
    const diningSummary = await staffAgent.get("/api/v1/wallet/dining/today-summary");
    expect(diningSummary.status).toBe(200);

    const provostAgent = request.agent(app);
    await createAndLoginUser(provostAgent, USER_ROLES.PROVOST, "wallet-provost-summary");
    const provostSummary = await provostAgent.get("/api/v1/wallet/provost/summary");
    expect(provostSummary.status).toBe(200);
    const provostTransactions = await provostAgent.get("/api/v1/wallet/provost/transactions");
    expect(provostTransactions.status).toBe(200);
  });
});

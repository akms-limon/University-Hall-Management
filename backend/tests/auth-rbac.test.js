import request from "supertest";
import app from "../src/app.js";
import { USER_ROLES } from "../src/constants/roles.js";
import { User } from "../src/models/User.js";

function uniqueEmail(prefix) {
  return `${prefix}.${Date.now()}.${Math.random().toString(16).slice(2)}@example.com`;
}

describe("Auth and RBAC", () => {
  it("registers a student and returns a sanitized user payload", async () => {
    const response = await request(app).post("/api/v1/auth/register").send({
      name: "Student One",
      email: uniqueEmail("student-register"),
      phone: "+8801700000001",
      password: "StrongPass#123",
    });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user.role).toBe(USER_ROLES.STUDENT);
    expect(response.body.data.user.password).toBeUndefined();
  });

  it("rejects duplicate registration by email", async () => {
    const email = uniqueEmail("duplicate-student");
    const payload = {
      name: "Duplicate Student",
      email,
      phone: "+8801700000002",
      password: "StrongPass#123",
    };

    const first = await request(app).post("/api/v1/auth/register").send(payload);
    const second = await request(app).post("/api/v1/auth/register").send(payload);

    expect(first.status).toBe(201);
    expect(second.status).toBe(409);
    expect(second.body.message).toBe("Email already in use");
  });

  it("supports login, me, and logout session flow", async () => {
    const email = uniqueEmail("session");
    const password = "StrongPass#123";
    const agent = request.agent(app);

    const register = await agent.post("/api/v1/auth/register").send({
      name: "Session Student",
      email,
      phone: "+8801700000003",
      password,
    });
    expect(register.status).toBe(201);

    const me = await agent.get("/api/v1/auth/me");
    expect(me.status).toBe(200);
    expect(me.body.data.user.email).toBe(email);

    const logout = await agent.post("/api/v1/auth/logout");
    expect(logout.status).toBe(200);

    const meAfterLogout = await agent.get("/api/v1/auth/me");
    expect(meAfterLogout.status).toBe(401);
  });

  it("clears invalid signed auth cookies and treats the request as unauthenticated", async () => {
    const response = await request(app)
      .get("/api/v1/auth/me")
      .set("Cookie", "accessToken=s%3Ainvalid.signature");

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Authentication required");
    expect(response.headers["set-cookie"]?.[0]).toContain("accessToken=");
  });

  it("rejects invalid credentials with safe messaging", async () => {
    const email = uniqueEmail("invalid-login");
    const password = "StrongPass#123";

    await User.create({
      name: "Invalid Login User",
      email,
      phone: "+8801700000004",
      password,
      role: USER_ROLES.STUDENT,
      isActive: true,
    });

    const response = await request(app).post("/api/v1/auth/login").send({
      email,
      password: "WrongPass#123",
    });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Invalid credentials");
  });

  it("updates lastLogin when login succeeds", async () => {
    const email = uniqueEmail("last-login");
    const password = "StrongPass#123";

    const user = await User.create({
      name: "Last Login User",
      email,
      phone: "+8801700000005",
      password,
      role: USER_ROLES.STUDENT,
      isActive: true,
    });

    expect(user.lastLogin).toBeNull();

    const response = await request(app).post("/api/v1/auth/login").send({
      email,
      password,
    });

    expect(response.status).toBe(200);

    const refreshed = await User.findById(user._id);
    expect(refreshed.lastLogin).toBeInstanceOf(Date);
  });

  it("enforces role-based access to provost-only route", async () => {
    const studentAgent = request.agent(app);
    const studentEmail = uniqueEmail("rbac-student");
    const password = "StrongPass#123";

    await studentAgent.post("/api/v1/auth/register").send({
      name: "RBAC Student",
      email: studentEmail,
      phone: "+8801700000006",
      password,
    });

    const studentAccess = await studentAgent.get("/api/v1/users/role-summary");
    expect(studentAccess.status).toBe(403);

    const provostEmail = uniqueEmail("rbac-provost");
    await User.create({
      name: "RBAC Provost",
      email: provostEmail,
      phone: "+8801700000007",
      password,
      role: USER_ROLES.PROVOST,
      isActive: true,
    });

    const provostAgent = request.agent(app);
    const login = await provostAgent.post("/api/v1/auth/login").send({
      email: provostEmail,
      password,
    });
    expect(login.status).toBe(200);

    const provostAccess = await provostAgent.get("/api/v1/users/role-summary");
    expect(provostAccess.status).toBe(200);
    expect(provostAccess.body.data).toHaveProperty(USER_ROLES.STUDENT);
    expect(provostAccess.body.data).toHaveProperty(USER_ROLES.STAFF);
    expect(provostAccess.body.data).toHaveProperty(USER_ROLES.PROVOST);
  });

  it("locks login after repeated invalid attempts", async () => {
    const email = uniqueEmail("lockout");
    const password = "StrongPass#123";

    await User.create({
      name: "Lockout User",
      email,
      phone: "+8801700000008",
      password,
      role: USER_ROLES.STUDENT,
      isActive: true,
    });

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const response = await request(app).post("/api/v1/auth/login").send({
        email,
        password: "WrongPass#123",
      });

      if (attempt < 5) {
        expect(response.status).toBe(401);
      } else {
        expect(response.status).toBe(429);
      }
    }

    const lockedResponse = await request(app).post("/api/v1/auth/login").send({
      email,
      password,
    });
    expect(lockedResponse.status).toBe(429);
  });
});

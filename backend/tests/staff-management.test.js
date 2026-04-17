import request from "supertest";
import app from "../src/app.js";
import { USER_ROLES } from "../src/constants/roles.js";
import { Staff } from "../src/models/Staff.js";
import { User } from "../src/models/User.js";

function uniqueEmail(prefix) {
  return `${prefix}.${Date.now()}.${Math.random().toString(16).slice(2)}@example.com`;
}

async function createAndLoginProvost(agent) {
  const email = uniqueEmail("provost-staff-mgmt");
  const password = "StrongPass#123";

  await User.create({
    name: "Provost User",
    email,
    phone: "+8801700002001",
    password,
    role: USER_ROLES.PROVOST,
    isActive: true,
  });

  const login = await agent.post("/api/v1/auth/login").send({ email, password });
  expect(login.status).toBe(200);
}

describe("Staff Management", () => {
  it("allows provost to create a staff account and profile", async () => {
    const provostAgent = request.agent(app);
    await createAndLoginProvost(provostAgent);

    const email = uniqueEmail("created-staff");
    const response = await provostAgent.post("/api/v1/staffs").send({
      name: "New Staff",
      email,
      password: "StrongPass#123",
      phone: "+8801700002002",
      staffId: "STF-001",
      department: "Dining",
      designation: "Dining Manager",
      joiningDate: "2025-01-05",
    });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.staff.user.role).toBe(USER_ROLES.STAFF);
    expect(response.body.data.staff.staffId).toBe("STF-001");

    const savedUser = await User.findOne({ email }).lean();
    const savedStaff = await Staff.findOne({ userId: savedUser._id }).lean();

    expect(savedUser).toBeTruthy();
    expect(savedUser.role).toBe(USER_ROLES.STAFF);
    expect(savedStaff).toBeTruthy();
    expect(savedStaff.department).toBe("Dining");
  });

  it("supports provost list query with search, filter, sort, and pagination", async () => {
    const provostAgent = request.agent(app);
    await createAndLoginProvost(provostAgent);

    const alphaUser = await User.create({
      name: "Alpha Staff",
      email: uniqueEmail("alpha-staff"),
      phone: "+8801700002003",
      password: "StrongPass#123",
      role: USER_ROLES.STAFF,
      isActive: true,
    });

    const betaUser = await User.create({
      name: "Beta Staff",
      email: uniqueEmail("beta-staff"),
      phone: "+8801700002004",
      password: "StrongPass#123",
      role: USER_ROLES.STAFF,
      isActive: true,
    });

    await Staff.create({
      userId: alphaUser._id,
      staffId: "STF-ALPHA",
      department: "Dining",
      designation: "Dining Manager",
      joiningDate: new Date("2024-01-01"),
      isActive: true,
    });

    await Staff.create({
      userId: betaUser._id,
      staffId: "STF-BETA",
      department: "Operations",
      designation: "Supervisor",
      joiningDate: new Date("2024-02-01"),
      isActive: true,
    });

    const response = await provostAgent
      .get("/api/v1/staffs")
      .query({
        search: "alpha",
        department: "Dining",
        designation: "Dining Manager",
        isActive: true,
        page: 1,
        limit: 10,
        sortBy: "name",
        sortOrder: "asc",
      });

    expect(response.status).toBe(200);
    expect(response.body.data.items).toHaveLength(1);
    expect(response.body.data.items[0].user.name).toBe("Alpha Staff");
    expect(response.body.meta.page).toBe(1);
    expect(response.body.data.summary.totalStaff).toBe(1);
  });

  it("blocks non-provost users from provost staff management endpoints", async () => {
    const studentAgent = request.agent(app);

    await studentAgent.post("/api/v1/auth/register").send({
      name: "Blocked Student",
      email: uniqueEmail("blocked-student"),
      phone: "+8801700002005",
      password: "StrongPass#123",
    });

    const listResponse = await studentAgent.get("/api/v1/staffs");
    expect(listResponse.status).toBe(403);
  });

  it("supports staff self-profile read and restricted self-update", async () => {
    const staffEmail = uniqueEmail("self-staff");
    const password = "StrongPass#123";

    const user = await User.create({
      name: "Self Staff",
      email: staffEmail,
      phone: "+8801700002006",
      password,
      role: USER_ROLES.STAFF,
      isActive: true,
    });

    await Staff.create({
      userId: user._id,
      staffId: "STF-SELF-001",
      department: "Dining",
      designation: "Dining Manager",
      joiningDate: new Date("2024-03-10"),
      isActive: true,
    });

    const staffAgent = request.agent(app);
    const login = await staffAgent.post("/api/v1/auth/login").send({
      email: staffEmail,
      password,
    });
    expect(login.status).toBe(200);

    const me = await staffAgent.get("/api/v1/staffs/me");
    expect(me.status).toBe(200);
    expect(me.body.data.staff.user.email).toBe(staffEmail);

    const update = await staffAgent.patch("/api/v1/staffs/me").send({
      phone: "+8801700002999",
      profilePhoto: "https://example.com/staff.png",
    });

    expect(update.status).toBe(200);
    expect(update.body.data.staff.user.phone).toBe("+8801700002999");

    const invalidUpdate = await staffAgent.patch("/api/v1/staffs/me").send({
      designation: "Unauthorized Change",
    });
    expect(invalidUpdate.status).toBe(400);
  });

  it("allows provost to deactivate a staff and sync user.isActive", async () => {
    const provostAgent = request.agent(app);
    await createAndLoginProvost(provostAgent);

    const user = await User.create({
      name: "Toggle Staff",
      email: uniqueEmail("toggle-staff"),
      phone: "+8801700002010",
      password: "StrongPass#123",
      role: USER_ROLES.STAFF,
      isActive: true,
    });

    const staff = await Staff.create({
      userId: user._id,
      staffId: "STF-TOGGLE-001",
      department: "Maintenance",
      designation: "Technician",
      joiningDate: new Date("2024-03-01"),
      isActive: true,
    });

    const response = await provostAgent.patch(`/api/v1/staffs/${staff._id}/status`).send({
      isActive: false,
    });

    expect(response.status).toBe(200);
    expect(response.body.data.staff.isActive).toBe(false);

    const refreshedUser = await User.findById(user._id).lean();
    const refreshedStaff = await Staff.findById(staff._id).lean();
    expect(refreshedUser.isActive).toBe(false);
    expect(refreshedStaff.isActive).toBe(false);
  });
});

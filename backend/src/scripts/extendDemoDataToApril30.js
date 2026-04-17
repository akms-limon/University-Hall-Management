import { connectMongo, disconnectMongo } from "../db/connectMongo.js";
import { USER_ROLES } from "../constants/roles.js";
import { User } from "../models/User.js";
import { Student, STUDENT_ALLOCATION_STATUS } from "../models/Student.js";
import { Staff } from "../models/Staff.js";
import { Room } from "../models/Room.js";
import { FoodMenu, FOOD_CATEGORIES } from "../models/FoodMenu.js";
import { MealOrder, MEAL_ORDER_STATUS, MEAL_PAYMENT_STATUS, MEAL_TOKEN_TYPES } from "../models/MealOrder.js";
import { Notice, NOTICE_CATEGORY, NOTICE_TARGET_AUDIENCE } from "../models/Notice.js";
import { Task, TASK_PRIORITY, TASK_STATUS, TASK_TYPES } from "../models/Task.js";
import { Complaint, COMPLAINT_CATEGORIES, COMPLAINT_SEVERITY, COMPLAINT_STATUS } from "../models/Complaint.js";
import { Maintenance, MAINTENANCE_CATEGORIES, MAINTENANCE_SEVERITY, MAINTENANCE_STATUS } from "../models/Maintenance.js";
import {
  SupportTicket,
  SUPPORT_TICKET_CATEGORIES,
  SUPPORT_TICKET_PRIORITY,
  SUPPORT_TICKET_STATUS,
} from "../models/SupportTicket.js";
import { HallApplication, HALL_APPLICATION_STATUS } from "../models/HallApplication.js";
import { Notification } from "../models/Notification.js";

function dateAtUtc(y, m, d, hour = 6) {
  return new Date(Date.UTC(y, m - 1, d, hour, 0, 0, 0));
}

function formatYmd(date) {
  return date.toISOString().slice(0, 10);
}

function makeDateRange(start, endInclusive) {
  const out = [];
  const cursor = new Date(start);
  while (cursor <= endInclusive) {
    out.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

async function ensureMealItem({ itemName, category, availableDate, createdBy, price = 45, description = "" }) {
  const dayStart = new Date(availableDate);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

  let item = await FoodMenu.findOne({
    category,
    availableDate: { $gte: dayStart, $lt: dayEnd },
    itemName,
    isDeleted: { $ne: true },
  });

  if (!item) {
    item = await FoodMenu.create({
      itemName,
      category,
      description,
      price,
      quantity: 220,
      isAvailable: true,
      isDeleted: false,
      availableDate,
      createdBy: createdBy || null,
    });
  }

  return item;
}

async function ensureNotice({ title, content, category, targetAudience, publishedBy, publishedDate, isUrgent = false }) {
  const exists = await Notice.findOne({ title }).select("_id");
  if (exists) return false;
  await Notice.create({
    title,
    content,
    category,
    targetAudience,
    publishedBy,
    publishedDate,
    isUrgent,
    isActive: true,
  });
  return true;
}

async function ensureTask(taskPayload) {
  const exists = await Task.findOne({ title: taskPayload.title }).select("_id");
  if (exists) return false;
  await Task.create(taskPayload);
  return true;
}

async function ensureComplaint(payload) {
  const exists = await Complaint.findOne({ title: payload.title }).select("_id");
  if (exists) return false;
  await Complaint.create(payload);
  return true;
}

async function ensureMaintenance(payload) {
  const exists = await Maintenance.findOne({ issue: payload.issue }).select("_id");
  if (exists) return false;
  await Maintenance.create(payload);
  return true;
}

async function ensureSupportTicket(payload) {
  const exists = await SupportTicket.findOne({ subject: payload.subject }).select("_id");
  if (exists) return false;
  await SupportTicket.create(payload);
  return true;
}

async function ensureHallApplication(payload) {
  const exists = await HallApplication.findOne({
    student: payload.student,
    applicationDate: payload.applicationDate,
    reason: payload.reason,
  }).select("_id");
  if (exists) return false;
  await HallApplication.create(payload);
  return true;
}

async function ensureMealToken({ studentId, foodItemId, date, mealType, quantity = 1, actorUserId }) {
  const tokenCode = `DMO-${studentId.toString().slice(-4)}-${formatYmd(date).replaceAll("-", "")}-${mealType.toUpperCase()}`;
  const exists = await MealOrder.findOne({ tokenCode }).select("_id");
  if (exists) return false;

  const foodItem = await FoodMenu.findById(foodItemId).select("price");
  const unitPrice = Number(foodItem?.price || 45);
  const totalPrice = unitPrice * quantity;

  await MealOrder.create({
    student: studentId,
    foodItem: foodItemId,
    mealType,
    validDate: date,
    tokenCode,
    quantity,
    amount: unitPrice,
    totalPrice,
    status: MEAL_ORDER_STATUS.ACTIVE,
    paymentStatus: MEAL_PAYMENT_STATUS.PAID,
    statusUpdatedBy: actorUserId || null,
    orderDate: new Date(date.getTime() - 24 * 60 * 60 * 1000),
  });

  return true;
}

async function ensureNotification(payload) {
  const exists = await Notification.findOne({
    recipient: payload.recipient,
    title: payload.title,
    entityType: payload.entityType,
    entityId: payload.entityId,
  }).select("_id");
  if (exists) return false;
  await Notification.create(payload);
  return true;
}

async function run() {
  await connectMongo();

  try {
    const [provostUser, staffUsers, students, staffProfiles, rooms] = await Promise.all([
      User.findOne({ role: USER_ROLES.PROVOST, isActive: true }).sort({ createdAt: 1 }),
      User.find({ role: USER_ROLES.STAFF, isActive: true }).sort({ createdAt: 1 }),
      Student.find({ isActive: true }).sort({ createdAt: 1 }),
      Staff.find({ isActive: true }).sort({ createdAt: 1 }),
      Room.find({ isActive: true }).sort({ roomNumber: 1 }),
    ]);

    if (!provostUser) {
      throw new Error("Provost user not found. Run demo seed first.");
    }

    if (!staffUsers.length || !students.length || !staffProfiles.length || !rooms.length) {
      throw new Error("Missing staff/students/rooms. Run demo seed first.");
    }

    const start = dateAtUtc(2026, 4, 16);
    const end = dateAtUtc(2026, 4, 30);
    const allDates = makeDateRange(start, end);

    let mealItemsAdded = 0;
    let tokensAdded = 0;
    let noticesAdded = 0;
    let tasksAdded = 0;
    let complaintsAdded = 0;
    let maintenanceAdded = 0;
    let ticketsAdded = 0;
    let applicationsAdded = 0;
    let notificationsAdded = 0;

    for (let i = 0; i < allDates.length; i += 1) {
      const date = allDates[i];
      const staffUser = staffUsers[i % staffUsers.length];
      const room = rooms[i % rooms.length];

      const breakfast = await ensureMealItem({
        itemName: "Paratha, Egg & Tea",
        category: FOOD_CATEGORIES.BREAKFAST,
        availableDate: date,
        createdBy: staffUser._id,
        description: "Breakfast menu for residents.",
      });
      const lunch = await ensureMealItem({
        itemName: "Chicken Curry, Rice & Dal",
        category: FOOD_CATEGORIES.LUNCH,
        availableDate: date,
        createdBy: staffUser._id,
        description: "Lunch menu.",
      });
      const lunchEgg = await ensureMealItem({
        itemName: "Egg curry, Rice, dal",
        category: FOOD_CATEGORIES.LUNCH,
        availableDate: date,
        createdBy: staffUser._id,
        description: "Lunch menu alternative.",
      });
      const dinner = await ensureMealItem({
        itemName: "Fish Curry, Rice & Dal",
        category: FOOD_CATEGORIES.DINNER,
        availableDate: date,
        createdBy: staffUser._id,
        description: "Dinner menu.",
      });
      const dinnerEgg = await ensureMealItem({
        itemName: "Egg curry, Rice, dal",
        category: FOOD_CATEGORIES.DINNER,
        availableDate: date,
        createdBy: staffUser._id,
        description: "Dinner menu alternative.",
      });

      mealItemsAdded += [breakfast, lunch, lunchEgg, dinner, dinnerEgg].filter(Boolean).length;

      for (let s = 0; s < students.length; s += 1) {
        const student = students[s];
        const lunchChoice = s % 2 === 0 ? lunch : lunchEgg;
        const dinnerChoice = s % 2 === 0 ? dinnerEgg : dinner;
        const createdLunch = await ensureMealToken({
          studentId: student._id,
          foodItemId: lunchChoice._id,
          date,
          mealType: MEAL_TOKEN_TYPES.LUNCH,
          quantity: 1,
          actorUserId: staffUser._id,
        });
        const createdDinner = await ensureMealToken({
          studentId: student._id,
          foodItemId: dinnerChoice._id,
          date,
          mealType: MEAL_TOKEN_TYPES.DINNER,
          quantity: 1,
          actorUserId: staffUser._id,
        });
        if (createdLunch) tokensAdded += 1;
        if (createdDinner) tokensAdded += 1;
      }

      const noticeCreated = await ensureNotice({
        title: `Hall Daily Notice ${formatYmd(date)}`,
        content: `Daily hall update for ${formatYmd(date)}: meal schedule, maintenance status, and activity plan are available.`,
        category: i % 3 === 0 ? NOTICE_CATEGORY.EVENT : NOTICE_CATEGORY.ANNOUNCEMENT,
        targetAudience: NOTICE_TARGET_AUDIENCE.ALL,
        publishedBy: provostUser._id,
        publishedDate: date,
        isUrgent: i % 5 === 0,
      });
      if (noticeCreated) noticesAdded += 1;

      const taskCreated = await ensureTask({
        title: `Daily Operations Task ${formatYmd(date)}`,
        description: `Complete hall operations checklist for ${formatYmd(date)}.`,
        assignedTo: staffProfiles[i % staffProfiles.length]._id,
        room: room._id,
        taskType: TASK_TYPES.INSPECTION,
        priority: i % 2 === 0 ? TASK_PRIORITY.MEDIUM : TASK_PRIORITY.HIGH,
        status: i % 4 === 0 ? TASK_STATUS.IN_PROGRESS : TASK_STATUS.PENDING,
        dueDate: new Date(date.getTime() + 24 * 60 * 60 * 1000),
      });
      if (taskCreated) tasksAdded += 1;

      const complaintStudent = students[i % students.length];
      const complaintCreated = await ensureComplaint({
        student: complaintStudent._id,
        title: `Common Area Issue ${formatYmd(date)}`,
        description: "Demo complaint generated for system testing and reporting.",
        category: COMPLAINT_CATEGORIES.FACILITY,
        severity: i % 2 === 0 ? COMPLAINT_SEVERITY.LOW : COMPLAINT_SEVERITY.MEDIUM,
        status: i % 3 === 0 ? COMPLAINT_STATUS.IN_PROGRESS : COMPLAINT_STATUS.OPEN,
        assignedTo: staffProfiles[i % staffProfiles.length]._id,
      });
      if (complaintCreated) complaintsAdded += 1;

      const maintenanceCreated = await ensureMaintenance({
        room: room._id,
        issue: `Maintenance Check ${room.roomNumber} ${formatYmd(date)}`,
        description: "Demo maintenance request for testing room maintenance workflow.",
        category: MAINTENANCE_CATEGORIES.ELECTRICAL,
        severity: i % 2 === 0 ? MAINTENANCE_SEVERITY.MEDIUM : MAINTENANCE_SEVERITY.HIGH,
        reportedBy: complaintStudent.userId,
        assignedTo: staffProfiles[i % staffProfiles.length]._id,
        status: i % 2 === 0 ? MAINTENANCE_STATUS.REPORTED : MAINTENANCE_STATUS.IN_PROGRESS,
      });
      if (maintenanceCreated) maintenanceAdded += 1;

      const ticketCreated = await ensureSupportTicket({
        student: complaintStudent._id,
        subject: `Support Follow-up ${formatYmd(date)}`,
        description: "Demo support ticket for workflow validation before defense.",
        category: SUPPORT_TICKET_CATEGORIES.OTHER,
        priority: i % 2 === 0 ? SUPPORT_TICKET_PRIORITY.MEDIUM : SUPPORT_TICKET_PRIORITY.HIGH,
        status: i % 3 === 0 ? SUPPORT_TICKET_STATUS.IN_PROGRESS : SUPPORT_TICKET_STATUS.OPEN,
        assignedTo: staffProfiles[i % staffProfiles.length]._id,
        messages: [
          {
            sender: complaintStudent.userId,
            message: "Need quick assistance regarding hall services.",
          },
        ],
      });
      if (ticketCreated) ticketsAdded += 1;
    }

    const nonAllocatedStudents = await Student.find({
      allocationStatus: { $in: [STUDENT_ALLOCATION_STATUS.NONE, STUDENT_ALLOCATION_STATUS.PENDING] },
    })
      .limit(3)
      .lean();

    for (let i = 0; i < nonAllocatedStudents.length; i += 1) {
      const student = nonAllocatedStudents[i];
      const applied = await ensureHallApplication({
        student: student._id,
        registrationNumber: student.registrationNumber,
        department: student.department,
        semester: student.semester,
        contactPhone: `0179000000${i + 1}`,
        reason: `Demo application for seat request before 2026-04-30 (${i + 1}).`,
        status: i % 2 === 0 ? HALL_APPLICATION_STATUS.PENDING : HALL_APPLICATION_STATUS.UNDER_REVIEW,
        reviewedBy: i % 2 === 0 ? null : provostUser._id,
        applicationDate: dateAtUtc(2026, 4, 20 + i),
      });
      if (applied) applicationsAdded += 1;
    }

    const allUsers = await User.find({ isActive: true }).select("_id role name");
    for (const user of allUsers) {
      const created = await ensureNotification({
        recipient: user._id,
        actor: provostUser._id,
        type: "system_demo_update",
        title: `Demo Data Updated Until 2026-04-30`,
        message: `Hello ${user.name}, demo data has been expanded for your ${user.role} workflows up to April 30, 2026.`,
        link: "/notifications",
        entityType: "System",
        entityId: "demo-2026-04-30",
        isRead: false,
      });
      if (created) notificationsAdded += 1;
    }

    console.log("Demo expansion complete.");
    console.log(
      JSON.stringify(
        {
          dateRange: "2026-04-16 to 2026-04-30",
          mealsCheckedOrCreated: mealItemsAdded,
          mealTokensCreated: tokensAdded,
          noticesCreated: noticesAdded,
          tasksCreated: tasksAdded,
          complaintsCreated: complaintsAdded,
          maintenanceCreated: maintenanceAdded,
          supportTicketsCreated: ticketsAdded,
          hallApplicationsCreated: applicationsAdded,
          notificationsCreated: notificationsAdded,
        },
        null,
        2
      )
    );
  } finally {
    await disconnectMongo();
  }
}

run().catch((error) => {
  console.error("Demo expansion failed:", error);
  process.exitCode = 1;
});


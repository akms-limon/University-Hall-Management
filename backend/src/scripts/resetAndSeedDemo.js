import { connectMongo, disconnectMongo } from "../db/connectMongo.js";
import { USER_ROLES } from "../constants/roles.js";
import { Complaint, COMPLAINT_CATEGORIES, COMPLAINT_SEVERITY, COMPLAINT_STATUS } from "../models/Complaint.js";
import { FoodMenu, FOOD_CATEGORIES } from "../models/FoodMenu.js";
import { HallApplication, HALL_APPLICATION_STATUS } from "../models/HallApplication.js";
import { Maintenance, MAINTENANCE_CATEGORIES, MAINTENANCE_SEVERITY, MAINTENANCE_STATUS } from "../models/Maintenance.js";
import { MealOrder, MEAL_ORDER_STATUS, MEAL_PAYMENT_STATUS, MEAL_TOKEN_TYPES } from "../models/MealOrder.js";
import { Notice, NOTICE_CATEGORY, NOTICE_TARGET_AUDIENCE } from "../models/Notice.js";
import { Notification } from "../models/Notification.js";
import { Room, ROOM_STATUS } from "../models/Room.js";
import { RoomAllocation, ROOM_ALLOCATION_STATUS } from "../models/RoomAllocation.js";
import { Staff } from "../models/Staff.js";
import { Student, STUDENT_ALLOCATION_STATUS } from "../models/Student.js";
import { SupportTicket, SUPPORT_TICKET_CATEGORIES, SUPPORT_TICKET_PRIORITY, SUPPORT_TICKET_STATUS } from "../models/SupportTicket.js";
import { Task, TASK_PRIORITY, TASK_STATUS, TASK_TYPES } from "../models/Task.js";
import { Transaction, PAYMENT_METHODS, TRANSACTION_STATUS, TRANSACTION_TYPES } from "../models/Transaction.js";
import { User } from "../models/User.js";

const PASSWORD = "!Q2w3e4r";

function addDays(baseDate, days) {
  const value = new Date(baseDate);
  value.setDate(value.getDate() + days);
  return value;
}

async function clearAllData() {
  await Promise.all([
    Complaint.deleteMany({}),
    HallApplication.deleteMany({}),
    Maintenance.deleteMany({}),
    MealOrder.deleteMany({}),
    Notification.deleteMany({}),
    Notice.deleteMany({}),
    RoomAllocation.deleteMany({}),
    Task.deleteMany({}),
    SupportTicket.deleteMany({}),
    Transaction.deleteMany({}),
    FoodMenu.deleteMany({}),
    Student.deleteMany({}),
    Staff.deleteMany({}),
    Room.deleteMany({}),
    User.deleteMany({}),
  ]);
}

async function createUser({ name, email, phone, role }) {
  return User.create({
    name,
    email,
    phone,
    role,
    password: PASSWORD,
    isActive: true,
    isEmailVerified: true,
  });
}

async function run() {
  await connectMongo();
  await clearAllData();

  const provostUser = await createUser({
    name: "Md. Moznujjaman",
    email: "provost@gmail.com",
    phone: "01710000001",
    role: USER_ROLES.PROVOST,
  });

  const staffUserMain = await createUser({
    name: "Md. Rofik",
    email: "staff@gmail.com",
    phone: "01710000002",
    role: USER_ROLES.STAFF,
  });

  const studentUserMain = await createUser({
    name: "A K M S Limon",
    email: "student@gmail.com",
    phone: "01710000003",
    role: USER_ROLES.STUDENT,
  });

  const extraStudentUsers = await User.insertMany([
    {
      name: "Tasnim Ahmed",
      email: "tasnim.student@gmail.com",
      phone: "01710000004",
      role: USER_ROLES.STUDENT,
      password: PASSWORD,
      isActive: true,
      isEmailVerified: true,
    },
    {
      name: "Nafis Rahman",
      email: "nafis.student@gmail.com",
      phone: "01710000005",
      role: USER_ROLES.STUDENT,
      password: PASSWORD,
      isActive: true,
      isEmailVerified: true,
    },
    {
      name: "Sadia Islam",
      email: "sadia.student@gmail.com",
      phone: "01710000006",
      role: USER_ROLES.STUDENT,
      password: PASSWORD,
      isActive: true,
      isEmailVerified: true,
    },
  ]);

  const extraStaffUsers = await User.insertMany([
    {
      name: "Mahfuz Alam",
      email: "mahfuz.staff@gmail.com",
      phone: "01710000007",
      role: USER_ROLES.STAFF,
      password: PASSWORD,
      isActive: true,
      isEmailVerified: true,
    },
    {
      name: "Shihab Uddin",
      email: "shihab.staff@gmail.com",
      phone: "01710000008",
      role: USER_ROLES.STAFF,
      password: PASSWORD,
      isActive: true,
      isEmailVerified: true,
    },
  ]);

  const students = await Student.insertMany([
    {
      userId: studentUserMain._id,
      registrationNumber: "20230001",
      department: "Computer Science and Engineering",
      semester: 5,
      balance: 2500,
      allocationStatus: STUDENT_ALLOCATION_STATUS.ALLOCATED,
      emergencyContact: { name: "Abdur Rahim", phone: "01811111111", relation: "Father" },
      isActive: true,
    },
    {
      userId: extraStudentUsers[0]._id,
      registrationNumber: "20230002",
      department: "Electrical and Electronic Engineering",
      semester: 4,
      balance: 1800,
      allocationStatus: STUDENT_ALLOCATION_STATUS.ALLOCATED,
      emergencyContact: { name: "Nur Jahan", phone: "01822222222", relation: "Mother" },
      isActive: true,
    },
    {
      userId: extraStudentUsers[1]._id,
      registrationNumber: "20230003",
      department: "Mathematics",
      semester: 3,
      balance: 1100,
      allocationStatus: STUDENT_ALLOCATION_STATUS.REQUESTED,
      emergencyContact: { name: "Harun", phone: "01833333333", relation: "Guardian" },
      isActive: true,
    },
    {
      userId: extraStudentUsers[2]._id,
      registrationNumber: "20230004",
      department: "Physics",
      semester: 2,
      balance: 900,
      allocationStatus: STUDENT_ALLOCATION_STATUS.PENDING,
      emergencyContact: { name: "Selina", phone: "01844444444", relation: "Mother" },
      isActive: true,
    },
  ]);

  const staffProfiles = await Staff.insertMany([
    {
      userId: staffUserMain._id,
      staffId: "STF-001",
      department: "Hall Administration",
      designation: "Senior Staff",
      joiningDate: addDays(new Date(), -700),
      isActive: true,
    },
    {
      userId: extraStaffUsers[0]._id,
      staffId: "STF-002",
      department: "Dining Services",
      designation: "Meal Supervisor",
      joiningDate: addDays(new Date(), -500),
      isActive: true,
    },
    {
      userId: extraStaffUsers[1]._id,
      staffId: "STF-003",
      department: "Maintenance",
      designation: "Technical Assistant",
      joiningDate: addDays(new Date(), -430),
      isActive: true,
    },
  ]);

  const rooms = await Room.insertMany([
    { roomNumber: "A-101", floor: 1, wing: "A", capacity: 4, status: ROOM_STATUS.OCCUPIED, occupants: [students[0]._id, students[1]._id], features: ["Fan", "WiFi"], amenities: ["Bed", "Desk"], isActive: true },
    { roomNumber: "A-102", floor: 1, wing: "A", capacity: 4, status: ROOM_STATUS.VACANT, occupants: [], features: ["Fan"], amenities: ["Bed"], isActive: true },
    { roomNumber: "B-201", floor: 2, wing: "B", capacity: 3, status: ROOM_STATUS.OCCUPIED, occupants: [students[2]._id], features: ["WiFi"], amenities: ["Bed", "Wardrobe"], isActive: true },
    { roomNumber: "B-202", floor: 2, wing: "B", capacity: 3, status: ROOM_STATUS.MAINTENANCE, occupants: [], features: ["WiFi"], amenities: ["Bed", "Desk"], isActive: true },
    { roomNumber: "C-301", floor: 3, wing: "C", capacity: 2, status: ROOM_STATUS.VACANT, occupants: [], features: ["WiFi", "Balcony"], amenities: ["Bed", "Desk"], isActive: true },
  ]);

  await Student.updateOne({ _id: students[0]._id }, { currentRoom: rooms[0]._id });
  await Student.updateOne({ _id: students[1]._id }, { currentRoom: rooms[0]._id });
  await Student.updateOne({ _id: students[2]._id }, { currentRoom: rooms[2]._id });

  await RoomAllocation.insertMany([
    {
      student: students[0]._id,
      room: rooms[0]._id,
      allocationDate: addDays(new Date(), -120),
      status: ROOM_ALLOCATION_STATUS.ACTIVE,
      approvedBy: provostUser._id,
      requestReason: "Near department building",
      semester: 5,
      allocationYear: 2026,
    },
    {
      student: students[1]._id,
      room: rooms[0]._id,
      allocationDate: addDays(new Date(), -90),
      status: ROOM_ALLOCATION_STATUS.ACTIVE,
      approvedBy: provostUser._id,
      requestReason: "Requested shared room",
      semester: 4,
      allocationYear: 2026,
    },
    {
      student: students[2]._id,
      room: rooms[2]._id,
      allocationDate: addDays(new Date(), -12),
      status: ROOM_ALLOCATION_STATUS.PENDING,
      approvedBy: null,
      requestReason: "Closer to class schedule",
      semester: 3,
      allocationYear: 2026,
    },
  ]);

  const today = new Date();
  const tomorrow = addDays(today, 1);
  const dayAfter = addDays(today, 2);

  const meals = await FoodMenu.insertMany([
    {
      itemName: "Paratha & Egg",
      category: FOOD_CATEGORIES.BREAKFAST,
      description: "Fresh paratha with boiled egg.",
      price: 45,
      quantity: 120,
      isVegetarian: false,
      availableDate: tomorrow,
      isAvailable: true,
      createdBy: staffUserMain._id,
    },
    {
      itemName: "Khichuri Special",
      category: FOOD_CATEGORIES.LUNCH,
      description: "Rice and lentil dish with salad.",
      price: 75,
      quantity: 100,
      isVegetarian: true,
      availableDate: tomorrow,
      isAvailable: true,
      createdBy: extraStaffUsers[0]._id,
    },
    {
      itemName: "Chicken Curry Meal",
      category: FOOD_CATEGORIES.DINNER,
      description: "Chicken curry with rice and vegetables.",
      price: 110,
      quantity: 90,
      isVegetarian: false,
      availableDate: dayAfter,
      isAvailable: true,
      createdBy: extraStaffUsers[0]._id,
    },
  ]);

  const mealOrders = await MealOrder.insertMany([
    {
      student: students[0]._id,
      foodItem: meals[0]._id,
      mealType: MEAL_TOKEN_TYPES.BREAKFAST,
      validDate: tomorrow,
      tokenCode: "TOKEN-LIMON-001",
      quantity: 1,
      amount: meals[0].price,
      totalPrice: meals[0].price,
      status: MEAL_ORDER_STATUS.ACTIVE,
      paymentStatus: MEAL_PAYMENT_STATUS.PAID,
      checkedBy: staffUserMain._id,
      checkedAt: addDays(tomorrow, -1),
      statusUpdatedBy: staffUserMain._id,
      orderDate: addDays(today, -1),
    },
    {
      student: students[1]._id,
      foodItem: meals[1]._id,
      mealType: MEAL_TOKEN_TYPES.LUNCH,
      validDate: tomorrow,
      tokenCode: "TOKEN-TASNIM-001",
      quantity: 2,
      amount: meals[1].price,
      totalPrice: meals[1].price * 2,
      status: MEAL_ORDER_STATUS.ACTIVE,
      paymentStatus: MEAL_PAYMENT_STATUS.PAID,
      statusUpdatedBy: staffUserMain._id,
      orderDate: addDays(today, -1),
    },
  ]);

  const transactions = await Transaction.insertMany([
    {
      student: students[0]._id,
      transactionType: TRANSACTION_TYPES.DEPOSIT,
      amount: 3000,
      status: TRANSACTION_STATUS.COMPLETED,
      paymentMethod: PAYMENT_METHODS.BKASH,
      provider: "bkash",
      providerReference: "BKASH-DEP-001",
      referenceId: "BKASH-DEP-001",
      description: "Wallet top-up by student.",
      balanceBefore: 0,
      balanceAfter: 3000,
      processedBy: provostUser._id,
    },
    {
      student: students[0]._id,
      mealOrder: mealOrders[0]._id,
      transactionType: TRANSACTION_TYPES.MEAL_TOKEN,
      amount: meals[0].price,
      status: TRANSACTION_STATUS.COMPLETED,
      paymentMethod: PAYMENT_METHODS.SYSTEM,
      provider: "internal_wallet",
      providerReference: "ML-001",
      referenceId: "ML-001",
      description: "Meal token purchase.",
      balanceBefore: 3000,
      balanceAfter: 3000 - meals[0].price,
      processedBy: students[0].userId,
    },
    {
      student: students[1]._id,
      mealOrder: mealOrders[1]._id,
      transactionType: TRANSACTION_TYPES.MEAL_TOKEN,
      amount: meals[1].price * 2,
      status: TRANSACTION_STATUS.COMPLETED,
      paymentMethod: PAYMENT_METHODS.SYSTEM,
      provider: "internal_wallet",
      providerReference: "ML-002",
      referenceId: "ML-002",
      description: "Lunch token purchase.",
      balanceBefore: 1800,
      balanceAfter: 1800 - meals[1].price * 2,
      processedBy: students[1].userId,
    },
  ]);

  await MealOrder.updateOne({ _id: mealOrders[0]._id }, { transactionId: transactions[1]._id });
  await MealOrder.updateOne({ _id: mealOrders[1]._id }, { transactionId: transactions[2]._id });

  const notices = await Notice.insertMany([
    {
      title: "Semester Opening Notice",
      content: "Hall activities and services are now active for the current semester.",
      category: NOTICE_CATEGORY.ANNOUNCEMENT,
      publishedBy: provostUser._id,
      targetAudience: NOTICE_TARGET_AUDIENCE.ALL,
      isUrgent: false,
      isActive: true,
      publishedDate: addDays(today, -6),
    },
    {
      title: "Emergency Power Maintenance",
      content: "There will be a scheduled power maintenance in Block B tomorrow evening.",
      category: NOTICE_CATEGORY.EMERGENCY,
      publishedBy: provostUser._id,
      targetAudience: NOTICE_TARGET_AUDIENCE.ALL,
      isUrgent: true,
      isActive: true,
      publishedDate: addDays(today, -2),
      applicableRooms: [rooms[2]._id, rooms[3]._id],
    },
    {
      title: "Hall Cultural Evening",
      content: "Students are invited to participate in the hall cultural evening this weekend.",
      category: NOTICE_CATEGORY.EVENT,
      publishedBy: provostUser._id,
      targetAudience: NOTICE_TARGET_AUDIENCE.ALL,
      isUrgent: false,
      isActive: true,
      publishedDate: addDays(today, -1),
    },
    {
      title: "Sports Meet Registration",
      content: "Registration is open for annual hall sports activities.",
      category: NOTICE_CATEGORY.EVENT,
      publishedBy: provostUser._id,
      targetAudience: NOTICE_TARGET_AUDIENCE.STUDENTS,
      isUrgent: false,
      isActive: true,
      publishedDate: today,
    },
  ]);

  await Task.insertMany([
    {
      title: "Inspect Room B-202",
      description: "Inspect electrical wiring and submit report.",
      assignedTo: staffProfiles[2]._id,
      room: rooms[3]._id,
      taskType: TASK_TYPES.INSPECTION,
      priority: TASK_PRIORITY.HIGH,
      status: TASK_STATUS.IN_PROGRESS,
      dueDate: addDays(today, 1),
    },
    {
      title: "Dining Hall Clean-up",
      description: "Complete post-lunch clean-up and waste handling.",
      assignedTo: staffProfiles[0]._id,
      room: null,
      taskType: TASK_TYPES.CLEANING,
      priority: TASK_PRIORITY.MEDIUM,
      status: TASK_STATUS.PENDING,
      dueDate: addDays(today, 2),
    },
  ]);

  await Complaint.insertMany([
    {
      student: students[0]._id,
      title: "Water filter issue",
      description: "Water filter in floor 1 dining area is not working properly.",
      category: COMPLAINT_CATEGORIES.FACILITY,
      severity: COMPLAINT_SEVERITY.MEDIUM,
      status: COMPLAINT_STATUS.IN_PROGRESS,
      assignedTo: staffProfiles[2]._id,
    },
    {
      student: students[1]._id,
      title: "Mess food quality",
      description: "Lunch quality was poor on multiple days.",
      category: COMPLAINT_CATEGORIES.FOOD_QUALITY,
      severity: COMPLAINT_SEVERITY.LOW,
      status: COMPLAINT_STATUS.OPEN,
      assignedTo: staffProfiles[1]._id,
    },
  ]);

  await Maintenance.insertMany([
    {
      room: rooms[3]._id,
      issue: "Ceiling fan not spinning",
      description: "Fan in B-202 stopped working and needs replacement.",
      category: MAINTENANCE_CATEGORIES.ELECTRICAL,
      severity: MAINTENANCE_SEVERITY.HIGH,
      reportedBy: students[2].userId,
      assignedTo: staffProfiles[2]._id,
      status: MAINTENANCE_STATUS.IN_PROGRESS,
      estimatedCost: 1800,
      workLog: "Initial inspection completed, replacement parts requested.",
    },
    {
      room: rooms[0]._id,
      issue: "Washroom tap leakage",
      description: "Tap in common washroom leaking continuously.",
      category: MAINTENANCE_CATEGORIES.PLUMBING,
      severity: MAINTENANCE_SEVERITY.MEDIUM,
      reportedBy: students[0].userId,
      assignedTo: staffProfiles[2]._id,
      status: MAINTENANCE_STATUS.REPORTED,
    },
  ]);

  await SupportTicket.insertMany([
    {
      student: students[0]._id,
      subject: "Need room transfer guidance",
      description: "Please share room transfer policy details.",
      category: SUPPORT_TICKET_CATEGORIES.ACADEMIC,
      priority: SUPPORT_TICKET_PRIORITY.MEDIUM,
      status: SUPPORT_TICKET_STATUS.IN_PROGRESS,
      assignedTo: staffProfiles[0]._id,
      messages: [
        { sender: students[0].userId, message: "Can I request transfer next month?" },
        { sender: staffUserMain._id, message: "Yes, submit request from room allocation module." },
      ],
    },
    {
      student: students[1]._id,
      subject: "Internet speed issue",
      description: "Internet speed is unstable in A block at night.",
      category: SUPPORT_TICKET_CATEGORIES.TECHNICAL,
      priority: SUPPORT_TICKET_PRIORITY.HIGH,
      status: SUPPORT_TICKET_STATUS.OPEN,
      assignedTo: staffProfiles[2]._id,
      messages: [{ sender: students[1].userId, message: "Please check router settings." }],
    },
  ]);

  await HallApplication.insertMany([
    {
      student: students[2]._id,
      registrationNumber: students[2].registrationNumber,
      department: students[2].department,
      semester: students[2].semester,
      contactPhone: "01730000003",
      reason: "Need residential seat due to long commute.",
      status: HALL_APPLICATION_STATUS.UNDER_REVIEW,
      reviewedBy: provostUser._id,
      reviewNote: "Documents verified, pending final seat availability.",
      applicationDate: addDays(today, -5),
    },
    {
      student: students[3]._id,
      registrationNumber: students[3].registrationNumber,
      department: students[3].department,
      semester: students[3].semester,
      contactPhone: "01730000004",
      reason: "Applied for seat in current semester.",
      status: HALL_APPLICATION_STATUS.PENDING,
      applicationDate: addDays(today, -2),
    },
  ]);

  await Notification.insertMany([
    {
      recipient: studentUserMain._id,
      actor: provostUser._id,
      type: "notice_published",
      title: "New Hall Notice",
      message: "A new notice has been published: Hall Cultural Evening.",
      link: `/student/notices/${notices[2]._id}`,
      entityType: "Notice",
      entityId: String(notices[2]._id),
      isRead: false,
    },
    {
      recipient: staffUserMain._id,
      actor: provostUser._id,
      type: "task_assigned",
      title: "Task Assigned",
      message: "You have been assigned a new staff task.",
      link: "/staff/assigned-tasks",
      entityType: "Task",
      entityId: "demo-task",
      isRead: false,
    },
  ]);

  console.log("Demo seed completed successfully.");
  console.log("Required login users:");
  console.log(`- Student: student@gmail.com / ${PASSWORD}`);
  console.log(`- Provost: provost@gmail.com / ${PASSWORD}`);
  console.log(`- Staff:   staff@gmail.com / ${PASSWORD}`);
}

run()
  .catch((error) => {
    console.error("Demo seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectMongo();
  });

import { COMPLAINT_STATUS } from "../models/Complaint.js";
import { Complaint } from "../models/Complaint.js";
import { HALL_APPLICATION_STATUS } from "../models/HallApplication.js";
import { HallApplication } from "../models/HallApplication.js";
import { MAINTENANCE_STATUS } from "../models/Maintenance.js";
import { Maintenance } from "../models/Maintenance.js";
import { Notice } from "../models/Notice.js";
import { Room, ROOM_STATUS } from "../models/Room.js";
import { ROOM_ALLOCATION_STATUS, RoomAllocation } from "../models/RoomAllocation.js";
import { Staff } from "../models/Staff.js";
import { Student } from "../models/Student.js";
import { SUPPORT_TICKET_STATUS, SupportTicket } from "../models/SupportTicket.js";
import { TASK_STATUS, Task } from "../models/Task.js";
import { TRANSACTION_STATUS, TRANSACTION_TYPES, Transaction } from "../models/Transaction.js";
import { walletService } from "./walletService.js";

function startOfDay(dateValue) {
  const date = new Date(dateValue);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfDay(dateValue) {
  const date = new Date(dateValue);
  date.setHours(23, 59, 59, 999);
  return date;
}

function resolveRange(query = {}) {
  const now = new Date();

  if (query.from || query.to) {
    const from = startOfDay(query.from || query.to || now);
    const to = endOfDay(query.to || query.from || now);
    return { from, to };
  }

  if (query.period === "today") {
    return { from: startOfDay(now), to: endOfDay(now) };
  }

  if (query.period === "week") {
    const from = new Date(now);
    from.setDate(now.getDate() - 6);
    return { from: startOfDay(from), to: endOfDay(now) };
  }

  const from = new Date(now);
  from.setDate(now.getDate() - 29);
  return { from: startOfDay(from), to: endOfDay(now) };
}

function buildDateMatch(range, fieldName = "createdAt") {
  return {
    [fieldName]: {
      $gte: range.from,
      $lte: range.to,
    },
  };
}

function statusSummaryFromRows(statuses, rows) {
  const map = new Map(rows.map((entry) => [entry._id, entry.count]));
  return statuses.reduce(
    (result, status) => ({ ...result, [status]: map.get(status) || 0 }),
    { total: rows.reduce((sum, entry) => sum + (entry.count || 0), 0) }
  );
}

async function aggregateStatusSummary(Model, statuses, range, match = {}) {
  const rows = await Model.aggregate([
    { $match: { ...match, ...buildDateMatch(range) } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);
  return statusSummaryFromRows(statuses, rows);
}

async function aggregateCategoryBreakdown(Model, range, match = {}) {
  return Model.aggregate([
    { $match: { ...match, ...buildDateMatch(range) } },
    { $group: { _id: "$category", count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]).then((rows) => rows.map((entry) => ({ category: entry._id, count: entry.count || 0 })));
}

function sumItems(items, field) {
  return (items || []).reduce((sum, entry) => sum + Number(entry?.[field] || 0), 0);
}

export const analyticsService = {
  async getProvostDashboardSummary(query) {
    const range = resolveRange(query);
    // Do not derive "today" from end-of-day range boundaries.
    // On UTC runners that can shift to the next Asia/Dhaka day.
    const diningTodayDate = query.date || query.to || new Date();

    const [
      totalStudents,
      totalStaff,
      roomRows,
      hallApplicationSummary,
      roomAllocationSummary,
      complaintSummary,
      complaintByCategory,
      maintenanceSummary,
      maintenanceByCategory,
      supportSummary,
      supportByCategory,
      supportByPriority,
      taskSummary,
      taskByPriority,
      taskByType,
      noticeSummaryRows,
      diningTodayResult,
      diningDateResult,
      financialSummaryResult,
      transactionSummaryRows,
    ] = await Promise.all([
      Student.countDocuments({ isActive: true }),
      Staff.countDocuments({ isActive: true }),
      Room.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      aggregateStatusSummary(HallApplication, Object.values(HALL_APPLICATION_STATUS), range),
      aggregateStatusSummary(RoomAllocation, Object.values(ROOM_ALLOCATION_STATUS), range),
      aggregateStatusSummary(Complaint, Object.values(COMPLAINT_STATUS), range),
      aggregateCategoryBreakdown(Complaint, range),
      aggregateStatusSummary(Maintenance, Object.values(MAINTENANCE_STATUS), range),
      aggregateCategoryBreakdown(Maintenance, range),
      aggregateStatusSummary(SupportTicket, Object.values(SUPPORT_TICKET_STATUS), range),
      aggregateCategoryBreakdown(SupportTicket, range),
      SupportTicket.aggregate([
        { $match: buildDateMatch(range) },
        { $group: { _id: "$priority", count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      aggregateStatusSummary(Task, Object.values(TASK_STATUS), range),
      Task.aggregate([
        { $match: buildDateMatch(range) },
        { $group: { _id: "$priority", count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Task.aggregate([
        { $match: buildDateMatch(range) },
        { $group: { _id: "$taskType", count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Notice.aggregate([
        { $match: buildDateMatch(range) },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: { $sum: { $cond: [{ $eq: ["$isActive", true] }, 1, 0] } },
            inactive: { $sum: { $cond: [{ $eq: ["$isActive", false] }, 1, 0] } },
            urgent: { $sum: { $cond: [{ $eq: ["$isUrgent", true] }, 1, 0] } },
          },
        },
      ]),
      walletService.getDiningTodaySummary({ date: diningTodayDate }),
      walletService.getDiningDateSummary({ from: range.from, to: range.to }),
      walletService.getProvostFinancialSummary({ from: range.from, to: range.to }),
      Transaction.aggregate([
        { $match: buildDateMatch(range) },
        {
          $group: {
            _id: null,
            totalTransactions: { $sum: 1 },
            completedTransactions: {
              $sum: { $cond: [{ $eq: ["$status", TRANSACTION_STATUS.COMPLETED] }, 1, 0] },
            },
            failedTransactions: {
              $sum: { $cond: [{ $eq: ["$status", TRANSACTION_STATUS.FAILED] }, 1, 0] },
            },
            totalDeposits: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$transactionType", TRANSACTION_TYPES.DEPOSIT] },
                      { $eq: ["$status", TRANSACTION_STATUS.COMPLETED] },
                    ],
                  },
                  "$amount",
                  0,
                ],
              },
            },
            totalTokenPurchaseAmount: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$transactionType", TRANSACTION_TYPES.MEAL_TOKEN] },
                      { $eq: ["$status", TRANSACTION_STATUS.COMPLETED] },
                    ],
                  },
                  "$amount",
                  0,
                ],
              },
            },
            totalRefunds: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$transactionType", TRANSACTION_TYPES.REFUND] },
                      { $eq: ["$status", TRANSACTION_STATUS.COMPLETED] },
                    ],
                  },
                  "$amount",
                  0,
                ],
              },
            },
          },
        },
      ]),
    ]);

    const roomMap = new Map(roomRows.map((entry) => [entry._id, entry.count]));
    const totalRooms = roomRows.reduce((sum, row) => sum + (row.count || 0), 0);
    const occupiedRooms = roomMap.get(ROOM_STATUS.OCCUPIED) || 0;
    const roomSummary = {
      totalRooms,
      vacantRooms: roomMap.get(ROOM_STATUS.VACANT) || 0,
      occupiedRooms,
      maintenanceRooms: roomMap.get(ROOM_STATUS.MAINTENANCE) || 0,
      closedRooms: roomMap.get(ROOM_STATUS.CLOSED) || 0,
      occupancyRate: totalRooms > 0 ? Number(((occupiedRooms / totalRooms) * 100).toFixed(2)) : 0,
    };

    const diningItems = diningDateResult.items || [];
    const diningSummary = {
      today: diningTodayResult.summary,
      rangeTotals: {
        totalTokens: sumItems(diningItems, "totalTokens"),
        breakfastCount: sumItems(diningItems, "breakfastCount"),
        lunchCount: sumItems(diningItems, "lunchCount"),
        dinnerCount: sumItems(diningItems, "dinnerCount"),
        totalAmount: Number(sumItems(diningItems, "totalAmount").toFixed(2)),
        consumedCount: sumItems(diningItems, "consumedCount"),
        notEatenCount: sumItems(diningItems, "notEatenCount"),
        remainingCount: sumItems(diningItems, "remainingCount"),
      },
      trend: diningItems,
      range: diningDateResult.range,
    };

    const noticeSummary = noticeSummaryRows?.[0] || {
      total: 0,
      active: 0,
      inactive: 0,
      urgent: 0,
    };

    const transactionSummary = transactionSummaryRows?.[0] || {
      totalTransactions: 0,
      completedTransactions: 0,
      failedTransactions: 0,
      totalDeposits: 0,
      totalTokenPurchaseAmount: 0,
      totalRefunds: 0,
    };

    return {
      range,
      hallOverview: {
        totalStudents,
        totalStaff,
        ...roomSummary,
      },
      hallApplications: hallApplicationSummary,
      roomAllocations: roomAllocationSummary,
      dining: diningSummary,
      financial: {
        ...transactionSummary,
        overview: financialSummaryResult.overview,
        dailyRevenue: financialSummaryResult.dailyRevenue,
      },
      complaints: {
        ...complaintSummary,
        byCategory: complaintByCategory,
      },
      maintenance: {
        ...maintenanceSummary,
        byCategory: maintenanceByCategory,
      },
      supportTickets: {
        ...supportSummary,
        byCategory: supportByCategory,
        byPriority: supportByPriority.map((entry) => ({
          priority: entry._id,
          count: entry.count || 0,
        })),
      },
      tasks: {
        ...taskSummary,
        byPriority: taskByPriority.map((entry) => ({
          priority: entry._id,
          count: entry.count || 0,
        })),
        byType: taskByType.map((entry) => ({
          taskType: entry._id,
          count: entry.count || 0,
        })),
      },
      notices: {
        total: noticeSummary.total || 0,
        active: noticeSummary.active || 0,
        inactive: noticeSummary.inactive || 0,
        urgent: noticeSummary.urgent || 0,
      },
    };
  },

  async getStaffDiningSummary(query) {
    const range = resolveRange(query);
    const today = await walletService.getDiningTodaySummary({ date: query.date || query.to || new Date() });
    const dateWise = await walletService.getDiningDateSummary({ from: range.from, to: range.to });

    return {
      range,
      today: today.summary,
      trend: dateWise.items || [],
    };
  },
};

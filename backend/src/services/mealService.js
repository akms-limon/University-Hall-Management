import { StatusCodes } from "http-status-codes";
import { withMongoTransaction } from "../db/withMongoTransaction.js";
import { env } from "../config/env.js";
import { USER_ROLES } from "../constants/roles.js";
import { FoodMenu } from "../models/FoodMenu.js";
import {
  MEAL_ORDER_STATUS,
  MEAL_PAYMENT_STATUS,
  MEAL_TOKEN_TYPES,
  MealOrder,
} from "../models/MealOrder.js";
import { Student } from "../models/Student.js";
import { User } from "../models/User.js";
import { notificationService } from "./notificationService.js";
import { walletService } from "./walletService.js";
import { ApiError } from "../utils/ApiError.js";
import { addDaysToDateKey, dateFromDateKey, getDateKeyInTimezone } from "../utils/dateInTimezone.js";
import { sanitizeFoodMenu } from "../utils/sanitizeFoodMenu.js";
import { sanitizeMealOrder } from "../utils/sanitizeMealOrder.js";

const studentUserProjection = "name email phone role profilePhoto isActive";
const statusActorProjection = "name email phone role profilePhoto isActive";
const foodProjection =
  "itemName category description price soldToday image ingredients allergens isVegetarian isVegan calories availableDate isAvailable isDeleted createdAt updatedAt";

const mealOrderPopulate = [
  {
    path: "student",
    populate: {
      path: "userId",
      select: studentUserProjection,
    },
  },
  { path: "foodItem", select: foodProjection },
  { path: "statusUpdatedBy", select: statusActorProjection },
  { path: "consumedMarkedBy", select: statusActorProjection },
];
const mealBusinessTimezone = env.APP_TIMEZONE || "Asia/Dhaka";
const dateKeyPattern = /^\d{4}-\d{2}-\d{2}$/;

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStringArray(values) {
  if (!Array.isArray(values)) return [];
  return values.map((value) => normalizeString(value)).filter(Boolean);
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function endOfUtcDay(dateValue = new Date()) {
  const date = new Date(dateValue);
  date.setUTCHours(23, 59, 59, 999);
  return date;
}

function getBusinessDateKey(dateValue = new Date()) {
  return getDateKeyInTimezone(dateValue, mealBusinessTimezone);
}

function compareBusinessDates(firstDate, secondDate) {
  const firstKey = getBusinessDateKey(firstDate);
  const secondKey = getBusinessDateKey(secondDate);
  if (firstKey === secondKey) return 0;
  return firstKey > secondKey ? 1 : -1;
}

function normalizeDateKeyInput(value, fallbackDate = new Date()) {
  if (typeof value === "string" && dateKeyPattern.test(value.trim())) {
    return value.trim();
  }

  if (!value) {
    return getBusinessDateKey(fallbackDate);
  }

  return getBusinessDateKey(value);
}

function dateKeyExpression(fieldName) {
  return {
    $dateToString: {
      format: "%Y-%m-%d",
      date: `$${fieldName}`,
      timezone: mealBusinessTimezone,
    },
  };
}

function appendExprFilter(filters, expr) {
  if (!filters.$expr) {
    filters.$expr = expr;
    return;
  }

  filters.$expr = {
    $and: [filters.$expr, expr],
  };
}

function applyDateEqualsFilter(filters, fieldName, dateKey) {
  appendExprFilter(filters, {
    $eq: [dateKeyExpression(fieldName), dateKey],
  });
}

function applyDateRangeFilter(filters, fieldName, fromDateKey, toDateKey) {
  const predicates = [];
  if (fromDateKey) {
    predicates.push({
      $gte: [dateKeyExpression(fieldName), fromDateKey],
    });
  }

  if (toDateKey) {
    predicates.push({
      $lte: [dateKeyExpression(fieldName), toDateKey],
    });
  }

  if (!predicates.length) {
    return;
  }

  appendExprFilter(
    filters,
    predicates.length === 1
      ? predicates[0]
      : {
          $and: predicates,
        }
  );
}

function makeTokenCode(mealType, validDate) {
  const [y, m, d] = getBusinessDateKey(validDate).split("-");
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${String(mealType).slice(0, 3).toUpperCase()}-${String(y)}${String(m)}${String(d)}-${suffix}`;
}

function normalizeFoodSort(sortBy = "itemName", sortOrder = "asc") {
  const direction = sortOrder === "desc" ? -1 : 1;
  const mappedPath = {
    itemName: "itemName",
    price: "price",
    soldToday: "soldToday",
    category: "category",
    createdAt: "createdAt",
  };
  return { [mappedPath[sortBy] || "itemName"]: direction, _id: 1 };
}

function normalizeOrderSort(sortBy = "orderDate", sortOrder = "desc") {
  const direction = sortOrder === "asc" ? 1 : -1;
  const mappedPath = {
    orderDate: "orderDate",
    validDate: "validDate",
    mealType: "mealType",
    status: "status",
    paymentStatus: "paymentStatus",
    amount: "amount",
    createdAt: "createdAt",
  };
  return { [mappedPath[sortBy] || "orderDate"]: direction, _id: 1 };
}

async function ensureStudentProfile(userId) {
  let student = await Student.findOne({ userId }).populate("userId", studentUserProjection);
  if (student) return student;

  const user = await User.findById(userId);
  if (!user || user.role !== USER_ROLES.STUDENT) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Student profile not found");
  }

  student = await Student.create({
    userId: user._id,
    profilePhoto: user.profilePhoto || "",
  });

  return Student.findById(student._id).populate("userId", studentUserProjection);
}

async function loadFoodById(itemId, { includeDeleted = false } = {}) {
  const foodItem = await FoodMenu.findOne({
    _id: itemId,
    ...(includeDeleted ? {} : { isDeleted: false }),
  });
  if (!foodItem) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Meal item not found");
  }
  return foodItem;
}

async function loadMealOrderById(orderId) {
  const query = MealOrder.findById(orderId);
  mealOrderPopulate.forEach((entry) => query.populate(entry));
  const order = await query;
  if (!order) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Meal token not found");
  }
  return order;
}

async function expirePastTokens() {
  await MealOrder.updateMany(
    {
      status: MEAL_ORDER_STATUS.ACTIVE,
      $expr: {
        $lt: [dateKeyExpression("validDate"), getBusinessDateKey(new Date())],
      },
    },
    {
      $set: { status: MEAL_ORDER_STATUS.EXPIRED },
    }
  );
}

function tokenMealTypeFromFood(foodItem) {
  const category = normalizeString(foodItem?.category).toLowerCase();
  return Object.values(MEAL_TOKEN_TYPES).includes(category) ? category : null;
}

function buildMenuFilters(query, { staffView = false } = {}) {
  const filters = {
    isDeleted: false,
    ...(staffView ? {} : { isAvailable: true }),
  };

  if (query.date) {
    const targetDateKey = normalizeDateKeyInput(query.date);
    if (!staffView && targetDateKey <= getBusinessDateKey(new Date())) {
      filters._id = null;
      return filters;
    }

    applyDateEqualsFilter(filters, "availableDate", targetDateKey);
  } else if (!staffView) {
    const targetDateKey = addDaysToDateKey(getBusinessDateKey(new Date()), 1);
    applyDateEqualsFilter(filters, "availableDate", targetDateKey);
  }

  if (staffView && typeof query.isAvailable === "boolean") {
    filters.isAvailable = query.isAvailable;
  }
  if (query.category) filters.category = query.category;
  if (typeof query.isVegetarian === "boolean") filters.isVegetarian = query.isVegetarian;
  if (typeof query.isVegan === "boolean") filters.isVegan = query.isVegan;
  if (query.search) {
    const searchRegex = new RegExp(escapeRegex(query.search), "i");
    filters.$or = [{ itemName: searchRegex }, { description: searchRegex }];
  }
  return filters;
}

function makeMenuSummaryStage() {
  return {
    $group: {
      _id: null,
      totalItems: { $sum: 1 },
      availableItems: { $sum: { $cond: [{ $eq: ["$isAvailable", true] }, 1, 0] } },
      unavailableItems: { $sum: { $cond: [{ $eq: ["$isAvailable", false] }, 1, 0] } },
      vegetarianItems: { $sum: { $cond: [{ $eq: ["$isVegetarian", true] }, 1, 0] } },
      veganItems: { $sum: { $cond: [{ $eq: ["$isVegan", true] }, 1, 0] } },
    },
  };
}

function normalizeMenuSummary(summary) {
  return {
    totalItems: summary?.totalItems || 0,
    availableItems: summary?.availableItems || 0,
    unavailableItems: summary?.unavailableItems || 0,
    vegetarianItems: summary?.vegetarianItems || 0,
    veganItems: summary?.veganItems || 0,
  };
}

async function notifyMenuUpdated(item, actor) {
  if (!item.isAvailable || item.isDeleted || compareBusinessDates(item.availableDate, new Date()) !== 0) return;
  try {
    await notificationService.notifyRole(USER_ROLES.STUDENT, {
      actorUserId: actor?.id || null,
      type: "meal_menu_updated",
      title: "Daily Menu Updated",
      message: `${item.itemName} is now available in today's ${item.category} menu.`,
      link: "/menu",
      entityType: "FoodMenu",
      entityId: item._id.toString(),
    });
  } catch {
    // Ignore notification errors for menu update.
  }
}

function ensureOrderOwnedByStudent(order, studentId) {
  if (order.student?._id?.toString() !== studentId.toString()) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Meal token not found");
  }
}

function ensureFutureDate(value) {
  const validDateKey = normalizeDateKeyInput(value);
  if (validDateKey <= getBusinessDateKey(new Date())) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Meal tokens can only be purchased from tomorrow or future dates (Asia/Dhaka)."
    );
  }

  return {
    validDateKey,
    validDate: dateFromDateKey(validDateKey),
  };
}

function buildSummary(statusRows = [], stats = {}, mealTypeRows = []) {
  const summary = {
    totalTokens: stats.totalTokens || 0,
    active: 0,
    consumed: 0,
    notEaten: 0,
    expired: 0,
    cancelled: 0,
    paidTokens: stats.paidTokens || 0,
    failedPayments: stats.failedPayments || 0,
    totalAmount: Number(stats.totalAmount || 0),
    breakfast: 0,
    lunch: 0,
    dinner: 0,
    remaining: 0,
  };

  statusRows.forEach((entry) => {
    if (entry._id === MEAL_ORDER_STATUS.ACTIVE) summary.active = entry.count;
    if (entry._id === MEAL_ORDER_STATUS.CONSUMED) summary.consumed = entry.count;
    if (entry._id === MEAL_ORDER_STATUS.NOT_EATEN) summary.notEaten = entry.count;
    if (entry._id === MEAL_ORDER_STATUS.EXPIRED) summary.expired = entry.count;
    if (entry._id === MEAL_ORDER_STATUS.CANCELLED) summary.cancelled = entry.count;
  });
  mealTypeRows.forEach((entry) => {
    if (entry._id === MEAL_TOKEN_TYPES.BREAKFAST) summary.breakfast = entry.count;
    if (entry._id === MEAL_TOKEN_TYPES.LUNCH) summary.lunch = entry.count;
    if (entry._id === MEAL_TOKEN_TYPES.DINNER) summary.dinner = entry.count;
  });
  summary.remaining = summary.active;
  return summary;
}

async function resolveSearchOrderIds(searchRegex) {
  const [users, menus] = await Promise.all([
    User.find({
      role: USER_ROLES.STUDENT,
      $or: [{ name: searchRegex }, { email: searchRegex }],
    })
      .select("_id")
      .lean(),
    FoodMenu.find({ $or: [{ itemName: searchRegex }, { category: searchRegex }] })
      .select("_id")
      .lean(),
  ]);

  const userIds = users.map((entry) => entry._id);
  const students = await Student.find({
    $or: [{ registrationNumber: searchRegex }, ...(userIds.length ? [{ userId: { $in: userIds } }] : [])],
  })
    .select("_id")
    .lean();

  return {
    studentIds: students.map((entry) => entry._id),
    foodItemIds: menus.map((entry) => entry._id),
  };
}

export const mealService = {
  async createMealItem(actor, payload) {
    const availableDateKey = normalizeDateKeyInput(payload.availableDate);
    const item = await FoodMenu.create({
      itemName: normalizeString(payload.itemName),
      category: payload.category,
      description: normalizeString(payload.description),
      price: payload.price,
      quantity:
        payload.quantity === undefined || payload.quantity === null
          ? null
          : Number(payload.quantity),
      soldToday: 0,
      image: normalizeString(payload.image),
      ingredients: normalizeStringArray(payload.ingredients),
      allergens: normalizeStringArray(payload.allergens),
      isVegetarian: payload.isVegetarian ?? false,
      isVegan: payload.isVegan ?? false,
      calories: payload.calories ?? 0,
      availableDate: dateFromDateKey(availableDateKey),
      isAvailable: payload.isAvailable ?? true,
      isDeleted: false,
      createdBy: actor?.id || null,
    });

    await notifyMenuUpdated(item, actor);
    return sanitizeFoodMenu(item);
  },

  async updateMealItem(itemId, actor, payload) {
    const item = await loadFoodById(itemId, { includeDeleted: true });
    const previousAvailability = item.isAvailable;

    if (payload.itemName !== undefined) item.itemName = normalizeString(payload.itemName);
    if (payload.category !== undefined) item.category = payload.category;
    if (payload.description !== undefined) item.description = normalizeString(payload.description);
    if (payload.price !== undefined) item.price = payload.price;
    if (payload.quantity !== undefined) item.quantity = payload.quantity;
    if (payload.image !== undefined) item.image = normalizeString(payload.image);
    if (payload.ingredients !== undefined) item.ingredients = normalizeStringArray(payload.ingredients);
    if (payload.allergens !== undefined) item.allergens = normalizeStringArray(payload.allergens);
    if (payload.isVegetarian !== undefined) item.isVegetarian = payload.isVegetarian;
    if (payload.isVegan !== undefined) item.isVegan = payload.isVegan;
    if (payload.calories !== undefined) item.calories = payload.calories;
    if (payload.availableDate !== undefined) {
      item.availableDate = dateFromDateKey(normalizeDateKeyInput(payload.availableDate));
    }
    if (payload.isAvailable !== undefined) item.isAvailable = payload.isAvailable;

    await item.save();
    if (!previousAvailability && item.isAvailable) {
      await notifyMenuUpdated(item, actor);
    }
    return sanitizeFoodMenu(item);
  },

  async deleteMealItem(itemId) {
    const item = await loadFoodById(itemId, { includeDeleted: true });
    item.isDeleted = true;
    item.isAvailable = false;
    await item.save();
    return sanitizeFoodMenu(item);
  },

  async updateMealItemAvailability(itemId, isAvailable, actor = null) {
    const item = await loadFoodById(itemId, { includeDeleted: true });
    const previousAvailability = item.isAvailable;
    item.isAvailable = isAvailable;
    await item.save();
    if (!previousAvailability && isAvailable) {
      await notifyMenuUpdated(item, actor);
    }
    return sanitizeFoodMenu(item);
  },

  async listDailyMenu(query) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);
    const skip = (page - 1) * limit;
    const filters = buildMenuFilters(query, { staffView: false });
    const sort = normalizeFoodSort(query.sortBy || "category", query.sortOrder || "asc");

    const [items, total, summaryRows] = await Promise.all([
      FoodMenu.find(filters).sort(sort).skip(skip).limit(limit).lean(),
      FoodMenu.countDocuments(filters),
      FoodMenu.aggregate([{ $match: filters }, makeMenuSummaryStage()]),
    ]);

    return {
      items: items.map((entry) => sanitizeFoodMenu(entry)),
      summary: normalizeMenuSummary(summaryRows[0]),
      meta: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
        sortBy: query.sortBy || "category",
        sortOrder: query.sortOrder || "asc",
      },
    };
  },

  async listMealItemsForStaff(query) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);
    const skip = (page - 1) * limit;
    const filters = buildMenuFilters(query, { staffView: true });
    const sort = normalizeFoodSort(query.sortBy || "category", query.sortOrder || "asc");

    const [items, total, summaryRows] = await Promise.all([
      FoodMenu.find(filters).sort(sort).skip(skip).limit(limit).lean(),
      FoodMenu.countDocuments(filters),
      FoodMenu.aggregate([{ $match: filters }, makeMenuSummaryStage()]),
    ]);

    return {
      items: items.map((entry) => sanitizeFoodMenu(entry)),
      summary: normalizeMenuSummary(summaryRows[0]),
      meta: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
        sortBy: query.sortBy || "category",
        sortOrder: query.sortOrder || "asc",
      },
    };
  },

  async getMealItemById(itemId, { staffView = false } = {}) {
    const item = await loadFoodById(itemId, { includeDeleted: staffView });
    if (!staffView && (item.isDeleted || !item.isAvailable)) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Meal item not available");
    }
    return sanitizeFoodMenu(item);
  },

  async createMealOrder(actor, payload) {
    await expirePastTokens();
    const student = await ensureStudentProfile(actor.id);
    const { validDate, validDateKey } = ensureFutureDate(payload.validDate || payload.deliveryDate);
    const foodItem = await loadFoodById(payload.foodItemId);
    const mealType = tokenMealTypeFromFood(foodItem);

    if (!mealType) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        "Meal token purchase is allowed only for breakfast, lunch, or dinner"
      );
    }
    if (!foodItem.isAvailable || foodItem.isDeleted) {
      throw new ApiError(StatusCodes.BAD_REQUEST, "Meal item is not available");
    }
    if (compareBusinessDates(foodItem.availableDate, validDate) !== 0) {
      throw new ApiError(StatusCodes.BAD_REQUEST, "Meal item is not available for selected date");
    }

    const amount = Number(foodItem.price || 0);
    const tokenCode = makeTokenCode(mealType, validDate);
    const { tokenId, balanceSnapshot } = await withMongoTransaction(null, async (session) => {
      const [token] = await MealOrder.create(
        [{
          student: student._id,
          foodItem: foodItem._id,
          mealType,
          validDate,
          tokenCode,
          quantity: 1,
          amount,
          totalPrice: amount,
          orderDate: new Date(),
          status: MEAL_ORDER_STATUS.ACTIVE,
          paymentStatus: MEAL_PAYMENT_STATUS.PAID,
          specialRequests: normalizeString(payload.specialRequests),
          statusUpdatedBy: actor.id,
        }],
        session ? { session } : {}
      );

      await FoodMenu.findByIdAndUpdate(
        foodItem._id,
        { $inc: { soldToday: 1 } },
        { session: session || undefined }
      );

      const paymentResult = await walletService.deductBalanceForMealToken({
        studentId: student._id,
        studentUserId: student.userId?._id || student.userId?.id || student.userId,
        amount,
        mealOrderId: token._id,
        actorUserId: actor.id,
        description: "Meal token purchase from student wallet",
        remarks: normalizeString(payload.specialRequests),
        referenceId: `MEAL-${tokenCode}`,
        session,
      });

      token.transactionId = paymentResult.transaction._id;
      await token.save({ session: session || undefined });

      return {
        tokenId: token._id,
        balanceSnapshot: {
          provider: "internal_wallet",
          providerReference: paymentResult.transaction.referenceId || paymentResult.transaction.providerReference || "",
          paymentUrl: "",
          message: "Token purchased using wallet balance",
          balanceBefore: paymentResult.balanceBefore,
          balanceAfter: paymentResult.balanceAfter,
        },
      };
    });

    try {
      await notificationService.notifyRole(USER_ROLES.STAFF, {
        actorUserId: actor.id,
        type: "meal_token_purchased",
        title: "New Meal Token Purchased",
        message: `${student.userId?.name || "A student"} purchased a ${mealType} token.`,
        link: "/staff/orders",
        entityType: "MealOrder",
        entityId: tokenId.toString(),
      });
    } catch {
      // Ignore notification failures.
    }

    const studentUserId = student.userId?._id || student.userId?.id || student.userId;
    if (studentUserId) {
      try {
        await notificationService.createNotification({
          recipientUserId: studentUserId,
          actorUserId: actor.id,
          type: "meal_token_purchase_success",
          title: "Meal Token Purchased",
          message: `Your ${mealType} token for ${validDateKey} is active and paid from wallet balance.`,
          link: "/my-meal-orders",
          entityType: "MealOrder",
          entityId: tokenId.toString(),
        });
      } catch {
        // Ignore notification failures.
      }
    }

    const refreshed = await loadMealOrderById(tokenId);
    return {
      order: sanitizeMealOrder(refreshed),
      paymentFailed: false,
      payment: balanceSnapshot,
    };
  },

  async listMyMealOrders(actor, query) {
    await expirePastTokens();
    const student = await ensureStudentProfile(actor.id);
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);
    const skip = (page - 1) * limit;
    const sort = normalizeOrderSort(query.sortBy, query.sortOrder);
    const filters = {
      student: student._id,
      ...(query.status ? { status: query.status } : {}),
      ...(query.paymentStatus ? { paymentStatus: query.paymentStatus } : {}),
      ...(query.mealType ? { mealType: query.mealType } : {}),
    };

    if (query.validDateFrom || query.validDateTo) {
      applyDateRangeFilter(
        filters,
        "validDate",
        query.validDateFrom ? normalizeDateKeyInput(query.validDateFrom) : null,
        query.validDateTo ? normalizeDateKeyInput(query.validDateTo) : null
      );
    }

    const [items, total, statusRows, statsRows, mealTypeRows] = await Promise.all([
      MealOrder.find(filters).sort(sort).skip(skip).limit(limit).populate(mealOrderPopulate),
      MealOrder.countDocuments(filters),
      MealOrder.aggregate([
        { $match: filters },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      MealOrder.aggregate([
        { $match: filters },
        {
          $group: {
            _id: null,
            totalTokens: { $sum: 1 },
            paidTokens: { $sum: { $cond: [{ $eq: ["$paymentStatus", MEAL_PAYMENT_STATUS.PAID] }, 1, 0] } },
            failedPayments: { $sum: { $cond: [{ $eq: ["$paymentStatus", MEAL_PAYMENT_STATUS.FAILED] }, 1, 0] } },
            totalAmount: { $sum: { $cond: [{ $eq: ["$paymentStatus", MEAL_PAYMENT_STATUS.PAID] }, "$amount", 0] } },
          },
        },
      ]),
      MealOrder.aggregate([
        { $match: { ...filters, paymentStatus: MEAL_PAYMENT_STATUS.PAID, status: { $ne: MEAL_ORDER_STATUS.CANCELLED } } },
        { $group: { _id: "$mealType", count: { $sum: 1 } } },
      ]),
    ]);

    return {
      items: items.map((entry) => sanitizeMealOrder(entry)),
      summary: buildSummary(statusRows, statsRows[0], mealTypeRows),
      meta: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
        sortBy: query.sortBy || "orderDate",
        sortOrder: query.sortOrder || "desc",
      },
    };
  },

  async cancelMyMealOrder(actor, orderId, payload = {}) {
    await expirePastTokens();
    const student = await ensureStudentProfile(actor.id);
    const order = await loadMealOrderById(orderId);
    ensureOrderOwnedByStudent(order, student._id);
    if (order.status !== MEAL_ORDER_STATUS.ACTIVE) {
      throw new ApiError(StatusCodes.CONFLICT, "Only active tokens can be cancelled");
    }
    const orderDateKey = getBusinessDateKey(order.validDate);
    const currentDateKey = getBusinessDateKey(new Date());
    if (orderDateKey <= currentDateKey) {
      throw new ApiError(
        StatusCodes.CONFLICT,
        "Cancellation window closed. Tokens can be cancelled only before token day starts (Asia/Dhaka)."
      );
    }

    await withMongoTransaction(null, async (session) => {
      const orderForUpdate = await MealOrder.findById(order._id, null, { session: session || undefined });
      if (!orderForUpdate) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Meal token not found");
      }
      if (orderForUpdate.status !== MEAL_ORDER_STATUS.ACTIVE) {
        throw new ApiError(StatusCodes.CONFLICT, "Only active tokens can be cancelled");
      }

      await FoodMenu.findByIdAndUpdate(
        orderForUpdate.foodItem,
        { $inc: { soldToday: -1 } },
        { session: session || undefined }
      );

      if (orderForUpdate.paymentStatus === MEAL_PAYMENT_STATUS.PAID) {
        await walletService.creditBalance({
          studentId: orderForUpdate.student,
          amount: Number(orderForUpdate.amount || orderForUpdate.totalPrice || 0),
          transactionType: "refund",
          description: "Meal token refund to student wallet",
          paymentMethod: "system",
          referenceId: `REFUND-${orderForUpdate._id.toString()}`,
          processedByUserId: actor.id,
          remarks: normalizeString(payload.cancelledReason) || "Cancelled by student",
          mealOrderId: orderForUpdate._id,
          metadata: {
            reason: normalizeString(payload.cancelledReason) || "Cancelled by student",
          },
          session,
        });
      }

      orderForUpdate.status = MEAL_ORDER_STATUS.CANCELLED;
      orderForUpdate.cancelledReason = normalizeString(payload.cancelledReason) || "Cancelled by student";
      orderForUpdate.statusUpdatedBy = actor.id;
      await orderForUpdate.save({ session: session || undefined });
    });

    const refreshed = await loadMealOrderById(order._id);
    return sanitizeMealOrder(refreshed);
  },

  async listMealOrdersForStaff(query) {
    await expirePastTokens();
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);
    const skip = (page - 1) * limit;
    const sort = normalizeOrderSort(query.sortBy, query.sortOrder);
    const filters = {};

    if (query.status) filters.status = query.status;
    if (query.paymentStatus) filters.paymentStatus = query.paymentStatus;
    if (query.mealType) filters.mealType = query.mealType;

    if (query.date) {
      applyDateEqualsFilter(filters, "validDate", normalizeDateKeyInput(query.date));
    } else if (query.validDateFrom || query.validDateTo) {
      applyDateRangeFilter(
        filters,
        "validDate",
        query.validDateFrom ? normalizeDateKeyInput(query.validDateFrom) : null,
        query.validDateTo ? normalizeDateKeyInput(query.validDateTo) : null
      );
    } else {
      // Default token-check queue should open with today's tokens in business timezone.
      applyDateEqualsFilter(filters, "validDate", getBusinessDateKey(new Date()));
    }

    if (query.search) {
      const searchRegex = new RegExp(escapeRegex(query.search), "i");
      const { studentIds, foodItemIds } = await resolveSearchOrderIds(searchRegex);
      if (!studentIds.length && !foodItemIds.length) {
        filters.$or = [{ tokenCode: searchRegex }];
      } else {
        filters.$or = [
          { tokenCode: searchRegex },
          ...(studentIds.length ? [{ student: { $in: studentIds } }] : []),
          ...(foodItemIds.length ? [{ foodItem: { $in: foodItemIds } }] : []),
        ];
      }
    }

    const [items, total, statusRows, statsRows, mealTypeRows] = await Promise.all([
      MealOrder.find(filters).sort(sort).skip(skip).limit(limit).populate(mealOrderPopulate),
      MealOrder.countDocuments(filters),
      MealOrder.aggregate([{ $match: filters }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
      MealOrder.aggregate([
        { $match: filters },
        {
          $group: {
            _id: null,
            totalTokens: { $sum: 1 },
            paidTokens: { $sum: { $cond: [{ $eq: ["$paymentStatus", MEAL_PAYMENT_STATUS.PAID] }, 1, 0] } },
            failedPayments: { $sum: { $cond: [{ $eq: ["$paymentStatus", MEAL_PAYMENT_STATUS.FAILED] }, 1, 0] } },
            totalAmount: { $sum: { $cond: [{ $eq: ["$paymentStatus", MEAL_PAYMENT_STATUS.PAID] }, "$amount", 0] } },
          },
        },
      ]),
      MealOrder.aggregate([
        { $match: { ...filters, paymentStatus: MEAL_PAYMENT_STATUS.PAID, status: { $ne: MEAL_ORDER_STATUS.CANCELLED } } },
        { $group: { _id: "$mealType", count: { $sum: 1 } } },
      ]),
    ]);

    return {
      items: items.map((entry) => sanitizeMealOrder(entry)),
      summary: buildSummary(statusRows, statsRows[0], mealTypeRows),
      meta: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
        sortBy: query.sortBy || "orderDate",
        sortOrder: query.sortOrder || "desc",
      },
    };
  },

  async updateMealOrderStatus(orderId, actor, payload) {
    await expirePastTokens();
    const order = await loadMealOrderById(orderId);
    const nextStatus = payload.status;

    const isCheckAction =
      nextStatus === MEAL_ORDER_STATUS.CONSUMED ||
      nextStatus === MEAL_ORDER_STATUS.NOT_EATEN;

    if (isCheckAction) {
      if (order.status === MEAL_ORDER_STATUS.CONSUMED) {
        throw new ApiError(StatusCodes.CONFLICT, "Token already marked as eaten");
      }
      if (order.status === MEAL_ORDER_STATUS.NOT_EATEN) {
        throw new ApiError(StatusCodes.CONFLICT, "Token already marked as not eaten");
      }
      if (order.status === MEAL_ORDER_STATUS.CANCELLED) {
        throw new ApiError(StatusCodes.CONFLICT, "Cancelled token cannot be checked");
      }
      if (order.status === MEAL_ORDER_STATUS.EXPIRED) {
        throw new ApiError(StatusCodes.CONFLICT, "Expired token cannot be checked");
      }
      if (order.status !== MEAL_ORDER_STATUS.ACTIVE) {
        throw new ApiError(StatusCodes.CONFLICT, "Only active tokens can be checked");
      }
      if (order.paymentStatus !== MEAL_PAYMENT_STATUS.PAID) {
        throw new ApiError(StatusCodes.CONFLICT, "Only paid tokens can be checked");
      }

      const tokenDateDiff = compareBusinessDates(order.validDate, new Date());
      if (tokenDateDiff !== 0) {
        if (tokenDateDiff < 0) {
          order.status = MEAL_ORDER_STATUS.EXPIRED;
          order.statusUpdatedBy = actor.id;
          await order.save();
          throw new ApiError(StatusCodes.CONFLICT, "Token expired");
        }
        throw new ApiError(StatusCodes.CONFLICT, "Token is valid for a different date");
      }

      const checkedAt = new Date();
      order.status = nextStatus;
      order.checkedAt = checkedAt;
      order.checkedBy = actor.id;
      order.statusUpdatedBy = actor.id;

      if (nextStatus === MEAL_ORDER_STATUS.CONSUMED) {
        order.consumedAt = checkedAt;
        order.consumedMarkedBy = actor.id;
      } else {
        order.consumedAt = null;
        order.consumedMarkedBy = null;
      }

      await order.save();

      const studentUserId = order.student?.userId?._id || order.student?.userId;
      if (studentUserId) {
        try {
          await notificationService.createNotification({
            recipientUserId: studentUserId,
            actorUserId: actor.id,
            type:
              nextStatus === MEAL_ORDER_STATUS.CONSUMED
                ? "meal_token_consumed"
                : "meal_token_not_eaten_marked",
            title:
              nextStatus === MEAL_ORDER_STATUS.CONSUMED
                ? "Meal Token Used"
                : "Meal Token Marked Not Eaten",
            message:
              nextStatus === MEAL_ORDER_STATUS.CONSUMED
                ? `Your ${order.mealType} token was marked as eaten by dining staff.`
                : `Your ${order.mealType} token was marked as not eaten by dining staff.`,
            link: "/my-meal-orders",
            entityType: "MealOrder",
            entityId: order._id.toString(),
          });
        } catch {
          // Ignore notification failure.
        }
      }

      const refreshedOrder = await loadMealOrderById(order._id);
      return sanitizeMealOrder(refreshedOrder);
    }

    if (nextStatus === MEAL_ORDER_STATUS.EXPIRED) {
      if (order.status === MEAL_ORDER_STATUS.CONSUMED) {
        throw new ApiError(StatusCodes.CONFLICT, "Consumed token cannot be expired");
      }
      order.status = MEAL_ORDER_STATUS.EXPIRED;
      order.statusUpdatedBy = actor.id;
      await order.save();
      const refreshedExpired = await loadMealOrderById(order._id);
      return sanitizeMealOrder(refreshedExpired);
    }

    if (nextStatus === MEAL_ORDER_STATUS.CANCELLED) {
      if (order.status !== MEAL_ORDER_STATUS.ACTIVE) {
        throw new ApiError(StatusCodes.CONFLICT, "Only active tokens can be cancelled");
      }

      await withMongoTransaction(null, async (session) => {
        const orderForUpdate = await MealOrder.findById(order._id, null, { session: session || undefined });
        if (!orderForUpdate) {
          throw new ApiError(StatusCodes.NOT_FOUND, "Meal token not found");
        }
        if (orderForUpdate.status !== MEAL_ORDER_STATUS.ACTIVE) {
          throw new ApiError(StatusCodes.CONFLICT, "Only active tokens can be cancelled");
        }

        await FoodMenu.findByIdAndUpdate(
          orderForUpdate.foodItem,
          { $inc: { soldToday: -1 } },
          { session: session || undefined }
        );

        if (orderForUpdate.paymentStatus === MEAL_PAYMENT_STATUS.PAID) {
          await walletService.creditBalance({
            studentId: orderForUpdate.student,
            amount: Number(orderForUpdate.amount || orderForUpdate.totalPrice || 0),
            transactionType: "refund",
            description: "Meal token refund to student wallet",
            paymentMethod: "system",
            referenceId: `REFUND-${orderForUpdate._id.toString()}`,
            processedByUserId: actor.id,
            remarks: normalizeString(payload.cancelledReason) || "Cancelled by dining staff",
            mealOrderId: orderForUpdate._id,
            metadata: {
              reason: normalizeString(payload.cancelledReason) || "Cancelled by dining staff",
            },
            session,
          });
        }

        orderForUpdate.status = MEAL_ORDER_STATUS.CANCELLED;
        orderForUpdate.cancelledReason = normalizeString(payload.cancelledReason) || "Cancelled by dining staff";
        orderForUpdate.statusUpdatedBy = actor.id;
        await orderForUpdate.save({ session: session || undefined });
      });

      const refreshedCancelled = await loadMealOrderById(order._id);
      return sanitizeMealOrder(refreshedCancelled);
    }

    throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid token status transition");
  },

  async getMealOrderById(orderId, actor, { staffView = false } = {}) {
    await expirePastTokens();
    const order = await loadMealOrderById(orderId);
    if (!staffView) {
      const student = await ensureStudentProfile(actor.id);
      ensureOrderOwnedByStudent(order, student._id);
    }
    return sanitizeMealOrder(order);
  },

  async getTodayMealStats(query) {
    await expirePastTokens();
    const targetDateKey = normalizeDateKeyInput(query.date, new Date());
    const targetDate = dateFromDateKey(targetDateKey);
    const tokenMatch = {
      $expr: {
        $eq: [dateKeyExpression("validDate"), targetDateKey],
      },
    };
    const menuMatch = {
      isDeleted: false,
      $expr: {
        $eq: [dateKeyExpression("availableDate"), targetDateKey],
      },
    };

    const [overviewRows, mealTypeRows, topItems, menuRows] = await Promise.all([
      MealOrder.aggregate([
        { $match: tokenMatch },
        {
          $group: {
            _id: null,
            totalTokens: { $sum: 1 },
            paidTokens: { $sum: { $cond: [{ $eq: ["$paymentStatus", MEAL_PAYMENT_STATUS.PAID] }, 1, 0] } },
            totalAmount: { $sum: { $cond: [{ $eq: ["$paymentStatus", MEAL_PAYMENT_STATUS.PAID] }, "$amount", 0] } },
            consumedTokens: { $sum: { $cond: [{ $eq: ["$status", MEAL_ORDER_STATUS.CONSUMED] }, 1, 0] } },
            notEatenTokens: { $sum: { $cond: [{ $eq: ["$status", MEAL_ORDER_STATUS.NOT_EATEN] }, 1, 0] } },
            activeTokens: { $sum: { $cond: [{ $eq: ["$status", MEAL_ORDER_STATUS.ACTIVE] }, 1, 0] } },
            cancelledTokens: { $sum: { $cond: [{ $eq: ["$status", MEAL_ORDER_STATUS.CANCELLED] }, 1, 0] } },
            expiredTokens: { $sum: { $cond: [{ $eq: ["$status", MEAL_ORDER_STATUS.EXPIRED] }, 1, 0] } },
          },
        },
      ]),
      MealOrder.aggregate([
        { $match: { ...tokenMatch, paymentStatus: MEAL_PAYMENT_STATUS.PAID } },
        { $group: { _id: "$mealType", count: { $sum: 1 } } },
      ]),
      MealOrder.aggregate([
        { $match: { ...tokenMatch, paymentStatus: MEAL_PAYMENT_STATUS.PAID } },
        { $group: { _id: "$foodItem", sold: { $sum: 1 } } },
        { $sort: { sold: -1, _id: 1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: "foodmenus",
            localField: "_id",
            foreignField: "_id",
            as: "food",
          },
        },
        { $unwind: { path: "$food", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 0,
            foodItemId: { $toString: "$_id" },
            itemName: "$food.itemName",
            category: "$food.category",
            sold: 1,
          },
        },
      ]),
      FoodMenu.aggregate([
        { $match: menuMatch },
        makeMenuSummaryStage(),
      ]),
    ]);

    const overview = overviewRows[0] || {};
    const byMealType = { breakfastTokens: 0, lunchTokens: 0, dinnerTokens: 0 };
    mealTypeRows.forEach((row) => {
      if (row._id === MEAL_TOKEN_TYPES.BREAKFAST) byMealType.breakfastTokens = row.count;
      if (row._id === MEAL_TOKEN_TYPES.LUNCH) byMealType.lunchTokens = row.count;
      if (row._id === MEAL_TOKEN_TYPES.DINNER) byMealType.dinnerTokens = row.count;
    });

    return {
      date: targetDate,
      tokenSummary: {
        totalTokens: overview.totalTokens || 0,
        paidTokens: overview.paidTokens || 0,
        totalAmount: Number(overview.totalAmount || 0),
        consumedTokens: overview.consumedTokens || 0,
        notEatenTokens: overview.notEatenTokens || 0,
        remainingTokens: overview.activeTokens || 0,
        activeTokens: overview.activeTokens || 0,
        cancelledTokens: overview.cancelledTokens || 0,
        expiredTokens: overview.expiredTokens || 0,
        ...byMealType,
      },
      topItems: topItems || [],
      menuSummary: normalizeMenuSummary(menuRows[0]),
    };
  },

  async getDateWiseMealStats(query) {
    await expirePastTokens();
    const toDateKey = normalizeDateKeyInput(query.to, new Date());
    const fromDateKey = normalizeDateKeyInput(
      query.from,
      dateFromDateKey(addDaysToDateKey(toDateKey, -6))
    );
    const match = {
      $expr: {
        $and: [
          { $gte: [dateKeyExpression("validDate"), fromDateKey] },
          { $lte: [dateKeyExpression("validDate"), toDateKey] },
        ],
      },
    };

    const rows = await MealOrder.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$validDate",
              timezone: mealBusinessTimezone,
            },
          },
          totalTokens: { $sum: 1 },
          paidTokens: { $sum: { $cond: [{ $eq: ["$paymentStatus", MEAL_PAYMENT_STATUS.PAID] }, 1, 0] } },
          totalAmount: { $sum: { $cond: [{ $eq: ["$paymentStatus", MEAL_PAYMENT_STATUS.PAID] }, "$amount", 0] } },
          breakfastTokens: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ["$mealType", MEAL_TOKEN_TYPES.BREAKFAST] }, { $eq: ["$paymentStatus", MEAL_PAYMENT_STATUS.PAID] }] },
                1,
                0,
              ],
            },
          },
          lunchTokens: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ["$mealType", MEAL_TOKEN_TYPES.LUNCH] }, { $eq: ["$paymentStatus", MEAL_PAYMENT_STATUS.PAID] }] },
                1,
                0,
              ],
            },
          },
          dinnerTokens: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ["$mealType", MEAL_TOKEN_TYPES.DINNER] }, { $eq: ["$paymentStatus", MEAL_PAYMENT_STATUS.PAID] }] },
                1,
                0,
              ],
            },
          },
          consumedTokens: { $sum: { $cond: [{ $eq: ["$status", MEAL_ORDER_STATUS.CONSUMED] }, 1, 0] } },
          notEatenTokens: { $sum: { $cond: [{ $eq: ["$status", MEAL_ORDER_STATUS.NOT_EATEN] }, 1, 0] } },
          remainingTokens: { $sum: { $cond: [{ $eq: ["$status", MEAL_ORDER_STATUS.ACTIVE] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return {
      range: {
        from: dateFromDateKey(fromDateKey),
        to: endOfUtcDay(dateFromDateKey(toDateKey)),
      },
      items: rows.map((row) => ({
        date: row._id,
        totalTokens: row.totalTokens || 0,
        paidTokens: row.paidTokens || 0,
        totalAmount: Number(row.totalAmount || 0),
        breakfastTokens: row.breakfastTokens || 0,
        lunchTokens: row.lunchTokens || 0,
        dinnerTokens: row.dinnerTokens || 0,
        consumedTokens: row.consumedTokens || 0,
        notEatenTokens: row.notEatenTokens || 0,
        remainingTokens: row.remainingTokens || 0,
      })),
    };
  },

  async getProvostMealReports(query) {
    await expirePastTokens();
    const toDateKey = normalizeDateKeyInput(query.to, new Date());
    const fromDateKey = normalizeDateKeyInput(
      query.from,
      dateFromDateKey(addDaysToDateKey(toDateKey, -6))
    );
    const match = {
      $expr: {
        $and: [
          { $gte: [dateKeyExpression("validDate"), fromDateKey] },
          { $lte: [dateKeyExpression("validDate"), toDateKey] },
        ],
      },
    };
    const groupBy = query.groupBy || "day";

    const [overviewRows, trendRows, paymentRows] = await Promise.all([
      MealOrder.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalTokens: { $sum: 1 },
            totalAmount: { $sum: { $cond: [{ $eq: ["$paymentStatus", MEAL_PAYMENT_STATUS.PAID] }, "$amount", 0] } },
            consumedTokens: { $sum: { $cond: [{ $eq: ["$status", MEAL_ORDER_STATUS.CONSUMED] }, 1, 0] } },
            notEatenTokens: { $sum: { $cond: [{ $eq: ["$status", MEAL_ORDER_STATUS.NOT_EATEN] }, 1, 0] } },
            remainingTokens: { $sum: { $cond: [{ $eq: ["$status", MEAL_ORDER_STATUS.ACTIVE] }, 1, 0] } },
            cancelledTokens: { $sum: { $cond: [{ $eq: ["$status", MEAL_ORDER_STATUS.CANCELLED] }, 1, 0] } },
            paidTokens: { $sum: { $cond: [{ $eq: ["$paymentStatus", MEAL_PAYMENT_STATUS.PAID] }, 1, 0] } },
          },
        },
      ]),
      groupBy === "mealType"
        ? MealOrder.aggregate([
            { $match: match },
            {
              $group: {
                _id: "$mealType",
                totalTokens: { $sum: 1 },
                totalAmount: { $sum: { $cond: [{ $eq: ["$paymentStatus", MEAL_PAYMENT_STATUS.PAID] }, "$amount", 0] } },
                consumedTokens: { $sum: { $cond: [{ $eq: ["$status", MEAL_ORDER_STATUS.CONSUMED] }, 1, 0] } },
              },
            },
            { $sort: { _id: 1 } },
          ])
        : MealOrder.aggregate([
            { $match: match },
            {
              $group: {
                _id: {
                  $dateToString: {
                    format: "%Y-%m-%d",
                    date: "$validDate",
                    timezone: mealBusinessTimezone,
                  },
                },
                totalTokens: { $sum: 1 },
                totalAmount: { $sum: { $cond: [{ $eq: ["$paymentStatus", MEAL_PAYMENT_STATUS.PAID] }, "$amount", 0] } },
                consumedTokens: { $sum: { $cond: [{ $eq: ["$status", MEAL_ORDER_STATUS.CONSUMED] }, 1, 0] } },
              },
            },
            { $sort: { _id: 1 } },
          ]),
      MealOrder.aggregate([
        { $match: match },
        { $group: { _id: "$paymentStatus", count: { $sum: 1 } } },
      ]),
    ]);

    const overview = overviewRows[0] || {};
    return {
      range: {
        from: dateFromDateKey(fromDateKey),
        to: endOfUtcDay(dateFromDateKey(toDateKey)),
      },
      overview: {
        totalTokens: overview.totalTokens || 0,
        totalAmount: Number(overview.totalAmount || 0),
        consumedTokens: overview.consumedTokens || 0,
        notEatenTokens: overview.notEatenTokens || 0,
        remainingTokens: overview.remainingTokens || 0,
        cancelledTokens: overview.cancelledTokens || 0,
        paidTokens: overview.paidTokens || 0,
      },
      paymentBreakdown: paymentRows.map((row) => ({
        status: row._id,
        count: row.count,
      })),
      trend: trendRows.map((row) => ({
        label: row._id || "unknown",
        totalTokens: row.totalTokens || 0,
        totalAmount: Number(row.totalAmount || 0),
        consumedTokens: row.consumedTokens || 0,
      })),
      groupedBy: groupBy,
    };
  },
};

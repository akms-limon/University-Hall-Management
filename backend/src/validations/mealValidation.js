import { z } from "zod";
import { FOOD_CATEGORIES } from "../models/FoodMenu.js";
import { MEAL_ORDER_STATUS, MEAL_PAYMENT_STATUS, MEAL_TOKEN_TYPES } from "../models/MealOrder.js";

const objectIdPattern = /^[0-9a-fA-F]{24}$/;
const categoryEnum = z.enum(Object.values(FOOD_CATEGORIES));
const orderStatusEnum = z.enum(Object.values(MEAL_ORDER_STATUS));
const paymentStatusEnum = z.enum(Object.values(MEAL_PAYMENT_STATUS));
const mealTypeEnum = z.enum(Object.values(MEAL_TOKEN_TYPES));

const requiredTrimmedString = (label, min = 1, max = 1200) =>
  z
    .string()
    .trim()
    .min(min, `${label} must be at least ${min} characters`)
    .max(max, `${label} must be at most ${max} characters`);

const optionalTrimmedString = (label, max = 1200) =>
  z.string().trim().max(max, `${label} must be at most ${max} characters`).optional();

const optionalStringList = (label, maxItems = 40, maxLen = 120) =>
  z
    .array(requiredTrimmedString(label, 1, maxLen))
    .max(maxItems, `${label} cannot exceed ${maxItems} items`)
    .optional();

const booleanFromQuery = z.preprocess((value) => {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return value;
}, z.boolean());

export const mealItemIdParamSchema = z.object({
  params: z.object({
    itemId: z.string().trim().regex(objectIdPattern, "Invalid meal item id"),
  }),
});

export const mealOrderIdParamSchema = z.object({
  params: z.object({
    orderId: z.string().trim().regex(objectIdPattern, "Invalid meal order id"),
  }),
});

export const createMealItemSchema = z.object({
  body: z.object({
    itemName: requiredTrimmedString("Item name", 2, 160),
    category: categoryEnum,
    description: optionalTrimmedString("Description", 2000),
    price: z.coerce.number().min(0, "Price cannot be negative"),
    quantity: z.coerce.number().int().min(0, "Quantity cannot be negative").optional(),
    image: optionalTrimmedString("Image", 1000),
    ingredients: optionalStringList("Ingredient", 50, 160),
    allergens: optionalStringList("Allergen", 50, 160),
    isVegetarian: z.boolean().optional(),
    isVegan: z.boolean().optional(),
    calories: z.coerce.number().int().min(0, "Calories cannot be negative").optional(),
    availableDate: z.coerce.date(),
    isAvailable: z.boolean().optional(),
  }),
});

export const updateMealItemSchema = z.object({
  params: z.object({
    itemId: z.string().trim().regex(objectIdPattern, "Invalid meal item id"),
  }),
  body: z
    .object({
      itemName: optionalTrimmedString("Item name", 160),
      category: categoryEnum.optional(),
      description: optionalTrimmedString("Description", 2000),
      price: z.coerce.number().min(0).optional(),
      quantity: z.coerce.number().int().min(0).optional(),
      image: optionalTrimmedString("Image", 1000),
      ingredients: optionalStringList("Ingredient", 50, 160),
      allergens: optionalStringList("Allergen", 50, 160),
      isVegetarian: z.boolean().optional(),
      isVegan: z.boolean().optional(),
      calories: z.coerce.number().int().min(0).optional(),
      availableDate: z.coerce.date().optional(),
      isAvailable: z.boolean().optional(),
    })
    .refine((value) => Object.keys(value).length > 0, {
      message: "At least one update field is required",
    }),
});

export const updateMealItemAvailabilitySchema = z.object({
  params: z.object({
    itemId: z.string().trim().regex(objectIdPattern, "Invalid meal item id"),
  }),
  body: z.object({
    isAvailable: z.boolean(),
  }),
});

export const listDailyMenuSchema = z.object({
  query: z.object({
    date: z.coerce.date().optional(),
    category: categoryEnum.optional(),
    search: z.string().trim().max(120, "Search query is too long").optional(),
    isVegetarian: booleanFromQuery.optional(),
    isVegan: booleanFromQuery.optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    sortBy: z.enum(["itemName", "price", "soldToday", "category", "createdAt"]).optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
  }),
});

export const listMealItemsForStaffSchema = z.object({
  query: z.object({
    date: z.coerce.date().optional(),
    category: categoryEnum.optional(),
    search: z.string().trim().max(120, "Search query is too long").optional(),
    isAvailable: booleanFromQuery.optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    sortBy: z.enum(["itemName", "price", "soldToday", "category", "createdAt"]).optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
  }),
});

export const createMealOrderSchema = z.object({
  body: z
      .object({
      foodItemId: z.string().trim().regex(objectIdPattern, "Invalid meal item id"),
      validDate: z.coerce.date().optional(),
      deliveryDate: z.coerce.date().optional(),
      specialRequests: optionalTrimmedString("Special requests", 1200),
    })
    .refine((value) => Boolean(value.validDate || value.deliveryDate), {
      message: "Valid date is required",
      path: ["validDate"],
    }),
});

export const listMyMealOrdersSchema = z.object({
  query: z.object({
    status: orderStatusEnum.optional(),
    paymentStatus: paymentStatusEnum.optional(),
    mealType: mealTypeEnum.optional(),
    validDateFrom: z.coerce.date().optional(),
    validDateTo: z.coerce.date().optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    sortBy: z.enum(["orderDate", "validDate", "mealType", "status", "paymentStatus", "amount", "createdAt"]).optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
  }),
});

export const cancelMyMealOrderSchema = z.object({
  params: z.object({
    orderId: z.string().trim().regex(objectIdPattern, "Invalid meal order id"),
  }),
  body: z
    .object({
      cancelledReason: optionalTrimmedString("Cancelled reason", 1200),
    })
    .optional()
    .default({}),
});

export const listMealOrdersForStaffSchema = z.object({
  query: z.object({
    search: z.string().trim().max(120, "Search query is too long").optional(),
    status: orderStatusEnum.optional(),
    paymentStatus: paymentStatusEnum.optional(),
    date: z.coerce.date().optional(),
    mealType: mealTypeEnum.optional(),
    validDateFrom: z.coerce.date().optional(),
    validDateTo: z.coerce.date().optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    sortBy: z.enum(["orderDate", "validDate", "mealType", "status", "paymentStatus", "amount", "createdAt"]).optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
  }),
});

export const updateMealOrderStatusSchema = z.object({
  params: z.object({
    orderId: z.string().trim().regex(objectIdPattern, "Invalid meal order id"),
  }),
  body: z.object({
    status: orderStatusEnum,
    cancelledReason: optionalTrimmedString("Cancelled reason", 1200),
  }),
});

export const staffTodayMealStatsSchema = z.object({
  query: z.object({
    date: z.coerce.date().optional(),
  }),
});

export const staffDateWiseMealStatsSchema = z.object({
  query: z.object({
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  }),
});

export const provostMealReportsSchema = z.object({
  query: z.object({
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    groupBy: z.enum(["day", "mealType"]).optional(),
  }),
});

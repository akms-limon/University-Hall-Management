import { z } from "zod";
import { mealCategoryOptions, mealOrderStatusOptions } from "@/features/meal-management/constants";

const mealCategoryValues = mealCategoryOptions.map((entry) => entry.value);
const mealOrderStatusValues = mealOrderStatusOptions.map((entry) => entry.value);

const requiredTrimmedString = (label, min = 1, max = 1200) =>
  z
    .string()
    .trim()
    .min(min, `${label} must be at least ${min} characters`)
    .max(max, `${label} must be at most ${max} characters`);

const optionalTrimmedString = (label, max = 1200) =>
  z.string().trim().max(max, `${label} must be at most ${max} characters`);

export const mealItemFormSchema = z.object({
  itemName: requiredTrimmedString("Item name", 2, 160),
  category: z.enum(mealCategoryValues, {
    errorMap: () => ({ message: "Category is required" }),
  }),
  description: optionalTrimmedString("Description", 2000),
  price: z.coerce.number().min(0, "Price must be non-negative"),
  image: optionalTrimmedString("Image", 1000),
  ingredientsText: optionalTrimmedString("Ingredients", 2000),
  allergensText: optionalTrimmedString("Allergens", 2000),
  isVegetarian: z.boolean().default(false),
  isVegan: z.boolean().default(false),
  calories: z.coerce.number().int().min(0, "Calories must be non-negative"),
  availableDate: z
    .string()
    .trim()
    .min(1, "Available date is required")
    .refine((value) => !Number.isNaN(Date.parse(value)), "Available date is invalid"),
  isAvailable: z.boolean().default(true),
});

export const mealOrderFormSchema = z.object({
  validDate: z
    .string()
    .trim()
    .min(1, "Valid date is required")
    .refine((value) => !Number.isNaN(Date.parse(value)), "Valid date is invalid"),
  specialRequests: optionalTrimmedString("Special requests", 1200),
});

export const updateMealOrderStatusSchema = z.object({
  status: z.enum(mealOrderStatusValues, {
    errorMap: () => ({ message: "Order status is required" }),
  }),
  cancelledReason: optionalTrimmedString("Cancelled reason", 1200),
});

export const cancelMealOrderSchema = z.object({
  cancelledReason: optionalTrimmedString("Cancelled reason", 1200),
});

function parseTextList(value) {
  return String(value || "")
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function buildMealItemPayload(values) {
  return {
    itemName: values.itemName.trim(),
    category: values.category,
    description: values.description.trim(),
    price: Number(values.price),
    image: values.image.trim(),
    ingredients: parseTextList(values.ingredientsText),
    allergens: parseTextList(values.allergensText),
    isVegetarian: Boolean(values.isVegetarian),
    isVegan: Boolean(values.isVegan),
    calories: Number(values.calories),
    availableDate: values.availableDate,
    isAvailable: Boolean(values.isAvailable),
  };
}

export function buildMealOrderPayload(values, foodItemId) {
  return {
    foodItemId,
    validDate: values.validDate,
    specialRequests: values.specialRequests.trim(),
  };
}

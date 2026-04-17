import mongoose from "mongoose";

export const FOOD_CATEGORIES = {
  BREAKFAST: "breakfast",
  LUNCH: "lunch",
  DINNER: "dinner",
  SNACKS: "snacks",
  EXTRAS: "extras",
};

export const foodCategoryList = Object.values(FOOD_CATEGORIES);

const foodMenuSchema = new mongoose.Schema(
  {
    itemName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
      index: true,
    },
    category: {
      type: String,
      required: true,
      enum: foodCategoryList,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      min: 0,
      default: null,
    },
    soldToday: {
      type: Number,
      min: 0,
      default: 0,
    },
    image: {
      type: String,
      trim: true,
      default: "",
    },
    ingredients: {
      type: [
        {
          type: String,
          trim: true,
          maxlength: 160,
        },
      ],
      default: [],
    },
    allergens: {
      type: [
        {
          type: String,
          trim: true,
          maxlength: 160,
        },
      ],
      default: [],
    },
    isVegetarian: {
      type: Boolean,
      default: false,
      index: true,
    },
    isVegan: {
      type: Boolean,
      default: false,
      index: true,
    },
    calories: {
      type: Number,
      min: 0,
      default: 0,
    },
    availableDate: {
      type: Date,
      required: true,
      index: true,
    },
    isAvailable: {
      type: Boolean,
      default: true,
      index: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

foodMenuSchema.index({
  availableDate: 1,
  category: 1,
  isAvailable: 1,
  isDeleted: 1,
});

export const FoodMenu = mongoose.model("FoodMenu", foodMenuSchema);

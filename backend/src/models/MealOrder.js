import mongoose from "mongoose";

export const MEAL_ORDER_STATUS = {
  ACTIVE: "active",
  CONSUMED: "consumed",
  NOT_EATEN: "not_eaten",
  EXPIRED: "expired",
  CANCELLED: "cancelled",
};

export const mealOrderStatusList = Object.values(MEAL_ORDER_STATUS);

export const MEAL_TOKEN_TYPES = {
  BREAKFAST: "breakfast",
  LUNCH: "lunch",
  DINNER: "dinner",
};

export const mealTokenTypeList = Object.values(MEAL_TOKEN_TYPES);

export const MEAL_PAYMENT_STATUS = {
  PENDING: "pending",
  PAID: "paid",
  FAILED: "failed",
};

export const mealPaymentStatusList = Object.values(MEAL_PAYMENT_STATUS);

const mealOrderSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },
    foodItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FoodMenu",
      required: true,
      index: true,
    },
    mealType: {
      type: String,
      required: true,
      enum: mealTokenTypeList,
      index: true,
    },
    validDate: {
      type: Date,
      required: true,
      index: true,
    },
    tokenCode: {
      type: String,
      required: true,
      trim: true,
      maxlength: 64,
      unique: true,
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    orderDate: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: mealOrderStatusList,
      default: MEAL_ORDER_STATUS.ACTIVE,
      index: true,
    },
    paymentStatus: {
      type: String,
      required: true,
      enum: mealPaymentStatusList,
      default: MEAL_PAYMENT_STATUS.PENDING,
      index: true,
    },
    specialRequests: {
      type: String,
      trim: true,
      maxlength: 1200,
      default: "",
    },
    cancelledReason: {
      type: String,
      trim: true,
      maxlength: 1200,
      default: "",
    },
    consumedAt: {
      type: Date,
      default: null,
      index: true,
    },
    consumedMarkedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    checkedAt: {
      type: Date,
      default: null,
      index: true,
    },
    checkedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    statusUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

mealOrderSchema.index({
  student: 1,
  validDate: -1,
  mealType: 1,
});
mealOrderSchema.index({
  status: 1,
  paymentStatus: 1,
  validDate: -1,
});

export const MealOrder = mongoose.model("MealOrder", mealOrderSchema);

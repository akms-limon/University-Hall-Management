import mongoose from "mongoose";

export const TRANSACTION_STATUS = {
  PENDING: "pending",
  COMPLETED: "completed",
  SUCCESS: "completed",
  FAILED: "failed",
};

export const transactionStatusList = Array.from(new Set(Object.values(TRANSACTION_STATUS)));

export const TRANSACTION_TYPES = {
  DEPOSIT: "deposit",
  MEAL_TOKEN: "meal_token",
  ROOM_FEE: "room_fee",
  FINE: "fine",
  REFUND: "refund",
  ADJUSTMENT: "adjustment",
};

export const transactionTypeList = Object.values(TRANSACTION_TYPES);

export const PAYMENT_METHODS = {
  SSLCOMMERZ: "sslcommerz",
  BKASH: "bkash",
  NAGAD: "nagad",
  ROCKET: "rocket",
  CARD: "card",
  BANK_TRANSFER: "bank_transfer",
  CASH: "cash",
  SYSTEM: "system",
};

export const paymentMethodList = Object.values(PAYMENT_METHODS);

const legacyTypeMap = {
  meal_token_purchase: TRANSACTION_TYPES.MEAL_TOKEN,
  meal_token_refund: TRANSACTION_TYPES.REFUND,
  deposit: TRANSACTION_TYPES.DEPOSIT,
  room_fee: TRANSACTION_TYPES.ROOM_FEE,
  fine: TRANSACTION_TYPES.FINE,
  refund: TRANSACTION_TYPES.REFUND,
  adjustment: TRANSACTION_TYPES.ADJUSTMENT,
};

function normalizeStatus(value) {
  if (!value) return TRANSACTION_STATUS.PENDING;
  const normalized = String(value).trim().toLowerCase();
  if (normalized === "success") return TRANSACTION_STATUS.COMPLETED;
  return transactionStatusList.includes(normalized) ? normalized : TRANSACTION_STATUS.PENDING;
}

function normalizeType(value) {
  if (!value) return TRANSACTION_TYPES.ADJUSTMENT;
  const normalized = String(value).trim().toLowerCase();
  return legacyTypeMap[normalized] || normalized;
}

const transactionSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      default: null,
      index: true,
    },
    mealOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MealOrder",
      default: null,
      index: true,
    },
    transactionType: {
      type: String,
      trim: true,
      enum: transactionTypeList,
      required: true,
      default: TRANSACTION_TYPES.ADJUSTMENT,
      index: true,
    },
    type: {
      type: String,
      trim: true,
      maxlength: 80,
      default: TRANSACTION_TYPES.ADJUSTMENT,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      trim: true,
      maxlength: 12,
      default: "BDT",
    },
    status: {
      type: String,
      required: true,
      enum: transactionStatusList,
      default: TRANSACTION_STATUS.PENDING,
      index: true,
    },
    referenceId: {
      type: String,
      trim: true,
      maxlength: 160,
      default: "",
      index: true,
    },
    paymentMethod: {
      type: String,
      required: true,
      enum: paymentMethodList,
      default: PAYMENT_METHODS.SYSTEM,
      index: true,
    },
    provider: {
      type: String,
      trim: true,
      maxlength: 80,
      default: "internal_wallet",
    },
    providerReference: {
      type: String,
      trim: true,
      maxlength: 160,
      default: "",
    },
    description: {
      type: String,
      trim: true,
      maxlength: 400,
      default: "",
    },
    balanceBefore: {
      type: Number,
      min: 0,
      default: 0,
    },
    balanceAfter: {
      type: Number,
      min: 0,
      default: 0,
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    remarks: {
      type: String,
      trim: true,
      maxlength: 600,
      default: "",
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

transactionSchema.index({
  transactionType: 1,
  type: 1,
  status: 1,
  createdAt: -1,
});

transactionSchema.index({
  student: 1,
  createdAt: -1,
});

transactionSchema.pre("validate", function normalizeTransactionDocument(next) {
  const normalizedType = normalizeType(this.transactionType || this.type);
  this.transactionType = transactionTypeList.includes(normalizedType)
    ? normalizedType
    : TRANSACTION_TYPES.ADJUSTMENT;
  this.type = this.transactionType;
  this.status = normalizeStatus(this.status);

  if (!this.referenceId) {
    this.referenceId = this.providerReference || "";
  }

  if (!this.providerReference && this.referenceId) {
    this.providerReference = this.referenceId;
  }

  next();
});

export const Transaction = mongoose.model("Transaction", transactionSchema);

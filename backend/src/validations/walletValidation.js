import { z } from "zod";
import {
  paymentMethodList,
  transactionStatusList,
  transactionTypeList,
} from "../models/Transaction.js";

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

const transactionTypeEnum = z.enum(transactionTypeList);
const transactionStatusEnum = z.enum(transactionStatusList);
const paymentMethodEnum = z.enum(paymentMethodList);

const optionalTrimmedString = (label, max = 300) =>
  z.string().trim().max(max, `${label} must be at most ${max} characters`).optional();

export const getMyBalanceSchema = z.object({});

export const listMyTransactionsSchema = z.object({
  query: z.object({
    transactionType: transactionTypeEnum.optional(),
    status: transactionStatusEnum.optional(),
    paymentMethod: paymentMethodEnum.optional(),
    search: z.string().trim().max(120, "Search query is too long").optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    sortBy: z.enum(["createdAt", "amount", "transactionType", "status", "paymentMethod"]).optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
  }),
});

export const createDepositRequestSchema = z.object({
  body: z.object({
    amount: z.coerce.number().positive("Amount must be greater than zero").max(500000, "Amount is too high"),
    paymentMethod: paymentMethodEnum,
    remarks: optionalTrimmedString("Remarks", 600),
  }),
});

export const transactionIdParamSchema = z.object({
  params: z.object({
    transactionId: z.string().trim().regex(objectIdPattern, "Invalid transaction id"),
  }),
});

export const diningTodaySummarySchema = z.object({
  query: z.object({
    date: z.coerce.date().optional(),
  }),
});

export const diningDateSummarySchema = z.object({
  query: z.object({
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  }),
});

export const listProvostTransactionsSchema = z.object({
  query: z.object({
    transactionType: transactionTypeEnum.optional(),
    status: transactionStatusEnum.optional(),
    paymentMethod: paymentMethodEnum.optional(),
    studentId: z.string().trim().regex(objectIdPattern, "Invalid student id").optional(),
    search: z.string().trim().max(120, "Search query is too long").optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    sortBy: z.enum(["createdAt", "amount", "transactionType", "status", "paymentMethod"]).optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
  }),
});

export const provostFinancialSummarySchema = z.object({
  query: z.object({
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  }),
});

const callbackStatusEnum = z.enum(["pending", "completed", "success", "failed", "error", "cancelled"]);

export const paymentCallbackSchema = z.object({
  body: z
    .object({
      transactionId: z.string().trim().regex(objectIdPattern, "Invalid transaction id").optional(),
      referenceId: optionalTrimmedString("Reference id", 160),
      providerReference: optionalTrimmedString("Provider reference", 160),
      provider: optionalTrimmedString("Provider", 80),
      status: callbackStatusEnum,
      message: optionalTrimmedString("Message", 400),
      metadata: z.unknown().optional(),
    })
    .refine((value) => Boolean(value.transactionId || value.referenceId || value.providerReference), {
      message: "transactionId, referenceId or providerReference is required",
      path: ["transactionId"],
    }),
});


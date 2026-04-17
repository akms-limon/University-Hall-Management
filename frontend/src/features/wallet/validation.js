import { z } from "zod";
import { paymentMethodOptions } from "@/features/wallet/constants";

const paymentMethodValues = paymentMethodOptions.map((entry) => entry.value);

export const depositRequestSchema = z.object({
  amount: z.coerce.number().positive("Amount must be greater than zero").max(500000, "Amount is too high"),
  paymentMethod: z.enum(paymentMethodValues, {
    errorMap: () => ({ message: "Payment method is required" }),
  }),
  remarks: z.string().trim().max(600, "Remarks can be at most 600 characters").optional().default(""),
});

export function buildDepositPayload(values) {
  return {
    amount: Number(values.amount),
    paymentMethod: values.paymentMethod,
    remarks: String(values.remarks || "").trim(),
  };
}


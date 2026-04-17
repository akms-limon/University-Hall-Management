import { z } from "zod";

const periodEnum = z.enum(["today", "week", "month", "custom"]);

const baseDateRangeSchema = z.object({
  period: periodEnum.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

const dateRangeSchema = baseDateRangeSchema
  .refine(
    (value) => !value.from || !value.to || value.from.getTime() <= value.to.getTime(),
    {
      message: "'from' date must be before or equal to 'to' date",
      path: ["from"],
    }
  );

export const provostAnalyticsSummarySchema = z.object({
  query: dateRangeSchema,
});

export const staffDiningAnalyticsSchema = z.object({
  query: baseDateRangeSchema
    .extend({
      date: z.coerce.date().optional(),
    })
    .refine(
      (value) => !value.from || !value.to || value.from.getTime() <= value.to.getTime(),
      {
        message: "'from' date must be before or equal to 'to' date",
        path: ["from"],
      }
    ),
});

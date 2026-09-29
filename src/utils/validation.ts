import { z } from "zod";

import {
  EXPENSE_CATEGORIES,
  FEED_UNITS,
  PIG_BATCH_STATUSES,
  SALE_PRICING_MODES,
} from "../constants/categories";
import { BackupData } from "../types/models";
import { isValidISODateString } from "./dates";

const requiredString = (message: string) => z.string().trim().min(1, message);
const dateString = (message: string) =>
  requiredString(message).refine((value) => value.length === 0 || isValidISODateString(value), {
    message: "Use a real date in YYYY-MM-DD format",
  });
const optionalPositiveNumber = z.preprocess(
  (value) => {
    if (value === "" || value === null || value === undefined) {
      return undefined;
    }
    return Number(value);
  },
  z.number({ error: "Must be a number" }).positive("Must be greater than 0").optional()
);
const optionalNumber = z.preprocess(
  (value) => {
    if (value === "" || value === null || value === undefined) {
      return undefined;
    }
    return Number(value);
  },
  z.number({ error: "Must be a number" }).optional()
);

export const pigBatchSchema = z.object({
  name: requiredString("Batch name is required"),
  purchaseDate: dateString("Purchase date is required"),
  initialQuantity: z.coerce.number({ error: "Initial quantity is required" }).positive("Must be greater than 0"),
  purchasePricePerPig: z.coerce.number({ error: "Purchase price is required" }).min(0, "Must be 0 or greater"),
  startingWeightPerPigKg: optionalPositiveNumber,
  supplierName: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(PIG_BATCH_STATUSES),
});

export const feedPurchaseSchema = z.object({
  feedType: requiredString("Feed type is required"),
  quantity: z.coerce.number({ error: "Quantity is required" }).positive("Must be greater than 0"),
  unit: z.enum(FEED_UNITS),
  costPerUnit: z.coerce.number({ error: "Cost per unit is required" }).min(0, "Must be 0 or greater"),
  supplierName: z.string().optional(),
  purchaseDate: dateString("Purchase date is required"),
  notes: z.string().optional(),
});

export const feedUsageSchema = z.object({
  batchId: requiredString("Batch is required"),
  feedType: requiredString("Feed type is required"),
  quantityUsed: z.coerce.number({ error: "Quantity used is required" }).positive("Must be greater than 0"),
  unit: z.enum(FEED_UNITS),
  usageDate: dateString("Usage date is required"),
  notes: z.string().optional(),
});

export const expenseSchema = z.object({
  category: z.enum(EXPENSE_CATEGORIES),
  amount: z.coerce.number({ error: "Amount is required" }).positive("Must be greater than 0"),
  expenseDate: dateString("Expense date is required"),
  batchId: z.string().optional(),
  notes: z.string().optional(),
});

export const saleSchema = z
  .object({
    batchId: requiredString("Batch is required"),
    quantitySold: z.coerce.number({ error: "Quantity sold is required" }).positive("Must be greater than 0"),
    pricingMode: z.enum(SALE_PRICING_MODES),
    totalWeightKg: optionalPositiveNumber,
    pricePerKg: optionalPositiveNumber,
    totalRevenue: optionalNumber,
    buyerName: z.string().optional(),
    saleDate: dateString("Sale date is required"),
    notes: z.string().optional(),
  })
  .superRefine((value, context) => {
    if (value.pricingMode === "by_weight") {
      if (!value.totalWeightKg || value.totalWeightKg <= 0) {
        context.addIssue({
          code: "custom",
          message: "Total weight is required",
          path: ["totalWeightKg"],
        });
      }

      if (!value.pricePerKg || value.pricePerKg <= 0) {
        context.addIssue({
          code: "custom",
          message: "Price per kg is required",
          path: ["pricePerKg"],
        });
      }
    }

    if (value.pricingMode === "fixed_total" && (!value.totalRevenue || value.totalRevenue <= 0)) {
      context.addIssue({
        code: "custom",
        message: "Total revenue is required",
        path: ["totalRevenue"],
      });
    }
  });

export const mortalityRecordSchema = z.object({
  batchId: requiredString("Batch is required"),
  quantityLost: z.coerce.number({ error: "Quantity lost is required" }).positive("Must be greater than 0"),
  lossDate: dateString("Loss date is required"),
  reason: z.string().optional(),
  notes: z.string().optional(),
});

const persistedMetadataSchema = z.object({
  id: requiredString("ID is required"),
  createdAt: requiredString("Created date is required"),
  updatedAt: requiredString("Updated date is required"),
});

export const pigBatchRecordSchema = pigBatchSchema.merge(persistedMetadataSchema);
export const feedPurchaseRecordSchema = feedPurchaseSchema.merge(persistedMetadataSchema);
export const feedUsageRecordSchema = feedUsageSchema.merge(persistedMetadataSchema);
export const expenseRecordSchema = expenseSchema.merge(persistedMetadataSchema);
export const saleRecordSchema = z
  .object({
    batchId: requiredString("Batch is required"),
    quantitySold: z.coerce.number({ error: "Quantity sold is required" }).positive("Must be greater than 0"),
    pricingMode: z.enum(SALE_PRICING_MODES),
    totalWeightKg: optionalPositiveNumber,
    pricePerKg: optionalPositiveNumber,
    totalRevenue: z.coerce.number({ error: "Total revenue is required" }).min(0, "Must be 0 or greater"),
    buyerName: z.string().optional(),
    saleDate: dateString("Sale date is required"),
    notes: z.string().optional(),
  })
  .merge(persistedMetadataSchema)
  .superRefine((value, context) => {
    if (value.pricingMode === "by_weight") {
      if (!value.totalWeightKg || value.totalWeightKg <= 0) {
        context.addIssue({
          code: "custom",
          message: "Total weight is required",
          path: ["totalWeightKg"],
        });
      }

      if (!value.pricePerKg || value.pricePerKg <= 0) {
        context.addIssue({
          code: "custom",
          message: "Price per kg is required",
          path: ["pricePerKg"],
        });
      }
    }

    if (value.pricingMode === "fixed_total" && value.totalRevenue <= 0) {
      context.addIssue({
        code: "custom",
        message: "Total revenue is required",
        path: ["totalRevenue"],
      });
    }
  });
export const mortalityRecordBackupSchema = mortalityRecordSchema.merge(persistedMetadataSchema);

export const backupDataSchema = z.object({
  pigBatches: z.array(pigBatchRecordSchema),
  feedPurchases: z.array(feedPurchaseRecordSchema),
  feedUsages: z.array(feedUsageRecordSchema),
  expenses: z.array(expenseRecordSchema),
  sales: z.array(saleRecordSchema),
  mortalityRecords: z.array(mortalityRecordBackupSchema),
}) satisfies z.ZodType<BackupData>;

export type PigBatchFormValues = z.infer<typeof pigBatchSchema>;
export type FeedPurchaseFormValues = z.infer<typeof feedPurchaseSchema>;
export type FeedUsageFormValues = z.infer<typeof feedUsageSchema>;
export type ExpenseFormValues = z.infer<typeof expenseSchema>;
export type SaleFormValues = z.infer<typeof saleSchema>;
export type MortalityRecordFormValues = z.infer<typeof mortalityRecordSchema>;

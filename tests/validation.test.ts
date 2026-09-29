import assert from "node:assert/strict";
import test from "node:test";

import { createSampleData } from "../src/constants/sampleData";
import {
  backupDataSchema,
  expenseSchema,
  feedUsageSchema,
  mortalityRecordSchema,
  pigBatchSchema,
  saleSchema,
} from "../src/utils/validation";

function issuePaths(result: ReturnType<typeof saleSchema.safeParse>): string[] {
  if (result.success) {
    return [];
  }

  return result.error.issues.map((issue) => issue.path.join("."));
}

test("pig batch validation coerces numeric fields and trims required names", () => {
  const result = pigBatchSchema.safeParse({
    name: " Batch 2026-001 ",
    purchaseDate: "2026-05-01",
    initialQuantity: "12",
    purchasePricePerPig: "3500",
    startingWeightPerPigKg: "",
    supplierName: "",
    notes: "",
    status: "active",
  });

  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.initialQuantity, 12);
    assert.equal(result.data.purchasePricePerPig, 3500);
    assert.equal(result.data.startingWeightPerPigKg, undefined);
  }
});

test("sale validation requires weight and price when pricing by weight", () => {
  const result = saleSchema.safeParse({
    batchId: "batch-a",
    quantitySold: 2,
    pricingMode: "by_weight",
    totalWeightKg: "",
    pricePerKg: "",
    totalRevenue: "",
    buyerName: "",
    saleDate: "2026-08-01",
    notes: "",
  });

  assert.equal(result.success, false);
  assert.deepEqual(issuePaths(result).sort(), ["pricePerKg", "totalWeightKg"]);
});

test("sale validation accepts weight-based sale values and derives typed numbers", () => {
  const result = saleSchema.safeParse({
    batchId: "batch-a",
    quantitySold: "2",
    pricingMode: "by_weight",
    totalWeightKg: "180",
    pricePerKg: "190",
    totalRevenue: "",
    buyerName: "Local Meat Shop",
    saleDate: "2026-08-01",
    notes: "",
  });

  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.quantitySold, 2);
    assert.equal(result.data.totalWeightKg, 180);
    assert.equal(result.data.pricePerKg, 190);
    assert.equal(result.data.totalRevenue, undefined);
  }
});

test("sale validation requires total revenue when using fixed total pricing", () => {
  const result = saleSchema.safeParse({
    batchId: "batch-a",
    quantitySold: 2,
    pricingMode: "fixed_total",
    totalWeightKg: "",
    pricePerKg: "",
    totalRevenue: "",
    buyerName: "",
    saleDate: "2026-08-01",
    notes: "",
  });

  assert.equal(result.success, false);
  assert.deepEqual(issuePaths(result), ["totalRevenue"]);
});

test("sale validation accepts fixed total pricing without weight fields", () => {
  const result = saleSchema.safeParse({
    batchId: "batch-a",
    quantitySold: "2",
    pricingMode: "fixed_total",
    totalWeightKg: "",
    pricePerKg: "",
    totalRevenue: "34200",
    buyerName: "",
    saleDate: "2026-08-01",
    notes: "",
  });

  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.totalRevenue, 34200);
    assert.equal(result.data.totalWeightKg, undefined);
    assert.equal(result.data.pricePerKg, undefined);
  }
});

test("form validation rejects malformed and impossible calendar dates", () => {
  const saleResult = saleSchema.safeParse({
    batchId: "batch-a",
    quantitySold: "2",
    pricingMode: "fixed_total",
    totalWeightKg: "",
    pricePerKg: "",
    totalRevenue: "34200",
    buyerName: "",
    saleDate: "2026-02-30",
    notes: "",
  });
  const batchResult = pigBatchSchema.safeParse({
    name: "Batch 2026-001",
    purchaseDate: "2026-5-1",
    initialQuantity: "12",
    purchasePricePerPig: "3500",
    startingWeightPerPigKg: "",
    supplierName: "",
    notes: "",
    status: "active",
  });

  assert.equal(saleResult.success, false);
  assert.equal(batchResult.success, false);
  if (!saleResult.success) {
    assert.deepEqual(issuePaths(saleResult), ["saleDate"]);
  }
  if (!batchResult.success) {
    assert.deepEqual(batchResult.error.issues.map((issue) => issue.path.join(".")), ["purchaseDate"]);
  }
});

test("feed usage validation requires a batch and positive quantity", () => {
  const result = feedUsageSchema.safeParse({
    batchId: "",
    feedType: "Starter Feed",
    quantityUsed: "0",
    unit: "sack",
    usageDate: "2026-05-15",
    notes: "",
  });

  assert.equal(result.success, false);
  if (!result.success) {
    assert.deepEqual(
      result.error.issues.map((issue) => issue.path.join(".")).sort(),
      ["batchId", "quantityUsed"]
    );
  }
});

test("expense validation rejects non-positive amounts", () => {
  const result = expenseSchema.safeParse({
    category: "medicine",
    amount: "0",
    expenseDate: "2026-05-10",
    batchId: "",
    notes: "",
  });

  assert.equal(result.success, false);
  if (!result.success) {
    assert.deepEqual(result.error.issues.map((issue) => issue.path.join(".")), ["amount"]);
  }
});

test("mortality validation requires a batch and positive loss quantity", () => {
  const result = mortalityRecordSchema.safeParse({
    batchId: "",
    quantityLost: "0",
    lossDate: "2026-05-20",
    reason: "",
    notes: "",
  });

  assert.equal(result.success, false);
  if (!result.success) {
    assert.deepEqual(
      result.error.issues.map((issue) => issue.path.join(".")).sort(),
      ["batchId", "quantityLost"]
    );
  }
});

test("backup validation accepts complete exported data and rejects malformed records", () => {
  const sampleData = createSampleData();
  const validResult = backupDataSchema.safeParse(sampleData);

  assert.equal(validResult.success, true);

  const invalidResult = backupDataSchema.safeParse({
    ...sampleData,
    sales: [
      {
        ...sampleData.sales[0],
        quantitySold: 0,
      },
    ],
  });

  assert.equal(invalidResult.success, false);
  if (!invalidResult.success) {
    assert.equal(invalidResult.error.issues[0]?.path.join("."), "sales.0.quantitySold");
  }
});

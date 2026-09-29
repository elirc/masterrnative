import assert from "node:assert/strict";
import test from "node:test";

import { auditDataQuality } from "../src/utils/audit";
import type { BackupData, Expense, FeedPurchase, FeedUsage, MortalityRecord, PigBatch, Sale } from "../src/types/models";

const now = "2026-05-01T00:00:00.000Z";

function makeBatch(overrides: Partial<PigBatch> = {}): PigBatch {
  return {
    id: "batch-a",
    name: "Batch A",
    purchaseDate: "2026-05-01",
    initialQuantity: 10,
    purchasePricePerPig: 1000,
    status: "active",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeSale(overrides: Partial<Sale> = {}): Sale {
  return {
    id: "sale-a",
    batchId: "batch-a",
    quantitySold: 1,
    pricingMode: "fixed_total",
    totalRevenue: 5000,
    saleDate: "2026-05-10",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeFeedUsage(overrides: Partial<FeedUsage> = {}): FeedUsage {
  return {
    id: "feed-usage-a",
    batchId: "batch-a",
    feedType: "Starter Feed",
    quantityUsed: 2,
    unit: "sack",
    usageDate: "2026-05-03",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeExpense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: "expense-a",
    category: "medicine",
    amount: 1000,
    expenseDate: "2026-05-12",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeMortalityRecord(overrides: Partial<MortalityRecord> = {}): MortalityRecord {
  return {
    id: "mortality-a",
    batchId: "batch-a",
    quantityLost: 1,
    lossDate: "2026-05-11",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeFeedPurchase(overrides: Partial<FeedPurchase> = {}): FeedPurchase {
  return {
    id: "feed-purchase-a",
    feedType: "Starter Feed",
    quantity: 5,
    unit: "sack",
    costPerUnit: 1200,
    purchaseDate: "2026-05-02",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeData(overrides: Partial<BackupData> = {}): BackupData {
  return {
    pigBatches: [makeBatch()],
    feedPurchases: [],
    feedUsages: [],
    expenses: [],
    sales: [],
    mortalityRecords: [],
    ...overrides,
  };
}

test("audit passes clean data with no issues", () => {
  const result = auditDataQuality(
    makeData({
      feedPurchases: [makeFeedPurchase({ quantity: 5 })],
      feedUsages: [makeFeedUsage({ quantityUsed: 3 })],
      expenses: [makeExpense({ batchId: undefined })],
      sales: [makeSale({ quantitySold: 2 })],
      mortalityRecords: [makeMortalityRecord({ quantityLost: 1 })],
    })
  );

  assert.equal(result.hasIssues, false);
  assert.equal(result.summary.totalIssues, 0);
  assert.equal(result.summary.checkedRecords, 6);
});

test("audit detects orphan records that reference missing batches", () => {
  const result = auditDataQuality(
    makeData({
      feedPurchases: [makeFeedPurchase({ quantity: 5 })],
      sales: [makeSale({ id: "sale-orphan", batchId: "missing-batch" })],
      feedUsages: [makeFeedUsage({ id: "usage-orphan", batchId: "missing-batch" })],
      expenses: [
        makeExpense({ id: "expense-general", batchId: undefined }),
        makeExpense({ id: "expense-orphan", batchId: "missing-batch" }),
      ],
      mortalityRecords: [makeMortalityRecord({ id: "mortality-orphan", batchId: "missing-batch" })],
    })
  );

  assert.equal(result.summary.orphanRecords, 4);
  assert.equal(result.summary.errors, 4);
  assert.deepEqual(
    result.issues.map((issue) => issue.id).sort(),
    [
      "orphan_record:expenses:expense-orphan",
      "orphan_record:feedUsages:usage-orphan",
      "orphan_record:mortalityRecords:mortality-orphan",
      "orphan_record:sales:sale-orphan",
    ]
  );
});

test("audit detects overdrawn batches even though UI current quantity is clamped", () => {
  const result = auditDataQuality(
    makeData({
      pigBatches: [makeBatch({ initialQuantity: 5 })],
      sales: [makeSale({ quantitySold: 4 })],
      mortalityRecords: [makeMortalityRecord({ quantityLost: 3 })],
    })
  );

  assert.equal(result.summary.overdrawnBatches, 1);
  assert.equal(result.issues[0]?.type, "overdrawn_batch");
  assert.match(result.issues[0]?.details.join(" "), /Overage: 2/);
});

test("audit detects negative feed inventory by feed type and unit", () => {
  const result = auditDataQuality(
    makeData({
      feedPurchases: [makeFeedPurchase({ feedType: "Starter Feed", quantity: 2, unit: "sack" })],
      feedUsages: [makeFeedUsage({ feedType: " starter feed ", quantityUsed: 5, unit: "sack" })],
    })
  );

  assert.equal(result.summary.negativeInventoryItems, 1);
  assert.equal(result.summary.warnings, 1);
  assert.equal(result.issues[0]?.type, "negative_feed_inventory");
  assert.match(result.issues[0]?.message ?? "", /5 sack used, but only 2 sack purchased/);
});

test("audit detects duplicate ids across every record collection", () => {
  const result = auditDataQuality(
    makeData({
      pigBatches: [makeBatch({ id: "shared-id" })],
      sales: [makeSale({ id: "shared-id", batchId: "shared-id" })],
      feedPurchases: [makeFeedPurchase({ id: "unique-feed-purchase" })],
    })
  );

  assert.equal(result.summary.duplicateIds, 1);
  assert.equal(result.summary.errors, 1);
  assert.equal(result.issues[0]?.id, "duplicate_id:shared-id");
  assert.deepEqual(
    result.issues[0]?.records.map((record) => record.collection).sort(),
    ["pigBatches", "sales"]
  );
});

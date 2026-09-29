import assert from "node:assert/strict";
import test from "node:test";

import {
  getBatchActivityTimeline,
  getBatchBreakEvenAnalysis,
  getBatchCurrentQuantity,
  getBatchEstimatedProfit,
  getBatchFeedUsageCost,
  getBatchLifecycleSummary,
  getBatchTotalInvestedCost,
  getEstimatedNetProfit,
  getExpenseTotalsByCategory,
  getFeedInventorySummary,
  getInventoryHealth,
  getTotalExpenses,
  getTotalFeedPurchaseCost,
  getTotalPigPurchaseCost,
  getTotalRevenue,
} from "../src/utils/calculations";
import { EXPENSE_CATEGORIES } from "../src/constants/categories";
import type { Expense, FeedPurchase, FeedUsage, MortalityRecord, PigBatch, Sale } from "../src/types/models";

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

function makeFeedPurchase(overrides: Partial<FeedPurchase> = {}): FeedPurchase {
  return {
    id: "feed-purchase-a",
    feedType: "Starter Feed",
    quantity: 10,
    unit: "sack",
    costPerUnit: 1200,
    purchaseDate: "2026-05-02",
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

test("batch current quantity subtracts sales and mortality for the same batch", () => {
  const batch = makeBatch({ initialQuantity: 12 });
  const sales = [
    makeSale({ id: "sale-a", quantitySold: 3 }),
    makeSale({ id: "sale-other", batchId: "batch-b", quantitySold: 99 }),
  ];
  const mortalityRecords = [
    makeMortalityRecord({ id: "mortality-a", quantityLost: 2 }),
    makeMortalityRecord({ id: "mortality-other", batchId: "batch-b", quantityLost: 99 }),
  ];

  assert.equal(getBatchCurrentQuantity(batch, sales, mortalityRecords), 7);
});

test("batch current quantity never drops below zero", () => {
  const batch = makeBatch({ initialQuantity: 4 });
  const sales = [makeSale({ quantitySold: 10 })];
  const mortalityRecords = [makeMortalityRecord({ quantityLost: 2 })];

  assert.equal(getBatchCurrentQuantity(batch, sales, mortalityRecords), 0);
});

test("global financial totals combine pig cost, feed cost, expenses, and revenue", () => {
  const batches = [
    makeBatch({ id: "batch-a", initialQuantity: 10, purchasePricePerPig: 1000 }),
    makeBatch({ id: "batch-b", initialQuantity: 5, purchasePricePerPig: 2000 }),
  ];
  const feedPurchases = [
    makeFeedPurchase({ quantity: 2, costPerUnit: 1500 }),
    makeFeedPurchase({ id: "feed-purchase-b", quantity: 1, costPerUnit: 800 }),
  ];
  const expenses = [makeExpense({ amount: 700 }), makeExpense({ id: "expense-b", amount: 300 })];
  const sales = [makeSale({ totalRevenue: 12000 }), makeSale({ id: "sale-b", totalRevenue: 9000 })];

  assert.equal(getTotalPigPurchaseCost(batches), 20000);
  assert.equal(getTotalFeedPurchaseCost(feedPurchases), 3800);
  assert.equal(getTotalExpenses(batches, feedPurchases, expenses), 24800);
  assert.equal(getTotalRevenue(sales), 21000);
  assert.equal(getEstimatedNetProfit(batches, feedPurchases, expenses, sales), -3800);
});

test("batch estimated profit uses the selected batch revenue and batch-specific expenses", () => {
  const batch = makeBatch({ id: "batch-a", initialQuantity: 10, purchasePricePerPig: 1000 });
  const sales = [
    makeSale({ id: "sale-a", batchId: "batch-a", totalRevenue: 16000 }),
    makeSale({ id: "sale-b", batchId: "batch-b", totalRevenue: 99999 }),
  ];
  const expenses = [
    makeExpense({ id: "expense-a", batchId: "batch-a", amount: 1200 }),
    makeExpense({ id: "expense-b", batchId: "batch-b", amount: 99999 }),
    makeExpense({ id: "expense-general", batchId: undefined, amount: 99999 }),
  ];

  assert.equal(getBatchEstimatedProfit(batch, sales, expenses, []), 4800);
});

test("batch estimated profit can include allocated feed usage cost", () => {
  const batch = makeBatch({ id: "batch-a", initialQuantity: 10, purchasePricePerPig: 1000 });
  const sales = [makeSale({ totalRevenue: 20000 })];
  const expenses = [makeExpense({ batchId: "batch-a", amount: 1200 })];
  const feedPurchases = [
    makeFeedPurchase({ feedType: "Starter Feed", quantity: 10, unit: "sack", costPerUnit: 1000 }),
    makeFeedPurchase({ id: "feed-purchase-b", feedType: "Starter Feed", quantity: 10, unit: "sack", costPerUnit: 1500 }),
  ];
  const feedUsages = [makeFeedUsage({ batchId: "batch-a", feedType: "Starter Feed", unit: "sack", quantityUsed: 4 })];

  assert.equal(getBatchFeedUsageCost("batch-a", feedPurchases, feedUsages), 5000);
  assert.equal(getBatchEstimatedProfit(batch, sales, expenses, [], feedPurchases, feedUsages), 3800);
});

test("batch activity timeline combines all batch records in descending date order", () => {
  const feedPurchases = [
    makeFeedPurchase({ feedType: "Starter Feed", quantity: 10, unit: "sack", costPerUnit: 1000 }),
  ];
  const timeline = getBatchActivityTimeline(
    "batch-a",
    [
      makeSale({
        id: "sale-a",
        batchId: "batch-a",
        buyerName: "Local Market",
        quantitySold: 2,
        saleDate: "2026-05-09",
        totalRevenue: 8000,
      }),
      makeSale({ id: "sale-other", batchId: "batch-b", saleDate: "2026-05-20" }),
    ],
    [
      makeFeedUsage({
        id: "feed-usage-a",
        batchId: "batch-a",
        feedType: "Starter Feed",
        quantityUsed: 2,
        unit: "sack",
        usageDate: "2026-05-11",
      }),
    ],
    [
      makeExpense({
        id: "expense-a",
        batchId: "batch-a",
        category: "medicine",
        amount: 750,
        notes: "Deworming",
        expenseDate: "2026-05-10",
      }),
    ],
    [
      makeMortalityRecord({
        id: "mortality-a",
        batchId: "batch-a",
        quantityLost: 1,
        reason: "Illness",
        lossDate: "2026-05-12",
      }),
    ],
    feedPurchases
  );

  assert.deepEqual(
    timeline.map((item) => item.kind),
    ["mortality", "feed_usage", "expense", "sale"]
  );
  assert.deepEqual(timeline[0], {
    id: "mortality-a",
    kind: "mortality",
    date: "2026-05-12",
    label: "1 pig lost",
    detail: "Illness",
  });
  assert.deepEqual(timeline[1], {
    id: "feed-usage-a",
    kind: "feed_usage",
    date: "2026-05-11",
    label: "Feed used: Starter Feed",
    detail: "2 sack",
    amount: 2000,
    amountKind: "cost",
  });
  assert.deepEqual(timeline[2], {
    id: "expense-a",
    kind: "expense",
    date: "2026-05-10",
    label: "Medicine expense",
    detail: "Deworming",
    amount: 750,
    amountKind: "cost",
  });
  assert.deepEqual(timeline[3], {
    id: "sale-a",
    kind: "sale",
    date: "2026-05-09",
    label: "2 pigs sold",
    detail: "Buyer: Local Market",
    amount: 8000,
    amountKind: "revenue",
  });
});

test("batch break-even analysis includes pig cost, batch expenses, feed usage cost, and remaining pigs", () => {
  const batch = makeBatch({ initialQuantity: 10, purchasePricePerPig: 1000 });
  const sales = [makeSale({ quantitySold: 2, totalRevenue: 6500 })];
  const expenses = [
    makeExpense({ batchId: "batch-a", amount: 1500 }),
    makeExpense({ id: "expense-other", batchId: "batch-b", amount: 99999 }),
  ];
  const mortalityRecords = [makeMortalityRecord({ quantityLost: 1 })];
  const feedPurchases = [
    makeFeedPurchase({ feedType: "Starter Feed", quantity: 10, unit: "sack", costPerUnit: 1000 }),
  ];
  const feedUsages = [makeFeedUsage({ feedType: "Starter Feed", unit: "sack", quantityUsed: 2 })];

  assert.equal(getBatchTotalInvestedCost(batch, expenses, feedPurchases, feedUsages), 13500);
  assert.deepEqual(
    getBatchBreakEvenAnalysis(batch, sales, expenses, mortalityRecords, feedPurchases, feedUsages),
    {
      initialPigCost: 10000,
      batchExpenseCost: 1500,
      feedUsageCost: 2000,
      totalInvestedCost: 13500,
      revenueToDate: 6500,
      currentQuantity: 7,
      remainingRevenueNeeded: 7000,
      breakEvenRevenuePerRemainingPig: 1000,
      isBreakEvenReached: false,
    }
  );
});

test("batch lifecycle summary derives sold out status when no pigs remain", () => {
  const batch = makeBatch({ initialQuantity: 3, status: "active" });
  const sales = [makeSale({ quantitySold: 2 })];
  const mortalityRecords = [makeMortalityRecord({ quantityLost: 1 })];

  assert.deepEqual(getBatchLifecycleSummary(batch, sales, mortalityRecords), {
    currentQuantity: 0,
    soldQuantity: 2,
    lostQuantity: 1,
    derivedStatus: "sold_out",
    statusLabel: "Sold Out",
    message: "No pigs remain in this batch.",
  });
});

test("expense totals return every category and sum only matching expenses", () => {
  const totals = getExpenseTotalsByCategory([
    makeExpense({ category: "medicine", amount: 500 }),
    makeExpense({ id: "expense-b", category: "medicine", amount: 300 }),
    makeExpense({ id: "expense-c", category: "labor", amount: 2000 }),
  ]);

  assert.deepEqual(
    EXPENSE_CATEGORIES.filter((category) => totals[category] === 0),
    EXPENSE_CATEGORIES.filter((category) => category !== "medicine" && category !== "labor")
  );
  assert.equal(totals.medicine, 800);
  assert.equal(totals.labor, 2000);
});

test("feed inventory groups trimmed feed type case-insensitively while keeping units separate", () => {
  const inventory = getFeedInventorySummary(
    [
      makeFeedPurchase({ feedType: "Starter Feed", unit: "sack", quantity: 10, costPerUnit: 1200 }),
      makeFeedPurchase({ id: "feed-purchase-b", feedType: " starter feed ", unit: "sack", quantity: 5, costPerUnit: 1000 }),
      makeFeedPurchase({ id: "feed-purchase-c", feedType: "Starter Feed", unit: "kg", quantity: 40, costPerUnit: 55 }),
    ],
    [
      makeFeedUsage({ feedType: "STARTER FEED", unit: "sack", quantityUsed: 3 }),
      makeFeedUsage({ id: "feed-usage-b", feedType: "Starter Feed", unit: "kg", quantityUsed: 12 }),
      makeFeedUsage({ id: "feed-usage-c", feedType: "Finisher", unit: "sack", quantityUsed: 2 }),
    ]
  );

  const starterSacks = inventory.find((item) => item.feedType === "Starter Feed" && item.unit === "sack");
  const starterKg = inventory.find((item) => item.feedType === "Starter Feed" && item.unit === "kg");
  const finisher = inventory.find((item) => item.feedType === "Finisher" && item.unit === "sack");

  assert.deepEqual(starterSacks, {
    feedType: "Starter Feed",
    unit: "sack",
    purchasedQuantity: 15,
    usedQuantity: 3,
    remainingQuantity: 12,
    totalPurchaseCost: 17000,
    averageCostPerUnit: 17000 / 15,
    remainingValue: 12 * (17000 / 15),
  });
  assert.deepEqual(starterKg, {
    feedType: "Starter Feed",
    unit: "kg",
    purchasedQuantity: 40,
    usedQuantity: 12,
    remainingQuantity: 28,
    totalPurchaseCost: 2200,
    averageCostPerUnit: 55,
    remainingValue: 1540,
  });
  assert.deepEqual(finisher, {
    feedType: "Finisher",
    unit: "sack",
    purchasedQuantity: 0,
    usedQuantity: 2,
    remainingQuantity: -2,
    totalPurchaseCost: 0,
    averageCostPerUnit: 0,
    remainingValue: 0,
  });
  assert.equal(starterSacks ? getInventoryHealth(starterSacks) : undefined, "healthy");
  assert.equal(finisher ? getInventoryHealth(finisher) : undefined, "negative");
});

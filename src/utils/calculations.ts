import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABELS } from "../constants/categories";
import {
  Expense,
  ExpenseCategory,
  FeedPurchase,
  FeedUnit,
  FeedUsage,
  MortalityRecord,
  PigBatch,
  Sale,
} from "../types/models";

export interface FeedInventoryItem {
  feedType: string;
  unit: FeedUnit;
  purchasedQuantity: number;
  usedQuantity: number;
  remainingQuantity: number;
  totalPurchaseCost: number;
  averageCostPerUnit: number;
  remainingValue: number;
}

export type InventoryHealth = "healthy" | "low" | "empty" | "negative";

export interface BatchLifecycleSummary {
  currentQuantity: number;
  soldQuantity: number;
  lostQuantity: number;
  derivedStatus: PigBatch["status"];
  statusLabel: string;
  message: string;
}

export type BatchActivityTimelineKind = "sale" | "feed_usage" | "expense" | "mortality";

export type BatchActivityAmountKind = "revenue" | "cost";

export interface BatchActivityTimelineItem {
  id: string;
  kind: BatchActivityTimelineKind;
  date: string;
  label: string;
  detail: string;
  amount?: number;
  amountKind?: BatchActivityAmountKind;
}

export interface BatchBreakEvenAnalysis {
  initialPigCost: number;
  batchExpenseCost: number;
  feedUsageCost: number;
  totalInvestedCost: number;
  revenueToDate: number;
  currentQuantity: number;
  remainingRevenueNeeded: number;
  breakEvenRevenuePerRemainingPig: number | null;
  isBreakEvenReached: boolean;
}

function getFeedInventoryKey(feedType: string, unit: FeedUnit): string {
  return `${feedType.trim().toLowerCase()}::${unit}`;
}

function formatPigCount(quantity: number): string {
  return `${quantity} ${quantity === 1 ? "pig" : "pigs"}`;
}

export function getInitialPigCost(batch: PigBatch): number {
  return batch.initialQuantity * batch.purchasePricePerPig;
}

export function getBatchQuantitySold(batchId: string, sales: Sale[]): number {
  return sales
    .filter((sale) => sale.batchId === batchId)
    .reduce((total, sale) => total + sale.quantitySold, 0);
}

export function getBatchQuantityLost(batchId: string, mortalityRecords: MortalityRecord[]): number {
  return mortalityRecords
    .filter((record) => record.batchId === batchId)
    .reduce((total, record) => total + record.quantityLost, 0);
}

export function getBatchCurrentQuantity(
  batch: PigBatch,
  sales: Sale[],
  mortalityRecords: MortalityRecord[]
): number {
  return Math.max(
    batch.initialQuantity -
      getBatchQuantitySold(batch.id, sales) -
      getBatchQuantityLost(batch.id, mortalityRecords),
    0
  );
}

export function getTotalPigPurchaseCost(batches: PigBatch[]): number {
  return batches.reduce((total, batch) => total + getInitialPigCost(batch), 0);
}

export function getTotalFeedPurchaseCost(feedPurchases: FeedPurchase[]): number {
  return feedPurchases.reduce((total, purchase) => total + purchase.quantity * purchase.costPerUnit, 0);
}

export function getTotalOtherExpenses(expenses: Expense[]): number {
  return expenses.reduce((total, expense) => total + expense.amount, 0);
}

export function getTotalRevenue(sales: Sale[]): number {
  return sales.reduce((total, sale) => total + sale.totalRevenue, 0);
}

export function getTotalExpenses(
  batches: PigBatch[],
  feedPurchases: FeedPurchase[],
  expenses: Expense[]
): number {
  return (
    getTotalPigPurchaseCost(batches) +
    getTotalFeedPurchaseCost(feedPurchases) +
    getTotalOtherExpenses(expenses)
  );
}

export function getEstimatedNetProfit(
  batches: PigBatch[],
  feedPurchases: FeedPurchase[],
  expenses: Expense[],
  sales: Sale[]
): number {
  return getTotalRevenue(sales) - getTotalExpenses(batches, feedPurchases, expenses);
}

export function getBatchRevenue(batchId: string, sales: Sale[]): number {
  return sales
    .filter((sale) => sale.batchId === batchId)
    .reduce((total, sale) => total + sale.totalRevenue, 0);
}

export function getBatchSpecificExpenses(batchId: string, expenses: Expense[]): number {
  return expenses
    .filter((expense) => expense.batchId === batchId)
    .reduce((total, expense) => total + expense.amount, 0);
}

export function getBatchEstimatedProfit(
  batch: PigBatch,
  sales: Sale[],
  expenses: Expense[],
  _mortalityRecords: MortalityRecord[],
  feedPurchases: FeedPurchase[] = [],
  feedUsages: FeedUsage[] = []
): number {
  return (
    getBatchRevenue(batch.id, sales) -
    getInitialPigCost(batch) -
    getBatchSpecificExpenses(batch.id, expenses) -
    getBatchFeedUsageCost(batch.id, feedPurchases, feedUsages)
  );
}

export function getFeedAverageCostMap(feedPurchases: FeedPurchase[]): Map<string, number> {
  const totals = new Map<string, { quantity: number; cost: number }>();

  feedPurchases.forEach((purchase) => {
    const key = getFeedInventoryKey(purchase.feedType, purchase.unit);
    const current = totals.get(key) ?? { quantity: 0, cost: 0 };
    current.quantity += purchase.quantity;
    current.cost += purchase.quantity * purchase.costPerUnit;
    totals.set(key, current);
  });

  const averages = new Map<string, number>();
  totals.forEach((value, key) => {
    averages.set(key, value.quantity > 0 ? value.cost / value.quantity : 0);
  });
  return averages;
}

export function getFeedUsageEstimatedCost(
  usage: FeedUsage,
  feedPurchases: FeedPurchase[]
): number {
  const averageCosts = getFeedAverageCostMap(feedPurchases);
  const averageCost = averageCosts.get(getFeedInventoryKey(usage.feedType, usage.unit)) ?? 0;
  return usage.quantityUsed * averageCost;
}

export function getBatchFeedUsageCost(
  batchId: string,
  feedPurchases: FeedPurchase[],
  feedUsages: FeedUsage[]
): number {
  return feedUsages
    .filter((usage) => usage.batchId === batchId)
    .reduce((total, usage) => total + getFeedUsageEstimatedCost(usage, feedPurchases), 0);
}

export function getBatchTotalInvestedCost(
  batch: PigBatch,
  expenses: Expense[],
  feedPurchases: FeedPurchase[],
  feedUsages: FeedUsage[]
): number {
  return (
    getInitialPigCost(batch) +
    getBatchSpecificExpenses(batch.id, expenses) +
    getBatchFeedUsageCost(batch.id, feedPurchases, feedUsages)
  );
}

export function getBatchBreakEvenAnalysis(
  batch: PigBatch,
  sales: Sale[],
  expenses: Expense[],
  mortalityRecords: MortalityRecord[],
  feedPurchases: FeedPurchase[],
  feedUsages: FeedUsage[]
): BatchBreakEvenAnalysis {
  const initialPigCost = getInitialPigCost(batch);
  const batchExpenseCost = getBatchSpecificExpenses(batch.id, expenses);
  const feedUsageCost = getBatchFeedUsageCost(batch.id, feedPurchases, feedUsages);
  const totalInvestedCost = initialPigCost + batchExpenseCost + feedUsageCost;
  const revenueToDate = getBatchRevenue(batch.id, sales);
  const currentQuantity = getBatchCurrentQuantity(batch, sales, mortalityRecords);
  const remainingRevenueNeeded = Math.max(totalInvestedCost - revenueToDate, 0);

  return {
    initialPigCost,
    batchExpenseCost,
    feedUsageCost,
    totalInvestedCost,
    revenueToDate,
    currentQuantity,
    remainingRevenueNeeded,
    breakEvenRevenuePerRemainingPig:
      currentQuantity > 0 ? remainingRevenueNeeded / currentQuantity : null,
    isBreakEvenReached: remainingRevenueNeeded === 0,
  };
}

export function getBatchActivityTimeline(
  batchId: string,
  sales: Sale[],
  feedUsages: FeedUsage[],
  expenses: Expense[],
  mortalityRecords: MortalityRecord[],
  feedPurchases: FeedPurchase[] = []
): BatchActivityTimelineItem[] {
  const saleItems: BatchActivityTimelineItem[] = sales
    .filter((sale) => sale.batchId === batchId)
    .map((sale) => ({
      id: sale.id,
      kind: "sale",
      date: sale.saleDate,
      label: `${formatPigCount(sale.quantitySold)} sold`,
      detail: sale.buyerName ? `Buyer: ${sale.buyerName}` : "Sale recorded",
      amount: sale.totalRevenue,
      amountKind: "revenue",
    }));

  const feedUsageItems: BatchActivityTimelineItem[] = feedUsages
    .filter((usage) => usage.batchId === batchId)
    .map((usage) => ({
      id: usage.id,
      kind: "feed_usage",
      date: usage.usageDate,
      label: `Feed used: ${usage.feedType}`,
      detail: `${usage.quantityUsed} ${usage.unit}`,
      amount: getFeedUsageEstimatedCost(usage, feedPurchases),
      amountKind: "cost",
    }));

  const expenseItems: BatchActivityTimelineItem[] = expenses
    .filter((expense) => expense.batchId === batchId)
    .map((expense) => ({
      id: expense.id,
      kind: "expense",
      date: expense.expenseDate,
      label: `${EXPENSE_CATEGORY_LABELS[expense.category]} expense`,
      detail: expense.notes ?? "Batch expense recorded",
      amount: expense.amount,
      amountKind: "cost",
    }));

  const mortalityItems: BatchActivityTimelineItem[] = mortalityRecords
    .filter((record) => record.batchId === batchId)
    .map((record) => ({
      id: record.id,
      kind: "mortality",
      date: record.lossDate,
      label: `${formatPigCount(record.quantityLost)} lost`,
      detail: record.reason ?? "No reason recorded",
    }));

  return [...saleItems, ...feedUsageItems, ...expenseItems, ...mortalityItems].sort((a, b) => {
    const dateComparison = b.date.localeCompare(a.date);
    return dateComparison !== 0 ? dateComparison : `${a.kind}:${a.id}`.localeCompare(`${b.kind}:${b.id}`);
  });
}

export function getBatchLifecycleSummary(
  batch: PigBatch,
  sales: Sale[],
  mortalityRecords: MortalityRecord[]
): BatchLifecycleSummary {
  const currentQuantity = getBatchCurrentQuantity(batch, sales, mortalityRecords);
  const soldQuantity = getBatchQuantitySold(batch.id, sales);
  const lostQuantity = getBatchQuantityLost(batch.id, mortalityRecords);
  const derivedStatus =
    batch.status === "closed" ? "closed" : currentQuantity === 0 ? "sold_out" : batch.status;
  const statusLabel =
    derivedStatus === "active" ? "Active" : derivedStatus === "sold_out" ? "Sold Out" : "Closed";
  const message =
    currentQuantity === 0
      ? "No pigs remain in this batch."
      : `${currentQuantity} of ${batch.initialQuantity} pigs remain.`;

  return {
    currentQuantity,
    soldQuantity,
    lostQuantity,
    derivedStatus,
    statusLabel,
    message,
  };
}

export function getExpenseTotalsByCategory(expenses: Expense[]): Record<ExpenseCategory, number> {
  const totals = EXPENSE_CATEGORIES.reduce(
    (acc, category) => ({ ...acc, [category]: 0 }),
    {} as Record<ExpenseCategory, number>
  );

  expenses.forEach((expense) => {
    totals[expense.category] += expense.amount;
  });

  return totals;
}

export function getFeedInventorySummary(
  feedPurchases: FeedPurchase[],
  feedUsages: FeedUsage[]
): FeedInventoryItem[] {
  const groups = new Map<string, FeedInventoryItem>();

  const ensureGroup = (feedType: string, unit: FeedUnit) => {
    const key = getFeedInventoryKey(feedType, unit);
    const existing = groups.get(key);

    if (existing) {
      return existing;
    }

    const next = {
      feedType: feedType.trim() || "Unknown Feed",
      unit,
      purchasedQuantity: 0,
      usedQuantity: 0,
      remainingQuantity: 0,
      totalPurchaseCost: 0,
      averageCostPerUnit: 0,
      remainingValue: 0,
    };
    groups.set(key, next);
    return next;
  };

  feedPurchases.forEach((purchase) => {
    const group = ensureGroup(purchase.feedType, purchase.unit);
    group.purchasedQuantity += purchase.quantity;
    group.totalPurchaseCost += purchase.quantity * purchase.costPerUnit;
  });

  feedUsages.forEach((usage) => {
    const group = ensureGroup(usage.feedType, usage.unit);
    group.usedQuantity += usage.quantityUsed;
  });

  groups.forEach((group) => {
    group.remainingQuantity = group.purchasedQuantity - group.usedQuantity;
    group.averageCostPerUnit =
      group.purchasedQuantity > 0 ? group.totalPurchaseCost / group.purchasedQuantity : 0;
    group.remainingValue = Math.max(group.remainingQuantity, 0) * group.averageCostPerUnit;
  });

  return Array.from(groups.values()).sort((a, b) => a.feedType.localeCompare(b.feedType));
}

export function getInventoryHealth(item: FeedInventoryItem): InventoryHealth {
  if (item.remainingQuantity < 0) {
    return "negative";
  }

  if (item.remainingQuantity === 0) {
    return "empty";
  }

  if (item.purchasedQuantity > 0 && item.remainingQuantity / item.purchasedQuantity <= 0.2) {
    return "low";
  }

  return "healthy";
}

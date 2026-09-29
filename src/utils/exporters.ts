import {
  getBatchCurrentQuantity,
  getBatchEstimatedProfit,
  getBatchFeedUsageCost,
  getBatchRevenue,
  getBatchSpecificExpenses,
  getFeedInventorySummary,
  getFeedUsageEstimatedCost,
  getInitialPigCost,
} from "./calculations";
import {
  BackupData,
  Expense,
  FeedPurchase,
  FeedUnit,
  FeedUsage,
  PigBatch,
  Sale,
} from "../types/models";
import { backupDataSchema } from "./validation";

export type CsvCell = string | number | boolean | null | undefined;

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => CsvCell;
}

export interface CsvExport {
  id: string;
  title: string;
  description: string;
  fileName: string;
  rowCount: number;
  csv: string;
}

export interface BackupRecordCounts {
  pigBatches: number;
  feedPurchases: number;
  feedUsages: number;
  expenses: number;
  sales: number;
  mortalityRecords: number;
  totalRecords: number;
}

export type BackupImportPreview =
  | {
      status: "empty";
      isValid: false;
      title: string;
      message: string;
      counts: null;
    }
  | {
      status: "invalid";
      isValid: false;
      title: string;
      message: string;
      counts: null;
    }
  | {
      status: "valid";
      isValid: true;
      title: string;
      message: string;
      counts: BackupRecordCounts;
    };

interface BatchCsvRow extends PigBatch {
  currentQuantity: number;
  initialPigCost: number;
  revenue: number;
  batchExpenses: number;
  feedUsageCost: number;
  estimatedProfit: number;
}

interface SaleCsvRow extends Sale {
  batchName: string;
}

interface ExpenseCsvRow extends Expense {
  batchName: string;
}

interface FeedInventoryCsvRow {
  feedType: string;
  unit: FeedUnit;
  purchasedQuantity: number;
  usedQuantity: number;
  remainingQuantity: number;
  totalPurchaseCost: number;
  averageCostPerUnit: number;
  remainingValue: number;
}

type FeedTransactionCsvRow =
  | {
      transactionType: "purchase";
      date: string;
      feedType: string;
      quantity: number;
      unit: FeedUnit;
      costPerUnit: number;
      totalCost: number;
      batchId: "";
      batchName: "";
      supplierName: string;
      notes: string;
      sourceId: string;
    }
  | {
      transactionType: "usage";
      date: string;
      feedType: string;
      quantity: number;
      unit: FeedUnit;
      costPerUnit: "";
      totalCost: number;
      batchId: string;
      batchName: string;
      supplierName: "";
      notes: string;
      sourceId: string;
    };

const batchCsvColumns: CsvColumn<BatchCsvRow>[] = [
  { header: "batch_id", value: (row) => row.id },
  { header: "name", value: (row) => row.name },
  { header: "status", value: (row) => row.status },
  { header: "purchase_date", value: (row) => row.purchaseDate },
  { header: "initial_quantity", value: (row) => row.initialQuantity },
  { header: "current_quantity", value: (row) => row.currentQuantity },
  { header: "purchase_price_per_pig", value: (row) => formatMoney(row.purchasePricePerPig) },
  { header: "initial_pig_cost", value: (row) => formatMoney(row.initialPigCost) },
  { header: "revenue", value: (row) => formatMoney(row.revenue) },
  { header: "batch_expenses", value: (row) => formatMoney(row.batchExpenses) },
  { header: "feed_usage_cost", value: (row) => formatMoney(row.feedUsageCost) },
  { header: "estimated_profit", value: (row) => formatMoney(row.estimatedProfit) },
  { header: "supplier_name", value: (row) => row.supplierName },
  { header: "notes", value: (row) => row.notes },
  { header: "created_at", value: (row) => row.createdAt },
  { header: "updated_at", value: (row) => row.updatedAt },
];

const salesCsvColumns: CsvColumn<SaleCsvRow>[] = [
  { header: "sale_id", value: (row) => row.id },
  { header: "batch_id", value: (row) => row.batchId },
  { header: "batch_name", value: (row) => row.batchName },
  { header: "sale_date", value: (row) => row.saleDate },
  { header: "quantity_sold", value: (row) => row.quantitySold },
  { header: "pricing_mode", value: (row) => row.pricingMode },
  { header: "total_weight_kg", value: (row) => formatOptionalQuantity(row.totalWeightKg) },
  { header: "price_per_kg", value: (row) => formatOptionalMoney(row.pricePerKg) },
  { header: "total_revenue", value: (row) => formatMoney(row.totalRevenue) },
  { header: "buyer_name", value: (row) => row.buyerName },
  { header: "notes", value: (row) => row.notes },
  { header: "created_at", value: (row) => row.createdAt },
  { header: "updated_at", value: (row) => row.updatedAt },
];

const expensesCsvColumns: CsvColumn<ExpenseCsvRow>[] = [
  { header: "expense_id", value: (row) => row.id },
  { header: "expense_date", value: (row) => row.expenseDate },
  { header: "category", value: (row) => row.category },
  { header: "amount", value: (row) => formatMoney(row.amount) },
  { header: "batch_id", value: (row) => row.batchId },
  { header: "batch_name", value: (row) => row.batchName },
  { header: "notes", value: (row) => row.notes },
  { header: "created_at", value: (row) => row.createdAt },
  { header: "updated_at", value: (row) => row.updatedAt },
];

const feedInventoryCsvColumns: CsvColumn<FeedInventoryCsvRow>[] = [
  { header: "feed_type", value: (row) => row.feedType },
  { header: "unit", value: (row) => row.unit },
  { header: "purchased_quantity", value: (row) => formatQuantity(row.purchasedQuantity) },
  { header: "used_quantity", value: (row) => formatQuantity(row.usedQuantity) },
  { header: "remaining_quantity", value: (row) => formatQuantity(row.remainingQuantity) },
  { header: "total_purchase_cost", value: (row) => formatMoney(row.totalPurchaseCost) },
  { header: "average_cost_per_unit", value: (row) => formatMoney(row.averageCostPerUnit) },
  { header: "remaining_value", value: (row) => formatMoney(row.remainingValue) },
];

const feedTransactionCsvColumns: CsvColumn<FeedTransactionCsvRow>[] = [
  { header: "transaction_type", value: (row) => row.transactionType },
  { header: "source_id", value: (row) => row.sourceId },
  { header: "date", value: (row) => row.date },
  { header: "feed_type", value: (row) => row.feedType },
  { header: "quantity", value: (row) => formatQuantity(row.quantity) },
  { header: "unit", value: (row) => row.unit },
  { header: "cost_per_unit", value: (row) => formatOptionalMoney(row.costPerUnit) },
  { header: "estimated_total_cost", value: (row) => formatMoney(row.totalCost) },
  { header: "batch_id", value: (row) => row.batchId },
  { header: "batch_name", value: (row) => row.batchName },
  { header: "supplier_name", value: (row) => row.supplierName },
  { header: "notes", value: (row) => row.notes },
];

export function escapeCsvCell(value: CsvCell): string {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);
  const shouldQuote = /[",\r\n]/.test(text) || /^\s|\s$/.test(text);

  if (!shouldQuote) {
    return text;
  }

  return `"${text.replace(/"/g, '""')}"`;
}

export function rowsToCsv<T>(columns: readonly CsvColumn<T>[], rows: readonly T[]): string {
  const header = columns.map((column) => escapeCsvCell(column.header)).join(",");
  const body = rows.map((row) => columns.map((column) => escapeCsvCell(column.value(row))).join(","));
  return [header, ...body].join("\n");
}

export function createBatchCsv(data: BackupData): string {
  const rows = data.pigBatches.map((batch) => ({
    ...batch,
    currentQuantity: getBatchCurrentQuantity(batch, data.sales, data.mortalityRecords),
    initialPigCost: getInitialPigCost(batch),
    revenue: getBatchRevenue(batch.id, data.sales),
    batchExpenses: getBatchSpecificExpenses(batch.id, data.expenses),
    feedUsageCost: getBatchFeedUsageCost(batch.id, data.feedPurchases, data.feedUsages),
    estimatedProfit: getBatchEstimatedProfit(
      batch,
      data.sales,
      data.expenses,
      data.mortalityRecords,
      data.feedPurchases,
      data.feedUsages
    ),
  }));

  return rowsToCsv(batchCsvColumns, rows);
}

export function createSalesCsv(data: BackupData): string {
  const rows = [...data.sales]
    .sort((a, b) => b.saleDate.localeCompare(a.saleDate))
    .map((sale) => ({
      ...sale,
      batchName: getBatchName(data.pigBatches, sale.batchId),
    }));

  return rowsToCsv(salesCsvColumns, rows);
}

export function createExpensesCsv(data: BackupData): string {
  const rows = [...data.expenses]
    .sort((a, b) => b.expenseDate.localeCompare(a.expenseDate))
    .map((expense) => ({
      ...expense,
      batchName: expense.batchId ? getBatchName(data.pigBatches, expense.batchId) : "General",
    }));

  return rowsToCsv(expensesCsvColumns, rows);
}

export function createFeedInventoryCsv(data: BackupData): string {
  return rowsToCsv(feedInventoryCsvColumns, getFeedInventorySummary(data.feedPurchases, data.feedUsages));
}

export function createFeedTransactionsCsv(data: BackupData): string {
  const purchaseRows = data.feedPurchases.map((purchase) => feedPurchaseToTransactionRow(purchase));
  const usageRows = data.feedUsages.map((usage) => feedUsageToTransactionRow(usage, data));
  const rows = [...purchaseRows, ...usageRows].sort((a, b) => b.date.localeCompare(a.date));

  return rowsToCsv(feedTransactionCsvColumns, rows);
}

export function createCsvExports(data: BackupData): CsvExport[] {
  return [
    {
      id: "batches",
      title: "Batch Performance CSV",
      description: "One row per pig batch with current quantity, revenue, costs, and estimated profit.",
      fileName: "piggery-batch-performance.csv",
      rowCount: data.pigBatches.length,
      csv: createBatchCsv(data),
    },
    {
      id: "sales",
      title: "Sales CSV",
      description: "One row per sale with batch names, pricing mode, and revenue.",
      fileName: "piggery-sales.csv",
      rowCount: data.sales.length,
      csv: createSalesCsv(data),
    },
    {
      id: "expenses",
      title: "Expenses CSV",
      description: "One row per expense with category, amount, and optional batch assignment.",
      fileName: "piggery-expenses.csv",
      rowCount: data.expenses.length,
      csv: createExpensesCsv(data),
    },
    {
      id: "feed-inventory",
      title: "Feed Inventory CSV",
      description: "Inventory grouped by feed type and unit, including remaining quantity and value.",
      fileName: "piggery-feed-inventory.csv",
      rowCount: getFeedInventorySummary(data.feedPurchases, data.feedUsages).length,
      csv: createFeedInventoryCsv(data),
    },
    {
      id: "feed-transactions",
      title: "Feed Transactions CSV",
      description: "Purchases and usage in one timeline, with usage costs estimated from average feed cost.",
      fileName: "piggery-feed-transactions.csv",
      rowCount: data.feedPurchases.length + data.feedUsages.length,
      csv: createFeedTransactionsCsv(data),
    },
  ];
}

export function getBackupRecordCounts(data: BackupData): BackupRecordCounts {
  const counts = {
    pigBatches: data.pigBatches.length,
    feedPurchases: data.feedPurchases.length,
    feedUsages: data.feedUsages.length,
    expenses: data.expenses.length,
    sales: data.sales.length,
    mortalityRecords: data.mortalityRecords.length,
  };

  return {
    ...counts,
    totalRecords:
      counts.pigBatches +
      counts.feedPurchases +
      counts.feedUsages +
      counts.expenses +
      counts.sales +
      counts.mortalityRecords,
  };
}

export function formatBackupCountSummary(counts: BackupRecordCounts): string {
  return `${counts.totalRecords} total ${pluralize("record", counts.totalRecords)}: ${[
    formatCount("pig batch", counts.pigBatches),
    formatCount("feed purchase", counts.feedPurchases),
    formatCount("feed usage", counts.feedUsages),
    formatCount("expense", counts.expenses),
    formatCount("sale", counts.sales),
    formatCount("mortality record", counts.mortalityRecords),
  ].join(", ")}.`;
}

export function getBackupImportPreview(json: string): BackupImportPreview {
  const trimmedJson = json.trim();

  if (!trimmedJson) {
    return {
      status: "empty",
      isValid: false,
      title: "No backup JSON yet",
      message: "Paste or type backup JSON to preview the records before restoring.",
      counts: null,
    };
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(trimmedJson);
  } catch {
    return {
      status: "invalid",
      isValid: false,
      title: "Invalid JSON",
      message: "The text is not valid JSON. Check for missing braces, quotes, or commas.",
      counts: null,
    };
  }

  const parsedBackup = backupDataSchema.safeParse(parsedJson);

  if (!parsedBackup.success) {
    const firstIssue = parsedBackup.error.issues[0];
    const path = firstIssue?.path.length ? firstIssue.path.join(".") : "backup root";
    const detail = firstIssue ? `${path}: ${firstIssue.message}` : "The backup shape is invalid.";

    return {
      status: "invalid",
      isValid: false,
      title: "Invalid backup shape",
      message: `The JSON is readable, but it does not match this app's backup format. First issue: ${detail}`,
      counts: null,
    };
  }

  const counts = getBackupRecordCounts(parsedBackup.data);

  return {
    status: "valid",
    isValid: true,
    title: "Valid backup ready to restore",
    message: formatBackupCountSummary(counts),
    counts,
  };
}

function feedPurchaseToTransactionRow(purchase: FeedPurchase): FeedTransactionCsvRow {
  return {
    transactionType: "purchase",
    sourceId: purchase.id,
    date: purchase.purchaseDate,
    feedType: purchase.feedType,
    quantity: purchase.quantity,
    unit: purchase.unit,
    costPerUnit: purchase.costPerUnit,
    totalCost: purchase.quantity * purchase.costPerUnit,
    batchId: "",
    batchName: "",
    supplierName: purchase.supplierName ?? "",
    notes: purchase.notes ?? "",
  };
}

function feedUsageToTransactionRow(usage: FeedUsage, data: BackupData): FeedTransactionCsvRow {
  return {
    transactionType: "usage",
    sourceId: usage.id,
    date: usage.usageDate,
    feedType: usage.feedType,
    quantity: usage.quantityUsed,
    unit: usage.unit,
    costPerUnit: "",
    totalCost: getFeedUsageEstimatedCost(usage, data.feedPurchases),
    batchId: usage.batchId,
    batchName: getBatchName(data.pigBatches, usage.batchId),
    supplierName: "",
    notes: usage.notes ?? "",
  };
}

function getBatchName(batches: PigBatch[], batchId: string): string {
  return batches.find((batch) => batch.id === batchId)?.name ?? "Unknown batch";
}

function formatCount(label: string, count: number): string {
  return `${count} ${pluralize(label, count)}`;
}

function pluralize(label: string, count: number): string {
  return count === 1 ? label : `${label}s`;
}

function formatOptionalQuantity(value: number | undefined): string {
  return value === undefined ? "" : formatQuantity(value);
}

function formatQuantity(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function formatOptionalMoney(value: number | "" | undefined): string {
  return typeof value === "number" ? formatMoney(value) : "";
}

function formatMoney(value: number): string {
  return value.toFixed(2);
}

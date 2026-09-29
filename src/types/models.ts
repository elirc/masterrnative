export type PigBatchStatus = "active" | "sold_out" | "closed";

export interface PigBatch {
  id: string;
  name: string;
  purchaseDate: string;
  initialQuantity: number;
  purchasePricePerPig: number;
  startingWeightPerPigKg?: number;
  supplierName?: string;
  notes?: string;
  status: PigBatchStatus;
  createdAt: string;
  updatedAt: string;
}

export type FeedUnit = "sack" | "kg";

export interface FeedPurchase {
  id: string;
  feedType: string;
  quantity: number;
  unit: FeedUnit;
  costPerUnit: number;
  supplierName?: string;
  purchaseDate: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FeedUsage {
  id: string;
  batchId: string;
  feedType: string;
  quantityUsed: number;
  unit: FeedUnit;
  usageDate: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type ExpenseCategory =
  | "medicine"
  | "vaccine"
  | "labor"
  | "transportation"
  | "utilities"
  | "equipment"
  | "repairs"
  | "cleaning_supplies"
  | "rent"
  | "permit_government_fees"
  | "other";

export interface Expense {
  id: string;
  category: ExpenseCategory;
  amount: number;
  expenseDate: string;
  batchId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type SalePricingMode = "by_weight" | "fixed_total";

export interface Sale {
  id: string;
  batchId: string;
  quantitySold: number;
  pricingMode: SalePricingMode;
  totalWeightKg?: number;
  pricePerKg?: number;
  totalRevenue: number;
  buyerName?: string;
  saleDate: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MortalityRecord {
  id: string;
  batchId: string;
  quantityLost: number;
  lossDate: string;
  reason?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BackupData {
  pigBatches: PigBatch[];
  feedPurchases: FeedPurchase[];
  feedUsages: FeedUsage[];
  expenses: Expense[];
  sales: Sale[];
  mortalityRecords: MortalityRecord[];
}

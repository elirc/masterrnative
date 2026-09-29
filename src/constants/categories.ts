import { ExpenseCategory, FeedUnit, PigBatchStatus, SalePricingMode } from "../types/models";

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  medicine: "Medicine",
  vaccine: "Vaccine",
  labor: "Labor",
  transportation: "Transportation",
  utilities: "Utilities",
  equipment: "Equipment",
  repairs: "Repairs",
  cleaning_supplies: "Cleaning Supplies",
  rent: "Rent",
  permit_government_fees: "Permit / Government Fees",
  other: "Other",
};

export const EXPENSE_CATEGORIES = Object.keys(EXPENSE_CATEGORY_LABELS) as ExpenseCategory[];

export const FEED_UNITS: FeedUnit[] = ["sack", "kg"];

export const PIG_BATCH_STATUSES: PigBatchStatus[] = ["active", "sold_out", "closed"];

export const PIG_BATCH_STATUS_LABELS: Record<PigBatchStatus, string> = {
  active: "Active",
  sold_out: "Sold Out",
  closed: "Closed",
};

export const SALE_PRICING_MODES: SalePricingMode[] = ["by_weight", "fixed_total"];

export const SALE_PRICING_MODE_LABELS: Record<SalePricingMode, string> = {
  by_weight: "By Weight",
  fixed_total: "Fixed Total",
};

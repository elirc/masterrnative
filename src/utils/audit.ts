import { getBatchQuantityLost, getBatchQuantitySold, getFeedInventorySummary } from "./calculations";
import type { BackupData, Expense, FeedUsage, MortalityRecord, PigBatch, Sale } from "../types/models";

export type AuditSeverity = "error" | "warning";

export type AuditIssueType =
  | "orphan_record"
  | "overdrawn_batch"
  | "negative_feed_inventory"
  | "duplicate_id";

export type AuditCollectionName = keyof BackupData;

export interface AuditRecordReference {
  collection: AuditCollectionName;
  id: string;
  label: string;
}

export interface DataQualityIssue {
  id: string;
  type: AuditIssueType;
  severity: AuditSeverity;
  title: string;
  message: string;
  details: string[];
  records: AuditRecordReference[];
}

export interface DataQualityAuditSummary {
  totalIssues: number;
  errors: number;
  warnings: number;
  checkedRecords: number;
  orphanRecords: number;
  overdrawnBatches: number;
  negativeInventoryItems: number;
  duplicateIds: number;
}

export interface DataQualityAuditResult {
  hasIssues: boolean;
  issues: DataQualityIssue[];
  summary: DataQualityAuditSummary;
}

const collectionLabels: Record<AuditCollectionName, string> = {
  pigBatches: "Pig batch",
  feedPurchases: "Feed purchase",
  feedUsages: "Feed usage",
  expenses: "Expense",
  sales: "Sale",
  mortalityRecords: "Mortality record",
};

function getCheckedRecordCount(data: BackupData): number {
  return (
    data.pigBatches.length +
    data.feedPurchases.length +
    data.feedUsages.length +
    data.expenses.length +
    data.sales.length +
    data.mortalityRecords.length
  );
}

function getBatchName(batchId: string, batchesById: Map<string, PigBatch>): string {
  return batchesById.get(batchId)?.name ?? batchId;
}

function makeReference(collection: AuditCollectionName, id: string, label?: string): AuditRecordReference {
  return {
    collection,
    id,
    label: label ?? `${collectionLabels[collection]} ${id}`,
  };
}

function makeOrphanIssue(
  collection: "sales" | "feedUsages" | "expenses" | "mortalityRecords",
  recordId: string,
  missingBatchId: string,
  recordLabel: string
): DataQualityIssue {
  return {
    id: `orphan_record:${collection}:${recordId}`,
    type: "orphan_record",
    severity: "error",
    title: `${collectionLabels[collection]} references a missing batch`,
    message: `${recordLabel} points to batch "${missingBatchId}", but that batch does not exist.`,
    details: [
      "The record will not appear correctly in batch-specific views.",
      "Either restore the missing batch or move this record to an existing batch.",
    ],
    records: [makeReference(collection, recordId, recordLabel)],
  };
}

function findOrphanIssues(data: BackupData, batchIds: Set<string>): DataQualityIssue[] {
  const issues: DataQualityIssue[] = [];

  const checkRequiredBatch = (
    collection: "sales" | "feedUsages" | "mortalityRecords",
    records: Array<Sale | FeedUsage | MortalityRecord>,
    getBatchId: (record: Sale | FeedUsage | MortalityRecord) => string
  ) => {
    records.forEach((record) => {
      const batchId = getBatchId(record);
      if (!batchIds.has(batchId)) {
        issues.push(makeOrphanIssue(collection, record.id, batchId, `${collectionLabels[collection]} ${record.id}`));
      }
    });
  };

  checkRequiredBatch("sales", data.sales, (record) => record.batchId);
  checkRequiredBatch("feedUsages", data.feedUsages, (record) => record.batchId);
  checkRequiredBatch("mortalityRecords", data.mortalityRecords, (record) => record.batchId);

  data.expenses.forEach((expense: Expense) => {
    if (expense.batchId && !batchIds.has(expense.batchId)) {
      issues.push(makeOrphanIssue("expenses", expense.id, expense.batchId, `${collectionLabels.expenses} ${expense.id}`));
    }
  });

  return issues;
}

function findOverdrawnBatchIssues(data: BackupData): DataQualityIssue[] {
  const issues: DataQualityIssue[] = [];

  data.pigBatches.forEach((batch) => {
    const soldQuantity = getBatchQuantitySold(batch.id, data.sales);
    const lostQuantity = getBatchQuantityLost(batch.id, data.mortalityRecords);
    const consumedQuantity = soldQuantity + lostQuantity;
    const overage = consumedQuantity - batch.initialQuantity;

    if (overage > 0) {
      issues.push({
        id: `overdrawn_batch:${batch.id}`,
        type: "overdrawn_batch",
        severity: "error",
        title: `${batch.name} has more sold/lost pigs than it started with`,
        message: `${batch.name} started with ${batch.initialQuantity} pigs, but records consume ${consumedQuantity}.`,
        details: [
          `Sold quantity: ${soldQuantity}`,
          `Lost quantity: ${lostQuantity}`,
          `Overage: ${overage}`,
          "The normal current-quantity helper clamps at zero for the UI, so this audit checks the raw numbers.",
        ],
        records: [makeReference("pigBatches", batch.id, batch.name)],
      });
    }
  });

  return issues;
}

function findNegativeFeedInventoryIssues(data: BackupData): DataQualityIssue[] {
  return getFeedInventorySummary(data.feedPurchases, data.feedUsages)
    .filter((item) => item.remainingQuantity < 0)
    .map((item) => {
      const normalizedFeedType = item.feedType.trim().toLowerCase();
      const relatedFeedUsages = data.feedUsages.filter(
        (usage) => usage.feedType.trim().toLowerCase() === normalizedFeedType && usage.unit === item.unit
      );
      const relatedFeedPurchases = data.feedPurchases.filter(
        (purchase) => purchase.feedType.trim().toLowerCase() === normalizedFeedType && purchase.unit === item.unit
      );

      return {
        id: `negative_feed_inventory:${normalizedFeedType}:${item.unit}`,
        type: "negative_feed_inventory",
        severity: "warning",
        title: `${item.feedType} inventory is negative`,
        message: `${item.usedQuantity} ${item.unit} used, but only ${item.purchasedQuantity} ${item.unit} purchased.`,
        details: [
          `Remaining quantity: ${item.remainingQuantity} ${item.unit}`,
          "This usually means a purchase was not entered, a usage quantity is too high, or the feed unit is inconsistent.",
        ],
        records: [
          ...relatedFeedPurchases.map((purchase) =>
            makeReference("feedPurchases", purchase.id, `Purchase ${purchase.id}`)
          ),
          ...relatedFeedUsages.map((usage) => makeReference("feedUsages", usage.id, `Usage ${usage.id}`)),
        ],
      } satisfies DataQualityIssue;
    });
}

function findDuplicateIdIssues(data: BackupData): DataQualityIssue[] {
  const ids = new Map<string, AuditRecordReference[]>();
  const collections = [
    { collection: "pigBatches", records: data.pigBatches },
    { collection: "feedPurchases", records: data.feedPurchases },
    { collection: "feedUsages", records: data.feedUsages },
    { collection: "expenses", records: data.expenses },
    { collection: "sales", records: data.sales },
    { collection: "mortalityRecords", records: data.mortalityRecords },
  ] as const;

  collections.forEach(({ collection, records }) => {
    records.forEach((record) => {
      const normalizedId = record.id.trim();
      if (!normalizedId) {
        return;
      }

      const current = ids.get(normalizedId) ?? [];
      current.push(makeReference(collection, record.id));
      ids.set(normalizedId, current);
    });
  });

  return Array.from(ids.entries())
    .filter(([, records]) => records.length > 1)
    .map(([duplicateId, records]) => ({
      id: `duplicate_id:${duplicateId}`,
      type: "duplicate_id",
      severity: "error",
      title: `Duplicate id "${duplicateId}"`,
      message: `${records.length} records share the same id. Updates and deletes can target the wrong record when ids are not unique.`,
      details: records.map((record) => `${collectionLabels[record.collection]}: ${record.id}`),
      records,
    }));
}

function buildSummary(issues: DataQualityIssue[], checkedRecords: number): DataQualityAuditSummary {
  return {
    totalIssues: issues.length,
    errors: issues.filter((issue) => issue.severity === "error").length,
    warnings: issues.filter((issue) => issue.severity === "warning").length,
    checkedRecords,
    orphanRecords: issues.filter((issue) => issue.type === "orphan_record").length,
    overdrawnBatches: issues.filter((issue) => issue.type === "overdrawn_batch").length,
    negativeInventoryItems: issues.filter((issue) => issue.type === "negative_feed_inventory").length,
    duplicateIds: issues.filter((issue) => issue.type === "duplicate_id").length,
  };
}

export function auditDataQuality(data: BackupData): DataQualityAuditResult {
  const batchesById = new Map(data.pigBatches.map((batch) => [batch.id, batch]));
  const batchIds = new Set(batchesById.keys());
  const issues = [
    ...findOrphanIssues(data, batchIds),
    ...findOverdrawnBatchIssues(data),
    ...findNegativeFeedInventoryIssues(data),
    ...findDuplicateIdIssues(data),
  ];

  return {
    hasIssues: issues.length > 0,
    issues,
    summary: buildSummary(issues, getCheckedRecordCount(data)),
  };
}

export function describeBatchReference(batchId: string, data: BackupData): string {
  const batchesById = new Map(data.pigBatches.map((batch) => [batch.id, batch]));
  return getBatchName(batchId, batchesById);
}

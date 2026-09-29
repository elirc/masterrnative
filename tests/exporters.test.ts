import assert from "node:assert/strict";
import test from "node:test";

import type { BackupData } from "../src/types/models";
import {
  createCsvExports,
  escapeCsvCell,
  formatBackupCountSummary,
  getBackupImportPreview,
  getBackupRecordCounts,
  rowsToCsv,
} from "../src/utils/exporters";

const now = "2026-05-01T00:00:00.000Z";

function makeBackupData(): BackupData {
  return {
    pigBatches: [
      {
        id: "batch-a",
        name: 'Batch "A", North',
        purchaseDate: "2026-05-01",
        initialQuantity: 10,
        purchasePricePerPig: 2500,
        supplierName: "Farm Supply",
        notes: "Fast-growing batch",
        status: "active",
        createdAt: now,
        updatedAt: now,
      },
    ],
    feedPurchases: [
      {
        id: "feed-purchase-a",
        feedType: "Starter Feed",
        quantity: 10,
        unit: "sack",
        costPerUnit: 1000,
        supplierName: "Feed Supplier",
        purchaseDate: "2026-05-02",
        notes: "Bulk purchase",
        createdAt: now,
        updatedAt: now,
      },
    ],
    feedUsages: [
      {
        id: "feed-usage-a",
        batchId: "batch-a",
        feedType: "Starter Feed",
        quantityUsed: 2,
        unit: "sack",
        usageDate: "2026-05-03",
        notes: "Morning feeding",
        createdAt: now,
        updatedAt: now,
      },
    ],
    expenses: [
      {
        id: "expense-a",
        category: "medicine",
        amount: 750,
        expenseDate: "2026-05-04",
        batchId: "batch-a",
        notes: "Vitamin shots",
        createdAt: now,
        updatedAt: now,
      },
    ],
    sales: [
      {
        id: "sale-a",
        batchId: "batch-a",
        quantitySold: 2,
        pricingMode: "fixed_total",
        totalRevenue: 16000,
        buyerName: 'Buyer, "Local"',
        saleDate: "2026-06-01",
        notes: "First sale",
        createdAt: now,
        updatedAt: now,
      },
    ],
    mortalityRecords: [
      {
        id: "mortality-a",
        batchId: "batch-a",
        quantityLost: 1,
        lossDate: "2026-05-10",
        reason: "Illness",
        notes: "Logged for audit",
        createdAt: now,
        updatedAt: now,
      },
    ],
  };
}

test("CSV escaping preserves commas, quotes, newlines, and leading spaces", () => {
  assert.equal(escapeCsvCell('Batch "A", North'), '"Batch ""A"", North"');
  assert.equal(escapeCsvCell("line one\nline two"), '"line one\nline two"');
  assert.equal(escapeCsvCell(" leading space"), '" leading space"');
  assert.equal(escapeCsvCell(undefined), "");

  const csv = rowsToCsv(
    [
      { header: "name", value: (row: { name: string }) => row.name },
      { header: "notes", value: (row: { notes: string }) => row.notes },
      { header: "empty", value: () => undefined },
    ],
    [{ name: 'Batch "A", North', notes: "line one\nline two" }]
  );

  assert.equal(csv, 'name,notes,empty\n"Batch ""A"", North","line one\nline two",');
});

test("backup record counts include every top-level collection and a total", () => {
  const counts = getBackupRecordCounts(makeBackupData());

  assert.deepEqual(counts, {
    pigBatches: 1,
    feedPurchases: 1,
    feedUsages: 1,
    expenses: 1,
    sales: 1,
    mortalityRecords: 1,
    totalRecords: 6,
  });
  assert.equal(
    formatBackupCountSummary(counts),
    "6 total records: 1 pig batch, 1 feed purchase, 1 feed usage, 1 expense, 1 sale, 1 mortality record."
  );
});

test("backup import preview distinguishes empty, malformed, wrong-shape, and valid JSON", () => {
  assert.equal(getBackupImportPreview("").status, "empty");
  assert.equal(getBackupImportPreview("{not json").status, "invalid");

  const wrongShape = getBackupImportPreview(JSON.stringify({ pigBatches: [] }));
  assert.equal(wrongShape.status, "invalid");
  assert.match(wrongShape.message, /backup format/i);

  const valid = getBackupImportPreview(JSON.stringify(makeBackupData()));
  assert.equal(valid.status, "valid");
  assert.equal(valid.isValid, true);
  if (valid.isValid) {
    assert.equal(valid.counts.totalRecords, 6);
    assert.match(valid.message, /6 total records/);
  }
});

test("CSV export bundle includes batch, sales, expenses, inventory, and feed transaction reports", () => {
  const exports = createCsvExports(makeBackupData());
  const exportIds = exports.map((csvExport) => csvExport.id);

  assert.deepEqual(exportIds, ["batches", "sales", "expenses", "feed-inventory", "feed-transactions"]);
  assert.equal(exports.find((csvExport) => csvExport.id === "batches")?.rowCount, 1);
  assert.match(exports.find((csvExport) => csvExport.id === "batches")?.csv ?? "", /estimated_profit/);
  assert.match(exports.find((csvExport) => csvExport.id === "batches")?.csv ?? "", /"Batch ""A"", North"/);
  assert.match(exports.find((csvExport) => csvExport.id === "sales")?.csv ?? "", /"Buyer, ""Local"""/);
  assert.match(exports.find((csvExport) => csvExport.id === "feed-transactions")?.csv ?? "", /purchase/);
  assert.match(exports.find((csvExport) => csvExport.id === "feed-transactions")?.csv ?? "", /usage/);
});

import { BackupData } from "../types/models";

export function createSampleData(): BackupData {
  const now = new Date().toISOString();
  const batchId = "sample-batch-2026-001";

  return {
    pigBatches: [
      {
        id: batchId,
        name: "Batch 2026-001",
        purchaseDate: "2026-05-01",
        initialQuantity: 20,
        purchasePricePerPig: 3500,
        startingWeightPerPigKg: 12,
        supplierName: "Local Breeder",
        status: "active",
        notes: "Sample starter batch",
        createdAt: now,
        updatedAt: now,
      },
    ],
    feedPurchases: [
      {
        id: "sample-feed-purchase-starter",
        feedType: "Starter Feed",
        quantity: 10,
        unit: "sack",
        costPerUnit: 1650,
        supplierName: "Agri Supply Store",
        purchaseDate: "2026-05-02",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "sample-feed-purchase-grower",
        feedType: "Grower Feed",
        quantity: 15,
        unit: "sack",
        costPerUnit: 1550,
        supplierName: "Agri Supply Store",
        purchaseDate: "2026-06-01",
        createdAt: now,
        updatedAt: now,
      },
    ],
    feedUsages: [
      {
        id: "sample-feed-usage-starter",
        batchId,
        feedType: "Starter Feed",
        quantityUsed: 3,
        unit: "sack",
        usageDate: "2026-05-15",
        createdAt: now,
        updatedAt: now,
      },
    ],
    expenses: [
      {
        id: "sample-expense-medicine",
        category: "medicine",
        amount: 850,
        batchId,
        expenseDate: "2026-05-10",
        notes: "Deworming medicine",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "sample-expense-labor",
        category: "labor",
        amount: 5000,
        expenseDate: "2026-05-31",
        notes: "Monthly helper payment",
        createdAt: now,
        updatedAt: now,
      },
    ],
    sales: [
      {
        id: "sample-sale-weight",
        batchId,
        quantitySold: 2,
        pricingMode: "by_weight",
        totalWeightKg: 180,
        pricePerKg: 190,
        totalRevenue: 34200,
        buyerName: "Local Meat Shop",
        saleDate: "2026-08-01",
        createdAt: now,
        updatedAt: now,
      },
    ],
    mortalityRecords: [
      {
        id: "sample-mortality-sickness",
        batchId,
        quantityLost: 1,
        lossDate: "2026-05-20",
        reason: "Sickness",
        createdAt: now,
        updatedAt: now,
      },
    ],
  };
}

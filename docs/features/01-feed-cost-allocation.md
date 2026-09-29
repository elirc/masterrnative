# Feature 01: Feed Cost Allocation Per Batch

## What This Feature Adds

Batch profit now includes an estimated feed cost. Before this change, the app could calculate global feed purchase cost, but a single batch's profit only subtracted pig purchase cost and batch-specific expenses. That meant the batch detail and batch performance report could look more profitable than reality because feed usage was not represented as a batch cost.

The feature lives mostly in `src/utils/calculations.ts`, with UI usage in:

- `src/screens/batches/BatchListScreen.tsx`
- `src/screens/batches/BatchDetailScreen.tsx`
- `src/screens/reports/ReportsScreen.tsx`
- `tests/calculations.test.ts`

## Senior Engineer Rationale

The important design choice was to keep feed-cost allocation in the calculation layer instead of putting it directly in screens. Screens should mostly answer, "What do I render?" The calculation file should answer, "What does this business number mean?"

That means if Dashboard, Reports, and Batch Detail all need the same batch profit formula, they can call the same helper. This prevents three slightly different versions of "profit" from drifting apart.

## Core Idea

Feed purchases tell us how much feed was bought and what it cost:

```ts
{
  feedType: "Starter Feed",
  quantity: 10,
  unit: "sack",
  costPerUnit: 1200
}
```

Feed usage tells us which batch consumed feed:

```ts
{
  batchId: "batch-a",
  feedType: "Starter Feed",
  quantityUsed: 4,
  unit: "sack"
}
```

To estimate the feed cost for that batch, we calculate the average cost per feed type/unit from purchases, then multiply usage by that average.

## Important Implementation

In `src/utils/calculations.ts`, the helper `getFeedAverageCostMap` groups purchases by feed type and unit.

Example:

```ts
export function getFeedAverageCostMap(feedPurchases: FeedPurchase[]): Map<string, number> {
  const totals = new Map<string, { quantity: number; cost: number }>();

  feedPurchases.forEach((purchase) => {
    const key = getFeedInventoryKey(purchase.feedType, purchase.unit);
    const current = totals.get(key) ?? { quantity: 0, cost: 0 };
    current.quantity += purchase.quantity;
    current.cost += purchase.quantity * purchase.costPerUnit;
    totals.set(key, current);
  });
}
```

A junior engineer should notice two things here:

1. We group by both `feedType` and `unit`, because `Starter Feed` in sacks and `Starter Feed` in kilograms are not the same inventory unit.
2. We normalize the key through `getFeedInventoryKey`, so `"Starter Feed"` and `" starter feed "` are treated as the same feed type.

Then `getBatchFeedUsageCost` filters usage by `batchId`:

```ts
export function getBatchFeedUsageCost(
  batchId: string,
  feedPurchases: FeedPurchase[],
  feedUsages: FeedUsage[]
): number {
  return feedUsages
    .filter((usage) => usage.batchId === batchId)
    .reduce((total, usage) => total + getFeedUsageEstimatedCost(usage, feedPurchases), 0);
}
```

That function is intentionally small. It delegates the cost calculation to `getFeedUsageEstimatedCost`, which keeps each function focused.

## How It Connects To Profit

The function `getBatchEstimatedProfit` now accepts optional `feedPurchases` and `feedUsages` arrays:

```ts
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
```

The optional parameters keep older calls from breaking. This is a practical compatibility choice: we improved the function without forcing every call site to change immediately.

## UI Wiring

`BatchDetailScreen` now shows allocated feed cost beside initial pig cost, expenses, revenue, and profit. That screen is a good demo point because it connects business math to a real batch.

`ReportsScreen` also uses `getBatchFeedUsageCost` inside batch performance cards. This helps explain that feed usage affects reporting, not just inventory.

## Testing

`tests/calculations.test.ts` has a test named:

```ts
test("batch estimated profit can include allocated feed usage cost", () => {
  ...
});
```

That test creates two feed purchases with different prices, then verifies that the average feed cost is used for usage allocation.

## Interview Talking Point

"I moved feed-cost allocation into pure calculation helpers instead of screen components. That way, every part of the app uses one consistent formula for batch profit. I also tested the helper directly, because this is business-critical math."

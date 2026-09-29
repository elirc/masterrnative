# Feature 12: Break-Even Analysis

## What This Feature Adds

Batch Detail now shows break-even analysis for the selected batch.

The feature answers three practical business questions:

1. How much money has been invested into this batch?
2. How much more revenue is needed before the batch breaks even?
3. If pigs remain, how much revenue is needed per remaining pig?

The implementation lives mostly in:

- `src/utils/calculations.ts`
- `src/screens/batches/BatchDetailScreen.tsx`
- `tests/calculations.test.ts`

## Why This Feature Matters

Profit is helpful, but break-even is often easier to reason about during operations.

Example:

```txt
Total invested: PHP 13,500
Revenue to date: PHP 6,500
Revenue needed: PHP 7,000
Needed per remaining pig: PHP 1,000
```

That tells the user that if 7 pigs remain, each remaining pig must generate about PHP 1,000 for the batch to recover its current invested cost.

For an interview, this is a strong feature because it shows:

- domain modeling
- cross-entity calculations
- reusable business logic
- clear UI communication
- focused tests around important financial math

## Senior Engineer Rationale

The important architectural decision was to avoid calculating break-even directly inside `BatchDetailScreen.tsx`.

The screen has access to all data through `useAppData`, so it would be tempting to write math inline in the component:

```tsx
const totalInvested = initialCost + expenses + feedCost;
```

That works at first, but it creates two problems:

1. The logic becomes harder to test because it is mixed with React Native UI.
2. Other screens may later reimplement the same formula slightly differently.

Instead, the app now exposes pure helpers from `src/utils/calculations.ts`.

## The Core Data Inputs

Break-even analysis needs data from several models.

`PigBatch` gives the initial pig cost:

```ts
initialQuantity * purchasePricePerPig
```

`Expense[]` gives batch-specific expenses:

```ts
expense.batchId === batch.id
```

`FeedUsage[]` plus `FeedPurchase[]` gives allocated feed cost.

`Sale[]` gives revenue to date.

`MortalityRecord[]` helps calculate how many pigs remain.

This is why the helper signature includes several arrays:

```ts
export function getBatchBreakEvenAnalysis(
  batch: PigBatch,
  sales: Sale[],
  expenses: Expense[],
  mortalityRecords: MortalityRecord[],
  feedPurchases: FeedPurchase[],
  feedUsages: FeedUsage[]
): BatchBreakEvenAnalysis
```

The function accepts raw app data and returns one ready-to-render summary object.

## Total Invested Cost

The first new helper is:

```ts
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
```

This helper defines what "invested cost" means in the current app.

It includes:

- initial pig purchase cost
- expenses assigned to the batch
- allocated feed usage cost

It does not include:

- general expenses without a `batchId`
- future projected expenses
- opportunity cost
- unrealized value of remaining pigs

That distinction matters. A senior engineer should be clear about what a metric includes and excludes.

## Break-Even Summary Type

The helper returns a structured object:

```ts
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
```

This is intentionally more than one number.

The UI needs multiple values, and tests need to verify the pieces. Returning a rich object also makes the helper self-documenting.

## How The Math Works

Inside `getBatchBreakEvenAnalysis`, the function first calculates the cost pieces:

```ts
const initialPigCost = getInitialPigCost(batch);
const batchExpenseCost = getBatchSpecificExpenses(batch.id, expenses);
const feedUsageCost = getBatchFeedUsageCost(batch.id, feedPurchases, feedUsages);
const totalInvestedCost = initialPigCost + batchExpenseCost + feedUsageCost;
```

Then it calculates revenue and remaining quantity:

```ts
const revenueToDate = getBatchRevenue(batch.id, sales);
const currentQuantity = getBatchCurrentQuantity(batch, sales, mortalityRecords);
```

Then it calculates the remaining amount needed:

```ts
const remainingRevenueNeeded = Math.max(totalInvestedCost - revenueToDate, 0);
```

`Math.max(..., 0)` is important. Once the batch breaks even, we do not want to show a negative "needed" number. A negative value would technically mean surplus, but the UI already has `isBreakEvenReached` and estimated profit elsewhere.

Finally, the helper calculates revenue needed per remaining pig:

```ts
breakEvenRevenuePerRemainingPig:
  currentQuantity > 0 ? remainingRevenueNeeded / currentQuantity : null
```

This returns `null` when no pigs remain because there is no meaningful per-pig target. Returning `0` in that case could be misleading.

## Example Calculation

Imagine this batch:

```ts
const batch = {
  initialQuantity: 10,
  purchasePricePerPig: 1000
};
```

Initial pig cost:

```txt
10 * 1000 = 10000
```

Batch expense:

```txt
1500
```

Feed usage cost:

```txt
2 sacks * 1000 average cost = 2000
```

Total invested cost:

```txt
10000 + 1500 + 2000 = 13500
```

Revenue to date:

```txt
6500
```

Remaining revenue needed:

```txt
13500 - 6500 = 7000
```

If 7 pigs remain:

```txt
7000 / 7 = 1000 per remaining pig
```

That exact scenario is covered in `tests/calculations.test.ts`.

## Batch Detail Wiring

In `BatchDetailScreen.tsx`, the screen computes:

```tsx
const breakEven = getBatchBreakEvenAnalysis(
  batch,
  sales,
  expenses,
  mortalityRecords,
  feedPurchases,
  feedUsages
);
```

Then it renders a focused card:

```tsx
<AppCard style={styles.breakEvenCard}>
  <View style={styles.breakEvenHeader}>
    <Text style={styles.sectionTitle}>Break-even analysis</Text>
    <Text style={[styles.breakEvenStatus, breakEven.isBreakEvenReached && styles.breakEvenReached]}>
      {breakEven.isBreakEvenReached ? "Break-even reached" : "Still recovering cost"}
    </Text>
  </View>
  ...
</AppCard>
```

The screen shows:

- total invested
- revenue to date
- revenue needed
- needed per remaining pig

The last metric handles the `null` case:

```tsx
<Metric
  label="Needed per remaining pig"
  currency={breakEven.breakEvenRevenuePerRemainingPig ?? undefined}
  value={breakEven.breakEvenRevenuePerRemainingPig === null ? "No pigs remain" : undefined}
  variant={breakEven.remainingRevenueNeeded > 0 ? "negative" : "positive"}
/>
```

If there are pigs left, the app shows currency. If there are no pigs left, it shows plain text.

## Why Not Store Break-Even In State?

Break-even is derived data. It should not be stored separately in AsyncStorage.

The app already stores the source facts:

- batches
- feed purchases
- feed usages
- expenses
- sales
- mortality records

Break-even can always be recalculated from those facts. Storing it would risk stale data.

For example, if a user edits a sale, a stored break-even value would need to be updated too. If that update were missed, the app would show incorrect financial information.

Derived data belongs in helper functions unless there is a strong performance reason to cache it.

## Test Coverage

The calculation test verifies:

```ts
assert.equal(getBatchTotalInvestedCost(batch, expenses, feedPurchases, feedUsages), 13500);
```

and:

```ts
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
```

This test is valuable because it checks the full business formula, not just one isolated arithmetic operation.

## Future Improvements

A future version could add:

- projected sale price per pig
- expected final revenue
- profit forecast
- break-even warnings when no pigs remain but revenue is still short
- allocation of general expenses across active batches

Those are intentionally not included here because this story focuses on actual recorded data, not predictions.

## Interview Talking Point

"I added break-even analysis as derived business logic. The helper combines initial pig cost, batch expenses, allocated feed cost, revenue, and remaining pig count. I kept it out of component state because it can be recalculated from the stored records, and I added tests around the full formula because financial math is high risk."


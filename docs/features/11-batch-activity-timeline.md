# Feature 11: Batch Activity Timeline

## What This Feature Adds

Batch Detail now has a unified activity timeline. Instead of forcing the user to mentally combine sales, feed usage, expenses, and mortality records from separate sections, the screen can show one chronological story for the batch.

The timeline combines:

- Sales
- Feed usage
- Batch-specific expenses
- Mortality or loss records

The key implementation files are:

- `src/utils/calculations.ts`
- `src/screens/batches/BatchDetailScreen.tsx`
- `tests/calculations.test.ts`

## Why This Feature Matters

From a product perspective, a batch is not just a static record. It has a history. A farmer or manager wants to answer questions like:

- What happened most recently?
- Did feed usage happen before or after a sale?
- Were medicine expenses close to a mortality event?
- How much revenue or cost came from each event?

Separate lists are useful for focused review, but a timeline is better for understanding cause and sequence.

From an engineering perspective, this feature is valuable because it crosses several domain entities. A junior engineer onboarding to the project can use this story to understand how records are connected by `batchId`.

## Senior Engineer Rationale

The main design choice was to build the timeline in `src/utils/calculations.ts`, not directly inside `BatchDetailScreen.tsx`.

That choice keeps `BatchDetailScreen` focused on rendering:

```tsx
const activityTimeline = getBatchActivityTimeline(
  batch.id,
  sales,
  feedUsages,
  expenses,
  mortalityRecords,
  feedPurchases
);
```

The screen asks for the timeline and renders it. It does not need to know how to map four different data models into one shared shape.

This gives us three benefits:

1. The timeline logic can be tested without React Native.
2. Other screens can reuse the same helper later.
3. The UI code stays smaller and easier to reason about.

## The Shared Timeline Shape

In `src/utils/calculations.ts`, the timeline is represented by `BatchActivityTimelineItem`.

```ts
export interface BatchActivityTimelineItem {
  id: string;
  kind: BatchActivityTimelineKind;
  date: string;
  label: string;
  detail: string;
  amount?: number;
  amountKind?: BatchActivityAmountKind;
}
```

This type is intentionally UI-friendly.

`id` identifies the source record.

`kind` tells the UI what type of event it is:

```ts
export type BatchActivityTimelineKind = "sale" | "feed_usage" | "expense" | "mortality";
```

`date` is the event date. Each source model has a different date field:

- `Sale.saleDate`
- `FeedUsage.usageDate`
- `Expense.expenseDate`
- `MortalityRecord.lossDate`

The helper normalizes those fields into one `date` property.

`label` is the headline shown to the user, such as:

```txt
2 pigs sold
Feed used: Starter Feed
Medicine expense
1 pig lost
```

The helper uses a small internal formatter so singular and plural pig counts read naturally:

```ts
function formatPigCount(quantity: number): string {
  return `${quantity} ${quantity === 1 ? "pig" : "pigs"}`;
}
```

`detail` gives secondary context, such as buyer name, feed quantity, notes, or mortality reason.

`amount` is optional because not every event has money attached. Sales, feed usage, and expenses can show currency. Mortality has operational meaning but no direct amount in the current data model.

`amountKind` lets the UI decide whether currency should look positive or negative:

```ts
export type BatchActivityAmountKind = "revenue" | "cost";
```

Sales are revenue. Feed usage and expenses are costs.

## The Helper Function

The main helper is:

```ts
export function getBatchActivityTimeline(
  batchId: string,
  sales: Sale[],
  feedUsages: FeedUsage[],
  expenses: Expense[],
  mortalityRecords: MortalityRecord[],
  feedPurchases: FeedPurchase[] = []
): BatchActivityTimelineItem[] {
  ...
}
```

Notice the first parameter: `batchId`.

That is the linking key. The project does not use a relational database, but the relationship is still relational in shape:

```ts
sale.batchId === batch.id
usage.batchId === batch.id
expense.batchId === batch.id
record.batchId === batch.id
```

Each record type is filtered to the selected batch.

## Mapping Sales

Sales become timeline items like this:

```ts
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
```

The important part is that sales carry money in the positive direction:

```ts
amount: sale.totalRevenue,
amountKind: "revenue",
```

This lets the screen render sale money in a positive style without hard-coding sale logic into the component.

## Mapping Feed Usage

Feed usage is different because the `FeedUsage` model stores quantity, not cost. The cost must be estimated from feed purchases.

```ts
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
```

This connects Story 11 to the earlier feed allocation work.

`getFeedUsageEstimatedCost` calculates average cost per feed type and unit, then multiplies by usage quantity. That makes the timeline more useful than simply showing "2 sacks used"; it can also show the estimated business cost of that usage.

## Mapping Expenses

Expenses use the category labels from `src/constants/categories.ts`.

```ts
label: `${EXPENSE_CATEGORY_LABELS[expense.category]} expense`
```

This means the timeline shows a human-readable label like:

```txt
Medicine expense
Transportation expense
```

instead of raw enum values like:

```txt
medicine
transportation
```

That is a small but important UI polish choice.

## Mapping Mortality

Mortality records are included even though they do not currently have a currency amount.

```ts
const mortalityItems: BatchActivityTimelineItem[] = mortalityRecords
  .filter((record) => record.batchId === batchId)
  .map((record) => ({
    id: record.id,
    kind: "mortality",
    date: record.lossDate,
    label: `${formatPigCount(record.quantityLost)} lost`,
    detail: record.reason ?? "No reason recorded",
  }));
```

This is important because mortality changes the business state of a batch. It affects current quantity and break-even analysis, even if it does not have a direct cost field yet.

## Sorting

After mapping each source array, the helper combines everything and sorts by descending date:

```ts
return [...saleItems, ...feedUsageItems, ...expenseItems, ...mortalityItems].sort((a, b) => {
  const dateComparison = b.date.localeCompare(a.date);
  return dateComparison !== 0 ? dateComparison : `${a.kind}:${a.id}`.localeCompare(`${b.kind}:${b.id}`);
});
```

The first comparison sorts newest first.

The second comparison is a tie-breaker. If two records have the same date, the helper still returns a deterministic order. Deterministic order matters for tests and for avoiding jumpy UI.

## Batch Detail Wiring

In `BatchDetailScreen.tsx`, the screen calls the helper after finding the selected batch:

```tsx
const activityTimeline = getBatchActivityTimeline(
  batch.id,
  sales,
  feedUsages,
  expenses,
  mortalityRecords,
  feedPurchases
);
```

Then the UI renders a section:

```tsx
<Section title="Activity timeline">
  {activityTimeline.length === 0 ? (
    <Text style={styles.emptyLine}>No batch activity recorded yet.</Text>
  ) : (
    activityTimeline.map((item) => <TimelineRecord key={`${item.kind}-${item.id}`} item={item} />)
  )}
</Section>
```

The key is built from both `kind` and `id` because different entity arrays could theoretically contain the same id string. Combining them gives React a more reliable key.

## Timeline Record Rendering

`TimelineRecord` receives one normalized item:

```tsx
function TimelineRecord({ item }: { item: BatchActivityTimelineItem }) {
  const isRevenue = item.amountKind === "revenue";
  ...
}
```

The component does not need to ask whether the item came from sales, expenses, feed usage, or mortality. It only checks the normalized fields.

Currency rendering is handled like this:

```tsx
{item.amount !== undefined ? (
  <CurrencyText
    amount={item.amount}
    variant={isRevenue ? "positive" : "negative"}
    style={styles.timelineAmount}
  />
) : (
  <Text style={styles.noAmount}>No direct amount</Text>
)}
```

This is a good example of why normalized helper output is useful. The UI can be generic.

## Test Coverage

`tests/calculations.test.ts` includes:

```ts
test("batch activity timeline combines all batch records in descending date order", () => {
  ...
});
```

The test verifies:

- records from another batch are ignored
- all four record types are included
- items are sorted newest first
- sale revenue is marked as `revenue`
- feed usage and expenses are marked as `cost`
- feed usage cost uses feed purchase data

This test protects the real business behavior rather than only testing implementation details.

## Example Output

For a batch with a sale, feed usage, medicine expense, and mortality event, the timeline could produce:

```ts
[
  {
    kind: "mortality",
    date: "2026-05-12",
    label: "1 pig lost",
    detail: "Illness"
  },
  {
    kind: "feed_usage",
    date: "2026-05-11",
    label: "Feed used: Starter Feed",
    detail: "2 sack",
    amount: 2000,
    amountKind: "cost"
  },
  {
    kind: "expense",
    date: "2026-05-10",
    label: "Medicine expense",
    detail: "Deworming",
    amount: 750,
    amountKind: "cost"
  },
  {
    kind: "sale",
    date: "2026-05-09",
    label: "2 pigs sold",
    detail: "Buyer: Local Market",
    amount: 8000,
    amountKind: "revenue"
  }
]
```

## Interview Talking Point

"I added a unified batch activity timeline by normalizing multiple domain records into one timeline item type. I kept the transformation in a pure calculation helper so it is reusable and testable, and the screen only has to render normalized timeline items."

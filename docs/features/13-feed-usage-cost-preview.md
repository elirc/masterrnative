# Feature 13: Feed Usage Cost Preview

## What This Feature Adds

`FeedUsageFormScreen` now shows an estimated cost while the user records feed consumption. If the user selects `Starter Feed`, chooses `sack`, and enters `3`, the form looks up the average purchase cost for `Starter Feed` sacks and previews the estimated cost of that usage.

Main files:

- `src/screens/transactions/FeedUsageFormScreen.tsx`
- `src/utils/calculations.ts`
- `tests/calculations.test.ts`

## Senior Engineer Rationale

This is a derived-data feature. We do not need to store a new field on `FeedUsage` because the estimated cost can be calculated from existing records:

- `FeedPurchase` records tell us feed type, unit, quantity, and cost per unit.
- `FeedUsage` records tell us feed type, unit, quantity used, and batch.

The senior-level design choice is to keep persisted data minimal and calculate the estimate at render time. Storing the estimated cost on every usage record would create synchronization problems. For example, if a purchase price was corrected later, stored feed usage cost previews could become stale.

Instead, the form asks: "Based on the current purchase history, what is the best estimate right now?"

## Existing Business Logic We Reused

The app already has `getFeedInventorySummary` in `src/utils/calculations.ts`. That function groups purchases and usage by feed type and unit, then calculates fields like:

```ts
{
  feedType: "Starter Feed",
  unit: "sack",
  purchasedQuantity: 15,
  usedQuantity: 3,
  remainingQuantity: 12,
  totalPurchaseCost: 17000,
  averageCostPerUnit: 17000 / 15,
  remainingValue: 12 * (17000 / 15)
}
```

The important field for this feature is:

```ts
averageCostPerUnit
```

That value is calculated from purchase history, not from the usage record. If the business bought 10 sacks at 1200 and 5 sacks at 1000, the average cost is:

```txt
((10 * 1200) + (5 * 1000)) / 15 = 1133.33 per sack
```

Then a usage of 3 sacks previews:

```txt
3 * 1133.33 = 3400
```

## Form Implementation

In `src/screens/transactions/FeedUsageFormScreen.tsx`, the form now watches three fields:

```ts
const previewFeedType = String(watch("feedType") ?? "");
const previewQuantity = Number(watch("quantityUsed") ?? 0);
const previewUnit = watch("unit");
```

This is a key React Hook Form pattern. `watch` lets the UI respond to values before the form is submitted. The preview should update as the user types, not only after save.

Next, the screen builds an inventory snapshot:

```ts
const previewInventory = getFeedInventorySummary(
  feedPurchases,
  feedUsages.filter((usage) => usage.id !== existingUsage?.id)
);
```

The `filter` is important when editing an existing usage. Suppose a usage record already consumed 2 sacks. If we include that same record in the inventory snapshot while editing it, the preview would count the existing usage against inventory and then also preview the edited quantity. Excluding the current record keeps the estimate based on inventory before this form save.

Then the screen finds the matching inventory group:

```ts
const previewInventoryItem = previewInventory.find(
  (item) =>
    item.feedType.trim().toLowerCase() === previewFeedType.trim().toLowerCase() &&
    item.unit === previewUnit
);
```

Notice the comparison:

- Feed type is trimmed and lowercased.
- Unit must match exactly.

That mirrors the inventory grouping rules in `calculations.ts`. A junior engineer should learn to keep matching rules consistent across the codebase. If one area treats `"Starter Feed"` and `" starter feed "` as the same but another does not, the app will feel buggy.

Finally, the cost is calculated:

```ts
const averageCostPerUnit = previewInventoryItem?.averageCostPerUnit ?? 0;
const estimatedUsageCost = previewQuantity > 0 ? previewQuantity * averageCostPerUnit : 0;
```

If there is no matching purchase history, the average cost is `0`. That is a deliberate fallback. The app can still let the user record feed usage even if they forgot to enter the purchase first, but the preview clearly shows that no purchase cost history was found.

## UI Implementation

The preview is rendered with `AppCard`, matching the app's existing card style:

```tsx
{shouldShowCostPreview ? (
  <AppCard style={styles.previewCard}>
    <Text style={styles.previewLabel}>Estimated feed cost</Text>
    <Text style={styles.previewValue}>{formatCurrency(estimatedUsageCost)}</Text>
    <Text style={styles.previewMeta}>
      {averageCostPerUnit > 0
        ? `Based on ${formatCurrency(averageCostPerUnit)} average cost per ${previewUnit}.`
        : "No matching purchase history yet, so the estimate is 0."}
    </Text>
  </AppCard>
) : null}
```

The UI does not introduce a new dependency. It reuses:

- `AppCard` for layout
- `formatCurrency` for Philippine peso formatting
- `colors` for consistent typography and contrast

## Why This Is Good For The Demo

This feature helps tell a strong product story:

"When the farmer records feed usage, the app immediately estimates the cost impact based on purchase history. That makes the form more than data entry; it becomes a lightweight business decision tool."

## Testing Strategy

The UI itself is not unit tested because the project currently uses Node's built-in test runner for pure TypeScript utilities, not a React Native component test runner. The core math is covered by `tests/calculations.test.ts`, especially the inventory grouping test:

```ts
test("feed inventory groups trimmed feed type case-insensitively while keeping units separate", () => {
  ...
});
```

That test verifies `averageCostPerUnit`, which is the value the form preview uses. This is the right testing target for the current test setup: protect the business math in a pure function, then keep the form as a thin rendering layer.

## Interview Talking Point

"I added a feed usage cost preview without changing the data model. The estimate is derived from existing feed purchases using the same inventory calculation that powers reports. That keeps persistence simple and prevents stale stored cost values."

# Feature 08: Data Quality Audit Center

## What This Feature Adds

The Data Quality Audit Center gives the app a place to inspect whether locally stored records still make sense together.

The feature checks for four high-risk data problems:

- Orphan records: sales, feed usages, expenses, or mortality records that point to a batch id that no longer exists.
- Overdrawn batches: a batch where `sold quantity + lost quantity` is greater than `initialQuantity`.
- Negative feed inventory: feed usage that exceeds purchases for the same feed type and unit.
- Duplicate ids: two or more records anywhere in the local dataset sharing the same id.

Main files:

- `src/utils/audit.ts`
- `src/screens/settings/DataQualityScreen.tsx`
- `src/screens/settings/SettingsScreen.tsx`
- `src/navigation/types.ts`
- `src/navigation/AppNavigator.tsx`
- `tests/audit.test.ts`

## Senior Engineer Rationale

This app is local-first. That is a good MVP choice because the user can run it without a backend, but local-first apps need data integrity checks because records can drift over time.

For example:

- A user can delete a batch after entering sales for that batch.
- A backup JSON file can be manually edited before restore.
- A bug in an older version of the app could create duplicate ids.
- A user can record more feed usage than feed purchases.
- The UI clamps current pig quantity at zero so the interface does not show negative animals, but that same clamp can hide invalid underlying data.

The senior engineering decision was to make the audit a pure utility, not a screen-only implementation.

That means `DataQualityScreen` does not contain the business rules. It only renders the result of:

```ts
auditDataQuality({
  pigBatches,
  feedPurchases,
  feedUsages,
  expenses,
  sales,
  mortalityRecords,
});
```

This keeps the feature testable. Unit tests can call `auditDataQuality()` directly without needing React Native, navigation, AsyncStorage, or a device simulator.

## File Connection Map

The flow looks like this:

```txt
SettingsScreen
  -> navigation.navigate("DataQuality")
  -> AppNavigator SettingsStack route
  -> DataQualityScreen
  -> useAppData()
  -> auditDataQuality()
  -> structured issue cards
```

The data source is the same app-wide context used by Dashboard, Reports, and transaction screens:

```txt
AsyncStorage
  -> storageService
  -> AppDataContext
  -> useAppData()
  -> DataQualityScreen
```

The important design point: the audit reads from the app's existing data layer. It does not create a parallel source of truth.

## The Audit Result Shape

`src/utils/audit.ts` defines a small audit domain:

```ts
export interface DataQualityIssue {
  id: string;
  type: AuditIssueType;
  severity: AuditSeverity;
  title: string;
  message: string;
  details: string[];
  records: AuditRecordReference[];
}
```

This shape is intentionally UI-friendly.

The screen needs:

- `title` for the issue card heading.
- `message` for the main explanation.
- `details` for supporting numbers or repair hints.
- `records` so the user can see which records are involved.
- `severity` so the UI can color errors and warnings differently.

A junior engineer might ask why we do not just return strings. The reason is that strings are hard to reuse. A structured object can be rendered in a mobile screen, tested in unit tests, exported later, or summarized in a report.

## Orphan Record Detection

The first audit rule builds a `Set` of valid batch ids:

```ts
const batchesById = new Map(data.pigBatches.map((batch) => [batch.id, batch]));
const batchIds = new Set(batchesById.keys());
```

That gives constant-time lookup:

```ts
batchIds.has(batchId)
```

Then records with required batch references are checked:

```ts
checkRequiredBatch("sales", data.sales, (record) => record.batchId);
checkRequiredBatch("feedUsages", data.feedUsages, (record) => record.batchId);
checkRequiredBatch("mortalityRecords", data.mortalityRecords, (record) => record.batchId);
```

Expenses are slightly different because an expense can be general. General expenses intentionally have no `batchId`.

So the expense rule is:

```ts
if (expense.batchId && !batchIds.has(expense.batchId)) {
  issues.push(makeOrphanIssue(...));
}
```

That means:

- `batchId: undefined` is valid for a general expense.
- `batchId: "missing-batch"` is invalid if that batch does not exist.

## Overdrawn Batch Detection

The app already has a current quantity helper in `calculations.ts`, but that helper uses `Math.max(..., 0)`.

That is correct for UI display:

```ts
return Math.max(initialQuantity - sold - lost, 0);
```

But the audit should not use the clamped value to decide whether the data is valid.

Instead, `audit.ts` checks the raw numbers:

```ts
const soldQuantity = getBatchQuantitySold(batch.id, data.sales);
const lostQuantity = getBatchQuantityLost(batch.id, data.mortalityRecords);
const consumedQuantity = soldQuantity + lostQuantity;
const overage = consumedQuantity - batch.initialQuantity;
```

If `overage > 0`, the batch is overdrawn.

Example:

```txt
Initial pigs: 5
Sold pigs: 4
Lost pigs: 3
Consumed: 7
Overage: 2
```

The normal UI might show current quantity as `0`, which is friendly. The audit shows that the underlying records are off by `2`, which is precise.

## Negative Feed Inventory Detection

The feed inventory rule reuses existing business logic:

```ts
getFeedInventorySummary(data.feedPurchases, data.feedUsages)
```

That matters because Dashboard, Reports, Feed Inventory, and Data Quality should agree on feed grouping.

The grouping rules are already established in `calculations.ts`:

- Trim feed type.
- Compare feed type case-insensitively.
- Keep `sack` and `kg` separate.

The audit only cares about inventory rows where:

```ts
item.remainingQuantity < 0
```

Example:

```txt
Starter Feed purchased: 2 sack
Starter Feed used: 5 sack
Remaining: -3 sack
```

That becomes a warning, not an error, because the records may still be intentionally recoverable. The user may simply need to enter a missing feed purchase.

## Duplicate ID Detection

Every entity in the app has an `id`. The context update/delete functions depend on that id.

For example:

```ts
const next = sales.map((item) => (item.id === sale.id ? sale : item));
```

If two records share an id, an update can affect the wrong thing or make a list behave unpredictably.

The duplicate check walks every collection:

```ts
const collections = [
  { collection: "pigBatches", records: data.pigBatches },
  { collection: "feedPurchases", records: data.feedPurchases },
  { collection: "feedUsages", records: data.feedUsages },
  { collection: "expenses", records: data.expenses },
  { collection: "sales", records: data.sales },
  { collection: "mortalityRecords", records: data.mortalityRecords },
] as const;
```

Then it groups references by trimmed id:

```ts
const normalizedId = record.id.trim();
const current = ids.get(normalizedId) ?? [];
current.push(makeReference(collection, record.id));
ids.set(normalizedId, current);
```

Any id with more than one reference becomes a duplicate-id issue.

This catches duplicates within the same collection and across different collections.

## Screen Design

`DataQualityScreen` uses `useAppData()` to get the latest in-memory records:

```ts
const { pigBatches, feedPurchases, feedUsages, expenses, sales, mortalityRecords } = useAppData();
```

Then it memoizes the audit:

```ts
const audit = useMemo(
  () => auditDataQuality({ pigBatches, feedPurchases, feedUsages, expenses, sales, mortalityRecords }),
  [expenses, feedPurchases, feedUsages, mortalityRecords, pigBatches, sales]
);
```

`useMemo` is not required for correctness, but it is a sensible optimization. The audit only reruns when the underlying data arrays change.

The screen shows:

- A hero summary card.
- Three metric cards: errors, warnings, total issues.
- A category breakdown.
- A success card when no issues exist.
- One issue card per audit issue when problems exist.

The screen is intentionally read-only. It does not try to automatically repair data because automatic repair can destroy user intent. For example, if a sale points to a missing batch, the app cannot safely guess which batch it belongs to.

## Navigation Wiring

`SettingsStackParamList` now includes:

```ts
export type SettingsStackParamList = {
  Settings: undefined;
  DataQuality: undefined;
};
```

This keeps the route type-safe. If someone later tries:

```ts
navigation.navigate("DataQuality", { batchId: "batch-a" });
```

TypeScript will reject it because `DataQuality` does not accept params.

The route is registered in the Settings stack:

```tsx
<SettingsStack.Screen name="DataQuality" component={DataQualityScreen} options={{ title: "Data Quality" }} />
```

The Settings screen exposes it with:

```tsx
<AppButton title="Data Quality Audit" variant="secondary" onPress={() => navigation.navigate("DataQuality")} />
```

## Testing Strategy

`tests/audit.test.ts` covers the business rules directly.

The clean-data test protects the happy path:

```ts
assert.equal(result.hasIssues, false);
assert.equal(result.summary.totalIssues, 0);
```

The orphan test makes sure records pointing to missing batches are found:

```ts
assert.equal(result.summary.orphanRecords, 4);
```

The overdrawn test protects the most subtle rule:

```ts
assert.match(result.issues[0]?.details.join(" "), /Overage: 2/);
```

That is important because a future developer might be tempted to reuse `getBatchCurrentQuantity()`. This test makes sure the audit still sees the raw overage.

The negative inventory test protects feed grouping:

```ts
assert.match(result.issues[0]?.message ?? "", /5 sack used, but only 2 sack purchased/);
```

The duplicate id test protects app-wide identity:

```ts
assert.deepEqual(
  result.issues[0]?.records.map((record) => record.collection).sort(),
  ["pigBatches", "sales"]
);
```

## Tradeoffs

This feature reports issues but does not auto-fix them.

That is deliberate. A senior engineer should avoid destructive or guess-based repair flows unless the repair is obvious and reversible. Data quality checks should first make hidden problems visible.

Good future improvements:

- Add deep links from each audit issue to the matching edit screen.
- Add a repair flow for safe cases, such as deleting duplicate empty records.
- Add backup export of the audit report for support/debugging.
- Add date consistency checks, such as sale dates before batch purchase dates.
- Add amount checks for impossible values if imported data bypasses validation.

## Interview Talking Point

"I added a Data Quality Audit Center because a local-first app needs a way to verify that related records still make sense together. The audit is implemented as a pure utility over the same `BackupData` shape used by storage and context, then rendered through a Settings screen. That keeps the business rules reusable, testable, and independent of React Native UI."

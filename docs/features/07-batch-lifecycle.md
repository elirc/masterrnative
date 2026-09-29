# Feature 07: Batch Lifecycle Improvements

## What This Feature Adds

Batches now better reflect their lifecycle. The app derives status from actual activity and can update batch status after sales or mortality records consume the remaining pigs.

Main files:

- `src/utils/calculations.ts`
- `src/screens/batches/BatchListScreen.tsx`
- `src/screens/batches/BatchDetailScreen.tsx`
- `src/screens/transactions/SaleFormScreen.tsx`
- `src/screens/transactions/MortalityFormScreen.tsx`
- `tests/calculations.test.ts`

## Senior Engineer Rationale

Batch status is partly user-entered and partly derived from records. For example, a batch may be marked active, but if sales and mortality records reduce the quantity to zero, the app should not keep presenting that batch as active.

The important choice was to centralize lifecycle derivation in `calculations.ts`.

## Derived Lifecycle Helper

`getBatchLifecycleSummary` returns:

```ts
{
  currentQuantity,
  soldQuantity,
  lostQuantity,
  derivedStatus,
  statusLabel,
  message
}
```

This is more useful than returning only a status string because screens often need the related numbers and a user-facing explanation.

Example implementation:

```ts
const derivedStatus =
  batch.status === "closed" ? "closed" : currentQuantity === 0 ? "sold_out" : batch.status;
```

The logic means:

1. If a batch is manually closed, respect that.
2. If no pigs remain, show it as sold out.
3. Otherwise, keep its current status.

## Batch List Usage

`BatchListScreen` uses lifecycle status for filtering and display:

```ts
const lifecycle = getBatchLifecycleSummary(batch, sales, mortalityRecords);
const matchesStatus = statusFilter === "all" || lifecycle.derivedStatus === statusFilter;
```

That means the status filter is based on real batch state, not only the stored field.

## Batch Detail Usage

`BatchDetailScreen` shows a lifecycle note:

```tsx
<Text style={[styles.lifecycleNote, lifecycle.currentQuantity === 0 && styles.lifecycleWarning]}>
  {lifecycle.message}
</Text>
```

This gives the user a plain-English explanation such as:

```txt
No pigs remain in this batch.
```

or:

```txt
8 of 20 pigs remain.
```

## Auto-Status Updates

`SaleFormScreen` updates a batch to `sold_out` when a sale leaves zero pigs:

```ts
const remainingQuantity = getBatchCurrentQuantity(batch, nextSales, mortalityRecords);
if (remainingQuantity === 0 && batch.status === "active") {
  await updatePigBatch({ ...batch, status: "sold_out", updatedAt: now });
}
```

`MortalityFormScreen` updates a batch to `closed` when losses leave zero pigs:

```ts
const remainingQuantity = getBatchCurrentQuantity(batch, sales, nextMortalityRecords);
if (remainingQuantity === 0 && batch.status === "active") {
  await updatePigBatch({ ...batch, status: "closed", updatedAt: now });
}
```

This is a practical product rule:

- zero after sale means sold out
- zero after loss means closed

## Tradeoff

The current implementation updates the selected batch after save. If an edit moves an old sale from one batch to another, we may later want to recalculate lifecycle for both the old and new batch. That would be a good future hardening task.

## Testing

`tests/calculations.test.ts` includes:

```ts
test("batch lifecycle summary derives sold out status when no pigs remain", () => {
  ...
});
```

That protects the central lifecycle rule.

## Interview Talking Point

"I improved batch lifecycle handling by deriving status from actual sales and mortality records, then using that derivation consistently in list filters, detail views, and save flows."

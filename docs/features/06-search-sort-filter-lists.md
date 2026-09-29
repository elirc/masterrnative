# Feature 06: Search, Sort, And Filter Lists

## What This Feature Adds

The record lists now support search and sorting, and some lists include filters. This makes the app more usable as data grows.

Main files:

- `src/components/ListControls.tsx`
- `src/screens/batches/BatchListScreen.tsx`
- `src/screens/transactions/FeedPurchaseListScreen.tsx`
- `src/screens/transactions/FeedUsageListScreen.tsx`
- `src/screens/transactions/ExpenseListScreen.tsx`
- `src/screens/transactions/SalesListScreen.tsx`
- `src/screens/transactions/MortalityListScreen.tsx`

## Senior Engineer Rationale

Instead of building search and sort controls separately in every screen, I created a reusable `ListControls` component.

The component handles the UI. Each screen still owns its filtering rules because each entity has different searchable fields.

This is a useful balance:

- Shared component for consistent UI.
- Screen-level logic for domain-specific behavior.

## Reusable Component

`ListControls` accepts:

```ts
interface ListControlsProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  sortValue: string;
  onSortChange: (value: string) => void;
  sortOptions: SelectOption[];
  filterValue?: string;
  onFilterChange?: (value: string) => void;
  filterOptions?: SelectOption[];
}
```

The optional filter props let simple lists use only search/sort, while richer lists like batches and expenses can add a filter.

## Batch List Example

`BatchListScreen` uses:

```ts
const [search, setSearch] = useState("");
const [sort, setSort] = useState<BatchSort>("newest");
const [statusFilter, setStatusFilter] = useState<BatchStatusFilter>("all");
```

Then it builds `visibleBatches`:

```ts
const visibleBatches = [...pigBatches]
  .filter((batch) => {
    const lifecycle = getBatchLifecycleSummary(batch, sales, mortalityRecords);
    const matchesStatus = statusFilter === "all" || lifecycle.derivedStatus === statusFilter;
    const matchesSearch =
      !normalizedSearch ||
      batch.name.toLowerCase().includes(normalizedSearch) ||
      batch.supplierName?.toLowerCase().includes(normalizedSearch) ||
      lifecycle.statusLabel.toLowerCase().includes(normalizedSearch);
    return matchesStatus && matchesSearch;
  });
```

This is a nice example for junior engineers because it shows a clear pipeline:

1. Start with all records.
2. Filter by status.
3. Filter by search text.
4. Sort based on the selected option.
5. Render the final list.

## Why Screen-Level Logic Is Okay Here

It might be tempting to create a universal `filterRecords` helper. But these lists search different fields:

- batches search name, supplier, status
- sales search batch and buyer
- expenses search category, batch, notes
- feed usage searches feed type, batch, notes

Keeping that logic in each screen keeps it readable and avoids over-abstracting too early.

## Empty State Behavior

Each list now distinguishes between no data and no matching results:

```tsx
title={expenses.length === 0 ? "No expenses recorded." : "No expenses match your filters."}
```

That gives the user better feedback. If data exists but filters hide it, the app says so.

## Interview Talking Point

"I introduced a reusable list-control component for consistent search/sort/filter UI, while keeping each screen's filtering logic close to the data it understands."

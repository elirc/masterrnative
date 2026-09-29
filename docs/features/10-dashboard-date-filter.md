# Feature 10: Dashboard Date Filter

## What This Feature Adds

Dashboard now has the same date-range filtering model as Reports. Users can switch the overview between all-time, this month, last month, and custom date ranges.

Main files:

- `src/screens/DashboardScreen.tsx`
- `src/components/DateRangeFilter.tsx`
- `src/utils/dates.ts`

## Senior Engineer Rationale

Dashboard is the first screen a user sees, so it should answer both "How is the business doing overall?" and "How is the business doing for the period I care about?"

We already built date-range helpers for Reports, so the correct engineering choice was reuse. We do not want a second version of month-filtering logic inside Dashboard.

## State Added To Dashboard

`DashboardScreen` now keeps three small pieces of UI state:

```ts
const [rangePreset, setRangePreset] = useState<DateRangePreset>("all_time");
const [customStartDate, setCustomStartDate] = useState("");
const [customEndDate, setCustomEndDate] = useState("");
```

The preset controls the normal options. The start/end fields only matter when the preset is `custom`.

## Turning UI State Into A Date Range

The screen calls:

```ts
const activeRange = getDateRangeForPreset(rangePreset, {
  startDate: customStartDate,
  endDate: customEndDate,
});
```

This is important because Dashboard does not know how to calculate "this month" or "last month." That logic belongs to `src/utils/dates.ts`.

## Filtering The Data

Each record type has a different date field:

```ts
const filteredSales = filterByDateRange(sales, (sale) => sale.saleDate, activeRange);
const filteredExpenses = filterByDateRange(expenses, (expense) => expense.expenseDate, activeRange);
const filteredFeedPurchases = filterByDateRange(feedPurchases, (purchase) => purchase.purchaseDate, activeRange);
```

This generic helper is reusable because the caller provides the date selector.

## What Is Filtered And What Is Not

The financial cards, chart, and recent activity use filtered data. Current active pigs still use all-time state because "current quantity" is a current operational number, not a period number.

This is a subtle product decision:

- Revenue this month should be filtered.
- Expenses this month should be filtered.
- Current active pigs should remain current.

## UI Wiring

The dashboard renders:

```tsx
<DateRangeFilter
  preset={rangePreset}
  onPresetChange={setRangePreset}
  startDate={customStartDate}
  endDate={customEndDate}
  onStartDateChange={setCustomStartDate}
  onEndDateChange={setCustomEndDate}
/>
```

This keeps the control reusable and avoids duplicating date picker markup.

## Interview Talking Point

"I reused the date-range utilities and DateRangeFilter component from Reports, then applied them to Dashboard financial summaries and recent activity. I intentionally left current pig counts unfiltered because they represent present inventory, not period activity."

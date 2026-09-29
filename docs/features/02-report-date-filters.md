# Feature 02: Report Date Filters

## What This Feature Adds

Reports now support date ranges: all time, this month, last month, and a custom start/end range. This makes the Reports screen more useful because users can answer time-based questions like:

- How profitable was this month?
- What were last month's expenses?
- Which batches had activity in a selected period?

Main files:

- `src/utils/dates.ts`
- `src/components/DateRangeFilter.tsx`
- `src/screens/reports/ReportsScreen.tsx`
- `tests/dates.test.ts`

## Senior Engineer Rationale

The date filtering logic belongs in `src/utils/dates.ts`, not inside `ReportsScreen`. This keeps the screen readable and gives us a testable utility layer.

A common junior mistake is to build filtering inline inside a component. That works at first, but it becomes hard to test and reuse. Here, the component asks the utility for a range and then filters records with a shared helper.

## Date Range Model

In `src/utils/dates.ts`, date ranges are represented as:

```ts
export interface DateRange {
  startDate?: string;
  endDate?: string;
}
```

The dates are strings in `YYYY-MM-DD` format. This format sorts lexicographically in the same order as calendar dates, so comparisons like `dateString < range.startDate` work safely as long as inputs stay in that format.

## Presets

The report presets are:

```ts
export type DateRangePreset = "all_time" | "this_month" | "last_month" | "custom";
```

The helper `getDateRangeForPreset` converts the selected preset into actual boundaries:

```ts
export function getDateRangeForPreset(
  preset: DateRangePreset,
  customRange: DateRange = {},
  now = new Date()
): DateRange {
  if (preset === "this_month") {
    return getMonthDateRange(now);
  }
}
```

The optional `now` parameter makes testing easier. In tests, we can pass a fixed date like `2026-05-11` and verify that "this month" means May 1 to May 31.

## Filtering Records

The generic helper is:

```ts
export function filterByDateRange<T>(
  items: T[],
  getDate: (item: T) => string,
  range: DateRange
): T[] {
  if (!range.startDate && !range.endDate) {
    return items;
  }

  return items.filter((item) => isDateInRange(getDate(item), range));
}
```

This is a good generic design. It does not know about sales, expenses, batches, or feed. The caller tells it how to get the date from each record.

Examples:

```ts
const filteredSales = filterByDateRange(sales, (sale) => sale.saleDate, activeRange);
const filteredExpenses = filterByDateRange(expenses, (expense) => expense.expenseDate, activeRange);
```

## UI Component

`src/components/DateRangeFilter.tsx` renders the controls:

```tsx
<AppSelect
  label="Report range"
  selectedValue={preset}
  onValueChange={(value) => onPresetChange(value as DateRangePreset)}
  options={presetOptions}
/>
```

When the user chooses `custom`, the component also shows two date inputs.

This component is reusable. If Dashboard later needs date filtering, we can reuse the same control there.

## Report Screen Integration

`ReportsScreen` keeps local UI state:

```ts
const [rangePreset, setRangePreset] = useState<DateRangePreset>("all_time");
const [customStartDate, setCustomStartDate] = useState("");
const [customEndDate, setCustomEndDate] = useState("");
```

Then it filters each entity by its date field:

```ts
const filteredFeedPurchases = filterByDateRange(feedPurchases, (purchase) => purchase.purchaseDate, activeRange);
const filteredSales = filterByDateRange(sales, (sale) => sale.saleDate, activeRange);
```

## Important Tradeoff

Batch performance uses all feed purchases to estimate feed unit cost, but filters feed usage by the report date range. This is intentional: if feed was purchased last month and used this month, this month's usage still needs an estimated cost. Otherwise the report would show feed usage with zero cost just because the purchase happened outside the selected period.

## Testing

`tests/dates.test.ts` covers:

- this-month boundaries
- last-month boundaries
- custom ranges
- inclusive filtering

## Interview Talking Point

"I extracted date-range logic into reusable utilities and kept the Reports screen focused on composing filtered datasets. This makes the feature easier to test and easier to reuse later."

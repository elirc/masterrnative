# Story 09: CSV Export From Settings

## User Story

As a farm owner or operator, I want to copy spreadsheet-ready CSV summaries from the Settings screen so that I can analyze batches, sales, expenses, and feed records outside the app without needing a backend export service.

## Why This Feature Exists

The app already has JSON backup/export. JSON is excellent for restoring app state because it preserves the exact data shape the app expects. It is not excellent for a normal business workflow. Most non-technical users want to paste data into Excel, Google Sheets, or a bookkeeping tool.

CSV export gives the project a more complete business story:

- JSON backup is for app restore.
- CSV export is for human reporting and spreadsheet analysis.
- Both can use the same local data already held by `AppDataContext`.

This is also a good interview feature because it touches several architectural layers without adding unnecessary complexity:

- Domain models from `src/types/models.ts`
- Business calculations from `src/utils/calculations.ts`
- Pure export helpers in `src/utils/exporters.ts`
- Settings UI and clipboard integration in `src/screens/settings/SettingsScreen.tsx`
- Unit tests in `tests/exporters.test.ts`

## Senior Engineering Approach

The most important design choice was to keep CSV generation outside the React screen.

The wrong shape would be to build CSV strings directly inside `SettingsScreen.tsx`. That would technically work, but it would mix three responsibilities:

- Reading app state from React context
- Formatting business records into export rows
- Copying text to the clipboard and showing alerts

Instead, this feature uses this split:

```text
SettingsScreen.tsx
  reads current app data
  calls createCsvExports(data)
  copies selected CSV to clipboard

exporters.ts
  converts domain data into CSV strings
  escapes CSV cells correctly
  reuses calculation helpers for derived numbers

calculations.ts
  remains the source of truth for profit, inventory, quantity, and feed-cost math
```

That gives us a cleaner mental model. The screen owns UI side effects. The utility module owns deterministic formatting. The calculation layer owns business math.

## Files Added Or Changed

### `src/utils/exporters.ts`

This is the main feature file. It contains the generic CSV helpers and the domain-specific export builders.

Key pieces:

```ts
export type CsvCell = string | number | boolean | null | undefined;

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => CsvCell;
}
```

This small abstraction prevents repeated CSV loops. A report defines its columns once, then `rowsToCsv` handles the common work.

For example, a simplified sales export column looks like this:

```ts
const salesCsvColumns: CsvColumn<SaleCsvRow>[] = [
  { header: "sale_id", value: (row) => row.id },
  { header: "batch_name", value: (row) => row.batchName },
  { header: "total_revenue", value: (row) => formatMoney(row.totalRevenue) },
];
```

A junior engineer should notice the pattern: every column knows how to pull one value from one row. This makes it easy to add a new CSV column later without rewriting the CSV engine.

### `escapeCsvCell`

CSV has a few sharp edges. A value containing a comma, quote, newline, carriage return, leading space, or trailing space must be quoted. Quotes inside the value must be doubled.

The helper:

```ts
export function escapeCsvCell(value: CsvCell): string {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);
  const shouldQuote = /[",\r\n]/.test(text) || /^\s|\s$/.test(text);

  if (!shouldQuote) {
    return text;
  }

  return `"${text.replace(/"/g, '""')}"`;
}
```

Example:

```ts
escapeCsvCell('Buyer, "Local"');
```

Outputs:

```csv
"Buyer, ""Local"""
```

That detail matters. Without correct escaping, a buyer name like `Buyer, "Local"` would break the spreadsheet into the wrong columns.

### `rowsToCsv`

The generic formatter is:

```ts
export function rowsToCsv<T>(columns: readonly CsvColumn<T>[], rows: readonly T[]): string {
  const header = columns.map((column) => escapeCsvCell(column.header)).join(",");
  const body = rows.map((row) => columns.map((column) => escapeCsvCell(column.value(row))).join(","));
  return [header, ...body].join("\n");
}
```

The important idea is that `rowsToCsv` does not know anything about pigs, feed, sales, or expenses. It only knows:

- How to create a header row
- How to map each row through each column
- How to escape each cell

That makes it a reusable primitive.

## Export Reports Implemented

### Batch Performance CSV

Built by:

```ts
createBatchCsv(data)
```

This export has one row per pig batch. It includes raw fields such as:

- `batch_id`
- `name`
- `status`
- `purchase_date`
- `initial_quantity`
- `purchase_price_per_pig`

It also includes derived fields:

- `current_quantity`
- `initial_pig_cost`
- `revenue`
- `batch_expenses`
- `feed_usage_cost`
- `estimated_profit`

This is where file connections become important. The exporter does not calculate those numbers itself. It calls the existing business functions:

```ts
currentQuantity: getBatchCurrentQuantity(batch, data.sales, data.mortalityRecords),
initialPigCost: getInitialPigCost(batch),
revenue: getBatchRevenue(batch.id, data.sales),
batchExpenses: getBatchSpecificExpenses(batch.id, data.expenses),
feedUsageCost: getBatchFeedUsageCost(batch.id, data.feedPurchases, data.feedUsages),
estimatedProfit: getBatchEstimatedProfit(
  batch,
  data.sales,
  data.expenses,
  data.mortalityRecords,
  data.feedPurchases,
  data.feedUsages
),
```

This keeps the app consistent. If the dashboard says a batch has a certain profit, the CSV should not invent a different formula.

### Sales CSV

Built by:

```ts
createSalesCsv(data)
```

This export has one row per sale. It includes:

- `sale_id`
- `batch_id`
- `batch_name`
- `sale_date`
- `quantity_sold`
- `pricing_mode`
- `total_weight_kg`
- `price_per_kg`
- `total_revenue`
- `buyer_name`
- `notes`

Notice that sales records only store `batchId`, not `batchName`. The exporter enriches each sale row by looking up the batch:

```ts
batchName: getBatchName(data.pigBatches, sale.batchId)
```

This is a common pattern in local-first apps. The normalized app data stores references by ID. User-facing reports often denormalize those references for readability.

### Expenses CSV

Built by:

```ts
createExpensesCsv(data)
```

This export has one row per expense. Expenses can be batch-specific or general. For general expenses, the CSV uses `General` as the batch name.

```ts
batchName: expense.batchId ? getBatchName(data.pigBatches, expense.batchId) : "General"
```

This avoids leaving the spreadsheet reader guessing why the batch column is empty.

### Feed Inventory CSV

Built by:

```ts
createFeedInventoryCsv(data)
```

This export reuses:

```ts
getFeedInventorySummary(data.feedPurchases, data.feedUsages)
```

That helper groups inventory by feed type and unit. The CSV includes:

- `feed_type`
- `unit`
- `purchased_quantity`
- `used_quantity`
- `remaining_quantity`
- `total_purchase_cost`
- `average_cost_per_unit`
- `remaining_value`

This is useful because feed inventory is not stored as a first-class table. It is derived from feed purchases minus feed usage.

### Feed Transactions CSV

Built by:

```ts
createFeedTransactionsCsv(data)
```

This export combines two different models:

- `FeedPurchase`
- `FeedUsage`

The normalized app stores those separately because they are different business events. The CSV combines them because spreadsheet users often want one timeline.

Purchase rows include supplier and actual cost:

```ts
{
  transactionType: "purchase",
  date: purchase.purchaseDate,
  quantity: purchase.quantity,
  costPerUnit: purchase.costPerUnit,
  totalCost: purchase.quantity * purchase.costPerUnit,
}
```

Usage rows include batch and estimated cost:

```ts
{
  transactionType: "usage",
  date: usage.usageDate,
  quantity: usage.quantityUsed,
  totalCost: getFeedUsageEstimatedCost(usage, data.feedPurchases),
}
```

This is a good example of an export being more analysis-friendly than the raw database shape.

## Settings Screen Integration

The Settings screen now reads all app data from context:

```ts
const {
  pigBatches,
  feedPurchases,
  feedUsages,
  expenses,
  sales,
  mortalityRecords,
  exportData,
  importData,
  clearData,
  loadSampleData,
} = useAppData();
```

Then it packages only the domain arrays into a `BackupData` object:

```ts
const currentData = useMemo<BackupData>(
  () => ({
    pigBatches,
    feedPurchases,
    feedUsages,
    expenses,
    sales,
    mortalityRecords,
  }),
  [expenses, feedPurchases, feedUsages, mortalityRecords, pigBatches, sales]
);
```

This is important because `useAppData()` also returns functions like `addSale`, `clearData`, and `importData`. The CSV builders should receive only the data collections, not the whole context object.

The screen then builds the export list:

```ts
const csvExports = useMemo(() => createCsvExports(currentData), [currentData]);
```

`useMemo` is not required for correctness, but it is appropriate here because CSV strings are derived data. They only need to be rebuilt when the underlying app data changes.

The copy handler stays in the screen because clipboard access is a UI side effect:

```ts
const handleCopyCsv = async (csvExport: CsvExport) => {
  await Clipboard.setStringAsync(csvExport.csv);
};
```

The senior-level rule is: pure transformation in utilities, platform side effects in screens.

## Tests

The tests live in:

```text
tests/exporters.test.ts
```

High-value tests added:

1. CSV escaping handles commas, quotes, newlines, leading spaces, and undefined values.
2. Backup count helpers count every top-level collection.
3. CSV export bundle returns the expected five reports.
4. Generated CSV includes escaped real-world values like `Batch "A", North`.

Example test:

```ts
assert.equal(escapeCsvCell('Batch "A", North'), '"Batch ""A"", North"');
```

This is a tiny test, but it protects a very real bug. CSV escaping mistakes are easy to miss in manual app testing because the UI can look fine while the spreadsheet import is broken.

## Why Copy To Clipboard Instead Of Writing Files

The project already uses `expo-clipboard`, and the Settings screen already depends on it for JSON backups. Clipboard export keeps the story simple:

- No new native file-system permissions
- No platform-specific save dialogs
- Easy to demo quickly
- Works well for small MVP data sets

A production version could add file download/share support later, but clipboard export is a good MVP step.

## Interview Talking Points

You can explain the feature like this:

> I added CSV exports from Settings so the local app data can move into spreadsheets. I kept export formatting in a pure utility module and left clipboard behavior in the Settings screen. The CSV builders reuse the existing calculation utilities, so exported batch profit and feed inventory match what the dashboard and reports show. I also added unit tests for CSV escaping and backup count helpers because export bugs are often formatting bugs that are easy to miss manually.

## Future Improvements

Good next steps:

- Add a native share sheet or file download flow for CSV files.
- Let the user choose a date range before exporting.
- Add a single zip-style export if the app later gains file-system support.
- Add CSV import only if there is a clear product need. CSV import is much riskier than export because it must validate and reconcile user-edited spreadsheet data.

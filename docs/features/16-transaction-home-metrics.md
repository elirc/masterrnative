# Feature 16: Transaction Home Metrics

## What This Feature Adds

The Transactions home screen now shows a small summary for each module. Instead of only being a menu, it gives quick operational context:

- feed inventory alerts
- feed purchase count and latest purchase date
- feed usage count and latest usage date
- total expense amount
- total sales revenue
- mortality count

Main file:

- `src/screens/transactions/TransactionsHomeScreen.tsx`

## Senior Engineer Rationale

Navigation screens should not be dead ends. A good section landing page should help the user decide where to go next.

For example, if Feed Inventory shows "2 alerts," the user has a reason to open that module. If Sales shows total revenue, the user gets useful information even before tapping.

## Data Hook

The screen defines a local helper hook:

```ts
function useTransactionHomeData() {
  const { feedPurchases, feedUsages, expenses, sales, mortalityRecords } = useAppData();

  return {
    feedPurchases,
    feedUsages,
    expenses,
    sales,
    mortalityRecords,
    feedInventory: getFeedInventorySummary(feedPurchases, feedUsages),
    latestFeedPurchaseDate: getLatestDate(feedPurchases.map((purchase) => purchase.purchaseDate)),
  };
}
```

This keeps data preparation separate from rendering. The component can say `const data = useTransactionHomeData()` and then render cards.

## Module Configuration

Each transaction module now has two display functions:

```ts
{
  title: "Sales",
  description: "Record sales by weight or fixed total price.",
  route: "SalesList",
  getMeta: ({ latestSaleDate }) => latestSaleDate ? `Latest ${formatDisplayDate(latestSaleDate)}` : "No sales yet",
  getValue: ({ sales }) => formatCurrency(getTotalRevenue(sales)),
}
```

This is a configuration-driven UI. Adding another transaction module means adding one object to the `transactionModules` array.

## Why Use Functions In The Config?

The data changes as the user adds records. If we put fixed strings in the array, they would not react to current app state.

Using functions lets each module compute its own display value from live context data:

```ts
getValue: ({ expenses }) => formatCurrency(getTotalOtherExpenses(expenses))
```

## Rendering

The screen maps over `transactionModules`:

```tsx
{transactionModules.map((item) => (
  <AppCard key={item.route} onPress={() => navigation.navigate(item.route)} style={styles.card}>
    <View style={styles.cardHeader}>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.value}>{item.getValue(data)}</Text>
    </View>
    <Text style={styles.description}>{item.description}</Text>
    <Text style={styles.meta}>{item.getMeta(data)}</Text>
  </AppCard>
))}
```

This keeps the rendering loop simple. The per-module differences live in configuration.

## Interview Talking Point

"I upgraded the Transactions landing screen from a static menu to a lightweight operational summary. The screen still navigates to each module, but now it also surfaces counts, totals, and latest activity using the shared context and calculation helpers."

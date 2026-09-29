# Feature 04: Feed Inventory Screen With Low-Stock Warnings

## What This Feature Adds

The app now has a dedicated Feed Inventory screen under Transactions. It shows:

- feed groups
- purchased quantity
- used quantity
- remaining quantity
- average cost
- remaining inventory value
- low/empty/negative inventory status

Main files:

- `src/screens/transactions/FeedInventoryScreen.tsx`
- `src/navigation/types.ts`
- `src/navigation/AppNavigator.tsx`
- `src/screens/transactions/TransactionsHomeScreen.tsx`
- `src/utils/calculations.ts`

## Senior Engineer Rationale

Feed inventory already existed as derived data in Dashboard and Reports, but it deserved its own workflow. A farmer or business owner may want to answer, "What feed do I still have available?" without opening a report.

The key architectural choice is that the screen does not maintain separate inventory state. Inventory is derived from feed purchases and feed usage:

```ts
const inventory = getFeedInventorySummary(feedPurchases, feedUsages);
```

This avoids duplicate data. If we stored remaining inventory directly, we would have to keep it in sync every time a purchase or usage record changed.

## Calculation Layer

`getFeedInventorySummary` groups feed purchases and usage by feed type and unit. It now returns richer objects:

```ts
{
  feedType: "Starter Feed",
  unit: "sack",
  purchasedQuantity: 15,
  usedQuantity: 3,
  remainingQuantity: 12,
  totalPurchaseCost: 17000,
  averageCostPerUnit: 1133.33,
  remainingValue: 13600
}
```

The screen can render those values without knowing how they were calculated.

## Inventory Health

The helper `getInventoryHealth` classifies each inventory group:

```ts
export function getInventoryHealth(item: FeedInventoryItem): InventoryHealth {
  if (item.remainingQuantity < 0) return "negative";
  if (item.remainingQuantity === 0) return "empty";
  if (item.purchasedQuantity > 0 && item.remainingQuantity / item.purchasedQuantity <= 0.2) return "low";
  return "healthy";
}
```

The order matters:

1. Negative inventory is the most urgent.
2. Empty inventory is also important.
3. Low inventory catches records below 20%.
4. Everything else is healthy.

## Navigation Wiring

`src/navigation/types.ts` adds:

```ts
FeedInventory: undefined;
```

That means the screen takes no route params.

`AppNavigator.tsx` registers the screen:

```tsx
<TransactionsStack.Screen
  name="FeedInventory"
  component={FeedInventoryScreen}
  options={{ title: "Feed Inventory" }}
/>
```

`TransactionsHomeScreen` adds a card that navigates there.

## UI Behavior

The Feed Inventory screen sorts urgent items first:

```ts
const healthOrder = { negative: 0, empty: 1, low: 2, healthy: 3 };
```

This is a small but important product choice. If inventory is overused or empty, the user sees it at the top instead of buried alphabetically.

## Interview Talking Point

"I added a dedicated inventory screen, but kept inventory derived from purchases and usage instead of storing duplicate remaining quantities. That keeps the data model simpler and reduces sync bugs."

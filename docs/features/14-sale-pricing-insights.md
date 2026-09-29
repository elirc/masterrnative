# Feature 14: Sale Pricing Insights

## What This Feature Adds

`SaleFormScreen` now shows pricing insights while a sale is being entered. For weight-based sales, the screen shows:

- calculated revenue
- average weight per pig
- average revenue per pig

For fixed-total sales, the screen shows:

- total revenue
- average revenue per pig

Main file:

- `src/screens/transactions/SaleFormScreen.tsx`

## Senior Engineer Rationale

Sales are one of the highest-value workflows in the app. If a user enters the wrong sale amount, the dashboard, reports, and batch profit all become wrong. So the form should help the user sanity-check the numbers before saving.

This feature follows a simple principle:

Forms should validate impossible input, but they should also preview meaningful derived values so users can catch suspicious input themselves.

For example, the app can validate that `quantitySold` is positive, but it cannot always know whether a sale price is realistic. Showing revenue per pig helps the user notice something like:

```txt
Average revenue / pig: PHP 450.00
```

If pigs usually sell for much more than that, the user can catch the mistake before saving.

## Existing Sale Model

The sale model in `src/types/models.ts` supports two pricing modes:

```ts
export type SalePricingMode = "by_weight" | "fixed_total";
```

A weight-based sale uses:

```ts
totalWeightKg
pricePerKg
```

A fixed-total sale uses:

```ts
totalRevenue
```

Both modes eventually produce one persisted value:

```ts
totalRevenue: number
```

That is the value reports and dashboard calculations use.

## Form Values Watched

In `src/screens/transactions/SaleFormScreen.tsx`, the screen watches the active form fields:

```ts
const pricingMode = watch("pricingMode");
const quantitySold = Number(watch("quantitySold") ?? 0);
const totalWeightKg = Number(watch("totalWeightKg") ?? 0);
const pricePerKg = Number(watch("pricePerKg") ?? 0);
const fixedTotalRevenue = Number(watch("totalRevenue") ?? 0);
```

This is the same pattern as the feed cost preview. The screen does not wait until submit. It reacts to the draft form state.

## Derived Pricing Values

The screen calculates revenue differently depending on the pricing mode:

```ts
const calculatedRevenue = totalWeightKg > 0 && pricePerKg > 0 ? totalWeightKg * pricePerKg : 0;
const previewRevenue = pricingMode === "by_weight" ? calculatedRevenue : fixedTotalRevenue;
```

Then it calculates per-pig insights:

```ts
const averageWeightPerPig = quantitySold > 0 && totalWeightKg > 0 ? totalWeightKg / quantitySold : 0;
const averageRevenuePerPig = quantitySold > 0 && previewRevenue > 0 ? previewRevenue / quantitySold : 0;
```

The guard checks matter. We only divide when the denominator is positive. That avoids `Infinity`, `NaN`, and weird UI output while the user is halfway through filling the form.

## Weight-Based Sale UI

For a weight-based sale, the form renders this card:

```tsx
<AppCard style={styles.calculatedCard}>
  <Text style={styles.calculatedLabel}>Pricing insights</Text>
  <View style={styles.insightRow}>
    <Text style={styles.insightLabel}>Calculated revenue</Text>
    <Text style={styles.insightValue}>{formatCurrency(calculatedRevenue)}</Text>
  </View>
  <View style={styles.insightRow}>
    <Text style={styles.insightLabel}>Average weight / pig</Text>
    <Text style={styles.insightValue}>
      {averageWeightPerPig > 0 ? `${averageWeightPerPig.toFixed(1)} kg` : "0 kg"}
    </Text>
  </View>
  <View style={styles.insightRow}>
    <Text style={styles.insightLabel}>Average revenue / pig</Text>
    <Text style={styles.insightValue}>{formatCurrency(averageRevenuePerPig)}</Text>
  </View>
</AppCard>
```

This card answers three questions:

- What will this sale record as revenue?
- How heavy is each pig on average?
- How much revenue is each pig generating?

## Fixed-Total Sale UI

For a fixed-total sale, the user may not know the total weight. In that case, average weight per pig would be misleading, so the form only shows revenue-focused insights:

```tsx
<AppCard style={styles.calculatedCard}>
  <Text style={styles.calculatedLabel}>Pricing insights</Text>
  <View style={styles.insightRow}>
    <Text style={styles.insightLabel}>Total revenue</Text>
    <Text style={styles.insightValue}>{formatCurrency(fixedTotalRevenue)}</Text>
  </View>
  <View style={styles.insightRow}>
    <Text style={styles.insightLabel}>Average revenue / pig</Text>
    <Text style={styles.insightValue}>{formatCurrency(averageRevenuePerPig)}</Text>
  </View>
</AppCard>
```

This is a good example of conditional UI. The app shows only the metrics that are meaningful for the selected pricing mode.

## How This Connects To Save Logic

The save logic already normalizes both pricing modes into one `Sale` object:

```ts
const revenue =
  values.pricingMode === "by_weight"
    ? Number(values.totalWeightKg ?? 0) * Number(values.pricePerKg ?? 0)
    : Number(values.totalRevenue ?? 0);
```

The pricing insight card mirrors that same formula. That consistency is important. The preview should match what gets saved.

If a junior engineer changes sale revenue logic later, they should check both:

- the preview calculation near the `watch` calls
- the `revenue` calculation inside `onSubmit`

If those drift apart, the form could preview one value and save another.

## Why This Is Good For The Demo

This feature makes the app feel more polished because the form does real-time business math. During a demo, enter:

```txt
Quantity sold: 2
Total weight: 180
Price per kg: 190
```

The screen previews:

```txt
Calculated revenue: PHP 34,200.00
Average weight / pig: 90.0 kg
Average revenue / pig: PHP 17,100.00
```

That is easy to explain and visually reinforces that the app understands the business workflow.

## Interview Talking Point

"I enhanced the sale form so users can sanity-check sale pricing before saving. The form watches draft inputs, derives calculated revenue and per-pig metrics, and uses the same formula as the persisted save logic so the preview and stored data stay aligned."

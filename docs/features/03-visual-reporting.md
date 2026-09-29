# Feature 03: Visual Reporting And UI Polish

## What This Feature Adds

The app now has simple bar-chart style visual summaries on Dashboard and Reports. These improve demo quality because the interviewer can quickly see revenue, expenses, profit/loss, and top expense categories without reading every number.

Main files:

- `src/components/SimpleBarChart.tsx`
- `src/screens/DashboardScreen.tsx`
- `src/screens/reports/ReportsScreen.tsx`

## Senior Engineer Rationale

For this project, I chose a small custom chart component instead of adding more chart-library complexity. The app already has simple reporting needs: compare a few values, not render complicated analytics.

The custom component has three advantages:

1. It works consistently in React Native and React Native Web.
2. It has a small API that junior engineers can understand quickly.
3. It keeps the visual system aligned with existing `colors`, `AppCard`, and `SummaryCard` styling.

## Component API

`SimpleBarChart` takes a title, data, and an optional formatter:

```tsx
<SimpleBarChart
  title="Revenue vs expenses"
  data={[
    { label: "Revenue", value: totalRevenue, color: colors.positive },
    { label: "Expenses", value: totalExpenses, color: colors.negative },
  ]}
  formatValue={formatCurrency}
/>
```

This is easy to read: the screen decides what data matters, and the component decides how to draw it.

## Implementation Detail

Inside `SimpleBarChart`, the largest absolute value becomes the scale:

```ts
const maxValue = Math.max(...data.map((item) => Math.abs(item.value)), 1);
```

The `1` fallback prevents division by zero when every value is `0`.

Each bar width is calculated as a percentage:

```ts
const width = `${Math.max((Math.abs(item.value) / maxValue) * 100, item.value === 0 ? 0 : 5)}%` as DimensionValue;
```

That expression does two useful things:

- It scales values relative to the largest value.
- It gives non-zero values at least `5%` width so tiny values remain visible.

## Dashboard Integration

`DashboardScreen` now renders a "Financial pulse" chart after the summary cards. It compares:

- revenue
- expenses
- profit or loss

This makes Dashboard feel more like an executive overview.

## Reports Integration

`ReportsScreen` uses `SimpleBarChart` for:

- revenue vs expenses
- top expense categories

This improves the reporting story. Instead of only showing cards and lists, the screen now gives a visual comparison.

## Design Thinking

The app still uses a restrained business-tool design. We are not making a marketing page. The visuals are quiet, compact, and connected to decision-making. This is the right design direction for an operational app.

## Interview Talking Point

"I added lightweight chart components to make the app easier to understand during a demo, but kept the implementation simple and reusable. The screens provide data, and the chart component handles presentation."

import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AppCard } from "../../components/AppCard";
import { CurrencyText } from "../../components/CurrencyText";
import { DateRangeFilter } from "../../components/DateRangeFilter";
import { EmptyState } from "../../components/EmptyState";
import { Screen } from "../../components/Screen";
import { SimpleBarChart } from "../../components/SimpleBarChart";
import { SummaryCard } from "../../components/SummaryCard";
import { EXPENSE_CATEGORY_LABELS, EXPENSE_CATEGORIES } from "../../constants/categories";
import { colors } from "../../constants/colors";
import { useAppData } from "../../context/AppDataContext";
import {
  getBatchFeedUsageCost,
  getBatchCurrentQuantity,
  getBatchEstimatedProfit,
  getBatchRevenue,
  getBatchSpecificExpenses,
  getEstimatedNetProfit,
  getExpenseTotalsByCategory,
  getFeedInventorySummary,
  getTotalExpenses,
  getTotalFeedPurchaseCost,
  getTotalOtherExpenses,
  getTotalPigPurchaseCost,
  getTotalRevenue,
} from "../../utils/calculations";
import { formatCurrency } from "../../utils/currency";
import { DateRangePreset, filterByDateRange, getDateRangeForPreset } from "../../utils/dates";

export function ReportsScreen() {
  const { pigBatches, feedPurchases, feedUsages, expenses, sales, mortalityRecords } = useAppData();
  const [rangePreset, setRangePreset] = useState<DateRangePreset>("all_time");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const activeRange = getDateRangeForPreset(rangePreset, {
    startDate: customStartDate,
    endDate: customEndDate,
  });
  const filteredBatches = filterByDateRange(pigBatches, (batch) => batch.purchaseDate, activeRange);
  const filteredFeedPurchases = filterByDateRange(feedPurchases, (purchase) => purchase.purchaseDate, activeRange);
  const filteredFeedUsages = filterByDateRange(feedUsages, (usage) => usage.usageDate, activeRange);
  const filteredExpenses = filterByDateRange(expenses, (expense) => expense.expenseDate, activeRange);
  const filteredSales = filterByDateRange(sales, (sale) => sale.saleDate, activeRange);
  const filteredMortalityRecords = filterByDateRange(mortalityRecords, (record) => record.lossDate, activeRange);
  const activeBatchIds = new Set([
    ...filteredBatches.map((batch) => batch.id),
    ...filteredSales.map((sale) => sale.batchId),
    ...filteredExpenses.flatMap((expense) => (expense.batchId ? [expense.batchId] : [])),
    ...filteredFeedUsages.map((usage) => usage.batchId),
    ...filteredMortalityRecords.map((record) => record.batchId),
  ]);
  const reportBatches =
    !activeRange.startDate && !activeRange.endDate
      ? pigBatches
      : pigBatches.filter((batch) => activeBatchIds.has(batch.id));

  const totalPigPurchaseCost = getTotalPigPurchaseCost(filteredBatches);
  const totalFeedPurchaseCost = getTotalFeedPurchaseCost(filteredFeedPurchases);
  const totalOtherExpenses = getTotalOtherExpenses(filteredExpenses);
  const totalRevenue = getTotalRevenue(filteredSales);
  const totalExpenses = getTotalExpenses(filteredBatches, filteredFeedPurchases, filteredExpenses);
  const estimatedNetProfit = getEstimatedNetProfit(filteredBatches, filteredFeedPurchases, filteredExpenses, filteredSales);
  const expenseTotals = getExpenseTotalsByCategory(filteredExpenses);
  const feedInventory = getFeedInventorySummary(filteredFeedPurchases, filteredFeedUsages);
  const topExpenseCategories = EXPENSE_CATEGORIES.filter((category) => expenseTotals[category] > 0)
    .map((category) => ({
      label: EXPENSE_CATEGORY_LABELS[category],
      value: expenseTotals[category],
      color: colors.negative,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  return (
    <Screen>
      <Text style={styles.title}>Profit summary</Text>
      <AppCard style={styles.reportCard}>
        <DateRangeFilter
          preset={rangePreset}
          onPresetChange={setRangePreset}
          startDate={customStartDate}
          endDate={customEndDate}
          onStartDateChange={setCustomStartDate}
          onEndDateChange={setCustomEndDate}
        />
      </AppCard>

      <View style={styles.summaryGrid}>
        <SummaryCard title="Pig Purchase Cost" value={formatCurrency(totalPigPurchaseCost)} variant="negative" />
        <SummaryCard title="Feed Purchase Cost" value={formatCurrency(totalFeedPurchaseCost)} variant="negative" />
        <SummaryCard title="Other Expenses" value={formatCurrency(totalOtherExpenses)} variant="negative" />
        <SummaryCard title="Total Revenue" value={formatCurrency(totalRevenue)} variant="positive" />
        <SummaryCard title="Total Expenses" value={formatCurrency(totalExpenses)} variant="negative" />
        <SummaryCard
          title="Estimated Net Profit"
          value={formatCurrency(estimatedNetProfit)}
          variant={estimatedNetProfit >= 0 ? "positive" : "negative"}
        />
      </View>

      <SimpleBarChart
        title="Revenue vs expenses"
        data={[
          { label: "Revenue", value: totalRevenue, color: colors.positive },
          { label: "Expenses", value: totalExpenses, color: colors.negative },
          {
            label: estimatedNetProfit >= 0 ? "Net profit" : "Net loss",
            value: Math.abs(estimatedNetProfit),
            color: estimatedNetProfit >= 0 ? colors.primary : colors.warning,
          },
        ]}
        formatValue={formatCurrency}
      />

      <Section title="Batch performance">
        {reportBatches.length === 0 ? (
          <EmptyState title="No batches yet." message="Add a batch to see batch performance." />
        ) : (
          reportBatches.map((batch) => {
            const feedCost = getBatchFeedUsageCost(batch.id, feedPurchases, filteredFeedUsages);
            const profit = getBatchEstimatedProfit(
              batch,
              filteredSales,
              filteredExpenses,
              filteredMortalityRecords,
              feedPurchases,
              filteredFeedUsages
            );
            return (
              <AppCard key={batch.id} style={styles.reportCard}>
                <View style={styles.row}>
                  <View style={styles.main}>
                    <Text style={styles.cardTitle}>{batch.name}</Text>
                    <Text style={styles.meta}>Current quantity: {getBatchCurrentQuantity(batch, sales, mortalityRecords)}</Text>
                    <Text style={styles.meta}>Revenue: {formatCurrency(getBatchRevenue(batch.id, filteredSales))}</Text>
                    <Text style={styles.meta}>Batch expenses: {formatCurrency(getBatchSpecificExpenses(batch.id, filteredExpenses))}</Text>
                    <Text style={styles.meta}>Allocated feed cost: {formatCurrency(feedCost)}</Text>
                  </View>
                  <CurrencyText amount={profit} variant={profit >= 0 ? "positive" : "negative"} style={styles.amount} />
                </View>
              </AppCard>
            );
          })
        )}
      </Section>

      <Section title="Expense breakdown">
        {filteredExpenses.length === 0 ? (
          <Text style={styles.emptyLine}>No expenses recorded.</Text>
        ) : (
          EXPENSE_CATEGORIES.filter((category) => expenseTotals[category] > 0).map((category) => (
            <AppCard key={category} style={styles.compactCard}>
              <Text style={styles.cardTitle}>{EXPENSE_CATEGORY_LABELS[category]}</Text>
              <CurrencyText amount={expenseTotals[category]} variant="negative" style={styles.amount} />
            </AppCard>
          ))
        )}
      </Section>

      {topExpenseCategories.length > 0 ? (
        <SimpleBarChart title="Top expense categories" data={topExpenseCategories} formatValue={formatCurrency} />
      ) : null}

      <Section title="Feed summary">
        {feedInventory.length === 0 ? (
          <Text style={styles.emptyLine}>No feed purchases or usage yet.</Text>
        ) : (
          feedInventory.map((item) => (
            <AppCard key={`${item.feedType}-${item.unit}`} style={styles.reportCard}>
              <Text style={styles.cardTitle}>{item.feedType} - {item.unit}</Text>
              <Text style={styles.meta}>Purchased: {item.purchasedQuantity} {item.unit}</Text>
              <Text style={styles.meta}>Used: {item.usedQuantity} {item.unit}</Text>
              <Text style={styles.meta}>Remaining: {item.remainingQuantity} {item.unit}</Text>
              <Text style={styles.meta}>Purchase cost: {formatCurrency(item.totalPurchaseCost)}</Text>
              <Text style={styles.meta}>Average cost: {formatCurrency(item.averageCostPerUnit)} / {item.unit}</Text>
            </AppCard>
          ))
        )}
      </Section>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "900",
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
  },
  sectionBody: {
    gap: 8,
  },
  reportCard: {
    gap: 6,
  },
  compactCard: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  row: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  main: {
    flex: 1,
    gap: 3,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900",
  },
  meta: {
    color: colors.mutedText,
    fontSize: 13,
  },
  amount: {
    fontSize: 15,
  },
  emptyLine: {
    color: colors.mutedText,
    fontSize: 14,
  },
});

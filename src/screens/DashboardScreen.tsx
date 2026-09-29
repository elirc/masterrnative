import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AppCard } from "../components/AppCard";
import { DateRangeFilter } from "../components/DateRangeFilter";
import { EmptyState } from "../components/EmptyState";
import { Screen } from "../components/Screen";
import { SimpleBarChart } from "../components/SimpleBarChart";
import { SummaryCard } from "../components/SummaryCard";
import { EXPENSE_CATEGORY_LABELS } from "../constants/categories";
import { colors } from "../constants/colors";
import { useAppData } from "../context/AppDataContext";
import {
  getBatchCurrentQuantity,
  getEstimatedNetProfit,
  getFeedInventorySummary,
  getInventoryHealth,
  getTotalExpenses,
  getTotalRevenue,
} from "../utils/calculations";
import { formatCurrency } from "../utils/currency";
import {
  DateRangePreset,
  filterByDateRange,
  getDateRangeForPreset,
  formatDisplayDate,
} from "../utils/dates";

interface ActivityItem {
  id: string;
  type: string;
  date: string;
  amount?: number;
  quantity?: string;
  description: string;
}

export function DashboardScreen() {
  const [rangePreset, setRangePreset] = useState<DateRangePreset>("all_time");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const {
    pigBatches,
    feedPurchases,
    feedUsages,
    expenses,
    sales,
    mortalityRecords,
    isLoading,
  } = useAppData();

  const activeBatches = pigBatches.filter((batch) => batch.status === "active");
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
  const currentActivePigs = activeBatches.reduce(
    (total, batch) => total + getBatchCurrentQuantity(batch, sales, mortalityRecords),
    0
  );
  const totalRevenue = getTotalRevenue(filteredSales);
  const totalExpenses = getTotalExpenses(filteredBatches, filteredFeedPurchases, filteredExpenses);
  const netProfit = getEstimatedNetProfit(filteredBatches, filteredFeedPurchases, filteredExpenses, filteredSales);
  const feedInventory = getFeedInventorySummary(feedPurchases, feedUsages);
  const feedWarnings = feedInventory.filter((item) => ["low", "empty", "negative"].includes(getInventoryHealth(item)));
  const feedRemainingSubtitle = feedInventory
    .slice(0, 2)
    .map((item) => `${item.feedType}: ${item.remainingQuantity} ${item.unit}`)
    .join(" • ");

  const getBatchName = (batchId: string) => pigBatches.find((batch) => batch.id === batchId)?.name ?? "Unknown batch";

  const recentActivity: ActivityItem[] = [
    ...filteredSales.map((sale) => ({
      id: sale.id,
      type: "Sale",
      date: sale.saleDate,
      amount: sale.totalRevenue,
      description: getBatchName(sale.batchId),
    })),
    ...filteredExpenses.map((expense) => ({
      id: expense.id,
      type: "Expense",
      date: expense.expenseDate,
      amount: expense.amount,
      description: `${EXPENSE_CATEGORY_LABELS[expense.category]}${expense.batchId ? ` • ${getBatchName(expense.batchId)}` : ""}`,
    })),
    ...filteredFeedPurchases.map((purchase) => ({
      id: purchase.id,
      type: "Feed Purchase",
      date: purchase.purchaseDate,
      amount: purchase.quantity * purchase.costPerUnit,
      description: `${purchase.feedType} • ${purchase.quantity} ${purchase.unit}`,
    })),
    ...filteredFeedUsages.map((usage) => ({
      id: usage.id,
      type: "Feed Usage",
      date: usage.usageDate,
      quantity: `${usage.quantityUsed} ${usage.unit}`,
      description: `${usage.feedType} • ${getBatchName(usage.batchId)}`,
    })),
    ...filteredMortalityRecords.map((record) => ({
      id: record.id,
      type: "Mortality",
      date: record.lossDate,
      quantity: `${record.quantityLost} pigs`,
      description: `${getBatchName(record.batchId)}${record.reason ? ` • ${record.reason}` : ""}`,
    })),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 8);

  if (isLoading) {
    return (
      <Screen>
        <Text style={styles.muted}>Loading piggery data...</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.kicker}>Piggery Tracker</Text>
        <Text style={styles.title}>Business overview</Text>
      </View>

      <AppCard style={styles.filterCard}>
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
        <SummaryCard title="Current Active Pigs" value={String(currentActivePigs)} subtitle="Across active batches" />
        <SummaryCard title="Active Batches" value={String(activeBatches.length)} subtitle={`${pigBatches.length} total batches`} />
        <SummaryCard title="Total Revenue" value={formatCurrency(totalRevenue)} variant="positive" />
        <SummaryCard title="Total Expenses" value={formatCurrency(totalExpenses)} variant="negative" />
        <SummaryCard
          title="Estimated Net Profit"
          value={formatCurrency(netProfit)}
          variant={netProfit >= 0 ? "positive" : "negative"}
        />
        <SummaryCard
          title="Feed Remaining"
          value={`${feedInventory.length} groups`}
          subtitle={feedRemainingSubtitle || "No feed inventory yet"}
        />
      </View>

      <SimpleBarChart
        title="Financial pulse"
        data={[
          { label: "Revenue", value: totalRevenue, color: colors.positive },
          { label: "Expenses", value: totalExpenses, color: colors.negative },
          { label: netProfit >= 0 ? "Profit" : "Loss", value: Math.abs(netProfit), color: netProfit >= 0 ? colors.primary : colors.warning },
        ]}
        formatValue={formatCurrency}
      />

      {feedWarnings.length > 0 ? (
        <AppCard style={styles.warningCard}>
          <Text style={styles.warningTitle}>Feed inventory needs attention</Text>
          {feedWarnings.slice(0, 3).map((item) => (
            <Text key={`${item.feedType}-${item.unit}`} style={styles.warningLine}>
              {item.feedType}: {item.remainingQuantity} {item.unit} remaining
            </Text>
          ))}
        </AppCard>
      ) : null}

      <Text style={styles.sectionTitle}>Recent activity</Text>
      {recentActivity.length === 0 ? (
        <EmptyState title="No activity yet." message="Add a batch or transaction to start tracking the business." />
      ) : (
        recentActivity.map((item) => (
          <AppCard key={`${item.type}-${item.id}`}>
            <View style={styles.activityRow}>
              <View style={styles.activityMain}>
                <Text style={styles.activityType}>{item.type}</Text>
                <Text style={styles.activityDescription}>{item.description}</Text>
                <Text style={styles.activityDate}>{formatDisplayDate(item.date)}</Text>
              </View>
              <Text style={styles.activityValue}>
                {item.amount !== undefined ? formatCurrency(item.amount) : item.quantity}
              </Text>
            </View>
          </AppCard>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 2,
  },
  kicker: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: "900",
  },
  muted: {
    color: colors.mutedText,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  filterCard: {
    gap: 10,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 6,
  },
  warningCard: {
    borderLeftColor: colors.warning,
    borderLeftWidth: 4,
    gap: 4,
  },
  warningTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "900",
  },
  warningLine: {
    color: colors.mutedText,
    fontSize: 13,
  },
  activityRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  activityMain: {
    flex: 1,
    gap: 3,
  },
  activityType: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800",
  },
  activityDescription: {
    color: colors.mutedText,
    fontSize: 13,
  },
  activityDate: {
    color: colors.mutedText,
    fontSize: 12,
  },
  activityValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "900",
    textAlign: "right",
  },
});

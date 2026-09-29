import { Alert, StyleSheet, Text, View } from "react-native";

import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
import { CurrencyText } from "../../components/CurrencyText";
import { EmptyState } from "../../components/EmptyState";
import { Screen } from "../../components/Screen";
import { showConfirmDialog } from "../../components/ConfirmDialog";
import { PIG_BATCH_STATUS_LABELS } from "../../constants/categories";
import { colors } from "../../constants/colors";
import { useAppData } from "../../context/AppDataContext";
import { BatchDetailScreenProps } from "../../navigation/types";
import {
  BatchActivityTimelineItem,
  getBatchActivityTimeline,
  getBatchBreakEvenAnalysis,
  getBatchCurrentQuantity,
  getBatchEstimatedProfit,
  getBatchFeedUsageCost,
  getBatchLifecycleSummary,
  getBatchQuantityLost,
  getBatchQuantitySold,
  getBatchRevenue,
  getBatchSpecificExpenses,
  getInitialPigCost,
} from "../../utils/calculations";
import { formatDisplayDate } from "../../utils/dates";

export function BatchDetailScreen({ navigation, route }: BatchDetailScreenProps) {
  const {
    pigBatches,
    feedPurchases,
    sales,
    feedUsages,
    expenses,
    mortalityRecords,
    deletePigBatch,
  } = useAppData();
  const batchId = route.params?.batchId as string | undefined;
  const batch = pigBatches.find((item) => item.id === batchId);

  if (!batch) {
    return (
      <Screen>
        <EmptyState title="Batch not found." message="This batch may have been deleted." actionLabel="Back" onAction={() => navigation.goBack()} />
      </Screen>
    );
  }

  const batchSales = sales.filter((sale) => sale.batchId === batch.id).sort((a, b) => b.saleDate.localeCompare(a.saleDate));
  const batchFeedUsages = feedUsages.filter((usage) => usage.batchId === batch.id).sort((a, b) => b.usageDate.localeCompare(a.usageDate));
  const batchExpenses = expenses.filter((expense) => expense.batchId === batch.id).sort((a, b) => b.expenseDate.localeCompare(a.expenseDate));
  const batchMortality = mortalityRecords.filter((record) => record.batchId === batch.id).sort((a, b) => b.lossDate.localeCompare(a.lossDate));
  const activityTimeline = getBatchActivityTimeline(
    batch.id,
    sales,
    feedUsages,
    expenses,
    mortalityRecords,
    feedPurchases
  );
  const currentQuantity = getBatchCurrentQuantity(batch, sales, mortalityRecords);
  const lifecycle = getBatchLifecycleSummary(batch, sales, mortalityRecords);
  const soldQuantity = getBatchQuantitySold(batch.id, sales);
  const lostQuantity = getBatchQuantityLost(batch.id, mortalityRecords);
  const revenue = getBatchRevenue(batch.id, sales);
  const specificExpenses = getBatchSpecificExpenses(batch.id, expenses);
  const feedCost = getBatchFeedUsageCost(batch.id, feedPurchases, feedUsages);
  const profit = getBatchEstimatedProfit(batch, sales, expenses, mortalityRecords, feedPurchases, feedUsages);
  const breakEven = getBatchBreakEvenAnalysis(
    batch,
    sales,
    expenses,
    mortalityRecords,
    feedPurchases,
    feedUsages
  );

  const handleDelete = () => {
    if (batchSales.length || batchFeedUsages.length || batchExpenses.length || batchMortality.length) {
      Alert.alert(
        "Batch has related records",
        "This batch has related records. Delete those records first before deleting the batch."
      );
      return;
    }

    showConfirmDialog({
      title: "Delete this batch?",
      message:
        "This action cannot be undone. Deleting this batch will not automatically delete related sales, expenses, feed usage, or mortality records.",
      onConfirm: () =>
        deletePigBatch(batch.id)
          .then(() => navigation.goBack())
          .catch(() => Alert.alert("Delete failed", "Please try again.")),
    });
  };

  return (
    <Screen>
      <AppCard style={styles.summaryCard}>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.title}>{batch.name}</Text>
            <Text style={styles.meta}>{PIG_BATCH_STATUS_LABELS[lifecycle.derivedStatus]} • Purchased {formatDisplayDate(batch.purchaseDate)}</Text>
            {batch.supplierName ? <Text style={styles.meta}>Supplier: {batch.supplierName}</Text> : null}
          </View>
          <Text style={styles.current}>{currentQuantity} pigs</Text>
        </View>

        <View style={styles.metricGrid}>
          <Metric label="Initial quantity" value={`${batch.initialQuantity}`} />
          <Metric label="Current quantity" value={`${currentQuantity}`} />
          <Metric label="Sold quantity" value={`${soldQuantity}`} />
          <Metric label="Lost quantity" value={`${lostQuantity}`} />
          <Metric label="Initial pig cost" currency={getInitialPigCost(batch)} />
          <Metric label="Batch expenses" currency={specificExpenses} />
          <Metric label="Allocated feed cost" currency={feedCost} />
          <Metric label="Revenue" currency={revenue} variant="positive" />
          <Metric label="Estimated profit" currency={profit} variant={profit >= 0 ? "positive" : "negative"} />
        </View>

        <Text style={[styles.lifecycleNote, lifecycle.currentQuantity === 0 && styles.lifecycleWarning]}>
          {lifecycle.message}
        </Text>
        {batch.notes ? <Text style={styles.notes}>{batch.notes}</Text> : null}
      </AppCard>

      <View style={styles.quickActions}>
        <AppButton title="Add Sale" onPress={() => navigation.navigate("SaleForm", { batchId: batch.id })} style={styles.quickActionButton} />
        <AppButton title="Feed Usage" variant="secondary" onPress={() => navigation.navigate("FeedUsageForm", { batchId: batch.id })} style={styles.quickActionButton} />
        <AppButton title="Expense" variant="secondary" onPress={() => navigation.navigate("ExpenseForm", { batchId: batch.id })} style={styles.quickActionButton} />
        <AppButton title="Loss" variant="secondary" onPress={() => navigation.navigate("MortalityForm", { batchId: batch.id })} style={styles.quickActionButton} />
      </View>

      <View style={styles.manageActions}>
        <AppButton title="Edit Batch" variant="secondary" onPress={() => navigation.navigate("BatchForm", { batchId: batch.id })} style={styles.manageButton} />
        <AppButton title="Delete Batch" variant="danger" onPress={handleDelete} style={styles.manageButton} />
      </View>

      <AppCard style={styles.breakEvenCard}>
        <View style={styles.breakEvenHeader}>
          <Text style={styles.sectionTitle}>Break-even analysis</Text>
          <Text style={[styles.breakEvenStatus, breakEven.isBreakEvenReached && styles.breakEvenReached]}>
            {breakEven.isBreakEvenReached ? "Break-even reached" : "Still recovering cost"}
          </Text>
        </View>
        <View style={styles.metricGrid}>
          <Metric label="Total invested" currency={breakEven.totalInvestedCost} />
          <Metric label="Revenue to date" currency={breakEven.revenueToDate} variant="positive" />
          <Metric
            label="Revenue needed"
            currency={breakEven.remainingRevenueNeeded}
            variant={breakEven.remainingRevenueNeeded > 0 ? "negative" : "positive"}
          />
          <Metric
            label="Needed per remaining pig"
            currency={breakEven.breakEvenRevenuePerRemainingPig ?? undefined}
            value={breakEven.breakEvenRevenuePerRemainingPig === null ? "No pigs remain" : undefined}
            variant={breakEven.remainingRevenueNeeded > 0 ? "negative" : "positive"}
          />
        </View>
      </AppCard>

      <Section title="Activity timeline">
        {activityTimeline.length === 0 ? (
          <Text style={styles.emptyLine}>No batch activity recorded yet.</Text>
        ) : (
          activityTimeline.map((item) => <TimelineRecord key={`${item.kind}-${item.id}`} item={item} />)
        )}
      </Section>

    </Screen>
  );
}

function Metric({
  label,
  value,
  currency,
  variant = "neutral",
}: {
  label: string;
  value?: string;
  currency?: number;
  variant?: "neutral" | "positive" | "negative";
}) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      {currency !== undefined ? (
        <CurrencyText amount={currency} variant={variant} style={styles.metricValue} />
      ) : (
        <Text style={styles.metricValue}>{value}</Text>
      )}
    </View>
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

function TimelineRecord({ item }: { item: BatchActivityTimelineItem }) {
  const isRevenue = item.amountKind === "revenue";

  return (
    <AppCard style={styles.smallRecord}>
      <View style={styles.timelineHeader}>
        <Text style={styles.recordTitle}>{item.label}</Text>
        {item.amount !== undefined ? (
          <CurrencyText
            amount={item.amount}
            variant={isRevenue ? "positive" : "negative"}
            style={styles.timelineAmount}
          />
        ) : (
          <Text style={styles.noAmount}>No direct amount</Text>
        )}
      </View>
      <Text style={styles.recordDetail}>{formatDisplayDate(item.date)} - {item.detail}</Text>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    gap: 14,
  },
  headerRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: colors.text,
    fontSize: 23,
    fontWeight: "900",
  },
  meta: {
    color: colors.mutedText,
    fontSize: 13,
  },
  current: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: "900",
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  metric: {
    minWidth: "47%",
    gap: 3,
  },
  metricLabel: {
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  metricValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "900",
  },
  notes: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  lifecycleNote: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 8,
    color: colors.mutedText,
    fontSize: 13,
    fontWeight: "700",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  lifecycleWarning: {
    color: colors.warning,
  },
  quickActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  quickActionButton: {
    minWidth: "47%",
  },
  manageActions: {
    flexDirection: "row",
    gap: 8,
  },
  manageButton: {
    flex: 1,
  },
  breakEvenCard: {
    gap: 12,
  },
  breakEvenHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },
  breakEvenStatus: {
    color: colors.warning,
    flexShrink: 1,
    fontSize: 12,
    fontWeight: "900",
    textAlign: "right",
    textTransform: "uppercase",
  },
  breakEvenReached: {
    color: colors.positive,
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
  emptyLine: {
    color: colors.mutedText,
    fontSize: 14,
  },
  smallRecord: {
    gap: 4,
  },
  timelineHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },
  recordTitle: {
    color: colors.text,
    flex: 1,
    fontSize: 15,
    fontWeight: "800",
  },
  timelineAmount: {
    flexShrink: 0,
    fontSize: 14,
    fontWeight: "900",
  },
  noAmount: {
    color: colors.mutedText,
    flexShrink: 0,
    fontSize: 12,
    fontWeight: "800",
  },
  recordDetail: {
    color: colors.mutedText,
    fontSize: 13,
  },
});

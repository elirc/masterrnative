import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
import { CurrencyText } from "../../components/CurrencyText";
import { EmptyState } from "../../components/EmptyState";
import { ListControls } from "../../components/ListControls";
import { Screen } from "../../components/Screen";
import { showConfirmDialog } from "../../components/ConfirmDialog";
import { PIG_BATCH_STATUS_LABELS } from "../../constants/categories";
import { colors } from "../../constants/colors";
import { useAppData } from "../../context/AppDataContext";
import { BatchListScreenProps } from "../../navigation/types";
import {
  getBatchCurrentQuantity,
  getBatchEstimatedProfit,
  getBatchLifecycleSummary,
  getBatchRevenue,
  getBatchSpecificExpenses,
  getInitialPigCost,
} from "../../utils/calculations";
import { formatDisplayDate } from "../../utils/dates";

type BatchSort = "newest" | "name" | "profit_desc" | "remaining_asc";
type BatchStatusFilter = "all" | "active" | "sold_out" | "closed";

export function BatchListScreen({ navigation }: BatchListScreenProps) {
  const { pigBatches, feedPurchases, sales, expenses, mortalityRecords, feedUsages, deletePigBatch } = useAppData();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<BatchSort>("newest");
  const [statusFilter, setStatusFilter] = useState<BatchStatusFilter>("all");
  const normalizedSearch = search.trim().toLowerCase();
  const visibleBatches = [...pigBatches]
    .filter((batch) => {
      const lifecycle = getBatchLifecycleSummary(batch, sales, mortalityRecords);
      const matchesStatus = statusFilter === "all" || lifecycle.derivedStatus === statusFilter;
      const matchesSearch =
        !normalizedSearch ||
        batch.name.toLowerCase().includes(normalizedSearch) ||
        batch.supplierName?.toLowerCase().includes(normalizedSearch) ||
        lifecycle.statusLabel.toLowerCase().includes(normalizedSearch);
      return matchesStatus && matchesSearch;
    })
    .sort((a, b) => {
      if (sort === "name") {
        return a.name.localeCompare(b.name);
      }

      if (sort === "profit_desc") {
        return (
          getBatchEstimatedProfit(b, sales, expenses, mortalityRecords, feedPurchases, feedUsages) -
          getBatchEstimatedProfit(a, sales, expenses, mortalityRecords, feedPurchases, feedUsages)
        );
      }

      if (sort === "remaining_asc") {
        return getBatchCurrentQuantity(a, sales, mortalityRecords) - getBatchCurrentQuantity(b, sales, mortalityRecords);
      }

      return b.purchaseDate.localeCompare(a.purchaseDate);
    });

  const handleDelete = (batchId: string) => {
    const hasRelatedRecords =
      sales.some((sale) => sale.batchId === batchId) ||
      expenses.some((expense) => expense.batchId === batchId) ||
      feedUsages.some((usage) => usage.batchId === batchId) ||
      mortalityRecords.some((record) => record.batchId === batchId);

    if (hasRelatedRecords) {
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
      onConfirm: () => deletePigBatch(batchId).catch(() => Alert.alert("Delete failed", "Please try again.")),
    });
  };

  return (
    <Screen>
      <AppButton title="Add Batch" onPress={() => navigation.navigate("BatchForm")} />
      <ListControls
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search batch, supplier, or status"
        sortValue={sort}
        onSortChange={(value) => setSort(value as BatchSort)}
        sortOptions={[
          { label: "Newest purchase", value: "newest" },
          { label: "Batch name", value: "name" },
          { label: "Highest profit", value: "profit_desc" },
          { label: "Lowest remaining", value: "remaining_asc" },
        ]}
        filterLabel="Status"
        filterValue={statusFilter}
        onFilterChange={(value) => setStatusFilter(value as BatchStatusFilter)}
        filterOptions={[
          { label: "All statuses", value: "all" },
          { label: "Active", value: "active" },
          { label: "Sold Out", value: "sold_out" },
          { label: "Closed", value: "closed" },
        ]}
      />

      {visibleBatches.length === 0 ? (
        <EmptyState
          title={pigBatches.length === 0 ? "No pig batches yet." : "No batches match your filters."}
          message={pigBatches.length === 0 ? "Add your first batch to start tracking your piggery." : "Try changing the search, sort, or status filter."}
          actionLabel="Add Batch"
          onAction={() => navigation.navigate("BatchForm")}
        />
      ) : (
        visibleBatches.map((batch) => {
          const currentQuantity = getBatchCurrentQuantity(batch, sales, mortalityRecords);
          const lifecycle = getBatchLifecycleSummary(batch, sales, mortalityRecords);
          const revenue = getBatchRevenue(batch.id, sales);
          const batchExpenses = getBatchSpecificExpenses(batch.id, expenses);
          const profit = getBatchEstimatedProfit(batch, sales, expenses, mortalityRecords, feedPurchases, feedUsages);

          return (
            <AppCard
              key={batch.id}
              onPress={() => navigation.navigate("BatchDetail", { batchId: batch.id })}
              style={styles.card}
            >
              <View style={styles.cardHeader}>
                <View style={styles.titleGroup}>
                  <Text style={styles.batchName}>{batch.name}</Text>
                  <Text style={styles.meta}>{PIG_BATCH_STATUS_LABELS[lifecycle.derivedStatus]} • {formatDisplayDate(batch.purchaseDate)}</Text>
                </View>
                <Text style={styles.status}>{currentQuantity} pigs</Text>
              </View>

              <View style={styles.metricGrid}>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>Current</Text>
                  <Text style={styles.metricValue}>{currentQuantity} / {batch.initialQuantity}</Text>
                </View>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>Initial Cost</Text>
                  <CurrencyText amount={getInitialPigCost(batch)} style={styles.metricValue} />
                </View>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>Revenue</Text>
                  <CurrencyText amount={revenue} variant="positive" style={styles.metricValue} />
                </View>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>Expenses</Text>
                  <CurrencyText amount={batchExpenses} variant="negative" style={styles.metricValue} />
                </View>
              </View>

              <View style={styles.profitRow}>
                <Text style={styles.metricLabel}>Estimated Profit</Text>
                <CurrencyText amount={profit} variant={profit >= 0 ? "positive" : "negative"} style={styles.profitValue} />
              </View>

              <View style={styles.actions}>
                <AppButton title="Edit" variant="secondary" onPress={() => navigation.navigate("BatchForm", { batchId: batch.id })} style={styles.actionButton} />
                <AppButton title="Delete" variant="danger" onPress={() => handleDelete(batch.id)} style={styles.actionButton} />
              </View>
            </AppCard>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 12,
  },
  cardHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },
  titleGroup: {
    flex: 1,
    gap: 4,
  },
  batchName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
  },
  meta: {
    color: colors.mutedText,
    fontSize: 13,
  },
  status: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "900",
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  metric: {
    minWidth: "47%",
    gap: 2,
  },
  metricLabel: {
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  metricValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "900",
  },
  profitRow: {
    alignItems: "center",
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 10,
  },
  profitValue: {
    fontSize: 16,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    flex: 1,
  },
});

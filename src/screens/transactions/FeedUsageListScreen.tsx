import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
import { EmptyState } from "../../components/EmptyState";
import { ListControls } from "../../components/ListControls";
import { Screen } from "../../components/Screen";
import { showConfirmDialog } from "../../components/ConfirmDialog";
import { colors } from "../../constants/colors";
import { useAppData } from "../../context/AppDataContext";
import { FeedUsageListScreenProps } from "../../navigation/types";
import { formatDisplayDate } from "../../utils/dates";

type FeedUsageSort = "newest" | "feed_type" | "quantity_desc";

export function FeedUsageListScreen({ navigation }: FeedUsageListScreenProps) {
  const { pigBatches, feedUsages, deleteFeedUsage } = useAppData();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<FeedUsageSort>("newest");
  const getBatchName = (batchId: string) => pigBatches.find((batch) => batch.id === batchId)?.name ?? "Unknown batch";
  const normalizedSearch = search.trim().toLowerCase();
  const visibleUsages = [...feedUsages]
    .filter((usage) => {
      const batchName = getBatchName(usage.batchId);
      return (
        !normalizedSearch ||
        usage.feedType.toLowerCase().includes(normalizedSearch) ||
        batchName.toLowerCase().includes(normalizedSearch) ||
        usage.notes?.toLowerCase().includes(normalizedSearch)
      );
    })
    .sort((a, b) => {
      if (sort === "feed_type") {
        return a.feedType.localeCompare(b.feedType);
      }

      if (sort === "quantity_desc") {
        return b.quantityUsed - a.quantityUsed;
      }

      return b.usageDate.localeCompare(a.usageDate);
    });

  const handleDelete = (id: string) => {
    showConfirmDialog({
      title: "Delete feed usage?",
      message: "This action cannot be undone.",
      onConfirm: () => deleteFeedUsage(id).catch(() => Alert.alert("Delete failed", "Please try again.")),
    });
  };

  return (
    <Screen>
      <AppButton title="Add Feed Usage" onPress={() => navigation.navigate("FeedUsageForm")} />
      <ListControls
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search feed, batch, or notes"
        sortValue={sort}
        onSortChange={(value) => setSort(value as FeedUsageSort)}
        sortOptions={[
          { label: "Newest usage", value: "newest" },
          { label: "Feed type", value: "feed_type" },
          { label: "Highest quantity", value: "quantity_desc" },
        ]}
      />
      {visibleUsages.length === 0 ? (
        <EmptyState
          title={feedUsages.length === 0 ? "No feed usage recorded." : "No feed usage matches your search."}
          message={feedUsages.length === 0 ? "Record feed usage to see inventory and batch activity." : "Try changing the search or sort option."}
          actionLabel="Add Feed Usage"
          onAction={() => navigation.navigate("FeedUsageForm")}
        />
      ) : (
        visibleUsages.map((usage) => (
          <AppCard key={usage.id} style={styles.card}>
            <View style={styles.row}>
              <View style={styles.main}>
                <Text style={styles.title}>{usage.feedType}</Text>
                <Text style={styles.meta}>{getBatchName(usage.batchId)}</Text>
                <Text style={styles.meta}>{formatDisplayDate(usage.usageDate)}</Text>
                {usage.notes ? <Text style={styles.notes}>{usage.notes}</Text> : null}
              </View>
              <Text style={styles.quantity}>{usage.quantityUsed} {usage.unit}</Text>
            </View>
            <View style={styles.actions}>
              <AppButton title="Edit" variant="secondary" onPress={() => navigation.navigate("FeedUsageForm", { feedUsageId: usage.id })} style={styles.actionButton} />
              <AppButton title="Delete" variant="danger" onPress={() => handleDelete(usage.id)} style={styles.actionButton} />
            </View>
          </AppCard>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 12,
  },
  row: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  main: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "900",
  },
  meta: {
    color: colors.mutedText,
    fontSize: 13,
  },
  notes: {
    color: colors.text,
    fontSize: 13,
  },
  quantity: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: "900",
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    flex: 1,
  },
});

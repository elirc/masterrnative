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
import { MortalityListScreenProps } from "../../navigation/types";
import { formatDisplayDate } from "../../utils/dates";

type MortalitySort = "newest" | "quantity_desc" | "batch_name";

export function MortalityListScreen({ navigation }: MortalityListScreenProps) {
  const { mortalityRecords, pigBatches, deleteMortalityRecord } = useAppData();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<MortalitySort>("newest");
  const getBatchName = (batchId: string) => pigBatches.find((batch) => batch.id === batchId)?.name ?? "Unknown batch";
  const normalizedSearch = search.trim().toLowerCase();
  const visibleRecords = [...mortalityRecords]
    .filter((record) => {
      const batchName = getBatchName(record.batchId);
      return (
        !normalizedSearch ||
        batchName.toLowerCase().includes(normalizedSearch) ||
        record.reason?.toLowerCase().includes(normalizedSearch) ||
        record.notes?.toLowerCase().includes(normalizedSearch)
      );
    })
    .sort((a, b) => {
      if (sort === "quantity_desc") {
        return b.quantityLost - a.quantityLost;
      }

      if (sort === "batch_name") {
        return getBatchName(a.batchId).localeCompare(getBatchName(b.batchId));
      }

      return b.lossDate.localeCompare(a.lossDate);
    });

  const handleDelete = (id: string) => {
    showConfirmDialog({
      title: "Delete mortality record?",
      message: "This action cannot be undone.",
      onConfirm: () => deleteMortalityRecord(id).catch(() => Alert.alert("Delete failed", "Please try again.")),
    });
  };

  return (
    <Screen>
      <AppButton title="Add Mortality / Loss" onPress={() => navigation.navigate("MortalityForm")} />
      <ListControls
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search batch, reason, or notes"
        sortValue={sort}
        onSortChange={(value) => setSort(value as MortalitySort)}
        sortOptions={[
          { label: "Newest loss", value: "newest" },
          { label: "Highest quantity", value: "quantity_desc" },
          { label: "Batch name", value: "batch_name" },
        ]}
      />
      {visibleRecords.length === 0 ? (
        <EmptyState
          title={mortalityRecords.length === 0 ? "No mortality or loss recorded." : "No loss records match your search."}
          message={mortalityRecords.length === 0 ? "Record losses so current pig counts stay accurate." : "Try changing the search or sort option."}
          actionLabel="Add Mortality / Loss"
          onAction={() => navigation.navigate("MortalityForm")}
        />
      ) : (
        visibleRecords.map((record) => (
          <AppCard key={record.id} style={styles.card}>
            <View style={styles.row}>
              <View style={styles.main}>
                <Text style={styles.title}>{getBatchName(record.batchId)}</Text>
                <Text style={styles.meta}>{record.reason ?? "No reason"} • {formatDisplayDate(record.lossDate)}</Text>
                {record.notes ? <Text style={styles.notes}>{record.notes}</Text> : null}
              </View>
              <Text style={styles.quantity}>{record.quantityLost} lost</Text>
            </View>
            <View style={styles.actions}>
              <AppButton title="Edit" variant="secondary" onPress={() => navigation.navigate("MortalityForm", { mortalityRecordId: record.id })} style={styles.actionButton} />
              <AppButton title="Delete" variant="danger" onPress={() => handleDelete(record.id)} style={styles.actionButton} />
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
    color: colors.negative,
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

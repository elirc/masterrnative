import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
import { CurrencyText } from "../../components/CurrencyText";
import { EmptyState } from "../../components/EmptyState";
import { ListControls } from "../../components/ListControls";
import { Screen } from "../../components/Screen";
import { showConfirmDialog } from "../../components/ConfirmDialog";
import { colors } from "../../constants/colors";
import { useAppData } from "../../context/AppDataContext";
import { FeedPurchaseListScreenProps } from "../../navigation/types";
import { formatDisplayDate } from "../../utils/dates";

type FeedPurchaseSort = "newest" | "feed_type" | "highest_cost";

export function FeedPurchaseListScreen({ navigation }: FeedPurchaseListScreenProps) {
  const { feedPurchases, deleteFeedPurchase } = useAppData();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<FeedPurchaseSort>("newest");
  const normalizedSearch = search.trim().toLowerCase();
  const visiblePurchases = [...feedPurchases]
    .filter(
      (purchase) =>
        !normalizedSearch ||
        purchase.feedType.toLowerCase().includes(normalizedSearch) ||
        purchase.supplierName?.toLowerCase().includes(normalizedSearch)
    )
    .sort((a, b) => {
      if (sort === "feed_type") {
        return a.feedType.localeCompare(b.feedType);
      }

      if (sort === "highest_cost") {
        return b.quantity * b.costPerUnit - a.quantity * a.costPerUnit;
      }

      return b.purchaseDate.localeCompare(a.purchaseDate);
    });

  const handleDelete = (id: string) => {
    showConfirmDialog({
      title: "Delete feed purchase?",
      message: "This action cannot be undone.",
      onConfirm: () => deleteFeedPurchase(id).catch(() => Alert.alert("Delete failed", "Please try again.")),
    });
  };

  return (
    <Screen>
      <AppButton title="Add Feed Purchase" onPress={() => navigation.navigate("FeedPurchaseForm")} />
      <ListControls
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search feed type or supplier"
        sortValue={sort}
        onSortChange={(value) => setSort(value as FeedPurchaseSort)}
        sortOptions={[
          { label: "Newest purchase", value: "newest" },
          { label: "Feed type", value: "feed_type" },
          { label: "Highest cost", value: "highest_cost" },
        ]}
      />
      {visiblePurchases.length === 0 ? (
        <EmptyState
          title={feedPurchases.length === 0 ? "No feed purchases yet." : "No purchases match your search."}
          message={feedPurchases.length === 0 ? "Add feed purchases to track feed costs and inventory." : "Try a different feed type, supplier, or sort option."}
          actionLabel="Add Feed Purchase"
          onAction={() => navigation.navigate("FeedPurchaseForm")}
        />
      ) : (
        visiblePurchases.map((purchase) => (
          <AppCard key={purchase.id} style={styles.card}>
            <View style={styles.row}>
              <View style={styles.main}>
                <Text style={styles.title}>{purchase.feedType}</Text>
                <Text style={styles.meta}>
                  {purchase.quantity} {purchase.unit} • {formatDisplayDate(purchase.purchaseDate)}
                </Text>
                {purchase.supplierName ? <Text style={styles.meta}>Supplier: {purchase.supplierName}</Text> : null}
              </View>
              <View style={styles.valueBlock}>
                <CurrencyText amount={purchase.quantity * purchase.costPerUnit} style={styles.total} />
                <Text style={styles.meta}>{purchase.costPerUnit.toLocaleString()} / {purchase.unit}</Text>
              </View>
            </View>
            <View style={styles.actions}>
              <AppButton title="Edit" variant="secondary" onPress={() => navigation.navigate("FeedPurchaseForm", { feedPurchaseId: purchase.id })} style={styles.actionButton} />
              <AppButton title="Delete" variant="danger" onPress={() => handleDelete(purchase.id)} style={styles.actionButton} />
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
  valueBlock: {
    alignItems: "flex-end",
    gap: 4,
  },
  total: {
    fontSize: 15,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    flex: 1,
  },
});

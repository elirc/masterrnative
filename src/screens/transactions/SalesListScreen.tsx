import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
import { CurrencyText } from "../../components/CurrencyText";
import { EmptyState } from "../../components/EmptyState";
import { ListControls } from "../../components/ListControls";
import { Screen } from "../../components/Screen";
import { showConfirmDialog } from "../../components/ConfirmDialog";
import { SALE_PRICING_MODE_LABELS } from "../../constants/categories";
import { colors } from "../../constants/colors";
import { useAppData } from "../../context/AppDataContext";
import { SalesListScreenProps } from "../../navigation/types";
import { formatDisplayDate } from "../../utils/dates";

type SaleSort = "newest" | "highest_revenue" | "quantity_desc";
type SaleModeFilter = "all" | "by_weight" | "fixed_total";

export function SalesListScreen({ navigation }: SalesListScreenProps) {
  const { sales, pigBatches, deleteSale } = useAppData();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SaleSort>("newest");
  const [modeFilter, setModeFilter] = useState<SaleModeFilter>("all");
  const getBatchName = (batchId: string) => pigBatches.find((batch) => batch.id === batchId)?.name ?? "Unknown batch";
  const normalizedSearch = search.trim().toLowerCase();
  const visibleSales = [...sales]
    .filter((sale) => {
      const batchName = getBatchName(sale.batchId);
      const matchesMode = modeFilter === "all" || sale.pricingMode === modeFilter;
      const matchesSearch =
        !normalizedSearch ||
        batchName.toLowerCase().includes(normalizedSearch) ||
        sale.buyerName?.toLowerCase().includes(normalizedSearch);
      return matchesMode && matchesSearch;
    })
    .sort((a, b) => {
      if (sort === "highest_revenue") {
        return b.totalRevenue - a.totalRevenue;
      }

      if (sort === "quantity_desc") {
        return b.quantitySold - a.quantitySold;
      }

      return b.saleDate.localeCompare(a.saleDate);
    });

  const handleDelete = (id: string) => {
    showConfirmDialog({
      title: "Delete sale?",
      message: "This action cannot be undone.",
      onConfirm: () => deleteSale(id).catch(() => Alert.alert("Delete failed", "Please try again.")),
    });
  };

  return (
    <Screen>
      <AppButton title="Add Sale" onPress={() => navigation.navigate("SaleForm")} />
      <ListControls
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search batch or buyer"
        sortValue={sort}
        onSortChange={(value) => setSort(value as SaleSort)}
        sortOptions={[
          { label: "Newest sale", value: "newest" },
          { label: "Highest revenue", value: "highest_revenue" },
          { label: "Most pigs sold", value: "quantity_desc" },
        ]}
        filterLabel="Pricing"
        filterValue={modeFilter}
        onFilterChange={(value) => setModeFilter(value as SaleModeFilter)}
        filterOptions={[
          { label: "All pricing", value: "all" },
          { label: "By Weight", value: "by_weight" },
          { label: "Fixed Total", value: "fixed_total" },
        ]}
      />
      {visibleSales.length === 0 ? (
        <EmptyState
          title={sales.length === 0 ? "No sales recorded." : "No sales match your filters."}
          message={sales.length === 0 ? "Record pig sales to track revenue and profit." : "Try changing the search or pricing filter."}
          actionLabel="Add Sale"
          onAction={() => navigation.navigate("SaleForm")}
        />
      ) : (
        visibleSales.map((sale) => (
          <AppCard key={sale.id} style={styles.card}>
            <View style={styles.row}>
              <View style={styles.main}>
                <Text style={styles.title}>{getBatchName(sale.batchId)}</Text>
                <Text style={styles.meta}>
                  {sale.quantitySold} pigs • {SALE_PRICING_MODE_LABELS[sale.pricingMode]} • {formatDisplayDate(sale.saleDate)}
                </Text>
                {sale.buyerName ? <Text style={styles.meta}>Buyer: {sale.buyerName}</Text> : null}
              </View>
              <CurrencyText amount={sale.totalRevenue} variant="positive" style={styles.amount} />
            </View>
            <View style={styles.actions}>
              <AppButton title="Edit" variant="secondary" onPress={() => navigation.navigate("SaleForm", { saleId: sale.id })} style={styles.actionButton} />
              <AppButton title="Delete" variant="danger" onPress={() => handleDelete(sale.id)} style={styles.actionButton} />
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
  amount: {
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

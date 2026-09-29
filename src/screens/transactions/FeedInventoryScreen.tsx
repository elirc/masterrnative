import { StyleSheet, Text, View } from "react-native";

import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
import { CurrencyText } from "../../components/CurrencyText";
import { EmptyState } from "../../components/EmptyState";
import { Screen } from "../../components/Screen";
import { SummaryCard } from "../../components/SummaryCard";
import { colors } from "../../constants/colors";
import { useAppData } from "../../context/AppDataContext";
import { FeedInventoryScreenProps } from "../../navigation/types";
import { getFeedInventorySummary, getInventoryHealth, InventoryHealth } from "../../utils/calculations";
import { formatCurrency } from "../../utils/currency";

const healthLabels: Record<InventoryHealth, string> = {
  healthy: "Healthy",
  low: "Low",
  empty: "Empty",
  negative: "Overused",
};

const healthColors: Record<InventoryHealth, string> = {
  healthy: colors.positive,
  low: colors.warning,
  empty: colors.neutral,
  negative: colors.negative,
};

export function FeedInventoryScreen({ navigation }: FeedInventoryScreenProps) {
  const { feedPurchases, feedUsages } = useAppData();
  const inventory = getFeedInventorySummary(feedPurchases, feedUsages).sort((a, b) => {
    const healthOrder: Record<InventoryHealth, number> = { negative: 0, empty: 1, low: 2, healthy: 3 };
    return healthOrder[getInventoryHealth(a)] - healthOrder[getInventoryHealth(b)] || a.feedType.localeCompare(b.feedType);
  });
  const totalInventoryValue = inventory.reduce((total, item) => total + item.remainingValue, 0);
  const attentionCount = inventory.filter((item) => getInventoryHealth(item) !== "healthy").length;

  return (
    <Screen>
      <View style={styles.summaryGrid}>
        <SummaryCard title="Feed Groups" value={String(inventory.length)} subtitle="Grouped by type and unit" />
        <SummaryCard
          title="Needs Attention"
          value={String(attentionCount)}
          variant={attentionCount > 0 ? "negative" : "positive"}
        />
        <SummaryCard title="Remaining Value" value={formatCurrency(totalInventoryValue)} variant="positive" />
      </View>

      <View style={styles.actions}>
        <AppButton title="Add Feed Purchase" onPress={() => navigation.navigate("FeedPurchaseForm")} style={styles.actionButton} />
        <AppButton title="Record Feed Usage" variant="secondary" onPress={() => navigation.navigate("FeedUsageForm")} style={styles.actionButton} />
      </View>

      {inventory.length === 0 ? (
        <EmptyState
          title="No feed inventory yet."
          message="Add feed purchases and usage records to monitor what is available."
          actionLabel="Add Feed Purchase"
          onAction={() => navigation.navigate("FeedPurchaseForm")}
        />
      ) : (
        inventory.map((item) => {
          const health = getInventoryHealth(item);
          return (
            <AppCard key={`${item.feedType}-${item.unit}`} style={[styles.card, { borderLeftColor: healthColors[health] }]}>
              <View style={styles.cardHeader}>
                <View style={styles.main}>
                  <Text style={styles.title}>{item.feedType}</Text>
                  <Text style={styles.meta}>{healthLabels[health]} • {item.unit}</Text>
                </View>
                <Text style={[styles.health, { color: healthColors[health] }]}>{item.remainingQuantity} {item.unit}</Text>
              </View>

              <View style={styles.metrics}>
                <Metric label="Purchased" value={`${item.purchasedQuantity} ${item.unit}`} />
                <Metric label="Used" value={`${item.usedQuantity} ${item.unit}`} />
                <Metric label="Avg Cost" value={`${formatCurrency(item.averageCostPerUnit)} / ${item.unit}`} />
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>Remaining Value</Text>
                  <CurrencyText amount={item.remainingValue} style={styles.metricValue} />
                </View>
              </View>
            </AppCard>
          );
        })
      )}
    </Screen>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  actionButton: {
    flex: 1,
    minWidth: "47%",
  },
  card: {
    borderLeftWidth: 4,
    gap: 12,
  },
  cardHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },
  main: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
  },
  meta: {
    color: colors.mutedText,
    fontSize: 13,
  },
  health: {
    fontSize: 15,
    fontWeight: "900",
    textAlign: "right",
  },
  metrics: {
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
    fontWeight: "800",
    textTransform: "uppercase",
  },
  metricValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "900",
  },
});

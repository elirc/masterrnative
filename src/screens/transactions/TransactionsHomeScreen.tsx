import { StyleSheet, Text, View } from "react-native";

import { AppCard } from "../../components/AppCard";
import { Screen } from "../../components/Screen";
import { colors } from "../../constants/colors";
import { useAppData } from "../../context/AppDataContext";
import { TransactionsHomeScreenProps, TransactionsStackParamList } from "../../navigation/types";
import { getFeedInventorySummary, getInventoryHealth, getTotalOtherExpenses, getTotalRevenue } from "../../utils/calculations";
import { formatCurrency } from "../../utils/currency";
import { formatDisplayDate } from "../../utils/dates";

type TransactionListRoute = Extract<
  keyof TransactionsStackParamList,
  "FeedInventory" | "FeedPurchaseList" | "FeedUsageList" | "ExpenseList" | "SalesList" | "MortalityList"
>;

const transactionModules: Array<{
  title: string;
  description: string;
  route: TransactionListRoute;
  getMeta: (data: TransactionHomeData) => string;
  getValue: (data: TransactionHomeData) => string;
}> = [
  {
    title: "Feed Inventory",
    description: "Review remaining feed, inventory value, and low-stock warnings.",
    route: "FeedInventory",
    getMeta: ({ feedInventory }) => `${feedInventory.length} feed groups`,
    getValue: ({ feedInventory }) => {
      const warningCount = feedInventory.filter((item) => getInventoryHealth(item) !== "healthy").length;
      return warningCount > 0 ? `${warningCount} alerts` : "Healthy";
    },
  },
  {
    title: "Feed Purchases",
    description: "Record feed bought for inventory and cost tracking.",
    route: "FeedPurchaseList",
    getMeta: ({ latestFeedPurchaseDate }) =>
      latestFeedPurchaseDate ? `Latest ${formatDisplayDate(latestFeedPurchaseDate)}` : "No purchases yet",
    getValue: ({ feedPurchases }) => `${feedPurchases.length} records`,
  },
  {
    title: "Feed Usage",
    description: "Assign feed consumption to pig batches.",
    route: "FeedUsageList",
    getMeta: ({ latestFeedUsageDate }) =>
      latestFeedUsageDate ? `Latest ${formatDisplayDate(latestFeedUsageDate)}` : "No usage yet",
    getValue: ({ feedUsages }) => `${feedUsages.length} records`,
  },
  {
    title: "Expenses",
    description: "Track medicine, labor, transport, utilities, and more.",
    route: "ExpenseList",
    getMeta: ({ latestExpenseDate }) =>
      latestExpenseDate ? `Latest ${formatDisplayDate(latestExpenseDate)}` : "No expenses yet",
    getValue: ({ expenses }) => formatCurrency(getTotalOtherExpenses(expenses)),
  },
  {
    title: "Sales",
    description: "Record sales by weight or fixed total price.",
    route: "SalesList",
    getMeta: ({ latestSaleDate }) => (latestSaleDate ? `Latest ${formatDisplayDate(latestSaleDate)}` : "No sales yet"),
    getValue: ({ sales }) => formatCurrency(getTotalRevenue(sales)),
  },
  {
    title: "Mortality / Loss",
    description: "Track pigs that died or were lost.",
    route: "MortalityList",
    getMeta: ({ latestMortalityDate }) =>
      latestMortalityDate ? `Latest ${formatDisplayDate(latestMortalityDate)}` : "No losses yet",
    getValue: ({ mortalityRecords }) =>
      `${mortalityRecords.reduce((total, record) => total + record.quantityLost, 0)} pigs`,
  },
];

type TransactionHomeData = ReturnType<typeof useTransactionHomeData>;

function getLatestDate(items: string[]): string | undefined {
  return [...items].sort((a, b) => b.localeCompare(a))[0];
}

function useTransactionHomeData() {
  const { feedPurchases, feedUsages, expenses, sales, mortalityRecords } = useAppData();

  return {
    feedPurchases,
    feedUsages,
    expenses,
    sales,
    mortalityRecords,
    feedInventory: getFeedInventorySummary(feedPurchases, feedUsages),
    latestFeedPurchaseDate: getLatestDate(feedPurchases.map((purchase) => purchase.purchaseDate)),
    latestFeedUsageDate: getLatestDate(feedUsages.map((usage) => usage.usageDate)),
    latestExpenseDate: getLatestDate(expenses.map((expense) => expense.expenseDate)),
    latestSaleDate: getLatestDate(sales.map((sale) => sale.saleDate)),
    latestMortalityDate: getLatestDate(mortalityRecords.map((record) => record.lossDate)),
  };
}

export function TransactionsHomeScreen({ navigation }: TransactionsHomeScreenProps) {
  const data = useTransactionHomeData();

  return (
    <Screen>
      {transactionModules.map((item) => (
        <AppCard key={item.route} onPress={() => navigation.navigate(item.route)} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.value}>{item.getValue(data)}</Text>
          </View>
          <Text style={styles.description}>{item.description}</Text>
          <Text style={styles.meta}>{item.getMeta(data)}</Text>
        </AppCard>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 6,
  },
  cardHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },
  title: {
    color: colors.text,
    flex: 1,
    fontSize: 18,
    fontWeight: "900",
  },
  value: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "900",
    textAlign: "right",
  },
  description: {
    color: colors.mutedText,
    fontSize: 14,
    lineHeight: 20,
  },
  meta: {
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: "700",
  },
});

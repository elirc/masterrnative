import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
import { CurrencyText } from "../../components/CurrencyText";
import { EmptyState } from "../../components/EmptyState";
import { ListControls } from "../../components/ListControls";
import { Screen } from "../../components/Screen";
import { showConfirmDialog } from "../../components/ConfirmDialog";
import { EXPENSE_CATEGORY_LABELS } from "../../constants/categories";
import { colors } from "../../constants/colors";
import { useAppData } from "../../context/AppDataContext";
import { ExpenseListScreenProps } from "../../navigation/types";
import { formatDisplayDate } from "../../utils/dates";

type ExpenseSort = "newest" | "category" | "highest_amount";
type ExpenseFilter = "all" | "general" | "batch";

export function ExpenseListScreen({ navigation }: ExpenseListScreenProps) {
  const { expenses, pigBatches, deleteExpense } = useAppData();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<ExpenseSort>("newest");
  const [filter, setFilter] = useState<ExpenseFilter>("all");
  const getBatchName = (batchId?: string) => (batchId ? pigBatches.find((batch) => batch.id === batchId)?.name ?? "Unknown batch" : "General");
  const normalizedSearch = search.trim().toLowerCase();
  const visibleExpenses = [...expenses]
    .filter((expense) => {
      const batchName = getBatchName(expense.batchId);
      const matchesFilter =
        filter === "all" || (filter === "general" && !expense.batchId) || (filter === "batch" && !!expense.batchId);
      const matchesSearch =
        !normalizedSearch ||
        EXPENSE_CATEGORY_LABELS[expense.category].toLowerCase().includes(normalizedSearch) ||
        batchName.toLowerCase().includes(normalizedSearch) ||
        expense.notes?.toLowerCase().includes(normalizedSearch);
      return matchesFilter && matchesSearch;
    })
    .sort((a, b) => {
      if (sort === "category") {
        return EXPENSE_CATEGORY_LABELS[a.category].localeCompare(EXPENSE_CATEGORY_LABELS[b.category]);
      }

      if (sort === "highest_amount") {
        return b.amount - a.amount;
      }

      return b.expenseDate.localeCompare(a.expenseDate);
    });

  const handleDelete = (id: string) => {
    showConfirmDialog({
      title: "Delete expense?",
      message: "This action cannot be undone.",
      onConfirm: () => deleteExpense(id).catch(() => Alert.alert("Delete failed", "Please try again.")),
    });
  };

  return (
    <Screen>
      <AppButton title="Add Expense" onPress={() => navigation.navigate("ExpenseForm")} />
      <ListControls
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search category, batch, or notes"
        sortValue={sort}
        onSortChange={(value) => setSort(value as ExpenseSort)}
        sortOptions={[
          { label: "Newest expense", value: "newest" },
          { label: "Category", value: "category" },
          { label: "Highest amount", value: "highest_amount" },
        ]}
        filterLabel="Scope"
        filterValue={filter}
        onFilterChange={(value) => setFilter(value as ExpenseFilter)}
        filterOptions={[
          { label: "All expenses", value: "all" },
          { label: "General only", value: "general" },
          { label: "Batch-linked", value: "batch" },
        ]}
      />
      {visibleExpenses.length === 0 ? (
        <EmptyState
          title={expenses.length === 0 ? "No expenses recorded." : "No expenses match your filters."}
          message={expenses.length === 0 ? "Add an expense to track your business costs." : "Try changing the search or scope filter."}
          actionLabel="Add Expense"
          onAction={() => navigation.navigate("ExpenseForm")}
        />
      ) : (
        visibleExpenses.map((expense) => (
          <AppCard key={expense.id} style={styles.card}>
            <View style={styles.row}>
              <View style={styles.main}>
                <Text style={styles.title}>{EXPENSE_CATEGORY_LABELS[expense.category]}</Text>
                <Text style={styles.meta}>{getBatchName(expense.batchId)} • {formatDisplayDate(expense.expenseDate)}</Text>
                {expense.notes ? <Text style={styles.notes}>{expense.notes}</Text> : null}
              </View>
              <CurrencyText amount={expense.amount} variant="negative" style={styles.amount} />
            </View>
            <View style={styles.actions}>
              <AppButton title="Edit" variant="secondary" onPress={() => navigation.navigate("ExpenseForm", { expenseId: expense.id })} style={styles.actionButton} />
              <AppButton title="Delete" variant="danger" onPress={() => handleDelete(expense.id)} style={styles.actionButton} />
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

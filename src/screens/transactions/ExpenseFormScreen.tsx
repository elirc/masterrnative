import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { Alert, StyleSheet, Text, View } from "react-native";

import { AppButton } from "../../components/AppButton";
import { AppInput } from "../../components/AppInput";
import { AppSelect } from "../../components/AppSelect";
import { Screen } from "../../components/Screen";
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABELS } from "../../constants/categories";
import { colors } from "../../constants/colors";
import { useAppData } from "../../context/AppDataContext";
import { ExpenseFormScreenProps } from "../../navigation/types";
import { Expense } from "../../types/models";
import { getTodayISODate } from "../../utils/dates";
import { optionalText } from "../../utils/forms";
import { createId } from "../../utils/ids";
import { ExpenseFormValues, expenseSchema } from "../../utils/validation";

export function ExpenseFormScreen({ navigation, route }: ExpenseFormScreenProps) {
  const { expenses, pigBatches, addExpense, updateExpense } = useAppData();
  const expenseId = route.params?.expenseId as string | undefined;
  const routeBatchId = route.params?.batchId as string | undefined;
  const existingExpense = expenses.find((expense) => expense.id === expenseId);

  const { control, handleSubmit } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema) as any,
    defaultValues: {
      category: existingExpense?.category ?? "medicine",
      amount: existingExpense?.amount ?? 0,
      expenseDate: existingExpense?.expenseDate ?? getTodayISODate(),
      batchId: existingExpense?.batchId ?? routeBatchId ?? "",
      notes: existingExpense?.notes ?? "",
    },
  });

  const onSubmit = async (values: ExpenseFormValues) => {
    const now = new Date().toISOString();
    const nextExpense: Expense = {
      id: existingExpense?.id ?? createId(),
      category: values.category,
      amount: values.amount,
      expenseDate: values.expenseDate,
      batchId: optionalText(values.batchId),
      notes: optionalText(values.notes),
      createdAt: existingExpense?.createdAt ?? now,
      updatedAt: now,
    };

    try {
      if (existingExpense) {
        await updateExpense(nextExpense);
      } else {
        await addExpense(nextExpense);
      }
      navigation.goBack();
    } catch {
      Alert.alert("Save failed", "The expense could not be saved. Please try again.");
    }
  };

  return (
    <Screen>
      <Text style={styles.title}>{existingExpense ? "Edit expense" : "Add expense"}</Text>
      <View style={styles.form}>
        <Controller control={control} name="category" render={({ field, fieldState }) => (
          <AppSelect
            label="Category"
            selectedValue={field.value}
            onValueChange={field.onChange}
            options={EXPENSE_CATEGORIES.map((category) => ({ label: EXPENSE_CATEGORY_LABELS[category], value: category }))}
            error={fieldState.error?.message}
          />
        )} />
        <Controller control={control} name="amount" render={({ field, fieldState }) => (
          <AppInput label="Amount" keyboardType="numeric" value={String(field.value ?? "")} onChangeText={field.onChange} error={fieldState.error?.message} />
        )} />
        <Controller control={control} name="expenseDate" render={({ field, fieldState }) => (
          <AppInput label="Expense date" placeholder="YYYY-MM-DD" value={String(field.value ?? "")} onChangeText={field.onChange} error={fieldState.error?.message} />
        )} />
        <Controller control={control} name="batchId" render={({ field, fieldState }) => (
          <AppSelect
            label="Batch (optional)"
            selectedValue={field.value}
            onValueChange={field.onChange}
            options={[{ label: "General business expense", value: "" }, ...pigBatches.map((batch) => ({ label: batch.name, value: batch.id }))]}
            error={fieldState.error?.message}
          />
        )} />
        <Controller control={control} name="notes" render={({ field, fieldState }) => (
          <AppInput label="Notes" multiline value={String(field.value ?? "")} onChangeText={field.onChange} error={fieldState.error?.message} />
        )} />
      </View>
      <AppButton title={existingExpense ? "Save Changes" : "Save Expense"} onPress={handleSubmit(onSubmit, () => Alert.alert("Check the form", "Please fix the highlighted fields."))} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "900",
  },
  form: {
    gap: 12,
  },
});

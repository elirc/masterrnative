import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { Alert, StyleSheet, Text, View } from "react-native";

import { AppButton } from "../../components/AppButton";
import { AppInput } from "../../components/AppInput";
import { AppSelect } from "../../components/AppSelect";
import { Screen } from "../../components/Screen";
import { PIG_BATCH_STATUS_LABELS, PIG_BATCH_STATUSES } from "../../constants/categories";
import { colors } from "../../constants/colors";
import { useAppData } from "../../context/AppDataContext";
import { BatchFormScreenProps } from "../../navigation/types";
import { PigBatch } from "../../types/models";
import { getTodayISODate } from "../../utils/dates";
import { optionalText } from "../../utils/forms";
import { createId } from "../../utils/ids";
import { PigBatchFormValues, pigBatchSchema } from "../../utils/validation";

export function BatchFormScreen({ navigation, route }: BatchFormScreenProps) {
  const { pigBatches, addPigBatch, updatePigBatch } = useAppData();
  const batchId = route.params?.batchId as string | undefined;
  const existingBatch = pigBatches.find((batch) => batch.id === batchId);

  const { control, handleSubmit } = useForm<PigBatchFormValues>({
    resolver: zodResolver(pigBatchSchema) as any,
    defaultValues: {
      name: existingBatch?.name ?? "",
      purchaseDate: existingBatch?.purchaseDate ?? getTodayISODate(),
      initialQuantity: existingBatch?.initialQuantity ?? 0,
      purchasePricePerPig: existingBatch?.purchasePricePerPig ?? 0,
      startingWeightPerPigKg: existingBatch?.startingWeightPerPigKg,
      supplierName: existingBatch?.supplierName ?? "",
      notes: existingBatch?.notes ?? "",
      status: existingBatch?.status ?? "active",
    },
  });

  const onSubmit = async (values: PigBatchFormValues) => {
    const now = new Date().toISOString();
    const nextBatch: PigBatch = {
      id: existingBatch?.id ?? createId(),
      name: values.name.trim(),
      purchaseDate: values.purchaseDate,
      initialQuantity: values.initialQuantity,
      purchasePricePerPig: values.purchasePricePerPig,
      startingWeightPerPigKg: values.startingWeightPerPigKg,
      supplierName: optionalText(values.supplierName),
      notes: optionalText(values.notes),
      status: values.status,
      createdAt: existingBatch?.createdAt ?? now,
      updatedAt: now,
    };

    try {
      if (existingBatch) {
        await updatePigBatch(nextBatch);
      } else {
        await addPigBatch(nextBatch);
      }
      navigation.goBack();
    } catch {
      Alert.alert("Save failed", "The batch could not be saved. Please try again.");
    }
  };

  return (
    <Screen>
      <Text style={styles.title}>{existingBatch ? "Edit batch" : "Add pig batch"}</Text>

      <View style={styles.form}>
        <Controller
          control={control}
          name="name"
          render={({ field, fieldState }) => (
            <AppInput label="Batch name" value={String(field.value ?? "")} onChangeText={field.onChange} error={fieldState.error?.message} />
          )}
        />
        <Controller
          control={control}
          name="purchaseDate"
          render={({ field, fieldState }) => (
            <AppInput label="Purchase date" placeholder="YYYY-MM-DD" value={String(field.value ?? "")} onChangeText={field.onChange} error={fieldState.error?.message} />
          )}
        />
        <Controller
          control={control}
          name="initialQuantity"
          render={({ field, fieldState }) => (
            <AppInput label="Initial quantity" keyboardType="numeric" value={String(field.value ?? "")} onChangeText={field.onChange} error={fieldState.error?.message} />
          )}
        />
        <Controller
          control={control}
          name="purchasePricePerPig"
          render={({ field, fieldState }) => (
            <AppInput label="Purchase price per pig" keyboardType="numeric" value={String(field.value ?? "")} onChangeText={field.onChange} error={fieldState.error?.message} />
          )}
        />
        <Controller
          control={control}
          name="startingWeightPerPigKg"
          render={({ field, fieldState }) => (
            <AppInput label="Starting weight per pig (kg)" keyboardType="numeric" value={String(field.value ?? "")} onChangeText={field.onChange} error={fieldState.error?.message} />
          )}
        />
        <Controller
          control={control}
          name="supplierName"
          render={({ field, fieldState }) => (
            <AppInput label="Supplier name" value={String(field.value ?? "")} onChangeText={field.onChange} error={fieldState.error?.message} />
          )}
        />
        <Controller
          control={control}
          name="status"
          render={({ field, fieldState }) => (
            <AppSelect
              label="Status"
              selectedValue={field.value}
              onValueChange={field.onChange}
              options={PIG_BATCH_STATUSES.map((status) => ({ label: PIG_BATCH_STATUS_LABELS[status], value: status }))}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="notes"
          render={({ field, fieldState }) => (
            <AppInput label="Notes" multiline value={String(field.value ?? "")} onChangeText={field.onChange} error={fieldState.error?.message} />
          )}
        />
      </View>

      <AppButton title={existingBatch ? "Save Changes" : "Create Batch"} onPress={handleSubmit(onSubmit, () => Alert.alert("Check the form", "Please fix the highlighted fields."))} />
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

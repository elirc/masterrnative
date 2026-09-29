import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { Alert, StyleSheet, Text, View } from "react-native";

import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
import { AppInput } from "../../components/AppInput";
import { AppSelect } from "../../components/AppSelect";
import { Screen } from "../../components/Screen";
import { FEED_UNITS } from "../../constants/categories";
import { colors } from "../../constants/colors";
import { useAppData } from "../../context/AppDataContext";
import { FeedUsageFormScreenProps } from "../../navigation/types";
import { FeedUsage } from "../../types/models";
import { getFeedInventorySummary } from "../../utils/calculations";
import { formatCurrency } from "../../utils/currency";
import { getTodayISODate } from "../../utils/dates";
import { optionalText } from "../../utils/forms";
import { createId } from "../../utils/ids";
import { FeedUsageFormValues, feedUsageSchema } from "../../utils/validation";

export function FeedUsageFormScreen({ navigation, route }: FeedUsageFormScreenProps) {
  const { pigBatches, feedPurchases, feedUsages, addFeedUsage, updateFeedUsage } = useAppData();
  const feedUsageId = route.params?.feedUsageId as string | undefined;
  const routeBatchId = route.params?.batchId as string | undefined;
  const existingUsage = feedUsages.find((usage) => usage.id === feedUsageId);
  const knownFeedTypes = Array.from(new Set(feedPurchases.map((purchase) => purchase.feedType))).sort();

  const { control, handleSubmit, setValue, watch } = useForm<FeedUsageFormValues>({
    resolver: zodResolver(feedUsageSchema) as any,
    defaultValues: {
      batchId: existingUsage?.batchId ?? routeBatchId ?? "",
      feedType: existingUsage?.feedType ?? "",
      quantityUsed: existingUsage?.quantityUsed ?? 0,
      unit: existingUsage?.unit ?? "sack",
      usageDate: existingUsage?.usageDate ?? getTodayISODate(),
      notes: existingUsage?.notes ?? "",
    },
  });
  const previewFeedType = String(watch("feedType") ?? "");
  const previewQuantity = Number(watch("quantityUsed") ?? 0);
  const previewUnit = watch("unit");
  const previewInventory = getFeedInventorySummary(
    feedPurchases,
    feedUsages.filter((usage) => usage.id !== existingUsage?.id)
  );
  const previewInventoryItem = previewInventory.find(
    (item) =>
      item.feedType.trim().toLowerCase() === previewFeedType.trim().toLowerCase() &&
      item.unit === previewUnit
  );
  const averageCostPerUnit = previewInventoryItem?.averageCostPerUnit ?? 0;
  const estimatedUsageCost = previewQuantity > 0 ? previewQuantity * averageCostPerUnit : 0;
  const shouldShowCostPreview = previewFeedType.trim().length > 0 && previewQuantity > 0;

  const saveUsage = async (values: FeedUsageFormValues) => {
    const now = new Date().toISOString();
    const nextUsage: FeedUsage = {
      id: existingUsage?.id ?? createId(),
      batchId: values.batchId,
      feedType: values.feedType.trim(),
      quantityUsed: values.quantityUsed,
      unit: values.unit,
      usageDate: values.usageDate,
      notes: optionalText(values.notes),
      createdAt: existingUsage?.createdAt ?? now,
      updatedAt: now,
    };

    if (existingUsage) {
      await updateFeedUsage(nextUsage);
    } else {
      await addFeedUsage(nextUsage);
    }
    navigation.goBack();
  };

  const onSubmit = async (values: FeedUsageFormValues) => {
    const inventoryBeforeThisUsage = getFeedInventorySummary(
      feedPurchases,
      feedUsages.filter((usage) => usage.id !== existingUsage?.id)
    );
    const group = inventoryBeforeThisUsage.find(
      (item) => item.feedType.trim().toLowerCase() === values.feedType.trim().toLowerCase() && item.unit === values.unit
    );
    const availableQuantity = group?.remainingQuantity ?? 0;

    if (values.quantityUsed > availableQuantity) {
      Alert.alert(
        "Inventory warning",
        "Warning: this usage is greater than the recorded available feed inventory.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Save anyway",
            onPress: () => saveUsage(values).catch(() => Alert.alert("Save failed", "Please try again.")),
          },
        ]
      );
      return;
    }

    try {
      await saveUsage(values);
    } catch {
      Alert.alert("Save failed", "The feed usage could not be saved. Please try again.");
    }
  };

  return (
    <Screen>
      <Text style={styles.title}>{existingUsage ? "Edit feed usage" : "Add feed usage"}</Text>
      <View style={styles.form}>
        <Controller control={control} name="batchId" render={({ field, fieldState }) => (
          <AppSelect
            label="Batch"
            selectedValue={field.value}
            onValueChange={field.onChange}
            options={[{ label: "Select batch", value: "" }, ...pigBatches.map((batch) => ({ label: batch.name, value: batch.id }))]}
            error={fieldState.error?.message}
          />
        )} />
        {knownFeedTypes.length > 0 ? (
          <AppSelect
            label="Use existing feed type"
            selectedValue=""
            onValueChange={(value) => value && setValue("feedType", value, { shouldValidate: true })}
            options={[{ label: "Choose feed type", value: "" }, ...knownFeedTypes.map((feedType) => ({ label: feedType, value: feedType }))]}
          />
        ) : null}
        <Controller control={control} name="feedType" render={({ field, fieldState }) => (
          <AppInput label="Feed type" value={String(field.value ?? "")} onChangeText={field.onChange} error={fieldState.error?.message} />
        )} />
        <Controller control={control} name="quantityUsed" render={({ field, fieldState }) => (
          <AppInput label="Quantity used" keyboardType="numeric" value={String(field.value ?? "")} onChangeText={field.onChange} error={fieldState.error?.message} />
        )} />
        <Controller control={control} name="unit" render={({ field, fieldState }) => (
          <AppSelect label="Unit" selectedValue={field.value} onValueChange={field.onChange} options={FEED_UNITS.map((unit) => ({ label: unit, value: unit }))} error={fieldState.error?.message} />
        )} />
        {shouldShowCostPreview ? (
          <AppCard style={styles.previewCard}>
            <Text style={styles.previewLabel}>Estimated feed cost</Text>
            <Text style={styles.previewValue}>{formatCurrency(estimatedUsageCost)}</Text>
            <Text style={styles.previewMeta}>
              {averageCostPerUnit > 0
                ? `Based on ${formatCurrency(averageCostPerUnit)} average cost per ${previewUnit}.`
                : "No matching purchase history yet, so the estimate is 0."}
            </Text>
            {previewInventoryItem ? (
              <Text style={styles.previewMeta}>
                {previewInventoryItem.remainingQuantity} {previewUnit} available before this usage.
              </Text>
            ) : null}
          </AppCard>
        ) : null}
        <Controller control={control} name="usageDate" render={({ field, fieldState }) => (
          <AppInput label="Usage date" placeholder="YYYY-MM-DD" value={String(field.value ?? "")} onChangeText={field.onChange} error={fieldState.error?.message} />
        )} />
        <Controller control={control} name="notes" render={({ field, fieldState }) => (
          <AppInput label="Notes" multiline value={String(field.value ?? "")} onChangeText={field.onChange} error={fieldState.error?.message} />
        )} />
      </View>
      <AppButton title={existingUsage ? "Save Changes" : "Save Feed Usage"} onPress={handleSubmit(onSubmit, () => Alert.alert("Check the form", "Please fix the highlighted fields."))} />
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
  previewCard: {
    gap: 4,
  },
  previewLabel: {
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  previewValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
  },
  previewMeta: {
    color: colors.mutedText,
    fontSize: 12,
    lineHeight: 17,
  },
});

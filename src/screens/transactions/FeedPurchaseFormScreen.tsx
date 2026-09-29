import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { Alert, StyleSheet, Text, View } from "react-native";

import { AppButton } from "../../components/AppButton";
import { AppInput } from "../../components/AppInput";
import { AppSelect } from "../../components/AppSelect";
import { Screen } from "../../components/Screen";
import { FEED_UNITS } from "../../constants/categories";
import { colors } from "../../constants/colors";
import { useAppData } from "../../context/AppDataContext";
import { FeedPurchaseFormScreenProps } from "../../navigation/types";
import { FeedPurchase } from "../../types/models";
import { getTodayISODate } from "../../utils/dates";
import { optionalText } from "../../utils/forms";
import { createId } from "../../utils/ids";
import { FeedPurchaseFormValues, feedPurchaseSchema } from "../../utils/validation";

export function FeedPurchaseFormScreen({ navigation, route }: FeedPurchaseFormScreenProps) {
  const { feedPurchases, addFeedPurchase, updateFeedPurchase } = useAppData();
  const feedPurchaseId = route.params?.feedPurchaseId as string | undefined;
  const existingPurchase = feedPurchases.find((purchase) => purchase.id === feedPurchaseId);

  const { control, handleSubmit } = useForm<FeedPurchaseFormValues>({
    resolver: zodResolver(feedPurchaseSchema) as any,
    defaultValues: {
      feedType: existingPurchase?.feedType ?? "",
      quantity: existingPurchase?.quantity ?? 0,
      unit: existingPurchase?.unit ?? "sack",
      costPerUnit: existingPurchase?.costPerUnit ?? 0,
      supplierName: existingPurchase?.supplierName ?? "",
      purchaseDate: existingPurchase?.purchaseDate ?? getTodayISODate(),
      notes: existingPurchase?.notes ?? "",
    },
  });

  const onSubmit = async (values: FeedPurchaseFormValues) => {
    const now = new Date().toISOString();
    const nextPurchase: FeedPurchase = {
      id: existingPurchase?.id ?? createId(),
      feedType: values.feedType.trim(),
      quantity: values.quantity,
      unit: values.unit,
      costPerUnit: values.costPerUnit,
      supplierName: optionalText(values.supplierName),
      purchaseDate: values.purchaseDate,
      notes: optionalText(values.notes),
      createdAt: existingPurchase?.createdAt ?? now,
      updatedAt: now,
    };

    try {
      if (existingPurchase) {
        await updateFeedPurchase(nextPurchase);
      } else {
        await addFeedPurchase(nextPurchase);
      }
      navigation.goBack();
    } catch {
      Alert.alert("Save failed", "The feed purchase could not be saved. Please try again.");
    }
  };

  return (
    <Screen>
      <Text style={styles.title}>{existingPurchase ? "Edit feed purchase" : "Add feed purchase"}</Text>
      <View style={styles.form}>
        <Controller control={control} name="feedType" render={({ field, fieldState }) => (
          <AppInput label="Feed type" value={String(field.value ?? "")} onChangeText={field.onChange} error={fieldState.error?.message} />
        )} />
        <Controller control={control} name="quantity" render={({ field, fieldState }) => (
          <AppInput label="Quantity" keyboardType="numeric" value={String(field.value ?? "")} onChangeText={field.onChange} error={fieldState.error?.message} />
        )} />
        <Controller control={control} name="unit" render={({ field, fieldState }) => (
          <AppSelect label="Unit" selectedValue={field.value} onValueChange={field.onChange} options={FEED_UNITS.map((unit) => ({ label: unit, value: unit }))} error={fieldState.error?.message} />
        )} />
        <Controller control={control} name="costPerUnit" render={({ field, fieldState }) => (
          <AppInput label="Cost per unit" keyboardType="numeric" value={String(field.value ?? "")} onChangeText={field.onChange} error={fieldState.error?.message} />
        )} />
        <Controller control={control} name="supplierName" render={({ field, fieldState }) => (
          <AppInput label="Supplier" value={String(field.value ?? "")} onChangeText={field.onChange} error={fieldState.error?.message} />
        )} />
        <Controller control={control} name="purchaseDate" render={({ field, fieldState }) => (
          <AppInput label="Purchase date" placeholder="YYYY-MM-DD" value={String(field.value ?? "")} onChangeText={field.onChange} error={fieldState.error?.message} />
        )} />
        <Controller control={control} name="notes" render={({ field, fieldState }) => (
          <AppInput label="Notes" multiline value={String(field.value ?? "")} onChangeText={field.onChange} error={fieldState.error?.message} />
        )} />
      </View>
      <AppButton title={existingPurchase ? "Save Changes" : "Save Feed Purchase"} onPress={handleSubmit(onSubmit, () => Alert.alert("Check the form", "Please fix the highlighted fields."))} />
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

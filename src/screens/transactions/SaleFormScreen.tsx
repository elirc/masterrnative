import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { Alert, StyleSheet, Text, View } from "react-native";

import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
import { AppInput } from "../../components/AppInput";
import { AppSelect } from "../../components/AppSelect";
import { Screen } from "../../components/Screen";
import { SALE_PRICING_MODE_LABELS, SALE_PRICING_MODES } from "../../constants/categories";
import { colors } from "../../constants/colors";
import { useAppData } from "../../context/AppDataContext";
import { SaleFormScreenProps } from "../../navigation/types";
import { Sale } from "../../types/models";
import { getBatchCurrentQuantity } from "../../utils/calculations";
import { formatCurrency } from "../../utils/currency";
import { getTodayISODate } from "../../utils/dates";
import { optionalText } from "../../utils/forms";
import { createId } from "../../utils/ids";
import { SaleFormValues, saleSchema } from "../../utils/validation";

export function SaleFormScreen({ navigation, route }: SaleFormScreenProps) {
  const { pigBatches, sales, mortalityRecords, addSale, updateSale, updatePigBatch } = useAppData();
  const saleId = route.params?.saleId as string | undefined;
  const routeBatchId = route.params?.batchId as string | undefined;
  const existingSale = sales.find((sale) => sale.id === saleId);

  const { control, handleSubmit, watch } = useForm<SaleFormValues>({
    resolver: zodResolver(saleSchema) as any,
    defaultValues: {
      batchId: existingSale?.batchId ?? routeBatchId ?? "",
      quantitySold: existingSale?.quantitySold ?? 0,
      pricingMode: existingSale?.pricingMode ?? "by_weight",
      totalWeightKg: existingSale?.totalWeightKg,
      pricePerKg: existingSale?.pricePerKg,
      totalRevenue: existingSale?.totalRevenue ?? 0,
      buyerName: existingSale?.buyerName ?? "",
      saleDate: existingSale?.saleDate ?? getTodayISODate(),
      notes: existingSale?.notes ?? "",
    },
  });

  const pricingMode = watch("pricingMode");
  const quantitySold = Number(watch("quantitySold") ?? 0);
  const totalWeightKg = Number(watch("totalWeightKg") ?? 0);
  const pricePerKg = Number(watch("pricePerKg") ?? 0);
  const fixedTotalRevenue = Number(watch("totalRevenue") ?? 0);
  const calculatedRevenue = totalWeightKg > 0 && pricePerKg > 0 ? totalWeightKg * pricePerKg : 0;
  const previewRevenue = pricingMode === "by_weight" ? calculatedRevenue : fixedTotalRevenue;
  const averageWeightPerPig = quantitySold > 0 && totalWeightKg > 0 ? totalWeightKg / quantitySold : 0;
  const averageRevenuePerPig = quantitySold > 0 && previewRevenue > 0 ? previewRevenue / quantitySold : 0;

  const onSubmit = async (values: SaleFormValues) => {
    const batch = pigBatches.find((item) => item.id === values.batchId);

    if (!batch) {
      Alert.alert("Batch required", "Select a valid batch before saving the sale.");
      return;
    }

    const currentQuantity = getBatchCurrentQuantity(batch, sales, mortalityRecords);
    const editableQuantity = existingSale?.batchId === batch.id ? existingSale.quantitySold : 0;
    const availableQuantity = currentQuantity + editableQuantity;

    if (values.quantitySold > availableQuantity) {
      Alert.alert("Quantity too high", `This batch only has ${availableQuantity} pigs available.`);
      return;
    }

    const now = new Date().toISOString();
    const revenue =
      values.pricingMode === "by_weight"
        ? Number(values.totalWeightKg ?? 0) * Number(values.pricePerKg ?? 0)
        : Number(values.totalRevenue ?? 0);
    const nextSale: Sale = {
      id: existingSale?.id ?? createId(),
      batchId: values.batchId,
      quantitySold: values.quantitySold,
      pricingMode: values.pricingMode,
      totalWeightKg: values.pricingMode === "by_weight" ? values.totalWeightKg : undefined,
      pricePerKg: values.pricingMode === "by_weight" ? values.pricePerKg : undefined,
      totalRevenue: revenue,
      buyerName: optionalText(values.buyerName),
      saleDate: values.saleDate,
      notes: optionalText(values.notes),
      createdAt: existingSale?.createdAt ?? now,
      updatedAt: now,
    };

    try {
      if (existingSale) {
        await updateSale(nextSale);
      } else {
        await addSale(nextSale);
      }

      const nextSales = existingSale
        ? sales.map((sale) => (sale.id === nextSale.id ? nextSale : sale))
        : [nextSale, ...sales];
      const remainingQuantity = getBatchCurrentQuantity(batch, nextSales, mortalityRecords);
      if (remainingQuantity === 0 && batch.status === "active") {
        await updatePigBatch({ ...batch, status: "sold_out", updatedAt: now });
      }
      navigation.goBack();
    } catch {
      Alert.alert("Save failed", "The sale could not be saved. Please try again.");
    }
  };

  return (
    <Screen>
      <Text style={styles.title}>{existingSale ? "Edit sale" : "Add sale"}</Text>
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
        <Controller control={control} name="quantitySold" render={({ field, fieldState }) => (
          <AppInput label="Quantity sold" keyboardType="numeric" value={String(field.value ?? "")} onChangeText={field.onChange} error={fieldState.error?.message} />
        )} />
        <Controller control={control} name="pricingMode" render={({ field, fieldState }) => (
          <AppSelect
            label="Pricing mode"
            selectedValue={field.value}
            onValueChange={field.onChange}
            options={SALE_PRICING_MODES.map((mode) => ({ label: SALE_PRICING_MODE_LABELS[mode], value: mode }))}
            error={fieldState.error?.message}
          />
        )} />

        {pricingMode === "by_weight" ? (
          <>
            <Controller control={control} name="totalWeightKg" render={({ field, fieldState }) => (
              <AppInput label="Total weight (kg)" keyboardType="numeric" value={String(field.value ?? "")} onChangeText={field.onChange} error={fieldState.error?.message} />
            )} />
            <Controller control={control} name="pricePerKg" render={({ field, fieldState }) => (
              <AppInput label="Price per kg" keyboardType="numeric" value={String(field.value ?? "")} onChangeText={field.onChange} error={fieldState.error?.message} />
            )} />
            <AppCard style={styles.calculatedCard}>
              <Text style={styles.calculatedLabel}>Pricing insights</Text>
              <View style={styles.insightRow}>
                <Text style={styles.insightLabel}>Calculated revenue</Text>
                <Text style={styles.insightValue}>{formatCurrency(calculatedRevenue)}</Text>
              </View>
              <View style={styles.insightRow}>
                <Text style={styles.insightLabel}>Average weight / pig</Text>
                <Text style={styles.insightValue}>
                  {averageWeightPerPig > 0 ? `${averageWeightPerPig.toFixed(1)} kg` : "0 kg"}
                </Text>
              </View>
              <View style={styles.insightRow}>
                <Text style={styles.insightLabel}>Average revenue / pig</Text>
                <Text style={styles.insightValue}>{formatCurrency(averageRevenuePerPig)}</Text>
              </View>
            </AppCard>
          </>
        ) : (
          <>
            <Controller control={control} name="totalRevenue" render={({ field, fieldState }) => (
              <AppInput label="Total revenue" keyboardType="numeric" value={String(field.value ?? "")} onChangeText={field.onChange} error={fieldState.error?.message} />
            )} />
            <AppCard style={styles.calculatedCard}>
              <Text style={styles.calculatedLabel}>Pricing insights</Text>
              <View style={styles.insightRow}>
                <Text style={styles.insightLabel}>Total revenue</Text>
                <Text style={styles.insightValue}>{formatCurrency(fixedTotalRevenue)}</Text>
              </View>
              <View style={styles.insightRow}>
                <Text style={styles.insightLabel}>Average revenue / pig</Text>
                <Text style={styles.insightValue}>{formatCurrency(averageRevenuePerPig)}</Text>
              </View>
            </AppCard>
          </>
        )}

        <Controller control={control} name="buyerName" render={({ field, fieldState }) => (
          <AppInput label="Buyer name" value={String(field.value ?? "")} onChangeText={field.onChange} error={fieldState.error?.message} />
        )} />
        <Controller control={control} name="saleDate" render={({ field, fieldState }) => (
          <AppInput label="Sale date" placeholder="YYYY-MM-DD" value={String(field.value ?? "")} onChangeText={field.onChange} error={fieldState.error?.message} />
        )} />
        <Controller control={control} name="notes" render={({ field, fieldState }) => (
          <AppInput label="Notes" multiline value={String(field.value ?? "")} onChangeText={field.onChange} error={fieldState.error?.message} />
        )} />
      </View>
      <AppButton title={existingSale ? "Save Changes" : "Save Sale"} onPress={handleSubmit(onSubmit, () => Alert.alert("Check the form", "Please fix the highlighted fields."))} />
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
  calculatedCard: {
    gap: 8,
  },
  calculatedLabel: {
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  calculatedValue: {
    color: colors.positive,
    fontSize: 18,
    fontWeight: "900",
  },
  insightRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  insightLabel: {
    color: colors.mutedText,
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
  },
  insightValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "900",
  },
});

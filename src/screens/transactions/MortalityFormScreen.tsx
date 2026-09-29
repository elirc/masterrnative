import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { Alert, StyleSheet, Text, View } from "react-native";

import { AppButton } from "../../components/AppButton";
import { AppInput } from "../../components/AppInput";
import { AppSelect } from "../../components/AppSelect";
import { Screen } from "../../components/Screen";
import { colors } from "../../constants/colors";
import { useAppData } from "../../context/AppDataContext";
import { MortalityFormScreenProps } from "../../navigation/types";
import { MortalityRecord } from "../../types/models";
import { getBatchCurrentQuantity } from "../../utils/calculations";
import { getTodayISODate } from "../../utils/dates";
import { optionalText } from "../../utils/forms";
import { createId } from "../../utils/ids";
import { MortalityRecordFormValues, mortalityRecordSchema } from "../../utils/validation";

export function MortalityFormScreen({ navigation, route }: MortalityFormScreenProps) {
  const { pigBatches, sales, mortalityRecords, addMortalityRecord, updateMortalityRecord, updatePigBatch } = useAppData();
  const mortalityRecordId = route.params?.mortalityRecordId as string | undefined;
  const routeBatchId = route.params?.batchId as string | undefined;
  const existingRecord = mortalityRecords.find((record) => record.id === mortalityRecordId);

  const { control, handleSubmit } = useForm<MortalityRecordFormValues>({
    resolver: zodResolver(mortalityRecordSchema) as any,
    defaultValues: {
      batchId: existingRecord?.batchId ?? routeBatchId ?? "",
      quantityLost: existingRecord?.quantityLost ?? 0,
      lossDate: existingRecord?.lossDate ?? getTodayISODate(),
      reason: existingRecord?.reason ?? "",
      notes: existingRecord?.notes ?? "",
    },
  });

  const onSubmit = async (values: MortalityRecordFormValues) => {
    const batch = pigBatches.find((item) => item.id === values.batchId);

    if (!batch) {
      Alert.alert("Batch required", "Select a valid batch before saving the record.");
      return;
    }

    const currentQuantity = getBatchCurrentQuantity(batch, sales, mortalityRecords);
    const editableQuantity = existingRecord?.batchId === batch.id ? existingRecord.quantityLost : 0;
    const availableQuantity = currentQuantity + editableQuantity;

    if (values.quantityLost > availableQuantity) {
      Alert.alert("Quantity too high", `This batch only has ${availableQuantity} pigs available.`);
      return;
    }

    const now = new Date().toISOString();
    const nextRecord: MortalityRecord = {
      id: existingRecord?.id ?? createId(),
      batchId: values.batchId,
      quantityLost: values.quantityLost,
      lossDate: values.lossDate,
      reason: optionalText(values.reason),
      notes: optionalText(values.notes),
      createdAt: existingRecord?.createdAt ?? now,
      updatedAt: now,
    };

    try {
      if (existingRecord) {
        await updateMortalityRecord(nextRecord);
      } else {
        await addMortalityRecord(nextRecord);
      }

      const nextMortalityRecords = existingRecord
        ? mortalityRecords.map((record) => (record.id === nextRecord.id ? nextRecord : record))
        : [nextRecord, ...mortalityRecords];
      const remainingQuantity = getBatchCurrentQuantity(batch, sales, nextMortalityRecords);
      if (remainingQuantity === 0 && batch.status === "active") {
        await updatePigBatch({ ...batch, status: "closed", updatedAt: now });
      }
      navigation.goBack();
    } catch {
      Alert.alert("Save failed", "The mortality record could not be saved. Please try again.");
    }
  };

  return (
    <Screen>
      <Text style={styles.title}>{existingRecord ? "Edit mortality / loss" : "Add mortality / loss"}</Text>
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
        <Controller control={control} name="quantityLost" render={({ field, fieldState }) => (
          <AppInput label="Quantity lost" keyboardType="numeric" value={String(field.value ?? "")} onChangeText={field.onChange} error={fieldState.error?.message} />
        )} />
        <Controller control={control} name="lossDate" render={({ field, fieldState }) => (
          <AppInput label="Loss date" placeholder="YYYY-MM-DD" value={String(field.value ?? "")} onChangeText={field.onChange} error={fieldState.error?.message} />
        )} />
        <Controller control={control} name="reason" render={({ field, fieldState }) => (
          <AppInput label="Reason" value={String(field.value ?? "")} onChangeText={field.onChange} error={fieldState.error?.message} />
        )} />
        <Controller control={control} name="notes" render={({ field, fieldState }) => (
          <AppInput label="Notes" multiline value={String(field.value ?? "")} onChangeText={field.onChange} error={fieldState.error?.message} />
        )} />
      </View>
      <AppButton title={existingRecord ? "Save Changes" : "Save Mortality Record"} onPress={handleSubmit(onSubmit, () => Alert.alert("Check the form", "Please fix the highlighted fields."))} />
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

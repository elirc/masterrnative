import * as Clipboard from "expo-clipboard";
import { useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
import { AppInput } from "../../components/AppInput";
import { Screen } from "../../components/Screen";
import { showConfirmDialog } from "../../components/ConfirmDialog";
import { colors } from "../../constants/colors";
import { useAppData } from "../../context/AppDataContext";
import type { SettingsScreenProps } from "../../navigation/types";
import type { BackupData } from "../../types/models";
import { createCsvExports, type CsvExport, getBackupImportPreview } from "../../utils/exporters";

export function SettingsScreen({ navigation }: SettingsScreenProps) {
  const {
    pigBatches,
    feedPurchases,
    feedUsages,
    expenses,
    sales,
    mortalityRecords,
    exportData,
    importData,
    clearData,
    loadSampleData,
  } = useAppData();
  const [backupJson, setBackupJson] = useState("");
  const currentData = useMemo<BackupData>(
    () => ({
      pigBatches,
      feedPurchases,
      feedUsages,
      expenses,
      sales,
      mortalityRecords,
    }),
    [expenses, feedPurchases, feedUsages, mortalityRecords, pigBatches, sales]
  );
  const csvExports = useMemo(() => createCsvExports(currentData), [currentData]);
  const importPreview = useMemo(() => getBackupImportPreview(backupJson), [backupJson]);
  const previewCountRows = importPreview.counts
    ? [
        { label: "Pig batches", value: importPreview.counts.pigBatches },
        { label: "Feed purchases", value: importPreview.counts.feedPurchases },
        { label: "Feed usage", value: importPreview.counts.feedUsages },
        { label: "Expenses", value: importPreview.counts.expenses },
        { label: "Sales", value: importPreview.counts.sales },
        { label: "Mortality records", value: importPreview.counts.mortalityRecords },
      ]
    : [];

  const handleCopyBackup = async () => {
    try {
      const json = await exportData();
      await Clipboard.setStringAsync(json);
      setBackupJson(json);
      Alert.alert("Backup copied", "The current backup JSON was copied to your clipboard.");
    } catch {
      Alert.alert("Export failed", "The backup JSON could not be created.");
    }
  };

  const handlePasteBackup = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      setBackupJson(text);
    } catch {
      Alert.alert("Paste failed", "Could not read from clipboard.");
    }
  };

  const handleCopyCsv = async (csvExport: CsvExport) => {
    try {
      await Clipboard.setStringAsync(csvExport.csv);
      Alert.alert(
        "CSV copied",
        `${csvExport.title} was copied to your clipboard with ${csvExport.rowCount} data ${csvExport.rowCount === 1 ? "row" : "rows"}. Suggested file name: ${csvExport.fileName}`
      );
    } catch {
      Alert.alert("CSV export failed", "This CSV could not be copied to the clipboard.");
    }
  };

  const handleRestore = async () => {
    if (!importPreview.isValid) {
      Alert.alert(importPreview.title, importPreview.message);
      return;
    }

    try {
      await importData(backupJson);
      Alert.alert("Restore complete", "Your backup data has been restored.");
    } catch {
      Alert.alert("Invalid import JSON", "Please paste a valid backup JSON object and try again.");
    }
  };

  const handleClear = () => {
    showConfirmDialog({
      title: "Clear all data?",
      message:
        "This removes all local piggery records and leaves the app in a blank-slate state. This action cannot be undone.",
      confirmText: "Clear Data",
      onConfirm: () => clearData().then(() => setBackupJson("")).catch(() => Alert.alert("Clear failed", "Please try again.")),
    });
  };

  const handleLoadSample = () => {
    showConfirmDialog({
      title: "Load sample data?",
      message: "This replaces current local records with sample piggery data for testing.",
      confirmText: "Load Sample",
      destructive: false,
      onConfirm: () => loadSampleData().catch(() => Alert.alert("Sample data failed", "Please try again.")),
    });
  };

  return (
    <Screen>
      <AppCard style={styles.card}>
        <Text style={styles.appName}>Piggery Tracker MVP</Text>
        <Text style={styles.meta}>Currency: Philippine Peso (₱)</Text>
        <Text style={styles.meta}>Storage: Local device AsyncStorage</Text>
      </AppCard>

      <AppCard style={styles.card}>
        <Text style={styles.sectionTitle}>CSV exports</Text>
        <Text style={styles.description}>
          Copy spreadsheet-friendly CSV summaries for reporting, audits, or interview demos without changing local app data.
        </Text>
        <View style={styles.exportList}>
          {csvExports.map((csvExport) => (
            <View key={csvExport.id} style={styles.exportRow}>
              <View style={styles.exportCopy}>
                <Text style={styles.exportTitle}>{csvExport.title}</Text>
                <Text style={styles.exportDescription}>{csvExport.description}</Text>
                <Text style={styles.exportMeta}>
                  {csvExport.rowCount} data {csvExport.rowCount === 1 ? "row" : "rows"}
                </Text>
              </View>
              <AppButton
                title="Copy"
                variant="secondary"
                onPress={() => handleCopyCsv(csvExport)}
                style={styles.copyButton}
              />
            </View>
          ))}
        </View>
      </AppCard>

      <AppCard style={styles.card}>
        <Text style={styles.sectionTitle}>Data management</Text>
        <Text style={styles.description}>
          Sample data is loaded automatically only on the first launch. Clearing data here gives you a blank slate for a new-user view.
        </Text>
        <View style={styles.buttonStack}>
          <AppButton title="Load Sample Data" variant="secondary" onPress={handleLoadSample} />
          <AppButton title="Data Quality Audit" variant="secondary" onPress={() => navigation.navigate("DataQuality")} />
          <AppButton title="Copy Backup JSON" onPress={handleCopyBackup} />
          <AppButton title="Paste Backup JSON" variant="secondary" onPress={handlePasteBackup} />
          <AppButton title="Clear All Data / Blank Slate" variant="danger" onPress={handleClear} />
        </View>
      </AppCard>

      <AppInput
        label="Backup JSON"
        multiline
        value={backupJson}
        onChangeText={setBackupJson}
        placeholder="Paste backup JSON here to restore data."
        style={styles.backupInput}
      />

      <AppCard
        style={[
          styles.card,
          styles.previewCard,
          importPreview.status === "valid" && styles.previewValid,
          importPreview.status === "invalid" && styles.previewInvalid,
        ]}
      >
        <Text style={styles.sectionTitle}>Import preview</Text>
        <Text
          style={[
            styles.previewStatus,
            importPreview.status === "valid" && styles.previewStatusValid,
            importPreview.status === "invalid" && styles.previewStatusInvalid,
          ]}
        >
          {importPreview.title}
        </Text>
        <Text style={styles.description}>{importPreview.message}</Text>
        {previewCountRows.length > 0 && (
          <View style={styles.countGrid}>
            {previewCountRows.map((row) => (
              <View key={row.label} style={styles.countRow}>
                <Text style={styles.countLabel}>{row.label}</Text>
                <Text style={styles.countValue}>{row.value}</Text>
              </View>
            ))}
          </View>
        )}
        <AppButton
          title="Restore from Backup JSON"
          variant="secondary"
          onPress={handleRestore}
          disabled={!importPreview.isValid}
        />
      </AppCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 10,
  },
  appName: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "900",
  },
  meta: {
    color: colors.mutedText,
    fontSize: 14,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
  },
  description: {
    color: colors.mutedText,
    fontSize: 14,
    lineHeight: 20,
  },
  buttonStack: {
    gap: 8,
  },
  exportList: {
    gap: 10,
  },
  exportRow: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 12,
  },
  exportCopy: {
    flex: 1,
    gap: 4,
  },
  exportTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800",
  },
  exportDescription: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 18,
  },
  exportMeta: {
    color: colors.neutral,
    fontSize: 12,
    fontWeight: "700",
  },
  copyButton: {
    minWidth: 92,
  },
  backupInput: {
    minHeight: 180,
    fontSize: 13,
  },
  previewCard: {
    borderLeftColor: colors.neutral,
    borderLeftWidth: 4,
  },
  previewValid: {
    borderLeftColor: colors.positive,
  },
  previewInvalid: {
    borderLeftColor: colors.negative,
  },
  previewStatus: {
    color: colors.neutral,
    fontSize: 15,
    fontWeight: "800",
  },
  previewStatusValid: {
    color: colors.positive,
  },
  previewStatusInvalid: {
    color: colors.negative,
  },
  countGrid: {
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
  },
  countRow: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  countLabel: {
    color: colors.mutedText,
    fontSize: 13,
  },
  countValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "900",
  },
});

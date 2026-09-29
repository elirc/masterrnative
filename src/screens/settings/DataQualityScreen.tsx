import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AppCard } from "../../components/AppCard";
import { Screen } from "../../components/Screen";
import { colors } from "../../constants/colors";
import { useAppData } from "../../context/AppDataContext";
import type { DataQualityScreenProps } from "../../navigation/types";
import { auditDataQuality, type AuditSeverity, type DataQualityIssue } from "../../utils/audit";

function severityColor(severity: AuditSeverity): string {
  return severity === "error" ? colors.negative : colors.warning;
}

function issueTypeLabel(issue: DataQualityIssue): string {
  switch (issue.type) {
    case "orphan_record":
      return "Orphan Record";
    case "overdrawn_batch":
      return "Overdrawn Batch";
    case "negative_feed_inventory":
      return "Negative Inventory";
    case "duplicate_id":
      return "Duplicate ID";
  }
}

export function DataQualityScreen(_props: DataQualityScreenProps) {
  const { pigBatches, feedPurchases, feedUsages, expenses, sales, mortalityRecords, isLoading } = useAppData();
  const audit = useMemo(
    () =>
      auditDataQuality({
        pigBatches,
        feedPurchases,
        feedUsages,
        expenses,
        sales,
        mortalityRecords,
      }),
    [expenses, feedPurchases, feedUsages, mortalityRecords, pigBatches, sales]
  );

  return (
    <Screen>
      <AppCard style={styles.heroCard}>
        <Text style={styles.kicker}>Data Quality Audit</Text>
        <Text style={styles.title}>{audit.hasIssues ? "Review data issues" : "No data issues found"}</Text>
        <Text style={styles.description}>
          {isLoading
            ? "Checking local records..."
            : `${audit.summary.checkedRecords} records checked across batches, sales, feed, expenses, and mortality.`}
        </Text>
      </AppCard>

      <View style={styles.summaryGrid}>
        <AppCard style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{audit.summary.errors}</Text>
          <Text style={styles.summaryLabel}>Errors</Text>
        </AppCard>
        <AppCard style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{audit.summary.warnings}</Text>
          <Text style={styles.summaryLabel}>Warnings</Text>
        </AppCard>
        <AppCard style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{audit.summary.totalIssues}</Text>
          <Text style={styles.summaryLabel}>Total Issues</Text>
        </AppCard>
      </View>

      <AppCard style={styles.breakdownCard}>
        <Text style={styles.sectionTitle}>Audit categories</Text>
        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>Orphan records</Text>
          <Text style={styles.breakdownValue}>{audit.summary.orphanRecords}</Text>
        </View>
        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>Overdrawn batches</Text>
          <Text style={styles.breakdownValue}>{audit.summary.overdrawnBatches}</Text>
        </View>
        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>Negative inventory items</Text>
          <Text style={styles.breakdownValue}>{audit.summary.negativeInventoryItems}</Text>
        </View>
        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>Duplicate ids</Text>
          <Text style={styles.breakdownValue}>{audit.summary.duplicateIds}</Text>
        </View>
      </AppCard>

      {audit.issues.length === 0 ? (
        <AppCard style={styles.successCard}>
          <Text style={styles.successTitle}>Everything looks consistent</Text>
          <Text style={styles.description}>
            Batch references, pig counts, feed inventory, and record ids passed the current audit rules.
          </Text>
        </AppCard>
      ) : (
        audit.issues.map((issue) => (
          <AppCard key={issue.id} style={styles.issueCard}>
            <View style={styles.issueHeader}>
              <Text style={[styles.badge, { color: severityColor(issue.severity) }]}>
                {issue.severity.toUpperCase()} · {issueTypeLabel(issue)}
              </Text>
              <Text style={styles.issueTitle}>{issue.title}</Text>
            </View>
            <Text style={styles.issueMessage}>{issue.message}</Text>
            {issue.details.map((detail) => (
              <Text key={detail} style={styles.detailText}>
                {detail}
              </Text>
            ))}
            {issue.records.length > 0 && (
              <View style={styles.references}>
                <Text style={styles.referenceTitle}>Related records</Text>
                {issue.records.map((record) => (
                  <Text key={`${issue.id}:${record.collection}:${record.id}`} style={styles.referenceText}>
                    {record.collection}: {record.label}
                  </Text>
                ))}
              </View>
            )}
          </AppCard>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    gap: 8,
  },
  kicker: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "900",
  },
  description: {
    color: colors.mutedText,
    fontSize: 14,
    lineHeight: 20,
  },
  summaryGrid: {
    flexDirection: "row",
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    gap: 2,
  },
  summaryValue: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "900",
  },
  summaryLabel: {
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: "700",
  },
  breakdownCard: {
    gap: 10,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
  },
  breakdownRow: {
    alignItems: "center",
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 8,
  },
  breakdownLabel: {
    color: colors.mutedText,
    fontSize: 14,
  },
  breakdownValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "900",
  },
  successCard: {
    gap: 6,
  },
  successTitle: {
    color: colors.positive,
    fontSize: 17,
    fontWeight: "900",
  },
  issueCard: {
    gap: 10,
  },
  issueHeader: {
    gap: 4,
  },
  badge: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0,
  },
  issueTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "900",
  },
  issueMessage: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  detailText: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 19,
  },
  references: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 8,
    gap: 4,
    padding: 10,
  },
  referenceTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "900",
  },
  referenceText: {
    color: colors.mutedText,
    fontSize: 12,
    lineHeight: 18,
  },
});

import { StyleSheet, Text, View } from "react-native";

import { colors } from "../constants/colors";

interface SummaryCardProps {
  title: string;
  value: string;
  subtitle?: string;
  variant?: "neutral" | "positive" | "negative";
}

export function SummaryCard({ title, value, subtitle, variant = "neutral" }: SummaryCardProps) {
  return (
    <View style={[styles.card, styles[variant]]}>
      <Text style={styles.title}>{title}</Text>
      <Text style={[styles.value, styles[`${variant}Text`]]}>{value}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: "47%",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  neutral: {
    borderLeftColor: colors.neutral,
    borderLeftWidth: 4,
  },
  positive: {
    borderLeftColor: colors.positive,
    borderLeftWidth: 4,
  },
  negative: {
    borderLeftColor: colors.negative,
    borderLeftWidth: 4,
  },
  title: {
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  value: {
    color: colors.text,
    fontSize: 21,
    fontWeight: "900",
  },
  neutralText: {
    color: colors.text,
  },
  positiveText: {
    color: colors.positive,
  },
  negativeText: {
    color: colors.negative,
  },
  subtitle: {
    color: colors.mutedText,
    fontSize: 12,
  },
});

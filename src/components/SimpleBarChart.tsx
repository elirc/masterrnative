import { DimensionValue, StyleSheet, Text, View } from "react-native";

import { colors } from "../constants/colors";

interface SimpleBarChartItem {
  label: string;
  value: number;
  color?: string;
}

interface SimpleBarChartProps {
  title: string;
  data: SimpleBarChartItem[];
  formatValue?: (value: number) => string;
}

export function SimpleBarChart({ title, data, formatValue = String }: SimpleBarChartProps) {
  const maxValue = Math.max(...data.map((item) => Math.abs(item.value)), 1);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.rows}>
        {data.map((item) => {
          const width = `${Math.max((Math.abs(item.value) / maxValue) * 100, item.value === 0 ? 0 : 5)}%` as DimensionValue;
          return (
            <View key={item.label} style={styles.row}>
              <View style={styles.rowHeader}>
                <Text style={styles.label}>{item.label}</Text>
                <Text style={styles.value}>{formatValue(item.value)}</Text>
              </View>
              <View style={styles.track}>
                <View style={[styles.bar, { width, backgroundColor: item.color ?? colors.primary }]} />
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900",
  },
  rows: {
    gap: 10,
  },
  row: {
    gap: 5,
  },
  rowHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  label: {
    color: colors.text,
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
  },
  value: {
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: "700",
  },
  track: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 999,
    height: 10,
    overflow: "hidden",
  },
  bar: {
    borderRadius: 999,
    height: "100%",
  },
});

import { StyleSheet, Text, TextStyle } from "react-native";

import { colors } from "../constants/colors";
import { formatCurrency } from "../utils/currency";

interface CurrencyTextProps {
  amount: number;
  variant?: "neutral" | "positive" | "negative";
  style?: TextStyle;
}

export function CurrencyText({ amount, variant = "neutral", style }: CurrencyTextProps) {
  return <Text style={[styles.text, styles[variant], style]}>{formatCurrency(amount)}</Text>;
}

const styles = StyleSheet.create({
  text: {
    color: colors.text,
    fontWeight: "800",
  },
  neutral: {
    color: colors.text,
  },
  positive: {
    color: colors.positive,
  },
  negative: {
    color: colors.negative,
  },
});

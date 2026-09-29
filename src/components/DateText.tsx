import { StyleSheet, Text, TextStyle } from "react-native";

import { colors } from "../constants/colors";
import { formatDisplayDate } from "../utils/dates";

interface DateTextProps {
  date: string;
  style?: TextStyle;
}

export function DateText({ date, style }: DateTextProps) {
  return <Text style={[styles.text, style]}>{formatDisplayDate(date)}</Text>;
}

const styles = StyleSheet.create({
  text: {
    color: colors.mutedText,
    fontSize: 13,
  },
});

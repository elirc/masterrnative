import { StyleSheet, Text, View } from "react-native";

import { colors } from "../constants/colors";
import { AppButton } from "./AppButton";

interface EmptyStateProps {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {actionLabel && onAction ? <AppButton title={actionLabel} onPress={onAction} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 36,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  message: {
    color: colors.mutedText,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
});

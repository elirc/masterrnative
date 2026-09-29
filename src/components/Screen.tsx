import { PropsWithChildren } from "react";
import { ScrollView, StyleSheet, ViewStyle } from "react-native";

import { colors } from "../constants/colors";

interface ScreenProps extends PropsWithChildren {
  style?: ViewStyle;
}

export function Screen({ children, style }: ScreenProps) {
  return <ScrollView contentContainerStyle={[styles.content, style]}>{children}</ScrollView>;
}

const styles = StyleSheet.create({
  content: {
    backgroundColor: colors.background,
    gap: 12,
    padding: 16,
    paddingBottom: 32,
  },
});

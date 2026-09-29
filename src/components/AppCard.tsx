import { PropsWithChildren } from "react";
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from "react-native";

import { colors } from "../constants/colors";

interface AppCardProps extends PropsWithChildren {
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}

export function AppCard({ children, style, onPress }: AppCardProps) {
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed, style]}>
        {children}
      </Pressable>
    );
  }

  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
  },
  pressed: {
    opacity: 0.78,
  },
});

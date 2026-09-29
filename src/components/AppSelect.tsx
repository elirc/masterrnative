import { Picker } from "@react-native-picker/picker";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "../constants/colors";

interface AppSelectOption {
  label: string;
  value: string;
}

interface AppSelectProps {
  label: string;
  selectedValue?: string;
  onValueChange: (value: string) => void;
  options: AppSelectOption[];
  error?: string;
  enabled?: boolean;
}

export function AppSelect({ label, selectedValue, onValueChange, options, error, enabled = true }: AppSelectProps) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.pickerWrap, error && styles.inputError, !enabled && styles.disabled]}>
        <Picker selectedValue={selectedValue} enabled={enabled} onValueChange={(value) => onValueChange(String(value))}>
          {options.map((option) => (
            <Picker.Item key={option.value} label={option.label} value={option.value} />
          ))}
        </Picker>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 6,
  },
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  pickerWrap: {
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: colors.surface,
    minHeight: 48,
    justifyContent: "center",
    overflow: "hidden",
  },
  disabled: {
    opacity: 0.55,
  },
  inputError: {
    borderColor: colors.negative,
  },
  error: {
    color: colors.negative,
    fontSize: 12,
  },
});

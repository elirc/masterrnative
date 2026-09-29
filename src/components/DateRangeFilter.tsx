import { StyleSheet, View } from "react-native";

import { DateRangePreset, DATE_RANGE_PRESET_LABELS } from "../utils/dates";
import { AppInput } from "./AppInput";
import { AppSelect } from "./AppSelect";

interface DateRangeFilterProps {
  preset: DateRangePreset;
  onPresetChange: (preset: DateRangePreset) => void;
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
}

const presetOptions = Object.entries(DATE_RANGE_PRESET_LABELS).map(([value, label]) => ({ value, label }));

export function DateRangeFilter({
  preset,
  onPresetChange,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}: DateRangeFilterProps) {
  return (
    <View style={styles.wrapper}>
      <AppSelect
        label="Report range"
        selectedValue={preset}
        onValueChange={(value) => onPresetChange(value as DateRangePreset)}
        options={presetOptions}
      />
      {preset === "custom" ? (
        <View style={styles.customRow}>
          <AppInput
            label="Start date"
            placeholder="YYYY-MM-DD"
            value={startDate}
            onChangeText={onStartDateChange}
            style={styles.customInput}
          />
          <AppInput
            label="End date"
            placeholder="YYYY-MM-DD"
            value={endDate}
            onChangeText={onEndDateChange}
            style={styles.customInput}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 10,
  },
  customRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  customInput: {
    minWidth: 150,
  },
});

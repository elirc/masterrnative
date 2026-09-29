import { StyleSheet, View } from "react-native";

import { AppInput } from "./AppInput";
import { AppSelect } from "./AppSelect";

interface SelectOption {
  label: string;
  value: string;
}

interface ListControlsProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  sortValue: string;
  onSortChange: (value: string) => void;
  sortOptions: SelectOption[];
  filterLabel?: string;
  filterValue?: string;
  onFilterChange?: (value: string) => void;
  filterOptions?: SelectOption[];
}

export function ListControls({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search records",
  sortValue,
  onSortChange,
  sortOptions,
  filterLabel,
  filterValue,
  onFilterChange,
  filterOptions,
}: ListControlsProps) {
  return (
    <View style={styles.wrapper}>
      <AppInput label="Search" value={searchValue} onChangeText={onSearchChange} placeholder={searchPlaceholder} />
      <View style={styles.row}>
        <View style={styles.select}>
          <AppSelect label="Sort" selectedValue={sortValue} onValueChange={onSortChange} options={sortOptions} />
        </View>
        {filterOptions && filterValue !== undefined && onFilterChange ? (
          <View style={styles.select}>
            <AppSelect
              label={filterLabel ?? "Filter"}
              selectedValue={filterValue}
              onValueChange={onFilterChange}
              options={filterOptions}
            />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 10,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  select: {
    flex: 1,
    minWidth: 150,
  },
});

import { format, parseISO } from "date-fns";

export type DateRangePreset = "all_time" | "this_month" | "last_month" | "custom";

export interface DateRange {
  startDate?: string;
  endDate?: string;
}

export const DATE_RANGE_PRESET_LABELS: Record<DateRangePreset, string> = {
  all_time: "All Time",
  this_month: "This Month",
  last_month: "Last Month",
  custom: "Custom",
};

export const ISO_DATE_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isValidISODateString(dateString: string): boolean {
  const trimmedDate = dateString.trim();

  if (!ISO_DATE_INPUT_PATTERN.test(trimmedDate)) {
    return false;
  }

  const [yearText, monthText, dayText] = trimmedDate.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }

  const parsedDate = new Date(Date.UTC(year, month - 1, day));
  return (
    parsedDate.getUTCFullYear() === year &&
    parsedDate.getUTCMonth() === month - 1 &&
    parsedDate.getUTCDate() === day
  );
}

export function formatDisplayDate(dateString: string): string {
  if (!dateString) {
    return "";
  }

  try {
    return format(parseISO(dateString), "MMM d, yyyy");
  } catch {
    return dateString;
  }
}

export function getTodayISODate(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function getMonthDateRange(date: Date): DateRange {
  const startDate = format(new Date(date.getFullYear(), date.getMonth(), 1), "yyyy-MM-dd");
  const endDate = format(new Date(date.getFullYear(), date.getMonth() + 1, 0), "yyyy-MM-dd");
  return { startDate, endDate };
}

export function getDateRangeForPreset(
  preset: DateRangePreset,
  customRange: DateRange = {},
  now = new Date()
): DateRange {
  if (preset === "this_month") {
    return getMonthDateRange(now);
  }

  if (preset === "last_month") {
    return getMonthDateRange(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  }

  if (preset === "custom") {
    return {
      startDate: customRange.startDate?.trim() || undefined,
      endDate: customRange.endDate?.trim() || undefined,
    };
  }

  return {};
}

export function isDateInRange(dateString: string, range: DateRange): boolean {
  if (!dateString) {
    return false;
  }

  if (range.startDate && dateString < range.startDate) {
    return false;
  }

  if (range.endDate && dateString > range.endDate) {
    return false;
  }

  return true;
}

export function filterByDateRange<T>(
  items: T[],
  getDate: (item: T) => string,
  range: DateRange
): T[] {
  if (!range.startDate && !range.endDate) {
    return items;
  }

  return items.filter((item) => isDateInRange(getDate(item), range));
}

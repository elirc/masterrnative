import assert from "node:assert/strict";
import test from "node:test";

import {
  filterByDateRange,
  getDateRangeForPreset,
  isDateInRange,
  isValidISODateString,
} from "../src/utils/dates";

test("date range presets calculate this month and last month boundaries", () => {
  const now = new Date("2026-05-11T12:00:00.000Z");

  assert.deepEqual(getDateRangeForPreset("this_month", {}, now), {
    startDate: "2026-05-01",
    endDate: "2026-05-31",
  });
  assert.deepEqual(getDateRangeForPreset("last_month", {}, now), {
    startDate: "2026-04-01",
    endDate: "2026-04-30",
  });
});

test("custom date range trims empty boundaries and filters records inclusively", () => {
  const range = getDateRangeForPreset("custom", { startDate: "2026-05-10", endDate: " " });
  const records = [
    { id: "before", date: "2026-05-09" },
    { id: "start", date: "2026-05-10" },
    { id: "after", date: "2026-05-11" },
  ];

  assert.deepEqual(range, { startDate: "2026-05-10", endDate: undefined });
  assert.equal(isDateInRange("2026-05-10", range), true);
  assert.deepEqual(filterByDateRange(records, (record) => record.date, range).map((record) => record.id), [
    "start",
    "after",
  ]);
});

test("ISO date validation accepts real YYYY-MM-DD dates and rejects obvious invalid dates", () => {
  assert.equal(isValidISODateString("2026-05-12"), true);
  assert.equal(isValidISODateString("2024-02-29"), true);
  assert.equal(isValidISODateString("2026-2-9"), false);
  assert.equal(isValidISODateString("2026-02-29"), false);
  assert.equal(isValidISODateString("2026-13-01"), false);
  assert.equal(isValidISODateString("not-a-date"), false);
});

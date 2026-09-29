# Feature 15: Stronger Date Validation

## What This Feature Adds

Form date fields now require a real date in `YYYY-MM-DD` format. The validation rejects obvious invalid values like:

```txt
2026-2-9
2026-02-30
2026-13-01
not-a-date
```

Main files:

- `src/utils/dates.ts`
- `src/utils/validation.ts`
- `tests/dates.test.ts`
- `tests/validation.test.ts`

## Senior Engineer Rationale

The app uses date strings for sorting, filtering, reports, and display. That is a fine MVP choice when the dates are consistently formatted as `YYYY-MM-DD`, because lexicographic string comparison works:

```txt
2026-05-01 < 2026-05-12 < 2026-06-01
```

But that only works if every saved date follows the same format. If a user saves `2026-5-1`, the string no longer sorts the same way as `2026-05-01`. If a user saves `2026-02-30`, the date looks real at a glance but is not a real calendar date.

The key design choice was to strengthen validation at the schema layer. Every form already uses Zod, so date validation belongs in `src/utils/validation.ts`, not scattered across screens.

## Reusable Date Helper

`src/utils/dates.ts` now exports:

```ts
export const ISO_DATE_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
```

That regex checks the shape:

```txt
four digits - two digits - two digits
```

Shape alone is not enough. `2026-13-99` matches the regex but is not a real date. So the helper does a second calendar check:

```ts
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
```

The `Date.UTC` round-trip is the important part. JavaScript dates can overflow:

```ts
new Date(Date.UTC(2026, 1, 30))
```

That means "February 30, 2026" may become a March date internally. By checking the year, month, and day after parsing, we reject overflow dates.

## Zod Schema Integration

`src/utils/validation.ts` now imports the helper:

```ts
import { isValidISODateString } from "./dates";
```

Then it defines a small reusable schema builder:

```ts
const dateString = (message: string) =>
  requiredString(message).refine((value) => value.length === 0 || isValidISODateString(value), {
    message: "Use a real date in YYYY-MM-DD format",
  });
```

This function does two jobs:

1. It keeps the existing required-field message.
2. It adds a real date check when the field is not empty.

The empty-string guard matters because an empty field should say:

```txt
Sale date is required
```

not:

```txt
Use a real date in YYYY-MM-DD format
```

That gives the user a more accurate error.

## Schemas Updated

The form schemas now use `dateString` for business dates:

```ts
purchaseDate: dateString("Purchase date is required")
usageDate: dateString("Usage date is required")
expenseDate: dateString("Expense date is required")
saleDate: dateString("Sale date is required")
lossDate: dateString("Loss date is required")
```

This affects:

- pig batch purchase date
- feed purchase date
- feed usage date
- expense date
- sale date
- mortality/loss date

It also improves backup validation because the persisted record schemas are built from the same base form schemas.

## Why Metadata Dates Are Different

The persisted metadata schema still uses `requiredString`:

```ts
const persistedMetadataSchema = z.object({
  id: requiredString("ID is required"),
  createdAt: requiredString("Created date is required"),
  updatedAt: requiredString("Updated date is required"),
});
```

That is intentional. `createdAt` and `updatedAt` are full ISO timestamps, such as:

```txt
2026-05-12T17:30:00.000Z
```

They should not be validated with the `YYYY-MM-DD` helper because they have a different format.

## Tests

`tests/dates.test.ts` directly tests the reusable helper:

```ts
assert.equal(isValidISODateString("2026-05-12"), true);
assert.equal(isValidISODateString("2024-02-29"), true);
assert.equal(isValidISODateString("2026-2-9"), false);
assert.equal(isValidISODateString("2026-02-29"), false);
assert.equal(isValidISODateString("2026-13-01"), false);
assert.equal(isValidISODateString("not-a-date"), false);
```

This test covers:

- normal valid dates
- valid leap day
- missing zero padding
- invalid leap day
- invalid month
- non-date text

`tests/validation.test.ts` verifies that form schemas reject invalid dates:

```ts
const saleResult = saleSchema.safeParse({
  ...
  saleDate: "2026-02-30",
});
```

and:

```ts
const batchResult = pigBatchSchema.safeParse({
  ...
  purchaseDate: "2026-5-1",
});
```

This protects both layers:

- the low-level date helper
- the Zod schemas used by forms and backup validation

## Why This Is Good For The Demo

This feature is not flashy, but it is exactly the kind of quality improvement interviewers appreciate. It shows that you understand how a small inconsistency can affect reporting:

- date range filters depend on comparable strings
- reports depend on clean date fields
- backups should not import malformed records

## Interview Talking Point

"Because reports and filters rely on `YYYY-MM-DD` string dates, I centralized date validation in a reusable helper and wired it into the Zod schemas. That protects every form and backup import path without duplicating checks in screen components."

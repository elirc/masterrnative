# Feature 05: Stronger Backup Import Validation

## What This Feature Adds

Backup import now validates the full shape of imported data with Zod before writing it into AsyncStorage. Previously, import only checked that the top-level keys were arrays. That meant a malformed sale, batch, or expense could still be imported.

Main files:

- `src/utils/validation.ts`
- `src/context/AppDataContext.tsx`
- `tests/validation.test.ts`

## Senior Engineer Rationale

Settings allows users to paste JSON and restore it into the app. That is powerful, but it is also risky. Any time user-provided data crosses into storage, we should validate it.

TypeScript cannot protect us here because pasted JSON arrives at runtime. This is exactly where Zod is useful.

## Before

The old import parser checked only top-level arrays:

```ts
if (!Array.isArray(parsed[key])) {
  throw new Error(`Backup JSON is missing ${key}`);
}
```

That catches missing arrays, but not invalid records inside those arrays.

For example, this could slip through:

```json
{
  "sales": [
    {
      "quantitySold": 0
    }
  ]
}
```

## After

`src/utils/validation.ts` now exports `backupDataSchema`:

```ts
export const backupDataSchema = z.object({
  pigBatches: z.array(pigBatchRecordSchema),
  feedPurchases: z.array(feedPurchaseRecordSchema),
  feedUsages: z.array(feedUsageRecordSchema),
  expenses: z.array(expenseRecordSchema),
  sales: z.array(saleRecordSchema),
  mortalityRecords: z.array(mortalityRecordBackupSchema),
});
```

Each persisted record schema includes:

- form-level fields
- `id`
- `createdAt`
- `updatedAt`

For sales, the backup schema requires `totalRevenue` because persisted sales always store the calculated or fixed total.

## Context Integration

`AppDataContext.tsx` now parses backup JSON like this:

```ts
function parseBackupJson(json: string): BackupData {
  return backupDataSchema.parse(JSON.parse(json));
}
```

This is intentionally tiny. The context does not need to know every validation rule. It delegates that responsibility to the validation module.

## Why This Is Good Architecture

The validation module becomes the gatekeeper for data shape. Forms use it for input validation, and backup import uses it for persisted data validation. This keeps validation logic centralized.

## Testing

`tests/validation.test.ts` now checks that sample data passes backup validation and malformed data fails:

```ts
const invalidResult = backupDataSchema.safeParse({
  ...sampleData,
  sales: [
    {
      ...sampleData.sales[0],
      quantitySold: 0,
    },
  ],
});
```

This test protects an important rule: a sale cannot have zero pigs sold.

## Interview Talking Point

"Because backup restore accepts raw JSON, I added runtime validation with Zod before writing imported data into local storage. TypeScript helps during development, but Zod protects runtime boundaries."

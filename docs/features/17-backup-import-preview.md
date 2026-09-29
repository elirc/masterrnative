# Story 17: Backup Import Preview

## User Story

As a user restoring a local backup, I want to preview whether the pasted JSON is valid and see how many records it contains before I restore it, so that I can avoid overwriting my current app data with the wrong file.

## Why This Feature Exists

Restoring backup JSON is a high-risk action. It replaces the local data stored in AsyncStorage. Before this story, the user could paste JSON and press restore, but they did not get feedback until after the restore attempt.

The new flow gives the user an intermediate safety check:

```text
Paste or type JSON
  -> parse JSON
  -> validate against backupDataSchema
  -> show valid/invalid status
  -> show counts when valid
  -> enable Restore only when valid
```

This makes Settings feel more trustworthy. It also gives you an interview-ready explanation of defensive UX: the app validates destructive input before allowing the destructive action.

## Senior Engineering Approach

The main decision was to reuse the existing schema instead of creating separate preview validation.

The project already has:

```ts
backupDataSchema
```

in:

```text
src/utils/validation.ts
```

That schema defines the real backup shape the app accepts. The preview should use the same schema because the preview and restore operation must agree.

The feature therefore adds:

```ts
getBackupImportPreview(json)
```

in:

```text
src/utils/exporters.ts
```

The name lives in `exporters.ts` because this story sits next to Settings data import/export UX. If this area grows much larger, a future cleanup could split backup import helpers into `backupPreview.ts`, but keeping it with Settings export helpers is reasonable for this project size.

## File Connections

### `src/utils/validation.ts`

This file owns the schema:

```ts
export const backupDataSchema = z.object({
  pigBatches: z.array(pigBatchRecordSchema),
  feedPurchases: z.array(feedPurchaseRecordSchema),
  feedUsages: z.array(feedUsageRecordSchema),
  expenses: z.array(expenseRecordSchema),
  sales: z.array(saleRecordSchema),
  mortalityRecords: z.array(mortalityRecordBackupSchema),
}) satisfies z.ZodType<BackupData>;
```

The important point for a junior engineer: this is runtime validation. TypeScript checks code while we develop, but TypeScript cannot prove that pasted clipboard text is valid. Zod can inspect the actual runtime value.

### `src/utils/exporters.ts`

This story adds three related pieces:

```ts
export interface BackupRecordCounts {
  pigBatches: number;
  feedPurchases: number;
  feedUsages: number;
  expenses: number;
  sales: number;
  mortalityRecords: number;
  totalRecords: number;
}
```

```ts
export function getBackupRecordCounts(data: BackupData): BackupRecordCounts
```

```ts
export function getBackupImportPreview(json: string): BackupImportPreview
```

The count helper is intentionally separate from the preview helper. This keeps each function focused:

- `getBackupRecordCounts` answers: "How many records are in this valid backup?"
- `getBackupImportPreview` answers: "What should the UI say about this raw text?"

### `src/screens/settings/SettingsScreen.tsx`

The screen stores user input:

```ts
const [backupJson, setBackupJson] = useState("");
```

Then derives the preview:

```ts
const importPreview = useMemo(() => getBackupImportPreview(backupJson), [backupJson]);
```

This is a useful React pattern:

- `backupJson` is source state.
- `importPreview` is derived state.

We do not need a second `useState` for preview because it can always be recalculated from `backupJson`.

## The Preview Union Type

`BackupImportPreview` is a discriminated union:

```ts
export type BackupImportPreview =
  | {
      status: "empty";
      isValid: false;
      title: string;
      message: string;
      counts: null;
    }
  | {
      status: "invalid";
      isValid: false;
      title: string;
      message: string;
      counts: null;
    }
  | {
      status: "valid";
      isValid: true;
      title: string;
      message: string;
      counts: BackupRecordCounts;
    };
```

This type gives the UI a clear contract.

If `status` is `"valid"`, counts exist. If the status is `"empty"` or `"invalid"`, counts are `null`.

That makes UI code safer:

```ts
const previewCountRows = importPreview.counts
  ? [
      { label: "Pig batches", value: importPreview.counts.pigBatches },
      { label: "Feed purchases", value: importPreview.counts.feedPurchases },
    ]
  : [];
```

The UI does not need to guess whether counts exist.

## How `getBackupImportPreview` Works

The function has four stages.

### Stage 1: Empty Input

```ts
const trimmedJson = json.trim();

if (!trimmedJson) {
  return {
    status: "empty",
    isValid: false,
    title: "No backup JSON yet",
    message: "Paste or type backup JSON to preview the records before restoring.",
    counts: null,
  };
}
```

This handles the initial screen state. An empty text box is not an error. It is simply waiting for input.

### Stage 2: JSON Parse

```ts
let parsedJson: unknown;
try {
  parsedJson = JSON.parse(trimmedJson);
} catch {
  return {
    status: "invalid",
    isValid: false,
    title: "Invalid JSON",
    message: "The text is not valid JSON. Check for missing braces, quotes, or commas.",
    counts: null,
  };
}
```

This answers: "Is the text JSON at all?"

Example invalid input:

```json
{ pigBatches: [] }
```

That looks object-like to a person, but it is not valid JSON because property names need quotes.

### Stage 3: Backup Schema Validation

```ts
const parsedBackup = backupDataSchema.safeParse(parsedJson);

if (!parsedBackup.success) {
  const firstIssue = parsedBackup.error.issues[0];
  const path = firstIssue?.path.length ? firstIssue.path.join(".") : "backup root";
  const detail = firstIssue ? `${path}: ${firstIssue.message}` : "The backup shape is invalid.";

  return {
    status: "invalid",
    isValid: false,
    title: "Invalid backup shape",
    message: `The JSON is readable, but it does not match this app's backup format. First issue: ${detail}`,
    counts: null,
  };
}
```

This answers: "It is JSON, but is it this app's backup JSON?"

Example wrong-shape input:

```json
{
  "pigBatches": []
}
```

That is valid JSON, but it is not a complete app backup because it is missing:

- `feedPurchases`
- `feedUsages`
- `expenses`
- `sales`
- `mortalityRecords`

Using `safeParse` is important. It returns a result object instead of throwing, which makes it easier to show a controlled preview message.

### Stage 4: Valid Counts

```ts
const counts = getBackupRecordCounts(parsedBackup.data);

return {
  status: "valid",
  isValid: true,
  title: "Valid backup ready to restore",
  message: formatBackupCountSummary(counts),
  counts,
};
```

Once the schema passes, we know the data is safe to count.

The summary message looks like:

```text
6 total records: 1 pig batch, 1 feed purchase, 1 feed usage, 1 expense, 1 sale, 1 mortality record.
```

That is helpful because the user can quickly notice if they pasted a tiny test backup instead of their real business backup.

## Settings Restore Gate

The restore handler now checks the preview first:

```ts
const handleRestore = async () => {
  if (!importPreview.isValid) {
    Alert.alert(importPreview.title, importPreview.message);
    return;
  }

  await importData(backupJson);
};
```

The button is also disabled unless the preview is valid:

```tsx
<AppButton
  title="Restore from Backup JSON"
  variant="secondary"
  onPress={handleRestore}
  disabled={!importPreview.isValid}
/>
```

This is defense in depth:

- The button is disabled in normal use.
- The handler still checks validity in case the function is called another way.
- `importData` still validates again before writing to storage.

A senior engineer should like that layering because no single UI state is trusted as the only protection.

## Why Restore Still Validates Again

You might ask: if preview validates the JSON, why does `importData` still parse and validate again?

Because preview is UI guidance. Restore is the write boundary.

The actual storage write should always validate its own input. That protects the app if:

- A future screen calls `importData` directly.
- A stale preview is somehow used.
- The implementation changes later.

So the flow is:

```text
Preview validation: helps the user decide.
Import validation: protects the storage write.
```

Both use the same `backupDataSchema`, so they agree on what valid means.

## Tests

Tests live in:

```text
tests/exporters.test.ts
```

The preview test covers four states:

```ts
assert.equal(getBackupImportPreview("").status, "empty");
assert.equal(getBackupImportPreview("{not json").status, "invalid");

const wrongShape = getBackupImportPreview(JSON.stringify({ pigBatches: [] }));
assert.equal(wrongShape.status, "invalid");

const valid = getBackupImportPreview(JSON.stringify(makeBackupData()));
assert.equal(valid.status, "valid");
```

This is high-value coverage because it exercises the exact states the Settings UI renders.

## How To Demo This Feature

During the interview, you can show:

1. Open Settings.
2. Click `Copy Backup JSON`.
3. The JSON appears in the text box.
4. The Import Preview card says the backup is valid.
5. It shows counts for pig batches, feed purchases, feed usage, expenses, sales, and mortality records.
6. Delete a brace or paste invalid text.
7. The preview changes to invalid and restore is disabled.

Your explanation:

> This is a local-first app, so backup restore is one of the most sensitive data flows. I added a preview layer that parses pasted JSON, validates it with the same Zod schema used by import, and shows record counts before enabling restore. The actual import still validates again at the storage boundary, so the UI is helpful but not the only protection.

## Common Junior Engineer Questions

### Why not just catch errors after pressing restore?

Because restore is destructive. Good UX prevents preventable mistakes before the action.

### Why use Zod instead of TypeScript here?

TypeScript cannot inspect text pasted from the clipboard at runtime. Zod can parse the actual JavaScript object created by `JSON.parse`.

### Why count records before import?

Counts give the user a quick sanity check. If a user expects 200 sales but the preview shows 1 sale, they probably pasted the wrong backup.

### Why is the preview helper in `exporters.ts`?

This feature is part of the Settings import/export surface. The helper is pure and tested. If backup workflows grow further, the pure helper can be moved without changing the screen behavior.

## Future Improvements

Good next steps:

- Add backup schema versioning so future app versions can migrate old backups.
- Show the backup's newest and oldest activity dates.
- Show warnings when a backup has zero batches but many transactions.
- Add a confirmation dialog that repeats the record counts before the final restore.
- Support downloadable backup files instead of clipboard-only JSON.

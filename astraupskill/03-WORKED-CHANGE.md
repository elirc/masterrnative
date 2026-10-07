# Worked change: reject a missing update

The baseline in [the snapshot](snapshots/src/context/AppDataContext.tsx) repeated the same silent pattern six times. For a pig batch it computed `pigBatches.map((item) => (item.id === batch.id ? batch : item))` (snapshot line 141). A stale id yielded an array equal to the original, then the storage writer ran and the state setter accepted it.

Before (snapshot, lines 141-143):

```ts
const next = pigBatches.map((item) => (item.id === batch.id ? batch : item));
await savePigBatches(next);
setPigBatches(next);
```

After (`src/context/AppDataContext.tsx`, lines 142-144):

```ts
const next = replaceRecordById(pigBatches, batch);
await savePigBatches(next);
setPigBatches(next);
```

The helper ([collection.ts](../src/utils/collection.ts)) is the whole change:

```ts
export function replaceRecordById<T extends { id: string }>(records: readonly T[], replacement: T): T[] {
  const index = records.findIndex((record) => record.id === replacement.id);
  if (index < 0) {
    throw new Error(`Record '${replacement.id}' was not found.`);
  }

  return records.map((record) => (record.id === replacement.id ? replacement : record));
}
```

Trace: valid id → index found → new array → storage write → state update; missing id → index -1 → throw → no write, no state change. The same production helper is used for all six record types, so the test does not copy the algorithm.

Why `findIndex` *then* `map`, instead of `const c = [...records]; c[index] = replacement`? Because the baseline replaced **every** matching id, and the change was meant to add a guard without changing that contract. The shortcut would only replace the first duplicate — the third runtime test fails if you try it (see [05-PRACTICE.md](05-PRACTICE.md), exercise 3).

The helper builds a fresh array without mutating its input. Unchanged records keep their object references; this is shallow structural preservation, not deep immutability. The missing branch is synchronous: inside an `async` context callback that throw becomes a rejected promise *before* the first `await`, so a storage failure and a missing resource never share one success path.

Caller review (source, not executed): every form wraps its context call in `try { … } catch { Alert.alert(...) }` — for example `BatchFormScreen.tsx:54-63`. Feed usage delegates through `saveUsage` (`FeedUsageFormScreen.tsx:56`), awaited inside try/catch at line 104, and its warning-dialog button attaches `.catch` at line 96. Note that the bare `catch {}` discards the error object, so the user sees the generic "could not be saved" text, not the helper's "was not found" message.

The executable test [collection-runtime.test.mjs](../tests/collection-runtime.test.mjs) checks order-preserving replacement, missing-id rejection, and duplicate-id replacement against the actual `.ts` source. It does not mount `AppDataProvider`, exercise AsyncStorage, or prove a form renders the alert.

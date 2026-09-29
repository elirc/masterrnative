# Worked change: reject a missing update

The baseline in [the snapshot](snapshots/src/context/AppDataContext.tsx) repeated the same silent pattern. For a pig batch it computed `pigBatches.map(item => item.id === batch.id ? batch : item)`. The other five update callbacks did the same. A stale id yielded the original array, then the storage writer ran and the state setter accepted that unchanged array.

Before:

```ts
const next = pigBatches.map((item) => (item.id === batch.id ? batch : item));
await savePigBatches(next);
setPigBatches(next);
```

After:

```ts
const next = replaceRecordById(pigBatches, batch);
await savePigBatches(next);
setPigBatches(next);
```

The helper’s trace is small: find index, throw if negative, map all matching ids. Trace table: valid id → index found → new array → storage write → state update; missing id → no index → error → no write. The same production helper is used for all six record types, so the test does not copy the algorithm.

The executable test [collection-runtime.test.mjs](../tests/collection-runtime.test.mjs) checks order-preserving replacement and missing-id rejection against the actual `.ts` source. It does not mount `AppDataProvider`, exercise AsyncStorage, or prove a form handles the thrown error. That is an intentional bounded risk: the production behavior is now explicit, and a later UI test can decide how to render the error.
The helper builds a fresh array without mutating its input. Unchanged records retain their original object references, and the replacement object is shared by matching positions; this is shallow structural preservation, not deep immutability. The missing branch is synchronous and deterministic. This matters because an asynchronous storage failure and a missing resource should not share one ambiguous success path or one generic toast.

The implementation uses findIndex followed by map so the identity precondition is established before a new collection is built. A reviewer can ask whether an absent id can reach save and whether neighboring rows preserve order. The focused runtime check answers those helper questions; it does not claim a mounted provider, AsyncStorage adapter, or concurrent writer was executed.

Caller review found existing save-error handling in all six form paths. Feed usage delegates through saveUsage, whose normal submit awaits inside try/catch and whose warning-button path attaches catch. This was inspected in source, not exercised through React. The helper checks the collection captured by the callback; it does not reread AsyncStorage, so it cannot detect every stale-screen or concurrent deletion scenario.

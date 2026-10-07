# Codebase map: local CRUD state

The entry point for data is [AppDataContext.tsx](../src/context/AppDataContext.tsx). It owns six arrays: pig batches, feed purchases, feed usage, expenses, sales, and mortality records. Each collection exposes add, update, and delete callbacks inside the `useMemo` value that starts at `AppDataContext.tsx:127`. Add prepends a record (`[batch, ...pigBatches]`, line 137), update replaces by id (line 142), and delete filters by id (line 147). Each callback writes the complete next collection through a storage function and only then updates React state. `refreshData`, import, export, and clear operate through the same storage service boundary.

## Reading order

| Step | File | What to look for |
|---|---|---|
| 1 | [src/types/models.ts](../src/types/models.ts) | the six record types; every one carries `id`, `createdAt`, `updatedAt` |
| 2 | [src/services/storageService.ts](../src/services/storageService.ts) | `saveList` (line 33) is one `AsyncStorage.setItem` of the whole JSON array per collection key |
| 3 | [src/context/AppDataContext.tsx](../src/context/AppDataContext.tsx) | the six `update*` callbacks at lines 142, 157, 172, 187, 202, 217, all calling `replaceRecordById` |
| 4 | [src/utils/collection.ts](../src/utils/collection.ts) | the 8-line identity helper |
| 5 | [src/screens/transactions/SaleFormScreen.tsx](../src/screens/transactions/SaleFormScreen.tsx) | a caller that awaits `updateSale`, then may also `updatePigBatch` (lines 90-106) |
| 6 | [tests/collection-runtime.test.mjs](../tests/collection-runtime.test.mjs) | the three runtime cases against the real helper |

Validation and backup parsing live in [validation.ts](../src/utils/validation.ts). The [collection helper](../src/utils/collection.ts) is deliberately independent of React and storage: it finds the index, throws a clear error when absent, and returns a new array with every matching id replaced. That keeps the mutation policy testable without mounting Expo components.

Trace an update: form submit → context callback → `replaceRecordById` → storage writer → state setter. An existing id follows all five steps. A missing id stops at the helper, so neither the storage writer nor the state setter is reached. Before the change, a missing id produced an unchanged array that was still written to storage and set into state — a false success. The exact baseline is [snapshots/src/context/AppDataContext.tsx](snapshots/src/context/AppDataContext.tsx); `diff` it against the live file and you will see exactly seven changed lines (one import plus six call sites).

Out of scope for this map: native Expo rendering, AsyncStorage behavior on a device, and form navigation. The map is collection-oriented rather than screen-oriented because batch forms, transaction screens, and settings screens all reuse the same context shape; one helper prevents six copies of the stale-id bug while each storage writer still owns its own collection key.

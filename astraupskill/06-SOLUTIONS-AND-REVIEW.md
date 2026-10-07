# Solutions and review rubric

Answers to [05-PRACTICE.md](05-PRACTICE.md). The break-it results below were executed on a scratch copy of the helper and test on 2026-10-06 (Node v22.16.0), not inferred.

## Solutions

1. `[a, b']`, order preserved; `result !== records`, and `result[0]` is the *same object* as `records[0]` (shallow preservation).
2. Only **test 2** fails (`not ok 2 - replaceRecordById rejects a missing id…`; `# pass 2`, `# fail 1`). Tests 1 and 3 never reach the missing branch.
3. Only **test 3** fails (`not ok 3 - retains legacy replacement of duplicate ids…`). The shortcut replaces the first duplicate only; the baseline `map` replaced every matching id, and the change promised not to alter that.
4. **Tests 1 and 3** fail (`# pass 1`, `# fail 2`): the found path now returns `undefined`, while test 2 (throw path) still passes. Type stripping removes annotations without type-checking, so the `T[]` return type is never enforced; `tsc` (via `pnpm typecheck` after an install) would report the missing return.
5. `assert.deepEqual(result[0], { id: "a", value: 2, note: "x" })` passes because the helper stores the supplied object unchanged.
6. `updateSale` (`AppDataContext.tsx:202`) throws at `collection.ts:4` before `saveSales` runs; the rejected promise lands in the bare `catch` at `SaleFormScreen.tsx:105`, which shows "The sale could not be saved. Please try again." The specific message is discarded, and retrying cannot succeed, so "try again" is misleading for this case.
7. A repeated delete (double tap, retry after an error) expresses the same intent and reaches the same end state; an update for an absent id signals a stale identity and must be surfaced.
8. See F1 below.
9. A good sketch mocks `../services/storageService`, renders `AppDataProvider` (or extracts the callbacks into a testable factory), calls `updateSale` with an unknown id, expects a rejection, and asserts `saveSales` was called 0 times; then 1 time for a known id.

## Verified review findings

**F1: two sequential writes behind one failure message.** `SaleFormScreen.tsx:91-103` awaits `updateSale`/`addSale`, recomputes remaining quantity, then may await `updatePigBatch({ ...batch, status: "sold_out", ... })`. `MortalityFormScreen.tsx:66-78` does the same with status `"closed"`. If the second write rejects, the sale is already persisted under `piggery_sales`, yet the alert says "The sale could not be saved." A user who retries an *add* creates a duplicate sale (new id from `createId()`). Nothing spans the two AsyncStorage keys: `saveList` (`storageService.ts:33-35`) is one `setItem` per key. Fix direction: report the two failures differently, or stop persisting a derived status (`calculations.ts:312` already derives `sold_out` from quantity for display).

**F2: the screen re-implements the old silent `map`.** `SaleFormScreen.tsx:97-99` and `MortalityFormScreen.tsx:73-75` rebuild the next collection with `sales.map((sale) => (sale.id === nextSale.id ? nextSale : sale))` to compute remaining quantity. It is harmless today only because `updateSale` already threw for a missing id; it duplicates the policy the helper was meant to own.

**F3: error detail discarded.** All six form screens use `catch {` without binding the error (for example `BatchFormScreen.tsx:61`, `ExpenseFormScreen.tsx:56`, `FeedUsageFormScreen.tsx:105`). Identity, validation, and storage failures are indistinguishable to the user and to any log.

**F4: whole-array last-writer-wins.** Each callback writes the array captured by its closure. A stale closure that still contains a deleted id passes the guard and resurrects the record. Preventing that needs a version check or a re-read before write, not a stronger helper.

## Rubric

Accept a change only if: every update callback uses the same helper (`grep -n replaceRecordById src/context/AppDataContext.tsx` shows 1 import + 6 calls); valid replacement preserves order; missing identity throws before any `await`; add/delete behavior is unchanged; tests import the production source rather than a copied predicate. Reject a patch that inserts a missing update, converts update to add, or catches the error and reports success. Check separately that the docs do not claim AsyncStorage durability or rendered-alert behavior that was never executed.

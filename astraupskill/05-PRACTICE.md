# Graduated practice

Every exercise has a **Goal** and a **Check**. Checks marked *runnable* need only Node 22.6+ and no install. For break-it exercises, work on a scratch branch (`git switch -c practice`) and run `git restore src/utils/collection.ts` afterwards. Record your prediction **before** running anything; answers are in [06-SOLUTIONS-AND-REVIEW.md](06-SOLUTIONS-AND-REVIEW.md).

Baseline command used by every runnable check:

```text
node --experimental-strip-types --test tests/collection-runtime.test.mjs
```

On an unmodified checkout it prints `# pass 3` / `# fail 0` (re-run 2026-10-06, Node v22.16.0).

## 1. Predict replacement order

**Goal:** given records `a, b` and a replacement `b'`, predict the returned array and whether `result === records`.
**Check (runnable):** test 1 asserts exactly this (`assert.notEqual(result, records)`, `assert.equal(result[0], records[0])`). Run the baseline command; test 1 must pass.

## 2. Break the guard

**Goal:** change `index < 0` to `index < -1` in `src/utils/collection.ts:3`. Predict which of the three tests fail.
**Check (runnable):** run the baseline command and compare the `not ok` lines with your prediction.

## 3. Take the tempting shortcut

**Goal:** replace line 7 with `const c = [...records]; c[index] = replacement; return c;`. It looks equivalent and avoids a second pass. Predict whether it is.
**Check (runnable):** run the baseline command. Then explain, in one sentence, which baseline contract the shortcut breaks.

## 4. Forget to return

**Goal:** delete the word `return` on line 7 (so the function ends after `records.map(...)`). Predict which tests fail, and why TypeScript would have caught it but `--experimental-strip-types` does not.
**Check (runnable):** run the baseline command.

## 5. Add your own case

**Goal:** add a fourth `test(...)` to `tests/collection-runtime.test.mjs` proving that extra fields on the replacement survive (for example replacement `{ id: "a", value: 2, note: "x" }`).
**Check (runnable):** the baseline command prints `# pass 4`. Then make it fail on purpose by asserting `note` is `undefined`, confirm `# fail 1`, and revert.

## 6. Who sees the error?

**Goal:** a sale is deleted on another screen, then a stale edit form submits. Trace from `SaleFormScreen.tsx:92` to the user. What exact text does the user read, and where is `Record '<id>' was not found.` lost?
**Check (source):** your answer cites `AppDataContext.tsx:202`, the throw at `collection.ts:4`, and the bare `catch` at `SaleFormScreen.tsx:105-106`.

## 7. Delete vs update

**Goal:** explain why `deleteSale` stays idempotent while `updateSale` rejects absence.
**Check (source):** point at `AppDataContext.tsx:206-207` (`sales.filter(...)`) and give one user action where an idempotent delete is the right behavior.

## 8. Two writes, one alert (senior)

**Goal:** in `SaleFormScreen.tsx:90-106` the screen awaits `updateSale`/`addSale`, then may await `updatePigBatch`. Suppose the second write rejects. List what is persisted, what the user is told, and what happens if they press save again on an *add*.
**Check (source):** compare with finding F1 in 06. A complete answer names both storage keys (`piggery_sales` and `piggery_pig_batches`, `storageService.ts:13-21`).

## 9. Design the provider test (senior)

**Goal:** sketch a test that proves `saveSales` is **not** called for a missing sale id, using the real context callback rather than a copied `map`.
**Check (design):** your sketch names the seam you would replace (the `../services/storageService` import) and asserts a call count of 0 after rejection and 1 after a valid update. The repo has no such test today; say so in your write-up rather than claiming coverage.

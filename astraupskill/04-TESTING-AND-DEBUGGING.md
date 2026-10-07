# Testing and debugging the update path

## Two test suites, two commands

| Suite | Files | Tests | Command | Needs install? |
|---|---|---|---|---|
| Focused runtime check | `tests/collection-runtime.test.mjs` | 3 | `node --experimental-strip-types --test tests/collection-runtime.test.mjs` | No (Node 22.6+) |
| Project suite (`npm test`) | `tests/*.test.ts` (audit 5, calculations 10, collection 2, dates 3, exporters 4, validation 10) | 34 | `pnpm install` then `pnpm test` | Yes — `tsc` comes from devDependencies |

`npm test` is `tsc -p tsconfig.test.json && node --test ".test-dist/tests/**/*.test.js"`. `tsconfig.test.json` only includes `tests/**/*.test.ts`, so the `.mjs` runtime check is **not** part of `npm test`; run it separately. The counts above are `test(` occurrences per file, counted 2026-10-06.

## Debugging with two observations

Start with the requested id and the number of storage writes. For a valid id, expect one replacement, one persistence call, and one state update. For a missing id, expect a thrown error, zero persistence calls, and unchanged state. The old implementation made both traces look like success because it always continued after `map`.

| Event | Existing id | Missing id |
|---|---|---|
| lookup | index found | index -1 |
| array | matching ids replaced | no array produced |
| storage | `setItem` called once | not called |
| state | setter reached | setter not reached |
| user result | `navigation.goBack()` | generic "Save failed" alert |

Only the first two rows are executed by the runtime test. The storage and state rows are consequences read from `AppDataContext.tsx:142-144`, not recorded calls.

## Symptom → where to look

- **Alert appears but you need the real reason:** the form's bare `catch {}` (e.g. `BatchFormScreen.tsx:61`) throws the error away. Temporarily change it to `catch (e) { console.warn(e); … }` locally to see `Record '<id>' was not found.` — do not weaken the helper.
- **A valid update reorders the list:** inspect the `map` id comparison in `collection.ts:7`.
- **Storage receives an unchanged array:** confirm the callback imports and calls the helper (`grep -n replaceRecordById src/context/AppDataContext.tsx` should print the import plus six call sites).
- **Sale saved but batch still "active":** that is the two-write path in `SaleFormScreen.tsx:91-103`; see the finding in [06](06-SOLUTIONS-AND-REVIEW.md).

A future provider test should inject storage writers and assert a call-count of zero after the missing branch and one after a valid branch. That check belongs at the context/storage seam; the focused helper test intentionally stays below React and does not pretend to cover it.

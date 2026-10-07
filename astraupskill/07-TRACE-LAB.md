# Trace lab: six collections, two identities

Run the same trace for pig batches, feed purchases, feed usage, expenses, sales, and mortality records. The collection type and storage key change; the identity contract does not. Use a valid id in the first trace and a stale id in the second.

| Collection | Update callback (`AppDataContext.tsx`) | Storage key (`storageService.ts:13-21`) |
|---|---|---|
| pig batches | line 141 | `piggery_pig_batches` |
| feed purchases | line 156 | `piggery_feed_purchases` |
| feed usage | line 171 | `piggery_feed_usages` |
| expenses | line 186 | `piggery_expenses` |
| sales | line 201 | `piggery_sales` |
| mortality | line 216 | `piggery_mortality_records` |

| Stage | Valid replacement | Stale replacement |
|---|---|---|
| source array | contains id | lacks id |
| helper | returns new array | throws |
| storage | one `setItem` for that key | none |
| state | replacement visible | old array retained |
| user | screen navigates back | generic "Save failed" alert |

Now add a duplicate id to the source. The helper replaces both matching positions, preserving the original `map` behavior (runtime test 3). The guard establishes existence, not uniqueness; duplicate detection already exists as a data-quality concern in [audit.ts](../src/utils/audit.ts) (covered by `tests/audit.test.ts`), and should not be conflated with missing-id correctness.

Trace the call from a form handler into the context. The helper is synchronous; storage is asynchronous. Because the context callback is `async`, the helper's throw becomes a rejected promise before the storage `await`, and the screen's `try/catch` receives it. A storage rejection is a different failure: the helper succeeded and the error arrives after the writer. Both currently produce the same alert text (see F3 in [06](06-SOLUTIONS-AND-REVIEW.md)), which is why a bug report saying "update failed" needs the trace above to locate where.

**Check:** run `node --experimental-strip-types --test tests/collection-runtime.test.mjs` to confirm the "source array" and "helper" rows (3 pass). The storage, state, and user rows are source-inspected; this lab does not claim a rendered screen or a device storage run.

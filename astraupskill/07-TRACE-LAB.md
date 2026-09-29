# Trace lab: six collections, two identities

Run the same trace for pig batches, feed purchases, feed usage, expenses, sales, and mortality records. The collection type changes, but the identity contract is the same. Use a valid id in the first trace and a stale id in the second.

| Stage | Valid replacement | Stale replacement |
|---|---|---|
| source array | contains id | lacks id |
| helper | returns new array | throws |
| storage | one typed writer | none |
| state | replacement visible | old array retained |
| audit question | expected success | stale edit surfaced |

Now add a duplicate id to the source. The helper replaces both matching positions, preserving the original map behavior. The new guard establishes existence, not uniqueness; duplicate cleanup is a separate data-quality policy. The existing audit tests already inspect duplicate ids across collections, so a future enhancement could compose that audit with UI errors. It should not be conflated with missing-id correctness.

Trace the call from a form handler into the context. The helper is synchronous, while storage is asynchronous. The helper throws before the storage await. Because its context caller is async, the screen receives a rejected promise and must await or catch that promise. For a storage rejection, the helper succeeded and the caller must handle a different failure after the writer. This distinction helps debug reports that say “update failed” without identifying where.

Use [collection-runtime.test.mjs](../tests/collection-runtime.test.mjs) to confirm the first two stages, then inspect the source links. The lab does not claim a rendered screen or persistent storage run.

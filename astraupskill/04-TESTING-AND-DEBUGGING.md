# Testing and debugging the update path

Start debugging with two observations: the requested id and the number of storage writes. For a valid id, expect one replacement, one persistence call, and one state update. For a missing id, expect a clear error, zero persistence calls, and unchanged state. The old implementation made both traces look like success because it always continued after `map`.

The focused runtime test is [collection-runtime.test.mjs](../tests/collection-runtime.test.mjs). It imports [collection.ts](../src/utils/collection.ts) directly through Node’s experimental type stripping, avoiding a copied JavaScript predicate. The first case verifies that neighboring records remain ordered. The second verifies the missing-id error. A future context test should inject storage writers and assert they are not called when the helper throws.

Trace table:

| Event | Existing id | Missing id |
|---|---|---|
| lookup | index found | index -1 |
| array | matching ids replaced | no array produced |
| storage | called once | not called |
| state | setter reached | setter not reached |
| user result | success | error boundary |

If the error is swallowed in a screen, inspect the form submit handler rather than weakening the helper. If a valid update changes order, inspect the helper’s `map` id comparison. If storage receives an unchanged array, verify the context imported the helper in every update callback. Native package tests were not fully runnable because dependencies are absent; see [VERIFICATION.md](VERIFICATION.md).
Use a call-count spy in a future provider test. It should remain at zero after the missing branch and become one after a valid branch. That check belongs at the context and storage seam; the focused helper test intentionally stays below React and does not pretend to cover it.

The third runtime case preserves replacement of every duplicate id. The first now freezes both the input array and its records, checks a fresh output array, and verifies an unchanged neighbor retains its reference. The missing-id case also covers an empty array. These assertions establish helper behavior; the storage rows in the trace are source-inspected consequences, not recorded writer calls.

# Verification record

Run from the project root:

```text
node --experimental-strip-types --test tests/collection-runtime.test.mjs
```

## What was executed

| Date | Node | Result | Notes |
|---|---|---|---|
| 2026-09-22 | not recorded | 3 pass, 0 fail, 0 skip | Original Astra run; command, exit code 0 and limits are in [evidence/results.json](evidence/results.json). The log file that record names (`crud-b03-astra-runtime.log`) was never committed to this repo. |
| 2026-10-06 | v22.16.0 | 3 pass, 0 fail, 0 skip | Re-run on a fresh clone during the docs refinement pass. |

The three tests import the production [collection helper](../src/utils/collection.ts) directly (Node strips the TypeScript syntax); none copies the algorithm. Test 1 freezes the input, checks an order-preserving replacement, a new array, and an unchanged neighbor's reference. Test 2 checks the missing-id error for an occupied and an empty collection. Test 3 checks that every duplicate id is replaced.

The break-it outcomes quoted in [06-SOLUTIONS-AND-REVIEW.md](06-SOLUTIONS-AND-REVIEW.md) (exercises 2-4) were also executed on 2026-10-06 against a scratch copy of the helper and test, not predicted.

## What was not executed

- `pnpm test` (34 tests in `tests/*.test.ts`, including the TypeScript twin `tests/collection.test.ts`): requires `pnpm install` for `tsc`.
- `pnpm typecheck`, any Expo render, any AsyncStorage integration on a device or web.

## What was only read in source

- [AppDataContext.tsx](../src/context/AppDataContext.tsx): all six update callbacks call the helper (lines 142, 157, 172, 187, 202, 217) before their storage writer and state setter; `diff` against [the snapshot](snapshots/src/context/AppDataContext.tsx) shows only the import and those six lines changed.
- Each of the six form screens awaits its context call inside `try/catch` and shows an alert; FeedUsageFormScreen also attaches `.catch` to `saveUsage` on its warning-dialog button (line 96).

The helper validates the supplied collection, which may be one captured by a React closure. It does not reread storage or serialize whole-array writes, so an old closure that still contains a deleted id can pass this guard. That is recorded as finding F4, not as a verified property.

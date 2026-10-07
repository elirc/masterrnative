# Masterrnative CRUD upskill

Masterrnative is an Expo 54 / React Native 0.81 pig-farm record keeper (batches, feed, expenses, sales, mortality) that stores everything on-device in AsyncStorage. This course follows one staged change: each `update*` callback in the data context previously used `map`, so an id that did not exist produced an unchanged array and still called the storage writer — a form could report success while saving nothing. The [replaceRecordById helper](../src/utils/collection.ts) makes the missing-record boundary explicit and is used by all six update paths in [AppDataContext.tsx](../src/context/AppDataContext.tsx). The original context is preserved in [the snapshot](snapshots/src/context/AppDataContext.tsx).

## Reading order

1. [01-CODEBASE-MAP.md](01-CODEBASE-MAP.md) — context → storage → helper, with a file-by-file reading table.
2. [02-CONCEPTS.md](02-CONCEPTS.md) — existence vs uniqueness vs currency of an id.
3. [03-WORKED-CHANGE.md](03-WORKED-CHANGE.md) — before/after code and why `findIndex` + `map`.
4. [04-TESTING-AND-DEBUGGING.md](04-TESTING-AND-DEBUGGING.md) — the two test suites and how to run each.
5. [05-PRACTICE.md](05-PRACTICE.md) — nine Goal + Check exercises (five runnable without install). Predict before reading [06-SOLUTIONS-AND-REVIEW.md](06-SOLUTIONS-AND-REVIEW.md), which also holds four verified review findings.
6. [07-TRACE-LAB.md](07-TRACE-LAB.md) — the same trace across all six collections.
7. [VERIFICATION.md](VERIFICATION.md) — exactly what was executed and what was only read.

## Quick check

```text
node --experimental-strip-types --test tests/collection-runtime.test.mjs
```

Needs Node 22.6+ and no install; prints `# pass 3`. The full project suite (`pnpm install`, then `pnpm test`, 34 tests across six `.test.ts` files) needs the TypeScript compiler from devDependencies and was not run for this course.

The fix is intentionally narrow. It does not add a database, change AsyncStorage formats, or claim React rendering coverage. A missing update now fails before persistence; a valid replacement preserves array order and writes exactly as before. It does not solve transactions, conflict merging, or stale closures — those are named as findings in 06 rather than claimed as fixed.

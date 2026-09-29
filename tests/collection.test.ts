import assert from "node:assert/strict";
import test from "node:test";
import { replaceRecordById } from "../src/utils/collection.js";

test("replaceRecordById replaces the matching record and preserves order", () => {
  const records = [{ id: "a", value: 1 }, { id: "b", value: 2 }];
  assert.deepEqual(replaceRecordById(records, { id: "b", value: 9 }), [
    { id: "a", value: 1 },
    { id: "b", value: 9 },
  ]);
});

test("replaceRecordById rejects a missing id instead of reporting a false update", () => {
  const records = [{ id: "a", value: 1 }];
  assert.throws(() => replaceRecordById(records, { id: "missing", value: 2 }), /was not found/);
});

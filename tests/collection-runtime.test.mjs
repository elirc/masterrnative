import assert from "node:assert/strict";
import test from "node:test";
import { replaceRecordById } from "../src/utils/collection.ts";

test("replaceRecordById replaces the matching record and preserves order", () => {
  const records = Object.freeze([Object.freeze({ id: "a", value: 1 }), Object.freeze({ id: "b", value: 2 })]);
  const result = replaceRecordById(records, { id: "b", value: 9 });
  assert.notEqual(result, records);
  assert.equal(result[0], records[0]);
  assert.equal(records[1].value, 2);
  assert.deepEqual(result, [
    { id: "a", value: 1 },
    { id: "b", value: 9 },
  ]);
});

test("replaceRecordById rejects a missing id instead of reporting a false update", () => {
  assert.throws(() => replaceRecordById([{ id: "a", value: 1 }], { id: "missing", value: 2 }), /was not found/);
  assert.throws(() => replaceRecordById([], { id: "missing", value: 2 }), /was not found/);
});

test("retains legacy replacement of duplicate ids while adding the missing-id guard", () => {
  const result = replaceRecordById(
    [{ id: "dup", value: 1 }, { id: "other", value: 2 }, { id: "dup", value: 3 }],
    { id: "dup", value: 9 },
  );
  assert.deepEqual(result, [
    { id: "dup", value: 9 },
    { id: "other", value: 2 },
    { id: "dup", value: 9 },
  ]);
});

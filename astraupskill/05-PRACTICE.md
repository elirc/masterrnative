# Graduated practice

Level one: given records `a,b` and a replacement `b`, predict the returned order and values. Level two: given a replacement `missing`, predict whether the storage writer should run. Level three: explain why delete can remain idempotent while update rejects absence. Level four: identify what a React screen should do when `replaceRecordById` throws during submit. Level five: design a context test that proves `saveSales` is not called for a missing sale id.

Implementation exercise: write a pure helper using `findIndex`, then run it against an empty list, a one-record list, a duplicate-id list, and a replacement object with extra fields. Decide whether duplicate ids are a separate audit problem; do not silently solve it in this bounded patch. Compare your result with the actual [collection helper](../src/utils/collection.ts).

Prediction exercise: a screen loaded record A, another action deleted A, then the first screen submits an edit. Trace the old and new implementations. Next predict a valid edit after a reload. Finally consider two valid edits made from two screens; explain why whole-array AsyncStorage writes may still lose last-writer data and why that is a separate concurrency improvement.

Review practice: list the authorization boundary, identity boundary, persistence boundary, and evidence boundary. State one accepted behavior and one unverified behavior for each. Read [06-SOLUTIONS-AND-REVIEW.md](06-SOLUTIONS-AND-REVIEW.md) only after recording your predictions.
A useful senior extension is to ask what telemetry should record the rejected id without storing sensitive form fields. Decide whether the message is safe for users and whether a developer log should include the collection name. Keep that decision separate from the identity algorithm.

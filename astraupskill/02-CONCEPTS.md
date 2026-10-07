# Concepts: identity and persistence boundaries

CRUD update correctness depends on identity. The replacement object is not enough; the collection must contain a record with the same id. A `map` expression answers "what would the array look like if this id were present?" It does not answer "did the requested resource exist?" That difference matters when a stale screen, duplicated submission, or wrong navigation parameter reaches the context.

The helper turns that implicit assumption into an explicit boundary. It returns a new array for a match and throws for absence. The caller therefore cannot call `savePigBatches` or another storage writer after a false update. This is a local state rule, not a database transaction: `saveList` in [storageService.ts](../src/services/storageService.ts) (line 33) replaces a whole collection with one `setItem`, so two writers holding different arrays still produce last-writer-wins.

Add and delete have different semantics. Add creates a new identity and prepends it. Delete filters and stays idempotent, because deleting an already absent id is usually safe for a UI retry. Update is different: silently accepting absence overwrites nothing while reporting success. The course keeps this tradeoff visible rather than making all operations throw.

The context provides no authorization or tenant boundary (it is a single-user, on-device app); this helper is an identity check, not access control. Data validation remains in [validation.ts](../src/utils/validation.ts), while identity validation belongs in [collection.ts](../src/utils/collection.ts).

The deeper concept is a **resource existence invariant**: a successful helper call implies at least one matching id existed in the supplied array. It does not establish that ids are unique, and it does not establish that the supplied array is the latest persisted one (it is the array captured by the React closure). Keeping those three claims separate — exists, unique, current — is what lets a reviewer tell an identity error from a persistence or concurrency error.

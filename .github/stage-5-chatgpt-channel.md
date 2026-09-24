# Stage 5 ChatGPT coordination channel

This non-merge service PR records ChatGPT's independent reviews, technical conclusions, and
bounded work results for Stage 5. It is not a source of truth for project architecture or state.

## Current baseline

- GitHub `main`: `e0a13cec3cf731385d4f6311c7b14879971a9ee4`.
- Active product stage: Stage 5 translations/background jobs.
- Codex service channel: PR #94.
- ChatGPT mergeable change under review: PR #102.
- PR #101 / PRV-02 is merged.
- External provider bindings, credentials, live calls, Queue deployment, and Stage 6 rollout remain excluded.

## Current task

Stage 5B revision-bound persistence foundation (`CNT-01/02/05/06`) in PR #102.

PR #102 reviewed head:
`7867279ae3fafbffd6e44d8ace86a1c27b1375bb`.

GitHub Actions run `35977299496` completed successfully:
- `checks` — success;
- `database` — success.

## Independent verification of Codex findings

ChatGPT independently verified both Codex findings against the unchanged complete PR #102 before
applying any correction.

1. **Drizzle schema locale-check SQL diverges from migration/snapshot.**
   - In `db/schema.ts`, both `sourceLocaleCheck()` and `contentTargetLocaleCheck()` currently
     end their regex SQL literal after `(-[A-Za-z0-9]{1,8})*` and omit the required `$'` suffix.
   - Migration `0014_content_translation_persistence.sql` contains the complete
     `^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*$` regex in both translation tables.
   - Snapshot `0014_snapshot.json` also contains the complete regex.
   - Therefore hand-written migration CI can pass while the Drizzle schema representation is not
     equivalent to the migration/snapshot. This is a current `CNT-01/02/05/06` migration/schema
     parity defect, not future groundwork.
   - Current PR coverage applies the migration but does not prove generated schema SQL parity for
     these checks, so a regression guard is required with the correction.

2. **Wrapped PostgreSQL availability failures bypass original-safe fallback.**
   - `db/content-translation-store.ts` calls `isPostgresAvailabilityFailure(error)` only on the
     top-level thrown value.
   - That helper in `persistent-registry.ts` inspects only the supplied object and does not walk
     `cause`.
   - By contrast, the established `isPostgresQueryTimeout()` path uses the cycle-safe
     `findError()` cause traversal in `db/postgres-deadlines.ts`.
   - Therefore a Drizzle wrapper whose `cause` carries an `08xxx`/transport availability error
     remains unclassified, so `ContentTranslationService.readCurrent()` rethrows instead of
     returning the exact original revision with `storage-unavailable`.
   - Existing PR #102 content-translation tests contain no wrapped availability/timeout regression
     coverage. This is a current original-safe-read defect under the assigned task.

Both findings match the current Stage scope and are technically confirmed from ChatGPT's side.
No correction has been applied yet. PR #102 remains open and unmerged.

## Status

- PR #102 head is unchanged: `7867279ae3fafbffd6e44d8ace86a1c27b1375bb`.
- No product-code correction has been applied after Codex review.
- Next step: Codex technical agreement/authorization for these two findings, after which ChatGPT
  can correct only the agreed scope, run CI, update this channel, and fully re-review PR #102.

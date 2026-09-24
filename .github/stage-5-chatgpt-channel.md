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

Corrected PR #102 head:
`bc22e8608e48a026aa34149990a92ad1c171e700`.

Final GitHub Actions run `35980820289` completed successfully:
- `checks` — success;
- `database` — success;
- the new `Verify Drizzle schema parity` gate also passed.

## Technical agreement and correction result

Both Codex findings were independently confirmed by ChatGPT before correction and then authorized
for correction by Codex.

1. **Drizzle schema locale-check parity**
   - the complete anchored BCP-47-like regex literal is restored in both
     `sourceLocaleCheck()` and `contentTargetLocaleCheck()`;
   - migration `0014`, snapshot `0014`, and `db/schema.ts` now agree;
   - CI now runs `drizzle-kit generate` against the checked-in latest snapshot and fails if it
     modifies or creates anything under `drizzle/`, so future schema/snapshot drift is detected.

2. **Wrapped PostgreSQL availability fallback**
   - content translation storage classification now walks the `cause` chain cycle-safely using
     the established repository convention;
   - wrapped and unwrapped availability failures and wrapped query timeouts become
     `ContentTranslationStorageUnavailableError`;
   - `ContentTranslationService.readCurrent()` therefore returns the exact original current
     revision with `storage-unavailable`;
   - unknown wrapped database errors remain visible and are not converted to fallback.
   - focused unit coverage includes wrapped availability, wrapped timeout, unwrapped classified
     availability, and unknown-error passthrough.

The correction did not change the Stage 5B product scope or `PROJECT_STATE.md` claims.

## Fresh full PR #102 review

After the corrections and successful CI, ChatGPT re-reviewed the complete PR #102 against current
`main`, the assigned `CNT-01/02/05/06` task, the complete relevant translation/storage/migration
contracts, and all 13 changed files.

The review covered:
- service selection/fallback semantics;
- exact revision/content identity;
- topic-title/post-body separation;
- locale canonicalization and `und` behavior;
- provenance validation and manual-over-machine trust;
- concurrent/idempotent writes;
- revision-owner/source-locale foreign keys and cascade/restrict behavior;
- migration/schema/snapshot/journal parity;
- wrapped/unwrapped database failure classification;
- the new schema-parity CI gate;
- `PROJECT_STATE.md` and excluded provider/job/Markdown/UI/Stage 6 scope.

No remaining current-Stage defect was found.

## Status

- PR #102 remains open and unmerged.
- Current head: `bc22e8608e48a026aa34149990a92ad1c171e700`.
- CI `35980820289`: `checks` and `database` successful.
- Next step: independent complete Codex re-review of the corrected PR #102 before merge.

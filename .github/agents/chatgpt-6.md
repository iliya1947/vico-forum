# ChatGPT-6 — personal log

## SA04-K2 — ACTIVE ASSIGNMENT: PREPARING/READY journal lifecycle admission

Continue cumulative Draft #332 from accepted K1 exact `ad20fa37be4e0f887fc5ffac644f6304a9e1eb8f`. Accepted complete K plan: #331 comment #6877583725. Only **K2** is active.

Required result: lifecycle-close the two upload journal commands without changing schema/storage protocol:
- `recordUploadObject(actorId, objectKey)` must require a trusted server actor and perform AccountState admission + fresh journal INSERT in one short DB transaction;
- `activateUploadObject(actorId, objectKey, reservationEtag)` must lock the existing journal row first, then perform AccountState admission and the existing conditional PREPARING→READY update in the same transaction;
- canonical upload callbacks pass only authoritative `scope.userId`; do not accept client actor input or persist actor on the journal.

Acceptance:
- inactive/missing cannot create PREPARING or activate READY; writer-first may commit before later deactivation and state-first denies;
- no reservation begins before successful PREPARING commit; no payload begins before successful READY commit;
- claimed/missing/already-ready journal rows retain current fail-closed behavior and cleanup claim/lease semantics;
- lock evidence proves activate/finalizer uses journal→actor and does not introduce actor→existing-journal inversion;
- Hyperdrive/interface/direct/test callers are explicitly updated to mandatory actor signatures;
- canonical lifecycle failures keep 401 / classified 503 / unexpected distinction, with existing safe object cleanup behavior;
- focused real PostgreSQL and attachment-fence tests cover both race directions and current fence/cleanup behavior; run applicable exact-head CI and AUTHOR STOP on one new stable #332 head.

Do not implement K3 private reads, K4 Cancel or K5 connected Worker/BA/PG/local-R2/Chromium closure early. No schema, new journal owner column, storage protocol redesign, L–S, SA05, #315, docs or Stage6. If a correct K2 change requires broader lock/protocol redesign, stop for Lev technical escalation.

---

# ChatGPT-6 — personal log

## SA04-K1 bounded implementation — Lira AUTHOR STOP / Mira review next

- **Implementation:** new cumulative [Draft PR #332](https://github.com/iliya1947/vico-forum/pull/332), branch `chatgpt/sa04-k1-attachment-admission` based current main `398dae18d5ca7c3fc6dd84fd93a29d7c381ba366`, **stable exact head `ad20fa37be4e0f887fc5ffac644f6304a9e1eb8f`**, open/draft/unmerged. #330 is merged and never reused.
- **K1 changes only:** `db/forum-attachments.ts` uses existing `assertActiveAccountForDrizzleMutation(tx, actorId)` in `admitUpload` after draft scope/before generation+committed replay+fresh measure, and in `createDraftAttachment` after scope/generation/fenced journal `FOR UPDATE` dependency and before committed asset/ref replay, measure, metadata/ref INSERT and fallback. Same Drizzle tx/user `FOR NO KEY UPDATE` through COMMIT. No new schema/permission/Owner bypass and no Journal PREPARING/READY signatures (K2).
- **Canonical upload:** `app/routes/attachment-upload.ts` controlled inactive/missing → **401 `{error:"unauthenticated"}` no-store**, typed account-unavailable → **503 `{error:"unavailable"}` no-store**, unknown errors remain unclassified. After settled payload, known AccountInactive/Missing may best-effort DELETE **only the just-generated physical `result.objectKey`**, never an existing asset or an unknown metadata COMMIT/transport outcome. `db/hyperdrive-forum-attachments.ts` explicitly recognizes nested shared `AccountStateUnavailableError` as classified storage-unavailable, preserves other causes/error propagation.
- **Evidence:** new `tests/database/sa04-attachment-k1-admission.test.ts` **7/7 native PG17 PASS**: active fresh and committed replay, active AP-10 restriction immunity for exact replay but not fresh upload, inactive/missing rollback/no metadata, state-first and writer-first **both methods**, actual fenced journal-before-actor contention observed with `pg_blocking_pids`. Existing `tests/database/attachment-upload-fence.test.ts` **22/22 PASS** including 3 new canonical route tests for 401 before reserve, late deactivation after settled payload 401 + delete fresh physical attempt without asset/ref, typed 503 no reserve and unexpected remains thrown. Historical fixture migration 0065 aligned with merged main; one legacy missing-owner FK expectation updated to AccountMissingError.
- **Current exact-head gates SUCCESS:** [CI run 43599514990](https://github.com/iliya1947/vico-forum/actions/runs/43599514990) **database 81/81 files, 935/935 tests PASS**, **application 185/185 files, 2282/2282 tests PASS**, lint (0 errors), typecheck, build, migration-history/metadata/schema, Worker smoke (existing real Better Auth/PG J 401/503/500) all PASS. No K-specific real Worker+local R2/Chromium success claimed — required separately at K5. Early intermediate CI had unused test variable and misplaced `await expect(...).rejects` in test only; both fixed, final exact head green.
- **Author source/diff inspection:** six changed files: three production modules (`db/forum-attachments.ts`, `db/hyperdrive-forum-attachments.ts`, `app/routes/attachment-upload.ts`) and three attachment test files, including one new K1 suite. No migration, config, journal signature, private GET/list, Cancel, cleanup, frontend UI, J rework, K2–K5, L–S, SA05, #315, documentation or Stage6 change.
- **AUTHOR STOP, not independent review.** Mira reviews bounded K1 on exact `ad20fa37be4e0f887fc5ffac644f6304a9e1eb8f`; if PASS, she records it and activates K2 in the same cumulative #332 branch following #331 workflow. Lev STOP until whole-K or technical escalation; Mark inactive. No merge or deployment.

## SA04-K1 — ACTIVE ASSIGNMENT: attachment metadata/replay lifecycle admission

Baseline: current `main=398dae18d5ca7c3fc6dd84fd93a29d7c381ba366`.
Accepted complete K plan: #331 comment #6877583725. Only **K1** is assigned.

Required result: implement authoritative transaction-local AccountState admission for `DrizzleForumAttachments.admitUpload` and `createDraftAttachment`, with the canonical attachment POST failure composition, while preserving current stable-ID replay, AP-10 upload restriction, fence and publication behavior.

Acceptance:
- inactive/missing actor cannot obtain matching replay/fallback/private success or create metadata/ref facts;
- active committed replay keeps current behavior relative to a later `attachments.upload` restriction; fresh upload still checks that restriction;
- same caller-owned DB transaction/connection uses the existing AccountState guard; no second connection or schema/public-contract change;
- deterministic lifecycle denial after a fresh settled physical upload may best-effort clean only that fresh attempt key; ambiguous commit/storage outcome must keep existing recovery rather than blind delete;
- focused real PostgreSQL evidence covers active/inactive/missing, fresh/replay/fallback and both lifecycle race orders with before/after facts; canonical POST distinguishes lifecycle 401, classified unavailable 503 and unexpected failure;
- create a **new cumulative Draft implementation PR from current main** and AUTHOR STOP on one stable exact head with applicable checks and a concise evidence packet for Mira.

Do not implement K2 journal actor signatures, K3 private reads, K4 Cancel or K5 connected local-R2/browser closure early. L–S, SA05, #315, permanent docs and Stage6 are out of scope. If K1 cannot be completed locally without changing the accepted K lock/protocol or broader architecture, stop with a technical escalation for Lev.



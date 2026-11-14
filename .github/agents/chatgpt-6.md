# ChatGPT-6 — personal log

## SA04-K5 subtask 4/5 — mounted Chromium Retry/Remove/Cancel DONE; Lira STOP

- Final cumulative #332 exact `bb9d1497c5d5f14bfff6a1edf64e19eed5fd5105`. Only new `tests/browser/sa04-attachments/check.py` changed since 3/5; production source/schema/config unchanged. [Connected K5 run #43638470788](https://github.com/iliya1947/vico-forum/actions/runs/43638470788) SUCCESS **29/29** (baseline 25 + real mounted Retry lost ACK same File/id/bytes, pending Remove vs late 201, pending Cancel vs physical PG lock, inactive Retry 401/File/text preserved/Cancel local reset). [CI #43638470727](https://github.com/iliya1947/vico-forum/actions/runs/43638470727) SUCCESS PG17 956/956, app 2306/2306, standard gates; same-head AP10/SA01/SA03/J12 SUCCESS.
- Diagnostic failures on interim test SHAs were due only to waiting for a `page.expect_response` on fire-and-forget Cancel while actual server DELETE committed 200; physical PG completion+UI reset correctly replace that inappropriate waiter. No product defect established. Diagnostic watchdog/logs removed in final test.
- **Stop** until explicit developer `...` for subtask **5/5**: cumulative K5 evidence/diff/checks and formal Lira AUTHOR STOP handoff; do not begin Mira/Lev review automatically.

## SA04-K5 subtask 3/5 — actual local-R2 cleanup/fence + unknown ACK evidence DONE, STOP

- Stable cumulative Draft #332 `421c9a0f2f166cf7989f76025d86cab1a21c79d2`; compared to subtask2 `328eb7e8cc60f103d34cfbc0ed8f5720f73da1d6`, 5 changed files, only K5 tests/CI harness. No application/production changes.
- Cross-process `getPlatformProxy` confirmed exact payload bytes written by the real built Worker and reused the same local-only R2 persistence for actual `ForumAttachmentCleanup`; additional CI-only Worker loopback/token bridge verifies direct cleanup against the same bound R2. Both are synthetic test-only boundaries.
- Connected: real successful persisted HTTP 201 with browser ACK dropped and stable-ID replay no second asset/ref/journal; settled R2 PUT with PostgreSQL finalizer journal-row statement timeout produces 503, preserves unknown physical bytes for eventual cleanup; late PUT after lease-reclaimed claim and physical DELETE cannot restore; detached orphan is actually deleted; inactive author's published object remains served; orphan reservation marker swept; no false 201/private leak.
- Initial local marker fixture failed due Miniflare Node proxy unsupported `Headers` serialization, not app behavior; fixed only unique-key synthetic setup.
- [K5 connected 43632617101](https://github.com/iliya1947/vico-forum/actions/runs/43632617101) SUCCESS 25/25; [CI 43632616982](https://github.com/iliya1947/vico-forum/actions/runs/43632616982) SUCCESS PG17 956/956, app 2306/2306, lint/typecheck/build/schema/Worker smoke; AP10/SA01/SA03/J12 exact-head workflows SUCCESS.
- K5 queue: 1 audit DONE → 2 infrastructure/CI DONE → **3 connected fence/cleanup DONE; STOP** → 4 mounted editor Chromium actual Retry/Remove/Cancel/late ACK only on explicit next developer `...` → 5 final whole-K author closure. No premature K5 AUTHOR STOP/whole-PR review/merge/production.

## SA04-K5 subtask 3/5 — connected ambiguous ACK/cleanup/fence DONE; STOP

- Stable cumulative #332 `421c9a0f2f166cf7989f76025d86cab1a21c79d2` remains Draft/unmerged. No production application/source/schema/real binding changes; evidence-only CI harness in `tests/browser/sa04-attachments/` and workflow. Integration covers actual Worker/Better Auth/PG17/local R2, real stream/journal barriers plus real `ForumAttachmentCleanup` through disposable local-only R2 binding. Three K5 connected run phases include one transient local Miniflare `Headers` proxy serialization issue, corrected only in test fixture. Final [K5 #43632617101](https://github.com/iliya1947/vico-forum/actions/runs/43632617101) SUCCESS **25/25**, [CI #43632616982](https://github.com/iliya1947/vico-forum/actions/runs/43632616982) SUCCESS PG17 **956/956**, app **2306/2306**, all standard gates; exact-head AP10/SA01/SA03/J12 browser workflows SUCCESS.
- Confirmed tested: lost actual HTTP response after committed 201 → same logical ID replay and same physical R2 object; post-PUT unknown DB/503 keeps R2 until reference-aware cleanup; pending HTTP payload vs expired claim lease/cleanup cannot resurrect object; genuine R2 cleanup removes detached/cancelled objects, retains published inactive-author files, observes claim lease and bounded reservation-sweep. Existing application R2 storage code unchanged.
- **Stop after subtask 3/5**. Next only explicit developer `...`: bounded 4/5 mounted browser Editor Retry/Remove/Cancel/late-ACK behavior, no schema/docs/prod changes. Subtask 5 final cumulative checks/handoff follows separately.

## SA04-K5 subtask 2/5 — test helper CI stabilization DONE, Lira STOP

- Audited baseline `02a9c00063eb2a890837154c449c2984841834c2` had only `no-undef` errors in two test-only Node ESM helper files because ESLint config assigns Node globals to `.github/scripts/**/*.mjs` but not these new browser test helpers. Exact error count 12 on [old CI 43624481844](https://github.com/iliya1947/vico-forum/actions/runs/43624481844). No confirmed application defect.
- Replaced implicit `process`/`URL`/`Buffer` globals with explicit standard `node:process`, `node:url`, `node:buffer` imports **in those two helper files only**, no eslint config, production code, dependency, schema or runtime change.
- Final current #332 exact head: `328eb7e8cc60f103d34cfbc0ed8f5720f73da1d6`. [CI 43630454615](https://github.com/iliya1947/vico-forum/actions/runs/43630454615) SUCCESS, PostgreSQL **956/956**, app **2306/2306**, lint/typecheck/build/schema/Worker smoke PASS; [connected K5 43630454673](https://github.com/iliya1947/vico-forum/actions/runs/43630454673) SUCCESS with **16 connected cases**. Exact-head AP-10/SA-01/SA-03/J12 browser workflows SUCCESS.
- Developer-directed five-subtask queue: audit 1/5 DONE (#331 comment #6882718856), infra/CI 2/5 DONE (here), **pause; next 3/5 only after direct `...`**. Stage 3 is remaining deterministic connected late PUT/unknown ACK/claim/lease/cleanup evidence, stage 4 mounted browser editor interactions, stage 5 whole-K exact-head checks and AUTHOR STOP. No subtask 3 work, whole-K review, merge/deploy.

## SA04-K5 — ACTIVE ASSIGNMENT: cumulative connected closure

Continue cumulative Draft #332 from accepted K4 exact `8f89a7101d356eb52ccf1021a63341a4e0a37967`. Accepted complete K plan: #331 comment #6877583725. **K5 is the final K implementation/evidence slice.**

Required result: close the entire accepted SA04-K evidence contract on one stable cumulative #332 head. Do not merely rerun K1–K4 unit tests.

Acceptance:
- re-sweep all seven lifecycle-gated entrypoints and the intentionally ungated public/system boundaries against current source/lock/caller reality;
- close native lifecycle and cross-writer/fence matrix for admission, journals, finalizer, private reads and Cancel, including cleanup claim/lease, terminal operation, J publish/edit interactions and AP-10 semantics where the accepted K plan requires them;
- prove late PUT and ambiguous ACK behavior: deactivation after READY/while payload is pending cannot produce new metadata/ref/false 201; unknown commit/storage outcome must not trigger blind object deletion;
- add/use an owned **local-only** connected harness with built Worker + genuine Better Auth session/cookies + PostgreSQL + actual Worker `ATTACHMENT_R2` local binding via supported Wrangler/Miniflare. Do not change production bindings/resources/config or use in-memory storage as the connected proof;
- deterministic actual HTTP barriers: pre-object lifecycle denial, deactivation during pending payload/finalizer, journal-wait state win, classified 503 and unexpected 500 for POST/list/private-file with no-store/safe body, and public published bytes of an inactive author. Use causal PG/stream/storage barriers, not sleeps/poll-only inference;
- Chromium with real mounted forms/BA cookies/local R2: active upload/retry/publish/download; deactivation after mount and during pending upload; preservation of text/File/selection and no false success; inactive list/private download/retry/Cancel denial; local Remove/Cancel + late ACK; AP-10 committed replay vs fresh rejection; retained published file;
- keep EN/RTL/responsive checks limited to UI actually affected; do not claim owner visual/deployed acceptance;
- run all applicable native/fence/publication/J/AP10/forum-permission/route/Hyperdrive/editor/R2-stream suites and standard CI/build/schema gates;
- if K5 exposes a **confirmed current-K defect**, fix it locally in #332 and rerun the affected/cumulative acceptance. Do not fix future-stage or #315-only findings;
- AUTHOR STOP only on one final stable exact head with a concise complete evidence packet for Mira **whole-K coordinator review**.

Do not implement L–S, SA05, #315, permanent docs or Stage6/production deployment. No external/production R2 resource, secret or configuration change. If closing K requires broader architecture/schema/storage-protocol redesign rather than a local current-K correction, stop with a technical escalation for Lev.

---

# ChatGPT-6 — personal log

## SA04-K4 bounded implementation — Lira AUTHOR STOP / Mira review next

- **Cumulative Draft #332:** exact `8f89a7101d356eb52ccf1021a63341a4e0a37967`, open/draft/unmerged, from accepted K3 `dae431fc920c79cad654627052365a3fd2380fe4`.
- **Production:** one in-transaction AccountState actor NKU in `cancelOperation` after existing draft advisory scope and before retirement/ref deletion. Covers active empty/live/idempotent terminal operation and forbids inactive/missing acknowledgement or mutation. No external GET/PUT/DELETE lock extension, no AP10 restriction on Cancel, no public refs/receipt changes.
- **Native:** `tests/database/sa04-attachment-k4-cancel.test.ts` **7/7 PASS** (active/AP10 empty/live/terminal; exact scoping/foreign refs; inactive/missing unchanged state; both actor-state race orders; real two-writer Cancel↔metadata finalization in both orders with physical scope blocker).
- **HTTP/UI:** canonical DELETE tests 401/503/unexpected, no R2 side effects; existing per-file 405 and active AP10 Cancel kept. Editor hook unchanged, new 401 denied Cancel test proves local reset/abort ignores late ACK without asserting server COMMIT.
- **Exact-head [CI 43616566018](https://github.com/iliya1947/vico-forum/actions/runs/43616566018) SUCCESS:** PG17 956/956 (84 files), K4 7/7, K3 7/7, fence 22/22; app 2306/2306 (186 files), attachment-upload route 42/42, editor attachment-operation 21/21; lint/typecheck/build/migrations/Workers PASS; [AP10](https://github.com/iliya1947/vico-forum/actions/runs/43616566010), [SA01](https://github.com/iliya1947/vico-forum/actions/runs/43616566021), [SA03](https://github.com/iliya1947/vico-forum/actions/runs/43616566002), [SA04-J12](https://github.com/iliya1947/vico-forum/actions/runs/43616566087) exact-head browser workflows SUCCESS. Not K5 connected local-R2 attachment acceptance.
- **AUTHOR STOP.** Mira bounded K4 review next. K5 inactive. No merge/deploy or broader work.

## SA04-K4 — ACTIVE ASSIGNMENT: whole-operation Cancel lifecycle admission

Continue cumulative Draft #332 from accepted K3 exact `dae431fc920c79cad654627052365a3fd2380fe4`. Accepted complete K plan: #331 comment #6877583725. Only **K4** is active.

Required result: lifecycle-close the existing whole-operation `cancelOperation(ownerId, contextKey, draftId)` without changing its domain/storage contract.

Acceptance:
- repository transaction uses existing draft scope, then shared AccountState actor NKU, then existing retire-generation + exact temporary-ref delete; the actor lock remains through COMMIT/ROLLBACK;
- inactive/missing denies before retirement/delete/no-op success, including empty and already-terminal operations; facts remain unchanged;
- active Cancel stays idempotent and remains available under AP-10 `attachments.upload` restriction;
- no published/shared attachment binding, publication receipt, foreign ref or physical object is synchronously removed; no per-file DELETE is added;
- native PG17 evidence covers active empty/live/terminal behavior, state-first/writer-first lifecycle races and relevant overlap with upload/finalization/cleanup/ref protection;
- canonical whole-operation DELETE gives lifecycle 401, classified 503 and unexpected failure semantics already established for attachment API; unsupported/per-file DELETE remains 405;
- preserve current editor behavior: local Cancel/Remove may reset local selection/XHR state even if server Cancel is denied and must not imply a committed server cancellation;
- run applicable exact-head CI and focused route/editor/fence regressions, then AUTHOR STOP on one new stable #332 head.

Do not implement K5 connected Worker/BetterAuth/PostgreSQL/local-R2/Chromium closure early. Do not gate system cleanup/shared generation helpers or add deactivation cleanup. No schema/storage protocol/publication redesign, L–S, SA05, #315, permanent docs or Stage6. If correct K4 requires broader lock/protocol redesign, stop for Lev technical escalation.

---

# ChatGPT-6 — personal log

## SA04-K3 bounded implementation — Lira AUTHOR STOP / Mira review next

- **Cumulative Draft #332:** stable `dae431fc920c79cad654627052365a3fd2380fe4`, open/draft/unmerged, from accepted K2 `eaf57c46ca28baff9a11ae637f37d7d850934ab9`.
- **Production:** `db/forum-attachments.ts` adds same-tx actor NKU after draft scope/before generation and private metadata query for list/file. `app/routes/attachment-download.ts` maps AccountInactive/Missing to private/no-store 401 and typed AccountStateUnavailable to 503; unexpected errors remain thrown. Existing upload GET already used the matching K1 controlled mapper. `workers/private-failure-response.ts` + `workers/app.ts` narrowly ensure unexpected attachment GET/HEAD 5xx are private/no-store without changing public GET caching. Bucket GET stays outside DB actor mutex. Public `readPublishedAttachment` and AP10 upload restrictions unchanged.
- **Evidence:** native `tests/database/sa04-attachment-k3-private-reads.test.ts` 7/7, both reads state-first and writer-first with real PG17 actor-lock/COMMIT barriers, active/empty/inactive/missing, AP10 reader compatibility, inactive author's published post asset. Added list/file route 401/503/unexpected/bucket-fence tests and worker 5xx helper 4/4. No schema/permission/HTTP protocol changes.
- **Exact-head [CI #43608804921](https://github.com/iliya1947/vico-forum/actions/runs/43608804921) SUCCESS:** PG17 949/949 (83 files), app 2300/2300 (186 files), lint/typecheck/build/migrations/Workers; [AP-10](https://github.com/iliya1947/vico-forum/actions/runs/43608804912), [SA01](https://github.com/iliya1947/vico-forum/actions/runs/43608804822), [SA03](https://github.com/iliya1947/vico-forum/actions/runs/43608804997), [SA04-J12](https://github.com/iliya1947/vico-forum/actions/runs/43608804949) exact-head browser workflows SUCCESS. Not K5 connected local-R2 browser attachment acceptance.
- **AUTHOR STOP.** Mira bounded K3 review is next. K4–K5 inactive; no merge/deploy or broader work.

## SA04-K3 — ACTIVE ASSIGNMENT: private attachment read lifecycle admission

Continue cumulative Draft #332 from accepted K2 exact `eaf57c46ca28baff9a11ae637f37d7d850934ab9`. Accepted complete K plan: #331 comment #6877583725. Only **K3** is active.

Required result: close AccountState admission for private temporary attachment reads without changing public published-file access:
- `listDraftAttachments(ownerId, contextKey, draftId)`: existing draft scope → actor NKU → generation/query in the same short DB transaction;
- `readDraftAttachment(ownerId, contextKey, draftId, attachmentId)`: existing draft scope → actor NKU → generation/ref lookup in the same short DB transaction;
- adapt canonical list/private-file HTTP handling so inactive/missing is private/no-store 401, classified storage/lifecycle unavailability remains 503 and unexpected failure remains unexpected/private; the DB actor lock must not be held across bucket GET or response streaming.

Acceptance:
- inactive/missing obtains no private list/metadata/file success; state-first private file denial causes no bucket GET;
- writer-first admitted read may finish before later deactivation and demonstrates actor-lock serialization through DB transaction completion;
- native PostgreSQL evidence covers active/inactive/missing and both race orders for both methods;
- public `?post=...` membership/file read remains unaffected by the author's lifecycle, including an inactive published author;
- current AP10 `attachments.upload` restriction does not block private reads;
- focused route tests cover list and private-file 401/503/unexpected privacy and public-branch preservation;
- run applicable exact-head CI and AUTHOR STOP on one new stable #332 head.

Do not implement K4 Cancel or K5 connected Worker/BA/PG/local-R2/Chromium closure early. Do not lifecycle-gate public `readPublishedAttachment`, security observations/admin reads, cleanup or shared generation helpers. No schema/storage protocol/public access redesign, L–S, SA05, #315, permanent docs or Stage6. If correct K3 requires broader protocol/Worker redesign beyond the accepted plan, stop for Lev technical escalation.

---

# ChatGPT-6 — personal log

## SA04-K2 bounded implementation — Lira AUTHOR STOP / Mira review next

- **Draft #332:** `eaf57c46ca28baff9a11ae637f37d7d850934ab9`, open/draft/unmerged; accepted K1 predecessor `ad20fa37be4e0f887fc5ffac644f6304a9e1eb8f`.
- **K2 code:** `db/forum-attachments.ts` PREPARING record actor→INSERT in one short tx, READY activation existing journal `FOR UPDATE`→actor NKU→conditional READY in same tx. `db/hyperdrive-forum-attachments.ts` mandates and forwards actor; `app/routes/attachment-upload.ts` threads only session `scope.userId`. Existing fence/cleanup, 401/503/unknown semantics and no-reservation-before-record-COMMIT/no-PUT-before-activation-COMMIT preserved; no schema or external protocol changes.
- **Evidence:** native new `tests/database/sa04-attachment-k2-journal.test.ts` 7/7 PASS (active/inactive/missing/claimed/replay, both state-first/writer-first races, real journal→actor lock wait). Existing native fence 22/22, K1 7/7; four added canonical HTTP tests. Explicit old test adapters/direct callers updated.
- **Final exact-head [CI #43601817617](https://github.com/iliya1947/vico-forum/actions/runs/43601817617) SUCCESS**: PG17 942/942 (82 files), app 2286/2286 (185), lint/typecheck/build/migrations/Worker. First database attempt had a Vitest unhandled `AccountInactiveError` in unchanged forum-online-privacy test despite 942 passing cases; targeted rerun same head without changes SUCCESS. No K5 connected Worker/local-R2/Chromium closure claimed.
- **AUTHOR STOP.** Mira must independently review this exact K2 delta/head. K3–K5 remain inactive; no merge/deployment, broader redesign, docs, SA05/Stage6.

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






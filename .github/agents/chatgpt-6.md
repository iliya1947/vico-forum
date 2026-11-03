# Лира — ChatGPT-6

## Роль

Основной исполнитель Complaints Package 4; собственную реализацию не проводит как independent whole-PR reviewer.

## Реализация Package 4 и предыдущие corrections

- [Implementation PR #276](https://github.com/iliya1947/vico-forum/pull/276), ветка `chatgpt/complaints-package-4`, Draft.
- Исходный author handoff: [#6578779607](https://github.com/iliya1947/vico-forum/pull/254#issuecomment-6578779607), head `0de025e73fce521adc90d284980dc158c511c3d9`.
- После первого technical review [#6580997474](https://github.com/iliya1947/vico-forum/pull/254#issuecomment-6580997474) исправлен P2 Decision 409 recovery через route `shouldRevalidate`; добавлены четыре `createMemoryRouter` UI-регрессии. Промежуточный head `12d94f308e25f579310b1cf18663697230c10354` прошёл CI #41473612121 (1726 app, 452 PG), но получил новый [technical finding](https://github.com/iliya1947/vico-forum/pull/254#issuecomment-6581694833) по Framework single-fetch URL.

## Bounded Framework query correction (новое назначение)

- Мира подтвердила новый P2 и [назначила исправление](https://github.com/iliya1947/vico-forum/pull/254#issuecomment-6581798378): Decision 409 вызывает targeted `.data?_routes=...`; raw `request.url` содержит framework metadata; strict `reviewPages` возвращает 400 до Case read.
- Использовала официальный React Router v8 `LoaderFunctionArgs.url` — нормализованный application URL. В `app/routes/complaint-review.tsx` `reviewPages(url.href)` вместо `reviewPages(request.url)`; `request` остаётся в типе аргументов route loader. Строгий parser, авторизация/no-store и Decision domain/CAS не изменены.
- В `app/complaints/review-http.test.ts` добавлен сценарий Framework-style raw HTTP Request `review.data?_routes=routes%2Fcomplaint-review&reports=2&notes=3` с нормализованным `url`; проверяются результат Case read, no-store и 400 на дублирующиеся, неизвестные и out-of-range реальные application параметры. Existing Router/UI recovery tests без изменений.
- Новый **stable exact head**: `7d64933d47c257267d1fa4c6aec63685e9d27344`. От предыдущего review head изменены только 2 файла: route и HTTP test.
- [Exact-head CI #41478096937](https://github.com/iliya1947/vico-forum/actions/runs/41478096937): `checks` и `database` SUCCESS, 1727 application tests/120 files, 452 PostgreSQL tests/36 files, lint/typecheck/build/UI preview/migrations/schema PASS.
- Первая CI попытка выявила только тестовый TypeScript excess-property contract при ручном вызове route loader; исправлено добавлением `request:Request` в тип входного объекта; финальный head CI green.
- Независимый live built-Worker/Chromium прогон этого head и owner visual acceptance не проводились и не заявляются. Package 5+, архитектура, schema и permissions не затронуты.

## Ранний checkpoint Package 4

Package 4 после коррекций прошёл coordinator/technical review и был merged в main; текущая работа Лиры — Package 5.

## Package 5 — implementation in progress (PR #277)

- Назначение Миры: [#6583342749](https://github.com/iliya1947/vico-forum/pull/254#issuecomment-6583342749).
- Базовый main: `1ad8a6402111928c0f08e6f15aba624ba18a4426`.
- Implementation: [Draft PR #277](https://github.com/iliya1947/vico-forum/pull/277), ветка `chatgpt/complaints-package-5`.
- В работе: forward migration 0054/Drizzle/manifest, единый inbox (typed Decision results), транзакционный fanout, persisted review-started event, protected History/participant result, EN/RU/HE, native и route regression tests.
- Код и CI ещё могут изменяться; stable head, verification PASS и handoff не объявлены. Package 6+/production вне scope.

## Package 5 — implementation checkpoint

- [Draft PR #277](https://github.com/iliya1947/vico-forum/pull/277), implementation head `a97ef20fdde64b8e4c76160e16fb011f1024935a`.
- [CI #41493212948](https://github.com/iliya1947/vico-forum/actions/runs/41493212948): SUCCESS, 1728 application tests / 120 files, 454 PostgreSQL tests / 36 files; schema manifest parity, migration checks, Worker smoke, lint/typecheck/build PASS.
- Подзадача implementation завершена; следующий checkpoint — профильная документация, дополнительная проверка и author handoff. Coordinator/technical review не выполнены и не заявляются. PR остаётся Draft.

## Package 5 — author completion и подготовка handoff

- [Draft PR #277](https://github.com/iliya1947/vico-forum/pull/277), stable exact head `5ad59262ea6ef1c2cc5b917f4d03c94564112460`, main `1ad8a6402111928c0f08e6f15aba624ba18a4426`.
- [Exact-head CI #41495180494](https://github.com/iliya1947/vico-forum/actions/runs/41495180494): **SUCCESS**, оба jobs checks/database; 1728/1728 application и 454/454 PostgreSQL tests, schema manifest parity for 60 tables, migrations, Worker smoke, lint/typecheck/builds PASS.
- Documentation committed in PR #277: `docs/moderation/COMPLAINTS.md`, `PROJECT_STATE.md`, `docs/PROJECT_HISTORY/PROJECT_HISTORY_08.md` и index. Последние commits после прохода CI #41493212948 только документационные.
- Проверена корректность fingerprints восьми новых/изменённых i18n descriptors по актуальному canonical source: совпадают.
- Утверждённый P5 реализован в bounded PR: resolved History/timeline и persisted Appeals readonly; без новых workflow/permissions; notifications через общий inbox и atomic Decision fanout; member-only result; review-started coverage с явным ограничением истории.
- Авторская проверка и CI **не** равны независимому whole-PR review. Chromium→built Worker→PostgreSQL interactive acceptance и owner visual acceptance отсутствуют; не заявлять их пройденными. Разработчик запретил Лире использовать браузер; техническую проверку нельзя перекладывать на владельца. Owner visual acceptance — только по отдельному запросу. Следующий этап — coordinator whole-PR review Миры с фиксацией остаточных verification gaps, затем technical review Лёвы после coordinator PASS.
- Package 6+, unrelated domains и production не затрагиваются. Новых implementation commits не делать без новой подтверждённой current-scope задачи.

## Package 5 — bounded coordinator correction complete

- Мира назначила [пять подтверждённых текущих дефектов](https://github.com/iliya1947/vico-forum/pull/254#issuecomment-6584762142) после whole-PR review прежнего `5ad59262ea6ef1c2cc5b917f4d03c94564112460`.
- Исправлено: SQL-bound History excerpt (500 characters); strict normalized URL pagination в Notifications и Attention History; legacy-only и generic all-kind notification counts с header routing; resolved History total EN/RU/HE/fingerprints; persisted readonly Appeal side/ordinal.
- Добавлены регрессии: native PG длинного immutable content/read counts; Notifications route unknown/duplicate/invalid pages; strict query unit и Attention History route с Framework-normalized URL и проверкой сохранения unrelated group behavior; SSR UI total/Appeal side/ordinal.
- Новый **stable exact head:** `1af1c6272bf7b46009145488b52a42f89bfd0b2f`, Draft PR #277. [CI #41501045924](https://github.com/iliya1947/vico-forum/actions/runs/41501045924): **SUCCESS**, 1736 application / 455 PostgreSQL tests, lint/typecheck/builds/migrations/schema/Worker smoke PASS.
- Первые correction CI показали типовую ошибку i18next из-за зарезервированного `ordinal`; заменено на `number` в сообщениях и fingerprints. Финальный CI пройден.
- Проверки Chromium→built Worker→PG, owner visual acceptance и независимый review этого head не заявляются. Браузер пользователя не использован; production/deploy/merge и Package 6+ не затронуты.
- Author correction завершена, implementation до нового coordinator cycle не менять. Следующая задача — Мире провести whole-PR review указанного exact head; Лёва только после coordinator PASS.

## Package 5 — 4 technical findings correction complete

- Мира [подтвердила 4 findings](https://github.com/iliya1947/vico-forum/pull/254#issuecomment-6586563827) Лёвы (2 P2/2 P3) на прежнем `1af1c6272bf7b46009145488b52a42f89bfd0b2f`.
- Исправлено локально: `app/routes/complaint-history.tsx` использует проверенный strict page parser; system class и CSS grids в shared notifications desktop/mobile; RU/HE/EN `upheld|overturned` readonly labels/fingerprints; bounded 4096-byte URL-encoded notifications POST с allowlisted single fields и bounded ID.
- Добавлены тесты: timeline page=1/10000 и error inputs, MemoryRouter переход Next с 50+8 событиями, CSS/SSR card contract для system/legacy, RU/HE/EN Appeal outcomes, URL-encoded invalid/duplicate/unknown/oversized POST, запрет mutation по ошибочным запросам.
- **Stable exact head:** `96bb5e82dc7ff7df9e57ce08c182f5c8c49d38fe`, Draft PR #277. [CI #41513618388](https://github.com/iliya1947/vico-forum/actions/runs/41513618388) **SUCCESS**: 1741 application / 455 PG tests; lint/typecheck/builds/migration/schema/Worker smoke PASS.
- Documentation поправлена в профильном `docs/moderation/COMPLAINTS.md` (POST и readonly labels). Schema/domain/permission/Package 6 и unrelated modules не менялись; main неизменен. Chromium/browser/owner acceptance и independent review этого head не заявляются.
- Author correction complete, stopped ahead of next coordinator whole-PR review Миры в #254. Лёва только после её PASS.

## Package 6 — implementation in progress

- Назначение Миры: [#6590171670](https://github.com/iliya1947/vico-forum/pull/254#issuecomment-6590171670).
- Baseline current main `284bee3f5f0899cce1dc751cf4e9ef169739a120`; отдельный [Draft PR #279](https://github.com/iliya1947/vico-forum/pull/279), `chatgpt/complaints-package-6`.
- В работе: migration `0055`, reducer effective outcome, Case-lock/replay/pending/quota, atomic Appeal-result fanout, protected review/context/evidence, participant submit/result, Attention group2, shared inbox, EN/RU/HE, tests. Промежуточный CI не означает PASS.
- Owner visual acceptance не требуется без отдельного запроса; пользовательский браузер не использую. Package 7+, production, unrelated domains и merge вне scope.

## Package 6 — documentation checkpoint

- Implementation PR #279: source implementation head `37e6ef9d3f2f126ae635217e8f44586de3854efe` passed CI #41543820653.
- Found stale Package 5-only/deferred-Appeals wording in `docs/moderation/COMPLAINTS.md` and `PROJECT_STATE.md` on the implementation branch.
- Documentation-only commits in PR #279: `8a9ea4f866a113d22bdc3cb0f1f03f51e068a29c` (permanent Complaints contract), `9034409524fd0e9df85102680f68ded759705132` (state distinguishes draft implementation from merged main).
- Current head after docs: `9034409524fd0e9df85102680f68ded759705132`. Exact-head CI/review not yet verified; no stable-head handoff. Code/runtime/production/merge untouched in this checkpoint.
- Next: check latest exact-head CI, finish author verification for full Package 6 scope and record handoff only if verified.

## Package 6 — author source/CI checkpoint (current)

- PR #279 exact head `9034409524fd0e9df85102680f68ded759705132`; [CI #41546869959](https://github.com/iliya1947/vico-forum/actions/runs/41546869959) SUCCESS on exact head: checks/database, migration schema parity, PostgreSQL17 tests, app tests, builds, Worker/Hyperdrive smoke.
- Compared approved technical plan with repository code for effective-outcome reducer, protected participant/result and Appeal-review endpoints, independent Appeals read model, notification fanout and forward migration 0055. Their core contracts are represented in current source; this is a scoped author inspection, **not** a complete whole-PR review or real-browser acceptance.
- Browser/Chromium→built Worker→PG interactive acceptance was **not run**, in compliance with user's prohibition on my browser use. No owner visual acceptance was requested. Exact runtime behavior beyond automated checks is not verified.
- No new code changes, no coordinator handoff/PASS claimed. Remaining before handoff: finish applicable author verification and record the actual verification gap for coordinator. No production/deployment/merge.

## Package 6 — author handoff

- Implementation PR [#279](https://github.com/iliya1947/vico-forum/pull/279), **stable exact head** `9034409524fd0e9df85102680f68ded759705132` (47 changed files), base `284bee3f5f0899cce1dc751cf4e9ef169739a120`.
- Exact-head [CI #41546869959](https://github.com/iliya1947/vico-forum/actions/runs/41546869959): SUCCESS, checks and database jobs including app tests, PostgreSQL17 migrations/tests, lint/typecheck/build, schema parity and Worker/Hyperdrive smoke.
- Author source inspection covered reducer, Appeal policy/read, participant submit/result, appeal-only Attention admission, reviewer route, notification fanout, migration and documentation; examined relevant route/policy test names. No confirmed defect identified in inspected paths. This is not an independent whole-PR review or proof of every test case.
- Browser/Chromium→built Worker→PostgreSQL interactive acceptance **not performed**: developer prohibited browser use by Лира. Owner visual acceptance not requested. No production/deploy/merge. No implementation changes after CI head.
- **Author handoff complete**. Мира is next for coordinator whole-PR review of exact head; after coordinator PASS, Лёва independent technical review. No Codex review before coordinator PASS.

## Package 6 — coordinator FAIL correction in progress

- Мира FAIL на prior head `9034409524fd0e9df85102680f68ded759705132`; назначены P6-RTL-01, P6-VERIFY-01, P6-VERIFY-02 в [#6591717263](https://github.com/iliya1947/vico-forum/pull/254#issuecomment-6591717263).
- P6-RTL-01: changes committed in PR #279 to registry-based locale direction for Appeals group2, review source/current/context and expanded context language. Latest commit `9e725fe1d462761d8098686a8003d7a4a2ee8cda`; verification still pending. No PASS claimed.
- Native PG Appeal concurrency/rollback and populated 0054→0055 upgrade regressions remain pending. No browser/deploy actions, independent reviewer not started.

## Package 6 — RTL CI failure and correction

- Post-RTL head `9e725fe1d462761d8098686a8003d7a4a2ee8cda` CI #41550490614 FAILED in app tests (database job SUCCESS). Logs identify missing `registryLoaderContext` in `complaint-appeal-review.test.ts` fixture, not a proven production failure.
- Test fixture now supplies a locale registry and asserts Hebrew rtl / `und` auto source presentation; new head `170cec82f749351981464430cc861716220a64d3`, CI #41553314326 pending at observation.
- P6-VERIFY-01 and P6-VERIFY-02 remain outstanding. Correction package incomplete; no stable head/coordinator handoff.

## Package 6 — native PG concurrency coverage checkpoint

- Added one PostgreSQL integration regression in PR #279 for simultaneous Appeal submissions and simultaneous resolutions, asserting one accepted result, one pending slot, one resolved event and deduplicated participant notification rows. Commit `b7b3aa8fe3a076cf8976dae9bf648253c08d258a`.
- CI #41553467018 was queued at observation. Test correctness and CI PASS **not yet verified**.
- This does not yet establish the required submit↔resolve race or atomic rollback of result/event/fanout. Populated 0054→0055 migration upgrade acceptance remains outstanding. No coordinator handoff.

## Package 6 — notification failure rollback regression checkpoint

- In PR #279 added native PostgreSQL test that injects a local notification-insert trigger failure during Appeal resolution, asserts Appeal remains pending, no resolved event or notification exists, then retries the same operation successfully after removing the trigger. Commit `21589f252ec54f9c5c442f544b12d1551bd44483`.
- At last observation earlier CI #41553467018 was still in progress. New exact-head CI not yet confirmed; the added test is **unverified** until execution.
- Still missing explicit submit↔resolve race acceptance and populated 0054→0055 upgrade test. No review handoff/PASS.

## Package 6 — submit/resolve race test checkpoint

- Prior CI #41553467018 SUCCESS on head `b7b3aa8fe3a076cf8976dae9bf648253c08d258a`; #41553314326 SUCCESS on RTL fixture correction head. Rollback test CI #41553648917 was in progress at observation.
- Added native PG submit↔resolve regression exercising concurrent resolved first Appeal and subsequent eligible reporter submission. Checks legal serialization outcomes, ordinal/pending state and fanout recipients. Implementation PR #279 commit `1502c1b38dd1898dd7be37b408843bd63f595088`; new exact-head CI pending.
- Populated 0054→0055 migration upgrade acceptance P6-VERIFY-02 remains missing; no coordinator handoff.

## Package 6 — rollback test CI diagnosis

- Head `1502c1b38dd1898dd7be37b408843bd63f595088` CI #41553847290 was in progress at observation. Prior #41553648917 failed database test: native PostgreSQL rollback fixture's PL/pgSQL trigger function had malformed dollar delimiter, yielding SQL syntax error `42601` before exercising rollback; checks job passed.
- Corrected fixture to SQL single-quoted PL/pgSQL body with escaped embedded quotes. PR #279 commit `11f352f3d948a7770aefbf654320ac49f7dd8aff`. Fresh exact-head CI not yet verified.
- P6-VERIFY-02 populated 0054→0055 migration acceptance remains missing. Correction package not complete; coordinator handoff remains blocked.

## Package 6 — populated upgrade test checkpoint

- P6-VERIFY-02: added a native PostgreSQL test that applies 0000–0054 to a disposable schema, seeds actual Case/Decision, two real reporters, one resolved and one pending Appeal, existing read Decision notification, applies 0055, asserts resolved-only recipients/timestamps, reruns idempotent backfill and verifies preserved Appeal/Decision `read_at`. PR #279 commit `604b9bc86a821f91ebffb45951c5e2d2c439ba05`.
- Rollback fixture PL/pgSQL quoting was corrected in `11f352f3d948a7770aefbf654320ac49f7dd8aff` after exact CI failure. Both newer changes require exact-head CI; **no PASS yet**.
- Next is to inspect CI results and correct any confirmed failures before returning to Mira. No browser/deployment/merge.

## Package 6 — populated upgrade CI failure diagnosis

- Exact-head CI #41554226887 for `604b9bc86a821f91ebffb45951c5e2d2c439ba05`: checks SUCCESS, database FAILURE at populated upgrade fixture `relation "user" does not exist`.
- Verified cause: the test source mistakenly used double-escaped `\\d` and `\\.` in a JavaScript regex, so no pre-0055 SQL files were executed. Corrected to standard `/^\d{4}_.+\.sql$/`, commit `c8625a762a175576fb993a256f369a31577435cc` in PR #279. This is a test-fixture correction only. New exact-head CI pending; no PASS or handoff claimed.
- Prior CI #41554020632 on `11f352f3d948a7770aefbf654320ac49f7dd8aff` SUCCESS including rollback and submit/resolve regression. Remaining migration test must pass on new exact head.

## Package 6 — final correction handoff to Мира

- Implementation Draft PR #279 stable exact head: `0d6bdbb465148875e02663c4c27c56e099a415e4`, base `284bee3f5f0899cce1dc751cf4e9ef169739a120`.
- Exact-head CI [#41557641455](https://github.com/iliya1947/vico-forum/actions/runs/41557641455), **attempt 2 SUCCESS**: `checks` and `database`. The first attempt failed one unrelated content-generation navigation test; re-run of the failed job succeeded. No unrelated source changes.
- P6-RTL-01: registry-sourced direction across Appeals group2 excerpt, reviewer reported/current/context and expanded context; `und`/unknown fallback `auto`.
- P6-VERIFY-01: real PostgreSQL concurrent submissions, concurrent resolutions, submit-versus-resolve race and transactional rollback injection of notification failure; CI accepted.
- P6-VERIFY-02: disposable PostgreSQL schema migrated through 0054, populated preexisting pending/resolved Appeals and read Decision notification, applied 0055 and re-ran backfill for recipient dedup, timestamps, pending exclusion, and read-state preservation; CI accepted.
- Correction implementation complete. Coordinator repeat whole-PR review not performed by author. Chromium→Worker→PostgreSQL interactive acceptance remains unperformed under developer's browser restriction; not a separate current-scope blocker in previous coordinator review. Do not deploy/merge or start independent technical review until coordinator PASS.

## Package 6 — final P6-VERIFY-01 test-only correction

- Repeat coordinator review of #279 head `0d6bdbb465148875e02663c4c27c56e099a415e4` returned one remaining blocker: concurrent Appeal submission test previously used a single actor, so actor mutex rather than Case mutex could serialize commands. Coordinator comment #6592959445.
- Updated existing native PostgreSQL test in implementation PR #279 to submit concurrently from real `reporter-one` and `reporter-two` in the same Case/Decision using separate pool connections. Explicitly assert one accepted Appeal, one `ComplaintConflictError`, exactly one ordinal-1 pending slot and one `appealed` event; preserve competing resolve check and fanout expectations for all reporters.
- Implementation commit `c38b036b2ecb080735e6eaf4fcca5416a7aebc62` (test-only). Exact-head CI not yet confirmed. Do not claim correction PASS or coordinator handoff until CI success.

## Package 6 — final P6-VERIFY-01 evidence completed; handoff to Мира

- Native PostgreSQL test-only correction in implementation PR #279 at stable exact head `c38b036b2ecb080735e6eaf4fcca5416a7aebc62`. Two **different** actual reporters of one Case submit Appeals concurrently to the same initial Decision through separate PostgreSQL pool connections.
- Assertions: exactly one accepted Appeal, second `ComplaintConflictError`, exactly one pending ordinal-1 slot, exactly one `appealed` lifecycle event; no consumed additional slot or event. Existing concurrent resolution and notification fanout assertions retained.
- [Exact-head CI #41559889094](https://github.com/iliya1947/vico-forum/actions/runs/41559889094): **SUCCESS, attempt 1**, jobs `checks` and `database`. No production code changed in this final correction.
- Earlier P6-RTL-01 and P6-VERIFY-02 were closed by coordinator on prior head `0d6bdbb465148875e02663c4c27c56e099a415e4`; remaining P6-VERIFY-01 concurrency evidence is now submitted for **fresh coordinator verification**, not coordinator-accepted yet.
- Author handoff completed through service PR #254. Мира to repeat coordinator whole-PR review on current exact head; Лёва only after coordinator PASS. Browser/production deployment/merge not performed.

## Package 6 — P6-UI-01 bounded correction completed

- Independent technical reviewer Лёва confirmed P6-UI-01 and P6-UI-02 on PR #279 head `c38b036b2ecb080735e6eaf4fcca5416a7aebc62`; coordinator Мира assigned a bounded presentation + regression package in #254 comment #6593646346.
- P6-UI-01 implemented in PR #279: group2 Appeals queue shows existing localized target kind; Appeal review shows existing target kind and current topic title with already projected locale and registry-based direction. Commits `321844a98f0e6bc91b87c57d544e8d9f8afd87cd`, `7d3342d57733a6880fd2e6c4a1fe56e047cee047`.
- Added rendered regression coverage for post vs topic-title and EN/RU/HE UI labels, current Hebrew topic title direction and queue excerpt direction in `app/complaints/review-view.test.tsx`; commit `ec8ebf66056765efa4168b8b7246accd38fd2c36`.
- Exact-head CI #41566373391 at `ec8ebf66056765efa4168b8b7246accd38fd2c36`: **SUCCESS attempt 1** (`checks`, `database`). No schema/domain/permission changes. **P6-UI-02 remains unimplemented**, so no final handoff or coordinator PASS is claimed.

## Package 6 — P6-UI-02 bounded correction completed

- Corrected participant Appeal submit and reviewer Appeal resolve to preserve typed `invalid / conflict / forbidden / notFound / unavailable` error meanings in visible feedback without changing service/domain/HTTP classification.
- Added shared presentation mapping `app/complaints/appeal-feedback.ts` with contextual invalid/conflict labels and common permission/missing/unavailable errors. Added canonical English, reviewed Russian/Hebrew local values and source fingerprints for seven new keys.
- Added rendered React Router regression `app/complaints/appeal-feedback.test.tsx`: both actual route actions via typed exception injection, all five error types, EN/RU/HE feedback, observed HTTP status/error, retained draft, operation nonce and same-target retry after 503. The test submits rendered forms and does not rely only on route unit response mapping.
- Implementation PR #279 exact head `e2e43316165b49d2b9fbf724138c9c7d07f71a60`; [CI #41567459036](https://github.com/iliya1947/vico-forum/actions/runs/41567459036) **SUCCESS attempt 1**: both `checks` and `database`. Earlier TypeScript failures on intermediate heads were resolved by adding reviewed fingerprints and correctly annotating the partial render fixture.
- P6-UI-01 previously completed on `ec8ebf66056765efa4168b8b7246accd38fd2c36` with CI #41566373391 SUCCESS. Both UI corrections now implemented and green on the current exact head. Formal handoff/new coordinator review not yet performed; browser/production/merge not performed.

## Package 6 — P6-UI-01/02 consolidated author handoff

- Final Draft implementation PR #279 stable exact head: `e2e43316165b49d2b9fbf724138c9c7d07f71a60`; unchanged base `284bee3f5f0899cce1dc751cf4e9ef169739a120`.
- [Exact-head CI #41567459036](https://github.com/iliya1947/vico-forum/actions/runs/41567459036) **SUCCESS, attempt 1**; `checks` and `database` both completed successfully.
- P6-UI-01: displayed existing localized post/topic-title `kind` in Appeals group2 and Appeal review; displayed `currentTopicTitle` with source locale/direction exactly as ordinary P4 review. Render tests on EN/RU/HE for post and topic-title, RTL Hebrew title and queue excerpts.
- P6-UI-02: mapped typed command failures `invalid/conflict/forbidden/notFound/unavailable` to Appeal-specific, reviewed EN/RU/HE messages for participant submission and moderator resolution. Render tests call real actions, verify status → localized visible feedback, preserve drafts, operation nonce and same-target retry. Current canonical SHA-256 source fingerprints for all seven new messages independently recomputed and matched committed values.
- Correction package complete on author side; **not yet coordinator-accepted**. Handoff to Мира for full coordinator review on current stable exact head; after coordinator PASS, independent technical reviewer Лёва repeats review on same exact head. Browser/owner visual acceptance, deployment, merge, Package 7 not performed.

## Package 6 — P6-DOC-01 doc-only correction and handoff

- Mira's fresh coordinator whole-PR review of implementation PR #279 head `e2e43316165b49d2b9fbf724138c9c7d07f71a60` closed P6-UI-01 and P6-UI-02, but confirmed one current-scope documentation defect P6-DOC-01: transient PR/review/merge state in `PROJECT_STATE.md`. Assigned via #254 comment #6594442292.
- Modified **only `PROJECT_STATE.md`** on implementation branch: removed references to the current implementation PR, unmerged status, coordinator/independent review and future review/merge checkpoint; described Complaints Packages 1–6 in repository/local-CI path and Package 7 remaining unimplemented, with merge-stable wording. No source/schema/permission/product contract changes.
- Implementation exact head: `df33f134fcd49c01258b95b02e34b726bc9b845f`. GitHub commit diff confirmed one modified file, 3 additions and 3 deletions.
- [Exact-head CI #41570619722](https://github.com/iliya1947/vico-forum/actions/runs/41570619722): **SUCCESS**, attempt 1, both `checks` and `database`.
- Author correction complete; handoff to Мира for **focused document verification** on this exact head, not new implementation whole-PR cycle unless requirements/code change. Coordinator PASS is pending; after PASS independent technical review Лёвы of the final exact head. No merge, browser, deployment or Package 7 work.

## Package 6 — P6-DOC-02 author correction and handoff

- Mira's focused verification of prior P6-DOC-01 correction on head `df33f134fcd49c01258b95b02e34b726bc9b845f` closed that issue but confirmed P6-DOC-02: `PROJECT_STATE.md` repository migration history still mentioned 0054 despite new forward 0055 migration in PR #279. Assignment: service PR #254 comment #6594553314.
- Updated **one factual line only** in `PROJECT_STATE.md`: repository migration history `0000`–`0054` → `0000`–`0055`. Independently verified `drizzle/0055_complaint_appeal_notifications.sql` exists in implementation branch.
- Implementation stable exact head: `5494fe92dc5cc8b3fed87db5efcc9bc98b2f1731`; GitHub commit diff confirms one changed file, 1 addition and 1 deletion. No source/schema/permission/product requirements changes.
- [Exact-head CI #41571491052](https://github.com/iliya1947/vico-forum/actions/runs/41571491052): **SUCCESS**, attempt 1, both `checks` and `database`.
- Author correction complete. Handoff to **Мира** for focused document verification of P6-DOC-02 on stable exact head; coordinator PASS pending. After coordinator PASS, independent technical whole-PR review by Лёва on final exact head. No browser, merge, deployment or Package 7 work.

## Package 7 — P7-DOC-01 prepared (implementation branch blocked)

- At main `020cbafe1a1c872773c7e3c41e79c7c7f81eabe8`, `docs/auth/AUTHORIZATION.md` retains the obsolete assertion "appeals, notifications and History UI remain deferred"; this conflicts with merged Packages 5–6 and `docs/moderation/COMPLAINTS.md`.
- Minimal intended paragraph replacement (documentation only, **not applied**):

> Complaint permissions protect the server-only capabilities described in [`COMPLAINTS.md`](../moderation/COMPLAINTS.md). `forum.complaint.create` permits authenticated complaint submission; `forum.complaint.review` permits open Queue, resolved History, protected Case/context/evidence reads, notes and initial Decisions. `forum.complaint.appeal.review` independently permits the pending Appeals queue, protected Appeal review/context/evidence and Appeal resolution, without granting ordinary Case review. `forum.complaint.priority.manage` separately permits the persisted reason-priority settings and does not grant Case reads; Case review does not grant settings access. The Attention header routes management-only actors to settings without reading Cases; global admin admission is unchanged. Structured reporter/appellant identity requires the additional `forum.complaint.reporterIdentity.read`, never seeded to a built-in role; identity permission alone grants no Case/Appeal access. Participant Decision/Appeal results and Appeal submission independently verify actual affected-author or reporter membership and current Appeal eligibility, without depending on `forum.complaint.create` or either reviewer permission. Complaint notifications use the existing shared inbox. Shared Admin Quick actions retain their separate authority.

- The replacement does **not** change authorization grants, DB schema, or domain policy; the remaining authorization document is untouched.
- GitHub `create_branch` was blocked by a safety restriction; a subsequent branch search still returned no `chatgpt/complaints-package-7`. This is preparation only: no implementation branch/PR, code changes or CI. The creation blocker is recorded in service PR #254 comment #6595526435.

## Package 7 — first bounded subtask: implementation Draft and P7-DOC-01

- After the branch creation safety blocker, Мира created `chatgpt/complaints-package-7` from current main `020cbafe1a1c872773c7e3c41e79c7c7f81eabe8` and recorded it in #254. Verified branch SHA matches base.
- Modified `docs/auth/AUTHORIZATION.md` only, removing stale deferred Appeals/notifications/History wording and describing the implemented capability/membership boundaries. No code, grants, schema or permission policy changes; checked one-file diff.
- Opened [Draft PR #280](https://github.com/iliya1947/vico-forum/pull/280), initial exact head `4c8f5954afb01836cfbb85f6897a458a3ceb43f4`. Exact-head CI #41580997525 initially queued.
- **P7-DOC-01 author correction complete**, no coordinator acceptance claimed. B1/B2/B3 connected native/runtime verification still open. Do not update PROJECT_STATE to Package 7 complete until verification is actually accepted; do not start coordinator review before final evidence/CI.

# Лира — ChatGPT-6

## Активное назначение — независимый whole-PR review #343

Лира не участвовала в реализации и назначена независимым reviewer после coordinator PASS Миры.

Проверить implementation PR #343 на stable exact head `10321fdae762004ac2d55e9618a89c6c41e0d2ac` целиком против принятого scope и актуального проекта.

Фокус: пользовательский flow и UI/state boundaries, route/action validation, session/permission/ownership, `posts.edit`, CAS/conflict/rebase, translation currentness, отсутствие scope expansion, а также достаточность относящихся tests/browser evidence.

Не исправлять реализацию во время review. Не опираться на будущий вывод Марка. Возможные findings сначала проверить как реальные current-scope defects. Зафиксировать PASS либо подтверждённые findings в служебном PR и STOP.


## 2026-11-18 — Лира: независимый whole-PR review #343 — PASS

Проверен весь принятый bounded scope PR #343 на stable exact head `10321fdae762004ac2d55e9618a89c6c41e0d2ac` относительно `main` `906d15d896cc3a4f3b7dc9a03f46acd883925d1d`. Подтверждённых current-scope дефектов **не обнаружено**. Реализацию не изменяла; чужие выводы не использовала как доказательство.

Сверены 29 изменённых файлов и основные потоки: новая самостоятельная capability, initial grants + forward migration 0067 / Drizzle schema; session/same-origin/fresh permission и строгая форма; authoritative topic author/current revision, AccountState и `posts.edit` admission с Owner immunity внутри transaction; immutable title revision + `sourceLocale: "und"`, CAS/no-op и rollback; original/revision-bound translations и гонка с source-locale correction; UI/fetcher, запрет автоповтора, сохранение текста при 409 и явный rebase; отказ/отзыв прав, изоляция буфера по actor/topic; неизменность body, Help/solution/closure и отсутствие неутверждённого cooldown, edit-any, drafts и внешнего rollout.

Независимо сопоставлены JSON Drizzle snapshots 0066/0067: изменения ограничены `id`, `prevId` и расширением catalog CHECK. Проверены тестовые сценарии route/component/PostgreSQL/translation/browser workflow. GitHub API подтверждает **17/17 completed success check-runs**, включая CI/DB и отдельный connected Chromium workflow, на exact head. Локальные тесты/браузер лично не запускала; их результаты приняты как CI evidence, не как самостоятельно воспроизведённый прогон. Owner visual acceptance отложен по прямому решению владельца.

**Результат: PASS.** Следующий этап — Мира сопоставляет независимые результаты, принимает closeout-решение; при отсутствии current-scope дефектов — merge implementation #343 и отдельный заключительный docs PR. Служебный #342 не merge. STOP.


## 2026-11-18 — docs closeout assignment withdrawn

Предыдущее назначение Лиры на #344 отозвано: в #342 не было отдельного решения разработчика о docs-исполнителе. До нового назначения Лира по #344 не действует.


## 2026-11-18 — активное назначение: независимый review docs PR #344

По прямому назначению владельца проверить уже готовый docs PR #344 как независимый reviewer.

Target: exact head `cd72e8696167d71c8e93e7ab63ff8e86342af4c3`, base/main после merge #343 — `d8667f630450f702783bbbdb9a3ec14432e75660`.

Мира является автором docs diff. Не переписывать документацию и не начинать новый авторский этап. Независимо проверить весь diff #344 против фактически merged поведения #343, актуального main и относящихся source-of-truth документов. Проверить фактическую точность, полноту необходимого docs closeout, отсутствие лишних/исторических утверждений в current-state документах и сохранение Stage-6/UI-acceptance границ.

Во время review #344 не изменять. Возможные findings сначала подтвердить как реальные current-doc-scope defects. Результат: PASS либо один полный пакет подтверждённых findings. После этого STOP и возврат Мире.


## 2026-11-18 — независимый whole-PR review docs #344 — PASS

Проверен **весь docs diff PR #344** на stable exact head `cd72e8696167d71c8e93e7ab63ff8e86342af4c3` относительно `main` / merged #343 `d8667f630450f702783bbbdb9a3ec14432e75660`. Самостоятельно сопоставлены пять изменённых файлов: `PROJECT_STATE.md`, `docs/auth/AUTHORIZATION.md`, `docs/ADMIN_PANEL.md`, `docs/PROJECT_HISTORY/PROJECT_HISTORY.md` и `docs/PROJECT_HISTORY/PROJECT_HISTORY_29.md` — с реальными repository/route/UI/authorization/migration boundaries и принятыми product/translation/Stage-6 решениями.

- `PROJECT_STATE.md`: корректно отражает новую реализованную own-title функцию и migration ceiling `0067`, не приписывает external rollout или визуальную приёмку.
- `AUTHORIZATION.md`: code-backed `forum.topic.title.editOwn`, отдельная resource ownership и no edit-any, grants user/moderator/admin, fresh permission, AccountState/measure, immutable revision/CAS/no-op соответствуют merged code.
- `ADMIN_PANEL.md`: объектная матрица и применение AP-10 `posts.edit` к own-topic title отражают owner decision E2, сохраняют separate Own/Admin capabilities и действующие UX restrictions.
- Исторический индекс и snapshot `PROJECT_HISTORY_29.md`: ссылки/даты/implementation exact head и merge commit, 17 успешных exact-head checks и пределы connected Worker/Chromium совпадают с GitHub и service evidence. History остаётся отдельно от current source of truth.
- Docs PR содержит только эти пять documentation files. Все 4 exact-head GitHub checks завершились `success`. Отдельный локальный тестовый прогон не выполнялся; для docs-only diff это не требуется.

**Подтверждённых дефектов current docs scope нет. Документационный diff: PASS.** Review осуществлён без изменения #344.

**Отдельное подтверждённое несоответствие PR metadata (не docs diff):** текущее описание PR #344 по-прежнему предписывает Лире исполнять/редактировать документацию, хотя последнее прямое назначение владельца в #342 — только независимый review готового diff Миры. Требуется синхронизировать описание PR с действующим assignment перед closeout. Это не дефект проверенных пяти документационных файлов, не основание переписывать docs или сбрасывать exact-head review.

Передача Мире: учесть PASS, привести PR #344 description в соответствие с прямым назначением, определить готовность docs PR к merge владельцем. STOP.


## 2026-11-18 — активное назначение: реализация Watch

Реализовать принятый bounded Watch scope из `USER_ACTIONS_SERVICE_PLAN.md` после scope/fit решений Миры W1–W3, в отдельном implementation PR от актуального main.

Требуемый результат: authenticated пользователь может Watch/Unwatch конкретную тему; состояние persist между сессиями; будущий reply другого пользователя в watched topic попадает в существующий notification inbox; Unwatch прекращает только watch-derived будущие notices; существующие author/parent/mention semantics, read-state и старые notifications не меняются.

Границы: минимальная watch persistence + forward migration/runtime ACL; **без нового RBAC permission**; canonical topic route с narrow `setTopicWatch`; actor только из session, topic только из route; active AccountState/same-origin/stale actor; существующий reply-kind/inbox/dedupe. Не добавлять auto-watch, bookmarks/saved list, watcher list/count, email/push/digest, Admin/Super-admin, #320, UI/UX refinement или Stage 6.

Самостоятельно выбрать корректную реализацию внутри принятого технического плана. Выполнить применимые unit/route/component, PostgreSQL concurrency/lifecycle, migration/manifest/privilege, build/CI и connected real Worker + Better Auth + PostgreSQL 17 + Chromium проверки для Watch. После stable exact implementation head зафиксировать PR/head/evidence в #342 и STOP для coordinator whole-PR review Миры.


## 2026-11-18 — Watch implementation, этап 2: сервер и БД

Проверены текущий `AGENTS.md`, принятый Watch plan, решения W1–W3, основной `main` `7cc23edede57994cdedab49c1556ddb55034dd29` и изменяемые source seams. Подтверждены lock graph публикации, существующий общий inbox/recipient uniqueness, PostgreSQL 17 row-lock compatibility и built-in `gen_random_uuid()`.

Создана отдельная ветка `feature/topic-watch` и **Draft implementation PR #345**: https://github.com/iliya1947/vico-forum/pull/345 . Текущий **промежуточный** head `6cede3af5fe2d096cf01be676050a662b2d9f91b`, **не stable review head**.

Изменены 11 файлов: Drizzle schema с `forum_topic_watches` (FK cascade, composite PK, fanout index), forward migration `0068_topic_watch`, journal/snapshot, full production schema manifest, только web-runtime SELECT/INSERT/DELETE ACL; repository/service/Hyperdrive own-state read + transactional desired-state Watch/Unwatch with topic `FOR NO KEY UPDATE` и persisted active actor admission; reply publication set-based union author/parent/watcher с `gen_random_uuid()`, self exclusion и existing recipient/post ON CONFLICT; strict authenticated same-origin canonical `setTopicWatch` intent с actor expectation, boolean и operation result/errors. Нет RBAC key, другого inbox, auto-watch, backfill или Stage-6 действий.

Выполнена GitHub compare base...head: branch ahead by 2 commits, ровно 11 изменённых файлов в принятом backend/schema scope. На момент проверки GitHub CI запущен, часть jobs queued/in_progress; **тесты не объявлены PASS**, локальный PostgreSQL/browser запуск не выполнялся. UI/loader private watch presentation, focused tests, real DB concurrency и browser acceptance остаются этапом 3. PR Draft, к review/merge не готов.

STOP после завершения серверного/DB этапа согласно декомпозиции. Следующая задача при явном продолжении владельца: Watch UI, тесты и browser acceptance; затем stable exact head и coordinator handoff Мире.


### 2026-11-18 — Watch CI correction checkpoint

Initial PR #345 interim head `6cede3af5fe2d096cf01be676050a662b2d9f91b` had CI failures: TypeScript nullable response init and new Reader/Writer mocks; native DB historical subset fixtures lacked `forum_topic_watches` when executing current reply fanout; migration/table counts and monitoring expected tag were stale. Confirmed from exact GitHub job logs. Targeted corrections pushed to current interim head `bacaadfed1d2494380956c278aab7b0b1bbbd862`. Checked Drizzle snapshots 0067→0068: only new table, id, prevId; full manifest adds only the table and target migration 0068. Fresh `database` GitHub job **PASS** on corrected head; remaining CI/browser jobs may still be running. PR #345 remains Draft / not ready for whole-PR review. Work has not moved into UI stage.


## 2026-11-18 — Watch UI/acceptance implementation checkpoint (stage 3, ongoing)

Продолжен Draft PR #345 от принятого backend head. На промежуточном implementation head `72e9b8d15ee515af1c5dab309cc66ea9514178ae` добавлены: персональный no-store loader / explicit on-off-unavailable status, независимый actor/topic-scoped Watch fetcher control, RU/HE reviewed canonical localization и CSS, strict Watch route/unit + private loader + UI cases, реальный PostgreSQL suite (Watch/Unwatch, author+parent+mention dedupe, notification/read-state isolation, fanout rollback, real different-PG-connection lock races, account deactivation, file-only publication, idempotent receipt replay), connected Chromium Worker/Better Auth/PG workflow `watch_browser` с inbox/open-to-post/RTL проверкой. Ранний отказ guard before FormData восстановлен; mocked reader в существующем edit-recovery test дополнен новой read capability. Компонент не считает старое состояние подтверждённым после ошибочного/неоднозначного write.

Диагностика промежуточных CI: head `e5caefedd14e8be0190310e5b1ec3a4955195591` дал database PASS, но checks FAIL по 16 unit tests — 14 edit-recovery из-за отсутствующего mock reader, 1 File multipart parser case и 1 каскадный Settings test; источник установлен по job logs и целевые исправления внесены. На head `05b8fd388627fe979180647b98950b853a28f9fc` GitHub **checks PASS и database PASS** (до нового file-only DB теста). На текущем промежуточном head `72e9b8d15ee515af1c5dab309cc66ea9514178ae` GitHub CI и новый watch_browser запущены, окончательные результаты ещё не установлены, stable review head ещё НЕ зафиксирован. No production/external action. Проектная документация остаётся для отдельного PR.

Реализация остаётся у Лиры, PR Draft и не готов к coordinator review. Следующий шаг — завершить CI/connected acceptance на current head, исправить только реальные дефекты, затем зафиксировать stable head и STOP для Миры.


## 2026-11-18 — Watch: завершение отдельной подзадачи UI + loader

После прямого указания разработчика дробить этап на более мелкие части выполнена **только сверка UI + loader + typecheck**; к unit-test extension, real PG concurrency и Chromium remediation перехода нет.

В Draft #345 на точном промежуточном head `19a5015c0d2b9ff7ccfe57cd03e64b64e0a8e191` подтверждена имеющаяся реализация:
- `app/routes/topic.tsx`: личный own-pair read для authenticated actor, состояния on/off/unavailable с classified outage, guest без собственного состояния, `Cache-Control: private, no-store` с прокидыванием через route headers;
- `app/forum/topic-watch-control.tsx` + `views.tsx`: actor/topic scoped fetcher, явный desired-state ON/OFF, pending lock, подтверждение только по совпадающему server result, unknown/error state без auto retry, refresh control, независимость от reply/title editor;
- `app/localization/catalog.ts`, `manual-values.ts`, `manual-fingerprints.ts`, `app/styles.css`: английский canonical + RU/HE translations и UI styles;
- `app/forum/actions.server.ts`: сохранён guard перед formData parsing.

GitHub **checks job** exact head, job `134798391182`: lint PASS, typecheck PASS, Test PASS, build PASS, UI preview PASS, migration metadata и schema parity PASS. Отдельный `database` job PASS. **Не объявляется общий CI PASS**: отдельный `watch_browser` на этом head завершился FAILURE; расследование в рамках ограниченной UI/loader подзадачи не проводилось. Head остаётся interim и PR Draft. В implementation branch по этой подзадаче новые коммиты не нужны, код уже присутствует.

STOP. Следующее явное продолжение владельца — **отдельная подзадача unit/route/component tests**; затем отдельно real PostgreSQL concurrency, затем Chromium failed job diagnosis/acceptance. Не смешивать эти этапы.


## 2026-11-18 — Watch: unit/route/component test audit checkpoint

Следующая отдельная подзадача после UI/loader STOP. Актуальный implementation #345 head до изменений `19a5015c0d2b9ff7ccfe57cd03e64b64e0a8e191`; `AGENTS.md` и service workflow/accepted Watch plan сверены, исполнитель Лира.

Проверены уже присутствующие tests: `app/forum/write-actions.test.ts` покрывает authenticated same-origin strict Watch intent, unique scalar/duplicate/File/mixed payload, stale identity, canonical actor/topic, expected failures & unexpected error propagation; `app/forum/public-authz-degradation.test.ts` покрывает guest/no-state, authenticated own-state/private no-store, unavailable vs off и unexpected exception; `app/forum/public-read.test.tsx` до этого покрывал только initial static Watch presentation/on/off/unavailable/account-switch. **Выявлен реальный coverage gap** на уровне интерактивного fetcher control: ожидаемый ON/OFF submission, pending disabled duplicate prevention, error/unknown ack + explicit read refresh, stale response после навигации.

В `feature/topic-watch` commit `ffb96ad59646abd15001d6be5879d8b848f4f26b` добавлен только `app/forum/topic-watch-control.test.tsx` (четыре параметризованные/отдельные React Router memory router + React Testing Library test cases) для названных сценариев. Production source/schema/PG/browser не менялись. На момент записи exact-head GitHub `checks` job `134806758552` **queued**, PASS не установлен. Общий PR #345 остаётся Draft, stable review head не назначен; отдельный `watch_browser` fail предыдущего head не диагностировался.

STOP в рамках детальной декомпозиции. Отдельный следующий срез после проверки unit job — реальные PostgreSQL concurrency/lifecycle cases, затем отдельно connected Chromium/Worker failure acceptance. Не объединять эти срезы.


### 2026-11-18 — Watch unit/route/component CI verification, STOP

Проверен GitHub exact commit `ffb96ad59646abd15001d6be5879d8b848f4f26b` реализации #345. Job `checks` ID `134806758552` завершился **success**: lint, typecheck, unit tests (включая новый `app/forum/topic-watch-control.test.tsx`), build, UI preview, migration metadata и Drizzle schema parity — PASS. Unit/route/component subtask закрыт. В рамках этого среза не менялись код или БД. Отдельно на этом head: `watch_browser` и `attachments_browser` — failure; database job ещё running на момент проверки. Эти jobs не объявляются PASS. PR #345 Draft, head не stable. STOP. Следующий срез по отдельной команде — real PG concurrency/lifecycle tests.


## 2026-11-18 — Watch PostgreSQL concurrency/lifecycle subtask (Лира)

По отдельной команде владельца в #345 проверено существующее `tests/database/topic-watch.test.ts` и на exact head `ffb96ad59646abd15001d6be5879d8b848f4f26b` подтверждён **database PASS** (PostgreSQL 17). Исходное покрытие включает четыре lock orders Watch/Unwatch × reply, оба ON/OFF, deactivation-before-actor-admission, fanout dedupe, idempotent desired state, no backfill, attachment-only/replay, rollback, прочее. Обнаружены два текущих lifecycle-gap: actor-admission-first → deactivation waiting; после деактивации passive watcher всё ещё recipient по existing reply policy.

В `feature/topic-watch` commit `2b84f5eb91d161ac4aba2311335195d46f07693b` изменён **только** `tests/database/topic-watch.test.ts`: общий row-lock gate для topic/actor; новый реальный двухсоединительный тест actor-lock-first с доказательством ожидания UPDATE до Watch commit и запретом следующего OFF; отдельный DB тест пассивного fanout для deactivated watcher и отсутствия read-state изменения. Нет изменений production source/schema/browser. На момент записи новый job `database` ID `134865906627` выполняет clean PG17 migrations/integration; PASS/FAIL нового head пока не установлены. PR #345 Draft, не stable. Следующий самостоятельный slice — Chromium/Worker connected failure diagnosis, **только после отдельной команды**. Не смешивать с PG slice.


### 2026-11-18 — Watch PostgreSQL slice verified PASS; STOP

Current interim #345 head `2b84f5eb91d161ac4aba2311335195d46f07693b`. First `database` job `134865906627`: **15/15 `tests/database/topic-watch.test.ts` passed** and all 106 database test files / 1432 tests passed, but whole job failed on one unhandled rejected promise from the existing `tests/database/sa04-complaints-n1.test.ts` after its tests completed (`ComplaintConflictError: reported revision changed`). No Watch test/assertion failed. The previous head had database PASS. First isolated rerun attempt was rejected while the containing workflow run was still in progress; after its completion, successfully reran **only database job on the SAME exact commit** (no code changes).

GitHub rerun job `134868877271`, workflow run `44322784813`, attempt 2: **database success**. Clean PG17 migrations/tests, full schema manifest, runtime privilege probes, Workers build/Hyperdrive smoke, Better Auth Complaints HTTP smoke passed. The original Complaints unhandled rejection did not recur. This is a nondeterministic failure of unrelated existing test, not evidence of a Watch production defect; no broad fix applied. Test source changes in this slice remain exactly `tests/database/topic-watch.test.ts` (actor-mutex-first deactivation blocking and passive inactive watcher notification/read-state). **PG concurrency/lifecycle slice completed, STOP**. Remaining separate task on owner's next command: connected Chromium/Worker Watch acceptance failure analysis and remediation. Overall PR #345 is Draft, not stable review head, `watch_browser` still FAIL.


### 2026-11-18 — Watch connected Chromium/Worker acceptance PASS, STOP

По явной команде владельца в #345 проверен exact head `2b84f5eb91d161ac4aba2311335195d46f07693b` и GitHub `watch_browser` job `134865907142`: реальные Chromium/Worker/Better Auth/PG17 сценарии проходили guest/read/Watch/persistence/inbox/permalink, затем падали на втором быстром reply: HTTP 429. По `db/forum-write-policy.ts` production write cooldown равен 5_000 ms, обе публикации в тесте выполнял один actor. Установлена причина: тест создавал противоречивые частые запросы; production cooldown менять не нужно.

В `feature/topic-watch` сделан один narrow тестовый commit `76c1c456557c614171a3b472758498795a668b9a`: **только** `tests/browser/topic-watch/check.py`; каждую publication в обоих topic-case выполняет отдельный newly registered publisher actor, что исключает искусственный cooldown. Production source/schema/unit/PG tests не тронуты.

На этом exact head GitHub `watch_browser` job `134873103841` **success**, 11 лог-записей `WATCH_CONNECTED`: обычная и Help тема × public guest/auth Off, strict guest/identity/origin/boolean, UI Watch persisted/reload/user isolation, reply → shared inbox badge → precise post permalink → read marker, Unwatch suppresses only future watch-derived notices/preserves history; финальный he/RTL narrow viewport PASS. Built Worker + native Better Auth + PG17 + real Chromium, browser errors/external network guards succeeded. `checks`/ `database` на момент этого отчёта ещё выполняются; PR #345 Draft, stable full-PR review head **не объявлен**.

**STOP** после одной Chromium/Worker подзадачи по требованию владельца. Следующее только по отдельной команде: whole-CI exact-head final gate/status и подготовка stable review handoff Мире; не начинать ревью реализации самостоятельно.


### 2026-11-18 — Watch exact-head whole-CI gate PASS; owner visual gate pending; STOP

По отдельной команде владельца проведена **только финальная проверка GitHub checks/head и подготовка передачи**, без whole-PR review собственной реализации и без изменений implementation. PR #345 Draft, `feature/topic-watch` exact head `76c1c456557c614171a3b472758498795a668b9a`, base `main` `7cc23edede57994cdedab49c1556ddb55034dd29`; GitHub compare: 20 commits ahead, 0 behind, 35 changed files; GitHub reports `mergeable=true`. Проверка commit check-runs: **17/17 completed success** (без queued/running/failed), включая `checks` ID `134873104470`, `database` ID `134873105036`, `watch_browser` ID `134873103841`, все regression browser jobs. CI workflow run `44324798207` PASS; connected Watch workflow run `44324798071` PASS. Browser acceptance artifacts `topic-watch-connected` ID `14436671855` created for that exact SHA, expires 2026-11-25; connected logs showed normal/Help Watch/Unwatch, shared inbox/permalink and RTL. Old failed attempts belong to superseded heads, not this head.

PR #345 discussion/reviews: no comments and no submitted reviews. #342 communication/PR comments checked: no Watch owner visual acceptance recorded. `AGENTS.md` requires **owner visual acceptance before formal whole-PR review**; earlier explicit exception for own-topic-title #343 (deferred to later UI/UX pass) was for that feature, not automatically Watch. No such exception established for Watch. Accordingly `76c1c456557c614171a3b472758498795a668b9a` is **CI-stable technical implementation head**, but **not yet formally review-ready**; PR remains Draft, no coordinator review started or approval claimed. The owner can review connected Watch visual evidence at https://github.com/iliya1947/vico-forum/actions/runs/44324798071 (artifact `topic-watch-connected` contains narrow Hebrew RTL screenshot and evidence), and may record Watch visual acceptance or expressly defer it as a scope decision. Only after that gate should Мира conduct coordinator whole-PR review on this exact head; after PASS — Лёва independent technical review same head. Any implementation code change requires new exact-head CI/review cycle. Permanent/current state docs are a **separate later docs PR after implementation merge** under service workflow.

STOP at this subtask. No merge/production/deployment or metadata transition of #345 to ready was done. Next action: developer owner visual decision for Watch, then separately activate Мира coordinator review through #342.


## 2026-11-18 — активное назначение: Bookmarks implementation #346

По прямой команде владельца реализовать следующую задачу текущего блока — **topic Bookmarks / избранное** — прямо в Draft PR #346. #342 остаётся служебным каналом; #346 — implementation PR.

Источник scope: принятый Bookmarks plan и scope/fit B1/B2/B3/B5 в `USER_ACTIONS_SERVICE_PLAN.md`. Перед изменениями сверить его с актуальным main после merge Watch (`9c4639d23ca075c8bb92fbb909b96593d7bee127`) и использовать фактические merged seams/migration ceiling. Требуемый результат — законченный bounded Bookmarks slice по принятому scope с применимыми repository/DB/route/browser/CI проверками. Не расширять реализацию в Mute/block, visibility, structure, #320 или Stage 6.

После полной реализации зафиксировать stable exact head #346 и результаты проверок в #342, затем **STOP** для coordinator whole-PR review Миры.


## 2026-11-18 — correction: Bookmarks assignment cancelled

Владелец уточнил исполнителя: предыдущее назначение на Bookmarks #346 отменено. **Лира не реализует Bookmarks** и не изменяет #346 по этому назначению. Исполнитель — Лёва / Codex-6.1 Sol.


## 2026-11-18 — correction: Bookmarks implementation remains assigned to Lira

Уточнение владельца: «Лёва» означало, что Лёва завершил planning, а не смену исполнителя. Предыдущее сообщение об отмене назначения Лиры было ошибочным.

**Актуально:** Лира продолжает реализацию Bookmarks в Draft PR #346 по принятому Bookmarks plan. После полной реализации и stable exact head — STOP и возврат Мире на coordinator whole-PR review. Лёва после PASS Миры выполняет независимый technical review; он не является implementer этого этапа.


## 2026-11-18 — Лира: Bookmarks backend slice, Draft #346

По прямой команде владельца актуальный исполнитель — **Лира**, а не Лёва; назначение уже исправлено в workflow. Планы B1/B2/B3/B5 применены к merged Watch/main `9c4639d23ca075c8bb92fbb909b96593d7bee127`.

В #346 после schema-only `0069` добавлены:
- `79bf23ef549191298dd4a96f9523a42e45487180`: `db/forum-repository.ts`, `db/forum-service.ts`, `db/hyperdrive-forum.ts`. `setTopicBookmark`: topic `FOR KEY SHARE` → active actor `FOR NO KEY UPDATE`, READ COMMITTED Add/Remove desired-state; `readTopicBookmark` own scalar; `readTopicBookmarks` own SQL-filtered keyset 50+1 by `saved_at DESC,topic_id DESC` with current title/public projected author, public ordinary/Help location. Typed reader/writer and request-local Hyperdrive adapters.
- `d80981dc7f30fd84c20d5cb7a062a0b10c6757b8`: 4 focused real PostgreSQL tests `tests/database/topic-bookmarks.test.ts`: isolated persistence and no-op timestamps, Help/current title/deactivated author, 52-row tied saved-at page, missing/inactive admission.
- `4a614183b41eda66e5a95a25aaaa5b4ad1669e1c`: extend three existing `ForumReader/ForumWriter` test doubles for new interface methods; prior-head TypeScript identified missing members, now exact-head `Typecheck` SUCCESS.

**Exact #346 head `4a614183b41eda66e5a95a25aaaa5b4ad1669e1c`**: GitHub `database` job ID `134970762262` **SUCCESS** (clean PG17 DB suite including new Bookmarks tests); `checks` job ID `134970762774` migration-history, lint, typecheck steps SUCCESS; whole `checks` job ID `134970762774` **SUCCESS**, including migration-history, lint, typecheck, unit Test, build/preview and validation; `database` ID `134970762262` **SUCCESS**. All **15/15** GitHub check-runs on exact #346 head completed successfully, including existing browser regressions. This is backend/CI acceptance only; Bookmarks route/UI/browser acceptance not yet implemented.

**STOP after bounded backend slice.** No Bookmarks route, strict form action, list loader, UI, translations or new browser acceptance yet; they are distinct next slices. `main` untouched, #346 Draft, #342 service-only never merge, no production actions.


## 2026-11-18 — Bookmarks route/action/private loader bounded slice (Лира)

#346 exact intermediate head `4c846036e2b3ad1b91d5ad6d035943ad9babd0e7` (Draft, main unchanged). Implemented one canonical `/:locale/topics/:topicId` `intent=setTopicBookmark` action; server session actor + route topic, strict exact fields `intent,editorActorId,bookmarked=true|false`, reject repeated/mixed/File/extra/forged values, same-origin/session guard before FormData, stale actor 409, classified 401/403/400/404/503 and no-store discriminated successful+post-parse errors. Reuses `runForumMutation` and existing Topic route `headers()` for document/single-fetch privacy, no separate writer or permission key.

New `/:locale/bookmarks` GET route + path helper: session-guarded, own SQL list reader, strict paired `beforeSavedAt` canonical UTC millisecond timestamp plus bounded non-UUID topic ID, unknown/duplicate/malformed query → private 400; private 401 guest, 503 classified storage unavailable, unexpected propagated. DTO current-title/public-deleted-author/Help public location, ISO millisecond pagination cursor, no reads marking unread or notifications. `headers()` forces `private,no-store` retaining parent cookies. **Default page component is intentionally empty** pending the separately authorized UI/localization slice, not a delivered Bookmarks UI. Authenticated topic loader now separately reads private bookmark state, with typed storage outage yielding `unavailable` not unsaved; guest makes no bookmark read. Watch/editor state not shared.

Added `app/forum/topic-bookmark-action.test.ts` (29 strict action cases), `app/routes/bookmarks.test.ts` (19 list/cursor cases), extended `app/forum/public-authz-degradation.test.ts`, updated editor-recovery test reader stub and explicit route manifest assertion. Commits: `119053e69d34dc28b8e29de0de956ccc3c931efa` implementation, `a5b071c2459ad5eac5ac6752e5b4e252413a152d` feature tests, `e176b1d4484b813ad957d24fa63431fb547a1619` lint-compliant cursor control characters, `4c846036e2b3ad1b91d5ad6d035943ad9babd0e7` focused test fixtures/assertion repair.

New exact-head `checks` job ID `135010384846` **SUCCESS** (lint/typecheck/unit/build/UI preview/migration metadata/Drizzle schema parity). New exact-head `database` job ID `135010384260` **SUCCESS** (clean PG17 integration including Bookmarks DB tests). Other regression browser jobs at last check: 15/17 total checks success, `browser` and `sa08_browser` still running, no failures; do not assert whole 17/17 until checked. No new Bookmarks-specific connected Chromium acceptance yet; that is a later slice. Prior interim head `e176b1d...` unit job failed due missing `readTopicBookmark` in editor recovery fixture, route-manifest expectation and incorrect `Headers` equality in new test; fixed on current head. An unrelated Settings shell single-test failure on that previous head has not recurred on current `checks` success; no unrelated change made.

**STOP after this bounded route+loader slice per owner decomposition**; next separate slice on owner `...`: Bookmarks isolated UI/navigation and EN/RU/HE localization, then later real connected Chromium feature acceptance, followed by full stable head / coordinator review Миры and independent review Лёвы. No merge/deployment/docs closeout here.


## 2026-11-18 — Лира: Bookmarks UI, навигация и EN/RU/HE bounded slice (#346)

В Draft implementation PR #346 добавлен ровно локализованный UI-слой поверх уже принятого backend: `app/forum/topic-bookmark-control.tsx` с независимым от Watch/editor fetcher и подтверждённым Add/Remove; `app/forum/bookmarks-view.tsx` как приватный список с current title, public author/Help location, canonical topic start link, keyset Older/Newest и Remove через тот же topic POST; authenticated nav в `ForumShell`, отдельные поля в `TopicView`, полный EN/RU/HE catalog/manual values/reviewed fingerprints, адаптивный CSS и два focused UI test suites. Guest не получает навигацию; нет optimistic writes, повторов POST после неопределённого исхода, второго list writer, общей UI/UX перестройки, новых DB/RBAC/ACL/деплоя.

Implementation commit и verified exact head: `90791f7e4acc7b8c236ae8071c808f652ed63f26` (parent `4c846036e2b3ad1b91d5ad6d035943ad9babd0e7`), 11 файлов. GitHub exact-head check-runs: **17/17 completed success**, `checks` (lint, typecheck, unit tests, builds, migration metadata/schema parity), `database` (PostgreSQL 17) и все существующие regression browser workflows. Compare с parent показывает один commit ahead, 0 behind. Новый **Bookmarks-specific connected Chromium/Worker/Better Auth/PG17 acceptance не выполнялся** — текущий зелёный regression CI его не заменяет. PR остаётся Draft, не whole-PR review-ready.

**STOP по границе владельца** после UI-среза. Следующий отдельный slice только по `...`: Bookmarks-specific connected browser acceptance; затем STOP, отдельный stable-head CI/gate handoff Мире, coordinator whole-PR review, после PASS — Лёва independent technical review. Не начинать общую UI/UX, Mute/block, visibility, structure, #320, docs closeout, merge или production.


## 2026-11-18 — Лира: Bookmarks connected Chromium acceptance (#346)

**Scope slice complete; STOP.** В implementation PR #346 добавлены только `.github/workflows/topic-bookmarks-browser.yml`, `tests/browser/topic-bookmarks/check.py`, `tests/browser/topic-bookmarks/pg.mjs`. Job `bookmarks_browser` на отдельной PostgreSQL 17 `vico_bookmarks_browser_test` мигрирует schema, поднимает собранный Worker с локальными Better Auth session/sign-up/sign-in, выполняет реальный Chromium и загружает evidence (results.json + EN/RU/HE/RTL screenshots), без production credentials/rollout. Исходная браузерная проверка на commit `fd01fbac63fe535c5b1a460c1b5b37d5c7af4d00` PASS, но `checks` выявил подтверждённый lint дефект: в новом fixture отсутствовали Node imports `URL`/`console`. Исправлено только в `pg.mjs` следующим commit `8f24bd98fb2548bc9ec4b6f3433f40c1e72c7d65`.

На итоговом exact head `8f24bd98fb2548bc9ec4b6f3433f40c1e72c7d65` **18/18 check-runs success**, включая `checks` (lint/typecheck/tests/production build/preview/schema parity), `database` PostgreSQL 17, новый `bookmarks_browser` и все остальные regression browser jobs; failures/pending нет. Журнал повторного `bookmarks_browser` подтверждает все **10** групп: приватные guest document/data 401 и authenticated list; topic Add/reload/idempotent Add; guest/stale actor/invalid/mixed/missing topic/origin denials; closed/solved/confirmed-duplicate Help/deleted author projection; current title after real author edit and inert script text; another account/new Better Auth session; sign-out/sign-in account switch same browser; list Remove via canonical topic action without Watch/read/inbox changes; 57 rows equal millisecond keyset/page 50+7, removed anchor, foreign cursor, Remove+Add, empty older; RU and Hebrew narrow RTL topic/list with no horizontal overflow. No page JS errors or external requests in recorded run. Evidence artifact `topic-bookmarks-connected` verified on run `44379089155`, artifact id `14464010674`, size 288984 bytes, unexpired. Earlier run `44378598607` also browser PASS; final evidence belongs to final head.

Actual browser version from workflow is Playwright Python `1.62.0` using Ubuntu Chrome channel; Worker/Better Auth/PG17 are local CI, not production. This is **not** Stage 6/deployed acceptance, and final owner visual/full UI/UX pass is separate. No further product/schema/permission/translation changes, no merge, no production, no documentation PR. #346 stays Draft. Whole-PR review by Мира and independent review by Лёва have not run. **STOP** after this authorized acceptance slice. Next separate owner `...`: final stable exact-head/gate handoff, then coordinator whole-PR review by Мира, after PASS independent technical review by Лёва.


## 2026-11-18 — Лира: финальный stable-head/gate handoff Мире, Bookmarks #346

Последняя отдельная подзадача Лиры — без реализации или whole-PR self-review. Повторно fetched `AGENTS.md` из `main` до конца, актуальный #342 plan B1–B7 / scope-fit / workflow / communication, `PROJECT.md`, `PROJECT_STATE.md`, `ROADMAP.md`, `docs/UI_UX_PASS.md`. GitHub: #346 open Draft, exact head **`8f24bd98fb2548bc9ec4b6f3433f40c1e72c7d65`**, base SHA/current `main` `9c4639d23ca075c8bb92fbb909b96593d7bee127`, mergeable=true, compare `ahead=13,behind=0`, 39 changed files; никаких поздних implementation commits не выявлено. На этом же SHA API GitHub returned **18/18 check runs completed/success**, 0 pending/failures: `checks` (lint, typecheck, unit, build, UI preview build, migration metadata, Drizzle parity), `database` (PostgreSQL 17), `bookmarks_browser` и 15 прочих browser regressions. В #346 0 submitted reviews, 0 review threads, 0 PR discussion comments. Whole-PR review implementer **не выполняла**.

Connected evidence exact-head: [bookmarks_browser run 44379089155](https://github.com/iliya1947/vico-forum/actions/runs/44379089155), job `135066086875`, artifact `topic-bookmarks-connected` ID `14464010674` (created 2026-11-18T19:19:55Z, expires 2026-11-25T19:19:54Z). Лог подтверждает 10 групп real Worker + Better Auth + disposable PG17 + Chromium scenarios: private guest doc/data, Add/reload/session/account switch, invalid/forged/mixed/origin/404 denials, closed/solved/Help duplicate/deactivated author, title edit/XSS-text, Watch/inbox/read independence, 57-row tied-millisecond keyset, removed anchor, remove/re-add, RU/HE RTL narrow screenshots. Скриншоты и results.json — в artifact. Cloudflare external/production, Google OAuth, owner binding не проверялись; это repository/local-CI acceptance, не deployed acceptance.

**Gates — установить без подмены доказательств:** `ui-preview:build` PASS, но `ui-preview-pages.yml` для feature branch #346 не запускается (push main/chatgpt/ui-* или workflow_dispatch), поэтому отдельный Pages deploy/owner Bookmarks visual acceptance на exact head не подтверждены. `docs/UI_UX_PASS.md` MVP-first owner decision (2026-10-10): не задерживать bounded функциональные slices из-за косметики, финальная real-runtime product/visual acceptance обязательна перед public launch; в #342 обсуждении визуальная приёмка прошлых bounded functions отложена. В `AGENTS.md` formal whole-PR gate всё же упоминает owner visual acceptance и project documentation; current accepted workflow по #342 сохраняет permanent/current-state docs отдельным PR после implementation merge. **Мире нужно самостоятельно согласовать/классифицировать formal gate с этими действующими owner decisions до формального начала whole-PR review, не объявлять owner visual PASS без записи.** Никакой новый Pages deploy, owner visual approval, docs closeout или production gate Лира не выполняла.

Handoff: **следующий участник — Мира / ChatGPT-5.6 Sol**, coordinator whole-PR review #346 against accepted Bookmarks B1–B7, актуальный `main` и source-of-truth; первые действия — проверить current head и gate interpretation, затем whole-PR review на неизменном SHA (если gates позволяют). При confirmed current-scope findings вернуть Лире один пакет до запуска Codex. После coordinator PASS того же exact head — независимый reviewer **Лёва / Codex-6.1 Sol**. #346 остаётся Draft, #342 служебный и не merge. **Лира STOP.**


## 2026-11-18 — Bookmarks #346: coordinator finding package

Мира не дала PASS exact head `8f24bd98fb2548bc9ec4b6f3433f40c1e72c7d65` из-за одного текущего acceptance gap. Реализация по просмотренным schema/route/UI seams не признана дефектной; **не перепроектировать её без факта из race test**.

Закрыть принятую B6 concurrency/lifecycle матрицу real PostgreSQL tests: две реальные connection для Add×Add и Add×Remove в обоих commit orders; Bookmarks writer × AccountState deactivation в обоих порядках; forced rollback подтверждает отсутствие partial bookmark effect; topic deletion/FK cleanup и lock-order/deadlock boundary. Синхронизация должна ждать фактически захваченный row lock, а не использовать произвольный sleep/mock как доказательство. После исправлений/тестов — применимые exact-head checks, stable head и STOP Мире. Лёву до coordinator PASS не подключать.


## 2026-11-18 — Лира: исправление единственного finding Миры Bookmarks B6, повторный handoff

Прочитан актуальный `AGENTS.md` из `main` и свежий #342 workflow/communication: Мира действительно закончила coordinator review предыдущего head `8f24bd98fb2548bc9ec4b6f3433f40c1e72c7d65` и вернула Лире ровно один acceptance defect — недостаток B6 реальных PG concurrency/lifecycle тестов. Не кодовый confirmed race. Лира реализовала только этот пакет, не whole-PR self-review.

В #346 коммиты `82a23bdd34bdb0c03e72037e6ec07919e5c2d91b` (шесть real-PG tests) и `477ad6b1e5cf51bf94b3830e9ea4ea85d4e4fae5` (только исправление assertion для Drizzle `Failed query: commit` wrapper). Diff против coordinator-reviewed head затрагивает **только `tests/database/topic-bookmarks.test.ts`**, без изменения production/schema/ACL/UI. B6 real PostgreSQL 17 evidence: два отдельных native PG Client/Drizzle repository writer с действительными транзакциями, удержание после выполненного SQL и до COMMIT, отдельное наблюдение сервера `pg_stat_activity` + `pg_blocking_pids(waitingPid)` фактически подтверждает blocker PID и тип ожидания Lock; setTimeout 25ms используется лишь для polling state, не как доказательство. Тесты: Add×Add и Add×Remove в обоих порядках, идемпотентность даты; AccountState deactivation выигрывает до actor lock или ждёт уже принятого writer до COMMIT; forced before-COMMIT failure вызывает rollback без partial INSERT/DELETE; topic delete ждёт KEY SHARE, CASCADE удаляет закладку; parallel title revision writer сериализуется через actor mutex при совместимом topic KEY SHARE/NO KEY UPDATE в обоих порядках. **Все новые 6/6, все Bookmarks DB 10/10 PASS.** Кодовой race defect в этих проверенных сценариях не выявлен.

Первый `database` прогон `82a23b...` выявил только ошибку assert при обёртывании исключения Drizzle; исправлена вторым commit. На итоговом head `477ad6b1e5cf51bf94b3830e9ea4ea85d4e4fae5` первая попытка `database` прошла Bookmarks 10/10, но независимо зафейлила `tests/database/sa07-data-monitoring.test.ts` (`could not obtain lock on relation forum_posts` и повторные ошибки aborted transaction). Без изменения кода **повторён только database job на том же SHA**, SA07 не воспроизвёлся, весь DB suite, manifest/probes/Worker smokes PASS. GitHub exact-head check-runs на момент фиксации **18/18 completed success**, включая `checks` job `135101852255`, повторённый `database` job `135101848526` (CI run `44388191588`), `bookmarks_browser` job `135098376273`. 0 failures/pending. Compare прежнего head `8f24...` с новым: ahead 2, behind 0, changed only one feature test file. PR #346 остаётся Draft, mergeable=true.

**STOP Лиры после B6 bounded correction.** Следующий исполнитель: **Мира / ChatGPT-5.6 Sol** для нового coordinator whole-PR review текущего stable exact head `477ad6b1e5cf51bf94b3830e9ea4ea85d4e4fae5`. B6 proof independently validate; при подтверждённых defects единый пакет Лире, до PASS Лёву не запускать. После coordinator PASS — Лёва independent technical review same exact head. No deploy/merge/docs closeout/general UIUX.


## 2026-11-18 — Лира: B5-R1 current-scope correction #346, STOP → Мира

На service #342 head `2bba75046b829ffff662153f751867f3f4d9626e` прочитано последнее назначение Миры: P2 B5-R1, A older pagination URL сохраняется при смене actor на B через credential returnTo. Независимые findings Лёвы и Миры сопоставлены с `app/forum/bookmarks-view.tsx`, `app/routes/bookmarks.tsx`, `app/auth/auth-controls.tsx`, `app/auth/credential-path.ts`, `app/auth/credential-view.tsx`. Корень подтверждён: reader корректно own-filtered, но presentation page не сбрасывает cursor. Серверный B4 arbitrary initial deep link запрещать нельзя.

**Implementation #346 stable exact head:** `a3e6c0e63c99078ece89303592e1f24b2fe440fb`, один bounded commit поверх `477ad6b1e5cf51bf94b3830e9ea4ea85d4e4fae5`, только три файла: `app/forum/bookmarks-view.tsx`, `app/forum/bookmarks-view.test.tsx`, `tests/browser/topic-bookmarks/check.py`. Client-side `sessionStorage` текущей вкладки хранит исключительно последний увиденный actor id как UX marker, не серверную authority/credential/bookmark data. На первом просмотре не меняет исходный foreign/deleted cursor. При следующем Bookmarks render с другим authenticated `actorId` и `beforeSavedAt` выполняет `replace` на `/:locale/bookmarks`, записав нового actor. В обычной странице того же actor arbitrary cursor разрешён; никаких изменений в loader/SQL/topic POST/credential returnTo. Storage errors fail closed относительно приватности: выбор пользователя всегда server-side и `private,no-store`.

**Evidence:** компонентные regressions initial foreign keyset и A older→B с непустой новой first page. Реальный connected acceptance built Worker+Better Auth+PostgreSQL 17+Chromium расширен авторизованным sign-out/sign-in email через сохранённый `returnTo`: A older page (57 bookmarks, cursor) → sign out A → вход B (две собственные newest bookmark rows) → URL строго `/en/bookmarks`, B owns rows; затем ручной переход B к старому A cursor возвращает собственную пустую older-page без принудительного сброса. В connected log **11/11 BOOKMARKS_CONNECTED** checkpoints, 0 Traceback. Run `44398510026`, job `135134839582`, artifact `topic-bookmarks-connected` id `14471182990` (366169 bytes), скриншоты включают account-switch-first-page.

**CI:** exact SHA `a3e6c0e63c99078ece89303592e1f24b2fe440fb` — **18/18 check-runs completed/success**, 0 failed/pending; includes `checks` (lint/typecheck/unit/build/preview/schema), `database` PG17, `bookmarks_browser` Worker/Better Auth/PG17/Chromium и regression browsers. Implementation PR #346 open Draft, mergeable=true. No B6 rewrite, no product scope expansion, no merge/deploy/docs closeout. Лира не проводила whole-PR self-review.

**Handoff:** следующий участник — **Мира / ChatGPT-5.6 Sol** для нового coordinator whole-PR review exact head `a3e6c0e63c99078ece89303592e1f24b2fe440fb`; independently verify B5-R1 and B1–B7. При подтверждённых current-scope findings единый пакет Лире. Только после coordinator PASS — Лёва / Codex-6.1 Sol independent technical review на том же head. #342 служебный, не merge. **Лира STOP.**


## 2026-11-18 — Лира: Watch docs closeout PR #349, stable handoff Мире

По актуальному `AGENTS.md` и состоянию service #342 `dfe8709670f0a7aa004548a0353b274e1a396011` после merged Watch #345 и Bookmarks #346 выполнен **ровно один** bounded docs closeout — Watch, без implementation и без Bookmarks docs. Main `34ddf42985f6dc348e77d0dcc90e0aecc37fd15e`. Подтверждены #345 merged 2026-11-18 16:14:32 UTC, merge `9c4639d23ca075c8bb92fbb909b96593d7bee127`, технически review head `76c1c456557c614171a3b472758498795a668b9a` (Мира coordinator PASS / Лёва independent PASS), 17/17 implementation checks PASS, connected Watch built Worker/Better Auth/PG17/Chromium evidence.

Новый [docs PR #349](https://github.com/iliya1947/vico-forum/pull/349), branch `docs/watch-closeout-0068`, **Draft stable exact head `544906dd17517fcbb46cc63157e04fee9738f46d`**, base `34ddf42985f6dc348e77d0dcc90e0aecc37fd15e`, 1 commit / **3 files**: `PROJECT_STATE.md` добавляет factual Watch own-state/reply inbox и исправляет устаревший migration ceiling `0000–0067` → реальное `0000–0069` с пометкой Watch `0068`, Bookmarks `0069` (уже находятся в main; здесь нет детального Bookmarks closeout); `docs/PROJECT_HISTORY/PROJECT_HISTORY_30.md` сохраняет отдельный Watch implementation/CI/review/merge snapshot, `PROJECT_HISTORY.md` — навигационную запись. Docs не вводит/не меняет RBAC/Admin, code/schema/runtime, не утверждает production migration дальше `0020`, owner visual acceptance, real Google/Stage6. Не переписаны unrelated документы.

GitHub comparison main→docs head: ahead 1/behind 0, **modified 2 docs + 1 new history doc**; exact-head applicable [CI run 44406689177](https://github.com/iliya1947/vico-forum/actions/runs/44406689177) — **2/2 completed success** (`checks` job `135163681080`, `database` job `135163680723`), 0 failed/pending. Main и docs head повторно сверены после CI, без движения. Лира не проводила независимый docs whole-PR review своей документации.

**Handoff:** Лира **STOP**. Мира / ChatGPT-5.6 Sol — coordinator whole-PR review docs #349 на exact head `544906dd17517fcbb46cc63157e04fee9738f46d`, включая факт Watch, migration ceilings, history разделение, и границы; confirmed current-doc findings вернуть Лире одним пакетом. После coordinator PASS — независимая проверка по рабочему маршруту, затем merge только владельцем. **После merge #349** отдельный Bookmarks `0069` docs closeout (новый PR); до этого не активировать Mute/block. #342 служебный, не merge.


## 2026-11-19 — Лира: WATCH-DOC-1 correction, Watch docs PR #349, STOP Мире

Получено одно подтверждённое current-doc finding Миры по exact head `544906dd17517fcbb46cc63157e04fee9738f46d`: Watch semantics были только в history и служебном plan, отсутствовали в permanent SOT. Лира независимо сверила `PROJECT.md` текущего `main`, Watch section принятого `USER_ACTIONS_SERVICE_PLAN.md`, merged Watch implementation и docs files: отдельного Watch/notifications SOT в main нет, поэтому требуется короткий блок в `PROJECT.md`; новый domain/technical architecture не нужен.

**Correction commit `aa6584c6d600d807ebed9171adbde365b918b290`** в существующий Draft docs [PR #349](https://github.com/iliya1947/vico-forum/pull/349): добавлен раздел `Подписка на темы (Watch)` только в `PROJECT.md` (19 новых строк). Постоянный продуктовый контракт: явный Watch/Unwatch своей темы только authenticated active actor; никакого auto-watch и нового RBAC permission; обычные reply-notifications для будущих ответов других участников в existing inbox, дедупликация с author/direct-parent/mention paths; Unwatch prospective и не удаляет уже созданные notices; нет изменений read-state или bookmark semantics. SQL locks, CI/PR/history в permanent SOT не перенесены. Предыдущие `PROJECT_STATE.md` (current main repository ceiling `0069`), `PROJECT_HISTORY_30.md` и index не изменялись. Нет code/schema/runtime/RBAC/Admin/Stage6/visual modifications.

**Evidence:** GitHub сравнение первого reviewed head `544906dd...` → нового `aa6584c6d600d807ebed9171adbde365b918b290` = 1 commit, only `PROJECT.md`; docs PR #349 содержит всего 4 документа, base/main `34ddf42985f6dc348e77d0dcc90e0aecc37fd15e` unchanged. Exact-head [CI run 44412018558](https://github.com/iliya1947/vico-forum/actions/runs/44412018558): **2/2 completed success** `checks` job `135182394989` (lint/typecheck/unit/build etc.) и PostgreSQL `database` job `135182393371`; 0 failed/pending. PR #349 по-прежнему Draft/open, merge не выполнялся.

**STOP Лиры**. Следующий исполнитель **Мира / ChatGPT-5.6 Sol**: новый coordinator whole-PR review Watch docs #349 на `aa6584c6d600d807ebed9171adbde365b918b290`; подтвердить WATCH-DOC-1 и весь docs scope, при confirmed defects вернуть Лире единым пакетом. До coordinator PASS независимый reviewer не подключается; после review cycle merge — только владелец. Далее отдельный Bookmarks docs closeout 0069, затем Mute/block. Служебный #342 не merge; #300 не использовать.


## 2026-11-19 — Лира: Bookmarks docs closeout PR #350, stable handoff Мире

По действующему `AGENTS.md`, служебному `.github/workflow.md` и принятым B1–B7 планам после фактического merge Watch docs #349 в `main` `405ab97116c5be750fb9c1d447431988802bdbb5` выполнен **только Bookmarks docs closeout** merged #346 / migration 0069. Новый [Draft docs PR #350](https://github.com/iliya1947/vico-forum/pull/350), branch `docs/bookmarks-closeout-0069`, base/current main `405ab97116c5be750fb9c1d447431988802bdbb5`, **stable exact head `446e4cc893160efc30392bfa43f03f5882823021`**, один commit, **4 Markdown files**:
1. `PROJECT.md` — постоянный Bookmarks product contract (auth active own-state, темы как target, persistence/list, confirmed Add/Remove/idempotence, current title, per-account privacy, pagination и независимость от Watch/read/inbox); narrower Bookmark SOT в main не обнаружен.
2. `PROJECT_STATE.md` — одна factual строка про реализованные Bookmarks. Существующий правильный repository migration ceiling `0000–0069` не менялся; external accepted evidence осталась `0000–0020`.
3. `docs/PROJECT_HISTORY/PROJECT_HISTORY_31.md` — отдельный implementation #346 snapshot: B1–B7, merge `2026-11-18 21:43:51 UTC`, reviewed exact head `a3e6c0e63c99078ece89303592e1f24b2fe440fb`, merge `34ddf42985f6dc348e77d0dcc90e0aecc37fd15e`, две corrections (B6 real PG17 acceptance, B5-R1 same-browser A older→B newest), финальные Mira coordinator PASS/Leva independent PASS, 18/18 implementation CI и connected `bookmarks_browser` 11 checkpoints.
4. `docs/PROJECT_HISTORY/PROJECT_HISTORY.md` — новый index entry #31.

Сверены merged #346 schema `0069_topic_bookmarks`, actual `app/routes/bookmarks.tsx`, `bookmarks-view.tsx`, `topic-bookmark-control.tsx`, GitHub merge/CI, accepted `USER_ACTIONS_SERVICE_PLAN.md`, Watch SOT/current docs и history convention. Публичный target — тема; никаких post-level bookmarks или новых RBAC/Admin. SQL/server-owned filter для actor сохраняется в реализации; docs не меняют code/schema/runtime, deployment/Stage6 evidence, owner visual acceptance. Ссылки в новых документах ведут на существующие project/history/PR пути.

**Docs PR #350 exact-head checks: 2/2 completed success**, `checks` job `135418343227` и `database` job `135418342868`, [run 44482643570](https://github.com/iliya1947/vico-forum/actions/runs/44482643570); 0 failures/pending. Compare base→head: ahead 1/behind 0, только четыре Markdown-документа. PR #350 остаётся Draft; merge и deploy не выполнялись. Лира не выполняла independent whole-PR review собственной документации.

**Лира STOP.** Следующий исполнитель — **Мира / ChatGPT-5.6 Sol** для нового coordinator whole-PR docs review #350 на stable exact head `446e4cc893160efc30392bfa43f03f5882823021`. При подтверждённых current-doc findings — Лире одним пакетом. Только после Mira PASS — independent docs reviewer same head, затем owner merge. До merge #350 Mute/block implementation не открывать. #342 служебный, не merge; #300 не использовать.


## 2026-11-19 — Лира: Mute/block #351 part 1/4 (persistence+own-state), локальный STOP

Выполнена **первая из четырёх** заранее объявленных частей единого bounded implementation. Base main `9eae385571bf99e073df46f8541f7514c9626a29`; принятый Mute/block M1–M7 и current-main Watch/Bookmarks/AccountState/notification/schema/ACL seams сверены. Новый [Draft PR #351](https://github.com/iliya1947/vico-forum/pull/351), branch `feature/personal-mute-block`, **exact head `9c0216ddc96211dc889babf85d53d3bec4a39f7c`** (3 commits / 16 changed files), behind main 0. Ни code второй части, ни presentation/UI ещё нет.

Deliverables: forward migration `0070_personal_filters` с `forum_topic_mutes` own pairs, `forum_user_blocks` directional own pairs + self CHECK, `forum_post_notification_suppressions` recipient/post PK; все FK cascade, Created_at server clock, keyset/index + FK cleanup indexes. `db/schema.ts`, Drizzle `0070_snapshot`/`_journal`, structural production-schema manifest, exact web runtime SELECT/INSERT/DELETE own stores и SELECT/INSERT receipts. `DrizzleForumRepository` + `ForumService` + `HyperdriveForumReader/Writer`: explicit idempotent Mute ON/OFF, Block ON/OFF, own-state reads; target FK KEY SHARE перед active actor AccountState admission в одной transaction. Self-block отвергается; inactive target допускается. Privacy авторизации обеспечивается будущими route boundaries: **эти reader/writer methods сами по себе ещё не complete end-to-end feature**.

Начальные real PG17 tests `tests/database/personal-filters.test.ts` покрывают own-state/idempotence, inactive actor, missing target, self-check, независимость Watch/Bookmarks/read-state, suppression receipt PK/FK; M3 production suppression пока не подключён. CI после первого commit выявил только typed mock gaps и устаревшие table-count baseline (71→74), затем misassert sync self-block. Точечные fixes одним commit. На следующем head `database` выявил manifest parity mismatch: PostgreSQL обрезал исходное 65-byte FK имя до 63, а catalog CHECK columns order отличался. Исправлены имя нового FK в migration + Drizzle snapshot и manifest, и CHECK-column order, без изменений несвязанной схемы. Все corrections внутри текущего new migration.

Итоговый stable exact head `9c0216ddc96211dc889babf85d53d3bec4a39f7c`: [CI run](https://github.com/iliya1947/vico-forum/actions) — **16/16 check-runs completed success**, включая `checks` (lint/typecheck/unit/build), `database` (clean PostgreSQL17 migration/integration, full schema manifest parity, ACL/probes, Worker smoke) и все существующие Chromium regression jobs; 0 fail/pending. Final Mute/block connected browser **пока не создан и не выполнялся**. Full implementation/review PASS **не заявляется**, PR Draft/no merge.

**STOP Лиры после part 1/4**, как требует current owner decomposition. Следующий этап при `...`: **part 2/4 — suppression M5/M3 + viewer-only Block collapse**, в этом же PR, затем отдельные part 3/4 routes/UI и part 4/4 final acceptance. После полного implementation PR и exact-head evidence — Мира coordinator whole-PR, далее Лёва independent technical review. #342 служебный, не merge.


## 2026-11-19 — Лира: Mute/block #351 part 2/4 (M5/M3 suppression + viewer-only collapse), локальный STOP

Вторую часть выполнено в существующем Draft PR #351, branch `feature/personal-mute-block`, base main `9eae385571bf99e073df46f8541f7514c9626a29`. **Stable exact head `e5989f0830a21fff5de100d3045b935e68be1524`**. Part 1 migration 0070/own-state сохранена; новые миграции/schema/RBAC и несвязанные изменения не внесены.

1. `db/personal-notification-policy.ts`: set-based ordinary candidate decision в одном SQL READ COMMITTED snapshot для Mute темы и directional Block publication actor; suppression receipt per (recipient,post) + видимый inbox INSERT внутри одной publication transaction. Reply/Watch/author/parent и published mentions (initial topic/reply/edited post) используют общий helper, reply-before-mention, suppression дедупликация/без backfill, source actor server-derived; complaint notifications, existing visible inbox/read_at, Watch/Bookmarks/read-state не менялись. При SQL failure publication rollback.
2. `DrizzleForumRepository`/`HyperdriveForumReader`: set-based выборка только заблокированных авторов текущей темы, current session actor на route loader. Authenticated block-read unavailable даёт controlled `503` с `private, no-store`, не отображает тела будто Filter OFF; guest private read не выполняет. `TopicView` сохраняет post ids/numbers/anchors/direct parent/solution; скрывает body/inline media/attachments и translation/quote controls до явного reveal без Unblock. Reveal сбрасывается при actor/topic/matches смене; stale A→B/guest→auth snapshot fail-closed. EN/RU/HE placeholders.
3. Новые real-PG тесты: Mute для author/parent/Watch/mention, Block direction и independent C reply, own topic block matches, consumed suppressed old mention после Unmute и нескольких published edits, fresh post after Unmute. UI/route: collapse→reveal, attachments not mounted, anchor сохранён, private503, guest isolation. Существующие исторические DB fixture subsets дополнены только необходимой migration 0070, typed/route mocks обновлены. Race test deterministic pauseQuery синхронизирован с CTE statement; production lock graph не менялся. Проверены и устранены возникавшие CI failures: initial missing reader mocks/fixture tables, test SQL barrier, stale snapshot detection for view-only test stubs.
4. **GitHub exact-head CI: 13/13 workflow runs completed SUCCESS** на `e5989f0830a21fff5de100d3045b935e68be1524`; workflow `CI` содержит оба успешных jobs `checks` (lint/typecheck/unit/build) и `database` (full clean PG17 suite/schema parity/ACL + Worker smokes); остальные existing connected Chromium acceptance PASS. Run: https://github.com/iliya1947/vico-forum/actions/runs/44499837125. Dedicated connected Mute/block browser acceptance **не выполнялся** — часть 4/4.

**Лира STOP после part 2/4.** Следующая работа по `...`: **part 3/4 M6 canonical topic/profile actions, private `/:locale/filters`, controls/undo and EN/RU/HE** в том же #351, затем отдельный STOP. Part 4/4 — final DB/concurrency/Worker+Chromium Mute/block acceptance. Coordinator Mira/independent Leva reviews только после whole implementation/final CI. #351 Draft/no merge, #342 служебный/no merge; #300/Stage6/visibility moderation/general UI/UX не открывать.


## 2026-11-19 — Лира: Mute/block #351 part 3/4, исправленная декомпозиция, итоговый STOP

По прямой коррекции владельца part 3/4 разделена на independently checkable subresults; ранее выполненные блоки не повторяются и новая реализация не начата:
1. **3a** M6 canonical `setTopicMute` topic POST, `setUserBlock` public profile POST, strict authoritative actor/route-target/boolean/intent boundaries, own-state/private keyset readers with actor-scoped 50+lookahead.
2. **3b** Isolated personal UI controls in topic and public profile; matching fetcher ACK, no optimistic success, explicit refresh on uncertain writes.
3. **3c** `/:locale/filters` private actor-bound GET lists, topic/user tabs, ISO+target cursor, own undo via canonical actions, account switch isolation, navigation, EN/RU/HE resources.
4. **3d** Route/component/fetcher tests; adjusted existing mocks/route catalogue/profile-privileged fixtures; Watch CSS selector collision diagnosed from connected Chromium failures and fixed by isolating personal-filter container/status selectors; Watch business logic untouched.
5. **3e — verification**: **exact head `a2b077fd2059d9e6c189b35d008d81d23ed6d4ba`**, **15/15 GitHub workflow runs completed SUCCESS**, including `CI` jobs `checks` and `database` both PASS, clean PostgreSQL 17, Worker smokes, existing Watch/Bookmarks/SA-03/SA-04/SA-08/AP-10 connected Chromium. https://github.com/iliya1947/vico-forum/actions/runs/44509253542

**Важно:** dedicated connected Mute/block acceptance из M7 **ещё не выполнялась**; реальные targeted concurrency/atomicity races тоже относятся к part 4. All current changes remain inside Draft implementation PR #351; no merge, no whole-PR review.

**Лира STOP после part 3/4.** Part 4 заранее дробится на 3 независимых bounded subtasks с явной командой между ними: **4a** focused real PG17 concurrency/lifecycle/atomicity tests; **4b** real Worker/Better Auth/PG17/Chromium Mute/block connected acceptance; **4c** final exact-head CI/ACL/manifest and handoff. Начать 4a только по следующему `...`; остановиться после её результата и checkpoint, затем аналогично 4b и 4c. Мира/Лёва пока не reviewer. #342 — служебный, #300/Stage6/visibility moderation/overall UI/UX не открывать.


## 2026-11-19 — Лира: 4a micro-slicing по команде владельца, STOP

В 4a добавлен новый `tests/database/personal-filters-concurrency.test.ts` (27 real PostgreSQL 17 тестов: M3 statement-order initial/reply/edit, M4 preference/deactivation actor locks, M5 receipt/rollback/replay, attachment late failure). До exact head `247e928bd845286e1946c77d51bbd162a08a4cb2` **1476/1476 PostgreSQL тестов прошли**, однако `database` job завершился FAIL вследствие unhandled rejection из ранее существовавшего `tests/database/topic-watch.test.ts` (отклонение actor admission до позднего `expect(...).rejects`). Исправлена только ранняя установка rejection assertion в Watch test; текущий implementation exact head `83b32eb364d74a2fd85377dbc907f7723254edf4` **не имеет подтверждённого полного CI PASS** на момент checkpoint. No production/schema/UI changes в 4a.

По прямому требованию владельца дальнейшая работа разделена на микроэтапы 4a.1–4a.9, явный STOP после каждого; уже написанные тесты 4a.1–4a.6 не задним числом объявлены отдельно принятыми. **Следующий единственный шаг 4a.7** — verify `database` job на `83b32eb364d74a2fd85377dbc907f7723254edf4` (PG17/test/unhandled-clean), при необходимости только локальная коррекция + повторный PG verify, checkpoint STOP. Отдельно по следующим `...`: **4a.8** exact-head `checks`/regression workflows, STOP; **4a.9** служебный closeout 4a и handoff 4b, STOP. Не начинать 4b/4c без явного продолжения.


## 2026-11-19 — Лира: 4a.7 isolated real-PG acceptance PASS, STOP

Проверен текущий exact head Draft implementation #351 `83b32eb364d74a2fd85377dbc907f7723254edf4`, CI https://github.com/iliya1947/vico-forum/actions/runs/44522424656, job `database` id `135554174396`, **completed SUCCESS**. Лог Vitest: **109/109 files, 1476/1476 tests PASS**, в том числе `tests/database/personal-filters-concurrency.test.ts` **27/27 PASS** (READ COMMITTED snapshot order/actor mutex/deactivation/receipt and attachment rollback). Unhandled Errors/Unhandled Rejection **отсутствуют**. Ранее flaking Watch race test не оставил необработанного отклонения, production/schema/UI files не изменялись, новых commits в 4a.7 нет.

**4a.7 закрыта; STOP.** Полный CI и aggregate workflows **не** объявляются зелёными: `SA07 Background Localization Files Data and Integrations connected Chromium acceptance` на том же head завершился **failure**, фактическая причина не изучалась в узком scope 4a.7. Следующий отдельный шаг **4a.8 по `...`** — проверить `checks`, SA07 и остальные existing regressions на exact head, определить relevance/реальную причину SA07 и при необходимости исправить только подтверждённую current-scope причину, затем STOP. Потом только по новой команде **4a.9** — служебный closeout/4b handoff, STOP. Нет перехода к 4b/4c.


## 2026-11-19 — Лира: 4a.8 CI/regression verification, STOP

- PR #351 stable exact head `83b32eb364d74a2fd85377dbc907f7723254edf4` не изменялся в 4a.8. Сравнение с предыдущим зелёным `a2b077fd2059d9e6c189b35d008d81d23ed6d4ba` затрагивает только новый PostgreSQL concurrency test и существующий Watch race test.
- GitHub run `44522424656`: `checks` job `135554174824` SUCCESS, `database` job `135554174396` SUCCESS (109/109 PG files, 1476/1476 tests, 27/27 new focused, no unhandled errors).
- SA07 first job `135554174007` FAILED: after successful document/locale tests one Integrations `.data` GET returned 503 after ~8.25 s, expected 200. Exact underlying PostgreSQL/availability cause unverified.
- Re-ran only SA07 failed job at same exact head; new job `135564876373` SUCCESS, `SA07-B1-L-F-D-I-connected-pass` in full log. Current GitHub workflow set: **15/15 workflow SUCCESS after retry**; production/SA07 code not modified or tests weakened. Initial failure not erased from history.
- No confirmed Mute/block current-scope defect from SA07. Dedicated Mute/block browser acceptance is still part 4b; it has not been run.

**Лира STOP после 4a.8.** Следующий только после отдельного `...`: 4a.9 service evidence/handoff. Никакого автоматического 4b/4c/review/merge.


## 2026-11-19 — Лира: 4a.9 route clarification, factual corrections и микроэтапы 4b — STOP

Мира уже зафиксировала закрытие 4a.9 в service branch. По прямому текущему `...` выполнена только проверка/уточнение handoff; код PR #351 не менялся, 4b не начата.

**Уточнение evidence:** GitHub exact-head API показывает **15/15 workflow SUCCESS**, а не 19/19. В `CI` отдельно два SUCCESS jobs — `checks`/`database`. Достоверно: 27/27 новых PostgreSQL races и 1476/1476 full PG tests PASS; первый SA07 job дал classified 503 на Integrations data, повтор на том же head SUCCESS без code changes. **Первопричина исходного 503 не проверена**; timeout/availability классификация route не доказывает точный источник отказа. Это не подтверждённый current-scope Mute/block defect. В permanent/common state не записывать «19/19» или доказанный timeout.

**Декомпозиция для следующего исполнителя (Лира):** 4b разделена на **4b.1–4b.11** по M7 (harness; Mute fanout; Block direction; collapse/reveal; no-backfill; own filters; privacy/actor/errors; independence; RTL/a11y; focused browser acceptance; final CI/handoff). Каждый микрошаг — отдельная команда `...`, проверяемый результат, запись в #342 и STOP. Первым разрешён только **4b.1: isolated real Worker/Better Auth/PG17/Chromium harness + minimal smoke**. Ни 4b.2, ни 4c, ни reviews автоматически не запускать. Точный operational контракт — `.github/workflow.md`.

**Лира STOP после 4a.9**; #351 остаётся Draft на `83b32eb364d74a2fd85377dbc907f7723254edf4` без изменений, #342 служебный/no merge.


## 2026-11-19 — Лира: 4b.1 dedicated connected harness + minimal smoke PASS, STOP

**Scope exact:** собственный изолированный Mute/Block Worker/Better Auth/PostgreSQL 17/Chromium harness; никаких fanout, Mute/Unmute write, Block/Unblock write, no-backfill, collapse/reveal и pagination/a11y acceptance пока не утверждать.

**Implementation** Draft PR #351, exact head `e93e64a55095b1d56eb65aa9c11ffd314f4b07e9`. Три добавленных test-only files:
- `.github/workflows/personal-filters-browser.yml`: самодостаточный pull_request workflow, disposable `vico_filters_browser_test` в PostgreSQL 17, Drizzle migrations, pnpm build, actual Worker preview `127.0.0.1:4242`, Better Auth local .dev.vars и pinned Playwright Chromium, cleanup + JSON artifact.
- `tests/browser/personal-filters/pg.mjs`: CI/loopback/exact-db guard, dedicated PG fixture/SQL inspection process and one ordinary published topic.
- `tests/browser/personal-filters/check.py`: real Better Auth sign-ups for distinct author/viewer, guest, private `/en/filters` and `.data` statuses/no-store, Chromium page + Mute Off/topic + Block Off/public profile, guest public topic, no implicit filter rows or browser console/external requests.

**Evidence:** `Personal Mute/Block connected acceptance` run `44529730188`, job `135579549049` concluded **SUCCESS** at exact `e93e64a55095b1d56eb65aa9c11ffd314f4b07e9`. Job log contains all 4 `FILTERS_CONNECTED` smoke markers. https://github.com/iliya1947/vico-forum/actions/runs/44529730188 . No production/schema/UI changes for 4b.1; other existing CI runs were still executing at checkpoint, do NOT claim full exact-head green. Dedicated Mute/Block end-to-end functionality and M7 matrix remain 4b.2–4b.11.

**Лира STOP после 4b.1.** Following explicit `...`: **only 4b.2** — Topic Mute/Unmute + ordinary notification paths (Watch/author/parent/mention) using this harness, measured via real Worker and PG; checkpoint and STOP. No 4b.3/4c/review/merge. An independent Watch audit has separate workstream and is not modified here.


## 2026-11-19 — Лира: 4b.2 real connected Mute/Unmute fanout PASS, STOP

**Exact implementation head** `a6dadd175ff58bbe24f7edb60e99f1dc2e1aab52`; Draft PR #351. Only test fixtures `tests/browser/personal-filters/check.py` and `pg.mjs` changed; production/schema/routes/UI/Watch code untouched. Fixture creates a second independent topic under same author; browser test uses separate real Better Auth sessions for topic author, parent-post author, Watch subscriber, mentioned recipient and fresh reply publishers (actual 5-second write cooldown preserved).

**Dedicated acceptance:** Personal Mute/Block connected acceptance GitHub run `44531763113`, job `135586618085`, **completed SUCCESS** with all 8 `FILTERS_CONNECTED` markers (4 previous smoke, 4 new target checks):
1. Worker publishes parent reply, Watch subscriber subscribes to both topics. Before Mute a real reply with explicit user mention delivers exact ordinary `reply` to topic author, parent author, Watch subscriber, and `mention` to mentioned recipient; no suppression receipt.
2. Watch subscriber toggles topic Mute using Chromium fetcher POST; three other recipients set own Mute through their real authenticated canonical topic HTTP action. All four distinct Mute pairs persisted; Watch rows on both topics remain.
3. A fresh publisher posts a reply to muted topic, parent + mention candidate source: **no visible notification for any of four**, exact 4 suppression receipt pairs. Separate unaffected topic still delivers to its author, Watch subscriber, mentioned recipient, with zero receipts.
4. Watch subscriber Unmutes through Chromium; other three through authenticated canonical actions. Another fresh reply after Unmute delivers to all 4 original recipients. Previously suppressed post does **not** backfill, previously delivered row remains, receipts stay; Watch rows unaffected and UI OFF after reload.

No unrelated Watch audit corrections or production work in this step. Do not infer 4b.3 Block, 4b.4 collapse/reveal, 4b.5 initial-topic/edit replay, 4b.6 private list/pagination, 4b.7 privacy, 4b.8 complaints, 4b.9 RTL from this PASS. Other current-head workflows were still pending at checkpoint; this microstep asserts only dedicated job PASS.

**Лира STOP после 4b.2.** Next separate `...` = **4b.3 directional Block ordinary notification acceptance** only, service checkpoint and STOP; no 4b.4/4c/review/merge. Watch/Bookmarks audit workstream unchanged.

## 2026-11-19 — Лира: 4b.3 directional Block ordinary notifications PASS, STOP

**Scope:** только 4b.3 real Worker + Better Auth + PostgreSQL 17 + Chromium. Implementation Draft PR #351 exact head `15e6d82efd6523292af75c520db2f8b6acb761a9`. Изменён только `tests/browser/personal-filters/check.py`, production/schema/Watch/Bookmarks/UI не менялись.

**Dedicated evidence:** [Personal Mute/Block connected acceptance run 44535910727](https://github.com/iliya1947/vico-forum/actions/runs/44535910727), job `135601125254` **completed SUCCESS**. Лог подтверждает 12/12 `FILTERS_CONNECTED` markers: прежние 4b.1/4b.2 восемь и четыре новых 4b.3:
1. Chromium A blocks B from canonical public profile: A→B row persisted, B→A remains absent.
2. A's ordinary reply in B's topic still notifies B even though A blocks B (direction not reversed).
3. B's real reply under A plus explicit @A is suppressed for A; PG17 records one suppression receipt, no visible notice.
4. Independent C reply in B's topic delivers ordinary notices to A and B; original Watch subscriptions remain.

No need for production correction established in this bounded test. This is **not** 4b.4 blocked-message collapse/reveal, 4b.5 topic-create/edit mention consumption, 4b.6–4b.11, 4c or PR review/merge. Full exact-head workflows are not asserted complete; dedicated job is the verified gate.

**Лира STOP после 4b.3.** Следующее отдельное `...` активирует **только 4b.4 — viewer-only Block TopicView collapse/reveal и anchors/root/parent/best answer**, затем checkpoint STOP перед 4b.5. #351 Draft, #342 service-only/no merge. Отложенные WATCH-AUDIT-1 и BOOKMARKS-AUDIT-1/2 не затронуты.

## 2026-11-19 — Лира: 4b.4 connected Block TopicView collapse/reveal PASS; STOP

**Scope:** viewer-only Block presentation for root, best answer, parent/child relationships, stable anchors and attachments. Draft implementation #351 exact head `691749a575b8d41ddc508644e31768c9162a860d` (one test-only commit; only `tests/browser/personal-filters/check.py` changed). No production/schema/locale/Watch/Bookmarks changes.

**Dedicated evidence:** [Personal Mute/Block connected acceptance run 44538241728](https://github.com/iliya1947/vico-forum/actions/runs/44538241728), job `135609317404` **completed SUCCESS**. Job logs show **17/17 `FILTERS_CONNECTED` markers**, 12 retained 4b.1–4b.3 and five new 4b.4:
1. B selects an actual B reply as best answer through Worker HTTP; two attachment *metadata-only* references inserted into disposable PostgreSQL 17 for B root and best answer. No R2 object or file-download verification is claimed.
2. A (blocks B) sees B root and best answer with collapsed body and no attachments; A and independent C messages remain visible.
3. Anchors and original/best/parent/child relations survive collapse, including best-answer jump, parents and direct child permalink; Chromium anchor navigation works while collapsed.
4. Guest sees B original root/reply bodies and attachment links; Block does not redact public content.
5. Per-post Reveal restores B bodies and attachment links independently, without Unblock; reload collapses again, PG directional Block row retained.

**4b.4 COMPLETE; Лира STOP.** Next separate `...` = **ONLY 4b.5** prospective suppression (initial-topic/edit mentions, old receipt/no-backfill, replay/new posts), checkpoint STOP before 4b.6. Dedicated connected gate PASS; full exact-head CI workflows not declared complete. 4c, review and merge not activated. #351 Draft; #342 service-only/no merge. Independent audit/corrective workstream untouched.

## 2026-11-19 — Лира: 4b.5 prospective suppression and publication replay PASS, STOP

**Bounded scope:** real Worker/Better Auth/PostgreSQL 17/Chromium acceptance of first-processed post–recipient suppression, initial-topic/edit mentions, no backfill after Unmute/Unblock, matching replay and fresh publications. Draft implementation #351 stable exact head `929d839439298c6870bef6a29a924784ed38e7de`. Only `tests/browser/personal-filters/check.py` changed (two test-only commits `087456dc6f8e18c5f8e7f209e405d4ab03e81076` and `929d839439298c6870bef6a29a924784ed38e7de`); no production/schema/UI changes.

**Final exact-head dedicated gate:** [run 44540202818](https://github.com/iliya1947/vico-forum/actions/runs/44540202818), job `135616158626` **completed SUCCESS**, 25/25 `FILTERS_CONNECTED` markers (17 prior + 8 new). Verified:
1. A blocks new publication actor; real section HTTP creates topic whose initial @A is suppressed and exactly one receipt exists; identical publication replay returns original topic without new post/notice.
2. A Unblocks actor. Replaying old create and editing initial post with unchanged / removed / re-added @A never backfills consumed pair.
3. Previously muted ordinary reply remains suppressed after Unmute and unrelated published edit; removing and re-adding old mention does not revive it.
4. A never-selected mention recipient added in a later edit receives exactly one new mention while old suppressed pairs retain receipts and existing visible rows remain intact.
5. Matching edit operation replay creates no new revision/notice/receipt.
6. Fresh reply after Unmute again delivers all four ordinary sources, and a fresh post from formerly blocked actor after Unblock notifies A without reviving the old suppressed notice.

**Classified first-run test harness failure:** run `44539874421`, job `135615022366` failed *before* new publication assertions because test called `.json()` on the valid ordinary profile POST HTML response. Removed response-shape assumption; confirmed persisted own Block pair in real PG. This was a test assertion error; no evidence of production defect. Retest on fresh exact head SUCCESS.

Dedicated 4b.5 acceptance verified; no claim that all other exact-head workflows completed. Do not enter 4b.6–4b.11, 4c or review/merge now. Separate owner-ordered WATCH/BOOKMARKS corrections remain deferred until after Mute/block.

**Лира STOP после 4b.5.** Next distinct `...` = **ONLY 4b.6 — private `/:locale/filters`: own list, pagination, undo/reload, topic/profile controls**, then checkpoint and STOP before 4b.7. #351 Draft; #342 service-only/no merge.

## 2026-11-19 — Лира: 4b.6 private Mute/Block lists, Undo and pagination PASS; STOP

**Bounded scope:** real Worker/Better Auth/PostgreSQL 17/Chromium acceptance for private `/:locale/filters` own lists and two tabs, topic/profile canonical controls, persistent Undo/Reload, keyset pagination and another authenticated viewer. Draft implementation PR #351 exact head `cf9b166c27c72b3f3ed44d172cfe08678fdf9707`. Only `tests/browser/personal-filters/pg.mjs` and `tests/browser/personal-filters/check.py` changed; fixture and acceptance only. No production/schema/UI/Watch/Bookmarks code changes.

**Dedicated evidence:** [Personal Mute/Block connected acceptance run 44541827642](https://github.com/iliya1947/vico-forum/actions/runs/44541827642), job `135621886569` **completed SUCCESS** on exact SHA. Job log shows **31/31 `FILTERS_CONNECTED` markers**, prior 25 4b.1–4b.5 plus six new 4b.6:
1. A uses actual Chromium topic Mute and public profile Block; own DB pairs appear in distinct private list tabs.
2. Both list Undo actions issue canonical HTTP POST, hide confirmed row, persist OFF through reload, and source controls return to OFF.
3. Disposable PG fixture creates 50 additional public topics and account targets with own Mute/Block pairs. Combined with one actual UI pair each tab gives **51** Mute and **51** Block entries. Fixture inserts only test data; it is not an alternative application mutation writer.
4. On both tabs 50 rows on first page and one older row; Older/Newest links preserve cursor/tab, aggregated distinct names match exactly expected 51, no overlap/omission.
5. Independently signed-in B sees empty own list on both tabs, not A's records.

Dedicated 4b.6 gate verified; no claim all exact-head workflows complete. No scope extension to 4b.7–4b.11, 4c, whole-PR review, merge or owner-ordered WATCH/BOOKMARKS corrections.

**Лира STOP после 4b.6.** Next separate `...` = **ONLY 4b.7 — privacy/errors: guest, actor switch, no reverse graph, no-store, unavailable and late responses**, then checkpoint STOP before 4b.8. #351 Draft; #342 service-only/no merge.

## 2026-11-19 — Лира: 4b.7 privacy/errors PASS; STOP

**Scope:** real Worker/Better Auth/PG17/Chromium for guest/no-store/strict query/stale actor/reverse Block graph/same-browser account switch. Draft PR #351 exact head `04514f993b63c8eba9dc5e1439c9df5f238f408a`. Only test files `tests/browser/personal-filters/{check.py,pg.mjs}` and `app/forum/personal-filter-control.test.tsx` changed; production/schema/UI untouched.

**Dedicated:** [run 44545030002](https://github.com/iliya1947/vico-forum/actions/runs/44545030002), job `135633196353` **SUCCESS**, **35/35 `FILTERS_CONNECTED` markers** (31 prior + four new):
1. Guest private document and .data list 401; guest Mute/Block POST 401/no writes, public topic and profile remain 200.
2. Authenticated private list/topic/profile document and .data `private,no-store`; invalid/foreign query 400 and stale actor POST 409/no state mutation.
3. Blocked B cannot learn reverse A→B graph via own private list or A's public profile single-fetch.
4. Same Chromium BrowserContext real Better Auth cookie switch A→B resets old cursor to B's first own page; A rows remain invisible across reload.

**Typed 503/late ACK:** current focused route tests cover private 503 vs empty state; updated personal-filter-control unit cases cover Block typed503 as unknown, explicit GET refresh without POST replay, and late A response not transferring to B for Mute or Block. No actual PostgreSQL outage was injected in connected run; distinguish this limitation from runtime evidence.

**Exact-head CI:** [run 44545029770](https://github.com/iliya1947/vico-forum/actions/runs/44545029770), `database` job `135633192599` and `checks` job `135633192066` **SUCCESS**, including lint, typecheck, tests, build. Other PR workflows are not asserted complete. PG fixture previously introduced in 4b.1 had ESLint10 complaints about global `URL`/`console`; corrected explicitly with `node:url` and `process.stdout`. Earlier failed dedicated jobs `44543915219` and `44544469672` were harness assertion mistakes (React Router positional single-fetch serialization; intended keyset reset on actor switch), not confirmed production defects. Final exact-head retest PASS.

**Лира STOP после 4b.7.** Next distinct `...` = **ONLY 4b.8 — existing domain independence: complaints/Owner/evidence, Watch/Bookmarks/read markers and public profile/search**. Checkpoint and STOP before 4b.9. No 4c/review/merge; #351 Draft, #342 service-only/no merge. Owner-ordered WATCH/BOOKMARKS corrections remain deferred until #351 completed.

## 2026-11-19 — Лира: 4b.8 domain independence connected PASS; STOP

**Bounded scope:** real Worker/Better Auth/PostgreSQL 17/Chromium test of separate Watch/Bookmarks/read markers, private discovery and public search/profile, Complaint from a collapsed blocked post, protected reviewer evidence/context and unchanged permissions. PR #351 Draft exact head `d02d79c11c0bcde4e1afdf1a73723f0319756988`. Only `tests/browser/personal-filters/check.py` was changed (commits `208b3b95bb32e6c26025aac00b6036439f1e5ea1`, `d02d79c11c0bcde4e1afdf1a73723f0319756988`). No production/schema/UI changes.

**Connected gate:** [run 44549801360](https://github.com/iliya1947/vico-forum/actions/runs/44549801360), job `135650161363` **completed SUCCESS**, all **42/42 `FILTERS_CONNECTED` markers**, 35 prior + seven 4b.8:
1. Independent fresh actor's Watch and Bookmark rows persist after canonical Mute ON / Block ON; none of these four writes creates a read marker.
2. Muted/blocked topic remains in authenticated Bookmarks and new/unread discovery, without read-state creation.
3. Public Search still finds B's topic, B's profile remains publicly readable even by blocker.
4. Normal authenticated TopicView reads latest delivered post even if B's body is collapsed; explicit per-post Reveal doesn't modify `last_read_post_id` or `updated_at`, Watch/Bookmark persist.
5. Separate authenticated actor submits real Complaint on B's still-collapsed original post; Complaint case persists immutable original post-revision target, no Unblock needed.
6. A reviewer with `forum.complaint.review` grant, and independent Mute+Block ON, can read the original reported evidence and protected Complaint context through reviewer-only route; no TopicView collapse on protected review.
7. Reviewer grant remains stable; unbound non-Owner still gets private 403 for `/en/super-admin` before/after filters. This is not a positive bound-Owner workflow or actual R2 attachment download acceptance; existing Owner workflows remain separately scoped.

First run `44549323905` failed after first 4b.8 marker because the test imposed `private,no-store` on unrelated Unread GET (its route has no such header). Corrected test assertion to status200 for Unread and public Search, **no** production change. Final dedicated SUCCESS.

**Exact-head CI:** [run 44549801846](https://github.com/iliya1947/vico-forum/actions/runs/44549801846), `database` job `135650164194` and `checks` job `135650164392` **completed SUCCESS**, including lint/typecheck/tests/build. Other 14 workflows not claimed all done.

**Лира STOP после 4b.8.** Next distinct `...` = **ONLY 4b.9 — EN/RU/HE, keyboard and narrow RTL Chromium**, then checkpoint STOP before 4b.10. No 4c, coordinator/independent whole-PR review, merge, WATCH/BOOKMARKS corrections or Stage 6. PR #342 service-only/no merge; PR #351 Draft.

## 2026-11-19 — Лира: 4b.9 localized keyboard and narrow HE RTL PASS; STOP

**Bounded scope:** real Worker/Better Auth/PostgreSQL 17/Chromium acceptance for EN/RU/HE Mute/Block, keyboard focus/actions, private-list navigation and Undo, 360px RTL and collapsed-post Reveal. Draft #351 exact head `0fd73ffb86303e3c13887a3054b3b8b2b265568a`. Only `tests/browser/personal-filters/check.py` changed (test-only commits `2878312d9a619a3b22f5d64edfda316217e31333`, `6236e8ce18d03c6381e61073e96481f073741a7c`, `0fd73ffb86303e3c13887a3054b3b8b2b265568a`); no production/schema/locale/CSS modifications.

**Connected dedicated gate:** [run 44554597322](https://github.com/iliya1947/vico-forum/actions/runs/44554597322), job `135667126908` **completed SUCCESS**, **48/48 `FILTERS_CONNECTED` markers** (42 previous + six 4b.9):
1. English topic Mute via real keyboard Enter persists own pair; private list labels and `aria-pressed` / `aria-current` reflect confirmed state.
2. Russian Mute-on label and Block via Space on profile; translated private users tab and block-state ARIA.
3. Hebrew `lang=he`, `dir=rtl`, 360px viewport: topics tab labels, focus-visible, keyboard Tab order, filter action button geometry and no horizontal document overflow.
4. Hebrew keyboard Enter navigates to blocked-users tab; row/undo control remains on screen and state stays private.
5. Hebrew blocked B original is collapsed with translated notice, keyboard Enter reveals body; persisted Block/Mute unaffected.
6. Hebrew keyboard Undo Block (Enter) and Mute (Space) removes own PG pairs; English and Russian source controls confirm OFF after navigation/reload.

**Early harness-only failures:** run `44553087081` incorrectly asserted text tab link height >=24px (actual 19px), run `44553677254` similarly asserted filtered-post Reveal button >=24px (actual 21px). These do not establish a current-scope functional or keyboard defect; no CSS change was justified. Final test differentiates button/text link geometry and checks actual RTL accessibility and keyboard behavior.

**Exact-head CI:** [run 44554597626](https://github.com/iliya1947/vico-forum/actions/runs/44554597626) **completed SUCCESS**, `checks` job `135667127646` (lint/typecheck/tests/build) and `database` job `135667128461` (PostgreSQL17/Worker). Does not claim all other 14 PR workflows complete.

**Лира STOP после 4b.9.** Next separate `...` activates **ONLY 4b.10 — full dedicated connected Mute/block acceptance and scoped fixes to verified current-scope defects**, followed by checkpoint STOP before 4b.11. No 4c, Mira/Leva whole-PR review, merge, future Stage, general UI/UX or deferred WATCH/BOOKMARKS correction. #351 Draft; #342 service-only/no merge.

## 2026-11-19 — Лира: 4b.10 full connected acceptance PASS on identical tree; STOP

**Scope:** full dedicated Mute/Block connected acceptance and only confirmed current-scope defects. Implementation Draft #351 current commit `0a2243339775dd1a5e55898ced6e553f77051d4e`, Git tree `2417cde670f079b67bcb178fb39c17f27c32569a`. **This tree SHA was directly verified equal to previously green commit `0fd73ffb86303e3c13887a3054b3b8b2b265568a`.**

**Full dedicated evidence:** [run 44554597322 attempt 2](https://github.com/iliya1947/vico-forum/actions/runs/44554597322/attempts/2), job `135678796360` **SUCCESS**, all **48/48 `FILTERS_CONNECTED` markers**, no trace/error, artifact `personal-filters-connected` ID `14546202179`. Real Worker, Better Auth, disposable PostgreSQL17, Chromium; covers 4b.1–4b.9: notification suppression/receipts and prospective behavior, block reveal/attachments and anchors, initial mentions/edit/replay, private own list/undo 50+1 cursor, privacy/403/409/no-store and identity switching, Watch/Bookmarks/read independence, complaint review/evidence, EN/RU/HE 360px RTL keyboard.

**Unverified diagnostic race, not a proven production defect:** speculative two-case React/Router test was introduced in commit `58c18b53d664940fc4fd254f50a720a5967caa76`. Exact-head `CI` [run 44558706081](https://github.com/iliya1947/vico-forum/actions/runs/44558706081) `database` job `135681728368` SUCCESS, `checks` job `135681728515` FAILED on those two new assertions; dedicated connected [run 44558705603](https://github.com/iliya1947/vico-forum/actions/runs/44558705603), job `135681724406` SUCCESS 48/48. The assertions could not find the row after revalidation; this does not by itself establish a live product race. The new test was removed as unsupported in `0a2243339775dd1a5e55898ced6e553f77051d4e`, restoring the exact earlier tree/blob. No production patch or unverified finding adopted.

**Important evidence boundary:** latest implementation commit SHA differs from last completed dedicated run's commit SHA, but **tree identity is exact**. Current exact-commit [dedicated 44560368355](https://github.com/iliya1947/vico-forum/actions/runs/44560368355) and [CI 44560368076](https://github.com/iliya1947/vico-forum/actions/runs/44560368076) were in progress at checkpoint and **are not claimed green**. These and remaining exact-head workflow suites are 4b.11 work, not prerequisite to declaring the unchanged tree's 4b.10 acceptance.

**Лира STOP после 4b.10.** Next explicit separate `...` activates **ONLY 4b.11 — exact-head full CI/regressions, evidence, bounded 4b closeout**, then checkpoint STOP before 4c. No 4c/whole-review/merge, no Stage6 or deferred Watch/Bookmarks audit corrections. #342 service-only/no merge; #351 Draft.

## 2026-11-19 — Лира: 4b.11 exact-head CI / 4b closeout PASS; STOP before 4c

**Implementation PR #351:** Draft/open, exact head `0a2243339775dd1a5e55898ced6e553f77051d4e`, target main/base `9eae385571bf99e073df46f8541f7514c9626a29`. This 4b.11 step modified no implementation code, schema, migration or docs. GitHub exact-head check-runs API and workflow associations verified **16/16 completed SUCCESS workflows / 20/20 completed SUCCESS jobs** for this SHA, with no required rerun.

**Reproducible evidence:**
1. [CI run 44560368076](https://github.com/iliya1947/vico-forum/actions/runs/44560368076): `checks` job `135687663832` SUCCESS (lint, typecheck, unit **2737/2737 tests** in **218/218 files**, Worker build, UI preview build); `database` job `135687663229` SUCCESS (PG17 migrations/constraints and built Worker smoke).
2. [Personal Mute/Block connected run 44560368355](https://github.com/iliya1947/vico-forum/actions/runs/44560368355): `personal_filters_browser` job `135687663514` SUCCESS, exact SHA, full **48/48 `FILTERS_CONNECTED` markers**, no logged traceback/assertion or GitHub step error. Real Worker, Better Auth, disposable PostgreSQL17, Chromium. Evidence artifact `personal-filters-connected` ID `14548711966` successfully uploaded, nonexpired.
3. All other **14** current-SHA workflow results completed SUCCESS: Topic Watch, Topic Bookmarks, Own topic title, SA-01, SA-03, SA04-J12/K5/L3/S, SA05, SA06, SA07, SA08 and AP-10 isolated acceptance (multiple subjobs as reflected in 20/20).

**Coverage snapshot:** 4b.1–4b.9 connected scenarios include Mute notification paths/Watch independence, prospective suppression without backfill and replay, directional Block and stable root/answer anchors, local Reveal, own lists 50+1 keyset/Undo/actor-switch and guest privacy/no-store/errors, public Search/Profile and Complaint evidence/reviewer isolation, EN/RU/HE native keyboard 360px RTL. Unit, connected and PG tests verified on stable exact head.

**Limitations / nonclaims:** Repository/local CI is not Stage 6 deployed/production verification. The connected 48-marker run did not deliberately fault-inject a live PG outage or download real R2 objects or positively bind a deployed Owner identity; do not claim such coverage. Previous 4b.10 speculative Undo→re-add React/Router test failed but was removed as unverified, and the restored exact implementation tree subsequently passed all 16 workflows. No confirmed current-scope defect remains from this 4b self-check, but independent whole-PR review is not done.

**4b COMPLETE. Лира STOP после 4b.11.** Next separate explicit `...` activates **ONLY 4c — final stable exact-head ACL/manifest/runtime privileges/self-check, and readiness/handoff documentation for Mira's coordinator whole-PR review**. Stop again before any actual review by Mira/Leva; no automatic handoff, merge or Stage 6. PR #342 is service-only/no merge; Draft PR #351 not merged. Owner-ordered Watch/Bookmarks audit fixes remain deferred until current Mute/Block task finished.

## 2026-11-19 — Лира: 4c exact-head ACL/manifest/runtime self-check PASS; handoff подготовлен, STOP

**Target:** Draft implementation [PR #351](https://github.com/iliya1947/vico-forum/pull/351) current stable head `0a2243339775dd1a5e55898ced6e553f77051d4e`; exact main/base `9eae385571bf99e073df46f8541f7514c9626a29`; service Draft [PR #342](https://github.com/iliya1947/vico-forum/pull/342). No implementation changes, deployment, merge, independent whole-PR review, or new docs PR in 4c.

**4c bounded self-check — PASS (not Mira's independent review):**
1. Compared `drizzle/0070_personal_filters.sql`, `db/schema.ts`, `drizzle/meta/0070_snapshot.json`, `drizzle/meta/_journal.json` and `.github/production-schema-manifest.json` on exact head: target migration `0070_personal_filters`, three matching table definitions, compound own PK, two FK CASCADE each, 2/2/1 indexes; self Block CHECK; millisecond timestamps for own pairs, no stored mutable OFF boolean.
2. `.github/scripts/runtime-privileges.mjs`: `web` has `SELECT, INSERT, DELETE` only on `forum_topic_mutes` / `forum_user_blocks`, `SELECT, INSERT` only on `forum_post_notification_suppressions`; no such relations granted to `localization-read`. The current CI `database` job independently passed production manifest parity, runtime-role positive/negative privilege probes and split web relation provisioning; `checks` passed migration history and snapshot parity.
3. Verified canonical mutation admission and private reads in source: source topic/profile action uses authenticated session actor, strict single form fields, stale actor 409 and typed no-store; private filters loader predicates by actor before LIMIT, strict keyset query and private no-store; suppression receipt/ordinary notification writes are transaction-bound; existing focused PG, routes/unit, Chromium cover the configured outcome. Not a new full-body implementation review.
4. Exact-head [CI run 44560368076](https://github.com/iliya1947/vico-forum/actions/runs/44560368076) `checks` `135687663832`, `database` `135687663229` SUCCESS: 2737/2737 unit tests (218 files), lint, typecheck, build, UI preview, PG17, schema/privilege/metadata gates. Exact-head [Mute/Block connected 44560368355](https://github.com/iliya1947/vico-forum/actions/runs/44560368355) job `135687663514` SUCCESS 48/48 markers, artifact `personal-filters-connected` ID `14548711966`. Full set 16/16 workflows, 20/20 jobs SUCCESS.
5. Real availability/permission boundaries only in repository/CI: deliberately injected live Worker DB failure, actual R2 download and deployed Owner Google binding not asserted by the dedicated Mute/Block suite. Earlier speculative Undo→re-add React/Router test was withdrawn; no confirmed implementation defect established. Pre-existing separate WATCH-AUDIT-1 and BOOKMARKS-AUDIT-1/2 remain deferred by owner, not part of #351.

**Handoff to next agent (not launched): Мира / ChatGPT-5.6 Sol** shall perform the first **coordinator technical whole-PR review** of #351 on stable exact head above, independently comparing all implementation changes with the accepted Mute/block scope in `USER_ACTIONS_SERVICE_PLAN.md` M1–M7, applicable current main and authorizations, including transaction/rollback/notification lifecycle and all relevant route/UI privacy boundaries. Classify actual current-scope defects vs deferred work. If a current-scope blocker is confirmed, return it to Лира before Codex review; implementation fixes change head and require new coordinator cycle. Only after Mira PASS is independent technical review by **Лёва / Codex-6.1 Sol** on the same head appropriate. Merged implementation then separate documentation closeout; #342 service-only, never merge. Do not conflate coordinator review with this 4c self-check.

**Лира STOP после 4c.** Next developer action: attach Мира to service PR #342 for coordinator review of Draft PR #351, without automatic Stage 6/merge/review by Лёва.

## 2026-11-19 — Лира: PF-REVIEW-1 correction code/tests checkpoint; verification PENDING / STOP

Mira completed coordinator whole-PR review of #351 at head `0a2243339775dd1a5e55898ced6e553f77051d4e`, **HOLD** for current-scope PF-REVIEW-1/2/3. This correction turn addresses **only PF-REVIEW-1**, not the other two defects or deferred Watch/Bookmarks issues.

**Implementation Draft #351 current head:** `7bdf468fed9bebb74adf421cb5e231ba14218c8a`; test/code commits: `caabdf9614f3564814aa1dc727b9a07b0e2e0721` (control code), `448325d1d17bcca4477ddc40827b69b683586215` (four regressions), `7bdf468fed9bebb74adf421cb5e231ba14218c8a` (canonical pending label). Only `app/forum/personal-filter-control.tsx` and `app/forum/personal-filter-control.test.tsx` changed.

**PF-REVIEW-1 targeted correction:** Removed local `confirmed` mirror as a competing source of server state. `PersonalFilterControl` renders current loader `state` unless an unconfirmed/error action requires an explicit refresh. A matching ACK no longer writes a local on/off value that can supersede a newer same actor/target loader snapshot. Pending disable, typed unknown/unavailable, explicit GET refresh, actor/target ACK guards and no automatic POST retry remain. Four new deterministic React Router tests exercise Topic Mute and User Block in both state directions: first writer commits, ACK held, second writer restores pair, fresh route loader revalidates, late matching old ACK delivered; loader must remain authoritative. Existing ordinary success test fixture now actually updates server-side loader snapshot before ACK.

**Evidence boundary:** source and regression code committed, but **NOT YET VERIFIED / NOT PASS**. On the exact new commit, CI [run 44573742574](https://github.com/iliya1947/vico-forum/actions/runs/44573742574) jobs `checks` `135735501620` and `database` `135735500995`, plus connected [run 44573743073](https://github.com/iliya1947/vico-forum/actions/runs/44573743073) job `personal_filters_browser` `135735503028`, were still **queued** at last checked time. Do not claim focused tests PASS until their actual result is inspected; no CI runner polling loop. Production and other PF issues unchanged.

**Лира STOP on this implementation microstep**. Next explicit `...` should **verify current head's completed CI, diagnose/fix PF-REVIEW-1 test-only/actual failure if any and checkpoint PASS only if evidenced**; then STOP before **PF-REVIEW-2**. PF-REVIEW-2/3 must be separate next authorized microsteps. Only after all 3 corrections should a stable exact-head full CI + dedicated acceptance and a fresh Mira coordinator whole-PR cycle be prepared. #342 service-only/no merge; #351 remains Draft.

## 2026-11-19 — Лира: PF-REVIEW-1 exact-head verification PASS; checkpoint / STOP before PF-REVIEW-2

Implementation Draft #351 remains at **`7bdf468fed9bebb74adf421cb5e231ba14218c8a`** (base `9eae385571bf99e073df46f8541f7514c9626a29`); no changes in this verification step. Three targeted implementation commits in prior step modified only `app/forum/personal-filter-control.tsx` and its test. Old independent coordinator review remains HOLD for PF-REVIEW-2 and PF-REVIEW-3; **do not treat this focused verification as new Mira whole-PR PASS**.

**Verified on exact head:**
1. [CI `44573742574`](https://github.com/iliya1947/vico-forum/actions/runs/44573742574): `checks` `135735501620` SUCCESS — **2741/2741** unit tests in **218/218** files, focused `personal-filter-control.test.tsx` **11/11**, including 4 deterministic newer-loader-before-old-ACK scenarios (topic/user × ON/OFF), plus lint, typecheck, build, preview and schema checks. `database` `135735500995` SUCCESS — **1476/1476** tests in **109/109** files, PG17 and applicable migrations/runtime/schema checks.
2. [Dedicated Mute/Block connected `44573743073`](https://github.com/iliya1947/vico-forum/actions/runs/44573743073): `personal_filters_browser` job `135735503028` SUCCESS, all **48/48 `FILTERS_CONNECTED`** markers, artifact `personal-filters-connected` **`14556521887`** nonexpired/uploaded.
3. Exact commit workflow association: **16/16 GitHub Actions workflows completed SUCCESS**, no failed/pending; compare previous stable head `0a2243339775dd1a5e55898ced6e553f77051d4e` → current shows only two component/test files, 3 commits.

**PF-REVIEW-1 result: PASS bounded correction.** `PersonalFilterControl` now treats loader `state` as presentation authority rather than a local successful-ACK mirror. Late matching response cannot overwrite a newer same-pair loader snapshot; no optimistic write, pending lock and explicit refresh for unknown outcome remain, actor/target checks and no automatic POST retry preserved. This is repository/CI acceptance for the stated race; independent coordinator verification after all corrections is still required.

**Лира STOP after PF-REVIEW-1 verification.** Next separate explicit `...` activates **ONLY PF-REVIEW-2** (Filters list Undo latch / re-added own pair) with focused regression/CI checkpoint; **PF-REVIEW-3 requires another separate command**. Only after all three corrected: final exact-head CI/connected and new Mira whole-PR coordinator review; no Leva before Mira PASS. #342 service-only/no merge; #351 Draft. Deferred Watch/Bookmarks audit corrections out of scope.

## 2026-11-19 — Лира: PF-REVIEW-2 fix/test checkpoint, CI QUEUED — STOP

**Only PF-REVIEW-2 current-scope correction in Draft PR #351:** exact current head `dac264877fd1969e1fd683cc731a8852e2848a16` (base/main `9eae385571bf99e073df46f8541f7514c9626a29`), three commits starting `26289f823f07c06d634144f8dee81843ad4b1a41`. Changed only `app/forum/filters-view.tsx` and `app/forum/filters-view.test.tsx` (GitHub compare against PF-REVIEW-1 head `7bdf468fed9bebb74adf421cb5e231ba14218c8a` verified).

**Implementation:** `FilterRow` no longer stores permanent local `removed` latch or returns `null` on an old successful Undo ACK. The existing server-scoped `/:locale/filters` loader is the source of visible own rows; React Router revalidates route data after a fetcher Form action. Valid Undo still clears uncertainty; errors preserve the row with explicit refresh, no automatic POST retry. No additional state/version/store/DB/ACL change.

**Tests added:** two React Router loader-driven deterministic cases, one for Mute topic and one for Block user: Remove committed, old ACK delayed; another legitimate session re-adds same pair with fresh `createdAt`; route revalidates before old ACK arrives; late ACK must not hide the re-added row. Existing normal successful Undo test updated to model committed removal in loader instead of depending on local hiding. Existing uncertain/actor-isolation tests untouched.

**Verification boundary:** The new exact-head GitHub CI [run 44577496670](https://github.com/iliya1947/vico-forum/actions/runs/44577496670) `checks`/`database` and dedicated [run 44577496424](https://github.com/iliya1947/vico-forum/actions/runs/44577496424) are **QUEUED at last check**. NO PASS claim for the new tests/commit. Code was committed and source/diff reviewed, but runtime regression acceptance **not yet established**. Do not infer success from prior PF-REVIEW-1 CI. Neither PF-REVIEW-3 nor deferred Watch/Bookmarks corrections changed.

**Лира STOP after PF-REVIEW-2 code/tests checkpoint.** Next distinct explicit `...` = **ONLY PF-REVIEW-2 exact-head CI verification** and, if required, diagnosis/local correction of *confirmed* failure; checkpoint and STOP before PF-REVIEW-3. Then separate `...` for PF-REVIEW-3. After all three correction steps, final exact-head full CI + Mira whole-PR coordinator review; Leva only after Mira PASS. #342 service-only/no merge; #351 remains Draft.


## 2026-11-19 — Лира: PF-REVIEW-2 new exact-head assertion correction / CI pending

On old `dac264877fd1969e1fd683cc731a8852e2848a16`, `checks` failed one new `filters-view.test.tsx` Block case (2742/2743). Detailed GitHub test DOM includes a correctly re-added user link `/en/users/user-1`, accessible name `Deleted userAdded ...`, while exact string expectation required only `Deleted user`. Code/DOM evidence confirms test assertion mismatch; no missing-row production regression shown. The unit failed before late ACK release. Dedicated browser connected and database PASS at old head.

New test-only `37b7c8e991865a0352562fecbedf74d6f5aeeb53` uses regex `/Deleted user/i` for the user link; new timestamp, delayed-ACK visibility, single POST assertions unchanged. Exact compare one-line change in one test. New CI `44587038549` and dedicated browser `44587038774` in progress, not yet claimed PASS. Continue PF-REVIEW-2 verification only, then STOP before PF-REVIEW-3; #351 Draft, #342 service-only.


## 2026-11-19 — Лира: PF-REVIEW-2 corrected exact-head acceptance PASS; STOP

PR #351 exact head `37b7c8e991865a0352562fecbedf74d6f5aeeb53` unchanged after one-line test-only fix (user deleted label accessible name includes Added timestamp). GitHub `checks` run `44587038549` job `135782670721` SUCCESS: 2743/2743 unit tests, 218 files; `app/forum/filters-view.test.tsx` 6/6 (both regression cases). Same CI `database` job `135782669976` SUCCESS. Dedicated Mute/Block `44587038774` job `135782671192` SUCCESS, 48/48 markers with real Worker/Better Auth/PG17/Chromium, artifact `14561498649`. Remaining workflows completed: **16/16 exact-head success**, zero pending/failed. PF-REVIEW-2 bounded PASS, no production code modified in this verification step. Not a Mira review.

STOP before PF-REVIEW-3. Only next separate user `...` authorizes PF-REVIEW-3; no automatic onward transition or Leva until fresh Mira whole-PR PASS. #342 service/no merge; #351 Draft.


## 2026-11-19 — Лира: PF-REVIEW-3 targeted correction/tests committed, CI queued

At #351 exact `91b473a8035a6fdb9df40a8bedf1579d8884493c`, corrected `app/forum/views.tsx` stale Block snapshot detection for header guest/null vs old blockedActorId=A, preserving canonical fresh guest null/null and actor mismatches. Added deterministic `public-read.test.tsx` sign-out test with delayed route loader and interim/after assertions. Added real Better Auth same-mounted-topic sign-out Chromium scenario in `tests/browser/personal-filters/check.py` against real PG17 and retained A own Block row. Only those three files changed against prior green PF-REVIEW-2 head `37b7c8e991865a0352562fecbedf74d6f5aeeb53`. All workflow runs `44589043664` (CI), `44589043141` (dedicated) etc were QUEUED when checked, so no PASS claimed. Next ONLY check new head CI, fix confirmed narrow issue if needed, service checkpoint then STOP before global final verification and Mira whole-PR review. #351 Draft; #342 service-only/no merge.


## 2026-11-19 — Лира: PF-REVIEW-3 final same-head CI and connected acceptance PASS; STOP

Draft implementation PR #351 exact head `0fc239a554c8df562e97bc600f59b6b7b06d36ab`, no code changes beyond confirmed narrow correction. Initial `91b473a8035a6fdb9df40a8bedf1579d8884493c` check showed 2 legacy attachment-only presentation failures while new PF-REVIEW-3 sign-out React test PASS. Cause: test setup had authenticated session `translation-capable-author` but guest `HeaderAuthProvider`; freshly hardened A→guest mismatch intentionally fails closed. Corrected only `app/forum/public-read.test.tsx` renderRoute fixture to match authenticated header. Not a new production defect.

Exact new-head CI `44590976935`: checks job `135796577758` SUCCESS 2744/2744 in 218 files, 109/109 `public-read.test.tsx` including A→guest and two attachments; database `135796578071` SUCCESS. Dedicated `44590977494` `personal_filters_browser` job `135796579822` SUCCESS 49/49 `FILTERS_CONNECTED` with newly added same-page real Better Auth sign-out. Full 16/16 PR-head workflows SUCCESS/complete, zero pending/failed. No rollout, code refactor or additional PR. Three coordinator findings PF-REVIEW-1,2,3 have bounded fix + exact-head acceptance; independent coordinator whole-PR review has NOT occurred after corrections. Лира STOP; next user `...` only final implementation exact-head self-check and prepare Mira whole-PR review in #342; Leva later only after Mira PASS.

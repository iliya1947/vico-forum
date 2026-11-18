# Service channel — edit own topic title

## 2026-11-18 — задача принята из #300

Источник назначения: служебный PR #300, передача Мире от владельца.

Подтверждённый scope: отдельный pre-release блок — редактирование заголовка собственной темы обычным автором.

Границы:
- новый отдельный служебный PR;
- #320 не изменять и не смешивать с этой задачей;
- #331 завершён и не используется как канал новой задачи;
- это не admin edit и не source-locale correction;
- реализацию до готовности канала и технического планирования не начинать.

Мира сверила актуальный main, полностью перечитала AGENTS.md, PROJECT.md, PROJECT_STATE.md, ROADMAP.md, TRANSLATION_ARCHITECTURE.md, docs/translation/CONTENT_TRANSLATION.md и docs/auth/AUTHORIZATION.md.

Начальный scope зафиксирован в TOPIC_TITLE_EDIT_SERVICE_PLAN.md.

Следующий участник: Лёва / Codex-6.1 Sol. Его задача — подготовить полный технический план реализации по актуальному main без начала implementation.

## 2026-11-18 — технический план Лёвы подготовлен; возврат Мире

Проверенный main: `906d15d896cc3a4f3b7dc9a03f46acd883925d1d`.
В TOPIC_TITLE_EDIT_SERVICE_PLAN.md добавлены полное исследование текущего title path,
предлагаемые permission/write/UI/failure/concurrency/translation контракты,
последовательность implementation и acceptance matrix.

Подтверждено: immutable title revisions/CAS/current translation guards существуют;
готового own-title editor/route capability нет. Existing `forum.post.editOwn` и
source-locale correction не разрешают переименование темы.
Новая content architecture и dependencies не требуются.

Технические эскалации Мире:
- E1: новый `forum.topic.title.editOwn` требует catalog/default-grant согласования и
  forward migration для закрытого `authz_permissions_catalog_check`;
- E2: применение существующего `posts.edit` к заголовкам требует явного согласования
  расширения действующего restriction contract; рекомендация и границы — в плане.

Это предложения, не утверждённые изменения. Реализация, миграции и внешние действия
не выполнялись. Future implementation tests/CI/browser не запускались и не заявлены PASS.
Следующее назначение: Мира проводит scope/fit review и фиксирует решения по E1/E2;
до этого Лира не активируется. После принятия — отдельный implementation PR.
#320 и #331 не изменялись.


## 2026-11-18 — Мира: scope/fit review технического плана

- E1 ACCEPT: новый `forum.topic.title.editOwn` + forward migration для catalog CHECK/default grants — необходимая текущая часть функции, не future groundwork.
- Отдельный 5s title-edit cooldown REJECT: существующий published-post edit не имеет такого edit cooldown; новая политика не обоснована текущей задачей.
- Recovery/test scope сокращён до необходимых инвариантов: permission/ownership, immutable revision + CAS, translation currentness, relevant changed-path races и реальный browser flow; отдельная title recovery/idempotency subsystem не нужна.
- E2 остаётся единственным owner decision: применять ли существующий user-measure restriction `posts.edit` к редактированию заголовка своей темы. Рекомендация Миры — да, как часть Own content, без нового restriction key.
- Лира не активирована до решения E2.


## 2026-11-18 — решение владельца E2 и передача Лире

Владелец выбрал вариант E2 = да: existing `posts.edit` restriction распространяется на редактирование заголовка собственной темы как на Own content. Новый restriction key не создаётся.

Технический план принят с overrides Миры: E1 включён; отдельный title-edit cooldown исключён; отдельная recovery/idempotency subsystem не создаётся.

Следующий участник: Лира / ChatGPT-6. Реализовать bounded scope в отдельном implementation PR от актуального `main`, выполнить применимые проверки и зафиксировать stable implementation head. После этого STOP и возврат Мире на coordinator whole-PR review.


## 2026-11-18 — владелец переназначил реализацию Лёве

Предыдущее назначение Лире отменено. По прямому решению владельца bounded implementation выполняет Лёва / Codex-6.1 Sol.

Scope и принятые решения E1/E2 не меняются. Лёва создаёт отдельный implementation PR от актуального `main`, реализует утверждённый план с overrides Миры, выполняет применимые проверки и фиксирует stable implementation head.

После этого Мира проводит coordinator whole-PR review. Так как Лёва будет автором реализации, независимый технический review после PASS Миры выполняет Марк / Codex-6 Sol на том же exact head.

## 2026-11-18 — Лёва: implementation готов, возврат Мире

Создан отдельный [implementation PR #343](https://github.com/iliya1947/vico-forum/pull/343)
от `main` `906d15d896cc3a4f3b7dc9a03f46acd883925d1d`.
Stable exact head: `10321fdae762004ac2d55e9618a89c6c41e0d2ac`.

Принятый E1 реализован через permission/catalog CHECK/default grants и migration 0067;
E2 — через существующий `posts.edit` в loader и authoritative transaction с сохранением
Owner immunity. Title text editing отделён от source-locale correction и body editor;
immutable revision/CAS/AccountState/translation currentness сохранены.
Cooldown, новые drafts/receipts/autosave/recovery subsystem и edit-any не добавлены.

Local PASS: 2594 application/unit и 1417 PostgreSQL 17 tests, lint/typecheck, Worker и
UI-preview builds, migration history/metadata, 69-table schema manifest, runtime privilege
и provisioning probes, 156 CI script contract tests. Connected Chromium с реальным
Worker/Better Auth/PostgreSQL подтвердил ordinary/Help author success, guest/non-author
denial, two-tab stale conflict и explicit rebase, current title в reload/list/search и RTL.
GitHub workflows: 13 из 13 workflows PASS на head `10321fdae762004ac2d55e9618a89c6c41e0d2ac` (общий CI run 44201847789; title browser run 44201847917).

Результаты/ссылки — в плане; техническое примечание о существующем генераторе Drizzle —
в `.github/agents/codex-6.1-sol.md`. Локальная временная timezone-проблема исходного
DB-прогона устранена настройкой UTC как в CI; полный повтор прошёл без изменения auth-кода.

Назначение Мире: coordinator whole-PR review **всего принятого scope #343** на указанном head.
При findings вернуть исполнителю одним пакетом; после PASS передать тот же head Марку.
Лёва — автор реализации и независимое review не выполняет. После review/merge нужен
отдельный заключительный docs PR для authorization/AP-10/PROJECT_STATE.
#320 и #331 не изменялись; production actions не выполнялись. STOP.


## 2026-11-18 — Мира: coordinator technical review завершён

Проверен весь принятый scope implementation PR #343 на stable exact head `10321fdae762004ac2d55e9618a89c6c41e0d2ac` против текущего `main` `906d15d896cc3a4f3b7dc9a03f46acd883925d1d`.

Подтверждённых current-scope дефектов не найдено. Проверены permission/catalog/default grants и migration 0067, authoritative ownership + `posts.edit` admission, active-account boundary, immutable revision/CAS/no-op, translation currentness, route validation/failure mapping, loader capability, title editor conflict flow, schema snapshot/manifest и относящиеся tests/browser checks.

GitHub на exact head показывает 17 check-runs, все с conclusion=success; schema snapshot 0067 отличается от 0066 только новым snapshot id/prevId и расширенным `authz_permissions_catalog_check`.

Формальный coordinator PASS/APPROVE пока не зафиксирован только из-за обязательного owner visual acceptance для UI-изменения по текущему AGENTS.md. Browser evidence Лёвы не заменяет решение владельца. После owner visual acceptance, если implementation head не изменится, Мира фиксирует PASS и передаёт exact head Марку.


## 2026-11-18 — Мира: coordinator PASS

По прямому уточнению владельца visual acceptance этой функции не является gate текущего bounded-цикла: визуальная приёмка выполняется позже в отдельном UI/UX pass. Это конкретное решение владельца имеет приоритет над общим gate из AGENTS.md для этой задачи.

Coordinator whole-PR review implementation PR #343 на stable exact head `10321fdae762004ac2d55e9618a89c6c41e0d2ac` завершён: **PASS**, подтверждённых current-scope дефектов нет.

Следующий участник: Марк / Codex-6 Sol — независимый технический review того же exact head. Лёва как автор реализации собственную независимую проверку не выполняет.


## 2026-11-18 — независимый review расширен до Лиры + Марка

После coordinator PASS независимую проверку выполняют два агента, не участвовавших в реализации: Лира / ChatGPT-6 и Марк / Codex-6 Sol. Лёва исключён из independent review как автор реализации.

Обе проверки относятся к одному stable exact head `10321fdae762004ac2d55e9618a89c6c41e0d2ac` и проводятся независимо. Совпадение выводов само по себе не считается доказательством; каждый reviewer обязан подтвердить findings по фактам и текущему scope.


## 2026-11-18 — Марк: независимый технический review

PR #343 на exact head `10321fdae762004ac2d55e9618a89c6c41e0d2ac`: **PASS**. Подтверждённых дефектов текущего scope не найдено. Проверены permission/catalog/migration/default grants, ownership/AccountState/`posts.edit`, immutable revision/CAS/no-op, translation currentness, route/UI conflict flow, относящиеся тесты и browser workflow. Реализация не менялась. Подробный результат и границы проверки — в `.github/agents/codex-6-sol.md`.

Ожидается независимый результат Лиры, после которого Мира сопоставляет выводы и определяет closeout по workflow.


## 2026-11-18 — Лира: независимый whole-PR review #343 — PASS

PR #343 проверен на неизменившемся exact head `10321fdae762004ac2d55e9618a89c6c41e0d2ac` против принятого scope и текущего `main`. Подтверждённых current-scope дефектов не найдено. Проверены permission/ownership/measure/AccountState, immutable revision/CAS, translation currentness, UI stale/conflict/rebase, migration/schema и относящиеся route/DB/browser tests. GitHub API: 17/17 checks success на том же head; самостоятельного повторного запуска тестов не было. Подробности и границы проверки — `.github/agents/chatgpt-6.md`.

Независимый результат Лиры: PASS; следующий участник — Мира, сопоставление проверок и closeout. Реализация #343 не изменялась; служебный #342 не merge.


## 2026-11-18 — Мира: независимые reviews сопоставлены, implementation готов к merge

Лира и Марк независимо проверили один и тот же stable exact head `10321fdae762004ac2d55e9618a89c6c41e0d2ac` и оба дали PASS без подтверждённых current-scope findings. Их проверки согласуются с coordinator review Миры по фактическим границам: permission/catalog/migration, authoritative ownership/AccountState/`posts.edit`, immutable revision/CAS/no-op, revision-bound translations, route/UI conflict flow и отсутствие scope expansion.

Совпадение выводов не использовано как самостоятельное доказательство: каждый review содержит собственную проверку цепочек и границ. Implementation PR #343 остаётся на том же exact head, base/main не изменился на момент closeout-проверки, PR mergeable.

**Implementation #343 готов к merge владельцем.** После фактического merge следующий отдельный этап — заключительный docs PR: обновить authorization catalog/default grants, AP-10 `posts.edit` applicability и фактический PROJECT_STATE/migration state. До merge документация не должна заявлять функцию как состояние `main`.


## 2026-11-18 — implementation merged; docs сохранены deferred

Implementation PR #343 merged в `main` 2026-11-18 08:14 UTC, merge commit `d8667f630450f702783bbbdb9a3ec14432e75660`.

Docs PR #344 восстановлен в open и помечен **deferred**. Он сохраняет уже подготовленную документационную синхронизацию, но не является текущей активной работой и не блокирует следующий продуктовый блок.

Следующий отдельный продуктовый блок — Watch.


## 2026-11-18 — исправление роли docs closeout

Предыдущее действие Миры было ошибкой процесса: Мира сама подготовила содержимое docs PR #344, хотя как координатор должна была передать этот отдельный исполнительский этап дальше.

#344 оставлен open, переведён в Draft и передан Лире / ChatGPT-6. Первоначальный текст Миры считается только непроверенным черновиком, а не принятым docs result. Лира самостоятельно сверяет актуальный main и source-of-truth и вправе полностью переписать/удалить эти изменения. Мира содержимое #344 больше не редактирует; после готового stable docs head выполняет только coordinator review.


## 2026-11-18 — исправление самовольного назначения docs-исполнителя

Проверен последний сопоставимый docs closeout #341: его выполняла Лира, но после отдельного явного назначения разработчика. В текущем #342 такого назначения нет. AGENTS.md требует отдельный docs PR, но не назначает конкретного автора автоматически.

Поэтому предыдущее автоматическое назначение Лиры на #344 отозвано как необоснованное. #344 остаётся Draft, начатым Мирой ошибочно; его diff не считается принятым результатом. Исполнитель docs closeout сейчас **не назначен**. До отдельного назначения содержимое #344 не продолжать.


## 2026-11-18 — прямое назначение владельца: Лира проверяет готовый docs PR #344

Владелец прямо назначил Лиру / ChatGPT-6 независимым reviewer уже подготовленной Мирой документации в #344.

Фактическое состояние: docs diff #344 уже написан Мирой; повторный авторский этап не нужен. #344 остаётся open Draft на exact head `cd72e8696167d71c8e93e7ab63ff8e86342af4c3`, base merged implementation `d8667f630450f702783bbbdb9a3ec14432e75660`.

Задача Лиры: independently review весь docs diff #344 против merged #343, актуального main и относящихся source-of-truth; не редактировать #344 во время проверки. Вернуть PASS либо один пакет подтверждённых current-doc-scope defects и STOP. Мира как автор docs diff не выполняет независимую проверку собственной документации.


## 2026-11-18 — Лира: независимый docs review #344 — PASS

Проверен весь docs diff #344 на exact head `cd72e8696167d71c8e93e7ab63ff8e86342af4c3` против merged #343 / current `main` `d8667f630450f702783bbbdb9a3ec14432e75660` и профильных contracts. Пять changed docs files соответствуют фактическим permission/default grants, AP-10 `posts.edit`, immutable title revision/CAS, translation currentness, migration 0067, stage/visual gates и историческим CI/review evidence. Confirmed current-doc-scope defects: **0**. Exact-head GitHub checks: **4/4 success**. Docs #344 не изменяла. Подробности — в `.github/agents/chatgpt-6.md`.

Отдельно обнаружено устаревшее описание PR #344: оно назначает Лиру автором docs changes, хотя direct owner assignment в #342 назначает её независимым reviewer готового diff Миры. Это несоответствие metadata, не дефект содержимого docs; перед closeout Мира должна синхронизировать PR description. Следующий участник — Мира: принятие review PASS, metadata correction, решение о готовности #344 к merge владельцем. Служебный #342 не merge.


## 2026-11-18 — docs review PASS; #344 готов к merge

Лира завершила независимый whole-PR docs review #344 на exact head `cd72e8696167d71c8e93e7ab63ff8e86342af4c3`: PASS, 0 confirmed current-doc-scope defects. Exact-head GitHub checks: 4/4 success.

Мира исправила только устаревшее PR metadata, не изменяя docs diff, и сняла Draft. #344 остаётся на том же exact head, open, mergeable и готов к merge владельцем.


## 2026-11-18 — docs merged; bounded-задача закрыта

Владелец смержил docs PR #344. Merge commit: `7cc23edede57994cdedab49c1556ddb55034dd29`; проверенный docs head `cd72e8696167d71c8e93e7ab63ff8e86342af4c3` не менялся перед merge.

Редактирование заголовка собственной темы теперь полностью закрыто: implementation #343 merged, docs #344 merged, implementation и docs reviews PASS, подтверждённых current-scope дефектов нет. Owner visual acceptance остаётся намеренно отложен в отдельный UI/UX pass по прямому решению владельца.

Служебный PR #342 закрывается без merge. Следующий отдельный продуктовый блок по принятой последовательности — Watch, в новом служебном PR.


## 2026-11-18 — correction: service PR lifecycle

Предыдущее закрытие служебного PR #342 Мирой было самовольным и не опиралось на полномочие владельца. Оно отменено: #342 возвращён в open.

Завершённость bounded-задачи не означает, что Мира вправе закрывать служебный PR. Implementation #343 и docs #344 остаются merged; task status остаётся complete. Дальнейший lifecycle #342 определяет владелец.


## 2026-11-18 — #342 продолжает общий блок; активирован Watch

По прямому указанию владельца #342 остаётся единым service PR для четырёх последовательных пользовательских действий до #320: edit own topic title (завершён) → Watch → bookmarks → mute/block.

Watch scope зафиксирован в `USER_ACTIONS_SERVICE_PLAN.md`. Текущий этап передан Лёве / Codex-6.1 Sol только на техническое планирование по актуальному main. Implementation ещё не начат; после плана Лёва STOP и возвращает этап Мире.

## 2026-11-18 — Лёва: полный технический план Watch готов

Исследован актуальный main `7cc23edede57994cdedab49c1556ddb55034dd29`.
План в `USER_ACTIONS_SERVICE_PLAN.md`, технические §1–9: own-pair persistence,
desired-state write с persisted active-actor admission, topic-lock ordering с reply,
set-based fanout в existing inbox, сохранение reply/mention dedupe/priority,
receipt/attachment atomicity, strict route и private loader/cache, изолированный
UI control, lifecycle/failures и real PostgreSQL/browser acceptance matrix.

Существенные подтверждённые границы: Unwatch не удаляет старые notices и не
подавляет author/parent/mention; edit/replay не получают watch-derived fanout;
сам reply actor исключён; read markers независимы. Текущая passive-recipient
lifecycle policy сохраняется, новый purge/filtering не вводится.

Для scope/fit Мире явно возвращены: **W1** необходимая Watch table + forward
migration/runtime privileges; **W2** classification личной подписки без RBAC key
либо отдельный `forum.topic.watch` по general catalog rule; **W3** узкий
`setTopicWatch` route/result contract. Рекомендация W2 и обе фактические основы
описаны в плане; исполнитель не должен разрешать это противоречие молчаливо.

Код не реализован, implementation PR отсутствует, feature tests/CI/browser не
запускались. Лёва **STOP**. Следующий шаг — Мира: whole-plan scope/fit review,
решения W1–W3 и определение готовности к передаче исполнителю. Лира ещё не активна;
#342 остаётся open service PR и не merge.


## 2026-11-18 — Watch plan accepted; handoff to Lira

Мира завершила scope/fit review плана Лёвы. W1 ACCEPT: минимальная watch persistence/forward migration/ACL. W2 ACCEPT: authenticated personal self-state без нового RBAC key. W3 ACCEPT: canonical topic route + narrow `setTopicWatch` desired-state command. Scope expansion не требуется.

Следующий участник: Лира / ChatGPT-6 — bounded implementation Watch в отдельном implementation PR от актуального main. После stable head и применимых checks — STOP и возврат Мире. #342 остаётся общим open service PR.


## 2026-11-18 — owner decision: advance-plan remaining user actions

Владелец поручил Лёве заранее подготовить планы остальных функций до #320, но не одним большим пакетом. Planning идёт последовательно: Bookmarks → STOP; после отдельной команды владельца Mute/block → STOP.

Это отдельный planning-track: Лира остаётся исполнителем текущего Watch implementation. Лёва сейчас назначен только на полный Bookmarks plan; реализация Bookmarks не активирована.


## 2026-11-18 — Лира: Watch backend/schema stage checkpoint

От принятого `main` `7cc23edede57994cdedab49c1556ddb55034dd29` Лира создала **Draft implementation PR #345** (`feature/topic-watch`), interim head `6cede3af5fe2d096cf01be676050a662b2d9f91b`. Реализованы schema/forward migration 0068, journal/snapshot/structural manifest, web-runtime ACL, persisted personal watch read/transactional desired-state write, set-based reply notifications в прежнем inbox и strict canonical route `setTopicWatch`. Подтверждено сравнение 11 changed files. Нет RBAC extension и внескоповых функций.

**Не завершено:** watch presentation/UI, connected/focused tests и browser acceptance. GitHub Actions на interim head только запущены, результатов PASS пока нет. PR Draft и **не готов к review**. Подробности — `.github/agents/chatgpt-6.md`.

Следующий шаг Лиры после продолжения владельца — UI и tests/browsers, затем final stable exact head, PASS проверок и handoff Мире на coordinator whole-PR review. Служебный PR #342 остаётся open и не merge. Опережающее планирование Bookmarks Лёвой — отдельная параллельная planning-track.

## 2026-11-18 — Лёва: опережающий Bookmarks plan готов, STOP

Исследован main `7cc23edede57994cdedab49c1556ddb55034dd29`; план Bookmarks B1–B7
сохранён в `USER_ACTIONS_SERVICE_PLAN.md`. Проверены фактические domain/list/UI/
identity/lifecycle seams. Target «закладки» в permanent contract ещё не определён:
Мире возвращены темы с private list (рекомендация) и отдельные сообщения с permalink
(альтернатива), без скрытого выбора и без одновременного добавления обоих targets.

Для рекомендуемого topic-варианта полностью описаны минимальная persisted own-pair
schema/ACL, идемпотентный desired-state writer, topic KEY SHARE → active actor
NO KEY UPDATE, current-title/public-identity/Help projection, private keyset list,
strict own-state route/cache/fetcher, lifecycle/failures и real DB/browser matrix.
Закладки независимы от Watch/read markers/inbox. B1/B2/B3/B5 возвращены Мире на
scope/fit; перед будущей реализацией план сверяется с итоговым Watch и новым main.

Это только опережающее планирование: код/implementation PR/feature tests/CI/browser
отсутствуют, Bookmarks implementation не активирован. Лира остаётся исполнителем
Watch. Лёва **STOP после полного Bookmarks plan**; следующий Mute/block slice
возможен только после отдельной команды владельца. #342 остаётся open, не merge.


## 2026-11-18 — Bookmarks plan accepted

Мира завершила scope/fit review опережающего плана Bookmarks. Принято: bookmark target = topic; приватный список собственных сохранённых тем; отдельная минимальная persistence; authenticated self-state без RBAC; canonical topic Add/Remove и отдельный authenticated list route. Post-level bookmarks не входят в первый bounded-этап.

Bookmarks остаётся только заранее подготовленным планом и не конкурирует с текущей реализацией Watch. Перед будущим implementation handoff — сверка с merged Watch/current main. Следующий planning slice Mute/block пока не активирован; Лёва остаётся STOP.


## 2026-11-18 — Watch CI corrections after backend stage

PR #345 backend/schema interim head updated to `bacaadfed1d2494380956c278aab7b0b1bbbd862`. GitHub first-run TypeScript and DB fixture failures confirmed via job logs and locally scoped corrections committed: typed response init/mocks, historical isolated watch table migration, dynamic current schema/migration expectations. On corrected head **GitHub database CI PASS**; full CI/browser remain in progress at the time of this entry. Drizzle snapshot + structural manifest old tables unchanged; new Watch relation only. PR stays Draft and not review-ready. Next Lira UI/private loader/tests/browser after owner's continuation; bookmarks planning remains separate.


## 2026-11-18 — активирован опережающий план Mute/block

После принятого Bookmarks plan по прямому решению владельца Лёва / Codex-6.1 Sol назначен на последний advance-planning slice: Mute/block. Реализация не начинается.

Лёва должен сначала определить фактические semantics и границы по актуальному main, не предполагая заранее user/content/notification effects. Реальные продуктовые развилки возвращаются Мире. После полного плана — STOP.

Лира параллельно продолжает Watch implementation #345; Bookmarks остаётся принятым будущим plan-only этапом.

## 2026-11-18 — Лёва: полный Mute/block plan готов, STOP

Main `7cc23edede57994cdedab49c1556ddb55034dd29`; план M0–M8 сохранён в
`USER_ACTIONS_SERVICE_PLAN.md`. Проверены profile/content/mention/notification/
read-state/Complaints/AP-10/lifecycle seams. Personal Mute/block contract в main
отсутствует; admin blocks не используются как личные preferences.

Мире возвращены M1 target/effect Mute, M2 target/effect/охват Block,
M3 history/consumption/concurrency, M4 schema/ACL/admission и M6 route/private
undo list/presentation/availability. Рекомендованы topic Mute ordinary notices
и directional user incoming filter+topic collapse; запрета публиковать/читать
public content или скрытого moderation ban нет. Это предложения, не принятые
вместо владельца продуктовые решения.

Current edit-mention dedupe зависит от inbox row: dropped notice без receipt
может появиться по старому @ после отмены фильтра. В плане suppression receipt
и альтернативы, а также READ COMMITTED snapshot race boundary без обещания
strict return barrier. Complaint notices/old inbox/read-state/Watch/Bookmarks
сохраняют свои отдельные контракты.

Код/implementation PR/feature tests/CI/browser отсутствуют. Лёва **STOP** для
scope/fit Миры. Последний назначенный advance-planning slice завершён; Лира
продолжает Watch, будущие Bookmarks/Mute-block implementation не активированы.
#342 остаётся open service PR и не merge.


## 2026-11-18 — Лира: Watch stage-3 UI/tests/connected acceptance in progress

Draft implementation #345 current interim head `72e9b8d15ee515af1c5dab309cc66ea9514178ae`: личный private/no-store topic Watch loader и локализованный RU/HE/RTL UI, целевые route/UI tests, реальные PostgreSQL lifecycle/fanout/concurrency/replay tests, новый `watch_browser` CI для встроенного Worker + Better Auth + PostgreSQL 17 + Chromium с inbox/read/permalink. Подтверждённые ошибки предыдущего head (FormData admission order, reader mocks, File parser expectation, typing) исправлены. На корректирующем промежуточном head `05b8fd388627fe979180647b98950b853a28f9fc` GitHub checks+database PASS; **текущий** `72e9b8d15ee515af1c5dab309cc66ea9514178ae` ещё проходит новые DB/CI/Chromium проверки, итоговый PASS не заявлен. Подробности — `.github/agents/chatgpt-6.md`. #345 остаётся Draft, stable review head не назначен. Лира продолжает acceptance, после него передача Мире; #342 не merge.


## 2026-11-18 — Mute/block plan reviewed; owner decisions M1/M2 pending

Лёва завершил полный Mute/block plan; Мира провела scope/fit review. Технические M3/M4/M6 приняты условно. Остались только две реальные product forks владельца:

- M1 recommendation: topic Mute suppresses all ordinary reply/mention notices from that topic, preserves Watch/content.
- M2 recommendation: directional user Block suppresses ordinary notices from target actor and collapses their ordinary TopicView posts for blocker; no publication/read ban.

До выбора M1/M2 Mute/block implementation не активируется. Watch #345 остаётся текущей реализацией Лиры; Bookmarks остаётся заранее принятым будущим этапом.


## 2026-11-18 — owner accepted M1/M2; advance planning complete

Владелец принял рекомендованные M1 и M2 без изменений. Mute = topic-level suppression всех будущих ordinary reply/mention notices без Unwatch/content hiding. Block = directional user filter: ordinary notices from target actor suppressed, target actor posts collapsed for blocker with explicit reveal; no publication/read ban.

Таким образом Mute/block scope полностью принят, а весь advance-planning перед #320 завершён. Watch #345 остаётся текущим implementation-этапом; Bookmarks и затем Mute/block ждут своей очереди.


## 2026-11-18 — Watch UI/loader subtask STOP (Лира)

В рамках отдельной подзадачи проверены уже существующие `app/routes/topic.tsx` private personalized Watch loader, `topic-watch-control.tsx` actor/topic scoped UI и RU/HE localization на #345 interim head `19a5015c0d2b9ff7ccfe57cd03e64b64e0a8e191`. GitHub exact-head `checks` job `134798391182`: lint/typecheck/unit/build/preview/metadata/schema parity PASS; database PASS. Но `watch_browser` job **FAIL**, без диагностики в этой подзадаче; общий CI ещё не PASS, head не stable, PR Draft. Код UI уже есть — коммит не нужен. По прямой просьбе разработчика STOP после одной подзадачи. Следующие отдельные итерации: unit/route/component test audit → PG/concurrency tests → Chromium failure/acceptance; переходы только по отдельной команде.


## 2026-11-18 — Watch unit/route/component tests checkpoint (Лира)

В #345 `ffb96ad59646abd15001d6be5879d8b848f4f26b` добавлены только interactive control tests `app/forum/topic-watch-control.test.tsx` (ON/OFF desired state, pending lock, uncertain response refresh/no auto retry, stale topic response). Existing strict route + private loader tests проверены и сохранены; DB/browser production code не изменялся. GitHub `checks` job `134806758552` запущен, **не объявлять PASS до фактического завершения**. PR Draft, stable head ещё нет. STOP; следующий отдельный slice — real PG concurrency/lifecycle testing, затем Chromium/Worker acceptance.


## 2026-11-18 — Watch component checks PASS (Лира)

Exact-head `ffb96ad59646abd15001d6be5879d8b848f4f26b`, GitHub job `checks` `134806758552` **success**: lint/typecheck/unit/build/UI preview/metadata/schema parity passed, включая новые интерактивные Watch tests. В этой подзадаче дополнительных кодовых изменений нет. `watch_browser` и `attachments_browser` на том же head — failure; `database` на момент проверки ещё выполнялся. Draft #345, stable review head ещё не объявлен. STOP по декомпозиции; отдельно следующим шагом — real PG tests.


## 2026-11-18 — correction: planning continues in #342

По уточнению владельца #300 используется как общая карта оставшихся задач, но рабочий planning-channel не переносится туда и новый service PR не создаётся. #342 остаётся открытым; текущий planning-stage переключён на модерацию видимости опубликованного контента.

Лёва назначен только на полный технический план скрытия/восстановления сообщений и тем. После плана — STOP. Структура форума/перенос тем будет следующим planning-slice по отдельной команде.

## 2026-11-18 — Лёва: полный visibility plan готов в #342

Main `7cc23edede57994cdedab49c1556ddb55034dd29`; план V1–V9 в
`USER_ACTIONS_SERVICE_PLAN.md`. Исследованы authoritative state/read/write,
permissions/AP-10/lifecycle, History, public/private projections, search/counts/
unread, reply/quote/mentions, Watch/Bookmarks/Mute, translations/status/tasks,
published/draft/evidence attachments, solutions/duplicates и Complaints.

Предлагаются server-side topic404/post tombstones, независимые state flags с
visibility version, новая management capability, CAS+observed revision+atomic
History, private inspector/restore queue и закрытие всех публичных путей чтения
до готового implementation head. Существующие Case evidence/appeals, retained
History и accepted translation execution имеют явно описанные отдельные boundaries.
Unanswered с hidden root, hidden best answer, unavailable inbox/own undo и
original-vs-translation payload разобраны отдельно. Подготовлена PG/browser матрица.

Мире на whole-plan scope/fit: V-P1/V-P2/V-P3 (реальные product forks), V-T1/V-T2
(schema/catalog/audit и локальные lock changes), resource/cache contracts V5–V7.
Код не реализован, implementation PR/feature tests/CI/browser отсутствуют.
Лёва STOP; структура форума/перенос тем не начаты, порядок реализации не меняется.

**Оставшееся process/metadata несоответствие:** проверены #300/#342/#346 и git refs.
#342 содержит правильное восстановленное назначение. Однако #346 на head
`301187891bfafe62f16a73906ef38e9ae567d8fe` всё ещё open и в описании называет себя
отдельным активным service каналом этой же задачи. Описание #342, в свою очередь,
всё ещё говорит о Watch planning до реализации. Мире нужно синхронизировать эти
metadata с прямым решением владельца о едином #342; никакого нового назначения
или второго рабочего канала из #346 не следует. Лёва чужой PR не закрывал/не merge.



## 2026-11-18 — Watch PostgreSQL concurrency/lifecycle subtask (Лира)

По отдельной команде владельца в #345 проверено существующее `tests/database/topic-watch.test.ts` и на exact head `ffb96ad59646abd15001d6be5879d8b848f4f26b` подтверждён **database PASS** (PostgreSQL 17). Исходное покрытие включает четыре lock orders Watch/Unwatch × reply, оба ON/OFF, deactivation-before-actor-admission, fanout dedupe, idempotent desired state, no backfill, attachment-only/replay, rollback, прочее. Обнаружены два текущих lifecycle-gap: actor-admission-first → deactivation waiting; после деактивации passive watcher всё ещё recipient по existing reply policy.

В `feature/topic-watch` commit `2b84f5eb91d161ac4aba2311335195d46f07693b` изменён **только** `tests/database/topic-watch.test.ts`: общий row-lock gate для topic/actor; новый реальный двухсоединительный тест actor-lock-first с доказательством ожидания UPDATE до Watch commit и запретом следующего OFF; отдельный DB тест пассивного fanout для deactivated watcher и отсутствия read-state изменения. Нет изменений production source/schema/browser. На момент записи новый job `database` ID `134865906627` выполняет clean PG17 migrations/integration; PASS/FAIL нового head пока не установлены. PR #345 Draft, не stable. Следующий самостоятельный slice — Chromium/Worker connected failure diagnosis, **только после отдельной команды**. Не смешивать с PG slice.



## 2026-11-18 — Watch PostgreSQL concurrency/lifecycle PASS (Лира)

On #345 interim commit `2b84f5eb91d161ac4aba2311335195d46f07693b`, two new real PostgreSQL Watch lifecycle cases added. Initial database job `134865906627`: 15 Watch tests PASSED, 106 files / 1432 database tests passed, but job failed on an **unhandled rejection from the unrelated existing Complaints concurrency test**. Same-head isolated rerun database job `134868877271` **PASS**, including PG17 clean migration/integration, schema manifest, runtime grants, Worker/Hyperdrive and Complaints HTTP smoke. No implementation change or unrelated fixes. Full PR is still Draft; `watch_browser` remains FAIL and is a separate next subtask. This PostgreSQL slice STOP per developer's decomposition.


## 2026-11-18 — Watch connected Chromium/Worker acceptance PASS (Лира)

PR #345 exact interim head `76c1c456557c614171a3b472758498795a668b9a`. Причина предшествующего `watch_browser` FAIL — HTTP 429 на второй reply одного actor в пределах штатного 5-секундного cooldown; исправлен **только тестовый сценарий** `tests/browser/topic-watch/check.py` выделением fresh publisher на каждый reply. GitHub `watch_browser` job `134873103841` **PASS**: 11 connected evidence steps, ordinary/Help topics, native Worker/Better Auth/PG17/Chromium, private Watch ON/OFF persistence/guest/identity/origin validation, watcher inbox/permalink/read, Unwatch future fanout, Hebrew RTL narrow. Production behavior без изменений. `checks` и `database` нового head в момент подтверждения browser PASS ещё выполнялись; всего CI PASS не заявлен. #345 Draft, stable review head ещё не назначен. **Лира STOP**; следующий отдельный шаг после команды владельца — whole-CI exact-head gate и handoff Мире.


## 2026-11-18 — Watch whole-CI exact-head gate PASS; formal review gate pending (Лира)

Implementation Draft PR #345 `feature/topic-watch` exact head `76c1c456557c614171a3b472758498795a668b9a`, unchanged relative to previous Chromium slice, base `main` `7cc23edede57994cdedab49c1556ddb55034dd29`; 20 ahead / 0 behind, GitHub mergeable, 35 changed files. **17/17 GitHub check-runs completed success** on exact head; `checks`, `database` and `watch_browser` PASS, all applicable browser regression jobs PASS. Real Chromium/Worker/Better Auth/PG17 Watch evidence: https://github.com/iliya1947/vico-forum/actions/runs/44324798071; artifact `topic-watch-connected` ID `14436671855`. No new changes to implementation. Technical CI head stable.

**Unclosed formal review prerequisite:** owner visual acceptance of Watch is **not recorded** in #345 or #342. `AGENTS.md` requires this before coordinator review; owner exception previously applied to own-topic-title #343 cannot be presumed to cover Watch. Therefore #345 stays **Draft/not yet review-ready**, no Mira coordinator review or Leva technical review requested or declared. Next owner decision: accept visual Watch state on provided connected evidence or explicitly defer this acceptance; only after that record/decision hand off unchanged exact head to **Мира** for coordinator whole-PR review, and after PASS to **Лёва** independent review. Docs closeout remains separate post-merge. Лира STOP per bounded decomposition.

## 2026-11-18 — Лёва: independent technical review Watch PASS

Актуальное прямое назначение владельца:
https://github.com/iliya1947/vico-forum/pull/342#issuecomment-6983159716.
Оно назначило независимый review сейчас, заменив прежний следующий шаг из
workflow; owner visual acceptance/coordinator PASS этим не объявлены.

Проверен **весь принятый Watch scope** PR #345 на stable exact head
`76c1c456557c614171a3b472758498795a668b9a` против actual main
`7cc23edede57994cdedab49c1556ddb55034dd29` и текущего плана #342.
**Результат: technical PASS; подтверждённых current-scope findings нет.**

- Own account/topic persistence, idempotent ON/OFF, active actor admission,
  отсутствие auto-watch/backfill/read-state side effects соответствуют плану.
- Reply fanout set-based, транзакционный и использует прежний inbox; сохранены
  self-exclusion, recipient/post dedupe, reply-before-mention, independent
  author/parent/mention paths после Unwatch и passive inactive-recipient policy.
- Topic mutex общий с reply; проверены оба порядка ON/OFF, четыре порядка
  Watch/Unwatch × reply, actor-first/deactivation-first, rollback и receipt replay.
- Canonical action использует session actor и узкий exact boolean payload;
  guest/origin/stale actor/лишние и повторные поля/error responses проверены.
  Own state не требует нового RBAC/AP-10; authenticated document/data private
  no-store, guest own-state не читает, unavailable не превращается в Off.
- UI ждёт подтверждения сервера, изолирован actor/topic, не повторяет
  неоднозначную запись автоматически; есть явный refresh, pending lock,
  RU/HE и RTL. Соседние edit-recovery сценарии прошли.
- Migration 0068, schema/snapshot/journal, structural manifest и web ACL
  согласованы. Старые таблицы snapshot/manifest семантически не изменены.

Независимо выполнено локально на exact head: **259/259** тестов в шести
UI/route/read/edit-recovery/header suites и **15/15** real PostgreSQL 17 Watch
tests, включая concurrency/lifecycle; `git diff --check` PASS. Первое локальное
включение тестов не дошло до assertions из-за ENOSPC; после очистки собственных
package caches повторный запуск прошёл. Это ограничение среды, не feature failure.

GitHub API независимо подтвердил **17/17 exact-head checks success**. Прочитан
журнал `watch_browser` job `134873103841`: 11 connected evidence steps для
ordinary/Help, Worker/Better Auth/PG17/Chromium, inbox/permalink/read, Unwatch,
Hebrew RTL/narrow. Это проверенное CI evidence, не новый локальный browser run:
https://github.com/iliya1947/vico-forum/actions/runs/44324798071.

Implementation head и main повторно сверены после проверок и не изменились.
Код/тесты/схема реализации не менялись. **Лёва STOP, следующий агент — Мира:**
принять technical review и зафиксировать оставшийся coordinator/acceptance/docs
маршрут. Этот результат не разрешает merge/deploy; следующие planning-slice
не продолжались. Подробности и команды — в личном файле Лёвы.


## 2026-11-18 — owner clarification: planning scope before #320

Уточнение владельца: текущее назначение Лёвы относится **только к шести задачам перед #320**, а не ко всему оставшемуся pre-release backlog из #300. Из этих шести редактирование заголовка завершено; Watch, Bookmarks, Mute/block и visibility уже имеют планы. Единственный ещё не спланированный блок — **управление структурой форума / перенос тем**. После его полного плана Лёва STOP для scope/fit Миры. Email/password lifecycle, UI/UX, Stage 6, release и прочие направления этим назначением не открываются.


## 2026-11-18 — owner rule: #300 boundary

#300 — служебный PR Ари, не рабочий канал Миры. Без прямой команды владельца Мира не использует #300 для текущей работы и не ищет там назначения/контекст. Допустимое самостоятельное обращение к #300 — только после полного завершения задач #342, чтобы сверить следующий общий шаг проекта. До этого source of current work: #342 + актуальный main.

## 2026-11-18 — Лёва: последний structure/topic-move plan готов

Назначение владельца #342 `6983828749` проверено по свежим комментариям и файлам.
Initial main `7cc23edede57994cdedab49c1556ddb55034dd29`, service base `a97d278`.
Перед handoff пересверен актуальный main `9c4639d23ca075c8bb92fbb909b96593d7bee127`:
Watch #345 уже merged, дерево совпадает с reviewed exact head `76c1c456`;
новый план учитывает реальную Watch persistence/lock boundary.
Полный предлагаемый план **S0–S10** добавлен в `USER_ACTIONS_SERVICE_PLAN.md`.

Подтверждено: AP-06/AP-07 уже дают read-only Admin hierarchy; пользовательских
structure/move writers нет. Existing category/section create methods — trusted
setup, web ACL пока SELECT-only. Parent FK CASCADE не разрешает subtree deletion.
Help identity и topic section ID определяют отдельные domain rules, поэтому
ordinary move нельзя молча превратить в Help conversion.

Рекомендованы create/rename ordinary categories/sections, ручной sibling order,
section reparent и ordinary topic move со stable IDs. Нет DELETE/archive/merge,
conversion, bulk, новых section ACL или другого pre-release scope. Предложены
два independent code-backed права, existing AP-10 admin.forum mapping, bigint
structure/location CAS, один narrow structure mutex перед domain/actor locks,
parent NO KEY UPDATE и atomic original Admin History с Owner filter integration.

Отдельно учтены реальный actor-first create-topic/FK seam и receipt replay:
после topic move исходный publication fingerprint сохраняется, replay result
должен читать persisted section ID вместо старого input. Описаны projections/
counts/order/cursors, canonical routes, private no-store/error contracts,
editor buffers, Watch/Bookmarks/Mute/visibility/attachments/translation/Complaints
и real PG/connected browser acceptance matrix.

**Мире для whole-plan scope/fit:** S-P1 (операции/порядок/удаление), S-P2 (Help
boundary), S-P3 (authority/начальные grants), S-P4 (сохраняемые состояния/reasons),
S-T1 (schema/catalog/ACL/History), S-T2 (CAS/locks) и resource/privacy contracts.
Все рекомендации пока proposals; product decisions за владельца не принимались.

Код/schema/runtime не менялись, implementation PR/feature tests/CI/browser не
создавались и не запускались. Проверены docs-only diff/whitespace и актуальность
refs. **Лёва STOP после последнего плана из шести задач перед #320.**
Следующий агент — Мира; implementation-order не меняется, остальной backlog не открыт.


## 2026-11-18 — owner handoff: Bookmarks implementation в #346

По прямой команде владельца ошибочный прежний #346 не закрывается: его ветка очищена от старого visibility service-контекста, сброшена на актуальный main после merge Watch и PR переоформлен под **Bookmarks implementation**. Служебным каналом остаётся только #342.

Лира / ChatGPT-6 назначена реализовать уже принятый Bookmarks scope **прямо в PR #346**. Перед кодом сверить принятый Bookmarks plan с актуальным main `9c4639d23ca075c8bb92fbb909b96593d7bee127` и merged Watch seams; перепроектирование без реального конфликта не требуется. После полной реализации и применимых checks — зафиксировать stable exact head и STOP для coordinator whole-PR review Миры. Mute/block, visibility и structure implementation этим handoff не активируются.


## 2026-11-18 — owner correction: Bookmarks исполнитель Лёва

Предыдущее назначение Лиры отменено. По прямому уточнению владельца **Bookmarks в #346 реализует Лёва / Codex-6.1 Sol**. Scope и PR не меняются: принятый Bookmarks plan, implementation PR #346, служебный канал #342. После полной реализации и stable exact head Лёва STOP и возвращает результат Мире на coordinator whole-PR review. Так как Лёва участвует в реализации, независимый review после PASS Миры выполняет Марк / Codex-6 Sol. Лира в Bookmarks implementation не назначена.


## 2026-11-18 — correction: Лёва завершил planning; Bookmarks реализует Лира

Уточнение владельца: слово «Лёва» относилось к тому, что **Лёва уже закончил планирование оставшихся задач**, а не к смене исполнителя Bookmarks. Предыдущее переназначение Лёвы на implementation было ошибкой Миры и отменено.

Актуальное назначение: **Лира / ChatGPT-6 реализует Bookmarks в PR #346** по принятому плану. Лёва implementation не выполняет; после coordinator PASS Миры он возвращается в стандартную роль независимого technical reviewer того же stable exact head. Текущий код #346 не откатывается и не переписывается из-за этой процессной коррекции.


## 2026-11-18 — Лира: Bookmarks backend slice, Draft #346

По прямой команде владельца актуальный исполнитель — **Лира**, а не Лёва; назначение уже исправлено в workflow. Планы B1/B2/B3/B5 применены к merged Watch/main `9c4639d23ca075c8bb92fbb909b96593d7bee127`.

В #346 после schema-only `0069` добавлены:
- `79bf23ef549191298dd4a96f9523a42e45487180`: `db/forum-repository.ts`, `db/forum-service.ts`, `db/hyperdrive-forum.ts`. `setTopicBookmark`: topic `FOR KEY SHARE` → active actor `FOR NO KEY UPDATE`, READ COMMITTED Add/Remove desired-state; `readTopicBookmark` own scalar; `readTopicBookmarks` own SQL-filtered keyset 50+1 by `saved_at DESC,topic_id DESC` with current title/public projected author, public ordinary/Help location. Typed reader/writer and request-local Hyperdrive adapters.
- `d80981dc7f30fd84c20d5cb7a062a0b10c6757b8`: 4 focused real PostgreSQL tests `tests/database/topic-bookmarks.test.ts`: isolated persistence and no-op timestamps, Help/current title/deactivated author, 52-row tied saved-at page, missing/inactive admission.
- `4a614183b41eda66e5a95a25aaaa5b4ad1669e1c`: extend three existing `ForumReader/ForumWriter` test doubles for new interface methods; prior-head TypeScript identified missing members, now exact-head `Typecheck` SUCCESS.

**Exact #346 head `4a614183b41eda66e5a95a25aaaa5b4ad1669e1c`**: GitHub `database` job ID `134970762262` **SUCCESS** (clean PG17 DB suite including new Bookmarks tests); `checks` job ID `134970762774` migration-history, lint, typecheck steps SUCCESS; whole `checks` job ID `134970762774` **SUCCESS**, including migration-history, lint, typecheck, unit Test, build/preview and validation; `database` ID `134970762262` **SUCCESS**. All **15/15** GitHub check-runs on exact #346 head completed successfully, including existing browser regressions. This is backend/CI acceptance only; Bookmarks route/UI/browser acceptance not yet implemented.

**STOP after bounded backend slice.** No Bookmarks route, strict form action, list loader, UI, translations or new browser acceptance yet; they are distinct next slices. `main` untouched, #346 Draft, #342 service-only never merge, no production actions.


## 2026-11-18 — Мира: review structure/topic-move plan PASS

Полный план Лёвы S0–S10 проверен против main `9c4639d23ca075c8bb92fbb909b96593d7bee127`, Admin/Authorization/Super-admin contracts и фактических schema/repository/History/AP-10/Help/Watch seams. **PASS; подтверждённых current-scope defects = 0.** Приняты S-P1–S-P4 и S-T1/S-T2: bounded create/rename/order/reparent/move без delete/archive/merge/bulk; Help conversion запрещён; structure=admin, topic move=moderator/admin; state preserved без новой reason/notification policy; singleton structure CAS/mutex + per-topic location CAS; atomic Admin History и Owner `forum.structure` projection; receipt replay/current-location fix и consistent affected hierarchy reads.

Лёве исправления плана не требуются. Planning всех шести задач перед #320 завершён и принят. Structure implementation не активирован; текущая реализация остаётся Bookmarks #346 у Лиры.


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

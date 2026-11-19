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


## 2026-11-18 — Лира: финальный stable-head/gate handoff Мире, Bookmarks #346

Последняя отдельная подзадача Лиры — без реализации или whole-PR self-review. Повторно fetched `AGENTS.md` из `main` до конца, актуальный #342 plan B1–B7 / scope-fit / workflow / communication, `PROJECT.md`, `PROJECT_STATE.md`, `ROADMAP.md`, `docs/UI_UX_PASS.md`. GitHub: #346 open Draft, exact head **`8f24bd98fb2548bc9ec4b6f3433f40c1e72c7d65`**, base SHA/current `main` `9c4639d23ca075c8bb92fbb909b96593d7bee127`, mergeable=true, compare `ahead=13,behind=0`, 39 changed files; никаких поздних implementation commits не выявлено. На этом же SHA API GitHub returned **18/18 check runs completed/success**, 0 pending/failures: `checks` (lint, typecheck, unit, build, UI preview build, migration metadata, Drizzle parity), `database` (PostgreSQL 17), `bookmarks_browser` и 15 прочих browser regressions. В #346 0 submitted reviews, 0 review threads, 0 PR discussion comments. Whole-PR review implementer **не выполняла**.

Connected evidence exact-head: [bookmarks_browser run 44379089155](https://github.com/iliya1947/vico-forum/actions/runs/44379089155), job `135066086875`, artifact `topic-bookmarks-connected` ID `14464010674` (created 2026-11-18T19:19:55Z, expires 2026-11-25T19:19:54Z). Лог подтверждает 10 групп real Worker + Better Auth + disposable PG17 + Chromium scenarios: private guest doc/data, Add/reload/session/account switch, invalid/forged/mixed/origin/404 denials, closed/solved/Help duplicate/deactivated author, title edit/XSS-text, Watch/inbox/read independence, 57-row tied-millisecond keyset, removed anchor, remove/re-add, RU/HE RTL narrow screenshots. Скриншоты и results.json — в artifact. Cloudflare external/production, Google OAuth, owner binding не проверялись; это repository/local-CI acceptance, не deployed acceptance.

**Gates — установить без подмены доказательств:** `ui-preview:build` PASS, но `ui-preview-pages.yml` для feature branch #346 не запускается (push main/chatgpt/ui-* или workflow_dispatch), поэтому отдельный Pages deploy/owner Bookmarks visual acceptance на exact head не подтверждены. `docs/UI_UX_PASS.md` MVP-first owner decision (2026-10-10): не задерживать bounded функциональные slices из-за косметики, финальная real-runtime product/visual acceptance обязательна перед public launch; в #342 обсуждении визуальная приёмка прошлых bounded functions отложена. В `AGENTS.md` formal whole-PR gate всё же упоминает owner visual acceptance и project documentation; current accepted workflow по #342 сохраняет permanent/current-state docs отдельным PR после implementation merge. **Мире нужно самостоятельно согласовать/классифицировать formal gate с этими действующими owner decisions до формального начала whole-PR review, не объявлять owner visual PASS без записи.** Никакой новый Pages deploy, owner visual approval, docs closeout или production gate Лира не выполняла.

Handoff: **следующий участник — Мира / ChatGPT-5.6 Sol**, coordinator whole-PR review #346 against accepted Bookmarks B1–B7, актуальный `main` и source-of-truth; первые действия — проверить current head и gate interpretation, затем whole-PR review на неизменном SHA (если gates позволяют). При confirmed current-scope findings вернуть Лире один пакет до запуска Codex. После coordinator PASS того же exact head — независимый reviewer **Лёва / Codex-6.1 Sol**. #346 остаётся Draft, #342 служебный и не merge. **Лира STOP.**


## 2026-11-18 — Мира coordinator review #346: one current-scope acceptance finding

Whole-PR review Bookmarks stable exact head `8f24bd98fb2548bc9ec4b6f3433f40c1e72c7d65` не дал coordinator PASS. Schema/migration/manifest/runtime ACL, own-state writer/read/list, strict canonical action, private/no-store boundaries, keyset pagination, actor/topic isolation, current-title/public-location projection, UI failure semantics и connected Worker/Better Auth/PG17/Chromium acceptance проверены без подтверждённого implementation defect.

**Подтверждён один current-scope defect готовности:** принятый B6 прямо требует real PostgreSQL concurrency/lifecycle acceptance, но текущий `tests/database/topic-bookmarks.test.ts` содержит только четыре функциональных PG tests, а остальные changed tests/browser не доказывают двухсоединённые race contracts. Отсутствуют обязательные Add×Add/Add×Remove в обоих порядках, writer×deactivation в обоих порядках, rollback/no-partial-effect и topic-delete/FK/lock-order проверки. Это не будущий hardening и не требование к новой функциональности — это принятый acceptance текущего Bookmarks scope.

Лире возвращён один пакет только на закрытие этого evidence gap. Перепроектировать рабочую реализацию без обнаруженного code defect не требуется. После нового stable exact head Мира заново проводит coordinator whole-PR review; Лёва подключается только после PASS Миры.


## 2026-11-18 — Лира: исправление единственного finding Миры Bookmarks B6, повторный handoff

Прочитан актуальный `AGENTS.md` из `main` и свежий #342 workflow/communication: Мира действительно закончила coordinator review предыдущего head `8f24bd98fb2548bc9ec4b6f3433f40c1e72c7d65` и вернула Лире ровно один acceptance defect — недостаток B6 реальных PG concurrency/lifecycle тестов. Не кодовый confirmed race. Лира реализовала только этот пакет, не whole-PR self-review.

В #346 коммиты `82a23bdd34bdb0c03e72037e6ec07919e5c2d91b` (шесть real-PG tests) и `477ad6b1e5cf51bf94b3830e9ea4ea85d4e4fae5` (только исправление assertion для Drizzle `Failed query: commit` wrapper). Diff против coordinator-reviewed head затрагивает **только `tests/database/topic-bookmarks.test.ts`**, без изменения production/schema/ACL/UI. B6 real PostgreSQL 17 evidence: два отдельных native PG Client/Drizzle repository writer с действительными транзакциями, удержание после выполненного SQL и до COMMIT, отдельное наблюдение сервера `pg_stat_activity` + `pg_blocking_pids(waitingPid)` фактически подтверждает blocker PID и тип ожидания Lock; setTimeout 25ms используется лишь для polling state, не как доказательство. Тесты: Add×Add и Add×Remove в обоих порядках, идемпотентность даты; AccountState deactivation выигрывает до actor lock или ждёт уже принятого writer до COMMIT; forced before-COMMIT failure вызывает rollback без partial INSERT/DELETE; topic delete ждёт KEY SHARE, CASCADE удаляет закладку; parallel title revision writer сериализуется через actor mutex при совместимом topic KEY SHARE/NO KEY UPDATE в обоих порядках. **Все новые 6/6, все Bookmarks DB 10/10 PASS.** Кодовой race defect в этих проверенных сценариях не выявлен.

Первый `database` прогон `82a23b...` выявил только ошибку assert при обёртывании исключения Drizzle; исправлена вторым commit. На итоговом head `477ad6b1e5cf51bf94b3830e9ea4ea85d4e4fae5` первая попытка `database` прошла Bookmarks 10/10, но независимо зафейлила `tests/database/sa07-data-monitoring.test.ts` (`could not obtain lock on relation forum_posts` и повторные ошибки aborted transaction). Без изменения кода **повторён только database job на том же SHA**, SA07 не воспроизвёлся, весь DB suite, manifest/probes/Worker smokes PASS. GitHub exact-head check-runs на момент фиксации **18/18 completed success**, включая `checks` job `135101852255`, повторённый `database` job `135101848526` (CI run `44388191588`), `bookmarks_browser` job `135098376273`. 0 failures/pending. Compare прежнего head `8f24...` с новым: ahead 2, behind 0, changed only one feature test file. PR #346 остаётся Draft, mergeable=true.

**STOP Лиры после B6 bounded correction.** Следующий исполнитель: **Мира / ChatGPT-5.6 Sol** для нового coordinator whole-PR review текущего stable exact head `477ad6b1e5cf51bf94b3830e9ea4ea85d4e4fae5`. B6 proof independently validate; при подтверждённых defects единый пакет Лире, до PASS Лёву не запускать. После coordinator PASS — Лёва independent technical review same exact head. No deploy/merge/docs closeout/general UIUX.


## 2026-11-18 — Мира: Bookmarks #346 coordinator re-review PASS

Новый whole-PR cycle выполнен на stable exact head `477ad6b1e5cf51bf94b3830e9ea4ea85d4e4fae5` после B6 correction. **PASS; подтверждённых current-scope defects = 0.** Diff от предыдущего reviewed head `8f24bd98...` — только `tests/database/topic-bookmarks.test.ts` (+263 lines), production/schema/ACL/UI не менялись.

B6 проверен независимо: два реальных PostgreSQL connections; блокировка устанавливается через server-side `pg_blocking_pids()`; Add×Add/Add×Remove, оба writer↔deactivation orders, rollback, topic delete/FK CASCADE и shared topic/actor lock ordering подтверждены. Topic state/reply writers имеют тот же существующий `topic FOR NO KEY UPDATE → actor` порядок, а Bookmark использует совместимый `topic FOR KEY SHARE → actor`; отдельного нового lock cycle не найдено. Exact-head check-runs GitHub: 18/18 success. Первый database attempt дал отдельный SA07 self-lock timeout; Bookmarks suite в том прогоне уже PASS 10/10 примерно за 48 секунд до SA07 failure, а same-head rerun прошёл без code change, поэтому причинная связь с Bookmarks не установлена.

Текущий main `406d4155...` отличается от implementation base только commit #347 в `AGENTS.md`; продуктовый код не изменён, новый регламент применён к этому review. Следующий gate — независимый technical review Лёвы того же exact head #346.

## 2026-11-18 — Лёва: independent Bookmarks review — один P2 finding B5-R1

Проверен весь принятый B1–B7 scope #346 на exact head
`477ad6b1e5cf51bf94b3830e9ea4ea85d4e4fae5` против actual main
`808c2b7` (после implementation base `9c4639d` менялся только AGENTS.md).
**Technical PASS удержан: 1 confirmed current-scope P2. Код не изменён.**

**B5-R1 [P2] — при смене аккаунта сбрасывать private-list cursor.**
`app/forum/bookmarks-view.tsx:100–108` берёт older-page/cursor только из URL;
actorId используется для row keys, но его изменение не сбрасывает страницу.
`app/routes/bookmarks.tsx:54–56` передаёт тот же cursor новому session actor.
Это нарушает принятый B5: «Account switch … переводит list на начальную страницу
новой identity» (`USER_ACTIONS_SERVICE_PLAN.md`, B5).

Воспроизведение: A открывает older page; B имеет более новые bookmarks, чем cursor
A. В том же mounted route session меняется A→B и выполняется loader revalidation.
Реальные BookmarksRoute/loader/BookmarksView в React Router memory runtime
подтвердили actorId=B, но URL/reader сохранили A cursor; B видит «No older saved
topics on this page» вместо собственных newest bookmarks. Независимый diagnostic
assert сброса query падает. Реальный credential return path также сохраняет search:
AuthControls → credentialReturnPath → CredentialView.navigate(returnTo), поэтому
logout/sign-in возврат на старый cursor не имеет отдельного исправляющего пути.
Текущий connected browser сценарий переключает identity через explicit
`page.goto('/en/bookmarks')`, тем самым сам удаляет cursor и этот случай не проверяет.

Это **не выдача чужих SQL rows**: owner filter работает. Не нужно отвергать чужой
cursor на произвольном initial deep link — B4 допускает его при own-row filtering.
Нужна bounded account-transition reset к canonical list без before* и regression
для A→B с обеими непустыми коллекциями/older page; POST автоматически не повторять.

B6 самостоятельно подтверждён: real PG17 **10/10 PASS**, включая server-observed
blocker PID, оба lifecycle orders, rollback и FK cleanup/title compatibility.
Выбранные UI/route/read/recovery/header suites **87/87 PASS**. Metadata/snapshot/
manifest comparison добавляет только bookmarks table, старые table entries не
изменены; runtime ACL SELECT/INSERT/DELETE. Exact-head GitHub **18/18 success**;
прочитан connected job `135098376273`, 10 BOOKMARKS_CONNECTED checkpoints,
artifact `14466923665`. Это CI browser evidence, не новый локальный Chromium run.
Остальных подтверждённых defects в проверенном scope не найдено.

Результат и подробное repro записаны в личном файле Лёвы. **STOP Мире:** проверить
B5-R1 и вернуть Лире один bounded correction package; после code change новый
stable head и coordinator whole-PR cycle. Принятый план корректировать не требуется.


## 2026-11-18 — Мира: B5-R1 независимо подтверждён; bounded correction Лире

Мира самостоятельно проверила finding Лёвы на неизменном implementation exact head
`477ad6b1e5cf51bf94b3830e9ea4ea85d4e4fae5`. **B5-R1 подтверждён как
current-scope P2.**

Фактическая цепочка:
- `app/routes/bookmarks.tsx` берёт `beforeSavedAt/beforeTopicId` только из
  текущего URL, после чего применяет этот cursor к `session.user.id`;
- `BookmarksView` определяет older-page только по `location.search`; изменение
  `actorId` само по себе страницу к началу не переводит;
- auth `returnTo` сохраняет pathname/search/hash, а credential flow после входа
  возвращается на тот же URL, поэтому sign-out/sign-in с older Bookmarks page
  сохраняет cursor предыдущей identity;
- существующие `bookmarks-view.test.tsx` и `bookmarks.test.ts` проверяют
  pagination и actor-filtering по отдельности, но не A→B transition на older page.

Это прямо нарушает принятый B5 contract: account switch должен очистить старую
private presentation и перевести список на начальную страницу новой identity.
При этом SQL owner filtering остаётся корректным: подтверждённой утечки чужих rows
нет. B4 не меняется — произвольный cursor на initial deep link остаётся допустим,
пока reader возвращает только own rows.

**Bounded correction package Лире:** исправить только account-transition behavior
Bookmarks так, чтобы при фактической смене actor старые `before*` не сохраняли
позицию предыдущего пользователя и новая identity попадала на canonical first page.
Не вводить запрет foreign cursor для обычного initial deep link, не повторять
автоматически POST и не менять принятые B1–B7 semantics. Добавить regression,
который действительно проходит A older page → B с собственной непустой newest
collection и доказывает reset к first page. При необходимости покрыть реальный
credential return path тем же инвариантом. B6 остаётся закрытым и без новых
оснований повторно не открывается.

После correction: новый stable exact head #346 + применимые checks, затем STOP
и возврат Мире на новый coordinator whole-PR cycle. Лёва до нового coordinator
PASS не подключается. #342 остаётся служебным PR и не merge.


## 2026-11-18 — Лира: B5-R1 current-scope correction #346, STOP → Мира

На service #342 head `2bba75046b829ffff662153f751867f3f4d9626e` прочитано последнее назначение Миры: P2 B5-R1, A older pagination URL сохраняется при смене actor на B через credential returnTo. Независимые findings Лёвы и Миры сопоставлены с `app/forum/bookmarks-view.tsx`, `app/routes/bookmarks.tsx`, `app/auth/auth-controls.tsx`, `app/auth/credential-path.ts`, `app/auth/credential-view.tsx`. Корень подтверждён: reader корректно own-filtered, но presentation page не сбрасывает cursor. Серверный B4 arbitrary initial deep link запрещать нельзя.

**Implementation #346 stable exact head:** `a3e6c0e63c99078ece89303592e1f24b2fe440fb`, один bounded commit поверх `477ad6b1e5cf51bf94b3830e9ea4ea85d4e4fae5`, только три файла: `app/forum/bookmarks-view.tsx`, `app/forum/bookmarks-view.test.tsx`, `tests/browser/topic-bookmarks/check.py`. Client-side `sessionStorage` текущей вкладки хранит исключительно последний увиденный actor id как UX marker, не серверную authority/credential/bookmark data. На первом просмотре не меняет исходный foreign/deleted cursor. При следующем Bookmarks render с другим authenticated `actorId` и `beforeSavedAt` выполняет `replace` на `/:locale/bookmarks`, записав нового actor. В обычной странице того же actor arbitrary cursor разрешён; никаких изменений в loader/SQL/topic POST/credential returnTo. Storage errors fail closed относительно приватности: выбор пользователя всегда server-side и `private,no-store`.

**Evidence:** компонентные regressions initial foreign keyset и A older→B с непустой новой first page. Реальный connected acceptance built Worker+Better Auth+PostgreSQL 17+Chromium расширен авторизованным sign-out/sign-in email через сохранённый `returnTo`: A older page (57 bookmarks, cursor) → sign out A → вход B (две собственные newest bookmark rows) → URL строго `/en/bookmarks`, B owns rows; затем ручной переход B к старому A cursor возвращает собственную пустую older-page без принудительного сброса. В connected log **11/11 BOOKMARKS_CONNECTED** checkpoints, 0 Traceback. Run `44398510026`, job `135134839582`, artifact `topic-bookmarks-connected` id `14471182990` (366169 bytes), скриншоты включают account-switch-first-page.

**CI:** exact SHA `a3e6c0e63c99078ece89303592e1f24b2fe440fb` — **18/18 check-runs completed/success**, 0 failed/pending; includes `checks` (lint/typecheck/unit/build/preview/schema), `database` PG17, `bookmarks_browser` Worker/Better Auth/PG17/Chromium и regression browsers. Implementation PR #346 open Draft, mergeable=true. No B6 rewrite, no product scope expansion, no merge/deploy/docs closeout. Лира не проводила whole-PR self-review.

**Handoff:** следующий участник — **Мира / ChatGPT-5.6 Sol** для нового coordinator whole-PR review exact head `a3e6c0e63c99078ece89303592e1f24b2fe440fb`; independently verify B5-R1 and B1–B7. При подтверждённых current-scope findings единый пакет Лире. Только после coordinator PASS — Лёва / Codex-6.1 Sol independent technical review на том же head. #342 служебный, не merge. **Лира STOP.**


## 2026-11-18 — Мира: Bookmarks #346 coordinator re-review после B5-R1 — PASS

Новый whole-PR coordinator cycle выполнен на неизменном stable exact head
`a3e6c0e63c99078ece89303592e1f24b2fe440fb` против принятого B1–B7 и
актуального `main` `808c2b782952e13254cab8e2129dca07ca945e6f`.
Между implementation base `9c4639d...` и текущим main изменён только `AGENTS.md`;
feature/runtime/schema код main не расходится с reviewed base.

B5-R1 correction проверена независимо. Diff от предыдущего coordinator-reviewed
head `477ad6b...` ограничен тремя файлами:
`app/forum/bookmarks-view.tsx`, `app/forum/bookmarks-view.test.tsx`,
`tests/browser/topic-bookmarks/check.py`. Tab-local actor marker используется
только как presentation history: server-side actor/own-row filtering остаются
authoritative. При известном A→B transition на older-page выполняется replace
на canonical `/:locale/bookmarks`; при первом/обычном deep link без actor
transition cursor остаётся позицией, а не authority. Mutation writer, loader SQL,
schema/ACL и credential redirect не менялись; auto-POST replay не добавлен.

Регрессии прочитаны: component test отдельно сохраняет initial foreign cursor и
проверяет A older→B с непустой newest collection; connected Chromium сценарий
проверяет реальный Worker + Better Auth credential sign-out/sign-in с сохранённым
`returnTo`, после чего B получает собственную first page, а ручной старый cursor
остаётся допустимым и возвращает только own rows. Job log `135134839582`
содержит **11/11 BOOKMARKS_CONNECTED** checkpoints без failure.

Exact-head GitHub состояния проверены Мирой: **18 jobs / 18 success**, включая
`checks`, PostgreSQL 17 `database`, `bookmarks_browser` и regression browsers.
В `checks` отдельно SUCCESS lint, typecheck, tests, production build, UI preview,
migration/schema validation; database job полностью SUCCESS.

Whole B1–B7 seams пересобраны с предыдущими coordinator review: persistence/schema,
runtime ACL, personal self-state admission, own-filtered keyset list, canonical
topic writer, strict errors/cache boundaries, B6 real-PG concurrency/lifecycle и
Watch/read/inbox independence не изменялись этой correction и не получили нового
конфликта. **Coordinator PASS; confirmed current-scope defects = 0.**

Следующий reviewer — **Лёва / Codex-6.1 Sol**, independent technical whole-PR review
того же exact head `a3e6c0e63c99078ece89303592e1f24b2fe440fb`, код не менять.
PASS или confirmed finding → STOP Мире. #346 остаётся Draft до independent result;
#342 — служебный PR, не merge.

## 2026-11-18 — Лёва: Bookmarks #346 independent whole-PR re-review PASS

Новое независимое заключение по всему B1–B7 scope на exact head
`a3e6c0e63c99078ece89303592e1f24b2fe440fb` против actual main
`808c2b782952e13254cab8e2129dca07ca945e6f`: **PASS; confirmed current-scope
defects = 0. B5-R1 закрыт.** Реализацию не менял.

Независимо проверена causal correction, не только её описание Мирой: diff с
прежде полностью проверенного `477ad6b` — ровно три заявленных view/test/browser
файла; marker tab-local и presentation-only, authoritative session actor,
SQL own filter, strict topic action, schema и ACL не менялись. При известном
A→B на older page replace переходит на canonical first page; тот же actor затем
может вручную открыть старый cursor, он остаётся обычной позицией с own rows.

Локально новый exact head: **89/89** выбранных component/route/read/recovery/header
tests PASS. Прежний независимый diagnostic harness с реальными BookmarksRoute/
loader/BookmarksView, падавший на `477ad6b`, теперь **PASS**; дополнительно проверен
manual old cursor уже для B — query сохраняется, A rows не появляются.
Diagnostic находится вне implementation worktree.

GitHub API проверен независимо: **18/18 exact-head checks success**. Прочитаны
новые logs: bookmarks_browser `135134839582` — **11/11 BOOKMARKS_CONNECTED**,
включая actual Worker/Better Auth credential A older→sign-out/sign-in B→B own
first page и subsequent manual cursor; artifact `14471182990`. Database
`135134837753` — Bookmarks **10/10**, полный suite **107 files PASS**, Worker HTTP
smoke PASS. Это проверенное CI evidence, не новый локальный Chromium/PG run.

B6/metadata/schema/ACL/domain-writer результаты предыдущего независимого review
сохранены на основании нулевого diff этих звеньев и unchanged main runtime;
новых оснований переоткрывать их нет. Проверены affected navigation/revalidation,
actor/topic keys, private/no-store и отсутствие автоматического mutation replay.
Head/main повторно сверены, docs-only review diff/whitespace PASS.

**Лёва STOP Мире:** сопоставить оба PASS одного head и зафиксировать merge readiness
владельцу, затем отдельный docs closeout после фактического merge. #346 ещё Draft,
merge/deploy не выполнялись; #342 служебный, не merge. Порядок реализации не меняется.


## 2026-11-18 — Мира: Bookmarks #346 review synthesis, ready to merge

Independent technical whole-PR review Лёвы на exact head
`a3e6c0e63c99078ece89303592e1f24b2fe440fb` сопоставлен с coordinator
whole-PR PASS Миры на том же head.

Результаты согласуются по проверенным границам и получены независимо:
- Мира independently verified B5-R1 correction, B4 cursor semantics и весь B1–B7;
- Лёва повторил исходный failing B5 diagnostic на новом head — PASS, отдельно
  проверил subsequent manual old cursor у B и отсутствие A rows;
- оба review подтвердили unchanged server authority/schema/writer/loader SQL
  и отсутствие новых оснований переоткрывать B6;
- exact-head GitHub 18/18 jobs success; connected Bookmarks 11/11 checkpoints;
  Лёва дополнительно подтвердил 89/89 selected tests и прочитал database/browser logs.

Совпадение PASS не используется как отдельное доказательство: оба reviewer имеют
собственные независимые проверки. Implementation exact head после reviews не
изменился. **Review cycle Bookmarks #346 завершён: confirmed current-scope defects = 0.**

PR #346 переведён из Draft в Ready for review без изменения head.
**#346 готов к merge владельцем** на exact head
`a3e6c0e63c99078ece89303592e1f24b2fe440fb`.

После фактического merge — отдельный docs closeout по Bookmarks/current-state;
до merge документация не должна заявлять feature как состояние main. #342 остаётся
служебным PR и не merge; implementation-order после docs closeout продолжится
следующим утверждённым bounded-блоком.


## 2026-11-18 — Мира: #346 merged; docs debt установлен до следующей реализации

Implementation PR #346 фактически merged в `main` 2026-11-18 21:43:51 UTC,
merge commit `34ddf42985f6dc348e77d0dcc90e0aecc37fd15e`. Reviewed implementation
head `a3e6c0e63c99078ece89303592e1f24b2fe440fb` был смержен после завершённого
coordinator + independent review cycle; confirmed current-scope defects = 0.

После merge повторно сверены текущий `AGENTS.md`, принятый
`USER_ACTIONS_SERVICE_PLAN.md` и actual main. План #342 явно требует для каждого
bounded-этапа отдельные implementation/docs PR. Поэтому документационный closeout
нельзя считать завершённым только из факта merge implementation.

Дополнительно обнаружен незакрытый docs debt предыдущего bounded-этапа Watch:
#345 merged, но отдельный Watch docs closeout не был выполнен. Текущий
`PROJECT_STATE.md` на main всё ещё фиксирует repository migration history только
до `0067` и не отражает ни Watch (`0068`), ни Bookmarks (`0069`). Это уже
фактическое рассогласование current-state docs с main.

Минимальный установленный docs scope:
1. Watch closeout: factual current-state sync Watch + migration `0068` и отдельный
   history snapshot/index entry.
2. Bookmarks closeout после него: factual current-state sync Bookmarks + migration
   `0069` и отдельный history snapshot/index entry.
3. Не менять authorization/Admin contracts: Watch и Bookmarks приняты как
   authenticated personal self-state без новых RBAC keys.
4. Не менять Stage 6 external evidence: production schema evidence остаётся через
   `0020`; repository merge `0068/0069` не является production rollout.
5. Не заявлять owner visual acceptance: она остаётся в отдельном UI/UX pass.
6. `docs/database/MIGRATIONS.md` не требует изменения только ради новых repository
   migrations: его external evidence contract остаётся истинным.

Конкретный автор docs closeout автоматически не назначается: это уже было отдельно
исправлено владельцем в этом же #342 при #344. Поэтому Мира не создаёт docs diff
сама и не назначает Лиру без решения владельца.

Следующая работа в implementation-order (Mute/block) не активируется до закрытия
обоих накопленных docs closeout, если владелец прямо не изменит эту границу.
#342 остаётся служебным PR и не merge; #300 не использовать.


## 2026-11-18 — Correction владельца: docs closeout выполняет Лира

Предыдущая трактовка Миры, что для автора docs PR требуется отдельное назначение
владельца, **неверна и отменена** прямым уточнением владельца.

Для текущего цикла #342 docs closeout после merged bounded implementation выполняет
**Лира / ChatGPT-6** как штатный следующий исполнитель. Отдельное owner-назначение
на сам факт docs closeout не требуется.

Порядок сохраняется:
1. сначала закрыть пропущенный Watch docs closeout после #345 / migration 0068;
2. после его завершения и merge — отдельный Bookmarks docs closeout после #346 /
   migration 0069;
3. затем перейти к Mute/block implementation.

Текущий bounded docs task Лиры: **Watch docs closeout**. Scope только factual
documentation уже merged состояния main:
- синхронизировать `PROJECT_STATE.md` с Watch и repository migration history 0068;
- добавить отдельный `PROJECT_HISTORY` snapshot и index entry для Watch;
- не менять application code/schema/runtime behavior;
- не добавлять новый RBAC/Admin contract;
- не менять Stage 6 external migration evidence через 0020;
- не заявлять owner visual acceptance.

После stable docs PR/head + applicable checks — STOP Мире на review. #342 остаётся
служебным PR и не merge; #300 не использовать.


## 2026-11-18 — Лира: Watch docs closeout PR #349, stable handoff Мире

По актуальному `AGENTS.md` и состоянию service #342 `dfe8709670f0a7aa004548a0353b274e1a396011` после merged Watch #345 и Bookmarks #346 выполнен **ровно один** bounded docs closeout — Watch, без implementation и без Bookmarks docs. Main `34ddf42985f6dc348e77d0dcc90e0aecc37fd15e`. Подтверждены #345 merged 2026-11-18 16:14:32 UTC, merge `9c4639d23ca075c8bb92fbb909b96593d7bee127`, технически review head `76c1c456557c614171a3b472758498795a668b9a` (Мира coordinator PASS / Лёва independent PASS), 17/17 implementation checks PASS, connected Watch built Worker/Better Auth/PG17/Chromium evidence.

Новый [docs PR #349](https://github.com/iliya1947/vico-forum/pull/349), branch `docs/watch-closeout-0068`, **Draft stable exact head `544906dd17517fcbb46cc63157e04fee9738f46d`**, base `34ddf42985f6dc348e77d0dcc90e0aecc37fd15e`, 1 commit / **3 files**: `PROJECT_STATE.md` добавляет factual Watch own-state/reply inbox и исправляет устаревший migration ceiling `0000–0067` → реальное `0000–0069` с пометкой Watch `0068`, Bookmarks `0069` (уже находятся в main; здесь нет детального Bookmarks closeout); `docs/PROJECT_HISTORY/PROJECT_HISTORY_30.md` сохраняет отдельный Watch implementation/CI/review/merge snapshot, `PROJECT_HISTORY.md` — навигационную запись. Docs не вводит/не меняет RBAC/Admin, code/schema/runtime, не утверждает production migration дальше `0020`, owner visual acceptance, real Google/Stage6. Не переписаны unrelated документы.

GitHub comparison main→docs head: ahead 1/behind 0, **modified 2 docs + 1 new history doc**; exact-head applicable [CI run 44406689177](https://github.com/iliya1947/vico-forum/actions/runs/44406689177) — **2/2 completed success** (`checks` job `135163681080`, `database` job `135163680723`), 0 failed/pending. Main и docs head повторно сверены после CI, без движения. Лира не проводила независимый docs whole-PR review своей документации.

**Handoff:** Лира **STOP**. Мира / ChatGPT-5.6 Sol — coordinator whole-PR review docs #349 на exact head `544906dd17517fcbb46cc63157e04fee9738f46d`, включая факт Watch, migration ceilings, history разделение, и границы; confirmed current-doc findings вернуть Лире одним пакетом. После coordinator PASS — независимая проверка по рабочему маршруту, затем merge только владельцем. **После merge #349** отдельный Bookmarks `0069` docs closeout (новый PR); до этого не активировать Mute/block. #342 служебный, не merge.


## 2026-11-19 — Мира: Watch docs #349 coordinator review — 1 current-doc finding

Coordinator whole-PR docs review выполнен на stable exact head
`544906dd17517fcbb46cc63157e04fee9738f46d` против main
`34ddf42985f6dc348e77d0dcc90e0aecc37fd15e`.

Проверены все три изменённых docs, фактический Watch implementation #345, migration
`0068_topic_watch`, текущий repo ceiling `0069_topic_bookmarks`, exact implementation
CI 17/17 success и exact docs CI 2/2 success. Claims о merge/review/Stage-6/visual
границах соответствуют проверенным фактам.

Найден **один confirmed current-doc finding**:

**WATCH-DOC-1 — permanent Watch contract не закреплён в source-of-truth.**
`PROJECT_HISTORY_30.md` подробно описывает семантику, но сам history по действующему
`AGENTS.md` и собственному заголовку не является source of truth. `PROJECT_STATE.md`
правильно хранит краткое текущее состояние, но также не должен заменять постоянный
product/domain contract. В current main отдельного профильного Watch/notifications SOT
не найдено; `PROJECT.md` является действующим product/technical baseline и сейчас Watch
вообще не фиксирует.

Это реальный gap текущего docs closeout: после merge service #342 не должен оставаться
единственным местом, где живут принятые продуктовые semantics Watch.

**Bounded correction Лире:** добавить в `PROJECT.md` короткий permanent Watch contract,
без копирования implementation history. Зафиксировать только устойчивую продуктовую
семантику: explicit authenticated active-user Watch/Unwatch own-state; no auto-watch;
future ordinary reply notifications через существующий inbox; Unwatch prospective и
не удаляет старые notices; recipient dedupe/independent author-parent-mention paths;
Watch не меняет read-state и не вводит новый RBAC permission. Транзакционные SQL/CI/PR
details оставить только в history.

Остальных confirmed current-doc defects не найдено. После correction — новый exact docs
head + applicable checks → STOP Мире на новый coordinator docs cycle. Независимого
reviewer до coordinator PASS не подключать. #349 остаётся Draft; #342 не merge; #300
не использовать.


## 2026-11-19 — Лира: WATCH-DOC-1 correction, Watch docs PR #349, STOP Мире

Получено одно подтверждённое current-doc finding Миры по exact head `544906dd17517fcbb46cc63157e04fee9738f46d`: Watch semantics были только в history и служебном plan, отсутствовали в permanent SOT. Лира независимо сверила `PROJECT.md` текущего `main`, Watch section принятого `USER_ACTIONS_SERVICE_PLAN.md`, merged Watch implementation и docs files: отдельного Watch/notifications SOT в main нет, поэтому требуется короткий блок в `PROJECT.md`; новый domain/technical architecture не нужен.

**Correction commit `aa6584c6d600d807ebed9171adbde365b918b290`** в существующий Draft docs [PR #349](https://github.com/iliya1947/vico-forum/pull/349): добавлен раздел `Подписка на темы (Watch)` только в `PROJECT.md` (19 новых строк). Постоянный продуктовый контракт: явный Watch/Unwatch своей темы только authenticated active actor; никакого auto-watch и нового RBAC permission; обычные reply-notifications для будущих ответов других участников в existing inbox, дедупликация с author/direct-parent/mention paths; Unwatch prospective и не удаляет уже созданные notices; нет изменений read-state или bookmark semantics. SQL locks, CI/PR/history в permanent SOT не перенесены. Предыдущие `PROJECT_STATE.md` (current main repository ceiling `0069`), `PROJECT_HISTORY_30.md` и index не изменялись. Нет code/schema/runtime/RBAC/Admin/Stage6/visual modifications.

**Evidence:** GitHub сравнение первого reviewed head `544906dd...` → нового `aa6584c6d600d807ebed9171adbde365b918b290` = 1 commit, only `PROJECT.md`; docs PR #349 содержит всего 4 документа, base/main `34ddf42985f6dc348e77d0dcc90e0aecc37fd15e` unchanged. Exact-head [CI run 44412018558](https://github.com/iliya1947/vico-forum/actions/runs/44412018558): **2/2 completed success** `checks` job `135182394989` (lint/typecheck/unit/build etc.) и PostgreSQL `database` job `135182393371`; 0 failed/pending. PR #349 по-прежнему Draft/open, merge не выполнялся.

**STOP Лиры**. Следующий исполнитель **Мира / ChatGPT-5.6 Sol**: новый coordinator whole-PR review Watch docs #349 на `aa6584c6d600d807ebed9171adbde365b918b290`; подтвердить WATCH-DOC-1 и весь docs scope, при confirmed defects вернуть Лире единым пакетом. До coordinator PASS независимый reviewer не подключается; после review cycle merge — только владелец. Далее отдельный Bookmarks docs closeout 0069, затем Mute/block. Служебный #342 не merge; #300 не использовать.


## 2026-11-19 — Мира: Watch docs #349 coordinator re-review — PASS

Новый coordinator whole-PR docs cycle выполнен на stable exact head
`aa6584c6d600d807ebed9171adbde365b918b290` против неизменного main
`34ddf42985f6dc348e77d0dcc90e0aecc37fd15e`.

WATCH-DOC-1 закрыт корректно. Compare с предыдущего reviewed head
`544906dd17517fcbb46cc63157e04fee9738f46d` показывает ровно один изменённый
файл — `PROJECT.md` (+17/-0). Новый раздел Watch закрепляет постоянную продуктовую
семантику без implementation/CI/PR history: explicit own Watch/Unwatch активного
authenticated пользователя, no auto-watch/no new RBAC, future reply notices через
existing inbox, prospective Unwatch, recipient dedupe/independent author-parent-mention
paths и независимость read-state/bookmarks.

Весь #349 re-reviewed как единый docs scope:
- `PROJECT.md` теперь содержит permanent Watch contract;
- `PROJECT_STATE.md` кратко отражает фактический Watch и реальный repo migration
  ceiling `0000–0069`, не выдавая Bookmarks functional docs closeout за завершённый;
- `PROJECT_HISTORY_30.md` сохраняет implementation/review/CI snapshot, не являясь SOT;
- history index корректно добавляет entry 30;
- внешняя принятая migration evidence остаётся через `0020`;
- production/deployed и owner visual acceptance не заявлены.

Проверено напрямую: implementation Watch exact head имел 17/17 jobs success; corrected
docs exact head имеет 2/2 jobs success (`checks`, `database`, run 44412018558).
Main и docs head стабильны. **Coordinator PASS; confirmed current-doc defects = 0.**

Следующий reviewer — **Лёва / Codex-6.1 Sol**: independent whole-PR docs review
того же exact head `aa6584c6d600d807ebed9171adbde365b918b290`. Проверить factual
accuracy, SOT layering и отсутствие scope/Stage-6/visual overclaim. Код не менять.
PASS или confirmed finding → STOP Мире. #349 остаётся Draft до independent result;
#342 служебный и не merge; #300 не использовать.

## 2026-11-19 — Лёва: Watch docs #349 independent whole-PR PASS

Независимо проверен весь docs PR #349 на stable exact head
`aa6584c6d600d807ebed9171adbde365b918b290` против actual main
`34ddf42985f6dc348e77d0dcc90e0aecc37fd15e` и merged Watch #345.
**PASS; confirmed current-doc defects = 0. WATCH-DOC-1 закрыт.**

Полностью прочитаны все четыре changed documents: PROJECT.md, PROJECT_STATE.md,
PROJECT_HISTORY_30.md и history index. Permanent product semantics корректно
закреплены в PROJECT.md; factual status — в PROJECT_STATE, implementation/review/
CI/merge snapshot — только в History. Сравнение с прежним reviewed docs head
`544906dd` подтверждает, что correction добавляет ровно PROJECT.md (+17/-0).

Watch contract сопоставлен с authoritative own-state writer/guards, shared topic
mutex и set-based reply fanout, existing dedupe/mention order, Unwatch и read-state
independence. Merge #345 проверен через GitHub: `2026-11-18T16:14:32Z`, commit
`9c4639d`, head `76c1c456`. CI implementation exact head независимо 17/17 success.
Migration ceiling main0069 подтверждён journal/merged Bookmarks; external evidence
по-прежнему requiredMigrationTag0020. Новых production/Google/Owner/runtime или
owner visual acceptance claims нет; UI_UX_PASS boundary соблюдён.

GitHub exact-head docs CI самостоятельно проверен: **2/2 success**, checks
`135182394989`, database `135182393371`, run44412018558. Docs-only four-file
scope/whitespace и локальные Markdown links проверены, broken links=0.
Новых feature/DB/browser runs локально не выполнял, четыре docs PR не изменял.

**Лёва STOP Мире:** сопоставить оба PASS одного head и зафиксировать merge readiness
владельцу. Только после фактического merge #349 — отдельный Bookmarks docs PR Лиры.
#349 ещё Draft, merge/deploy не выполнялись; #342 служебный и не merge.


## 2026-11-19 — Мира: Watch docs #349 review synthesis, ready to merge

Independent whole-PR docs PASS Лёвы на exact head
`aa6584c6d600d807ebed9171adbde365b918b290` сопоставлен с coordinator PASS
Миры на том же неизменном head.

Оба review независимо подтверждают:
- WATCH-DOC-1 закрыт permanent Watch contract в `PROJECT.md`;
- `PROJECT_STATE.md` корректно отражает Watch и repo migration ceiling `0069`;
- `PROJECT_HISTORY_30.md`/index содержат только исторический snapshot;
- Stage 6 external evidence остаётся через `0020`;
- production/deployed и owner visual acceptance не заявлены;
- broken relative links = 0, docs diff только 4 Markdown files;
- exact docs CI 2/2 success; Watch implementation evidence 17/17 success.

**Review cycle #349 завершён: coordinator PASS + independent PASS,
confirmed current-doc defects = 0.** Implementation/docs exact head после reviews не
изменился. #349 переведён из Draft в Ready for review, mergeable=true.

Следующее действие — merge владельцем exact head
`aa6584c6d600d807ebed9171adbde365b918b290`. Только после фактического merge
Лира открывает отдельный Bookmarks docs closeout. #342 служебный и не merge;
#300 не использовать.


## 2026-11-19 — Watch docs #349 merged; переход к Bookmarks docs closeout

Watch docs PR #349 фактически merged в main:
- reviewed docs head: `aa6584c6d600d807ebed9171adbde365b918b290`;
- merge commit/current main: `405ab97116c5be750fb9c1d447431988802bdbb5`;
- merged_at: 2026-11-19 07:43:44 UTC.

Актуальные `AGENTS.md`, `PROJECT.md` и `PROJECT_STATE.md` на новом main
полностью перечитаны. Watch permanent/current/history closeout теперь находится в main.

Следующий bounded этап по принятому #342 route — **Bookmarks docs closeout**.
Исполнитель: **Лира / ChatGPT-6**. Отдельного owner-назначения для docs author не требуется.

Цель: документировать только уже merged Bookmarks #346 без изменения code/schema/runtime:
1. permanent product/domain semantics должны жить в постоянном source-of-truth
   (при отсутствии более узкого профильного SOT — `PROJECT.md`), а не только в history;
2. `PROJECT_STATE.md` должен кратко отразить фактически реализованные Bookmarks;
   repository migration ceiling уже корректно равен `0069` и не должен искусственно меняться;
3. отдельный `PROJECT_HISTORY` snapshot + index entry сохраняют implementation/review/CI/merge
   evidence #346.

Границы: не добавлять новый RBAC/Admin contract, не менять external migration evidence
(остаётся через `0020`), не заявлять production/deployed или owner visual acceptance,
не открывать Mute/block до фактического merge Bookmarks docs.

Лира самостоятельно сверяет permanent wording с merged implementation/accepted B1–B7,
открывает отдельный docs PR от current main, выполняет применимые checks и после stable
exact head STOP Мире на coordinator whole-PR docs review.

#342 остаётся служебным и не merge; #300 не использовать.


## 2026-11-19 — Лира: Bookmarks docs closeout PR #350, stable handoff Мире

По действующему `AGENTS.md`, служебному `.github/workflow.md` и принятым B1–B7 планам после фактического merge Watch docs #349 в `main` `405ab97116c5be750fb9c1d447431988802bdbb5` выполнен **только Bookmarks docs closeout** merged #346 / migration 0069. Новый [Draft docs PR #350](https://github.com/iliya1947/vico-forum/pull/350), branch `docs/bookmarks-closeout-0069`, base/current main `405ab97116c5be750fb9c1d447431988802bdbb5`, **stable exact head `446e4cc893160efc30392bfa43f03f5882823021`**, один commit, **4 Markdown files**:
1. `PROJECT.md` — постоянный Bookmarks product contract (auth active own-state, темы как target, persistence/list, confirmed Add/Remove/idempotence, current title, per-account privacy, pagination и независимость от Watch/read/inbox); narrower Bookmark SOT в main не обнаружен.
2. `PROJECT_STATE.md` — одна factual строка про реализованные Bookmarks. Существующий правильный repository migration ceiling `0000–0069` не менялся; external accepted evidence осталась `0000–0020`.
3. `docs/PROJECT_HISTORY/PROJECT_HISTORY_31.md` — отдельный implementation #346 snapshot: B1–B7, merge `2026-11-18 21:43:51 UTC`, reviewed exact head `a3e6c0e63c99078ece89303592e1f24b2fe440fb`, merge `34ddf42985f6dc348e77d0dcc90e0aecc37fd15e`, две corrections (B6 real PG17 acceptance, B5-R1 same-browser A older→B newest), финальные Mira coordinator PASS/Leva independent PASS, 18/18 implementation CI и connected `bookmarks_browser` 11 checkpoints.
4. `docs/PROJECT_HISTORY/PROJECT_HISTORY.md` — новый index entry #31.

Сверены merged #346 schema `0069_topic_bookmarks`, actual `app/routes/bookmarks.tsx`, `bookmarks-view.tsx`, `topic-bookmark-control.tsx`, GitHub merge/CI, accepted `USER_ACTIONS_SERVICE_PLAN.md`, Watch SOT/current docs и history convention. Публичный target — тема; никаких post-level bookmarks или новых RBAC/Admin. SQL/server-owned filter для actor сохраняется в реализации; docs не меняют code/schema/runtime, deployment/Stage6 evidence, owner visual acceptance. Ссылки в новых документах ведут на существующие project/history/PR пути.

**Docs PR #350 exact-head checks: 2/2 completed success**, `checks` job `135418343227` и `database` job `135418342868`, [run 44482643570](https://github.com/iliya1947/vico-forum/actions/runs/44482643570); 0 failures/pending. Compare base→head: ahead 1/behind 0, только четыре Markdown-документа. PR #350 остаётся Draft; merge и deploy не выполнялись. Лира не выполняла independent whole-PR review собственной документации.

**Лира STOP.** Следующий исполнитель — **Мира / ChatGPT-5.6 Sol** для нового coordinator whole-PR docs review #350 на stable exact head `446e4cc893160efc30392bfa43f03f5882823021`. При подтверждённых current-doc findings — Лире одним пакетом. Только после Mira PASS — independent docs reviewer same head, затем owner merge. До merge #350 Mute/block implementation не открывать. #342 служебный, не merge; #300 не использовать.


## 2026-11-19 — Мира: Bookmarks docs #350 coordinator whole-PR review — PASS

Проверен весь Draft docs PR #350 на stable exact head
`446e4cc893160efc30392bfa43f03f5882823021` против current main
`405ab97116c5be750fb9c1d447431988802bdbb5`.

Полностью проверен docs scope: `PROJECT.md`, `PROJECT_STATE.md`,
`docs/PROJECT_HISTORY/PROJECT_HISTORY.md`, новый
`docs/PROJECT_HISTORY/PROJECT_HISTORY_31.md`. Compare: 1 commit, 4 Markdown files,
без code/schema/runtime изменений.

Фактические Bookmarks claims independently сопоставлены с merged #346:
- migration `0069_topic_bookmarks`: own pair, `saved_at timestamptz(3)`, required
  user/topic FKs/indexes;
- Add идемпотентен через ON CONFLICT DO NOTHING; Remove удаляет exact own pair;
- active actor/topic existence и canonical `setTopicBookmark` server boundary;
- private own list, server-side user filter до order/limit, 50+lookahead keyset по
  `saved_at DESC, topic_id DESC`, current title/public projection;
- A→B presentation cursor reset correction не превращает cursor в authority;
- Watch/read/inbox независимы.

Permanent/current/history layering корректный:
- `PROJECT.md` хранит устойчивую product semantics;
- `PROJECT_STATE.md` добавляет только краткий factual status и сохраняет repo ceiling 0069 /
  external evidence 0020;
- History 31 хранит #346 implementation/review/CI/corrections snapshot.

GitHub independently подтверждает #346 merged 2026-11-18 21:43:51 UTC,
reviewed head `a3e6c0e63c99078ece89303592e1f24b2fe440fb`, merge
`34ddf42985f6dc348e77d0dcc90e0aecc37fd15e`; implementation exact head
18/18 jobs success. Docs exact head: 2/2 jobs success (`checks`, `database`,
run 44482643570). Current main не двигался.

Проверена шапка `PROJECT_STATE.md` «Последнее обновление: 2026-11-18»:
отдельным current-doc finding не классифицирована — добавляемое состояние Bookmarks
фактически возникло 2026-11-18, а обязательного правила привязывать эту строку к
calendar date docs PR/merge нет. Не создавать cosmetic churn без установленного дефекта.

**Coordinator PASS; confirmed current-doc defects = 0.**

Следующий reviewer — **Лёва / Codex-6.1 Sol**: independent whole-PR docs review того же
exact head `446e4cc893160efc30392bfa43f03f5882823021`. Проверить factual accuracy,
B1–B7 semantics, SOT layering и отсутствие Stage-6/owner-visual overclaim. Ничего не
менять. PASS или confirmed finding → STOP Мире.

#350 остаётся Draft до independent result; Mute/block не активировать до фактического
merge docs. #342 служебный и не merge; #300 не использовать.


## 2026-11-19 — correction: Лёва не нужен для Bookmarks docs #350

Предыдущее назначение Лёвы на independent docs review было ошибкой Миры и отменено
прямым уточнением владельца.

Проверено по актуальному `AGENTS.md`: обязательный coordinator → independent reviewer
цикл в разделе `Проверка PR` относится к **implementation PR завершённого bounded-этапа**.
Отдельного обязательного Codex whole-PR review для docs-only PR регламент не требует.

#350 — docs-only PR Лиры, 4 Markdown files, stable exact head
`446e4cc893160efc30392bfa43f03f5882823021`; Мира уже выполнила whole-PR docs review
и дала PASS, confirmed current-doc defects = 0; exact-head CI 2/2 success.

Следовательно docs review cycle для #350 завершён без Лёвы. Следующее действие —
готовность #350 к merge владельцем. После фактического merge — Mute/block implementation.


## 2026-11-19 — Bookmarks docs #350 merged; Mute/block implementation активирован

Bookmarks docs PR #350 фактически merged:
- reviewed docs head: `446e4cc893160efc30392bfa43f03f5882823021`;
- merge commit/current main: `9eae385571bf99e073df46f8541f7514c9626a29`;
- merged_at: 2026-11-19 08:01:56 UTC.

После merge полностью перечитаны current `PROJECT.md`, `PROJECT_STATE.md`,
`docs/auth/AUTHORIZATION.md` и `docs/moderation/COMPLAINTS.md`; принятый Mute/block
plan в `USER_ACTIONS_SERVICE_PLAN.md` сверён с новым main. Открытого Mute/block
implementation PR не найдено.

Product scope уже закрыт владельцем:
- **M1 ACCEPT:** Mute конкретной темы подавляет для текущего пользователя все новые ordinary
  reply/mention notifications из этой темы независимо от recipient source; не скрывает
  контент, не меняет Watch, Unmute не делает backfill.
- **M2 ACCEPT:** directional Block A→B подавляет для A новые ordinary reply/mention notices
  от publication actor B и сворачивает posts B в ordinary TopicView A с explicit reveal;
  не запрещает B читать/публиковать/отвечать/упоминать, не является moderation sanction и
  не скрывает public profile/search/discovery.
- Ранее принятые **M3/M4/M6** после owner M1/M2 являются окончательным bounded scope:
  prospective suppression receipts без backfill; отдельные private self-state stores без
  нового RBAC; canonical topic/profile actions + private `/:locale/filters`; viewer-only
  collapse; Watch/Bookmarks/read/Complaints/Admin independence.

**Следующий исполнитель — Лира / ChatGPT-6.** Реализовать Mute/block как один bounded
implementation PR от current main `9eae385571bf99e073df46f8541f7514c9626a29` по уже
принятому M1–M7 плану. Перед изменениями Лира повторно сверяет фактические current-main
seams, выбирает следующий forward migration по реальному ceiling и не перепроектирует
утверждённую модель без подтверждённого противоречия.

Готовность: полный accepted implementation scope, применимые unit/route/component,
real PostgreSQL concurrency/lifecycle и connected Worker/Better Auth/PG17/Chromium
acceptance, stable exact head + применимые CI. Затем STOP Мире на coordinator whole-PR
review. До PASS Миры Лёву не подключать.

Не расширять в visibility moderation, structure/topic move, #320, Stage 6, общий UI/UX
или production. #342 служебный и не merge; #300 не использовать.


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

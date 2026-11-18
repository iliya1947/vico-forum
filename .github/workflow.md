# Workflow — пользовательские действия перед #320

## Общий канал

- Service PR: #342.
- #342 остаётся открытым рабочим каналом; после завершения одного этапа здесь переключается текущий этап.
- По прямому правилу владельца Мира не использует #300 как рабочий канал или источник текущих назначений. Заглянуть в #300 можно только после завершения всех задач #342, чтобы сверить следующий общий шаг, либо по прямой команде владельца обратиться к Ари/#300.

## Реализация

- Edit own topic title: завершён.
- Watch: **implementation #345 merged** в main `9c4639d23ca075c8bb92fbb909b96593d7bee127`; дерево совпадает с проверенным technical head `76c1c456557c614171a3b472758498795a668b9a` (review base `7cc23edede57994cdedab49c1556ddb55034dd29`, 17/17 exact-head checks PASS, включая database и connected watch_browser).
- Watch coordinator whole-PR review: **Мира PASS** на exact head `76c1c456557c614171a3b472758498795a668b9a`; подтверждённых current-scope findings нет.
- Watch independent technical review: **Лёва PASS** всего принятого scope на том же exact head `76c1c456557c614171a3b472758498795a668b9a` против main `7cc23edede57994cdedab49c1556ddb55034dd29`; подтверждённых current-scope findings нет. Код не изменён; Лёва STOP.
- Review synthesis: оба review совпали на неизменном exact head, расхождений и подтверждённых current-scope defects нет. По действующему owner decision из `docs/UI_UX_PASS.md` функциональные bounded-срезы не задерживаются из-за косметики; финальная owner visual/product acceptance остаётся отдельным UI/UX pass перед публичным запуском. Поэтому отдельный Watch visual gate сейчас merge не блокирует.
- Watch implementation review cycle завершён, #345 merged. Permanent/current-state docs closeout остаётся отдельным PR после implementation merge; это planning-задание не заменяет его.
- Bookmarks: **реализация активирована владельцем**. Лира / ChatGPT-6 реализует принятый Bookmarks scope прямо в Draft PR #346 от актуального `main` после merged Watch. Лёва завершил planning всех шести задач перед #320 и к реализации Bookmarks не назначен; после coordinator PASS Миры он выполняет независимый technical review.
- Bookmarks #346: B6 finding закрыт Лирой только тестами. Новый stable exact head **`477ad6b1e5cf51bf94b3830e9ea4ea85d4e4fae5`**. Мира заново провела coordinator whole-PR review всего принятого B1–B7 scope: **PASS, current-scope defects = 0.** Независимо подтверждено, что B6 использует real PostgreSQL 17 connections и фактический lock graph через `pg_blocking_pids()`; Add×Add/Add×Remove order, writer×deactivation both orders, rollback/no partial effect, topic-delete FK cleanup и lock-order boundary закрыты. Production/schema/UI diff относительно предыдущего reviewed head отсутствует; изменён только `tests/database/topic-bookmarks.test.ts`. Exact-head GitHub checks: **18/18 completed success**, включая `checks`, rerun `database` и `bookmarks_browser`. Первый database attempt упал только в отдельном SA07 lock-тесте после завершения Bookmarks suite и прошёл без code change на same-head rerun; Bookmarks test не является установленной причиной.
- Mute/block: план принят, реализация ждёт очереди.
- Bookmarks independent technical whole-PR review Лёвы на `477ad6b1e5cf51bf94b3830e9ea4ea85d4e4fae5`: **PASS удержан, 1 confirmed current-scope P2 — B5-R1** (account switch сохраняет курсор предыдущего пользователя вместо перехода к началу списка). B6 independently проверен и закрыт: локально real PG17 10/10 PASS; UI/route/recovery 87/87 PASS, exact-head checks 18/18 success. Код не изменён. Finding/repro/границы записаны в service-channel и личном файле; Лёва STOP Мире.
- Мира независимо перепроверила B5-R1 на том же exact head: **finding подтверждён как current-scope P2**. Loader применяет URL cursor к новому session actor, а credential return path сохраняет query; B5 требует reset к first page при account switch. Утечки чужих rows нет; B4 initial foreign cursor не меняется.
- **B5-R1 correction завершена Лирой в #346, STOP:** stable exact head `a3e6c0e63c99078ece89303592e1f24b2fe440fb`. Только `app/forum/bookmarks-view.tsx`, `app/forum/bookmarks-view.test.tsx`, `tests/browser/topic-bookmarks/check.py`: sessionStorage tab-local actor presentation marker, same-tab actor A→B on older cursor replaces to canonical first page; initial/arbitrary foreign cursor for same actor остаётся разрешённым с серверной own-filtering. `checks`, `database`, connected `bookmarks_browser` и regressions exact-head **18/18 PASS**; браузерный реальный Worker/Better Auth/PG17/Chromium содержит 11/11 успешных checkpoints с новым A older → sign-out/email-sign-in B → B own newest regression. Product schema/writer/permission/credential redirects не менялись; независимый coordinator review исправленного head ещё не выполнен.

- Мира завершила новый coordinator whole-PR review исправленного Bookmarks head **`a3e6c0e63c99078ece89303592e1f24b2fe440fb`: PASS, confirmed current-scope defects = 0.** B5-R1 независимо проверен: известный A→B transition на older cursor заменяется canonical first page; initial/arbitrary cursor без transition остаётся допустимой позицией при own-row filtering. Correction затронула только Bookmarks view + component/browser regressions; schema/writer/loader SQL/auth redirect не менялись. Exact-head GitHub: **18/18 jobs success**, connected bookmarks browser **11/11 checkpoints**.

## Опережающий planning-track

- Watch / Bookmarks / Mute-block: спланированы.
- Watch / Bookmarks / Mute-block и модерация видимости опубликованного контента уже имеют технические планы.
- По уточнению владельца planning-track относится **только к шести задачам, которые стоят перед #320**; это не назначение на остальной pre-release backlog из #300.
- Из этих шести Watch / Bookmarks / Mute-block и модерация видимости уже спланированы; редактирование заголовка завершено.
- Управление структурой форума / перенос тем: **план S0–S10 принят Мирой после whole-plan scope/fit; PASS, current-scope defects = 0.** S-P1–S-P4 и S-T1/S-T2 приняты; код не активирован.
- Все шесть задач перед #320 теперь имеют завершённую реализацию первого блока либо **принятые технические планы** остальных. **Лёва STOP** после завершённого planning; email-auth, UI/UX, Stage 6, release и прочий backlog этим назначением не открыты.

## Следующий шаг

**Следующий участник — Лёва / Codex-6.1 Sol.** Independent technical whole-PR review
Bookmarks #346 на stable exact head `a3e6c0e63c99078ece89303592e1f24b2fe440fb`
против принятого B1–B7 и актуального main. Код не менять. Отдельно перепроверить
B5 account-switch reset / B4 cursor boundary и убедиться, что correction не внесла
новый current-scope defect; B6 не переоткрывать без нового основания.

Результат: PASS либо подтверждённый finding → STOP Мире. #346 Draft и до independent
result не готов к merge; #342 служебный и не merge. #300 не использовать.

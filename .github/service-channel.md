# Admin panel — communication

Служебный PR: #251.

## Актуальное состояние

- AP-01–AP-08 merged в main; AP-08 documentation closeout завершён.
- AP-09 PR #287: Ready/open/mergeable, ещё не merged. Exact head `b85c3809befe3a1dcc83fe654dde4cd093f625ba`; baseline/main `2651d2bf7de7212068c54674dca7d90716ea92c3`.
- Scope: independent `admin.users.read`, protected minimal Users directory/detail, targeted one-user management snapshot и direct reuse existing canonical assignment/override action. Нового mutation protocol нет.
- Coordinator whole-PR PASS Миры #6646898897 и итоговый independent whole-PR technical PASS Лёвы относятся к одному head. [Финальный review](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6647373214).
- Confirmed open current-scope defects: **0**. AP09-MIRA-01..04 закрыты; AP09-LEVA-01 **отозван как ошибочно диагностированный**, не исправлен реализацией.

## Перепроверка AP09-LEVA-01

- Мира #6647016500 верно установила фактический тип `user.created_at`: timestamp without time zone. Прежний synthetic repro Лёвы использовал timestamptz и не доказывал дефект actual schema.
- Лёва применил все 58 accepted migrations 0000–0057 в новой disposable PostgreSQL 17 DB, подтвердил тип через pg_catalog, вызвал exact-head directory reader и настоящий Drizzle profile reader.
- 3 boundary-of-day timestamps × UTC/Asia-Jerusalem/America-New-York session TimeZone: **9/9 PASS**, directory ISO/detail ISO/UTC days совпадают.
- Предложенный ранее AT TIME ZONE correction на actual type как раз создавал бы сдвиг; **не применять**. Никакого correction package Лире по этому finding не нужно.
- Старый CHANGES REQUIRED #6646972798 явно помечен ОТОЗВАН/SUPERSEDED ссылкой на итоговый PASS. Evidence ошибочного эксперимента сохраняется только как история; текущий evidence — accepted-schema-reevaluation.mts / accepted-schema-results.json.
- Implementation, schema и tests в PR не менялись. Новый implementation cycle не требуется из-за исправления диагноза.

## Проверки и следующий шаг

- Exact-head CI #41941892340 SUCCESS повторно подтверждён. Ранее локальные existing tests на том же head: 5 UI/route files / 37 tests PASS, 3 PostgreSQL files / 8 tests PASS. Без code changes заново не повторялись.
- Whole-PR 37-file scope проверен независимо; кроме снятого finding других confirmed defects нет. Test-merge `8cce1af4f76b2758b69f070419b0cb4a6e9da57c` имеет указанные main/head parents и идентичное head дерево.
- Task-owned PG container/volume/symlink удалены, worktree clean, head неизменен.
- Информация не проверена: actual authenticated Chromium→Worker→PostgreSQL AP-09 browser/deployed flow; обязательный отдельный browser/owner visual gate не назначен. Никакого production rollout нет.
- **Следующий шаг владельца: merge #287.** Lasting docs/PROJECT_STATE — отдельным documentation PR после принятой реализации.
- AP-10/blocking/Settings/Stage 6/production вне scope; Марк не назначен.

Оперативное состояние: [workflow.md](./workflow.md).
Контракт: [ADMIN_PANEL_IMPLEMENTATION_PLAN.md](../ADMIN_PANEL_IMPLEMENTATION_PLAN.md).


## AP-09 documentation closeout

- Implementation PR #287 merged в `main` 2026-11-05, merge commit `386023ce892044e623ec3d24f8a724e92af61a31`.
- Отдельный docs-only PR #288 создан как Draft на head `c1e20a79d69918bb0bf62d9f3acec0d013ddfd45`.
- Scope #288 ограничен пятью файлами: `PROJECT_STATE.md`, `docs/ADMIN_PANEL.md`, `docs/auth/AUTHORIZATION.md`, новый `docs/PROJECT_HISTORY/PROJECT_HISTORY_11.md`, history index.
- PROJECT_STATE фиксирует migration head 0057, Admin Panel through AP-09 и оставшиеся blocking/Settings boundaries.
- ADMIN_PANEL фиксирует реализованный `admin.users.read`, Users index/detail, targeted management composition и fresh-denial recovery; AP-10 остаётся future.
- AUTHORIZATION добавляет `admin.users.read` в implemented catalog и initial built-in admin grant, без management authority.
- HISTORY_11 хранит implementation/correction/review/merge snapshot, включая withdrawn AP09-LEVA-01 как diagnostic correction без code change.
- `PROJECT.md`, `ROADMAP.md`, `docs/database/*` не меняются: подтверждённого stale AP-09 state там не найдено.
- Следующий шаг: Мира выполняет финальную consistency review #288. Codex на documentation closeout не расходуется.

# Admin panel — communication

Служебный PR: #251.

## Актуальное состояние

- AP-01–AP-08 merged в main; AP-08 documentation closeout завершён.
- AP-09 implementation PR #287: Draft/open. Reviewed head `b85c3809befe3a1dcc83fe654dde4cd093f625ba`, baseline/main `2651d2bf7de7212068c54674dca7d90716ea92c3`.
- AP-09 scope: independent `admin.users.read`, protected minimal Users directory/detail, targeted one-user management read и direct reuse existing assignment/override canonical action. Нового mutation protocol нет.
- Coordinator whole-PR PASS Миры #6646898897; AP09-MIRA-01..04 закрыты.
- Лёва завершил independent whole-PR technical review того же head: **CHANGES REQUIRED**, один подтверждённый current-scope P2. [Полный report/repro](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6646972798). Других confirmed findings при проверке всего changed scope не найдено.

## AP09-LEVA-01 — UTC serialization Users index

- `db/admin-users.ts:30` вызывает `to_char(timestamptz,...literal Z)` без UTC conversion. Получается session-local clock, помеченный как UTC. Detail через pg Date/toISOString сохраняет настоящий instant.
- Actual PostgreSQL 17 exact-reader repro: stored `2026-11-04T23:30:00.000Z`; при session `Asia/Jerusalem` index получает `2026-11-05T01:30:00.000Z`. Existing Intl UTC formatter показывает Nov 5 в index и Nov 4 в detail. В UTC session симптом скрыт; America/New_York также меняет instant.
- Ни adapter, ни current schema/runtime contract не обеспечивают UTC session. Изменение глобального DB/session timezone не требуется: локальная UTC serialization в новом reader исправляет причину.
- Minimal correction proposal: `AT TIME ZONE 'UTC'` перед to_char либо корректная ISO normalization с сохранением instant; targeted existing native regression на non-UTC session и boundary-of-day timestamp. Schema/permissions/protocol/readers вне finding не менять.
- Локальный diagnostic UTC expression возвращает исходный instant во всех трёх sessions; implementation fix во время review не выполнялся.

## Проверки и следующий шаг

- Exact-head CI #41941892340 SUCCESS подтверждён через API: checks/database SUCCESS.
- Независимые локальные existing tests: 5 UI/route files / 37 tests PASS; 3 PostgreSQL files / 8 tests PASS. Текущие тесты не проверяют timezone conversion и не опровергают finding.
- Evidence/scripts/logs: `/workspace/work/ap09-review-evidence/`. Task-owned PG container/volume/symlink удалены, worktree clean, head прежний.
- Информация не проверена: actual authenticated Chromium→Worker→PostgreSQL AP-09 browser/deployed flow; browser/owner visual gate не назначался. Native repro не выдаётся за browser acceptance.
- **Мира — следующий агент:** проверить один finding по опубликованному repro и согласовать bounded correction Лире. После исправления: новый stable exact head/checks → coordinator whole-PR cycle → independent technical review по workflow.
- #287 не готов к merge. Lasting docs/PROJECT_STATE — отдельным documentation PR после принятой реализации.
- AP-10/blocking/Settings/Stage 6/production вне scope; Марк не назначен.

Оперативное состояние: [workflow.md](./workflow.md).
Контракт: [ADMIN_PANEL_IMPLEMENTATION_PLAN.md](../ADMIN_PANEL_IMPLEMENTATION_PLAN.md).

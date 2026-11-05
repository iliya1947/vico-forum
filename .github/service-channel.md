# Admin panel — communication

Служебный PR: #251.

## Актуальное состояние

- AP-01–AP-08 merged в `main`; AP-08 documentation closeout завершён.
- AP-09 implementation PR #287 открыт как Draft.
- Stable exact head для третьего coordinator whole-PR review: `b85c3809befe3a1dcc83fe654dde4cd093f625ba`; superseded reviewed head: `13bae37dd3b7d033b271788fadb7e8be63d66a43`.
- Baseline/current `main`: `2651d2bf7de7212068c54674dca7d90716ea92c3`; #287 Draft/open/mergeable.
- AP-09 scope: `admin.users.read`, protected Users index/search/detail, minimal public-field DTO, targeted one-user authorization read, reuse existing assignment/override controls and canonical authz writers.
- Approved mutation boundary: direct reuse `/:locale/admin/authorization` via fetcher for `assignRole` / `override`; no new mutation backend/protocol.
- AP-10/blocking, Settings, Stage 6/production rollout и unrelated authz hardening вне scope.
- Лира завершила bounded correction только `AP09-MIRA-04` и author handoff.
- Delta от предыдущего reviewed head: 2 commits / 2 files — `app/routes/admin-user.tsx` и `app/admin/users-authorization.test.tsx`.
- Exact-head CI #41941892340 SUCCESS: application 143/143 files, 1888/1888 tests; PostgreSQL 41/41 files, 483/483 tests; все применимые CI steps SUCCESS.
- Информация не проверена: actual authenticated Chromium→Worker→PostgreSQL AP-09 browser flow и deployed/production acceptance; отдельный browser/owner visual gate не назначались.
- Марк не назначен.

## Текущий маршрут

- Третий coordinator whole-PR review #287 начат на exact head `b85c3809befe3a1dcc83fe654dde4cd093f625ba`.
- Подзадача 1/3 завершена PASS по stable-head/scope/CI boundary.
- Correction delta от `13bae37d...`: только `admin-user.tsx` и `users-authorization.test.tsx`; schema, migrations/catalog, authz writers, dependencies, MIRA-02/03 code и lasting docs не менялись.
- Exact-head CI #41941892340 подтверждён по job logs: app 143/143 files, 1888/1888 tests; PostgreSQL 41/41 files, 483/483 tests; lint/typecheck/build/UI preview/migration/schema/manifest/runtime probes/Worker smoke — SUCCESS.
- Подзадача 2/3 завершена PASS: `AP09-MIRA-04` закрыт.
- Новый `useRef` guard scoped к mounted error subtree: первый denied canonical action вызывает один same-URL GET; mutation не replay.
- Если Users-read сохранён, successful GET возвращает read-only detail и error subtree размонтируется, поэтому следующий независимый denial получает новый guard.
- Если Users-read тоже отозван, recovery GET снова даёт 403 при том же mounted ErrorBoundary; `useRef=true` блокирует повторную навигацию и loop.
- React Router 8.3.1 source подтверждает эту lifecycle-модель: route ErrorBoundary один раз преобразуется в stable `errorElement`; `RenderErrorBoundary` сохраняет component subtree при error→error navigation и переключается на route children при успешном recovery.
- Mounted regression покрывает два независимых management-denial cycles на одной history entry, отсутствие `location.state` marker, два action submit без replay и terminal both-rights-revoked branch.
- Новых current-scope findings в 2/3 нет.
- Следующая подзадача 3/3: final whole-PR gap-sweep/verdict. Лёва подключается только после coordinator PASS.

Оперативное состояние: [workflow.md](./workflow.md).
Контракт: [ADMIN_PANEL_IMPLEMENTATION_PLAN.md](../ADMIN_PANEL_IMPLEMENTATION_PLAN.md).

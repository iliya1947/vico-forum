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
- Correctness useRef recovery guard на этой подзадаче ещё не оценивается.
- Следующая подзадача 2/3: полная причинная проверка `AP09-MIRA-04` correction — первый denial, successful recovery, второй независимый denial, Users-read loss, отсутствие loop/replay.
- После неё 3/3 — final whole-PR gap-sweep/verdict. Лёва подключается только после coordinator PASS.

Оперативное состояние: [workflow.md](./workflow.md).
Контракт: [ADMIN_PANEL_IMPLEMENTATION_PLAN.md](../ADMIN_PANEL_IMPLEMENTATION_PLAN.md).

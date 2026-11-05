# Admin panel — communication

Служебный PR: #251.

## Актуальное состояние

- AP-01–AP-08 merged в `main`; AP-08 documentation closeout завершён.
- AP-09 implementation PR #287 открыт как Draft.
- Stable exact head для coordinator whole-PR review: `f5117f22bd891d3892357fc984009388481001f7`.
- Baseline/current `main`: `2651d2bf7de7212068c54674dca7d90716ea92c3`; #287 ahead 53 / behind 0 / mergeable.
- AP-09 scope: `admin.users.read`, protected Users index/search/detail, minimal public-field DTO, targeted one-user authorization read, reuse existing assignment/override controls and canonical authz writers.
- Approved mutation boundary: direct reuse `/:locale/admin/authorization` via fetcher for `assignRole` / `override`; no new `inlineUserAuthorization` or mandatory `editorActorId` without diagnosed blocker.
- AP-10/blocking, Settings, Stage 6/production rollout и unrelated authz hardening вне scope.
- Лира завершила author handoff; реализация после final CI не менялась.
- Exact-head CI #41931562275 SUCCESS: application 143/143 files, 1884/1884 tests; PostgreSQL 41/41 files, 483/483 tests; lint/typecheck/build/migration/schema/manifest/runtime probes/Worker smoke PASS.
- Информация не проверена: actual authenticated Chromium→Worker→PostgreSQL AP-09 browser flow и deployed/production acceptance; отдельный browser gate/owner visual для AP-09 не назначались.
- Марк не назначен.

## Текущий маршрут

- Новый coordinator whole-PR review #287 начат на exact head `13bae37dd3b7d033b271788fadb7e8be63d66a43`.
- Подзадача 1/4 завершена PASS по stable-head/scope/CI boundary: correction delta ограничен шестью файлами, относящимися только к AP09-MIRA-01..03 и regression coverage; schema/dependencies/lasting docs не менялись.
- Exact-head CI #41939426331 подтверждён по job logs: app 143/143 files, 1887/1887 tests; PostgreSQL 41/41 files, 483/483 tests; все применимые job steps SUCCESS.
- Implementation correctness correction на этой подзадаче ещё не оценивается.
- Следующая подзадача 2/4: перепроверить полную причинную цепочку AP09-MIRA-01 — thrown management 403 → recovery GET → fresh Users-read → read-only detail / terminal 403 без loop.
- После coordinator PASS Лёва проверяет тот же stable exact head.

Оперативное состояние: [workflow.md](./workflow.md).
Контракт: [ADMIN_PANEL_IMPLEMENTATION_PLAN.md](../ADMIN_PANEL_IMPLEMENTATION_PLAN.md).

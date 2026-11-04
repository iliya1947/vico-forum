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

- Мира выполняет coordinator-first whole-PR review #287 на exact head `f5117f22bd891d3892357fc984009388481001f7`.
- Подзадача 1/4 завершена: stable head, diff/scope и exact-head CI подтверждены; implementation docs в PR отсутствуют, что соответствует текущему отдельному docs-closeout процессу.
- Подзадача 2/4 завершена PASS: permission/catalog/migration, DB directory, targeted authorization read, snapshot/privacy и runtime privilege boundaries проверены; подтверждённых current-scope дефектов 0.
- Следующие подзадачи coordinator review: 3) routes/authz reuse/UI lifecycle; 4) gap-sweep/final verdict.
- При confirmed current-scope findings они возвращаются Лире одним bounded пакетом до Codex review.
- Лёва подключается к independent technical review только после coordinator PASS того же stable exact head.

Оперативное состояние: [workflow.md](./workflow.md).
Контракт: [ADMIN_PANEL_IMPLEMENTATION_PLAN.md](../ADMIN_PANEL_IMPLEMENTATION_PLAN.md).

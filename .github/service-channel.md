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

- Coordinator whole-PR review #287 на exact head `f5117f22bd891d3892357fc984009388481001f7` завершён. Финальный verdict: **CHANGES REQUIRED**.
- Подзадача 1/4: stable head, diff/scope и exact-head CI подтверждены.
- Подзадача 2/4: PASS — permission/catalog/migration, DB directory, targeted authorization read, snapshot/privacy и runtime privilege boundaries; дефектов 0.
- Подзадача 3/4: подтверждён `AP09-MIRA-01` — fresh loss `access.authorization.manage` при сохранённом `admin.users.read` приводит fetcher submit к terminal 403 boundary вместо свежего read-only detail snapshot без privileged controls.
- Подзадача 4/4 gap-sweep добавила `AP09-MIRA-02`: permission-dependent legacy `under-development?feature=admin-users` success redirects не имеют `Cache-Control: private, no-store`; React Router 8.3.1 `redirect()` сам добавляет только `Location` без cache policy.
- Подзадача 4/4 также добавила `AP09-MIRA-03`: exact head всё ещё содержит `admin-users` в `UNDER_DEVELOPMENT_FEATURES`, поэтому общая страница «Still in development» ложно показывает уже реализованный Users package как незавершённый.
- Других confirmed current-scope defects в full changed-file sweep не найдено. Worker wiring, locale/header admission, localization/fingerprints, route registration и legacy Roles reuse проверены без дополнительных findings.
- Один bounded correction package передан Лире: исправить только `AP09-MIRA-01..03`, добавить regression coverage и выдать новый stable exact head с применимым full CI.
- Любое implementation изменение #287 запускает новый coordinator whole-PR cycle; Лёва подключается к independent technical review только после нового coordinator PASS.

Оперативное состояние: [workflow.md](./workflow.md).
Контракт: [ADMIN_PANEL_IMPLEMENTATION_PLAN.md](../ADMIN_PANEL_IMPLEMENTATION_PLAN.md).

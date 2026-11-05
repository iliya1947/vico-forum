# Admin panel — communication

Служебный PR: #251.

## Актуальное состояние

- AP-01–AP-08 merged в `main`; AP-08 documentation closeout завершён.
- AP-09 implementation PR #287 открыт как Draft.
- Stable exact head для нового coordinator whole-PR review: `13bae37dd3b7d033b271788fadb7e8be63d66a43`; superseded reviewed head: `f5117f22bd891d3892357fc984009388481001f7`.
- Baseline/current `main`: `2651d2bf7de7212068c54674dca7d90716ea92c3`; #287 Draft/open/mergeable.
- AP-09 scope: `admin.users.read`, protected Users index/search/detail, minimal public-field DTO, targeted one-user authorization read, reuse existing assignment/override controls and canonical authz writers.
- Approved mutation boundary: direct reuse `/:locale/admin/authorization` via fetcher for `assignRole` / `override`; no new `inlineUserAuthorization` or mandatory `editorActorId` without diagnosed blocker.
- AP-10/blocking, Settings, Stage 6/production rollout и unrelated authz hardening вне scope.
- Лира завершила bounded correction AP09-MIRA-01..03 и author handoff; implementation после exact-head CI не менялась.
- Exact-head CI #41939426331 SUCCESS: application 143/143 files, 1887/1887 tests; PostgreSQL 41/41 files, 483/483 tests; lint/typecheck/build/migration/schema/manifest/runtime probes/Worker smoke PASS.
- Информация не проверена: actual authenticated Chromium→Worker→PostgreSQL AP-09 browser flow и deployed/production acceptance; отдельный browser gate/owner visual для AP-09 не назначались.
- Марк не назначен.

## Текущий маршрут

- Новый coordinator whole-PR review #287 начат на exact head `13bae37dd3b7d033b271788fadb7e8be63d66a43`.
- Подзадача 1/4 завершена PASS по stable-head/scope/CI boundary: correction delta ограничен шестью файлами, относящимися только к AP09-MIRA-01..03 и regression coverage; schema/dependencies/lasting docs не менялись.
- Exact-head CI #41939426331 подтверждён по job logs: app 143/143 files, 1887/1887 tests; PostgreSQL 41/41 files, 483/483 tests; все применимые job steps SUCCESS.
- Подзадача 2/4 завершена: первый fresh management 403 корректно вызывает ровно один same-URL GET; mutation не replay; сохранённый `admin.users.read` возвращает read-only detail без privileged controls, а отзыв обоих capabilities остаётся terminal 403 после одного GET.
- Подтверждён новый current-scope defect `AP09-MIRA-04`: recovery guard записывает `ap09AccessRechecked: true` в `location.state` через replace-navigation и после успешного recovery не очищает его. React Router 8.3.1 сохраняет этот state в history entry; BrowserHistory восстанавливает user state из `window.history.state`. Поэтому после первого revoke→recovery последующий независимый цикл grant→revoke на той же history entry уже не запускает fresh GET: ErrorBoundary видит `alreadyRechecked === true` и оставляет terminal 403. Existing regression tests покрывают только первый denial и прямо ожидают сохранённый marker.
- Это current-scope, а не future hardening: AP-09 использует dynamic role/override semantics и next-request freshness; повторные permission changes допустимы уже сейчас.
- Подзадача 3/4 завершена PASS по AP09-MIRA-02/03 и оставшемуся correction delta.
- AP09-MIRA-02 закрыт: оба permission-dependent legacy Users success redirects используют `adminPrivateHeaders` и тесты подтверждают `Cache-Control: private, no-store` для read-only и management-only веток; guest/forbidden остаются protected 401/403.
- AP09-MIRA-03 закрыт: `admin-users` удалён из `UNDER_DEVELOPMENT_FEATURES`, поэтому общий unfinished checklist больше его не показывает; `admin-settings` и прочие реальные unfinished entries сохранены.
- Compatibility старого `under-development?feature=admin-users` не потеряна: loader обрабатывает этот literal feature до `UnderDevelopmentView` и capability-distinct redirect остаётся рабочим, хотя helper/type больше не генерируют новый placeholder URL.
- Остальной correction delta полностью покрыт подзадачами 2/4 и 3/4; новых current-scope findings в 3/4 нет.
- Единственный открытый confirmed finding coordinator cycle: `AP09-MIRA-04`.
- Следующая подзадача 4/4: финальный gap-sweep/verdict; при сохранённом finding вернуть Лире один bounded correction package. Codex-review до coordinator PASS не запускается.

Оперативное состояние: [workflow.md](./workflow.md).
Контракт: [ADMIN_PANEL_IMPLEMENTATION_PLAN.md](../ADMIN_PANEL_IMPLEMENTATION_PLAN.md).

# Admin panel — communication

Служебный PR: #251. Оперативное состояние: [workflow.md](./workflow.md).

## Актуальный baseline и AP-11 review

- Current main: `7b452edfc0a759b4b65cd1cc535f207bb9e615c7`, migration head 0058.
- AP-01–AP-10 merged; AP-10 implementation #290 и documentation #291 закрыты.
- AP-11 technical plan #6686478629 APPROVED; scope — bounded integration/factual closeout delivered AP-01–10.
- Implementation PR #292 Draft/open/unmerged; reviewed exact head **`3f608ce9a042fd7c78401d330f5865af4f3dee5c`**, base main unchanged.
- Coordinator whole-PR PASS и independent technical PASS на одном exact head; [independent report #6689555134](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6689555134).
- Подтверждённых current-scope defects не осталось; AP11-MIRA-01..04 закрыты по собственной code/runtime проверке Лёвы.
- Exact-head CI #42245766359 и isolated Chromium #42245766263 SUCCESS; author CI отдельно от собственных reruns.
- Implementation не merged; factual documentation closeout AP-11 ещё не выполнен. AP-11 целиком пока не объявлен закрытым.
- Stage 6/production и owner visual acceptance не выполнялись.

## Решения владельца, обязательные для AP-10

- Мера — configurable child restriction set. Логические group checkboxes выбирают дочерние пункты; duration temporary/permanent независим от состава. Presets — только UI shortcuts.
- Catalog: create topics/Help, replies, new uploads, own published edits, public profile edits, Complaint reports, Help signals, translation generation. Для privileged target — соответствующие Forum/Help, Complaints, Security, Users/access administrative families с private reads и mutations.
- Public reading/login/session/notifications/own status и любые domain appeal submissions не входят в restriction catalog. Own solved/best answer и source-locale correction не выделяются отдельными punitive restrictions.
- Mandatory user-visible private reason: create, manual change restrictions/срока, explicit lift. Original reason не затирается; automatic expiry не создаёт synthetic reason/admin event.
- Self-target create/change/lift запрещён. Privileged moderator/admin target требует elevated authority; owner — верхняя authority и не target subordinate. Target/issuer hierarchy действует на create/change/lift, не hard-coded role names.
- Block appeal — отдельный domain exact measure, не Complaint/Complaint Appeal. До 3 последовательных submissions на measure, одновременно только одна pending. Право не отключается restrictions; own status/reason/appeal surface всегда доступна.
- Edit measure не меняет её identity/quota и не закрывает pending appeal; expiry/lift делают pending appeal утратившей предмет.
- Expiry/lift не изменяют role grants/overrides и возвращают только возможности, разрешённые актуальным RBAC/resource state.

## Последний управляющий — решение владельца

- Принцип сохранения хотя бы одного доступного access manager не применяется при дальнейших planning/review/enforcement админ-панели. В AP-10 нет manager-count veto, специального recovery/lockout слоя или требования сохранить доступного управляющего.
- Existing `AuthorizationLockoutError` / `managers_ever_existed` / counts до завершения админ-панели не переделывать. Затем отдельная очистка кода/схемы/тестов/контрактов и owner-role design.
- Старые условные формулировки source-of-truth не становятся AP-10 requirement вопреки прямому решению владельца.
- Не смешивать block appeal с Complaint-подобным пересмотром violation или отдельным owner recovery subsystem.


## Остальные обязательные owner decisions AP-10

- Разные нарушения создают разные measures с независимыми identity/reason/restrictions/lifecycle/History/quota. Одновременно активные меры допустимы; действие запрещено при наличии применимой активной restriction (EXISTS). Lift/expiry A не снимает effect B.
- До 3 последовательных appeals на exact measure, одновременно не более одной pending. Accepted appeal может снять либо изменить restrictions/срок той же active measure, сохраняя identity/quota и атомарный History/outcome.
- Expired/lifted measure terminal: продление/возобновление запрещены; повторное наказание — новая measure.
- User-facing measure/appeal/status/timeline не раскрывают concrete actor/issuer/reviewer ID/name или private internal History context. Identity остаётся в authorized internal History.
- Обе block-management capabilities имеют zero initial grants у всех built-in roles, включая admin/moderator. Права только explicit dynamic grants/overrides. Owner binding сам по себе права не выдаёт.



## Owner decision — Settings sequencing and AP-11 handoff

- Владелец выбрал: **Settings откладывается в отдельную будущую фазу**.
- Последовательность зафиксирована: **AP-11 → owner/authorization redesign → отдельный Settings package**.
- AP-11 закрывает integration/factual closeout фактически delivered ordinary-admin scope **AP-01–AP-10**. Settings placeholder не является blocker или current-scope defect AP-11; AP-11 не проектирует Settings operations/storage/API.
- После AP-11 отдельно выполняется уже зафиксированная owner/authorization model redesign; Settings проектируется только после неё, чтобы его permissions и owner-only boundaries опирались на целевую hierarchy.


## Подтверждённый AP-11 implementation/evidence result

- Полный 4-file diff reviewed: app/admin/users.tsx, app/forum/views.tsx, app/forum/public-read.test.tsx, tests/browser/user-measures/check.py.
- Reply 403: immediate render guard + explicit refresh latch закрывают повторный Publish/new Attach до fresh loader; editor/operation/Cancel и existing/in-flight attachment state сохраняются. Нет auto POST replay.
- Users detail narrow wrapping исправлен локальным reuse существующего profile-identity-copy, без изменений data/permission boundary.
- Actual connected Users grant/revoke выполняется через существующие canonical UI/actions с настоящими History deltas; fresh same-session 403 восстанавливает read-only detail без повторного POST.
- Browser matrix доказывает независимость closure и reply measure, в том числе оба запрета одновременно и два порядка их снятия; no-write/History/CAS проверяются в DB.
- Protected responses проверяют private и no-store; новый Users detail/admin topic locale/reflow scope покрыт EN/RU/HE × 320/768/1280.
- Schema/migrations/permissions/grants/dependencies/public contracts не менялись; last-manager правило не распространялось.

## Собственное независимое evidence Лёвы на exact head

- Node 24.21.0 / pnpm 12.3.4; 128/128 DOM/route/UI tests (6 файлов), собственная build PASS.
- Disposable loopback PostgreSQL 17 с full migrations 0000–0058 + built Worker + actual Better Auth + Chromium.
- 34 actual browser case groups PASS, including existing 19 AP-10 groups; 0 layout failures, 0 page errors, 0 external browser requests.
- Narrow Users detail EN/admin topic EN/HE screenshots просмотрены. Это engineering validation, не owner visual acceptance.
- Evidence: `/workspace/work/ap11-review-evidence/`, полный causal review и границы — linked report.
- Implementation не менялся; head/main перепроверены перед публикацией. Worker остановлен, disposable DB/dummy vars удалены, tracked checkout чист.

## Следующий шаг

- **Мира:** принять independent PASS и подготовить/координировать отдельный factual documentation closeout AP-11 по approved plan. Merge implementation/docs выполняет владелец.
- Не объявлять entire umbrella/Settings или production готовыми: Settings explicitly deferred; после завершения AP-11 следующий отдельный этап — owner/authorization redesign, затем Settings.
- Лёва назначенную проверку завершил и останавливается; любое изменение implementation head требует coordinator-first cycle.
- Stage 6/production/owner visual acceptance вне scope; Марк не назначен.

Общий контракт: [ADMIN_PANEL_IMPLEMENTATION_PLAN.md](../ADMIN_PANEL_IMPLEMENTATION_PLAN.md).




## AP-11 fully closed; owner/authorization redesign product gate

- Documentation PR #293 merged 2026-11-07. Final docs head: `6a7ce209bcb16e47a0c3054241c506fc1e305088`; merge commit/current `main`: `bcf02193f82aa0d448444c6943d6ebdcf09f7896`.
- AP-11 implementation #292 + documentation #293 are merged. **AP-11 is fully closed** in the approved repository/local-CI scope.
- Settings remains explicitly deferred. Approved sequence is now: **owner/authorization redesign → Settings**.
- Existing owner decisions already fixed:
  - the current last-access-manager invariant is architecturally wrong for the target model;
  - owner is the highest administrative authority;
  - subordinate authority cannot block/demote/lock out the owner;
  - owner must retain full forum administration, including roles/permissions;
  - recoverability must rely on explicit owner authority, not counting ordinary holders of `access.authorization.manage`;
  - the current `AuthorizationLockoutError` / `authz_mutation_lock.managers_ever_existed` / `countManagers()` protection must **not** simply be removed before a replacement owner model exists.
- The current permanent authorization contract still truthfully describes the old lockout implementation; it is now the target of this separate redesign, not a requirement to preserve unchanged.

### Product decisions still required before technical planning

Do **not** assign Лёва a technical implementation plan yet. The target owner model still needs owner-level product decisions on at least:
1. which forum actions are strictly owner-only and cannot be delegated;
2. whether a senior/head-admin authority exists, how it is granted/revoked, and its boundary below owner;
3. what owner recovery/emergency path exists if ordinary authorization grants are removed or misconfigured;
4. what sensitive administrative audit/data is owner-only versus permission-delegable;
5. which infrastructure/project-owner operations remain outside forum RBAC entirely.

These are product semantics, not implementation details. Technical planning starts only after this bounded owner model is fixed. Settings remains out of scope until the redesign is completed.

# Admin panel — communication

Служебный PR: #251. Оперативное состояние: [workflow.md](./workflow.md).

## Актуальный baseline и назначение

- Current main: `bcf02193f82aa0d448444c6943d6ebdcf09f7896`, migrations 0000–0058.
- AP-01–AP-11 полностью закрыты; #292 implementation и #293 factual docs merged.
- Текущий этап — owner/authorization redesign Stage1: технический план удаления last-manager опубликован, ожидает coordinator review.
- [План #6700603167](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6700603167); implementation не начинался.
- Current next actor: Мира — review плана; Лира после approval.

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
- Админ-панель завершена; owner явно назначил Stage1 удаления `AuthorizationLockoutError` / `managers_ever_existed` / counts. Прежнее ожидание окончания админ-панели выполнено. Mutex сохраняется; owner authority implementation остаётся отдельным этапом.
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

- Мира review Stage1 technical plan #6700603167; после approval назначить Лиру. Ordinary Admin Panel уже закрыт.
- Owner authority implementation, Settings, Stage6/production не начинаются в Stage1; Марк не назначен.

## AP-11 fully closed; owner/authorization redesign Stage 1

- Documentation PR #293 merged; current `main`: `bcf02193f82aa0d448444c6943d6ebdcf09f7896`.
- AP-11 fully closed. Settings remains deferred until owner/authorization redesign is complete.

### Owner decision — first redesign stage

- Forum is still pre-release/not launched.
- Remove the obsolete **last-manager** mechanism now:
  - `AuthorizationLockoutError`;
  - `managers_ever_existed`;
  - `countManagers()`;
  - dedicated last-manager checks/tests.
- **Do not remove `authz_mutation_lock` in this stage.** Current AP-10 authorization/measure authority paths use the singleton row as a transaction mutex independently of last-manager.
- Mutex redesign/removal is a separate later technical question.
- Owner authority implementation, Settings and super-admin UI are not part of this first stage.

### Technical planning handoff — Лёва

Required result:
- prepare a minimal technical plan for removing only the last-manager mechanism;
- preserve current `authz_mutation_lock` synchronization semantics needed by authorization mutations and AP-10 measure authority;
- identify exact code, forward-migration/schema and test changes that must move together;
- verify there is no hidden dependency on `managers_ever_existed`/manager counting outside the obsolete invariant;
- do not implement the change yet;
- record the plan in #251 and stop. Выполнено: #6700603167; следующий шаг — coordinator review Миры.

## Stage1 technical planning result — Лёва

- [План #6700603167](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6700603167) подготовлен на current main; полный контекст в личном файле.
- Runtime flag/count используется только AuthorizationRepository.mutate; не выявлено hidden callers вне старого invariant. Есть schema/manifest/mock и historical migration artifacts.
- authz_mutation_lock independently нужен authorization mutations, AP-10 writers/readers и SELECT/UPDATE runtime probe. Row/table/PK/CHECK/FOR UPDATE сохраняются.
- Implementation target: удалить veto/error/count/flag path; forward0059 DROP COLUMN без удаления mutex; Drizzle current snapshot/journal и structural manifest согласуются. Accepted0000–0058 не переписываются.
- Удаляется lockout route mapping и ложная canonical EN/RU/HE conflict copy, сохраняется assigned-role409. Dedicated старые tests/assertions снимаются локально, соседние forbidden/History rollback/atomicity tests сохраняются.
- Native checks: допустимый self-revoke/role/grant removal committed с History; следующий request forbidden; controlled mutex/fresh-authority concurrency и AP-10 suite; clean/upgrade schema+fullCI.
- Updated admin-history browser переносит positive self-revoke в конец, чтобы не ломать последующие assertions; existing AP-10/AP-11 browser остаётся regression. Новых recovery/confirmation/owner flows нет.
- Постоянные active lockout requirements в AUTHORIZATION/ADMIN_PANEL/PROJECT_STATE/ROADMAP/UI_UX_PASS и browser README обновляются отдельным docs closeout. History/doc_old/старые accepted snapshots не чистятся задним числом.
- Code/schema/tests/runtime/production не менялись; implementation PR не создан. Новых owner product decisions нет.
- **Мира:** coordinator review, синхронизировать superseded master-plan clauses с уже данным owner decision; после approval назначение Лиры. Лёва planning завершил и остановился.


## Stage 1 technical plan — coordinator PASS

- Лёва completed technical plan #6700603167 on current main `bcf02193f82aa0d448444c6943d6ebdcf09f7896`.
- Coordinator review: **PASS**.
- Confirmed scope is minimal and current-stage:
  - remove `AuthorizationLockoutError`, `countManagers()`, `managers_ever_existed` and dedicated veto semantics/tests;
  - forward migration 0059 drops only `managers_ever_existed`;
  - keep `authz_mutation_lock` singleton row/table/PK/CHECK and `FOR UPDATE` synchronization;
  - keep existing SELECT + UPDATE runtime privilege on the mutex because PostgreSQL 17 requires UPDATE privilege for row-locking SELECT ... FOR UPDATE;
  - preserve fresh authorization checks, AP-10 raw authority/issuer-floor semantics, atomic History and rollback behavior;
  - no owner authority, Settings, super-admin UI, mutex redesign/removal or production rollout in Stage 1.
- No hidden runtime caller of manager counting/flag was found outside the obsolete last-manager invariant.
- Old master-plan AP clauses that could read as active last-manager requirements were marked superseded; historical implementation meaning is retained.
- Implementation sequence approved: one bounded implementation PR → stable exact-head CI/browser evidence → Mira whole-PR review → Лёва independent review → owner merge → separate documentation closeout.

### Implementation handoff — Лира

Implement the approved Stage 1 plan from #6700603167 against current `main`.

Required result:
- remove only the obsolete last-manager mechanism and its active runtime/UI/test/schema semantics;
- add the forward migration/current schema metadata required by the approved plan;
- preserve `authz_mutation_lock` as the shared authorization/AP-10 mutex and preserve its runtime privileges/lock probes;
- preserve all non-lockout authorization, History, AP-10 authority, privacy and revalidation behavior;
- update the affected browser verification so permitted self-revoke is tested at the end without breaking later steps;
- run applicable full CI and the approved admin-history + AP-10/AP-11 browser regression on a stable exact head;
- do not change permanent documentation in the implementation PR; docs closeout is separate;
- do not implement owner authority, Settings, super-admin UI, mutex redesign/removal or production changes.

When implementation and evidence are complete, record PR number/exact head/checks in #251 and stop for coordinator review.


## Stage 1 implementation — coordinator PASS

- Implementation PR **#294** reviewed as a whole on stable exact head `e3604222ae8cecb4b1f2f94cdd5d7e9f76c15e61`, base/main `bcf02193f82aa0d448444c6943d6ebdcf09f7896`.
- Coordinator verdict: **PASS**. No confirmed current-scope defects.
- Reviewed all 21 changed files, including runtime, route/UI feedback, migration 0059, Drizzle snapshot/journal, production schema manifest, PostgreSQL tests, both browser harnesses and workflow.
- Verified schema delta: 0058→0059 changes only `authz_mutation_lock.managers_ever_existed`; table/row/PK/CHECK remain.
- Verified runtime: last-manager veto/error/count/flag removed; singleton `FOR UPDATE` mutex, fresh `access.authorization.manage` check, AP-10 measure admission/authority and atomic History rollback remain.
- Verified behavior: self-revoke may commit with one History event; next fresh management request is denied; failed History append still rolls back the mutation.
- Verified synchronization: controlled PostgreSQL concurrency test shows authorization and AP-10 writers wait on the retained mutex and reevaluate fresh authority after release.
- Exact-head CI #42328843126 SUCCESS: 1967/1967 app tests, 563/563 PostgreSQL tests, lint/typecheck/build/migrations/manifest/runtime probes/Worker smoke.
- Exact-head browser #42328843151 SUCCESS:
  - Stage1 Admin History artifact: 35 cases, no page errors, no external requests, terminal canonical self-revoke + next-request denial;
  - AP-10/AP-11 artifact: 34 cases, zero layout failures/page errors/external requests, exact implementation head recorded.
- The absence of a separate populated-full-0058 upgrade rehearsal is not a current-scope defect: the migration is a single bounded DROP COLUMN, clean full migration chain passes, and the compatibility test verifies both historical flag values while preserving mutex row/PK/CHECK. No unrelated table mutation is present in 0059.
- Implementation remains frozen. Any implementation-head change restarts coordinator review.

### Independent review handoff — Лёва

Review PR #294 independently on exact head `e3604222ae8cecb4b1f2f94cdd5d7e9f76c15e61`.

Scope:
- verify the full Stage1 diff against approved plan #6700603167 and current main/source-of-truth;
- independently confirm that only obsolete last-manager semantics are removed;
- confirm `authz_mutation_lock` still correctly synchronizes authorization/AP-10 authority and that runtime privileges remain sufficient;
- verify migration/schema/manifest/test/browser evidence and the new self-revoke/fresh-denial behavior;
- classify any issue as current Stage1 defect vs later owner/mutex redesign; do not request future-stage work as a Stage1 fix;
- do not modify implementation during review;
- record PASS or findings in #251 and stop.

Owner authority, mutex redesign/removal, Settings, Stage6/production remain outside Stage1.

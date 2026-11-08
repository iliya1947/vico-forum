# Admin panel — communication

Служебный PR: #251. Оперативное состояние: [workflow.md](./workflow.md). Общий контракт: [ADMIN_PANEL_IMPLEMENTATION_PLAN.md](../ADMIN_PANEL_IMPLEMENTATION_PLAN.md).

## Актуальный baseline и назначение

- Current main/base: `35fa64428fc551ae58b9026dad45797016dd4251`; SET-01–03 implementation + separate factual docs closed; migrations0000–0060.
- Current stage: **SET-04 independent technical whole-PR review complete — CHANGES REQUIRED**.
- PR **#307**, frozen reviewed `5cc5c820b0445ddb57cf3663e7cfb33c059ab108`, open/Ready/unmerged;38-file scope.
- Coordinator Мира PASS на этом head; Лёва independently подтвердил **ровно1 current-scope P2: SET04-LEV-01**. Других current-scope defects не установлено.
- [Independent report #6718927323](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6718927323): real Better Auth/Worker/PG/Chromium close-only actor имеет direct Admin200 и Administrator preferences200, но в новом Settings landing/nav0 ссылок на Administrator preferences. Sibling pin grant даёт2 ссылки; отзыв только pin снова0, direct route остаётся200.
- Причина: новый entry projection/Settings navigation наследуют неполный header admin capability Set без forum.topic.close. Старый header omission существовал в baseline; finding scoped к новой SET-04 доступности/entry projection, а не общий historical header audit. Нужна согласованность с существующей authoritative admission matrix, без новых прав/role exceptions.
- **SET04-MIRA-01 independently remains closed:** настоящая command-created measure, real detail loader → compact density, adminLast=measures и preference record unchanged/no private IDs/path; другой authenticated actor403.
- Own checks:251 application tests/21files,9 native PG/3files,build;10 SET-04 browser groups PASS/0 errors/external requests и4 own workspace probe groups. GitHub exact-head CI #42458305882/browser #42458305779 SUCCESS/attempt1,all4 browser jobs.
- Evidence `/workspace/work/set04-review-evidence/`; implementation unchanged/checkout clean, own runtime/container/DB/vars/symlink убраны.
- **Next — Мира:** подтвердить/направить Лире один bounded SET04-LEV-01 correction в #307. Новый head/checks → fresh coordinator-first cycle. К merge сейчас не готовить.
- Лёва завершил review и остановился; Марк не назначен. SET-05/06, factual docs, deputies и Stage6/production вне scope.


## Handoff — Лира: Stage2 factual documentation closeout

Create a separate docs-only PR from current main `df57dabf2a4cbc44d85138d8809079878490a7c8`.

Required result: synchronize permanent documentation with the Stage2 implementation that is now in main, without changing runtime behavior or expanding scope.

Bounded files:
1. `docs/auth/AUTHORIZATION.md` — replace obsolete future-Owner wording with the implemented server-bound Owner authority: all code-backed catalog permissions, raw role/grant/override preservation, trusted binding, fresh resolution, Owner-only elevated grant/revoke boundary, measure immunity, retained mutex/no last-manager veto, and external binding/production acceptance boundary.
2. `docs/ADMIN_PANEL.md` — update AP-10/Owner wording so Owner is no longer described as a future redesign; preserve raw non-Owner hierarchy, Owner-target prohibition, Settings deferral, privacy and measure semantics.
3. `PROJECT_STATE.md` — record Stage2 as merged in repository/local-CI state, keep production/external acceptance explicitly unfinished, and update nearest route accordingly.
4. `ROADMAP.md` — replace superseded future owner-authority wording with the implemented repository model; keep external owner binding/bootstrap/deployed acceptance in Stage6 and keep Settings after redesign closeout.
5. `tests/browser/user-measures/README.md` — factually describe the Stage2 Owner/elevated-authority cases already exercised by the existing browser harness; do not claim owner visual or production acceptance.
6. `docs/PROJECT_HISTORY/PROJECT_HISTORY.md` — add navigation entry for the Stage2 snapshot.
7. `docs/PROJECT_HISTORY/PROJECT_HISTORY_15.md` — new dated historical snapshot for Stage2 implementation/review/correction/merge, including final exact head, merge commit and verified acceptance status; clearly historical, not source of truth.

Do not modify code, schema, migrations, dependencies, Settings, super-admin UI, infrastructure or production state. Do not invent unperformed acceptance. When the docs PR and applicable checks are complete, publish PR + stable exact head in #251 and stop for Mira review.

## Зафиксированная целевая Owner модель

- Owner — отдельная server-controlled верхняя authority, **не роль из конструктора**. Identity не определяется ролью, email, client input или permission snapshot.
- Ниже Owner сохраняются существующие dynamic role permissions, одна назначенная роль на пользователя и per-user allow/deny/inherit. Нет новой встроенной Senior/Head Admin роли или второго RBAC/hierarchy слоя.
- Owner получает все существующие code-backed permissions централизованного `PERMISSION_CATALOG`, включая participation, независимо от обычной роли и overrides. Новые реально добавленные catalog permissions автоматически входят в Owner authority; неизвестные capability strings права не дают. Subordinate administrative measures не могут target Owner.
- `admin.users.blocks.managePrivileged` остаётся обычным permission в существующем конструкторе; custom role может его содержать. **Только bound Owner** может выдавать/отзывать его через role grants, назначения в/из elevated role и per-user overrides. Одного `access.authorization.manage` недостаточно для делегирования/self-grant.
- Infrastructure/deployments/secrets и изменение server-controlled owner binding вне forum RBAC. Settings проектируется после этой модели.
- Продуктовая модель зафиксирована; новых owner-level product questions для текущего технического плана нет.

### Текущее поведение и предлагаемый Stage2 — различать

В baseline main binding уже применяется для AP-10 target/rank и elevated gate, но **ещё не даёт Owner независимых effective permissions**. Это ограничение текущей реализации, а не целевой контракт. Zero initial block grants у обычных built-in roles сохраняются; будущая Owner authority не является seed grant.

Предлагаемый план Stage2:
1. Общий trusted Owner predicate и effective projection по текущему code-backed catalog; raw roles/grants/overrides не переписываются. У non-Owner прежний deny > allow > role.
2. Согласовать resolve/has/bulk/targeted и fresh transaction authorization, не ограничиваться route/header bypass.
3. Применить Owner immunity согласованно в permission filtering, native/Drizzle admissions, request wiring и UI hints. Существующие measure строки/History не переписывать; domain/session/Origin/ownership/CAS/lifecycle constraints сохранить.
4. Сохранить Owner-only elevated gate; покрыть косвенный revoke удалением неназначенной elevated custom role: source chain подтверждён `deleteCustomRole` + ON DELETE CASCADE role grants. Runtime exploit в planning turn не запускался.
5. Минимально согласовать закрытый UI, сохранить правдивую обычную роль и объяснить Owner effective authority. Нет публичной Owner роли, binding editor или super-admin UI.
6. Mutex оставить без redesign; schema/migrations/seeds/dependencies не расширять. Проверки и отдельный factual docs closeout описаны в полном плане.

Эти пункты — техническое предложение до coordinator approval, не реализованные результаты.

## Последний управляющий — действующее решение владельца

- Принцип сохранения хотя бы одного доступного access manager не применяется в planning/review/enforcement. Нет manager-count veto, специального recovery/lockout слоя или требования сохранить доступного управляющего.
- Stage1 удалил `AuthorizationLockoutError`, `countManagers`, `managers_ever_existed` и dedicated veto. Self-revoke/role/grant changes могут оставить zero ordinary managers; следующий fresh request отозванного actor denied.
- `authz_mutation_lock` сохранён как shared mutex: singleton id=1, table/PK/CHECK, FOR UPDATE, SELECT+UPDATE privileges и lock probe. Fresh authorization/AP-10 authority/elevated-key/issuer-floor guards и atomic History сохранены.
- Owner authority не заменяет отменённый принцип новым count/veto. Mutex redesign/removal включается только при доказанной технической необходимости; текущий Stage2 план её не обнаружил.

## Остальные обязательные owner decisions AP-10

- Мера — configurable child restriction set. Group checkboxes выбирают дочерние пункты; duration temporary/permanent независим от состава. Presets — только UI shortcuts.
- Catalog: create topics/Help, replies, new uploads, own published edits, public profile edits, Complaint reports, Help signals, translation generation. Для privileged target — соответствующие Forum/Help, Complaints, Security, Users/access administrative families с private reads и mutations.
- Public reading/login/session/notifications/own status и любые domain appeal submissions не входят в restriction catalog. Own solved/best answer и source-locale correction не выделяются отдельными punitive restrictions.
- Причина обязательна для create, manual restrictions/срок changes и explicit lift. Original reason не затирается; automatic expiry не создаёт synthetic reason/admin event. Denied/stale/failed/no-op/replay не создают reason/history event.
- Self-target create/change/lift запрещён. Target/issuer comparison действует на create/change/lift по текущим permissions, не по имени роли. Повышенная capability сама по себе не заменяет basic block-management action grant.
- Разные нарушения создают независимые measures: identity/reason/restrictions/lifecycle/History/quota отдельные. Overlap допустим; EXISTS применимой active restriction запрещает действие. Lift/expiry A не снимает effect B. Возвращаются лишь возможности актуального RBAC/resource state.
- Block appeal — отдельный domain exact measure, не Complaint/Complaint Appeal. До 3 последовательных submissions на measure, одновременно одна pending. Право подачи не отключается restrictions. Accepted appeal может снять либо изменить restrictions/срок той же active measure с атомарным History/outcome.
- Edit measure не меняет identity/quota и не закрывает pending appeal. Expiry/lift делают pending appeal утратившей предмет; terminal measure нельзя реактивировать, повторное наказание — новая measure.
- User-facing own measure/appeal/status/timeline не раскрывают concrete actor/issuer/reviewer ID/name или private internal History context. Identity остаётся в authorized internal History.
- Обе block-management capabilities имеют zero initial grants у всех built-in roles, включая admin/moderator. Для обычных пользователей права выдаются explicit grants/overrides; это не ограничивает целевую отдельную Owner authority.

## Подтверждённый закрытый Stage1 result

- #294 exact head `e3604222ae8cecb4b1f2f94cdd5d7e9f76c15e61`: coordinator whole-PR PASS + [independent Лёва PASS #6701647394](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6701647394), zero confirmed current-scope defects. Approved plan #6700603167.
- Whole21-file diff; active runtime/count/error/flag veto удалены без замены. Допустимые zero-manager changes committed с History; History failure rollback сохранён.
- 0059 drops только `managers_ever_existed`; snapshot/manifest/schema/journal согласованы. Accepted0000–0058 unchanged; mutex row/PK/CHECK сохранены.
- Собственные проверки Лёвы: 23 unit/route/UI + 112 native PostgreSQL tests; metadata3/build; populated0058→0059 probe для false/true с payload9 relations; Chromium→Worker→Better Auth→PG History35 и AP-10/AP-11 34 cases. Exact-head author CI #42328843126 и browser #42328843151 SUCCESS отдельно от собственных reruns.
- Evidence: `/workspace/work/stage1-review-evidence/`. Implementation не менялся во время review; disposable runtime остановлен/удалён.
- #294 merged main `e20490bc2d80c696bdf78e62539a8e1440821f9e`.
- Separate factual docs #295 head `a431b5fc35b577b301f206e7f046645ce1da4c35`: ровно8 documentation files; exact-head CI #42335079631 и browser #42335079658 SUCCESS; merged current main `8301087f9322b34bdd325ed9298fdf3fddd84561`.
- Active source-of-truth синхронизирован со Stage1 runtime; historical artifacts сохранены как история. Stage1 fully closed; эти PASS не распространяются на будущий Stage2.


## Stage2 revised plan — authoritative AP-10 path

- Coordinator finding 1 (administrative-only Owner) отозван после Owner clarification. Действует all-catalog Owner model, включая future real catalog entries; raw ordinary RBAC не уменьшает Owner authority.
- Remaining coordinator finding 2 учтён в [revision #6702520494](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6702520494) и полном личном плане Лёвы. Это исправление плана, не runtime fix и не coordinator PASS.
- Source chain подтверждена на baseline: create/change/lift/resolveAppeal → transaction mutex → fresh actor/target → `authority()` → `assertUserMeasureAuthority()`; private `adminRead()` и `adminPendingAppeals()` используют тот же assertion, а очередь имеет отдельный ранний raw-manage precheck.
- План явно требует: raw actor/target sets из фактических grants/overrides до Owner projection/sanction filtering; не передавать enriched effective list как raw. Только non-Owner обязан иметь raw basic block-manage key. Bound Owner определяется общим server predicate и получает rank3; затем проходят прежние self/Owner-target, strict actor>target, issuer-floor validation/comparison и прочие guards. Early-success return не вводится.
- Precheck очереди получает то же Owner-or-raw-manage правило; per-target/floor visibility сохраняется. Native PG acceptance дополняется Owner raw-deny create/change/lift/accepted+rejected review, target/detail/queue и floor3; non-Owner raw hierarchy/deny/privacy не изменяются.
- Остальной scope исходного плана сохраняется: shared mutex, no schema/migration, полный elevated grant/revoke gate включая role deletion, отдельный docs closeout. Implementation/CI/browser не выполнялись.
- **Мира:** повторно проверить revised plan; при PASS назначить исполнителя. В master plan §6.4 ещё осталась superseded administrative-only формулировка — синхронизировать с уже принятым all-catalog Owner decision, не выносить повторный product question.
- Исполнитель/implementation PR не назначены. Лёва завершил локальную правку и остановился; Марк не назначен.


## Stage 2 revised technical plan — coordinator PASS

- Revised Lev plan reviewed against main `8301087f9322b34bdd325ed9298fdf3fddd84561` and current source.
- Owner all-catalog decision is now reflected consistently in the master plan; superseded administrative-only clause removed.
- AP-10 revision #6702520494 correctly closes the remaining authoritative path:
  - bound Owner bypasses only the raw basic `admin.users.blocks.manage` admission requirement;
  - Owner still receives rank 3 from server binding;
  - self/Owner-target prohibition, strict actor>target, issuer-floor validation/comparison and lifecycle guards remain;
  - non-Owner hierarchy continues to use raw RBAC, not Owner-enriched effective permissions;
  - pending-appeal discovery receives the same Owner-or-raw-manage admission rule and still filters each target/floor.
- Coordinator verdict: **PASS**, zero remaining confirmed plan defects.
- Approved Stage2 plan = #6702391114 + AP-10 authoritative revision #6702520494 + Owner all-catalog clarification already recorded in #251.

### Handoff — Лира

Implement the approved bounded Owner/authorization Stage2 plan on a separate implementation PR from current main.

Required result:
- bound `VICO_OWNER_USER_ID` gets all current/future code-backed catalog permissions regardless of stored role/grants/overrides;
- Owner authority works consistently in central authorization reads, fresh transactional authorization, admin/measure UI and direct admission paths;
- AP-10 authoritative paths allow bound Owner while preserving raw-RBAC hierarchy for every non-Owner;
- `admin.users.blocks.managePrivileged` remains grant/revoke Owner-only, including indirect revoke via deleting an elevated custom role;
- Owner is immune to subordinate administrative measures without rewriting historical measure rows/events;
- no new role hierarchy, no schema/migration, no Settings/super-admin/infra work, no mutex redesign unless an actual implementation blocker proves it necessary.

Read Lev's full approved plan before implementation. Reuse existing test/browser harnesses and complete applicable checks. Do not update permanent project documentation in the implementation PR; docs remain a separate closeout PR after merge. When implementation and checks are complete, publish the implementation PR + stable exact head in #251 and stop for Mira coordinator review.

## PR #296 coordinator review — block 1/4 PASS

- Stable exact head: `04865401cd5c2a69941cb458d0df1fc7424a37f7`; base `8301087f9322b34bdd325ed9298fdf3fddd84561`.
- Reviewed central Owner authority implementation and focused tests:
  - `app/authorization/owner.ts`
  - `db/authorization-repository.ts`
  - authorization/admin route Owner predicates
  - Worker trusted binding composition relevant to central authority
  - Owner/repository/PostgreSQL tests and Node TS inclusion.
- Confirmed:
  - only exact valid server binding creates Owner authority;
  - existing DB user is still required;
  - bound Owner receives all current code-backed `PERMISSION_CATALOG` entries;
  - unknown permission strings do not become authority;
  - bulk, targeted, resolver/direct `hasPermission` and fresh authorization mutation paths agree;
  - stored role/grants/overrides remain factual and unchanged; `authoritySource: owner` is projection metadata only;
  - non-Owner deny > allow > role behavior is unchanged;
  - no schema/migration/seed/new role layer introduced.
- Verdict for block 1/4: **PASS**, zero confirmed current-scope defects.
- Whole-PR coordinator PASS is NOT yet claimed. Next block: AP-10 authority/immunity/direct admission wiring.


## PR #296 coordinator review — block 2/4 PASS

- Stable exact head remains `04865401cd5c2a69941cb458d0df1fc7424a37f7`.
- Reviewed AP-10 authoritative authority, persisted-measure immunity and direct admission wiring end-to-end.
- Confirmed:
  - AP-10 derives raw actor/target authority from stored grants + overrides, not Owner-enriched effective permissions;
  - only bound Owner bypasses the raw `admin.users.blocks.manage` prerequisite; rank3, self/Owner-target prohibition, strict target hierarchy and issuer-floor checks remain;
  - pending-appeal discovery uses the same Owner-or-raw-manage admission and still applies per-target/floor filtering;
  - stored active measures remain persisted/history-preserving but do not restrict the currently bound Owner;
  - invalid/malformed Owner binding does not grant immunity;
  - one Owner-aware admission closure is wired from Worker into the existing Forum repository path, covering topic/reply/profile/post/help-signal and other existing forum measure checks, plus attachment store;
  - Complaint submission/queue/review/appeal repositories receive the same Owner-aware measure admission;
  - content-generation admission receives trusted Owner binding; generation remains otherwise unchanged/disabled;
  - administrative permission suppression wrapper bypasses saved sanctions only for exact bound Owner; non-Owner raw rank and restriction semantics remain unchanged;
  - no historical measure rows/events are rewritten or synthetically lifted.
- Focused unit/native PG coverage verifies Owner raw-deny create/change/lift, accepted/rejected appeal handling, private reads/queue, floor3, direct Drizzle/native admissions, stored-sanction retention and invalid-binding behavior.
- Verdict for block 2/4: **PASS**, zero confirmed current-scope defects.
- Whole-PR coordinator PASS is NOT yet claimed. Next block: private UI / Owner explanation / elevated-permission grant-revoke surfaces including elevated custom-role deletion.


## PR #296 coordinator review — block 3/4: 1 current-scope verification finding

- Stable exact head remains `04865401cd5c2a69941cb458d0df1fc7424a37f7`.
- Reviewed closed Owner management UI and the complete elevated-permission mutation chain for `admin.users.blocks.managePrivileged`.
- Runtime/source chain confirmed:
  - server-derived `canManageElevated` is true only for the exact bound Owner; no form field/binding editor/public Owner role is introduced;
  - stored ordinary role, grants and explicit denies remain visible/factual while Owner effective authority is explained separately;
  - non-Owner UI hides the elevated role-grant checkbox and per-user override, filters elevated assignment targets, disables assignment away from a currently elevated role, and hides deletion of elevated custom roles;
  - ordinary edits to other grants on an elevated role preserve the protected key through a hidden field rather than silently revoking it;
  - authoritative repository gate is inside the serialized authorization mutation transaction and covers add/remove role grant, assignment into/out of an elevated role (including implicit default role), per-user allow/deny/inherit, and deletion of an elevated custom role;
  - direct malicious POST does not rely on UI filtering; service/hyperdrive paths terminate in the same repository mutation methods; ordinary role rename/other grants remain ordinary operations.
- **STAGE2-MIRA-01 — required elevated grant/revoke acceptance is incomplete.** Approved Stage2 plan §7 requires the Owner-only gate to be verified for all four mutation families and the real browser acceptance to prove Owner grant to role/user with fresh-request reflection. Current exact-head evidence proves non-Owner direct 403 for all four families and Owner success for adding the elevated role grant plus deleting that elevated role, but it does not exercise Owner-success for assignment into/out of an elevated role, per-user elevated override transitions, or explicit Owner removal of the elevated role grant. `tests/database/owner-authorization.test.ts` contains no elevated-key mutation coverage; UI tests cover presentation only. Therefore the implementation logic is not currently shown defective, but the mandatory Stage2 verification contract is not fully satisfied.
- Verdict for block 3/4: **NOT PASS because of STAGE2-MIRA-01**. Whole-PR coordinator review continues; do not hand this finding to Лира yet so confirmed findings can be returned as one package after block 4/4.
- Next block: remaining integration/privacy/History/localization/regression boundaries and final coordinator verdict.


## PR #296 coordinator whole-PR review — final verdict: CHANGES REQUIRED

- Reviewed frozen exact head `04865401cd5c2a69941cb458d0df1fc7424a37f7` against approved Stage2 plan and current main `8301087f9322b34bdd325ed9298fdf3fddd84561`.
- Blocks 1/2 passed: central Owner authority and AP-10 authority/immunity/direct admissions are coherent and no current-scope defect was confirmed there.
- Block 3 confirmed one current-scope verification finding, `STAGE2-MIRA-01`.
- Block 4 checked remaining integration/privacy/History/localization/Worker/regression boundaries and found no additional current-scope defects:
  - subject measure DTO/history projection remains an explicit allowlist and still excludes issuer/reviewer/History actor identity and raw private context;
  - private admin routes retain authentication/permission guards and private no-store behavior; Owner projection does not become a public badge/binding editor;
  - Worker validates `VICO_OWNER_USER_ID` once and propagates the trusted result through authorization, measures, Forum/attachments, Complaints and dormant generation admission;
  - Owner authority explanation is present in EN/RU/HE with reviewed manual fingerprints; exact-head browser acceptance covers EN/RU/HE at 320/768/1280 without reported layout/page-error/external-request failures;
  - CI #42345404967 is SUCCESS on exact head; AP-10 isolated browser #42345404812 is SUCCESS on attempt 2 on the same exact head. The first browser attempt's AP-11 Users-detail 503 remains unroot-caused; unchanged head passed rerun, so no reproducible current-scope defect is established from that transient alone;
  - PR #296 changed-file set contains no schema/migration/permanent-doc/Settings/super-admin/infra expansion.
- **Final coordinator verdict: CHANGES REQUIRED, exactly one confirmed current-scope finding: `STAGE2-MIRA-01`.**

### STAGE2-MIRA-01 — required elevated grant/revoke acceptance incomplete

The approved Stage2 plan requires Owner-only verification for all four elevated-authority mutation families and real-browser proof that Owner can grant elevated authority to role/user and that the next request reflects it. Current exact-head evidence proves non-Owner direct 403 for all four families and Owner success for adding an elevated role grant plus deleting the elevated role, but does not prove Owner-success assignment into/out of an elevated role, per-user elevated override transitions, or explicit Owner removal of the elevated role grant. Native PostgreSQL Owner authorization tests also contain no elevated-key mutation acceptance. No runtime bypass is currently confirmed; the required acceptance contract is incomplete.

### Handoff — Лира

Close only `STAGE2-MIRA-01` in PR #296. Complete the approved Stage2 elevated-authority acceptance so Owner-success is demonstrated for the missing mutation paths and the required fresh-request behavior, while existing non-Owner denial/History semantics remain intact. Change runtime code only if the completed verification exposes an actual defect. Run applicable exact-head CI/browser checks, publish the new stable head and evidence in #251, then stop for a fresh Mira coordinator whole-PR review. Do not update permanent documentation in this implementation PR.


## PR #296 fresh coordinator whole-PR review — PASS

- Exact head: `824ab8eccb091664c2e7d37f81f2737e7fd43e87`; base/main: `8301087f9322b34bdd325ed9298fdf3fddd84561`.
- Compared against the previously reviewed failing head `04865401cd5c2a69941cb458d0df1fc7424a37f7`: 4 commits ahead, exactly two changed files (`tests/database/owner-authorization.test.ts`, `tests/browser/user-measures/check.py`), no runtime/application/schema/migration/docs change.
- `STAGE2-MIRA-01` is closed:
  - native PostgreSQL acceptance now exercises Owner role grant add/remove, assignment into/out of elevated role, per-user elevated allow/deny/inherit, immediate fresh `hasPermission` results and exact History sequence;
  - real Chromium → built Worker → Better Auth → PostgreSQL uses canonical Owner UI for all protected mutation families, verifies DB state, fresh recipient requests, rank2 presentation changes, explicit role-grant removal, assignment revoke and History count;
  - existing direct non-Owner 403 checks remain in the same browser path.
- Exact-head GitHub evidence independently checked:
  - CI #42349494000: `checks` SUCCESS with 155/155 files and 1974/1974 app tests; `database` SUCCESS with 47/47 files and 571/571 tests; `owner-authorization.test.ts` 5/5;
  - AP-10 isolated browser #42349494094: `browser` SUCCESS and `history_browser` SUCCESS; log includes `stage2-owner-elevated-assignment-overrides-explicit-grant-revoke-fresh-requests-history` and final Stage2 Owner elevated-authority case.
- Runtime implementation is byte-for-byte unchanged from the head already reviewed across coordinator blocks 1–4, so the prior confirmed runtime conclusions remain applicable; the only former blocker was missing required acceptance evidence.
- Final coordinator verdict on PR #296 exact head `824ab8eccb091664c2e7d37f81f2737e7fd43e87`: **PASS, zero confirmed current-scope defects**.
- Implementation stays frozen. Next workflow step is independent technical review by Лёва on this same exact head.


## Independent technical review Лёвы — PASS

- [Report #6704068605](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6704068605) на exact `824ab8eccb091664c2e7d37f81f2737e7fd43e87`, base/main `8301087f9322b34bdd325ed9298fdf3fddd84561`. Весь34-file diff проверен самостоятельно; code/schema/migrations при review не изменялись.
- Central catalog-bound Owner projection согласована с resolver/has/bulk/targeted/fresh transaction check; raw role/grants/overrides сохранены. Неизвестные permissions и отсутствующий user не повышаются.
- AP-10 raw actor/target evaluation отделён от Owner projection. Owner-only basic-manage admission, rank3, self/Owner target, strict target/issuer floor, private discovery и all lifecycle/appeal paths согласованы.
- Owner immunity применена в native/Drizzle admission, Worker wiring и hints без удаления старых measures/History. Non-Owner/domain/session/Origin/ownership/CAS boundaries сохранены.
- Elevated grant/revoke покрывает role grants, assignment, override и role deletion; UI truthful/private/localized. Нет второго RBAC, schema/migration/seed/Settings/super-admin/infra/mutex redesign или возврата last-manager.
- Собственные local checks: 56 unit/route/UI (8 files),96 native PG (8 files), build PASS; дополнительный собственный PG probe —2 observed mutex waits, Owner commit vs fresh revoked actor denial, forced History failure rollback, preserved stored restrictions/History.
- Actual Chromium→built Worker→Better Auth→PG: AP-10/AP-11/Stage2 37 groups + отдельная History35 PASS. AP-10:0 layout/page errors/external requests; History:0 page errors/external requests. Canonical Owner elevated success/revoke/fresh recipient state и ordinary self-revoke подтверждены.
- AP-10 environment adapter изменяет только checkout path/Chromium executable; все assertions/cases сохранены, exact comparison проверен. History runner из exact checkout. Full1974/571 локально не заявлены как rerun; GitHub exact-head runs отдельно SUCCESS.
- Evidence: `/workspace/work/owner-stage2-review-evidence/` (logs/probe/results/screenshots/manifest/hashes). Tracked checkout clean, task-owned Workers/disposable container/DBs/dummy vars/dependency symlink removed.
- **Мира — next:** readiness/owner merge route, затем separate factual docs closeout. Лёва остановился, implementation frozen; Марк не назначен.


## PR #296 — Stage 2 implementation readiness complete

- Frozen exact head `824ab8eccb091664c2e7d37f81f2737e7fd43e87`; base/current main `8301087f9322b34bdd325ed9298fdf3fddd84561`.
- Mira coordinator whole-PR review: PASS, zero confirmed current-scope defects.
- Lev independent technical review: PASS, zero confirmed current-scope defects; full 34-file diff independently checked against approved Stage2 contract.
- Exact-head GitHub checks remain green; independent review also reran bounded unit/native PG/browser evidence.
- PR #296 was converted from Draft to Ready for review and is mergeable. Implementation remains frozen.
- No owner visual acceptance or production/deployed acceptance is implied or required by this readiness step.
- Next step belongs to the owner: merge PR #296. Only after merge should a separate factual documentation closeout update Owner effective-vs-raw authorization, immunity/elevated boundary, PROJECT_STATE and history. Settings remains deferred until redesign closeout.


## PR #297 docs-only coordinator review — CHANGES REQUIRED

- Reviewed exact head `69581a0a95a3ebf739c78b047371a0c66d2b8ffc` against merged Stage2 main `df57dabf2a4cbc44d85138d8809079878490a7c8` and runtime authority paths.
- Scope is docs-only and mergeable. Exact-head CI #42353586211 and AP-10 browser #42353586139 are SUCCESS.
- The six changed files correctly describe the implemented Owner catalog projection, raw AP-10 hierarchy, Owner immunity, Owner-only elevated gate, Stage2 history and browser fixture behavior except for the findings below.

### STAGE2-DOC-MIRA-01 — `ROADMAP.md` omitted / stale owner boundary

`ROADMAP.md` was explicitly in the bounded closeout but is absent from #297. It still says the final owner/recovery boundary is only to be determined by a future redesign, which conflates the now-implemented Stage2 Owner authority with the still-future recovery/bootstrap work. Add `ROADMAP.md` as the seventh docs file and synchronize only those Stage2/recovery statements; keep Stage6 external acceptance and Settings sequencing unchanged.

### STAGE2-DOC-MIRA-02 — stale external bootstrap wording in `PROJECT_STATE.md`

`PROJECT_STATE.md` still lists `server-controlled bootstrap первого authorization manager` as the unfinished external item. After Stage2 the active unresolved boundary is Owner binding/recovery/bootstrap acceptance, not the superseded first-manager recovery model. Replace that stale wording with a factual owner/recovery/bootstrap external gate without inventing a recovery design that has not yet been approved/implemented.

### Handoff — Лира

Correct only these two docs findings on PR #297. Do not reopen the six already-correct Stage2 descriptions, do not change runtime/code/schema/migrations/infra, and do not design recovery/bootstrap or Settings. Run applicable exact-head checks, publish the new stable head/evidence in #251, then stop for fresh Mira docs review.


## PR #297 fresh docs coordinator review — CHANGES REQUIRED

- Reviewed corrected exact head `9d0c7baa9b9f96a79ee8b7b79c7a736a872c83b6` against merged Stage2 main and the full current 7-file docs diff.
- Previous findings `STAGE2-DOC-MIRA-01/02` are substantively closed: `ROADMAP.md` is present and correctly separates implemented Stage2 Owner authority from future recovery/bootstrap/external acceptance; the obsolete first-manager bootstrap wording is removed.
- Exact-head CI #42354904989 and AP-10 browser #42354905142 are SUCCESS.

### STAGE2-DOC-MIRA-03 — unapproved recovery/bootstrap detail

`PROJECT_STATE.md` now says the future boundary includes `первоначальное назначение управленческого доступа`. That detail is not established by the approved Stage2 model or current source-of-truth and partially reintroduces a first-manager/bootstrap assumption. The closeout task explicitly requires recording the unresolved Owner binding/recovery/bootstrap boundary **without designing it**.

Minimal correction: keep the factual statement that external acceptance of the implemented `VICO_OWNER_USER_ID` authority and a separately approved recovery/bootstrap boundary remain unfinished, but remove the added assumption about initial management-access assignment. No other document needs correction.

### Handoff — Лира

Change only that wording in `PROJECT_STATE.md` on PR #297. Do not alter the already-correct `ROADMAP.md` or the other Stage2 docs. Run applicable exact-head checks, publish the new stable head in #251, then stop for final Mira review.


## PR #297 final docs coordinator review — PASS

- Final exact head: `a63bfb6d52052e1dd0905eb498dabb1d38c8f10a`; base/current main `df57dabf2a4cbc44d85138d8809079878490a7c8`.
- Final delta after previous review: exactly one line in `PROJECT_STATE.md`, removing the unapproved `первоначальное назначение управленческого доступа` assumption.
- `STAGE2-DOC-MIRA-01/02/03` are all closed.
- Full bounded scope is now exactly 7 documentation files; no code/schema/migration/runtime/infra changes.
- `ROADMAP.md` correctly separates implemented repository/local-CI Stage2 Owner authority from still-future recovery/bootstrap and external acceptance.
- `PROJECT_STATE.md` now records only the unresolved external Owner authority + separately approved recovery/bootstrap boundary without inventing its design.
- Exact-head CI #42355616281 SUCCESS; AP-10 isolated browser acceptance #42355616335 SUCCESS.
- Coordinator verdict: **PASS**, zero confirmed current-scope documentation defects.
- PR #297 converted from Draft to Ready for review. No independent Codex docs review assigned.
- Next: owner merge PR #297. After merge Stage2 implementation + factual documentation closeout is fully closed; then next bounded owner/authorization work may be selected.


## Stage 2 fully closed after docs merge

- PR #297 merged into `main`; merge commit `96186cc9158dd7a91c9d2c0124ed4556f133f15c`.
- Stage2 implementation #296 + factual documentation #297 are both merged. Coordinator implementation/docs findings are closed.
- Current source-of-truth now records server-bound Owner authority as implemented in repository/local-CI, while recovery/bootstrap and external acceptance remain unfinished.
- This does **not** authorize Stage6/production work or Settings.
- Next bounded work is product-definition of the remaining recovery/bootstrap boundary. No first-manager/count-veto model is assumed; no recovery mechanism is considered approved yet.
- Mira owns the next analysis. Lev/Lira/Mark are not assigned until the owner-facing product boundary is clear.


## Owner/authorization redesign — final bootstrap decision

- Vico Forum has exactly one Owner: the developer.
- Ownership transfer, second Owner, successor and transfer UI/API are not part of the current product scope.
- The Owner account is established by signing in through the developer's Google account.
- After sign-in, the forum's internal account ID is bound server-side as the Owner identity.
- Email, display name or role do not grant Owner rights by themselves.
- No separate first-admin/first-manager bootstrap is needed.
- No additional application feature is required for this bootstrap model: Google sign-in and server-side Owner authority already exist in the repository.
- Production Google configuration, Owner binding and real external acceptance remain Stage 6 and are not authorized by this decision.
- Owner/authorization redesign application work is complete; only final factual documentation closeout remains before moving to Settings.


## Final owner/authorization documentation closeout — handoff to Лира

Create one separate docs-only PR from current main `96186cc9158dd7a91c9d2c0124ed4556f133f15c`.

Required result: synchronize permanent/current documentation with the confirmed final product model and close the repository-side owner/authorization redesign without claiming Stage 6 work.

Bounded file scope — exactly these 6 documentation files:
1. `docs/auth/AUTHORIZATION.md`
2. `docs/ADMIN_PANEL.md`
3. `PROJECT_STATE.md`
4. `ROADMAP.md`
5. `docs/PROJECT_HISTORY/PROJECT_HISTORY.md`
6. new `docs/PROJECT_HISTORY/PROJECT_HISTORY_16.md`

Content boundary:
- One Owner only: developer.
- Owner account is established through developer Google sign-in; the resulting internal forum account identity is the server-bound Owner.
- Email/name/ordinary role do not themselves grant Owner authority.
- No ownership transfer, second Owner, successor flow, transfer UI/API or first-manager bootstrap in current scope.
- No additional application implementation is required for this bootstrap decision; Stage 1–2 runtime remains the implemented repository/local-CI model.
- Real Google configuration, server-side Owner binding and external/deployed acceptance remain Stage 6 and must not be claimed complete.
- After this docs closeout merges, owner/authorization redesign is complete in repository/local-CI scope and Settings becomes eligible as the next separate product package.
- Keep Stage 6 paused and do not alter unrelated roadmap priorities.

Do not change runtime/code/tests/schema/migrations/workflows/infra. Do not invent recovery/transfer behavior or security features beyond the confirmed model.

Run applicable docs/CI checks, publish the PR number + stable exact head + check evidence in #251, then stop for Mira coordinator docs review.


## PR #298 initial coordinator docs review — CHANGES REQUIRED

Reviewed the complete 6-file docs scope on exact head `514dff7c2e262d63a3cf0dbbebd5a845f43571e1` against current main `96186cc9158dd7a91c9d2c0124ed4556f133f15c`, the final owner decision and current runtime/auth boundaries. CI #42360481160 is SUCCESS; both checks/database jobs passed. PR is Draft, mergeable, docs-only, exact requested six-file scope.

### OWNER-DOC-MIRA-01 — bootstrap wording broadens the approved owner decision

The approved final product decision is specific: the sole Owner is the developer; the developer **signs in through Google**, and the resulting internal forum account is bound server-side as Owner. No second Owner/transfer/first-manager bootstrap is in scope.

The new docs repeatedly use `Google authentication/linking`, `sign-in/linking` or `входа/привязки аккаунта` in the **new Owner-bootstrap text**. That introduces an additional bootstrap path through linking an already-existing account, which was not part of the final approved wording. This is a current-scope documentation defect, not a runtime defect.

Correct only the new Owner-bootstrap wording to the approved model: **developer signs in through Google → resulting internal Better Auth user ID is bound server-side as Owner**.

Affected new text:
- `docs/auth/AUTHORIZATION.md` — single-Owner bootstrap section;
- `docs/ADMIN_PANEL.md` — single-Owner bootstrap paragraph;
- `PROJECT_STATE.md` — Owner model + unfinished external item;
- `ROADMAP.md` — Stage 6 Owner step where it says sign-in/linking / входа/привязки;
- `docs/PROJECT_HISTORY/PROJECT_HISTORY_16.md` — decision snapshot.

Do **not** alter the existing general `Local email and Google linking` authorization section: that documents an already implemented general account feature and is not the Owner-bootstrap decision. Do not change runtime/code/tests/schema/migrations/workflows/infra or broaden recovery/transfer semantics.

All other reviewed changes, including history index, Stage6 deferral, Settings sequencing and “no additional application implementation” conclusion, are accepted on this head.

### Handoff — Лира

Fix only OWNER-DOC-MIRA-01 on PR #298. Run applicable exact-head checks, publish the new stable head/evidence in #251, then stop for fresh Mira review.


## PR #298 fresh coordinator docs review — PASS

- Reviewed stable exact head `7cfa68a8a2c587314393d60a9bf90923604ee0c0` against base/current main `96186cc9158dd7a91c9d2c0124ed4556f133f15c`.
- Whole PR remains exactly the approved 6 documentation files; no code/tests/schema/migrations/workflows/infra changes.
- Delta from previously reviewed head `514dff7c...` changes only the five Owner-bootstrap wording sections required by `OWNER-DOC-MIRA-01`.
- `OWNER-DOC-MIRA-01` is closed: all new Owner-bootstrap text now states the approved path only — developer signs in through Google → resulting internal Better Auth `user.id` → server-only `VICO_OWNER_USER_ID`.
- Existing general Local email/Google linking contract remains unchanged and is not presented as an alternative Owner bootstrap.
- Single Owner, no transfer/second Owner/successor/first-manager bootstrap, no additional application implementation, Stage6 external Google/Owner binding and Settings sequencing are consistent across the six documents.
- Exact-head CI #42361836324 SUCCESS: both `checks` and `database` jobs passed.
- Browser workflow is not applicable to the docs-only paths and was not required/claimed.
- Coordinator verdict: **PASS**, zero confirmed current-scope documentation defects.
- No independent Codex docs review assigned.
- PR #298 is ready for owner merge. After merge, owner/authorization redesign is closed in repository/local-CI; Stage6 external acceptance remains unfinished/paused.


## Owner/authorization redesign — fully closed after PR #298 merge

- PR #298 merged into `main`; merge commit/current main `856b93cb65b01e2389eb97276b37b3a0d8eef265`.
- Final single-Owner/bootstrap documentation is now in current source-of-truth.
- Owner/authorization redesign is closed in repository/local-CI scope: Stage 1–2 runtime, factual docs and final product boundary are all merged.
- One Owner only: developer. Developer signs in through Google; the resulting internal Better Auth user ID is bound server-side as Owner. Transfer/second Owner/successor/first-manager bootstrap are not current product features.
- Real Google configuration, server-side Owner binding and deployed acceptance remain Stage 6; Stage 6 remains paused.
- No further owner/authorization application or documentation work is active.
- Per current source-of-truth, Settings is now eligible as the next separate package.

### Next bounded stage — Settings product definition

Mira owns the initial product analysis. Do not assign Lev/Lira/Mark yet.

Goal: establish what Settings should actually contain for the first release, reusing existing forum/auth/admin mechanisms and avoiding speculative infrastructure/super-admin/provider controls.

First step only: inspect the current Settings placeholder, existing configurable mechanisms already implemented elsewhere, and current product/release boundaries; then present only the owner decisions that are genuinely required before technical planning.


## Settings product-definition analysis — current state and minimal concept

### Confirmed current state

- Global Admin navigation contains Settings only as `Under development`; it has no real route/data/mutations and no Settings-specific permission.
- There is no generic forum-settings persistence table in the current schema.
- Existing configurable behavior is already separated by domain:
  - Roles/permissions are managed in their own authorization section.
  - Complaint reason-priority weights are persisted and managed under `Needs attention → Complaints → Settings` with `forum.complaint.priority.manage`.
  - Light/Dark theme is a user/browser preference, not a forum-wide admin setting.
  - LocaleRegistry is persistent and has a controlled lifecycle contract, but production runtime is currently read-only for registry writes; no general locale-management admin UI exists.
  - Infrastructure/provider/deployment/secrets and Owner binding remain outside forum RBAC/ordinary Settings.
- Public Rules/Help/About/Feedback/Privacy entries are unfinished product/content pages, not currently defined as forum setting values.
- Current source-of-truth explicitly says Settings has no approved concrete operations.

### Product boundary proposed by Mira

Settings should mean **forum-wide product parameters that are intentionally changeable from the site UI**. It should not become a catch-all for domain management, personal preferences, infrastructure, secrets or future super-admin functions.

For the first release, the minimal useful Settings package should be small.

**Recommended first concrete setting: registration state.**
- `Open`: new accounts may be created.
- `Closed`: existing accounts may still sign in, but creation of a new account is rejected regardless of whether the attempt starts through email/password or first-time Google sign-in.
- This controls registration only; it does not change roles, permissions or existing sessions.

Do not pull into the first Settings package by default:
- complaint priority settings — keep in Complaints;
- roles/permissions — keep in Roles & permissions;
- forum structure — belongs in Forum;
- user theme/language/account security — user/account preferences;
- locale registry/language publication lifecycle — separate translation/admin work unless owner explicitly includes it;
- attachment/rate-limit/anti-abuse thresholds — technical/security policy, not ordinary first-release settings without a concrete need;
- providers, OAuth credentials, email provider, Cloudflare, DB, deployments, secrets, Owner binding — infrastructure/outside forum RBAC;
- account deletion/full audit/super-admin operations — deferred super-admin scope;
- Rules/About/Privacy/Help/Feedback content — content/page management, not automatically Settings.

### Owner decisions required before technical planning

1. **Who may change Settings?**
   - A. Owner only.
   - B. A normal explicit forum permission, initially granted to nobody; Owner has it automatically and may delegate later. **Mira recommends B** because it preserves the existing permission-based model without creating a second hierarchy.

2. **First Settings package scope**
   - A. Registration open/closed only. **Mira recommends A** for the first bounded package.
   - B. Registration + global read-only/maintenance mode.
   - C. Broader general configuration now.

3. **Locale/language management**
   - A. Keep out of this Settings package and design separately when needed. **Mira recommends A**.
   - B. Include locale activation/management in Settings now.

No implementation, schema or permission changes are authorized until these decisions are fixed.


## Settings product architecture — owner correction

The previous “single admin Settings page / first setting = registration” concept is superseded.

Owner direction:
1. Settings must be split into at least three distinct surfaces.
2. **Owner/system settings** — forum-wide configuration and role settings; this surface is available only to the sole Owner.
3. **Administrator personal settings** — convenience/preferences for an administrator's own working experience; these settings do not change forum behavior for other users.
4. **User personal settings** — convenience/preferences for an ordinary user's own forum experience.
5. The list is intentionally not considered complete yet.

Mira identifies one additional category that should not be mixed with convenience preferences:
- **Account & security** — password/account credentials, linked Google account, sessions and similar identity/security controls. This is personal account management, not UI convenience.

Domain-specific configuration is a separate axis:
- complaint priority settings already belong to Complaints;
- similar future subsystem-specific controls should stay with their subsystem unless there is a concrete product reason to centralize them.

### Important authorization impact

Current main permits a non-Owner with `access.authorization.manage` to create/edit roles, change role grants, assign users and manage overrides (except the existing Owner-only elevated capability boundary).

The new owner statement “forum and role settings are available only to me” changes that product direction for **role settings**. This is not treated as an accidental current defect; it is a new Settings/authorization product requirement to define before implementation.

Do not yet assume whether Owner-only applies to:
- role definitions + permission sets only; or
- also assigning existing roles to users and per-user permission overrides.

That exact split remains an owner decision. No code/permission/schema change is authorized yet.


## Settings surface map — coordinator analysis

The Settings family should not be modeled as one page or one generic key/value store.

### 1. Owner / system settings — separate Owner-only surface

Audience: only the exact server-bound Owner, never a role name or ordinary permission holder.

Purpose: configuration that changes the forum for everyone or changes the forum's authority model.

Confirmed/strong candidates:
- forum registration policy (for example open/closed);
- role definitions and each role's permission set;
- forum-wide defaults/policies that are intentionally made runtime-configurable.

Possible later system subsections, only when separately approved:
- locale/publication management for forum languages;
- global attachment limit and similar owner-controlled product limits;
- global anti-spam/participation policy values;
- maintenance/read-only mode;
- other whole-forum policy knobs with a concrete product need.

Do not place production secrets, Cloudflare/DB/deployment/provider credentials or the Owner binding here. Those remain developer/infrastructure operations outside forum UI.

### 2. Administrator workspace preferences — separate personal surface

Audience: an authenticated actor who actually has administrative/moderation workspace capabilities; not determined by the literal built-in role name `admin`.

Purpose: convenience for this person's own administrative work. These preferences must not change forum behavior, permissions or other administrators' experience.

Candidate groups:
- preferred/default admin/Attention destination;
- remembered queue mode/group/filter/sort choices;
- compact/dense presentation and table/list preferences;
- other personal workflow/display choices that prove useful.

Current repository has no persisted admin-personal preference model; these are product candidates, not implemented facts.

### 3. User experience preferences — separate personal surface

Purpose: how the current person reads/writes/uses the forum without changing global forum policy.

Already-existing preference-like behavior that belongs conceptually here:
- Light/Dark theme (currently browser-local);
- interface language choice / locale preference boundary;
- Editor preferences already kept locally per account/device: Simple/Advanced mode, spellcheck, code wrapping, code line numbers.

Natural later candidates:
- notification preferences;
- reading/display/accessibility preferences;
- formatting/time-zone preferences if/when exposed as actual product controls.

The Settings page may expose or organize existing controls without automatically changing their persistence/sync contract. In particular, Editor preferences are currently intentionally device-local and must not silently become cross-device server settings.

### 4. Account & security — separate personal surface

Purpose: identity and security of the current account, not UI convenience.

Current relevant behavior:
- explicit Google account linking exists on the user's own profile;
- sign-in/sign-out and email/password authentication exist.

Potential account/security controls require separate product/technical approval before implementation:
- password management;
- linked sign-in methods;
- session/device management;
- email/account identity changes;
- other recovery/security controls.

Public profile content (bio/GitHub/website) remains profile editing, not Settings.

### 5. Subsystem operational settings — stay with the owning subsystem by default

These settings alter a specific administrative/moderation subsystem and may have their own permission. They are neither personal admin preferences nor automatically Owner-only system settings.

Existing example:
- Complaint reason-priority settings stay under `Needs attention → Complaints → Settings` with their existing independent authority.

Future subsystem settings should remain near the subsystem unless the owner explicitly chooses to centralize them.

### Outside the Settings family

- infrastructure/deployment/secrets/provider credentials/DB/Cloudflare;
- server-side Owner binding;
- project/developer tooling;
- ordinary object management such as categories/sections/topics/users;
- public profile editing;
- administrative actions on users/cases/topics.

Those are not personal/system Settings merely because they are configurable or mutable.

### Role-management boundary that still requires owner decision

The owner has established that **role settings** belong to the Owner-only system surface.

A useful product distinction is:
- **role configuration**: create/rename/delete roles and change the permissions contained in a role;
- **user administration**: assign an already-defined role to a user and apply per-user permission overrides.

Current main groups both under `access.authorization.manage`. Do not change this yet. Before technical planning the owner must decide whether only role configuration becomes Owner-only, or user assignment/overrides also become Owner-only.


## Owner/system Settings — detailed product map

This is the exact bound Owner's surface. It contains only whole-forum product policy that is genuinely useful to change from the forum UI. It must not become a generic dump of constants.

### A. Registration and account-entry policy

Strong first-release setting:
- **Registration: open / closed.** Closing registration blocks creation of new forum accounts while existing accounts can continue signing in.

Useful later split if owner wants independent control:
- allow new registration through Google;
- allow new registration through email/password.

Do not turn provider credentials into settings. Google client credentials and email-provider secrets remain infrastructure. Email verification policy is deferred with the email-verification/sender work and should not be pulled into the first Settings package prematurely.

### B. Roles and authority model

Owner-only role configuration:
- create custom role;
- rename custom role;
- delete eligible custom role;
- view and change the permission set of every role, including built-ins.

This supersedes the product direction where ordinary `access.authorization.manage` holders could alter role definitions/grants. The exact migration of that existing capability is a future implementation concern, not something to patch during product definition.

Still unresolved:
- assigning an already-defined role to a user;
- per-user permission `allow/deny/inherit`.

Those may remain delegatable user administration or also become Owner-only; owner must decide later.

Do not expose Owner itself as a role or editable Owner binding.

### C. Global participation / anti-spam policy

Current repository has one real global forum-write cooldown:
- `FORUM_WRITE_COOLDOWN_MS = 5000` (5 seconds).

This is a valid later Owner-setting candidate because it changes forum-wide participation policy and the repository already treats cooldown as an injected policy value.

Do not expose every rate limit:
- Complaint submission limits belong to Complaints;
- Better Auth/provider protection is security/auth infrastructure;
- internal pagination, retry, polling and batch sizes are implementation details.

### D. Attachments policy

Current product contract sets:
- maximum one-file attachment size = **50 MB**;
- runtime validation already accepts an explicit max-byte policy with 50 MB as the default.

Therefore **maximum attachment size** is a valid Owner-setting candidate.

Do not expose dangerous security-policy switches merely because they are constants:
- forbidden executable formats;
- signature/MIME validation rules;
- archive structural validation;
- future antivirus mandatory checks.

Those remain code/security policy unless there is a separate explicit product decision.

### E. Languages / publication

The persistent LocaleRegistry already distinguishes a locale's publication state from translation readiness. A future Owner-only language-management subsection can legitimately control **which prepared/registered forum locales are publicly active/inactive**, subject to existing locale validation/readiness rules.

Do not make bootstrap English removable: current architecture requires `en` as the hard active fallback.

Adding a brand-new locale, translation generation/readiness, provider credentials, Queue/provider rollout and production translation allowance remain translation-domain/Stage6 work; do not pretend a simple Settings toggle replaces those workflows.

### F. Useful later emergency mode

A global **read-only / maintenance mode** is a reasonable Owner-only future control, but it does not exist today and there is no current release blocker requiring it. Keep it out of the first bounded package unless owner explicitly wants it now.

### Not Owner/system Settings

Do not expose:
- Vico Forum name/logo/branding merely to make them configurable;
- forum categories/sections/topics — object administration belongs to Forum;
- public Rules/About/Privacy/Help page content — content management;
- Complaint priority policy — Complaints-local settings;
- user theme/editor/notification choices — user preferences;
- admin workspace display/filter choices — admin personal preferences;
- profile bio/GitHub/site — profile editing;
- passwords, linked Google, sessions — Account & security;
- DB/Cloudflare/deployments/secrets/provider credentials/Owner binding;
- internal request sizes, pagination limits, retry counts, poll intervals, DB timeouts, translation parser/provider hard limits and similar implementation/security constants.

### Coordinator recommendation for first bounded Owner/system package

Keep implementation small:
1. Owner-only role configuration boundary.
2. Registration open/closed.

Do **not** pull cooldown, attachment limit, locale publication or maintenance mode into the first implementation solely because they belong conceptually to this surface. They can be added as later bounded system-settings packages when there is a concrete need.

No implementation is authorized yet.


## Administrator workspace preferences — detailed product map

This is a **personal convenience surface** for an authenticated actor who has current administrative/moderation workspace capabilities. Eligibility follows actual capabilities, not the literal built-in role name `admin`.

Core rule: these preferences may change only this actor's navigation/presentation. They must not change forum policy, permissions, moderation outcomes, queue priority semantics or another administrator's workspace.

### A. Admin entry and navigation

Useful personal settings:
- default administrative destination when entering the service area: Overview, Forum, Users, Measures, Roles, History, Needs attention, or **last visited**;
- remembered last administrative destination;
- optional later pinned/favorite administrative destinations.

The chosen destination is only a preference. It never grants access. If the actor no longer has permission for the stored destination, navigation must fall back to an actually accessible destination.

### B. Needs attention workspace

Strong practical settings:
- default / last-used mode: Signals, Complaints or Security, limited to modes the actor can currently access;
- default / last-used group within each accessible mode;
- returning to the workspace may restore that personal mode/group instead of the current fixed default.

Do not persist page cursor, free-text search, target user ID, Case ID or other private work item identifiers as a preference by default.

Possible later convenience:
- auto-refresh of queue lists with a bounded selectable interval;
- notification/sound preference for newly available work, but only if a real admin-notification mechanism is separately implemented.

Current repository has no generic queue auto-refresh or admin work notification feature, so these are later candidates rather than first-package requirements.

### C. Presentation density and information detail

Useful display-only preferences:
- comfortable / compact list density;
- whether secondary technical metadata is expanded by default where a view already has such metadata;
- whether long administrative sections/panels open expanded or collapsed by default.

These controls must not hide mandatory state/reasons/warnings needed to make an administrative decision. Permission-protected information is still controlled server-side; a display preference never authorizes data.

### D. List paging and sorting

Possible later preferences:
- bounded page size choices where the underlying reader explicitly supports them;
- remember a selected sort/filter mode only where the domain actually defines multiple valid presentation orders.

Current state is mixed:
- Forum and Users use a fixed 25-item page size;
- History defaults to 25 and its reader can accept up to 50;
- Attention/Complaints have domain-specific pagination and ordering.

Therefore a universal “items per page” or universal sort setting should **not** be invented now. Queue priority/order that carries moderation meaning remains domain policy, not a personal preference.

### E. Local persistence recommendation for the first package

The first administrator-preference slice does not need database/schema work.

Recommended persistence:
- browser-local;
- keyed by authenticated account ID;
- independent between devices;
- no sensitive free-text queries or target identifiers stored;
- same model as existing per-account Editor preferences where practical.

This is appropriate because these values affect only convenience/presentation. Cross-device synchronization can be added later only if it proves useful.

### Recommended first bounded administrator-preferences package

1. Default/last administrative destination.
2. Default/last Needs attention mode + group.
3. Comfortable/compact density.
4. Expanded/collapsed default for secondary technical details where applicable.

Keep out of the first package:
- auto-refresh;
- admin sounds/notifications;
- customizable page size/sorting;
- favorites/pinned destinations.

### Not administrator personal preferences

Never place here:
- role/permission configuration;
- assignment authority or sanction authority;
- Complaint priority weights;
- global registration/cooldown/attachment/language policy;
- authoritative queue ordering/priority semantics;
- mandatory confirmations, validation or security checks;
- History/audit retention/content;
- administrator identity visibility policy;
- production/infrastructure settings.

No implementation is authorized yet.


## User experience preferences — detailed product map

This surface controls the signed-in user's own forum experience. It must not contain profile identity, account credentials/security, administrative workspace settings or whole-forum policy.

### A. Appearance

Current facts:
- Light/Dark theme already exists.
- The manual choice is stored browser-locally under one device-wide `vico-theme` key.
- If no manual value exists, the forum follows the OS/browser `prefers-color-scheme` value.
- Theme is currently **not keyed by account**.

Therefore the Settings UI can truthfully expose three presentation choices:
- System;
- Light;
- Dark.

“System” can represent absence of the manual override. Do not silently change theme to per-account or server-synchronized persistence; that is a separate product decision because it would change current behavior.

Possible later appearance/accessibility choices, only when needed:
- user-facing compact/comfortable density;
- explicit text-size preference;
- reduced-animation preference in addition to respecting OS preferences.

Do not invent these merely to fill the page.

### B. Interface language and regional formatting

Current facts:
- the public language switcher changes the locale in the URL;
- authenticated `user.locale` already exists in the Better Auth user model and is the highest-priority source when negotiating an unprefixed route;
- the current repository has no discovered user-facing mutation that saves a new `user.locale` value from the language switcher;
- locale contract already separates translation locale from formatting preferences;
- current formatting context uses UTC as the baseline time zone.

Strong Settings candidate:
- **preferred interface language**, saved to validated `user.locale`, so the authenticated preference follows the account across devices while explicit URL locale remains authoritative for the current page.

Useful later regional candidate:
- **time zone** for date/time display.

Do not add calendar/numbering-system controls without a concrete product need.

### C. Editor preferences

Already implemented and intentionally device-local per authenticated account:
- Simple / Advanced authoring mode;
- browser spellcheck on/off;
- wrap long code lines;
- show code line numbers.

Current contract explicitly says these preferences remain independent between PC/phone and do not require server synchronization.

The user Settings page should centralize the same four controls without changing that persistence contract. A “Reset editor preferences on this device” action is a reasonable convenience because it only clears these preference values, not message content.

Do not add drafts/autosave settings: drafts/autosave are intentionally outside current Editor 2.0.

### D. Notification preferences

Current inbox has four durable notification kinds:
- reply;
- mention;
- Complaint decision result;
- Complaint appeal result.

Current repository has no user notification-preference model; these notifications are created according to domain behavior.

Recommended product split:
- **optional participation notifications:** replies and mentions — reasonable user-configurable toggles;
- **direct system/result notifications:** Complaint decision and Complaint appeal result — keep mandatory by default because they communicate an outcome directly concerning the user.

If optional notification toggles are implemented, they should affect authoritative notification creation/badge semantics, not merely hide already-created rows from one page.

Do not add email/push/browser-notification channel settings until those channels actually exist.

### E. Reading and translation presentation

Current facts:
- if a current translation exists for the current target locale, forum content is presented translated by default;
- the user can reveal the original content for that item;
- missing/invalid/unavailable translation safely falls back to original.

Valid later presentation preferences:
- prefer available translation (current behavior) / prefer original;
- optionally show original expanded alongside a translation.

These preferences must affect presentation only. They must not automatically authorize translation generation, spend translation quota or change source content.

Do not treat Unread state, solved state or topic ordering semantics as personal settings merely because they affect reading.

### F. Things that are separate features, not Settings toggles

Keep out of this surface:
- Watch/Subscribe to topic — separate participation feature;
- bookmarks/favorites — separate feature;
- mute/block another user — separate user-interaction/privacy feature;
- editing own topic title — separate content capability;
- profile bio/GitHub/site — Profile editing;
- password, Google linking, sessions — Account & security;
- online-status visibility — Privacy;
- administrative workspace choices — Administrator preferences.

### Persistence model by preference type

Do not force one storage model onto all user settings.

- Theme: current browser/device-local behavior unless owner separately changes it.
- Editor preferences: browser-local, keyed by authenticated account, explicitly device-independent from other devices.
- Preferred interface language: natural server/account preference via existing validated `user.locale`.
- Notification preferences: if approved, server/account state because notification production and badge semantics are server-side.
- Translation/read presentation: storage choice should follow the desired cross-device behavior; do not decide it merely for implementation convenience.

### Coordinator recommendation for the first user-preferences package

Useful initial slice:
1. Appearance: System / Light / Dark, reusing current theme behavior.
2. Preferred interface language, using the existing `user.locale` domain boundary.
3. Existing four Editor preferences, preserving their device-local per-account semantics.
4. Reply and mention notification toggles **only if owner wants notification preferences in the first release**; this requires real server-side preference semantics and is a larger slice.

Leave time zone, translation-display preference and accessibility refinements for later unless owner explicitly wants them in the first release.

No implementation is authorized yet.

## Additional Settings surface candidate — Privacy

Current forum has public “Who's online” presence for signed-in members active in the recent window. There is currently no personal privacy preference for this visibility.

A future choice such as **“Show my online status”** changes what other people can see. It therefore should not be mixed into User experience preferences or Account & security.

Treat **Privacy** as a separate Settings surface candidate. Other future visibility/block/mute choices may belong there if those product features are later implemented. Do not invent them now.

No privacy implementation is authorized yet.


## Account & security — detailed product map

This is the signed-in user's personal authentication/security surface. It is separate from public Profile, user convenience preferences and Privacy.

### A. Sign-in methods

Current Vico facts:
- email/password authentication is enabled;
- Google authentication is configured in the application foundation;
- own Profile already exposes explicit Google linking through the protected `linkSocial` flow;
- Vico currently has no account-list/unlink UI.

The Account & security page should become the canonical place to show **which sign-in methods are actually linked** to the current account.

Strong product controls:
- show whether password credentials exist;
- show whether Google is linked;
- connect Google when it is not linked.

Possible later control:
- unlink Google only when another valid sign-in method remains and lockout prevention is preserved.

Do not expose OAuth tokens/scopes/provider secrets. Do not infer Owner authority from linked Google state; Owner remains the independent server-bound `user.id` model.

Better Auth's current account-management contract supports listing linked accounts and unlinking by account record ID, and prevents unlinking the only account unless explicitly configured otherwise. Vico does not currently expose those calls.

### B. Password

Current Vico facts:
- email/password sign-in is enabled;
- password recovery/email sender remain intentionally deferred;
- no Vico change-password UI exists.

Strong candidate:
- **change current password** for an account that already has password credentials, requiring the current password.

Keep out of the first package:
- forgot/reset password, because the project's email sender/recovery flow is separately deferred;
- silently creating a password for Google-only accounts. Better Auth has a server-side set-password capability, but its own guidance prefers a recovery-style flow; Vico should decide that together with its email-verification/recovery work rather than inventing a shortcut here.

### C. Active sessions / devices

Current Vico session schema already stores:
- session identity/token;
- expiry;
- IP address;
- user agent;
- owning user ID.

The page should support:
- list the current user's active sessions/devices;
- clearly mark the current session;
- revoke one other session;
- “sign out all other sessions”.

This is a strong first-release security control. Better Auth documents list/revoke single/other/all session operations; Vico currently exposes only ordinary sign-out.

Do not turn session duration, cookie policy or global auth rate limits into user settings; those are security/system policy.

### D. Account identity changes — later

Do not put these into the first package without separate product decisions:
- change authentication email;
- change authoritative account name/image;
- self-delete account;
- set password on an OAuth-only account;
- disconnect the last remaining sign-in method.

Email change/recovery/deletion interact with verification, email delivery and data-retention semantics that are not yet product-complete.

Public bio/GitHub/website remain Profile editing, not Account & security.

### E. Stronger authentication — later separate auth work

Possible future controls:
- passkeys;
- 2FA;
- recovery codes or similar stronger-auth mechanisms.

None is currently configured in Vico. Do not add placeholder switches before the corresponding authentication capability exists.

### Coordinator recommendation for the first Account & security package

1. Show linked sign-in methods.
2. Keep/move the existing “Connect Google” control here.
3. Change password for accounts that already have password credentials.
4. List active sessions.
5. Revoke one other session / all other sessions.

Defer unlinking, email changes, password recovery/set-password, account deletion, passkeys and 2FA until their product/security boundaries are explicitly designed.

No implementation is authorized yet.

## Privacy — detailed product map

Privacy controls what other people can learn/see about the current user. It is not the same as Account security or personal UI convenience.

### A. Online presence

Current Vico behavior:
- signed-in clients send authenticated presence heartbeats;
- the server treats users active in the last five minutes as online;
- the public home page exposes both the active-member count and up to 12 recent member identities/profile links;
- there is currently no opt-out preference.

Strong first Privacy setting:
- **Show my online status: on/off**.

Recommended semantics:
- default **on** to preserve current behavior for existing accounts;
- when off, the user must not appear in the public online member list and must not contribute to its public active-member count;
- changing it off should stop future public presence publication; exact cleanup/storage mechanics are implementation details.

This is a genuine privacy control because it changes information visible to guests/other users.

### B. Public forum identity is not optional privacy

Vico is a public forum. Do not add generic “private account” or “hide my posts/profile while participating” toggles that conflict with the forum's public-content model.

Public Profile fields are separately edited by the user; Privacy does not replace Profile.

### C. Future social/privacy controls

When/if these product features are implemented, their preference/management surfaces may belong here:
- mute another user;
- block another user;
- other visibility/contact restrictions.

Do not create empty controls for them before the underlying feature exists.

### D. Data controls

Account deletion/export or legal data-request workflows are not yet implemented. At current scope:
- account deletion belongs primarily to Account & security/destructive account management;
- a broader “Data & privacy” page is not justified yet.

If future privacy/data functionality becomes substantial, the Privacy surface can be renamed/split then rather than building an empty sixth page now.

### Coordinator conclusion — complete top-level Settings architecture

Five top-level Settings surfaces are currently justified:

1. **Forum & roles** — Owner-only global system policy and role configuration.
2. **Administrator preferences** — personal admin workspace convenience.
3. **User preferences** — appearance, language, Editor, notifications, reading/translation presentation.
4. **Account & security** — sign-in methods, password and sessions.
5. **Privacy** — visibility/privacy choices, starting with online presence.

Subsystem-specific operational settings remain within their subsystem by default.

No additional top-level page is currently justified:
- Notifications remain a User preferences section at present;
- Accessibility remains a User preferences section;
- translation-reading preferences remain User preferences;
- Profile remains its own profile surface;
- Forum structure remains object administration;
- developer/infrastructure/secrets remain outside Settings;
- subsystem settings remain subsystem-local.

A new top-level page should be created later only when a real independent domain grows enough that combining it with one of these five harms clarity.

No implementation is authorized yet.


## Settings — consolidated first-release proposal (pending owner approval)

The five-surface map is now consolidated into one proposed first-release package. This is still product definition, not implementation authorization.

### 1. Forum & roles — exact Owner only

First-release proposal:
- global registration state: open / closed;
- create/rename/delete eligible custom roles;
- change permission sets of all roles;
- Owner identity/binding itself remains outside Settings.

Authorization-management split requires an explicit owner decision:
- assigning an already-defined role is operational user administration and can reasonably remain delegatable;
- a per-user permission override can grant a capability even when the user's role does not contain it, so leaving overrides delegatable would let an authorization manager bypass Owner-controlled role permission sets for individual users.

Coordinator recommendation:
- **Owner-only:** role definitions, role permission sets, per-user permission overrides;
- **delegatable:** assign an already-defined role to a user;
- existing special Owner-only protection for the elevated privileged-target capability remains stricter as already implemented.

First-release registration recommendation:
- one global open/closed switch only.
- Per-method Google/email registration switches can be added later if a real need appears.

Deferred system controls:
- forum-write cooldown;
- attachment-size maximum;
- locale publication management;
- read-only/maintenance mode;
- separate Google/email registration switches.

### 2. Administrator preferences

First-release proposal, personal and device-local:
- default/last accessible admin destination;
- default/last accessible Needs attention mode and group;
- compact/comfortable density;
- default expansion/collapse of secondary technical detail.

No database persistence required for this slice.

Deferred:
- favorites/pinned destinations;
- auto-refresh;
- administrative work notifications/sounds;
- customizable page sizes/sorts.

### 3. User preferences

First-release proposal:
- appearance: System / Light / Dark, preserving current local theme behavior;
- preferred interface language via the existing account-level `user.locale` boundary;
- existing Editor preferences: Simple/Advanced, spellcheck, code wrap, code line numbers, preserving device-local per-account behavior.

Open owner decision:
- whether reply/mention notification toggles belong in the first release.
- They require new server-side preference semantics because simply hiding created notifications would leave unread/badge behavior incorrect.
- Coordinator recommendation: **defer them to the next bounded user-preferences slice**. The first page is already useful without creating a new notification-policy subsystem.

Deferred:
- reply/mention toggles if owner accepts the recommendation;
- time zone;
- translation/original default presentation;
- expanded-original preference;
- accessibility refinements beyond current platform behavior.

### 4. Account & security

First-release proposal:
- show linked sign-in methods;
- expose the existing protected Google-connect action here;
- allow current-password change for accounts that already have password credentials;
- show active sessions/devices;
- revoke one other session;
- sign out all other sessions.

Deferred:
- unlink Google;
- change authentication email;
- password recovery/reset and setting a password for OAuth-only accounts;
- account deletion;
- passkeys/2FA/recovery codes.

These deferred items depend on still-unfinished email/recovery/data-lifecycle/security product decisions.

### 5. Privacy

First-release proposal:
- `Show my online status`.

When disabled:
- the user does not appear in the public recent-online member list;
- the user does not contribute to the public recent-online count.

Open owner decision:
- default ON preserves current forum behavior;
- default OFF is more privacy-conservative.
- Coordinator recommendation: **ON**, because the current product already exposes online presence and the new control becomes an opt-out rather than silently changing existing behavior.

Deferred:
- mute/block users until those underlying features exist;
- broader contact/visibility controls;
- data export/privacy-request flows.

### Subsystem-local settings

Keep these out of the five general pages unless the owner later has a concrete reason to centralize them.

Current example:
- Complaint priority settings remain inside Complaints with their own authority.

### Separate features that remain outside Settings

- Watch/Subscribe;
- bookmarks/favorites;
- mute/block implementation itself;
- edit own topic title;
- public Profile fields;
- forum category/section/topic administration;
- infrastructure/secrets/providers/deployments/DB/Cloudflare;
- server-side Owner binding.

### Four product decisions still required before technical planning

**S1 — Authorization management**
1. Owner-only role definitions/grants + per-user overrides; delegated admins may assign existing roles. **Coordinator recommendation.**
2. Owner-only all authorization mutations, including role assignment.
3. Owner-only role definitions/grants; delegated admins may assign roles and edit per-user overrides.

**S2 — Reply/mention notification preferences**
1. Defer from first Settings release. **Coordinator recommendation.**
2. Include in first Settings release.

**S3 — Online status default**
1. ON / opt-out. **Coordinator recommendation.**
2. OFF / opt-in.

**S4 — Registration control**
1. One global registration open/closed switch. **Coordinator recommendation.**
2. Independent Google-registration and email/password-registration switches in the first release.

Once S1–S4 are fixed, product scope is sufficiently defined for Lev to prepare the technical decomposition. Do not assign implementation before then.


## Settings owner decisions — partial resolution

Owner fixed:

### S1 — authorization management
- **Current release:** only the bound Owner may perform authorization-management mutations: role definitions, role grants, role assignment and per-user overrides.
- **Future requirement:** deputy administrators must eventually be able to receive equivalent delegated authorization-management capabilities.
- Do not introduce deputy roles/permissions in the current Settings release merely to anticipate that future need.
- Technical design for the current release must avoid baking in a product assumption that authorization management can never be delegated; exact future delegation mechanism is intentionally deferred.

### S3 — online privacy
- Default is **ON / opt-out**.
- User may turn public online visibility off.

### S4 — registration
- First Settings release needs **independent registration controls** for:
  - new Google registration;
  - new email/password registration.
- These controls govern creation of new accounts through each method; existing users' sign-in is a separate behavior and must not be disabled merely by closing registration for that method.

### S2 — notification preferences remains open

Coordinator recommendation remains to defer reply/mention notification toggles from the first Settings release for scope reasons, not because the feature is undesirable.

Reason:
1. Current reply/mention inbox is authoritative server-side data, not a presentation-only list.
2. A real user preference must define whether disabled notification types are created at all (or otherwise how unread/badge semantics work).
3. A UI-only hide switch would be incorrect because hidden notifications could still remain unread and affect the global badge/count.
4. Therefore S2.2 requires a new persisted per-user notification-policy boundary plus integration with notification creation and unread counting.
5. The first User preferences page is already useful with theme, language and existing Editor preferences; deferring notifications keeps the first bounded package smaller and easier to review/revert.
6. Nothing about this blocks adding notification preferences immediately if the owner considers them important enough for first release; it only makes that slice materially larger.

No implementation is authorized until S2 is resolved.


## Settings owner decision S2 — fixed; product scope frozen

Owner chose **S2.1 — defer reply/mention notification preferences** from the first Settings release.

All four product decisions are now fixed:
- **S1:** current release authorization management is Owner-only across role definitions/grants, role assignment and per-user overrides. Future deputy delegation is required, but no deputy authority is implemented now.
- **S2:** reply/mention notification preferences are deferred.
- **S3:** online status default ON / opt-out.
- **S4:** independent registration controls for Google and email/password.

The five Settings surfaces and their first-release/deferred boundaries in this service channel are now the product baseline for technical planning. No implementation is authorized yet.

### Handoff to Lev

Result required: a technical plan that maps the frozen Settings product scope onto the current repository and decomposes implementation into bounded packages.

Scope:
- all five first-release Settings surfaces already fixed in this service channel;
- include required authorization, persistence, route/UI, auth/session and privacy boundaries where applicable;
- preserve future ability to delegate authorization management to deputy administrators without implementing deputy authority now;
- keep deferred Settings items and subsystem-local settings out of implementation packages.

Done criteria:
- package sequence is explicit and independently implementable/reviewable;
- dependencies and migration/schema needs are identified;
- applicable tests/checks and any browser acceptance needs are identified per package;
- no implementation code is changed.


## Settings technical plan — ready for coordinator review

- [Лёва #6711736883](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6711736883); source baseline main856b93c, existing schema through0059. Scope — frozen five surfaces/S1–S4; deputy authority, notification policy, subsystem operational settings и Stage6 не реализуются.
- **SET-01:** Owner-only все6 authorization mutations в общей fresh serialized policy; existing non-Owner reads readonly; future delegation seam без deputy implementation; no migration. Обязательно адаптировать positive authz/History fixtures к synthetic bound Owner, сохранив non-Owner denials и fresh recipient revocation; no test-only fallback/no last-manager.
- **SET-02:** Settings navigation + полезный Owner Forum & roles surface + независимая Google/email registration policy в singleton PG/CAS. Нужна следующая forward migration с metadata/privileges; минимальный registration History event — явное technical proposal. Existing constructor/writer переиспользуется, не копируется.
- **SET-03:** User preferences: существующие theme/local Editor keys и `user.locale` с Runtime LocaleRegistry; no new schema, no server sync local preferences.
- **SET-04:** Administrator preferences: local per account/device defaults/last accessible workspace, density, secondary technical disclosures с реальными consumers; no DB/raw private URLs/capability changes.
- **SET-05:** Account & security: Better Auth own-method/password/session API через safe DTO/BFF; session tokens остаются server-side, cookies/freshness/ownership сохраняются; existing Google link; no new auth schema.
- **SET-06:** Privacy: маленькая own preference relation default-on; presence SQL filter до window count/LIMIT, conditional heartbeat, own off+presence cleanup и точные privileges. Hidden user исключён из public members **и count**.
- Реальная dependency: SET-01 → SET-02 shell; последующие feature packages зависят от SET-02 и могут independently review/merge. Предлагаемый рабочий маршрут01→02→03→04→05→06.
- Для registration найден поддерживаемый installed Better Auth1.7.7 `user.validateUserInfo`: проверять source.action=create-user + trusted method/provider; sign-in/link-account не veto. Official docs и установленный source сверены; no client/email inference, no provider disable. Существующие native auth-runtime/auth-link-identity harnesses дают synthetic real-state/callback testing без live Google.
- На пакет: применимые tests/build/PG/browser/metadata, coordinator-first→independent same-head, owner merge и отдельный factual docs closeout. Новые migration numbers сверять с actual main, accepted0000–0059 unchanged.
- Code/DB/runtime не изменялись; acceptance будущих пакетов не объявляется выполненным. Лёва остановился на planning handoff.


## Mira coordinator review — Lev Settings technical plan

**PASS — 0 confirmed current-scope defects.**

Reviewed the complete SET-01–SET-06 plan against the frozen five-surface product scope and S1–S4 owner decisions.

Independent check of the highest-risk external assumptions also passed:
- Better Auth user-info validation distinguishes create-user/link-account/sign-in and exposes OAuth provider context, matching SET-02 registration-gate design.
- Better Auth list-sessions uses a fresh-session requirement, matching SET-05's explicit stale-session handling.

No future-scope item was promoted into the current release. Deferred notifications, deputies, extra system controls, account deletion/recovery/unlink/2FA/passkeys and Stage6 remain outside.

Approved sequence is now recorded in the master service plan. No implementer is assigned yet. Next bounded package is SET-01 only.


## SET-01 implementation assignment — Lira

Assigned to **Lira (ChatGPT-6)**.

Required result:
- implement the approved SET-01 current-release authorization-management policy so all existing authorization mutations are writable only by the exact bound Owner.

Scope:
- role create/rename/delete;
- role permission grant/revoke;
- user role assignment;
- per-user permission allow/deny/inherit;
- all existing mutation entry points that can perform those operations.

Boundary:
- preserve existing read access behavior unless a write control must become read-only;
- preserve current Owner effective-authority model, History/freshness/mutex/AP-10 behavior;
- keep the policy extensible for future deputy delegation, but do not implement deputies or any dormant deputy authority now;
- SET-02–SET-06 and Settings UI are out of scope.

Done criteria:
- implementation is in one bounded implementation PR;
- direct/server mutation paths and UI write controls enforce the same Owner-only policy;
- applicable tests/checks cover Owner success and non-Owner denial without state/History mutation;
- stable exact head and check results are reported back through #251 for Mira's coordinator whole-PR review.


## SET-01 — Mira coordinator whole-PR review

Implementation PR: **#299**  
Stable exact head: `e52c97eed86283fff11976124a9216442fbe6bc3`  
Base/current main: `856b93cb65b01e2389eb97276b37b3a0d8eef265`

**Verdict: PASS — 0 confirmed current-scope defects.**

Reviewed whole 28-file delta against frozen SET-01 scope.

Confirmed:
- one shared application policy seam `canMutateAuthorization` currently admits only exact bound Owner;
- authoritative repository mutation transaction checks fresh effective management authority and the Owner-only mutation policy before every one of the six mutation families, including no-op requests;
- role create/rename/delete, role grants, user role assignment and per-user overrides all flow through the same repository mutation boundary;
- canonical authorization POST independently rejects non-Owner writers before parsing mutation payload;
- Roles and targeted Users surfaces retain authorized read-only state for non-Owner actors but expose no authorization mutation forms;
- Owner raw role/grants/deny remain truthful while effective Owner authority and write access remain server-bound;
- shared mutation mutex, atomic History, AP-10 boundaries and existing elevated-key guard remain intact;
- missing/malformed Owner binding does not fall back to ordinary management grants;
- future deputy delegation is not implemented, but the new general mutation policy is centralized rather than encoded in schema/role identity.

Scope check:
- 28 changed files are authorization source/UI plus directly affected tests/browser fixtures;
- no schema, migrations, dependencies, workflows, Settings shell, deputies, SET-02–06, Stage6 or production/secrets changes;
- documentation remains intentionally separate final closeout work and is not an implementation defect in this PR.

Exact-head evidence:
- CI #42411014276 SUCCESS: both `checks` and `database`;
- AP-10 isolated browser acceptance #42411014284 SUCCESS: both `history_browser` and `browser`;
- Git compare confirms head is 42 commits ahead of exact base and 0 behind, with the same 28-file bounded delta.

Potential future work (not SET-01 defects):
- future deputy authorization policy;
- SET-02 Settings shell/Forum & roles/registration controls;
- final factual documentation closeout.

Next required review under the standard workflow is Lev technical review of this same exact head. It has not been assigned yet.


## SET-01 independent technical review — Лёва PASS

- [Report #6713064366](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6713064366), exact `e52c97eed86283fff11976124a9216442fbe6bc3`, base/main `856b93cb65b01e2389eb97276b37b3a0d8eef265`. Весь28-file delta проверен самостоятельно; implementation unchanged.
- Shared current-release Owner-only policy применяется ко всем6 repository operations/no-ops после mutex/fresh existing-actor check. Route early guard, service/Hyperdrive и UI согласованы; ordinary manage/elevated grants не являются write authority.
- Прежние Roles/targeted Users reads сохраняют capability/private boundaries; readonly presentation без mutation forms, отдельный write flag. Owner raw role/grants/deny и effective authority truthful; missing/malformed binding не даёт fallback.
- Mutex/History/freshness/AP-10/elevated gate сохранены. Нет schema/migration/catalog/dependency/workflow/SET-02+ или deputy changes; нет возврата last-manager.
- Самостоятельно:63 unit/route/UI,255 PG/build PASS. Own PG probe проверил6 denied operations/no-ops при реальном non-Owner manage+elevated grant без state/History changes, forced Owner History failure rollback, реальный mutex wait + fresh denial после исчезновения DB actor.
- Actual Chromium→Worker→Better Auth→PG:39 AP-10/AP-11/SET-01 groups + separate History38 PASS;0 page errors/external requests, AP-10 layout failures0. Owner UI writes/self-deny, non-Owner readonly/direct403, fresh recipient reads, History timeouts/recovery и EN/RU/HE сохранены.
- Browser assertions не изменялись для local run; AP-10 adapter только checkout path/executable. History использует exact runner. Два synthetic Owner bindings/БД применялись раздельно согласно fixture contract, без code changes.
- Evidence `/workspace/work/set01-review-evidence/`: logs/probe/results/screenshots/manifest/hashes. Task-owned runtime удалён, dummy vars/dependency symlink удалены, tracked checkout clean.
- **Next — Мира:** readiness/owner merge + separate factual docs closeout (current Owner-only writes vs retained reads, future delegation seam, revised test semantics). SET-02–06 не назначены; Лёва остановился.


## SET-01 — independent technical review and readiness complete

- Implementation PR: **#299**
- Frozen exact head: `e52c97eed86283fff11976124a9216442fbe6bc3`
- Base/current main: `856b93cb65b01e2389eb97276b37b3a0d8eef265`
- Mira coordinator whole-PR review: **PASS, 0 confirmed current-scope defects**.
- Lev independent technical review: **PASS, 0 confirmed current-scope defects**; whole 28-file diff independently reviewed against approved SET-01 scope. Implementation was not changed during review.
- Lev independently reran bounded unit/route/UI, native PostgreSQL, build and real Chromium→Worker→Better Auth→PG evidence; exact-head GitHub CI/browser runs remain SUCCESS.
- PR #299 is open, **Ready for review**, mergeable, and the implementation head remains frozen.
- SET-02–SET-06 remain unassigned and must not start before SET-01 merge/closeout route.
- After owner merge, SET-01 requires a separate factual documentation closeout; implementation and permanent documentation remain separate PRs.

**Next:** owner merges PR #299. No production/Stage6/owner-visual acceptance is implied by this readiness state.


## SET-01 implementation merged; factual documentation closeout assigned

- PR #299 merged into `main`; merge commit/current main `137cecfe6a553b2df9be8e3642e5de8b16e22fee`.
- Frozen implementation head `e52c97eed86283fff11976124a9216442fbe6bc3` had Mira coordinator PASS and Lev independent technical PASS, both with zero confirmed current-scope defects.
- SET-01 is implemented in repository/local-CI but is **not yet fully closed** until its separate factual documentation PR merges.
- Lira is assigned the bounded 8-file docs-only closeout recorded in #251.
- SET-02–SET-06 remain unassigned; no Settings shell/registration implementation starts during this docs closeout.


## SET-01 docs coordinator review — CHANGES REQUIRED

PR #301 exact head `83d7137010ba21f58a6b414c3df85f74bd9ca569`: one confirmed current-scope docs defect, `SET01-DOC-MIRA-01`. `PROJECT_STATE.md` and `ROADMAP.md` would remain stale after merge because they describe this docs closeout itself as the current/next Settings step. Correction is limited to those two files' post-merge state wording; 8-file docs-only scope remains unchanged. CI #42415969415 and Chromium #42415969301 are SUCCESS on the reviewed head. Fresh coordinator review is required after the correction.


## SET-01 factual documentation closeout — coordinator PASS

PR #301 exact head `741da8cd534998defb02691dffa53823f389cf1b`: **PASS, 0 confirmed current-scope defects**. `SET01-DOC-MIRA-01` is closed; correction changed only `PROJECT_STATE.md` and `ROADMAP.md` from the previously reviewed head and now records stable post-merge state. Whole PR remains exactly 8 assigned docs files with no runtime/schema/workflow/SET-02 implementation changes. Exact-head CI #42417637551 and Chromium #42417637555 are SUCCESS. PR #301 is clean/mergeable and ready for owner merge. SET-02–SET-06 remain unassigned.


## SET-01 closed; SET-02 implementation assigned

- PR #301 merged; current main `681e8bab0eda595186acebae9ce4b2d47d06b936`. SET-01 implementation and factual documentation are fully closed in repository/local-CI scope.
- SET-02 technical plan already exists in #251 comment #6711736883 and previously passed coordinator review; no repeat planning is required.
- Lira is assigned SET-02 implementation only: Settings shell/navigation, Forum & roles surface, and independent new-account registration controls for Google and email/password with existing sign-in/link preserved.
- SET-03–SET-06, deputies, Stage6/production/live Google/Owner binding and factual permanent docs are outside the implementation PR.
- Next handoff is Lira stable implementation PR/head + actual checks for Mira coordinator whole-PR review.


## SET-02 coordinator review — CHANGES REQUIRED

PR #302 exact head `6dbe6a2d912dab6288fbb2fd1e5b554edd4df9ef`: whole 49-file coordinator review found two current-scope Google-auth issues. **SET02-MIRA-01:** Better Auth still permits its default implicit same-email OAuth linking, contrary to Vico's explicit-link boundary; enforce explicit-only linking while preserving new Google registration, existing linked sign-in and protected `linkSocial`. **SET02-MIRA-02:** approved open-registration → close-before-OAuth-callback create-user acceptance is not covered; current Google registration tests use direct ID-token sign-in, while callback coverage is only link-account. Exact-head CI #42428820932 and Chromium #42428820914 are SUCCESS but do not close these gaps. Lira correction assigned; Lev remains unassigned until fresh Mira PASS.


## SET-02 corrected head — coordinator PASS / Lev review assigned

PR #302 exact head `f7a862ea0a81112857e9d7510afdab183a9631a3`, base `681e8bab0eda595186acebae9ce4b2d47d06b936`: Mira fresh whole-PR **PASS, 0 confirmed current-scope defects**. SET02-MIRA-01/02 are closed. Exact-head CI #42431260134 and browser #42431260118 are SUCCESS. Implementation is frozen. Lev is assigned an independent technical whole-PR review of the same head; Mark remains unassigned. SET-03–SET-06, docs closeout and Stage6/production remain outside the active implementation review.


## SET-02 independent technical review — Лёва CHANGES REQUIRED

- [Full report #6715455171](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6715455171), reviewed `f7a862ea0a81112857e9d7510afdab183a9631a3` / base `681e8bab0eda595186acebae9ce4b2d47d06b936`; весь49-file diff. **1 confirmed P2: SET02-LEV-01**, других current-scope defects не установлено.
- **SET02-LEV-01:** real policy SELECT query timeout (isolated PG ACCESS EXCLUSIVE table lock, AuthRuntime real Client query_timeout350) → new admission hook throws → Better Auth1.7.7 assertValidUserInfo catches every callback exception and emits cause-less403 validation_failed → current AuthRuntime.handle/auth route return it without original failure classification. Missing singleton/RegistrationSettingsInvariantError маскируется тем же403. New user0, existing email sign-in200; reproduced through production AuthRuntime, не mock callback.
- Approved plan требует typed unavailable/fail-closed и normal unexpected-error handling. Correction: сохранить primary admission cause request-local и обработать на application response boundary; intentional closed-method403 остаётся. Не считать любой validation_failed/403/500 признаком outage и не делать permissive fallback.
- Exact reproduction/result JSON и code locations в отчёте; own probe `/workspace/work/set02-review-evidence/admission-failure-probe.mts` + JSON/log. Это подтверждённый defect, не hypothesized finding.
- Проверены остальные policy/CAS/Owner/History/schema/privileges/Settings canonical-writer paths. 0060 добавляет только registration relation/seed + расширение History CHECK; accepted0000–0059 неизменны. Actual manifest64tables и3 metadata suites PASS.
- Собственные reruns:93 unit/route/UI (15 files),84 PG (6 files),build; real Chromium Settings17 + separate History38 PASS,0 page errors/external requests, responsive assertions preserved. AP-10 local rerun не заявляется; exact-head author CI/browser отдельно SUCCESS.
- SET02-MIRA-01/02 закрыты и независимо пересверены: explicit-only linking и signed-state OAuth open→closed rejection/open→open creation с real Better Auth/PG, synthetic remote provider.
- Checkout/diff clean, implementation unchanged; task-owned runtime/container/DBs/dummy vars/dependency symlink removed. Evidence logs/results/screenshots/manifest/hashes/report в `/workspace/work/set02-review-evidence/`.
- **Next — Мира:** bounded author correction SET02-LEV-01, затем fresh coordinator-first cycle. К merge не готовить; Лёва остановился, Марк не назначен.


## SET-02 independent review — SET02-LEV-01 confirmed

Lev independent technical review of PR #302 exact head `f7a862ea0a81112857e9d7510afdab183a9631a3` returned CHANGES REQUIRED with one current-scope P2, SET02-LEV-01. Mira independently confirmed it: registration-policy DB/invariant failures are swallowed by the Better Auth validation boundary and emerge as ordinary `403 validation_failed`, violating the approved failure contract although account creation remains fail-closed. Lira is assigned one bounded correction in the same PR. SET02-MIRA-01/02 remain closed. After a new stable head and checks, the coordinator cycle restarts before any further Lev review.


## SET-02 corrected head after SET02-LEV-01 — coordinator PASS

PR #302 exact head `07d805d98ee77f9584f9609772ce2d33b9a8e63f`, base `681e8bab0eda595186acebae9ce4b2d47d06b936`: Mira fresh whole-PR **PASS, 0 confirmed current-scope defects**. SET02-MIRA-01/02 and SET02-LEV-01 are closed. Correction from the Lev-reviewed head is bounded to `app/auth/auth.server.ts` and `tests/database/auth-runtime.test.ts`. Exact-head CI #42434044474 and browser #42434044476 are SUCCESS. Implementation is frozen. Lev is assigned a repeat independent technical review of this same head; Mark remains unassigned.


## SET-02 repeat independent technical review — Лёва PASS

[Full report #6715843589](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6715843589), PR #302 exact `07d805d98ee77f9584f9609772ce2d33b9a8e63f` / base `681e8bab0eda595186acebae9ce4b2d47d06b936`: **PASS, 0 confirmed current-scope defects**. Whole49-file scope пересверен; correction от предыдущего review меняет только auth.server.ts и auth-runtime.test.ts, остальные47 files byte-identical. SET02-LEV-01 закрыт собственным9-case production AuthRuntime/PG fault probe, включая OAuth callback; availability503, invariant/unexpected preservation и intentional denial различаются, при failure0 user/account/session. SET02-MIRA-01/02 остаются закрытыми. Own111 app/44PG/build/28metadata/actual64-table schema и real Chromium Settings17+History38 PASS. Runtime/container/DBs/dummy vars/symlink убраны, git clean, head/base unchanged. Лёва implementation не менял, других агентов не запускал и остановился. Next — Мира readiness routing; owner merge затем separate factual docs closeout. SET-03–06/Stage6/production вне scope.


## SET-02 final readiness — owner merge

PR #302 exact head `07d805d98ee77f9584f9609772ce2d33b9a8e63f`: final coordinator PASS + Lev repeat independent PASS, both with 0 confirmed current-scope defects. SET02-MIRA-01/02 and SET02-LEV-01 are closed. CI #42434044474 and browser #42434044476 are SUCCESS; PR remains clean/mergeable. Service PR #251 has exactly seven required files. **Owner merge #302 is now the next action.** After merge, run a separate factual SET-02 documentation closeout before assigning SET-03. No Stage6/production/live Google/real Owner binding action is authorized.


## SET-02 implementation merged; factual docs closeout assigned

PR #302 merged into main at `a86cea918a3f2665399e861d8e01ece8a1d80104`. Runtime SET-02 is closed. Lira is assigned a separate docs-only closeout touching exactly seven files: `PROJECT.md`, `PROJECT_STATE.md`, `ROADMAP.md`, `docs/ADMIN_PANEL.md`, new `docs/SETTINGS.md`, history index, and new `PROJECT_HISTORY_18.md`. SET-03–06 remain unassigned. No Codex review is assigned for the docs-only closeout; Mira reviews the stable docs head after Lira handoff.


## SET-02 docs review — SET02-DOC-MIRA-01 confirmed

PR #303 exact head `bc0b8fd248293be76f797add6dba8f804c213185`: Mira docs review found one current-scope documentation defect. New `docs/SETTINGS.md` reverses the approved package mapping: SET-03 must be **User preferences**, SET-04 must be **Administrator preferences**. The defect appears in the five-surface table and future-scope section. The other six docs files have no confirmed current-scope defects; exact-head CI #42436784166 is SUCCESS. Lira is assigned a one-file correction only; Lev/Mark remain unassigned.


## SET-02 docs closeout — final PASS / owner merge

PR #303 exact head `49d93b776d7a0bf480955abb3e33e9772e761273`: Mira fresh docs review **PASS, 0 confirmed current-scope defects**. SET02-DOC-MIRA-01 is closed; correction changed only `docs/SETTINGS.md` and restored the approved SET-03 User preferences / SET-04 Administrator preferences mapping. Exact-head CI #42437660217 is SUCCESS, PR is clean/mergeable, and #251 still has exactly seven required working files. **Owner merge #303 is the next action.** SET-03 remains unassigned until merge is observed.


## SET-02 fully closed; SET-03 implementation assigned

Docs PR #303 merged into main at `cb805a074de3bfdcd140125ebaa425a76bb6496d`; SET-02 implementation and factual documentation are fully closed. The approved SET-03 technical plan already exists in #6711736883 and remains aligned with current `docs/SETTINGS.md`, so no repeat Codex planning is needed. Lira is assigned SET-03 User preferences implementation only: existing theme, own locale preference and existing Editor/code preferences with their current storage ownership and real consumers. No schema/migration, SET-04–06, notifications, drafts/autosave, Stage6 or permanent docs in the implementation PR. Next handoff is Lira stable PR/head + checks for Mira coordinator review.


## SET-03 coordinator PASS — Lev review assigned

PR #304 exact head `cc8dfc9722287ec66ade759b0b1c8d69a8062a6c`, base `cb805a074de3bfdcd140125ebaa425a76bb6496d`: Mira fresh whole-PR **PASS, 0 confirmed current-scope defects**. Theme, own locale, Editor/code preference chains and real consumers were rechecked; no schema/migration/RBAC or SET-04–06 expansion. Exact-head CI #42443561989 and Chromium #42443561941 are SUCCESS; PR is clean/mergeable. Implementation is frozen. Lev is assigned independent technical whole-PR review of this same head; Mark remains unassigned.


## SET-03 independent technical review — Лёва CHANGES REQUIRED

[Report #6716992555](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6716992555), PR #304 exact `cc8dfc9722287ec66ade759b0b1c8d69a8062a6c` / base `cb805a074de3bfdcd140125ebaa425a76bb6496d`: **1 confirmed P2, SET03-LEV-01**. Whole26-file review complete. New locale form keeps its old uncontrolled select across account change while hidden expectedUserId updates; independently reproduced through real sign-out/sign-in + ordinary header-locale SPA revalidation, same mounted DOM, then Bob.locale he→Alice's unsaved ru on Save. Server authorization itself remains correct; bounded account-scoped form/draft reset required. Own333 app/15PG/build, actual Chromium SET-03 11 + SET-02 17 groups PASS; passing coverage misses same-mounted-account transition. HTTP/PG timeout/registry/schema classification independently checked; no new schema/deps/RBAC/future package scope. Task-owned test resources cleaned. Лёва implementation не менял, агентов не запускал и остановился. Next — Мира correction routing; new head requires fresh coordinator-first review. No merge readiness or SET-04–06/docs/Stage6 work now.


## SET-03 independent review — SET03-LEV-01 confirmed

PR #304 exact head `cc8dfc9722287ec66ade759b0b1c8d69a8062a6c`: Lev found one P2, SET03-LEV-01, and Mira independently confirmed it. The locale select is uncontrolled via `defaultValue`; on a same-mounted account change, loader identity/hidden expectedUserId can update while the previous account's unsaved locale remains in the DOM, so an explicit Save can apply that stale draft to the new session actor. Server authorization remains correct; the defect is account-scoped UI draft isolation. Lira is assigned one bounded correction only. After a new stable head/checks, coordinator-first review restarts. Mark remains unassigned.


## SET-03 corrected head — coordinator PASS / Lev repeat review assigned

PR #304 exact head `6c45bb17ea84f1df0bed8a8b8ca4c558ba42edac`, base `cb805a074de3bfdcd140125ebaa425a76bb6496d`: Mira fresh coordinator-first whole-PR **PASS, 0 confirmed current-scope defects**. SET03-LEV-01 is closed: the locale form is account-keyed, so old unsaved locale state cannot cross a same-mounted account change; same-account draft behavior is preserved. Correction changes only three files from the prior reviewed head, while the other 23 PR files are byte-identical. Exact-head CI #42445796066 and Chromium #42445796063 are SUCCESS. Implementation is frozen. Lev is assigned repeat independent technical whole-PR review of this same head; Mark remains unassigned.


## SET-03 repeat independent technical review — Лёва PASS

[Full report #6717213664](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6717213664), PR #304 exact `6c45bb17ea84f1df0bed8a8b8ca4c558ba42edac` / base `cb805a074de3bfdcd140125ebaa425a76bb6496d`: **PASS, 0 confirmed current-scope defects; SET03-LEV-01 closed independently**. Whole26-file scope пересверен; correction ровно3 files/1 runtime line, остальные23 byte-identical. Own actual Chromium/Worker/Better Auth/PG Alice→Bob→Alice probe подтвердил same-account draft preservation, stale409, reset только locale form, Bob's own saved locale/no auto-write, fresh explicit own Save, сохранённые per-account Editor keys и browser-wide theme. Own334 app/15PG/build +12 SET-03 browser groups +5 own groups PASS;0 page errors/external requests, responsive/RTL assertions сохранены. GitHub exact-head CI #42445796066/browser #42445796063 SUCCESS/attempt1. Runtime/DB/container/vars/symlink cleaned, git clean, implementation unchanged. Лёва завершил review и остановился; next — Мира readiness routing, owner merge затем separate SET-03 docs closeout. SET-04–06/Stage6/production inactive.


## SET-03 final readiness — owner merge

PR #304 exact head `6c45bb17ea84f1df0bed8a8b8ca4c558ba42edac`: final coordinator PASS + Lev repeat independent PASS, both with **0 confirmed current-scope defects**. SET03-LEV-01 is closed. CI #42445796066 and browser #42445796063 are SUCCESS; PR is clean/mergeable and #251 still has exactly seven required working files. **Owner merge #304 is now the next action.** After merge, run a separate factual SET-03 docs closeout before assigning SET-04. SET-04–06/Stage6/production remain inactive.


## SET-03 implementation merged; factual docs closeout assigned

PR #304 merged into main at `e985a43f8853c234c96bb4528a9d4dd709361018`; runtime SET-03 is closed. Lira is assigned a separate docs-only closeout touching exactly six files: `PROJECT.md`, `PROJECT_STATE.md`, `ROADMAP.md`, `docs/SETTINGS.md`, history index, and new `PROJECT_HISTORY_19.md`. The docs must reflect implemented User preferences (existing browser-wide theme, own account locale, existing per-account/device Editor/code preferences) and stable post-merge status, while SET-04–06 remain pending/unassigned. `docs/EDITOR.md` is intentionally unchanged because SET-03 reused rather than altered its existing preference contract. No Codex review is assigned; Mira reviews the stable docs head. SET-04 does not start before docs merge.


## SET-03 docs closeout — final PASS / owner merge

PR #305 exact head `892d30f954c1cd974d16b8331b7af71607db9bde`: Mira docs review **PASS, 0 confirmed current-scope documentation defects**. All six changed files were read fully and match merged SET-03 runtime plus the approved Settings sequence. Exact-head GitHub Actions #42447751106 `checks` and `database` are SUCCESS; PR is clean/mergeable and #251 still has exactly seven required files. No Codex review is needed for this docs-only closeout. **Owner merge #305 is now the next action.** SET-04 remains unassigned until that merge is observed.


## SET-03 fully closed; SET-04 implementation assigned

Docs PR #305 merged into main at `35fa64428fc551ae58b9026dad45797016dd4251`; SET-03 implementation and factual documentation are fully closed. The already approved SET-04 technical plan in #6711736883 remains aligned with current AdminShell, Attention mode/group access, Settings shell and current authorization boundaries, so no repeat Codex planning is needed. Lira is assigned SET-04 Administrator preferences implementation only: per-account/device local Admin/Attention entry preferences, density and approved secondary-detail disclosure with real consumers. No DB/migration/new permission, SET-05–06, permanent docs or Stage6/production work. Mira reviews the first stable implementation head before any Lev review.

## SET-04 implementation complete — Lira handoff for Mira coordinator review

Implementation [PR #307](https://github.com/iliya1947/vico-forum/pull/307), exact head `1a858825836e76801bb63025a28312b4d0bdd082`, base/current main `35fa64428fc551ae58b9026dad45797016dd4251`: **open, Ready, mergeable, implementation frozen**. This is an author delivery, **not** a self whole-PR PASS.

Delivered independently guarded Administrator preferences surface with device-local per-account versioned preference record, effective-permission-scoped Admin and Attention entry links/default/last destinations, comfortable/compact density, secondary technical-detail disclosures with manual override, EN/RU/HE and real consumers. Storage corrupt/version/account switching, grant/revoke fallback, explicit URL precedence, current Admin-only/Attention-only admission and responsive/keyboard behavior are covered. No new DB/schema/migration/RBAC, SET-05–06, permanent docs or Stage 6.

Exact-head [CI #42456818922](https://github.com/iliya1947/vico-forum/actions/runs/42456818922): **SUCCESS** (`checks`, `database`), 164 application files / 2054 tests, PostgreSQL17/Worker smoke and builds. Exact-head [Chromium #42456818927](https://github.com/iliya1947/vico-forum/actions/runs/42456818927): **SUCCESS** (`browser`, `history_browser`, `settings_browser`, `settings_administrator_browser`). Corrections after earlier failed heads were localized to JSX, actor rendering, translation fingerprints/types and tests reflecting the approved technical-disclosure behavior. Browser/local acceptance only; production/Stage6/live Google/real Owner binding and Owner visual acceptance not claimed.

**Next assigned reviewer: Мира**, coordinator whole-PR review on frozen exact head, then normal routing under AGENTS.md. Лёва/Марк not assigned; owner merge not requested. Permanent documentation remains a separate post-merge closeout.


## SET-04 coordinator review — SET04-MIRA-01 confirmed

PR #307 exact head `1a858825836e76801bb63025a28312b4d0bdd082`: Mira coordinator whole-PR **CHANGES REQUIRED** with one confirmed current-scope defect. The real `/:locale/admin/measures/:measureId` loader constructs `AdminAccess` without the current actor ID, while `AdminShell` intentionally consumes per-account SET-04 preferences only when `access.actorId` matches the authenticated header account. Result: measure detail silently falls back to default/comfortable density. This is a presentation gap only; AP-10 authorization/domain semantics remain intact. Lira is assigned one bounded correction plus regression ensuring actor-bound density on the real detail route and that a private measure detail is never recorded as `adminLast`. Lev remains unassigned until a fresh coordinator PASS on the corrected stable head.

## SET-04 SET04-MIRA-01 — Lira correction delivered; fresh Mira review

Previous Mira coordinator review of PR #307 exact head `1a858825836e76801bb63025a28312b4d0bdd082` confirmed one SET-04 presentation gap on the real `/:locale/admin/measures/:measureId` route: missing actor ID in `AdminAccess` meant `AdminShell` could not consume the current authenticated account's density preference.

Bounded author correction now delivered in PR #307 exact head `5cc5c820b0445ddb57cf3663e7cfb33c059ab108` from unchanged main `35fa64428fc551ae58b9026dad45797016dd4251` (open/Ready/mergeable). One route expression passes `{...adminAccess(...), actorId}` consistently with the measures index. Added React account-mismatch/density/private-`adminLast` regression in `app/measures/views.test.tsx` and real AP-10 Chromium route scenario in `tests/browser/user-measures/check.py`. Exactly three files changed relative to previous head; no new DB/schema/migration/RBAC, AP-10 action/revalidation/appeal/domain change, SET-05/06 or docs.

Exact-head [CI #42458305882](https://github.com/iliya1947/vico-forum/actions/runs/42458305882) **SUCCESS** (`checks`, `database`; 164 application test files, **2055 tests PASS**, PostgreSQL17/Worker smoke). Exact-head [Chromium #42458305779](https://github.com/iliya1947/vico-forum/actions/runs/42458305779) **SUCCESS** (all four jobs: `browser`, `history_browser`, `settings_browser`, `settings_administrator_browser`). The `browser` log explicitly records `set04-actor-bound-admin-measure-detail-density-no-private-last-entry`.

**Lira stops after author evidence; SET04-MIRA-01 still awaits fresh Mira verification, not self-closed.** Next step is Mira coordinator whole-PR review of frozen corrected head. Lev/Mark not assigned, Owner merge not requested; permanent docs follow merge separately. Production/Stage6/live Google/real Owner binding not claimed.


## SET-04 corrected head — fresh coordinator PASS / Lev review assigned

PR #307 exact head `5cc5c820b0445ddb57cf3663e7cfb33c059ab108`, base/current main `35fa64428fc551ae58b9026dad45797016dd4251`: Mira fresh coordinator whole-PR **PASS, 0 confirmed current-scope defects**. SET04-MIRA-01 is closed: the authenticated measure-manager actor ID now reaches AdminShell on the real measure-detail route, so density remains account-bound; stale/different header identity cannot inherit it, and exact-path recording keeps `adminLast` at the `measures` workspace index rather than any private measure ID/path. Correction from the prior reviewed head is exactly one commit / three files (one runtime line + two regressions); the other 35 PR files are unchanged from the completed prior whole-PR review. Exact-head CI #42458305882 and Chromium #42458305779 are SUCCESS; browser log executed the new real measure-detail case. Implementation is frozen. Lev is assigned independent technical whole-PR review of the same head; Mark remains unassigned.


## SET-04 independent technical review — Лёва CHANGES REQUIRED

[Full report #6718927323](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6718927323), PR #307 exact `5cc5c820b0445ddb57cf3663e7cfb33c059ab108` / base `35fa64428fc551ae58b9026dad45797016dd4251`: whole38-file review complete, **1 P2 SET04-LEV-01**, других confirmed current-scope defects нет. Новые Administrator Settings nav/entry projection не учитывают поддерживаемый close-only Admin: реальные direct Admin/Administrator200, Settings0 entry links; pin grant2links, revoke pin0links при retained close/direct200. Baseline header omission явно отделён от текущего нового SET-04 consumer defect. Нужен bounded admission-matrix parity fix, без authority/RBAC change. **SET04-MIRA-01 не переоткрыт**: независимо проверен реальный command-created measure detail, actor-bound compact, unchanged adminLast/no privateIDs иother-user403. Own251 app/9PG/build/10SET04 browser +4probe groups; GitHub CI/browser same-head SUCCESS. Task-owned environment cleaned, git clean; implementation не менялся. Лёва завершил review/остановился; next — Мира correction routing, затем fresh coordinator-first cycle на новом head. SET-05/06/docs/Stage6 inactive.


## SET-04 independent review — SET04-LEV-01 confirmed and correction assigned

Lev whole-PR review of #307 exact head `5cc5c820b0445ddb57cf3663e7cfb33c059ab108` returned CHANGES REQUIRED with one P2, SET04-LEV-01; no other current-scope defect was found and SET04-MIRA-01 remains independently closed. Mira verified the full chain and classification: authoritative Admin admission and the new Administrator Settings loader both use complete `ADMIN_ADMISSION_PERMISSIONS`, including `forum.topic.close`, while `locale-boundary.tsx` omits only that permission from the server-derived header/Admin projection. New SET-04 entry destinations and Settings navigation depend on that incomplete projection, so a valid close-only Admin can directly enter Admin and Administrator preferences but is not offered the new Settings surface. The legacy header omission predates SET-04 and is not reopened as a separate historical defect; the current defect is the new SET-04 consumer inconsistency. Lira is assigned one bounded parity correction plus close-only/revoke regression in the existing #307. No new permission/RBAC/schema/migration, SET-05/06, docs or Stage6 work. After a new stable head/checks, coordinator-first review restarts before any Lev repeat review.

## SET-04 SET04-LEV-01 — Lira correction delivered for fresh coordinator review

Implementation [PR #307](https://github.com/iliya1947/vico-forum/pull/307), new exact head `27a2169ab013597d63fc318c7a255cdc4149b7cc`, unchanged base/current main `35fa64428fc551ae58b9026dad45797016dd4251`; open/Ready/mergeable and author-frozen. Lev's P2 SET04-LEV-01 (previous head `5cc5c820b0445ddb57cf3663e7cfb33c059ab108`) was a current-scope mismatch: valid close-only Admin admission remained active on protected Admin + Administrator routes, while SET-04 Settings entry projection omitted `forum.topic.close` and hid the new Settings navigation.

Author correction is limited to `app/routes/locale-boundary.tsx` (reads `forum.topic.close` for server-derived Admin access projection), `app/routes/locale-boundary.test.ts` (every existing Admin admission capability and close-only next-request revoke parity), and `tests/browser/settings-administrator/check.py` (actual close-only Better Auth actor gets 2 Settings links, Overview+Forum choices; additional pin grant and revoke leave access correct; sole close revoke removes links and direct Administrator/Admin becomes 403). Independent route gates, per-account local settings, permission intersection, AP-10/domain logic and explicit URL precedence remain unchanged. No new permission/RBAC/DB/schema/migration, SET-05/06, permanent docs or Stage6 work.

**Exact-head evidence:** [CI #42461288512](https://github.com/iliya1947/vico-forum/actions/runs/42461288512) **SUCCESS**, `checks` + `database`, 164/164 test files, **2066/2066 tests PASS**; [Chromium #42461288533](https://github.com/iliya1947/vico-forum/actions/runs/42461288533) **SUCCESS**, all 4 jobs (`browser`, `history_browser`, `settings_browser`, `settings_administrator_browser`). The SET-04 browser job log explicitly records `close-only-admin-settings-links-valid-choices-and-fresh-revoke`. Prior SET04-MIRA-01 remains closed from the previous reviewed head; it was not reopened.

**Lira stops.** This author delivery is not a coordinator PASS: new implementation head supersedes prior whole-PR reviews. Mira must perform a fresh coordinator whole-PR review on the frozen `27a2169ab013597d63fc318c7a255cdc4149b7cc` before any Lev repeat independent review. Mark not assigned; Owner merge not requested. Permanent docs are separate post-merge.


## SET-04 corrected head — fresh coordinator PASS / Lev repeat review assigned

PR #307 exact head `27a2169ab013597d63fc318c7a255cdc4149b7cc`, base/current main `35fa64428fc551ae58b9026dad45797016dd4251`: Mira fresh coordinator whole-PR **PASS, 0 confirmed current-scope defects**. SET04-LEV-01 is closed: the only runtime delta adds the existing `forum.topic.close` capability to the server-derived Admin projection used by new SET-04 entry surfaces; authoritative admission/RBAC/route guards are unchanged. Unit regression covers every current Admin admission permission plus close-only fresh revoke. Real SET-04 Chromium acceptance executed `close-only-admin-settings-links-valid-choices-and-fresh-revoke`. SET04-MIRA-01 remains closed on the same head; AP-10 browser log executed `set04-actor-bound-admin-measure-detail-density-no-private-last-entry`. Other 35 PR files are byte-identical to the prior completed whole-PR review. Exact-head CI #42461288512 and Chromium #42461288533 are SUCCESS. Implementation is frozen. Lev is assigned repeat independent technical whole-PR review of the same head; Mark remains unassigned.

# Admin panel — communication

Служебный PR: #251. Оперативное состояние: [workflow.md](./workflow.md).

## Актуальный baseline и Stage1 review

- Current main/base: `bcf02193f82aa0d448444c6943d6ebdcf09f7896`, migrations main0000–0058.
- Ordinary Admin Panel AP-01–AP-11 fully closed; Settings deferred.
- Owner/authorization redesign Stage1 implementation PR #294 Draft/open/unmerged.
- Reviewed exact head: `e3604222ae8cecb4b1f2f94cdd5d7e9f76c15e61`; implementation migration0059.
- Approved technical plan: #6700603167. Coordinator whole-PR PASS + **independent technical PASS** на одном exact head.
- [Independent report #6701647394](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6701647394); confirmed current-Stage1 defects не осталось.
- Exact-head CI #42328843126 и browser #42328843151 SUCCESS; author CI отдельно от собственных reruns.
- Implementation не merged; отдельный factual docs closeout ещё не принят. Stage1 целиком пока не closed.
- Production/Stage6 и owner visual acceptance не выполнялись.

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



## Owner decision — current Stage1 boundaries

- Удаляется только obsolete last-manager: AuthorizationLockoutError/countManagers/managers_ever_existed/dedicated veto checks/tests.
- authz_mutation_lock как shared mutex сохраняется: singleton row/id=1, table/PK/CHECK, FOR UPDATE, SELECT+UPDATE runtime privilege и lock probe.
- Fresh authorization/AP-10 authority/elevated-key/issuer-floor guards и atomic History сохраняются.
- Owner authority implementation, mutex redesign/removal, Settings и super-admin UI не входят в Stage1.
- Изменения уже реализованы и проверены в PR #294; current main до merge остаётся прежним.

## Подтверждённый independent result

- Whole21-file diff проверен. Active runtime/count/error/flag veto удалены без замены другим manager-preservation mechanism.
- Допустимые self-revoke/role/grant changes committed с обычной History; следующий fresh request actor denied. Failed History всё ещё rollback.
- 0059 drops только managers_ever_existed; snapshot/manifest/schema/journal согласованы, accepted0000–0058 unchanged.
- Route assigned-role409 и EN/RU/HE copy/fingerprint сохранены без ложного lockout текста.
- Browser self-revoke выполняется в конце History flow; AP-10/AP-11 regression и изолированные DB fixtures сохранены.
- Current docs clauses обновляются отдельным closeout, historical artifacts не переписываются.

## Собственное evidence Лёвы

- Node24.21.0/pnpm12.3.4, disposable loopback PostgreSQL17.
- 23/23 unit/route/UI + 112/112 native PostgreSQL tests PASS; build и 3 metadata script suites PASS.
- Real controlled mutex wait/fresh authority и History rollback подтверждены PostgreSQL.
- Independently written upgrade-probe поверх полной populated0058 schema для false/true: payload9 relations и mutex row/PK/CHECK preserved.
- Actual Chromium→Worker→Better Auth→PG: History35 cases и AP-10/AP-11 34 cases PASS; нет page errors/external requests/layout failures в применимой матрице.
- Local evidence: `/workspace/work/stage1-review-evidence/`; History JSON не пишет SHA, привязка подтверждена exact checkout/build/command/report. AP-10 JSON пишет implementationHead.
- Implementation не менялся; tracked checkout чист. Worker остановлен, disposable DB/container и dummy vars удалены.

## Следующий шаг

- **Мира:** принять independent PASS #6701647394; readiness и отдельный factual documentation closeout Stage1. Implementation/docs merge выполняет владелец.
- Active last-manager source-of-truth clauses синхронизировать с принятым owner decision, не возвращать отменённый принцип и не добавлять owner authority в этот пакет.
- Stage1 целиком закрывается после implementation/docs acceptance/merge; дальнейшие owner/mutex/Settings stages отдельно.
- Лёва review завершил и остановился; изменение implementation head требует coordinator-first cycle. Марк не назначен.
- Stage6/production и owner visual acceptance вне scope.

Общий контракт: [ADMIN_PANEL_IMPLEMENTATION_PLAN.md](../ADMIN_PANEL_IMPLEMENTATION_PLAN.md).


## Stage 1 independent technical review — PASS

- Лёва independently reviewed PR #294 on exact head `e3604222ae8cecb4b1f2f94cdd5d7e9f76c15e61`.
- Report: #6701647394.
- Verdict: **PASS**, zero confirmed current-scope defects.
- Independently confirmed:
  - obsolete last-manager veto/error/count/flag removed;
  - retained `authz_mutation_lock` still serializes authorization/AP-10 authority;
  - fresh permission denial after self-revoke;
  - History rollback/atomicity preserved;
  - 0058→0059 upgrade probe preserves mutex row/PK/CHECK and populated authorization/measure data;
  - own PostgreSQL/browser reruns PASS;
  - GitHub exact-head CI #42328843126 and browser #42328843151 SUCCESS.
- Implementation head remains frozen and unchanged.
- Stage1 implementation is ready for owner merge. Permanent documentation is still intentionally separate and must be updated after implementation merge.

### Next

1. Owner merges PR #294.
2. Mira verifies merged `main`.
3. Mira prepares separate factual documentation closeout for Stage1.
4. Only after docs closeout is merged does Stage1 become fully closed.


## Stage 1 documentation closeout — PR #295

- Implementation PR #294 merged 2026-11-07 at main `e20490bc2d80c696bdf78e62539a8e1440821f9e`.
- Separate documentation PR **#295** opened from that exact main.
- Docs exact head: `a431b5fc35b577b301f206e7f046645ce1da4c35`.
- Exactly 8 documentation files:
  - `PROJECT_STATE.md`
  - `ROADMAP.md`
  - `docs/ADMIN_PANEL.md`
  - `docs/PROJECT_HISTORY/PROJECT_HISTORY.md`
  - `docs/PROJECT_HISTORY/PROJECT_HISTORY_14.md`
  - `docs/UI_UX_PASS.md`
  - `docs/auth/AUTHORIZATION.md`
  - `tests/browser/admin-history/README.md`
- Active source-of-truth now reflects Stage1 runtime: old manager-count/last-manager veto removed; `authz_mutation_lock` retained as transaction mutex; fresh permission/admission checks and atomic History remain.
- Historical Stage4/UI wording is marked superseded, not rewritten as if it never existed.
- PROJECT_STATE records migrations through 0059 and next route: continue target owner/administrative hierarchy; Settings remains after redesign.
- PROJECT_HISTORY_14 records #294 plan/implementation/reviews/evidence/merge.
- No runtime code/schema/migration/permissions/grants/workflow/production changes in #295.
- CI for #295 exact head is pending/not yet visible at the time of this coordination update.

### Next

Mira verifies exact-head CI for #295. If green and head unchanged, #295 is ready for owner merge. Stage1 becomes fully closed only after #295 merge.


## Stage 1 documentation closeout — exact-head checks PASS

- PR #295 exact head `a431b5fc35b577b301f206e7f046645ce1da4c35` unchanged and mergeable.
- Changed files rechecked: exactly 8 documentation files, no runtime/schema/migration code.
- Exact-head CI #42335079631: **SUCCESS**.
- Exact-head browser #42335079658: **SUCCESS**.
- Documentation closeout is ready for owner merge.
- Stage1 becomes fully closed after #295 merge.


## Owner/authorization redesign Stage 1 — fully closed

- Documentation PR #295 merged 2026-11-07.
- Current `main`: `8301087f9322b34bdd325ed9298fdf3fddd84561`.
- Repository migrations: 0000–0059.
- Stage 1 is fully closed:
  - implementation #294 merged;
  - coordinator PASS;
  - independent Лёва PASS;
  - factual docs closeout #295 merged;
  - active source-of-truth aligned.
- Current runtime has no manager-count/last-manager veto.
- `authz_mutation_lock` remains only as the shared authorization/AP-10 transaction mutex.
- Fresh authorization/admission checks and atomic History/rollback remain.
- No production/deployed acceptance or owner visual acceptance is claimed.

## Next stage — target owner authority product model

- Technical planner: not assigned.
- Implementer: not assigned.
- Before technical planning, owner-level product semantics must be fixed.
- No implementation task is assigned to Лёва/Лира yet.
- Settings remains after completion of owner/authorization redesign.
- Mutex redesign/removal is not automatically part of the next stage; only if the target model technically requires it.
- Stage 6/production remains out of scope.


## Owner model clarification — existing role constructor remains authoritative below Owner

- Owner is not a role template and is not part of ordinary role construction.
- Below Owner there is **no new Senior/Head Admin built-in role or second hierarchy system**.
- Existing role constructor remains authoritative: built-in/custom role permissions, one assigned role per user, and per-user allow/deny/inherit overrides.
- AP-10 elevated administrative authority already uses the ordinary permission `admin.users.blocks.managePrivileged`; a custom role may carry it.
- Current code has one special Owner gate: only bound `VICO_OWNER_USER_ID` may add/remove that elevated permission through role grants, assignments involving an elevated role, or per-user override.
- The only unresolved product question at this point is whether that grant/revoke gate itself should remain Owner-only or should behave like ordinary permission management under `access.authorization.manage`.

## Owner decision — elevated AP-10 permission remains Owner-only

- `admin.users.blocks.managePrivileged` remains an ordinary permission in the existing role constructor/RBAC model.
- Its **grant/revoke boundary is special**: only the bound Owner may add or remove it.
- This applies to role grant changes, assignment into/out of a role carrying it, and per-user override changes.
- `access.authorization.manage` alone does not authorize self-grant or delegation of this permission.
- No Senior/Head Admin role or second RBAC layer is introduced.
- With this decision, the target Owner product model is sufficiently fixed for technical planning.
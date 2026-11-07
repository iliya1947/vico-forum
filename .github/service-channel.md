# Admin panel — communication

Служебный PR: #251. Оперативное состояние: [workflow.md](./workflow.md). Общий контракт: [ADMIN_PANEL_IMPLEMENTATION_PLAN.md](../ADMIN_PANEL_IMPLEMENTATION_PLAN.md).

## Актуальный baseline и назначение

- Current main: `8301087f9322b34bdd325ed9298fdf3fddd84561`; migrations 0000–0059.
- Ordinary Admin Panel AP-01–AP–11 fully closed. Owner/authorization redesign Stage1 полностью закрыт: implementation #294 и factual docs #295 merged.
- Current stage: **Stage2 owner authority — technical plan готов для coordinator review**.
- Планировщик Лёва выполнил source-level инспекцию. [Предлагаемый bounded-план #6702391114](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6702391114); полный текст также в личном файле Лёвы.
- **Мира:** проверить план, синхронизировать master plan и после approval назначить исполнителя.
- Исполнитель и implementation PR/head Stage2 не назначены. Марк не назначен. Лёва реализацию не начинает.
- Код/схема/миграции не изменены; Stage2 tests/browser/CI ещё не выполнялись. Future acceptance не объявлена.
- Settings после завершения owner/authorization redesign; Stage6/production вне scope. Owner visual/deployed acceptance не заявляется.

## Зафиксированная целевая Owner модель

- Owner — отдельная server-controlled верхняя authority, **не роль из конструктора**. Identity не определяется ролью, email, client input или permission snapshot.
- Ниже Owner сохраняются существующие dynamic role permissions, одна назначенная роль на пользователя и per-user allow/deny/inherit. Нет новой встроенной Senior/Head Admin роли или второго RBAC/hierarchy слоя.
- Owner сохраняет полный forum-management control независимо от обычной роли и overrides; subordinate administrative measures не могут target Owner.
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


## Stage 2 technical plan — coordinator CHANGES REQUIRED

Лёва plan #6702391114 reviewed against current main `8301087f9322b34bdd325ed9298fdf3fddd84561`, current source-of-truth and approved Owner product model.

Two current-scope plan defects must be corrected before implementation:

1. **Owner effective authority is over-broad in the plan.**
   - The plan proposes all keys from `PERMISSION_CATALOG`.
   - Current catalog also contains ordinary participation capabilities: topic/reply creation, own edit/solution/source-locale actions, Help signal submission, translation generation and Complaint submission.
   - Approved Owner model guarantees top **forum-management/administrative authority**, while ordinary user behavior remains governed by the existing role + per-user overrides.
   - Stage2 must therefore inject/bypass only the exact current administrative capability set, not the whole catalog and not unknown/future permissions.
   - Current implemented administrative families already distinguish Forum/Complaints/Security/Users-access capabilities; technical plan should use one non-drifting source for that administrative set rather than a second role/hierarchy system.

2. **AP-10 authoritative measure path is not fully specified for Owner.**
   - `assertUserMeasureAuthority()` currently requires raw `admin.users.blocks.manage` before authority-level comparison, even though `rawUserMeasureAuthorityLevel()` returns level 3 for Owner.
   - A route-level/common effective projection alone therefore does not guarantee that an Owner whose ordinary role/override denies block-management can create/change/lift/review measures.
   - Corrected plan must explicitly define the Owner path at this authoritative transaction boundary while preserving raw RBAC hierarchy/issuer-floor semantics for every non-Owner.
   - Do not solve this by pretending Owner-injected administrative permissions are raw RBAC for non-Owner calculations.

Everything else in the plan remains provisionally acceptable, including retained `authz_mutation_lock`, no schema/migration, complete elevated-permission grant/revoke gate including custom-role deletion, no Settings/super-admin/infra expansion, and separate docs closeout.

### Handoff — Лёва

Revise only these two plan points, re-check affected call chains, publish the corrected bounded Stage2 technical plan in #251, and stop. Do not implement.

## Owner clarification — full forum permission authority

- Owner decision corrected the coordinator interpretation: Owner is not limited to administrative permission families.
- Bound Owner has **all code-backed permissions in the forum permission catalog**, including ordinary participation capabilities.
- Owner role/grants/overrides remain stored and visible as ordinary RBAC configuration, but cannot reduce Owner effective permissions.
- New real permissions added to the centralized code-backed catalog become part of Owner authority automatically; unknown/nonexistent permission strings are not authority.
- Therefore coordinator finding 1 against Lev plan #6702391114 is **withdrawn**. Lev's all-catalog effective projection matches the Owner decision.
- Coordinator finding 2 remains: AP-10 `assertUserMeasureAuthority()` currently checks raw `admin.users.blocks.manage` before rank comparison, so Stage2 must explicitly make bound Owner pass this authoritative path without corrupting non-Owner raw hierarchy semantics.
- Domain/data validity rules that are not permission checks remain separate from this permission decision.
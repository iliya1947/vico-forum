# Admin panel — communication

Служебный PR: #251. Оперативное состояние: [workflow.md](./workflow.md). Общий контракт: [ADMIN_PANEL_IMPLEMENTATION_PLAN.md](../ADMIN_PANEL_IMPLEMENTATION_PLAN.md).

## Актуальный baseline и назначение

- Current main: `8301087f9322b34bdd325ed9298fdf3fddd84561`; migrations 0000–0059.
- Ordinary Admin Panel AP-01–AP–11 fully closed. Owner/authorization redesign Stage1 полностью закрыт: implementation #294 и factual docs #295 merged.
- Current stage: **Stage2 owner authority — revised technical plan готов для повторного coordinator review**.
- Планировщик Лёва выполнил source-level инспекцию. [Предлагаемый bounded-план #6702391114](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6702391114); [Локальная authoritative AP-10 revision #6702520494](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6702520494); полный обновлённый текст в личном файле Лёвы.
- **Мира:** проверить план, синхронизировать master plan и после approval назначить исполнителя.
- Исполнитель и implementation PR/head Stage2 не назначены. Марк не назначен. Лёва реализацию не начинает.
- Код/схема/миграции не изменены; Stage2 tests/browser/CI ещё не выполнялись. Future acceptance не объявлена.
- Settings после завершения owner/authorization redesign; Stage6/production вне scope. Owner visual/deployed acceptance не заявляется.

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

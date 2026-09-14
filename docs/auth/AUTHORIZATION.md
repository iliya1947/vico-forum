# AUTHORIZATION.md

## Назначение

Этот документ — source of truth для application-level authorization Vico Forum.

Better Auth отвечает за authentication/session и authoritative identity пользователя (`user.id`).
Права доступа форума не определяются Better Auth role claim, client input или долгоживущим
session snapshot: effective permissions разрешаются сервером из application PostgreSQL state.

## Базовая модель

1. Authorization permission-based: код проверяет capability/permission, а не названия ролей.
2. Роли динамические и хранятся в БД.
3. Через защищённый UI можно создавать custom roles, менять их display name и набор permissions.
4. Built-in roles `user`, `moderator`, `admin` создаются как стабильные стартовые роли, но их
   permissions являются редактируемыми данными, а не hard-coded поведением приложения.
5. Built-in roles нельзя удалить или изменить их stable slug. Custom role можно удалить только
   когда на неё не назначены пользователи.
6. На первом production release у пользователя одна назначенная роль. Multiple-role membership
   не входит в текущий контракт; исключения реализуются per-user permission overrides.
7. Guest — отсутствие authenticated session; отдельная guest role row не нужна.
8. Новому authenticated пользователю без явного assignment применяется built-in role `user`.
9. Role inheritance не входит в текущую модель: каждая роль имеет собственный явный набор
   permission grants.

## Permission catalog

Permission key означает существующую capability приложения. UI может назначать/отнимать
известные permissions, но не может создавать произвольный executable permission, которого
не знает код.

Начальный Stage 4 catalog:

- `forum.topic.create`;
- `forum.reply.create`;
- `forum.solution.manageOwn`;
- `forum.solution.manageAny`;
- `access.authorization.manage`.

При появлении новой защищённой функции код добавляет новый permission key в централизованный
catalog, после чего он становится доступен role/user configuration UI.

`forum.solution.manageOwn` всегда применяется вместе с server-side resource condition:
actor должен быть author target topic. Client-provided `authorId`, role или permission не
являются authorization evidence.

## Initial role defaults

Это только initial DB seed, а не hard-coded role behavior. Grants перечислены явно; между
ролями нет inheritance.

### `user`

- `forum.topic.create`;
- `forum.reply.create`;
- `forum.solution.manageOwn`.

### `moderator`

- `forum.topic.create`;
- `forum.reply.create`;
- `forum.solution.manageOwn`;
- `forum.solution.manageAny`.

### `admin`

- `forum.topic.create`;
- `forum.reply.create`;
- `forum.solution.manageOwn`;
- `forum.solution.manageAny`;
- `access.authorization.manage`.

После bootstrap пользователь с `access.authorization.manage` может через сайт менять grants
любой роли, включая built-in roles, с учётом lockout invariant ниже.

## Per-user overrides

Для конкретного пользователя каждый permission имеет три состояния:

- `inherit` — персональной записи нет, используется role grant;
- `allow` — permission разрешён независимо от role grant;
- `deny` — permission запрещён независимо от role grant.

Effective permission precedence:

1. explicit user `deny` → denied;
2. explicit user `allow` → allowed;
3. role grant → allowed;
4. иначе → denied.

Следствие: permission роли можно убрать для всех удалением role grant, а для отдельного
пользователя permission можно как дополнительно выдать (`allow`), так и явно забрать (`deny`).

## Persistence contract

Минимальная normalized application schema должна выражать следующие сущности:

- `authz_roles` — role identity, stable slug, display name, system/custom marker, timestamps;
- `authz_permissions` — code-backed permission catalog;
- `authz_role_permissions` — grants role → permission;
- `authz_user_roles` — один explicit role assignment на user;
- `authz_user_permission_overrides` — user → permission → `allow | deny`.

Точные column names могут следовать текущему Drizzle style проекта, но смысл и invariants
этого контракта менять без отдельного архитектурного решения нельзя.

Role assignment и overrides ссылаются на существующий Better Auth `user.id`; authz tables
являются application-domain tables, а не Better Auth Admin plugin schema.

## Runtime resolution

1. Better Auth session используется для получения authenticated `user.id`.
2. Effective authorization state читается server-side из PostgreSQL.
3. Role/permissions из client input или stale session claims не используются как source of truth.
4. Изменение role grant, user role или user override должно действовать на следующий защищённый
   request без logout/login.
5. Допустим request-scoped resolver/cache только внутри одного request; long-lived permission
   cache без отдельного invalidation contract не допускается.
6. Routes/UI/domain code должны обращаться к единому PermissionResolver/authorization capability,
   а не распределять проверки `role === ...` по приложению.

## Authorization management UI

Пользователь с effective `access.authorization.manage` должен иметь locale-aware protected UI,
который позволяет:

- просматривать роли;
- создавать custom roles;
- менять display name custom role;
- добавлять и убирать permissions любой роли, включая built-in roles;
- удалять custom role, если на неё не назначены пользователи;
- просматривать пользователей, необходимых для assignment;
- назначать пользователю роль;
- для каждого permission пользователя выбирать `inherit`, `allow` или `deny`;
- видеть effective permissions пользователя после role + override resolution.

Скрытие кнопки в UI не является authorization boundary. Каждая mutation повторно проверяет
актуальный server-side permission, runtime validation и same-origin/CSRF boundary.

## Lockout protection

`access.authorization.manage` — recovery-critical permission текущей модели.

После появления первого access manager ни одна management mutation не должна атомарно
оставлять систему с нулём пользователей, имеющих effective `access.authorization.manage`.
Источник permission не важен: это может быть built-in/custom role grant или per-user `allow`.

До external release первый access manager provisioned отдельным server-controlled bootstrap
путём. Для Stage 4 local/CI допускаются test fixtures/direct controlled DB setup. Публичного
unauthenticated endpoint для bootstrap быть не должно. Real external bootstrap/verification
входит в Stage 6.

## Better Auth boundary

Better Auth `1.7.4` остаётся authentication/session provider. Better Auth Admin plugin не
является source of truth для Vico application authorization: его user/session administration
capabilities и code-configured role model не заменяют описанный здесь dynamic RBAC + per-user
overrides.

Не следует добавлять application role в session как authoritative authorization claim. Если
роль/permission показывается в UI, это server-resolved presentation data, а не доверенный
client authorization token.

## Stage 4E2 scope

Stage 4E2 реализует этот authorization foundation, management UI, migration/integration tests,
перевод solved/best-answer authorization на PermissionResolver и core Stage 4 E2E.

Не входят без отдельного решения:

- bans/impersonation;
- delete/edit moderation;
- reports;
- reputation;
- audit-log subsystem;
- multiple-role membership;
- organizations/tenancy;
- произвольное создание новых executable permissions через UI.

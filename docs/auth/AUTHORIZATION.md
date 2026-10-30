# AUTHORIZATION.md

## Назначение

Этот документ — source of truth для application-level authorization Vico Forum.

Better Auth отвечает за authentication/session и authoritative identity пользователя (`user.id`).
Права доступа форума не определяются Better Auth role claim, client input или долгоживущим
session snapshot: effective permissions разрешаются сервером из application PostgreSQL state.

Продуктовый контракт обычной админ-панели, admission/section/action matrix и границы будущих
пакетов находятся в [`../ADMIN_PANEL.md`](../ADMIN_PANEL.md). Он переиспользует эту модель,
не добавляет второй RBAC и сам по себе не регистрирует новые permissions. Текущий catalog
ниже описывает реализованные capabilities; новые права появляются только с их реализацией.

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

Текущий code-backed catalog:

- `forum.topic.create`;
- `forum.reply.create`;
- `forum.post.editOwn`;
- `forum.post.history.read`;
- `forum.topic.pin`;
- `forum.solution.manageOwn`;
- `forum.solution.manageAny`;
- `forum.helpSignal.create`;
- `forum.helpNeedsDetails.manage`;
- `forum.helpDuplicate.manage`;
- `forum.attachmentSecurity.read`;
- `forum.sourceLocale.correctOwn`;
- `forum.sourceLocale.correctAny`;
- `forum.translation.generate`;
- `access.authorization.manage`;
- `forum.complaint.create`;
- `forum.complaint.review`;
- `forum.complaint.reporterIdentity.read`;
- `forum.complaint.appeal.review`.

`forum.post.editOwn` применяется только к сообщениям с authoritative `author_id`, совпадающим с пользователем; `forum.post.history.read` открывает историю ревизий любому сообщению при наличии effective permission и не предоставляет права редактирования. По умолчанию editOwn получают все built-in роли, history.read — moderator/admin; изменяемые grants и overrides остаются authoritative.

При появлении новой защищённой функции код добавляет новый permission key в централизованный
catalog, после чего он становится доступен role/user configuration UI.

`forum.helpSignal.create` разрешает authenticated пользователю только создать persisted moderation signal; сам signal не меняет authoritative Help state. `forum.helpNeedsDetails.manage` разрешает принять/отклонить запрос `Needs details` и при принятии изменить authoritative label. Solution-signals рассматриваются через существующий `forum.solution.manageAny`, duplicate-signals — через `forum.helpDuplicate.manage`.

`forum.attachmentSecurity.read` позволяет независимо читать события подозрительных вложений
в «Требуют внимания → Безопасность → Вложения». Право не наследуется от Help-модерации,
управляется через обычные role grants и per-user overrides и проверяется до чтения событий.

`forum.helpDuplicate.manage` разрешает authoritative управление подтверждёнными duplicate-связями
и рассмотрение апелляций только для Help & solutions. Обычная подача апелляции автором уже
подтверждённого вопроса-дубликата не является этой management-capability: авторство и наличие
активной duplicate-связи повторно проверяются server-side. Общие пользовательские moderation
signals остаются отдельным product workflow.

`forum.solution.manageOwn` всегда применяется вместе с server-side resource condition:
actor должен быть author target topic. `forum.sourceLocale.correctOwn` аналогично разрешает
исправление source-locale metadata только для topic title/post body, чей authoritative author
совпадает с actor; `forum.sourceLocale.correctAny` снимает только это resource ownership
ограничение и не даёт general edit rights. Client-provided `authorId`, role или permission не
являются authorization evidence. `forum.topic.pin` — отдельная capability без ownership-исключения:
авторство темы само по себе не даёт права закреплять или откреплять её; каждый mutation повторно
проверяет effective permission server-side.

Complaint permissions protect the server-only domain capabilities documented in
[`COMPLAINTS.md`](../moderation/COMPLAINTS.md). `forum.complaint.create` permits submission;
`forum.complaint.review` permits Case review/notes/initial decisions;
`forum.complaint.appeal.review` permits appeal Case review/resolution. Reporter/appellant
structured identity requires the additional `forum.complaint.reporterIdentity.read` key,
which is not seeded to any built-in role, including admin. Identity permission alone
never grants Case access. Participant result/first-appeal calls separately recheck actual
content-author/reporter membership and direction. No complaint HTTP/UI is enabled yet.

## Initial role defaults

Это только initial DB seed, а не hard-coded role behavior. Grants перечислены явно; между
ролями нет inheritance.

### `user`

- `forum.post.editOwn`;
- `forum.topic.create`;
- `forum.reply.create`;
- `forum.solution.manageOwn`;
- `forum.helpSignal.create`;
- `forum.sourceLocale.correctOwn`;
- `forum.translation.generate`;
- `forum.complaint.create`.

### `moderator`

- `forum.post.editOwn`;
- `forum.post.history.read`;
- `forum.complaint.create`;
- `forum.complaint.review`;
- `forum.complaint.appeal.review`;
- `forum.topic.create`;
- `forum.reply.create`;
- `forum.topic.pin`;
- `forum.solution.manageOwn`;
- `forum.solution.manageAny`;
- `forum.helpSignal.create`;
- `forum.helpNeedsDetails.manage`;
- `forum.helpDuplicate.manage`;
- `forum.attachmentSecurity.read`;
- `forum.sourceLocale.correctOwn`;
- `forum.sourceLocale.correctAny`;
- `forum.translation.generate`.

### `admin`

- `forum.post.editOwn`;
- `forum.post.history.read`;
- `forum.complaint.create`;
- `forum.complaint.review`;
- `forum.complaint.appeal.review`;
- `forum.topic.create`;
- `forum.reply.create`;
- `forum.topic.pin`;
- `forum.solution.manageOwn`;
- `forum.solution.manageAny`;
- `forum.helpSignal.create`;
- `forum.helpNeedsDetails.manage`;
- `forum.helpDuplicate.manage`;
- `forum.attachmentSecurity.read`;
- `forum.sourceLocale.correctOwn`;
- `forum.sourceLocale.correctAny`;
- `forum.translation.generate`;
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
3. Один полный user authorization resolution — role assignment, role grants, user overrides и
   resulting effective permissions — читается из одного internally consistent database snapshot.
4. Один authorization-management state read — roles, users/assignments, grants, overrides и
   resulting effective permissions — также читается из одного internally consistent database snapshot.
5. Role/permissions из client input или stale session claims не используются как source of truth.
6. Изменение role grant, user role или user override должно действовать на следующий защищённый
   request без logout/login.
7. Допустим request-scoped resolver/cache только внутри одного request; long-lived permission
   cache без отдельного invalidation contract не допускается.
8. Routes/UI/domain code должны обращаться к единому PermissionResolver/authorization capability,
   а не распределять проверки `role === ...` по приложению.

Snapshot-consistency — semantic contract результата, а не предписание конкретного transaction API,
isolation level, lock strategy, query shape или repository implementation. Она не ослабляет
next-request freshness и не разрешает long-lived authoritative permission cache.

## Failure semantics

Результат authorization resolution и отказ authorization infrastructure — разные состояния.

- Успешный resolution с результатом `false` означает обычный permission denial. Protected
  operation должна завершиться как forbidden и не выполнять mutation.
- PostgreSQL/Hyperdrive authorization adapter может преобразовать только явно классифицированные
  availability/connection/query-timeout failures своей dependency в
  typed authorization-unavailable error.
- Protected operation при таком typed unavailable failure должна fail closed и может вернуть
  controlled `503`.
- Optional presentation state на уже публичной странице — например management link,
  create/reply form или solution controls — при таком typed unavailable failure может
  деградировать до скрытых controls, чтобы реальная временная недоступность authorization
  dependency не делала public read path недоступным.
- SQL/schema, programming, configuration, invariant и другие unexpected errors не считаются
  availability failure по умолчанию. Их нельзя интерпретировать как `permission=false`,
  silently скрывать в presentation path или автоматически превращать в controlled `503`;
  они должны проходить в обычный application error handling/observability.

Закрытие request-local PostgreSQL client/pool выполняется best-effort: cleanup failure
не заменяет определённый resolution/mutation result или исходную ошибку. Ошибка самой
операции продолжает классифицироваться по правилам выше.

Optional presentation state не является authorization boundary: protected action независимо
разрешает актуальный effective permission перед mutation. Catch-all suppression произвольных
PermissionResolver errors не входит в authorization contract.

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

Better Auth `1.7.7` остаётся authentication/session provider. Better Auth Admin plugin не
является source of truth для Vico application authorization: его user/session administration
capabilities и code-configured role model не заменяют описанный здесь dynamic RBAC + per-user
overrides.

Не следует добавлять application role в session как authoritative authorization claim. Если
роль/permission показывается в UI, это server-resolved presentation data, а не доверенный
client authorization token.

### Local email and Google linking

Email/password registration does not require email verification. A matching unverified
local email is therefore insufficient evidence for implicit Google linking. Keep Better Auth's
local-email verification gate and same-email/provider-verification checks enabled.
An existing local user signs in with the password first, then explicitly connects Google
from the own profile through Better Auth `linkSocial`. A guest or a different local identity
cannot claim that account merely by supplying its email. External Google acceptance remains Stage 6.

Link initiation sends the displayed profile ID in `x-vico-link-user` as an expectation,
not authority. The `/link-social` before-hook resolves the authoritative session and rejects
a missing/mismatched expectation with `409` before creating OAuth state or linking an account;
guests remain `401`. The endpoint reuses that checked request-local session, and the existing
signed OAuth state retains its target across the provider round trip. A conflict shows the
existing auth failure feedback; the client never retries with a different account automatically.
Provider/email verification and origin checks remain mandatory.

### Session and stale editor failures

Pre-routing session cookies precede cookies from the final endpoint response, so an earlier
expired-session cleanup cannot overwrite a successful login or logout. Session storage
connection/transport/query-timeout failures are classified from the underlying adapter error,
including when Better Auth replaces it with a generic API error. The Worker returns a safe,
no-store `503` before Router dispatch; schema/programming/configuration failures propagate normally.

Mounted editors submit their visible account ID only as a stale-form expectation. If it
differs from the authoritative session, publication/edit returns `409` before writing; the
submitted ID never selects the actor or grants permission. Presence heartbeats likewise detect
a changed account and trigger loader revalidation. Server session and current effective
permissions remain authoritative for every mutation.

## Stage 4E2 scope

Этот раздел фиксирует границы Stage 4E2 foundation. Отдельно утверждённые последующие
ordinary-admin пакеты описаны в [`../ADMIN_PANEL.md`](../ADMIN_PANEL.md); документационный
контракт AP-01 не реализует блокировки или administrative History и не расширяет этот catalog.

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

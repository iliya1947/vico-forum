# PROJECT_STATE.md

Последнее обновление: 2026-11-11

## Назначение

Этот файл фиксирует только **текущее фактическое состояние проекта**, известные актуальные ограничения и ближайший общий маршрут. Подробная история PR, implementation/CI/review checkpoints и завершённых corrections здесь не хранится.

История проекта: [`docs/PROJECT_HISTORY/PROJECT_HISTORY.md`](docs/PROJECT_HISTORY/PROJECT_HISTORY.md).

Постоянные продуктовые и технические контракты находятся в профильных source-of-truth:

- [`PROJECT.md`](PROJECT.md) — продуктовый и технический baseline;
- [`ROADMAP.md`](ROADMAP.md) — последовательность этапов до production;
- [`docs/EDITOR.md`](docs/EDITOR.md) — Editor 2.0;
- [`docs/ADMIN_PANEL.md`](docs/ADMIN_PANEL.md) — обычная админ-панель;
- [`docs/SUPER_ADMIN.md`](docs/SUPER_ADMIN.md) — отдельный exact-Owner-only Super-admin;
- [`docs/SETTINGS.md`](docs/SETTINGS.md) — Settings и управление регистрацией;
- [`docs/moderation/COMPLAINTS.md`](docs/moderation/COMPLAINTS.md) — система жалоб;
- [`docs/auth/AUTHORIZATION.md`](docs/auth/AUTHORIZATION.md) — dynamic authorization;
- [`TRANSLATION_ARCHITECTURE.md`](TRANSLATION_ARCHITECTURE.md) и [`docs/translation/`](docs/translation/) — мультиязычность и переводы;
- [`docs/database/`](docs/database/) — migrations, Hyperdrive и external rollout;
- [`docs/UI_UX_PASS.md`](docs/UI_UX_PASS.md) — UI/UX product pass и acceptance.

Merge в `main` сам по себе не означает production rollout.

## Текущая фаза

Vico Forum находится в pre-release разработке.

- Stage 0–5 завершены в repository/local-CI path.
- Текущий standalone product priority по `ROADMAP.md` — UI/UX product pass.
- Ordinary Admin Panel AP-01–AP-11, owner/authorization redesign Stage 1–2, Settings SET-01–SET-06 и Super-admin SA-01–SA-02 реализованы в repository/local-CI. Следующие SA-пакеты не реализованы. Complaints ведутся отдельно.
- Stage 6 external integration поставлен владельцем на паузу и не продолжается без отдельного указания.
- Публичный production release не выполнен.

## Repository baseline

Текущий baseline `main`:

- React Router `8.3.1` Framework Mode + SSR + TypeScript;
- React `19.3.0`, Vite `8.2.2`;
- Cloudflare Workers;
- Node `24.21.0`, pnpm `12.3.4`;
- PostgreSQL 17 + Drizzle ORM `0.45.2`;
- Better Auth `1.7.7` + PostgreSQL Drizzle adapter;
- generic `/:locale/*`, runtime `LocaleRegistry`, BCP-47, LTR/RTL и request-scoped i18next;
- repository migration history: `0000`–`0063`;
- externally accepted migration evidence: `0000`–`0020`.

## Реализованный продукт

### Forum core

В repository/local-CI path реализованы:

- публичное чтение `категория → раздел → тема → сообщения`;
- Better Auth session boundary и `/api/auth/*`;
- Google OAuth и email/password authentication foundation;
- authenticated создание тем и ответов;
- safe Markdown rendering;
- transactional anti-spam cooldown;
- solved topics и best answer;
- immutable topic-title/post-body revisions с независимым source locale;
- dynamic PostgreSQL-backed roles, permissions и per-user overrides;
- единый server-side `PermissionResolver`, snapshot-consistent authorization reads, fresh protected-request checks и serialized authorization mutations;
- public discovery и participation surfaces, включая Popular, Unanswered, Tags, Search, permanent message links и Reply/Quote;
- public profiles, profile navigation и online presence foundation;
- `/:locale/attention` как отдельный permission-scoped Signals / Complaints / Security workspace.

Email verification, transactional email sender и password recovery намеренно отложены.

### Editor 2.0

Editor 2.0 реализован и merged. Постоянный контракт находится в `docs/EDITOR.md`.

Текущее состояние включает Simple/Advanced authoring, Preview/Split/Fullscreen, source-preserving editing/history, formatting, code, tables, spoilers, clipboard tooling, attachments/images, mentions, published-post editing/history, direction/spellcheck/preferences и связанные publication/recovery boundaries.

Drafts/autosave были отдельно удалены из текущего Editor 2.0 scope решением владельца и остаются возможной будущей функцией.

### Translation

Stage 5 завершён в repository/local-CI path.

Реализованы UI translation generation/runtime и revision-bound user-content translation foundation: persistent translation storage, durable jobs/lifecycle/reconciliation, provider-neutral routing, validation/provenance, source-locale handling, request-budget/allowance boundaries, safe original fallback и presentation текущих переводов.

Детальные invariants находятся в `TRANSLATION_ARCHITECTURE.md` и `docs/translation/*`; `PROJECT_STATE.md` их не дублирует.

Реальные Cloudflare Queues, production provider credentials/calls, authoritative production allowance/anti-abuse values и deployed provider/Queue acceptance остаются Stage 6.

### Ordinary admin panel

По `docs/ADMIN_PANEL.md` реализованы:

- AP-01 — постоянный контракт;
- AP-02 — protected `/:locale/admin` shell/navigation и Overview с реальными aggregate counts;
- AP-03 — authorization-change History и Overview recent actions;
- AP-04 — существующий Roles & permissions UI внутри общего admin shell;
- AP-05 — shared topic Quick actions и forum/Help History producers.
- AP-06 — защищённый Forum index и отдельные страницы категорий и разделов с поиском и реальной статистикой;
- AP-07 — отдельная административная страница темы, ограниченный поиск тем раздела и общие действия над сообщениями (source locale и защищённая история ревизий);
- AP-08 — close/reopen тем: независимое разрешение `forum.topic.close`, persisted closed/version с атомарной History, запрет новых ответов без исключения для ролей, общий public/admin Quick actions и сохранение уже открытого reply editor при закрытии. Matching committed publication receipt сохраняет idempotent replay после closure.
- AP-09 — защищённый Users index/detail с независимым `admin.users.read`, поиском/пагинацией по публичной identity-проекции и точечным authorization snapshot при `access.authorization.manage`; assignment/override forms доступны только server-bound Owner;
- AP-10 — configurable temporary/permanent administrative measures с независимыми restrictions/expiry, exact-measure appeals, authority/issuer-floor hierarchy, request-scoped enforcement обычных и административных действий, приватными own/admin surfaces и атомарной History;
- AP-11 — integration/factual closeout delivered AP-01–AP-10: connected Users authorization/History recovery, Forum closure × administrative-measure admission, protected cache/privacy boundaries и bounded EN/RU/HE responsive browser verification.

AP-01–AP-11 присутствуют в `main` и завершены в repository/local-CI path. AP-11 использует настоящий built Worker + Better Auth + PostgreSQL 17 + Chromium и не добавляет новую domain functionality, schema, permissions или grants. Это не production/deployed acceptance и не owner visual acceptance.

Settings не входит в AP-01–AP-11. SET-01–SET-06 реализованы в `main` в
repository/local-CI: защищённый `/:locale/settings` shell, Owner-only
`/:locale/settings/forum` с переиспользованным Roles & permissions UI и двумя
независимыми флагами регистрации новых Google/email-password аккаунтов.
Политика регистрации применяется сервером при создании пользователя и не отключает
вход или явное связывание существующих аккаунтов. Миграция `0060` добавляет singleton
registration settings и соответствующее событие Admin History. SET-03 добавил
доступную авторизованному пользователю страницу `/:locale/settings/user`:
browser-wide тему, сохранение своего `user.locale` и существующие локальные
настройки Editor/code без серверной синхронизации. SET-04 добавил
`/:locale/settings/administrator` с доступом при текущих Admin/Attention
permissions, локальными per-account/device предпочтениями переходов,
плотности и раскрытия второстепенных технических данных — без нового DB/RBAC.
SET-05 добавил защищённый `/:locale/settings/account` для authenticated пользователей:
сведения о связанных методах входа, смену существующего credential-пароля через
штатный Better Auth с общим лимитом попыток и управление собственными сессиями
без передачи session tokens клиенту. SET-05 не добавил schema/migration/RBAC.
SET-06 добавил защищённый `/:locale/settings/privacy` для authenticated
пользователей: сохраняемый в PostgreSQL account-wide переключатель
«Show me online» (при отсутствии настройки — ON), серверное исключение
скрытых пользователей из публичного списка и счётчика онлайн и запрет
их heartbeat-записей. Миграция `0061` добавила пользовательскую настройку;
локальный Worker/Better Auth/PostgreSQL 17/Chromium acceptance выполнен.
Постоянный контракт — в `docs/SETTINGS.md`.

Два bounded этапа owner/authorization redesign реализованы в `main`. Stage 1 удалил
obsolete last-manager veto и manager-count state миграцией `0059`, сохранив общий
`authz_mutation_lock`, fresh checks и атомарную History. Stage 2 реализовал server-bound
Owner authority для всех code-backed permissions, независимую от сохранённой обычной роли
и overrides; согласовал AP-10 authority, иммунитет Owner к сохранённым административным мерам
и Owner-only выдачу/отзыв повышенного права. Единственный Owner — разработчик:
разработчик входит через Google; внутренний Better Auth `user.id` его
аккаунта фиксируется server-side через `VICO_OWNER_USER_ID`;
email/name/role не создают эту authority. Передача владения, второй Owner,
наследник и first-manager bootstrap не предусмотрены; дополнительная
application-реализация для bootstrap identity не требуется. SET-01 дополнительно
закрепил Owner-only запись для всех шести семейств authorization-management mutations
(роли/grants, assignments, overrides) при сохранении read-only доступа обычных holders
`access.authorization.manage`. Проверки, History, mutex и сохранённые raw данные
не заменены новым RBAC. Детали — в `docs/auth/AUTHORIZATION.md`
и `docs/ADMIN_PANEL.md`. Реальная Google-настройка, binding и deployed acceptance
остаются Stage 6.

### Super-admin SA-01–SA-02

В `main` реализованы bounded **SA-01** и **SA-02** по `docs/SUPER_ADMIN.md`.
SA-01 доставил отдельный `/:locale/super-admin` только для exact server-bound Owner,
два Owner entry point, минимальный Overview, **System Monitoring** (Worker runtime,
PostgreSQL dependency/version и записанные 5xx), смежную History каждого System monitor,
общий source-aware Event log foundation и Stage-6 Infrastructure placeholder.

SA-02 добавил две live Monitoring-области:

- **Accounts & authentication**: `accounts.users`, `accounts.methods`,
  `accounts.sessions`, `accounts.registration`;
- **Security**: `security.auth`, `security.access`, `security.attachments`.

Current state использует реальные PostgreSQL aggregates/settings/evidence и честно показывает
coverage/recording state. Overview получил компактные Accounts/Security summaries. Для каждого
из семи SA-02 monitor доступна adjacent History, а общий Event log проецирует те же исходные
identity из auth facts, monitor observations, registration Admin History, attachment evidence
и coalesced attempt telemetry без создания копий исходных событий.

Миграция `0062` добавила append-only Owner events/observations foundation. Миграция
`0063` добавила `owner_attempt_patterns` и `owner_attempt_telemetry_state`: новые
attributed source-patterns допускаются отдельно для authenticated и anonymous-known-network
пулов максимум по 256 на UTC recording hour; повторы coalesce в существующую группу, а
unknown/overflow/gap состояния сохраняются bounded slots. Старые recording epochs не
удаляются при renewal. Точные auth facts фиксируют только доказанные persisted transitions
`account.created`, `auth.methodLinked`, `auth.passwordChanged`,
`auth.sessionCreated` и `auth.sessionDeleted`; refused/failed attempts остаются
отдельной attempt telemetry.

Exact-Owner admission выполняется до private reads/input parsing; document/data и controlled
error responses остаются private/no-store. SA-02 не добавляет второй RBAC, дублирующий
mutation backend или управление чужими credentials/sessions. Остальные десять Monitoring
областей, unified profile с Admin/Owner sections, деактивация и следующие SA-пакеты ещё
не реализованы. Реальные Google/Owner binding, отдельный Owner Worker/Access/auth/session/DB
boundary, production rollout и deployed acceptance остаются Stage 6; visual polish —
отдельный UI/UX этап.

### Admin/Super-admin outgoing routing foundation

В `main` реализован foundation построения **исходящих административных адресов**:
типизированный `AdministrativeRouting` с независимыми семействами обычного Admin и
exact-Owner-only Super-admin, заменяемым resolver в UI и request-scoped серверным
контекстом. Существующие ссылки, формы и переходы используют соответствующее
семейство; по умолчанию адреса остаются `/:locale/admin/*` и
`/:locale/super-admin/*`.

Это **не** изменение регистрации маршрутов, Worker ingress или проверок
полномочий. Текущая среда использует прежние same-origin адреса и одну
существующую runtime-топологию; раздельный Owner Worker, Access, изоляция
Owner auth/session, database/deploy capabilities и route concealment
**не реализованы**. Foundation проверен в repository/local-CI, но не
означает cross-origin transport, production deployment или Stage-6 acceptance.

### Complaints

По `docs/moderation/COMPLAINTS.md` реализована функциональность Complaints Packages 1–6 в repository/local-CI path:

- domain/evidence foundation;
- пользовательская submission с immutable revision evidence, grouping и rate limits;
- open Queue/triage, configurable automatic priority, manual override и non-exclusive reviewer activity;
- protected full Case review с постраничными reports, notes, retained evidence и context; initial Decision и shared Admin Quick actions.

Package 5 добавляет resolved History и приватную timeline событий, `review-started`, result notifications в общий inbox и member-only result. Package 6 добавляет participant Appeal flow, effective-outcome policy, Appeals review queue и уведомления о результатах Appeal. Подтверждение административных мер требует фактической связи Case→action.

Package 7 добавляет integration/closeout coverage без новых domain capabilities: connected submission→Case→Decision→Appeal→History/inbox, immutable evidence, permission/identity/resource boundaries, pagination и независимость Admin Quick actions. В repository/local-CI path это проверяется на PostgreSQL 17 и через локальный Worker с настоящими Better Auth sessions и HTTP; real R2, browser и production acceptance из этого не следуют.

## CI и migration state

Обычный pull-request CI проверяет repository/local correctness без production rollout:

- accepted migration history и Drizzle metadata;
- lint и typecheck;
- application/unit/route tests;
- production/preview builds;
- clean PostgreSQL 17 migration/integration suite;
- full-schema manifest parity;
- runtime privilege/provisioning boundaries;
- Workers build и local Hyperdrive smoke, включая authenticated Complaints HTTP flow в disposable test database.

Accepted migrations в `main` не переписываются; correction выполняется новой forward migration.

Обычный PR CI не выполняет live production migration/runtime acceptance.

## External / deployed state

Repository/local-CI state существенно опережает deployed environment.

Последний зафиксированный Stage 6 external state:

- production schema-first migration и verification приняты через `0020_translation_generation_permission`;
- dedicated `vico_forum_migrator` и требуемая migration capability проверены;
- отдельная production web role `vico_forum_web` создана, имеет reviewed runtime grants/defaults и usable credential;
- Cloudflare содержит отдельный cache-disabled `vico-forum-web` Hyperdrive, но он остаётся unbound/inactive;
- repository содержит split `HYPERDRIVE` / `WEB_HYPERDRIVE` wiring и protected manual Worker rollout mechanism;
- native Cloudflare Git Builds integration была отключена при последнем зафиксированном recheck;
- production Worker продолжал обслуживаться baseline version `78f87645` со 100% traffic;
- `Previews Base` при последнем recheck не имел production bindings/runtime variables/secrets.

External topology является mutable state и должна перепроверяться непосредственно перед следующим Stage 6 действием.

Не завершены:

- production Worker rollout с web-runtime binding/acceptance;
- real Google OAuth configuration и interactive smoke;
- установка точного server-only `VICO_OWNER_USER_ID` для внутреннего Better Auth аккаунта разработчика после Google sign-in и external acceptance реализованной Owner authority;
- translation Queue/provider/background runtime;
- authoritative production translation allowance/anti-abuse configuration;
- final preview/private-data isolation recheck перед write-capability rollout;
- full deployed product smoke;
- backup/restore acceptance.

## Актуальные незавершённые продуктовые границы

- UI/UX product pass ещё требует финального closeout и обязательной real-runtime product/visual acceptance по `docs/UI_UX_PASS.md`.
- В `main` ordinary Admin Panel AP-01–AP-11, owner/authorization redesign Stage 1–2, Settings SET-01–SET-06 и Super-admin SA-01–SA-02 реализованы в repository/local-CI. Live Monitoring сейчас охватывает System, Accounts & authentication и Security; остальные десять областей и следующие SA-пакеты ещё не доставлены. Реальные Google/Owner binding и production acceptance остаются Stage 6.
- Complaints integration/closeout покрыт repository/local-CI проверками; external/deployed acceptance Complaints не выполнялась.
- Email verification/password recovery остаются отложенными.
- Editor drafts/autosave остаются отложенными.
- Stage 6 external integration остаётся paused.

## Ближайший маршрут

1. Продолжать утверждённую bounded product-разработку; дальнейшие SA-пакеты запускать только по отдельному назначению, без превращения обычных PR в external rollout.
2. Сохранить реализованные Settings SET-01–SET-06 и Owner-only authorization/registration mutation policy; завершение repository/local-CI не считать deployed acceptance. Реальную Google/Owner binding acceptance оставить Stage 6. Complaints продолжать по его профильному контракту/служебному каналу.
3. Довести UI/UX product pass до финальной real-runtime acceptance.
4. Возобновлять Stage 6 external integration только по отдельному указанию владельца и по `docs/database/*`.
5. После завершения pre-release product и external gates перейти к финальному общепроектному refinement и Stage 7 production release по `ROADMAP.md`.

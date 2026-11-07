# PROJECT_STATE.md

Последнее обновление: 2026-11-07

## Назначение

Этот файл фиксирует только **текущее фактическое состояние проекта**, известные актуальные ограничения и ближайший общий маршрут. Подробная история PR, implementation/CI/review checkpoints и завершённых corrections здесь не хранится.

История проекта: [`docs/PROJECT_HISTORY/PROJECT_HISTORY.md`](docs/PROJECT_HISTORY/PROJECT_HISTORY.md).

Постоянные продуктовые и технические контракты находятся в профильных source-of-truth:

- [`PROJECT.md`](PROJECT.md) — продуктовый и технический baseline;
- [`ROADMAP.md`](ROADMAP.md) — последовательность этапов до production;
- [`docs/EDITOR.md`](docs/EDITOR.md) — Editor 2.0;
- [`docs/ADMIN_PANEL.md`](docs/ADMIN_PANEL.md) — обычная админ-панель;
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
- Ordinary Admin Panel AP-01–AP-11 завершена; отдельно продолжаются owner/authorization redesign и Complaints.
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
- repository migration history: `0000`–`0059`;
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
- AP-09 — защищённый Users index/detail с независимым `admin.users.read`, поиском/пагинацией по публичной identity-проекции и переиспользованием существующих authorization assignment/override controls только при отдельном `access.authorization.manage`;
- AP-10 — configurable temporary/permanent administrative measures с независимыми restrictions/expiry, exact-measure appeals, authority/issuer-floor hierarchy, request-scoped enforcement обычных и административных действий, приватными own/admin surfaces и атомарной History;
- AP-11 — integration/factual closeout delivered AP-01–AP-10: connected Users authorization/History recovery, Forum closure × administrative-measure admission, protected cache/privacy boundaries и bounded EN/RU/HE responsive browser verification.

AP-01–AP-11 присутствуют в `main` и завершены в repository/local-CI path. AP-11 использует настоящий built Worker + Better Auth + PostgreSQL 17 + Chromium и не добавляет новую domain functionality, schema, permissions или grants. Это не production/deployed acceptance и не owner visual acceptance.

Settings не входит в завершённый AP-01–AP-11 scope: по решению владельца он перенесён в отдельную будущую фазу после owner/authorization redesign.

Два bounded этапа owner/authorization redesign реализованы в `main`. Stage 1 удалил
obsolete last-manager veto и manager-count state миграцией `0059`, сохранив общий
`authz_mutation_lock`, fresh checks и атомарную History. Stage 2 реализовал server-bound
Owner authority для всех code-backed permissions, независимую от сохранённой обычной роли
и overrides; согласовал AP-10 authority, иммунитет Owner к сохранённым административным мерам
и Owner-only выдачу/отзыв повышенного права. Детали — в `docs/auth/AUTHORIZATION.md`
и `docs/ADMIN_PANEL.md`. Recovery/bootstrap и production acceptance этим не реализованы.

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
- server-controlled bootstrap первого authorization manager;
- translation Queue/provider/background runtime;
- authoritative production translation allowance/anti-abuse configuration;
- final preview/private-data isolation recheck перед write-capability rollout;
- full deployed product smoke;
- backup/restore acceptance.

## Актуальные незавершённые продуктовые границы

- UI/UX product pass ещё требует финального closeout и обязательной real-runtime product/visual acceptance по `docs/UI_UX_PASS.md`.
- В `main` ordinary Admin Panel AP-01–AP-11 и owner/authorization redesign Stage 1–2 реализованы в repository/local-CI scope; recovery/bootstrap и production acceptance ещё не выполнены. Settings остаётся отложен до завершения redesign.
- Complaints integration/closeout покрыт repository/local-CI проверками; external/deployed acceptance Complaints не выполнялась.
- Email verification/password recovery остаются отложенными.
- Editor drafts/autosave остаются отложенными.
- Stage 6 external integration остаётся paused.

## Ближайший маршрут

1. Продолжать утверждённую bounded product-разработку без превращения обычных PR в external rollout.
2. Продолжить оставшуюся owner/authorization redesign работу по recovery/bootstrap boundary; реализованную Stage 2 Owner/administrative hierarchy не планировать заново. После завершения redesign проектировать и реализовывать Settings отдельным package. Complaints продолжать по его профильному контракту/служебному каналу.
3. Довести UI/UX product pass до финальной real-runtime acceptance.
4. Возобновлять Stage 6 external integration только по отдельному указанию владельца и по `docs/database/*`.
5. После завершения pre-release product и external gates перейти к финальному общепроектному refinement и Stage 7 production release по `ROADMAP.md`.

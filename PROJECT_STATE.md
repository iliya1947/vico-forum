# PROJECT_STATE.md

Последнее обновление: 2026-11-02

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
- Параллельно bounded-пакетами развиваются обычная админ-панель и Complaints.
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
- repository migration history: `0000`–`0054`;
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
- единый server-side `PermissionResolver`, snapshot-consistent authorization reads и lockout protection;
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
- AP-06 — защищённый Forum index и отдельные страницы категорий и разделов с поиском и реальной статистикой.

Ещё не реализованы административные страницы тем и действия с сообщениями внутри них, страницы пользователей, topic closure, user blocking и реальные Settings operations.

### Complaints

По `docs/moderation/COMPLAINTS.md` реализованы Packages 1–5 в repository/local-CI path:

- domain/evidence foundation;
- пользовательская submission с immutable revision evidence, grouping и rate limits;
- open Queue/triage, configurable automatic priority, manual override и non-exclusive reviewer activity;
- protected full Case review с постраничными reports, notes, retained evidence и context; initial Decision и shared Admin Quick actions.

Package 5 добавляет resolved History и приватную timeline событий, `review-started`, result notifications в общий inbox и member-only result. Подача и обработка Appeals через UI, Appeal notifications и effective-outcome policy остаются Package 6; подтверждение административных мер требует фактической связи Case→action.

## CI и migration state

Обычный pull-request CI проверяет repository/local correctness без production rollout:

- accepted migration history и Drizzle metadata;
- lint и typecheck;
- application/unit/route tests;
- production/preview builds;
- clean PostgreSQL 17 migration/integration suite;
- full-schema manifest parity;
- runtime privilege/provisioning boundaries;
- Workers build и local Hyperdrive smoke.

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
- Admin Panel имеет реализованные AP-01–06, но последующие object/action packages ещё не завершены.
- Complaints реализованы через Package 5 в repository/local-CI path; Package 6+ остаётся будущей работой.
- Email verification/password recovery остаются отложенными.
- Editor drafts/autosave остаются отложенными.
- Stage 6 external integration остаётся paused.

## Ближайший маршрут

1. Продолжать утверждённую bounded product-разработку без превращения обычных PR в external rollout.
2. Завершить оставшиеся Admin Panel / Complaints product packages по их профильным контрактам и служебным каналам.
3. Довести UI/UX product pass до финальной real-runtime acceptance.
4. Возобновлять Stage 6 external integration только по отдельному указанию владельца и по `docs/database/*`.
5. После завершения pre-release product и external gates перейти к финальному общепроектному refinement и Stage 7 production release по `ROADMAP.md`.

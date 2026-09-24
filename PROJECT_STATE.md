# PROJECT_STATE.md

Последнее обновление: 2026-09-24

## Назначение

Этот файл фиксирует только текущее фактическое состояние репозитория, известные текущие
ограничения и ближайший маршрут разработки.

Постоянные продуктовые и архитектурные решения находятся в соответствующих source-of-truth
документах:

- `PROJECT.md` — продуктовый и технический baseline;
- `PROJECT_HISTORY.md` — значимая история решений, регрессий и последующих corrections;
- `ROADMAP.md` — последовательность этапов;
- `TRANSLATION_ARCHITECTURE.md` и `docs/translation/*` — мультиязычность и переводы;
- `docs/auth/AUTHORIZATION.md` — application authorization;
- `docs/database/*` — migrations, Hyperdrive и external rollout.

История отдельных PR, commit SHA и CI run не дублируется здесь; значимые historical/corrective
цепочки фиксируются в `PROJECT_HISTORY.md`.

## Текущая фаза

Vico Forum находится в ранней pre-release разработке.

- Stage 0–3 foundation завершён.
- Stage 4 forum core завершён в local/CI path.
- Активный продуктовый этап — **Stage 5 translations/background jobs**.
- External production-like integration намеренно отложена до **Stage 6**.
- Обычная feature-разработка идёт через local/disposable PostgreSQL 17 и обязательный CI;
  merge в `main` сам по себе не является external rollout.

## Реализованный foundation

Текущий repository baseline:

- React Router `8.3.1` Framework Mode + SSR + TypeScript на Cloudflare Workers;
- Node `24.21.0`, pnpm `12.3.4`, React `19.3.0`, Vite `8.2.2`;
- PostgreSQL 17 + Drizzle ORM с append-only migration history;
- Better Auth `1.7.4` + PostgreSQL Drizzle adapter;
- generic `/:locale/*`, runtime `LocaleRegistry`, BCP-47 resolution, LTR/RTL и request-scoped
  `i18next`;
- persistent locale registry, persistent UI translation storage и compiled bundle storage;
- текущая migration history — `0000`–`0015`.

## Forum core — Stage 4

Stage 4 реализован и проверяется локально/в CI:

- публичное чтение `категория → раздел → тема → сообщения`;
- Better Auth session boundary и `/api/auth/*`;
- authenticated создание темы и ответа;
- safe CommonMark rendering без raw HTML и внешних images;
- transactional per-author cooldown для topic/reply writes;
- solved topic и best answer;
- immutable topic-title/post-body revisions с независимым `sourceLocale | und`;
- dynamic PostgreSQL-backed authorization с built-in/custom roles, редактируемыми grants и
  per-user `allow | deny | inherit` overrides;
- locale-aware authorization management UI;
- server-side `PermissionResolver`, server-derived solution scope и lockout protection;
- authorization availability отделена от permission denial: только классифицированные
  dependency availability failures используют controlled degradation/`503`, unexpected
  programming/schema/configuration errors не маскируются;
- полные `resolveUser()` и `readManagementState()` собираются из одного стабильного
  PostgreSQL snapshot на composite read, сохраняя next-request freshness и request-scoped cache.

Real Google OAuth credentials/smoke и внешний authorization bootstrap не входят в завершённый
local/CI Stage 4 и остаются Stage 6.

## Translation system — текущее состояние Stage 5

### Stage 5A — реализованная часть

В repository/local-CI path работают:

- `UiTranslationService` для exact-target generation planning;
- provider-neutral `TranslationProviderRouter` и capability boundary;
- `LocaleRulesProvider` и validation provider output, включая structured plural units;
- durable translation tasks в PostgreSQL;
- commit task before enqueue и transport-neutral enqueue boundary;
- task lifecycle `pending → processing → pending/stale/completed/failed`, claim token и lease/reclaim;
- stale/source/policy/locale/manual preflight перед provider call;
- durable monotonic generation ordering и current-generation fencing;
- fresh-plan A-B-A reactivation stale stable identity через новую monotonic generation под существующим generation-head lock; completed identity и старая Queue delivery остаются terminal;
- provider-neutral task executor;
- concrete local/CI Cloudflare Workers AI `@cf/meta/m2m100-1.2b` adapter за provider-neutral boundary для bounded UI plain-text subset: provider-local exact language-code mapping, fixed model id, runtime response validation, typed retry/terminal failure mapping и fake-runner contract tests без real AI binding/live calls;
- typed retryable/terminal translation-execution failure taxonomy и transport-neutral `ack` / `retry` / `terminal` outcome boundary;
- bounded durable attempt budget с PostgreSQL-owned lifecycle time, claim-token-fenced retry/failure transitions и persistent `failed` terminal path как local/CI DLQ equivalent;
- transport-neutral `JOB-06` reconciliation/observability: bounded PostgreSQL recovery batches резервируют aged `pending` и expired `processing` tasks через durable reconciliation progress и `SKIP LOCKED`, безопасно переживают duplicate/concurrent runs и partial enqueue failures; observability показывает status, age, attempt-budget, lease и bounded terminal-failure summaries без source/provider payloads;
- conditional machine publication с provider/model provenance;
- atomic `task completion + raw machine translation + whole namespace bundle` publication;
- persisted exact-locale compiled bundles с deterministic current-deploy identity;
- persistent `ui_translations` / `ui_translation_bundles` schema rejects canonical English
  after trim + case-insensitive comparison; repository-owned production verifier uses the same boundary;
- SSR/runtime чтение verified persisted bundles для canonical non-English locale с raw/local/
  English fallback при miss или классифицированной storage degradation;
- repository/local-CI команда `pnpm db:reconcile-ui-bundles` выполняет locked reverify/delete
  convergence obsolete persisted bundles только для disposable local `*_test` PostgreSQL;
  request path остаётся read-only и не вызывает translation provider, external execution не входит в Stage 5.

Migration `0007`–`0010` содержит durable task lifecycle и generation-ordering foundation; `0012` добавляет bounded retry и persistent terminal-failure state; `0013` добавляет durable reconciliation progress и query-derived indexes. `0014` добавляет revision-bound persistence для topic-title/post-body translations с database-backed revision ownership; `0015` расширяет shared durable task storage отдельным `content-topic-title` kind с database-enforced title-revision ownership.

### Stage 5B — реализованный foundation

В repository/local-CI path реализованы:

- provider-neutral `ContentTranslationService` / `ContentTranslationStore` для topic title и post body;
- отдельные PostgreSQL tables для topic-title и post-body translations с identity
  `contentType + contentId + revisionId + targetLocale`;
- database-backed revision-owner/source-locale foreign keys и cascade lifecycle без eligible orphan rows;
- canonical non-`und` target locale, immutable revision source locale и validated
  `persistent_manual | machine` provenance;
- idempotent exact-identity writes с manual-over-machine trust preservation;
- exact-current-revision reads: miss/stale/invalid/classified storage-unavailable result
  возвращает original exact revision; unexpected storage/programming errors не маскируются;
- provider-neutral source-locale resolution/planning boundary для immutable content revisions:
  известный canonical source locale обходит detection, `und` использует только injected detector
  с runtime validation и отдельной acceptance policy; unresolved/classified unavailable source
  блокирует будущий provider job, а manual correction требует нового revision identity;
- on-demand durable planning для topic-title translation: planner повторно читает current immutable
  title revision из PostgreSQL, проверяет active canonical target, provider-neutral support и
  request-budget policy, не создаёт work для unresolved/same-locale/current translation, создаёт
  revision-bound stable task через shared durable lifecycle и только после commit отправляет
  transport message `{ translationTaskId }`; concurrent duplicate planning дедуплицируется
  одной durable task identity;
- provider-neutral execution/publication foundation для `content-topic-title`: persisted task kind
  определяется до kind-specific claim; content task использует общий PostgreSQL claim/lease,
  attempt budget, retry/terminal state и reconciliation/observability lifecycle; после claim
  повторно проверяются exact current revision/source semantics, generation policy/head, active
  target и отсутствие current translation; provider получает ровно один `domain: content`,
  `plain` request с authoritative original title и resolved source locale;
- machine topic-title result runtime-валидируется и публикуется conditional transaction:
  claim token, current revision, generation/policy и translation trust повторно проверяются;
  existing/manual translation не перезаписывается, а успешная machine write и task completion
  коммитятся атомарно;
- provider data-policy boundary для user content default-deny: machine request различает UI и
  content classification, а topic-title planning и execution используют одну
  `public-forum-topic-title` capability semantics. Существующий Cloudflare Workers AI M2M100
  adapter сохраняет UI behavior и может локально/в CI принять только plain public topic title
  для явно allowlisted canonical locale pair при injected policy; policy не получает source text,
  повторно проверяется при execution, а denied/revoked content не достигает Workers AI runner.
- provider-neutral CNT-04 protected CommonMark foundation для будущего post-body translation:
  source Markdown разбирается в mdast, translatable text получает deterministic AST-position IDs,
  а code, raw HTML, image/link destinations, autolink URLs и embedded technical identifiers
  остаются защищённой структурой/immutable placeholders. Restore принимает только exact bounded
  segment set, проверяет protected-token preservation, вставляет provider values как text nodes,
  deterministic сериализует и повторно проверяет AST structure; нарушение возвращает typed
  `original-fallback` validation error. Результат остаётся input существующего safe
  `ForumMarkdown` renderer, а source revision не изменяется.

### Stage 5 ещё не завершён

Для завершения Stage 5 local/CI path ещё нужны:

- post-body durable planning/execution/publication с подключением реализованного protected
  CommonMark segment/restore boundary к shared provider/job lifecycle;
- operational/distributed rate-limit enforcement, concrete source-locale detector adapter/provider
  selection и user-facing manual correction flow; production content-provider/data-policy approval,
  real binding/credentials/live calls остаются external Stage 6 concerns;
- route/UI integration и product UX для запроса/показа перевода пользовательского контента.

Реальные Cloudflare Queue bindings, provider credentials/calls и deployed provider/Queue smoke —
это отдельная Stage 6 external acceptance и не являются условием обычных Stage 5 feature PR.

## CI и migration state

Обычный pull-request CI сейчас проверяет:

- accepted migration history и repository-local migration/evidence contracts;
- lint;
- typecheck;
- unit/route tests;
- production build;
- Drizzle migration metadata;
- clean PostgreSQL 17 migration/integration suite;
- Workers build и local Hyperdrive smoke.

Обычный PR CI не выполняет live GitHub Actions verification старого external migration evidence.
Live migration→runtime verification относится только к фактическому external schema-dependent
rollout по `docs/database/MIGRATIONS.md`.

## External / deployed state

Repository/local-CI state намеренно может опережать внешний pre-release environment.

Текущее repository-owned migration evidence относится к `0002_ui_translation_storage`; более
новые auth/forum/translation migrations не считаются externally accepted только по факту их
наличия в `main`.

Существующий внешний localization foundation использует read-only Hyperdrive capability для
`locales`, `ui_translations` и `ui_translation_bundles`. Ранее выполненный real Hyperdrive
acceptance остаётся evidence этого localization path, но не является gate для обычных feature PR.

По зафиксированному состоянию проекта native Cloudflare Git integration для active development
`main` отключён. Перед Stage 6 фактическую external configuration необходимо проверить заново.

Текущий production migration workflow временно допускает database-owner connection только для
no-op verification. Перед следующим настоящим external schema rollout необходимо восстановить
и проверить dedicated least-privilege migration capability и убрать owner exception.

До Stage 6 не считаются выполненными:

- применение/acceptance всех pending external migrations;
- real Google OAuth configuration и smoke;
- server-controlled bootstrap первого authorization manager;
- реальные forum/auth/translation write runtime roles и Hyperdrive bindings;
- Cloudflare Queues и реальные translation providers;
- preview/private-data isolation для write capabilities;
- full production-like deployment smoke и backup/restore acceptance.

## Ближайший маршрут

1. Продолжить Stage 5B: source-locale detector adapter/provider selection и operational rate-limit boundary.
2. Реализовать post-body durable planning/execution/publication поверх protected CommonMark boundary,
   затем route/UI integration.
3. После завершения Stage 5 перейти к Stage 6 external integration по `ROADMAP.md` и
   `docs/database/*`.

На текущем этапе external rollout не является блокером для продолжения Stage 5 local/CI работы.

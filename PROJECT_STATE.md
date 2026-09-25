# PROJECT_STATE.md

Последнее обновление: 2026-09-25

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
- текущая migration history — `0000`–`0020`.

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

Migration `0007`–`0010` содержит durable task lifecycle и generation-ordering foundation; `0012` добавляет bounded retry и persistent terminal-failure state; `0013` добавляет durable reconciliation progress и query-derived indexes. `0014` добавляет revision-bound persistence для topic-title/post-body translations с database-backed revision ownership; `0015` расширяет shared durable task storage отдельным `content-topic-title` kind с database-enforced title-revision ownership; `0016` добавляет отдельный `content-post-body` kind с exact post-body revision ownership и тем же shared generation/lifecycle foundation; `0017` добавляет отдельные PostgreSQL fixed-window request-budget counters для user-content translation.

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
- concrete local/CI TinyLD `1.3.4` adapter за CNT-03 boundary для revisions с `sourceLocale=und`:
  detector работает process-local без API/credentials, использует explicit reviewed TinyLD-code →
  canonical Vico language mapping, не выводит region/script, требует минимум 24 Unicode semantic
  letters, native score ≥ 0.80 и top-vs-runner-up margin ≥ 0.20. Для post-body semantic text
  извлекается через единый CNT-04 Markdown/technical-fragment boundary; weak/short/mixed/unmapped
  evidence и Georgian script (модели `ka` в TinyLD 1.3.4 нет) остаются unresolved/original-safe.
  Поле CNT-03 `confidence` переносит detector-native TinyLD score и не трактуется как
  калиброванная вероятность; known revision source locale по-прежнему обходит detector;
- request-budget foundation для user-content translation: server-only Web Crypto HMAC-SHA-256
  pseudonymizer принимает уже классифицированный authenticated/anonymous requester identity,
  domain-separates actor kind и key version и выдаёт только bounded base64url subject key; raw
  user id/IP, session token и HMAC secret не сохраняются. Dedicated PostgreSQL fixed-window store
  использует versioned global/requester scopes, caller-supplied positive cost/window/limits,
  один database-owned transaction timestamp, deterministic global-before-requester admission,
  atomic all-or-nothing consumption, typed denial/reset/retry metadata и bounded indexed cleanup.
  Topic-title и post-body planners принимают уже pseudonymized subject + injected versioned
  cost/window/limits/scopes и выполняют correctness-critical admission в той же PostgreSQL
  transaction, что final current-revision/current-translation recheck и durable task
  upsert/dedup/reactivation. Ineligible/current/completed work остаётся free, eligible
  pending/processing duplicate request повторно учитывается budget, denial/error откатывает
  counters вместе с task mutation, а enqueue остаётся after-commit. Routes пока не подключены;
  anonymous enablement и финальные quota values не выбраны;
- on-demand durable planning для topic-title translation: planner повторно читает current immutable
  title revision из PostgreSQL, проверяет active canonical target и provider-neutral support,
  выполняет atomic request-budget admission вместе с final serialized revision/translation recheck
  и durable task decision, не создаёт work для unresolved/same-locale/current/completed work, создаёт
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
- provider-neutral CNT-04 protected CommonMark foundation для post-body translation:
  source Markdown разбирается в mdast, translatable text получает deterministic AST-position IDs,
  а code, raw HTML, image/link destinations, autolink URLs и embedded technical identifiers
  остаются защищённой структурой/immutable placeholders. Restore принимает только exact bounded
  segment set, проверяет protected-token preservation, вставляет provider values как text nodes,
  deterministic сериализует и повторно проверяет AST structure; нарушение возвращает typed
  `original-fallback` validation error. Результат остаётся input существующего safe
  `ForumMarkdown` renderer, а source revision не изменяется.
- on-demand durable planning для post-body translation: planner повторно читает exact current
  immutable post revision, выполняет source-locale resolution и CNT-04 protection authoritative
  Markdown, проверяет active canonical target, metadata-only provider/data-policy capability,
  current exact-revision translation и выполняет injected request-budget admission атомарно с
  final serialized revision/translation recheck и durable task decision. Stable `content-post-body`
  identity/fingerprint учитывает revision/source semantics, protected representation,
  `protectedContentPolicyVersion`, target и generation policy; PostgreSQL сохраняет только
  revision/source/policy metadata, а transport после commit получает только
  `{ translationTaskId }`. Concurrent duplicate planning сходится к одной durable identity,
  live claim не сбрасывается, completed identity не оживляется, enqueue failure остаётся
  recoverable через JOB-06;
- provider-neutral execution/publication для `content-post-body`: dispatcher определяет persisted
  kind до kind-specific claim, shared PostgreSQL lifecycle сохраняет claim/attempt/retry/terminal
  semantics, а post-body preflight повторно проверяет current revision/source, generation/policies,
  active target и отсутствие trusted current translation. CNT-04 заново строится только из
  authoritative current Markdown и тем же versioned fingerprint связывает execution с durable
  planning. Перед первым provider call применяются injected technical bounds по числу semantic
  segments и их суммарной длине; затем каждый ordered segment отправляется отдельным
  `domain: content`, `public-forum-post-body`, `plain` request с resolved source/target
  locale, причём capability/data-policy boundary повторно проверяется для каждого вызова. Code,
  URL destinations, raw HTML, Markdown structure и protected technical identifiers не передаются
  как provider text;
- post-body result публикуется только после полного успешного segment set: provider/model/
  attribution provenance должен быть единообразным, CNT-04 restore повторно проверяет exact
  segment IDs, protected tokens и Markdown structure, а invalid/unsafe output terminalizes без
  partial translation. Publication transaction сохраняет lock order и повторно проверяет
  generation head, processing task/claim token, current post/revision/source/policies и existing
  translation trust; manual/current translation не перезаписывается, machine translation write и
  task completion коммитятся атомарно. Истёкший, но не reclaimed claim с тем же token может
  завершиться под row lock; реально reclaimed claim с новым token публиковать не может. Transient
  provider/dependency failures используют общий bounded retry lifecycle, stale/current outcomes
  ack-аются без публикации. Existing Cloudflare M2M100 path остаётся default-deny для post-body:
  concrete provider allowlisting/data-policy approval, bindings и live calls не выбраны и не
  входят в этот local/CI foundation;
- provider-neutral pre-claim allowance admission для content translation execution:
  каждый потенциальный provider attempt получает deterministic occurrence identity из durable task,
  current generation и следующего attempt number; PostgreSQL хранит короткую admission lease,
  admitted marker либо durable deferred `retryNotBefore`/bounded reason. Provider allowance
  проверяется до content claim, поэтому denied/unavailable capacity не увеличивает JOB-04
  `attemptCount`, не вызывает provider и не превращается в retry/terminal execution failure.
  Успешный content claim атомарно потребляет admitted occurrence и только тогда начинает execution
  attempt; retry получает новый occurrence, а stale reactivation/new generation инвалидирует старый
  admission. Для post body allowance envelope строится из authoritative CNT-04 semantic segments и
  покрывает весь bounded attempt. JOB-06 не re-enqueue deferred work до reset и не гоняется с live
  admission lease, но восстанавливает ready deferred/expired lease/admitted-unclaimed work; bounded
  observability показывает только aggregate admission/defer counts, age/reset timing и bounded
  reasons. Migration `0019` добавляет nullable content-only allowance lifecycle metadata и recovery
  index. Stage 5 default остаётся fail-closed без authoritative real allowance adapter: local/CI
  contract проверяется injected fake и не утверждает реальное соблюдение 5% provider reserve;
- manual source-locale correction для topic title и post body: code-backed permissions
  `forum.sourceLocale.correctOwn` / `forum.sourceLocale.correctAny` используют dynamic
  authorization и authoritative resource ownership. Correction принимает canonicalizable non-`und`
  BCP-47 source language независимо от UI LocaleRegistry, копирует только authoritative current
  original content в новую immutable revision и меняет только source-locale metadata.
  Expected-revision CAS fencing делает stale/concurrent correction безопасной; предыдущие
  translations/tasks остаются historical revision-bound. Locale-aware topic UI показывает
  correction controls по optional presentation auth, а action повторно проверяет authentication,
  same-origin, current permission и resource ownership server-side. Migration `0018` расширяет
  code-backed permission catalog/check constraint и approved initial built-in grants;
- authenticated one-unit generation planning actions для user-content translation: code-backed permission
  `forum.translation.generate` добавлен в dynamic authorization catalog с initial grants built-in
  `user`, `moderator` и `admin`; role grants и per-user overrides остаются authoritative.
  Existing topic POST boundary поддерживает ровно один current topic title либо один current post body
  текущей темы, требует authenticated session + same-origin + effective permission и выводит target
  только из canonical validated URL locale. Actor pseudonymized server-side через существующий HMAC
  boundary, а planner получает только subject key и injected versioned server-owned request-budget
  policy; production cost/window/limits по-прежнему не выбраны. Route selection использует
  authoritative current topic/page state, а planner сохраняет финальный revision/translation recheck
  и atomic request-budget/task mutation. Automatic-eligible post action заново строит CNT-04 и
  пропускает только semantic body `<= 3000` characters; более длинный body возвращает bounded
  explicit-required no-op до pseudonymization/budget/task mutation. Budget denial возвращает bounded
  `429 Retry-After`, classified authorization/forum/planning availability — controlled `503`,
  normal no-job outcomes original-safe, unexpected errors не маскируются. Action не вызывает
  provider allowance или translation provider synchronously. Migration `0020` добавляет permission
  и initial grants. Default Worker generation capability явно disabled, поэтому local/CI foundation
  не содержит production anti-spam values, HMAC secret, Queue/provider/allowance bindings или live
  calls;
- read-only presentation уже сохранённых current user-content translations на странице темы:
  loader использует authoritative current title/post revisions и canonical validated URL locale,
  выбирает только exact `contentType + contentId + revisionId + targetLocale` records через общую
  validation semantics `ContentTranslationService` и выполняет bounded batch read максимум одним
  title query и одним set-based post-body query. Доступный current translation автоматически и
  независимо показывается для каждой единицы; missing/invalid/classified-unavailable данные
  возвращают exact current original без generation side effects. Topic title и breadcrumb используют
  одну selected presentation, translated post body по-прежнему проходит существующий safe
  `ForumMarkdown` renderer, UI выводит provenance, optional stored attribution и `lang`/`dir`
  metadata, а native `details` control позволяет открыть original без writes/provider calls. Guest
  и authenticated user получают один и тот же persisted public read result.

### Stage 5 — завершённый local/CI path

В repository/local-CI path дополнительно реализована generation-side UX/status integration:

- topic loader для authenticated reader с current effective `forum.translation.generate` читает
  bounded current-generation status одним set-based batch query поверх существующих generation heads,
  task rows и revision metadata; task/provider/claim/budget internals клиенту не сериализуются;
- exact-current persisted translation остаётся authoritative presentation state; classified
  generation-status storage unavailable сохраняет public/original-safe topic read и отключает
  automatic generation hints для этого response, unexpected failures не маскируются;
- eligible original content после hydration автоматически ставится в sequential one-unit generation
  queue с exact `contentType + contentId + revisionId + targetLocale` guard и без повторной отправки
  той же единицы в одном hydration cycle; SSR/GET не выполняет generation POST/provider work;
- post body с CNT-04 semantic length `<= 3000` использует automatic action, более длинный body
  получает отдельный explicit control. Explicit path обходит только automatic length gate и повторно
  проходит те же authenticated permission, authoritative resource/revision/target, pseudonymization,
  request-budget, planner и dispatch boundaries;
- automatic queue подавляет per-item loader revalidation и после завершения выполняет один read-only
  refresh; active `pending | processing | deferred` durable status и client-visible `converging`
  state используют bounded finite polling через loader revalidation, а не повторные generation POST.
  `converging` означает только original-safe cross-read convergence, когда independently read
  presentation ещё original, а durable task уже completed; это не durable task status и backend
  `completed` клиенту не раскрывается;
- UI локализованно и accessibility-visible показывает requesting/pending/processing/converging/
  deferred/failed/unavailable/current/explicit-required feedback. Request-budget `429` может
  показывать только bounded retry timing без раскрытия quota internals;
- regression coverage проверяет batch status semantics, revision/target isolation, original-safe
  degradation, dynamic permission hints без GET side effects, explicit threshold bypass, same-hydration
  dedupe, finite read-only polling и disposable PostgreSQL integration.

Реальные Cloudflare Queue bindings, provider credentials/calls, authoritative production allowance
adapter, production anti-abuse values, provider/data-policy approval и deployed provider/Queue smoke
остаются отдельной Stage 6 external acceptance.

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

1. Провести финальную техническую проверку Stage 5 против актуального `main`, целей Stage и
   обязательных local/CI checks.
2. После подтверждения технической готовности Stage 5 перейти к Stage 6 external integration по
   `ROADMAP.md` и `docs/database/*`.

External rollout не входит в завершённый Stage 5 local/CI implementation path.

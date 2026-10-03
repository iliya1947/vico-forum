# PROJECT_STATE.md

Последнее обновление: 2026-10-03

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
- Stage 5 translations/background jobs завершён в repository/local-CI path.
- Отдельная задача **UI/UX product pass** сейчас является активным продуктовым приоритетом;
  актуальный target-product contract, порядок реализации и обязательная browser acceptance matrix
  зафиксированы в `docs/UI_UX_PASS.md`.
- Первый bounded UI/UX slice уже merged: deterministic representative baseline, client-safe
  presentation boundaries и GitHub Pages visual-progress preview. Текущий correction branch
  дополнительно cache-bust-ит embedded iframe по hash текущего preview bundle, чтобы новый Pages
  deploy не мог оставить iframe на stale HTML со ссылкой на удалённый hashed asset. Это не
  заменяет будущую real-runtime acceptance.
- В текущем UI/UX slice реализованы и repository-CI/Pages-проверены semantic visual tokens,
  Light/Dark с first-use `prefers-color-scheme` и persisted manual choice, two-zone shell/header,
  approved homepage frame и общая локализованная страница `Under development`. Runtime homepage
  использует только существующие forum data для counts/latest topics; отсутствующие pinning и
  online-presence capability не имитируются real data. Это не означает финальную browser/real-runtime
  acceptance всего UI/UX pass.
- Homepage correction slice прошёл owner visual acceptance в GitHub Pages. Приняты текущая
  композиция homepage, icon-led discovery navigation `Unanswered · Tags · Popular` и
  authenticated-only `Unread` без дублирующего `Home`, orange labels/icons и понятный
  trending-up symbol для `Popular`, theme-aware owner-provided Light/Dark logo marks,
  `Vico` orange / `Forum` neutral по теме, compact stats и отдельная full-height orange entry
  rail. После принятого redesign Category/Section homepage rail ведёт напрямую в реальную
  locale-aware category page; временный `forum-discovery` entry удалён из `Under development`. Bounded реализация `Popular` merged через
  PR #168: locale-aware public route показывает три одновременных activity-period колонки
  `24 hours / 7 days / 30 days`, ранжируя темы по числу существующих forum messages внутри
  периода с latest-activity tie-break; targeted repository CI/Pages прошли, owner visual acceptance
  подтверждён 2026-10-02. Следующая bounded discovery-функция `Unanswered` реализован в PR #169:
  forum-wide public route выбирает только unsolved темы с ровно одним persisted post (initial post),
  то есть без единого ответа; список показывает author и category/section context, сортируется по
  новым темам первым и удаляет `Unanswered` из unfinished checklist. Migration/dependency/auth/
  permission/Stage 6 изменений нет; targeted repository CI и GitHub Pages preview проходят,
  owner visual acceptance подтверждён 2026-10-02. Tags реализован и merged через PR #170:
  свободные topic-level technology tags нормализуются и переиспользуются, создаются атомарно
  вместе с темой, доступны через public locale-aware `/:locale/tags` и
  `/:locale/tags/:tagKey`, показываются в section/topic/tag presentation; forward migration
  `0021_forum_tags` добавлена без Stage 6 rollout. Repository CI и GitHub Pages preview прошли,
  owner visual acceptance подтверждён 2026-10-02. По выбору владельца следующая bounded
  product-функция — global Search: текущая implementation-ветка добавляет public
  `/:locale/search?q=...` поверх current topic-title/post revisions и topic tags без новой
  migration/search-index subsystem. Repository CI и GitHub Pages preview прошли; owner visual acceptance подтверждён 2026-10-03. Search merged через PR #171. Message links реализован и merged через PR #172: public permanent post anchors + copy-link UI работают без DB/backend изменений; GitHub Pages preview пройден, owner visual acceptance подтверждён 2026-10-03. Reply/Quote реализован: migration `0022_forum_reply_relationships` добавляет nullable same-topic parent relation для forum posts; обсуждение остаётся линейным, Reply привязывает новый post к конкретному parent, Quote вставляет только выделенный текст как Markdown blockquote, а parent/child сообщения связываются стабильными anchors. Existing permissions/rate-limit semantics не меняются; repository CI и GitHub Pages preview проходят, owner visual acceptance подтверждён 2026-10-03. Дальнейшая косметическая полировка homepage
  сейчас не является приоритетом.
- Текущий Unread/new slice получил repository/database foundation без UI wiring:
  forward migration `0023_forum_topic_read_states` хранит один last-read cursor на пару
  authenticated user + topic и same-topic FK не позволяет ссылаться на post другой темы.
  Repository semantics выводят `new / unread / read`, deterministic first-unread по authoritative
  `createdAt + id` order, forum-wide set-based unread listing и monotonic cursor advancement:
  stale/concurrent marker не может сдвинуть cursor назад, а reply после rendered snapshot остаётся
  unread. Реальный `/:locale/unread` route, section indicators, jump UI и authenticated mark-read
  request wiring относятся к следующему этапу этого же bounded slice. External migration/rollout
  для `0023` не выполнялся.
- Category-page discovery slice в PR #159 прошёл owner visual acceptance в GitHub Pages:
  owner-approved header/logo/discovery nav переиспользованы без backend/DB изменений; category
  heading показывает только derived section/topic/message totals, section rows стали compact
  clickable cards с реальными counts и orange entry rail, добавлены responsive/RTL-safe geometry
  и representative LTR/RTL/empty-category Pages states. Repository CI и Pages для принятой
  реализации проходят. Следующая bounded UI/UX подзадача после merge — Section page.
- Section-page discovery slice в PR #160 прошёл owner visual acceptance в GitHub Pages:
  approved header/logo/discovery nav переиспользованы без backend/DB изменений; heading показывает
  только derived topic/message totals, topic rows стали full-card links с реальными author/message
  данными и orange entry rail, create-topic остаётся существующим section-local write flow с
  компактным in-page entry point, добавлены responsive/RTL/empty-section presentation states.
  Repository CI и Pages для принятой реализации проходят. Следующая bounded UI/UX подзадача после
  merge — Topics/messages/participation.
- Topic-reading/messages slice в PR #161 прошёл owner visual acceptance в GitHub Pages:
  принятый shell/header переиспользован без backend/DB изменений; original question остаётся
  первой, selected best answer визуально переносится сразу после неё без изменения исходного
  message number/permanent anchor, остальные сообщения сохраняют линейный repository order.
  Message cards используют существующие author/content data, safe Markdown/code rendering,
  translation provenance/original disclosure и текущие protected controls; добавлены
  responsive/RTL-safe geometry и solved/unsolved/translated preview states. Repository CI и Pages
  для принятой реализации проходят. Full authoring-form redesign и secondary-control cleanup
  остаются отдельными следующими slices.
- Reply/Create-topic authoring slice в PR #162 прошёл owner visual acceptance в GitHub Pages:
  существующие section/topic write boundaries сохранены без backend/DB изменений, формы получили
  компактную panel hierarchy, локализованную guidance/help copy, explicit required-field
  presentation, touch-friendly actions и responsive/RTL geometry. Non-fetcher React Router
  `Form` submissions используют `useNavigation` pending state: только отправляемая
  create-topic/reply form получает `aria-busy`, disabled fields/action и локализованный pending
  label. Existing server validation, permissions, origin protection и rate-limit semantics не
  менялись; полноценный editor, drafts/autosave и reply/quote relationships остаются будущими
  bounded tasks. Repository CI и Pages для принятой реализации проходят. Следующая bounded
  UI/UX подзадача — secondary translation/source-locale/solution control cleanup.
- Secondary topic-controls slice реализован в PR #163 без backend/DB/permission изменений:
  translation-generation feedback остаётся видимым, но получает compact secondary presentation;
  source-locale correction и solution-management mutations перемещены под native `details`
  progressive disclosure на уровне topic/message, тогда как `Go to solution` остаётся прямым
  reading action. По решению владельца перед visual acceptance этот же review branch дополнен
  полными code-owned manual UI packs для `ru` и `he`: оба содержат значения для всех 170
  текущих canonical `common` keys, используют отдельный fixed reviewed-fingerprint manifest и
  остаются обычными `LocalTranslationSource` overrides без изменения generic LocaleRegistry.
  Pages preview теперь читает те же manual packs вместо отдельного partial Hebrew dictionary.
  Перед owner visual acceptance branch также получил compact header language selector, который
  берёт варианты из active LocaleRegistry и сохраняет текущий route remainder/query/hash при смене
  locale. По owner feedback preview `State` больше не дублирует EN/RU/HE/RTL варианты: он
  выбирает только representative scenario/identity, а язык меняется внутри самого форума и
  сохраняется между сменой preview state/viewport в session storage. Верхняя строка оставляет
  только language/theme controls, а notifications + account identity + auth action вынесены в
  правую часть второй строки рядом с discovery navigation.
  Owner review также выявил desktop truncation forum tagline; current branch снимает искусственный
  max-width/ellipsis на desktop и оставляет wrapping для узких viewport. RTL review дополнительно
  выявил, что brand identity наследовал page direction и визуально превращался в `ForumVico`;
  brand link теперь явно изолирован как LTR, при этом весь остальной Hebrew UI остаётся RTL.
  Existing mutation intents, same-origin/authz/validation и immutable revision semantics сохранены.
  Repository CI и Pages для locale-independent preview State correction проходят. Owner visual
  acceptance PR #163 в GitHub Pages подтверждён 2026-10-01, включая RU/HE локализацию, header
  language selector, LTR brand isolation внутри RTL UI, tagline/header corrections и
  locale-independent preview State.
- Auth presentation slice в PR #164 прошёл owner visual acceptance в GitHub Pages 2026-10-01:
  guest sign-in, signed-in identity/sign-out, pending state и safe failed-auth feedback приведены
  к compact header presentation без изменения Better Auth/session/callback behavior. Pages fixture
  содержит deterministic pending/failed auth states, а существующие Home guest/user states остаются
  representative normal identity states. В Pages auth-клики намеренно блокируются и используются
  только для visual-state review; это не является real OAuth smoke. Backend/DB/permissions/OAuth
  configuration не менялись. Repository CI и Pages для принятой реализации проходят.
- Authorization-management presentation в PR #165 прошёл owner visual acceptance в GitHub Pages
  2026-10-01: существующий protected admin flow переиспользует accepted forum shell/header, роли и
  пользователи организованы в compact management cards, role grants/user assignment/per-user
  overrides/effective permissions сгруппированы без изменения intent/field contracts. Custom-role
  deletion визуально отделён как destructive action; Pages fixture включает custom Reviewer
  role/user и saved/conflict states. Server-side permission checks, same-origin boundary, dynamic
  permission model и lockout safeguards не менялись. Владелец отдельно отметил, что более глубокая
  переработка самой модели/workflow управления ролями и permissions может потребоваться позже; это
  не считается дефектом текущего visual slice и не меняет действующий authorization contract.
  Repository CI и Pages для принятой реализации проходят.
- System/error-state presentation в PR #166 прошёл owner visual acceptance в GitHub Pages
  2026-10-01: route-level `401`, `403`, `404`, controlled `503` и unexpected failures используют
  единый accepted forum shell и safe localized recovery action без показа internal error details.
  Protected authorization route использует общий `ForumRouteError`; existing mutation-level
  `409`/`429` feedback contracts не меняются. Pages fixture содержит locale-independent
  representative states для каждого route failure. Repository CI и Pages для принятой реализации
  проходят.
- Первый responsive/RTL/accessibility hardening slice открыт в PR #167: shared shell получил
  localized keyboard skip link к focusable forum content region, visible `focus-within` treatment
  для language selector, unclipped header focus rings и min/max-width guards для zoom/reflow
  pressure. Preview дополнен `Home · manager` для плотного account/header состояния; существующая
  logical-direction/RTL geometry сохранена. Owner review выявил и подтвердил исправление mobile-only
  homepage defects ниже `30rem`: browser-default section-enter SVG и первоначальный порядок
  secondary content/footer action. Последний owner feedback заменяет прежнюю mobile-card
  композицию более компактной: identity/description остаются видимыми, `Pinned` + `Latest topics`
  + statistics по умолчанию скрыты за circular expand control, а orange section-entry action
  перенесён из full-width footer в компактный inline-end rail рядом с identity. Эта latest
  mobile-card correction реализована в текущей ветке; repository CI и Pages для неё проходят.
  Следующий owner feedback по этой же карточке потребовал сделать section icons явно Vico Orange и
  смягчить слишком тёмный circular expand control; эта correction прошла repository CI/Pages и
  получила owner visual acceptance 2026-10-02. После acceptance владелец попросил тем же способом
  смягчить narrow-mobile discovery pills и orange section-entry rail, но оставить их оттенок немного
  насыщеннее circular expand control; после следующего visual review владелец отклонил этот оттенок
  и дал отдельный reference-orange. После следующего visual review владелец попросил попробовать
  yellow-orange `#ED760E` для narrow-mobile discovery pills, section-entry rail и `Sign in`;
  circular expand control остаётся более светлым. Следующий owner visual review отклонил этот
  вариант как слишком резкий для Light theme и запросил одновременное сравнение трёх более мягких
  оттенков на одном mobile экране: `Sign in` — `#E8873A`, discovery pills — `#E27A32`,
  section-entry rail — `#E9964A`. После comparison владелец выбрал единый muted-orange
  `#D97838` для всех трёх групп: `Sign in`, narrow-mobile discovery pills и section-entry rail;
  circular expand control остаётся без изменений. Следующий owner visual review предпочёл более
  мягкий `#E9964A`; owner visual review принял этот оттенок для Light theme, но выявил, что
  hard-coded mobile color также попал в Dark theme. После отдельного Dark review владелец отклонил
  `#D25E28` как слишком резкий и запросил comparison трёх более мягких оттенков на одном экране.
  Первый comparison также не прошёл visual acceptance; следующий промежуточный comparison использует:
  `Sign in` — `#C56538`, narrow-mobile discovery pills — `#C76032`, section-entry rail —
  `#C35F31`. После comparison владелец выбрал единый Dark оттенок `#C56538` для всех трёх
  групп. Light theme сохраняет принятый `#E9964A`, circular expand control остаётся без изменений.
  Repository CI и Pages для этой latest Dark color correction проходят; owner visual acceptance
  подтверждён 2026-10-02. Предыдущий owner mobile review также выявил
  переполнение discovery navigation; на narrow mobile эти destinations переключаются на centered
  orange pill icon-only controls с enlarged icons и локализованными accessible labels, сохраняя
  text labels на wider layouts.
  Owner visual acceptance этого mobile-nav correction подтверждена 2026-10-02. Следующий owner
  review того же narrow-mobile header потребовал compact theme/locale controls: language показывает
  current primary locale code (`EN/RU/HE` для review locales), theme — moon/sun target icon;
  оба controls перенесены в компактную колонку напротив brand, с theme сверху и locale под ней,
  а search остаётся отдельной строкой. Следующий owner review потребовал поменять порядок lower
  mobile header: account/notification controls должны идти одной compact строкой сразу под brand,
  search — следующей строкой, discovery pills — ниже поиска. Guest auth presentation дополнительно
  сокращена до `Sign in`, а рядом добавлен `Sign up` как approved future registration entry
  point на shared `Under development` page; реальная registration/auth backend semantics не
  меняются. Wider layouts сохраняют текущую presentation. Repository CI и Pages для этого
  lower-header/auth correction проходят; owner visual acceptance narrow-mobile shell и итоговых
  Light/Dark action colors подтверждён 2026-10-02. Во время следующей browser-проверки владелец
  выявил mobile disclosure defect: карточка раскрывалась через `mobileDetailsOpen`, но chevron
  оставался привязан к desktop `expanded` и поэтому продолжал смотреть вниз. Текущая ветка
  привязывает chevron к общему `controlExpanded` и добавляет regression coverage для open/close
  direction. Source/automated keyboard/RTL review при этом подтверждает skip link первым keyboard
  target, visible wrapper focus для language selector, отсутствие новых physical left/right
  assumptions и RTL reversal directional entry arrows. Repository CI и Pages для этой latest
  correction проходят; owner visual re-test disclosure chevron подтверждён 2026-10-02.
  Keyboard browser acceptance для Desktop и Mobile подтверждён владельцем 2026-10-02: skip link,
  Enter-to-content, forward/backward Tab traversal и visible unclipped focus прошли визуальную
  проверку. Владелец также подтвердил текущий visual/RTL state как нормальный 2026-10-02 и попросил
  не блокировать дальнейшую работу дополнительной полировкой этого slice; PR #167 считается
  принятым по owner browser review в рамках Pages-preview, не подменяя будущую full real-runtime
  acceptance matrix.
- Target search, notifications и незавершённые footer/product entry points во время owner-only
  pre-release ведут на общую `Under development` page/checklist вместо fake behavior.
- Для owner-only pre-release незавершённые approved target functions могут оставаться видимыми и
  вести на общую локализованную страницу `Under development` со списком оставшейся работы.
  Публичный запуск не выполняется до завершения и acceptance утверждённого target product.
- Stage 6 pre-release external integration поставлен владельцем на паузу; оставшиеся Stage 6
  infrastructure gates не продолжаются до отдельного указания.
- External production-like integration начинается только в Stage 6; завершение Stage 5 не означает,
  что pending migrations, OAuth, runtime roles/Hyperdrive writes, Queues/providers или deployed smoke
  уже приняты внешне.
- Stage 6 dedicated migration identity подтверждена внешним manual read-only workflow из `main`:
  production Environment secret реально подключается как exact `vico_forum_migrator`.
- Production migration workflow больше не допускает database-owner connection: verifier требует
  dedicated migration connection, совпадающую с application owner.
- Production migration boundary разделяет verifier на две fail-closed фазы: pre-migration принимает
  только exact checked-in migration ledger prefix по паре `created_at + Drizzle SHA-256 hash`,
  а post-migration требует exact complete timestamp+hash ledger и repository-owned full structural
  manifest `0000`–`0020` со schema/ownership/ACL invariants.
- Stage 6 schema-first migration выполнена: production target прошёл metadata/preflight,
  pending `0004`–`0020` применены, а postflight подтвердил complete `0000`–`0020`
  ledger, full structural manifest и production privilege contract.
- Repository-owned migration→runtime evidence теперь подтверждает accepted migration through
  `0020_translation_generation_permission`. Это закрывает schema-first evidence gate, но не
  означает, что schema-dependent Worker/runtime уже развёрнут.
- Repository privilege boundary по-прежнему требует direct non-grantable `CREATE` на текущую
  database именно для application owner/migrator и запрещает database `CREATE` для localization
  runtime и `PUBLIC`; bounded identity/capability gate подтверждён external execution.
- Stage 6 runtime contract разделяет existing `localization-read` и отдельную `web`
  capability. Production sequence уже создала `vico_forum_web`, установила protected
  `WEB_RUNTIME_DATABASE_ROLE`, выдала exact reviewed relation grants и приняла database-role
  defaults `lock_timeout=2s` / `statement_timeout=5s`. После нескольких consumed
  bootstrap/recovery попыток рабочий standalone `ALTER ROLE ... PASSWORD ...` precedent был
  повторён под owner: usable web credential установлен без изменения grants/defaults, а Cloudflare
  успешно создал отдельный unbound direct-origin `vico-forum-web` Hyperdrive с disabled query
  caching. Split `HYPERDRIVE` / `WEB_HYPERDRIVE` wiring уже merged в `main`, но production
  Worker всё ещё остаётся на старом baseline deployment и новый web binding/runtime ещё не принят
  внешне. Content generation runtime остаётся disabled/fail-closed и не получает
  task/provider/background DB capability.
- Обычная feature-разработка и её CI остаются отделены от external rollout; merge в `main` сам по
  себе не является deployment/acceptance evidence.

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
  counters вместе с task mutation, а enqueue остаётся after-commit. Authenticated generation routes
  подключены через существующий topic POST boundary; anonymous enablement и финальные quota values
  не выбраны;
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
- production full-schema manifest parity против clean PostgreSQL 17;
- named `localization-read` / `web` runtime privilege contract и disposable PostgreSQL 17
  positive/negative grant probes, включая row-lock и forbidden cross-domain/DDL checks;
- split-authority web relation-provisioning contract: exact grants derive-ятся из shared web
  capability, а disposable PostgreSQL 17 проверяет successful migrator-owner phase и rollback
  при forbidden prerequisite drift;
- Workers build и local Hyperdrive smoke.

Обычный PR CI не выполняет live GitHub Actions verification старого external migration evidence.
Live migration→runtime verification относится только к фактическому external schema-dependent
rollout по `docs/database/MIGRATIONS.md`.

## External / deployed state

Repository/local-CI state намеренно может опережать внешний pre-release environment.

Текущее repository-owned migration evidence относится к
`0020_translation_generation_permission` и подтверждает successful target migration +
postflight verification полного `0000`–`0020` schema contract. Это evidence schema-first
границы; schema-dependent runtime rollout ещё не выполнен.

Существующий внешний localization foundation использует read-only Hyperdrive capability для
`locales`, `ui_translations` и `ui_translation_bundles`. Ранее выполненный real Hyperdrive
acceptance остаётся evidence этого localization path, но не является gate для обычных feature PR.

Repository содержит reviewed exact ACL/verifier contract для отдельной web runtime
capability (Better Auth + forum + dynamic authorization + persisted forum-content reads) и
защищённый split-authority execution path. Production evidence подтверждает созданную
`vico_forum_web` role, protected `WEB_RUNTIME_DATABASE_ROLE=vico_forum_web`, exact 50/50
non-grantable relation privilege pairs, successful read-only runtime privilege verifier,
database-role defaults `lock_timeout=2s` / `statement_timeout=5s` и usable credential.
Cloudflare отдельно содержит unbound direct-origin cache-disabled Hyperdrive `vico-forum-web`.
Production Worker binding/routing и deployed web-runtime acceptance ещё не выполнены.

Fresh Stage 6 pre-deploy recheck подтвердил: native Git Builds integration остаётся отключённой;
Production продолжает обслуживаться baseline version `78f87645` со 100% traffic; owner подтвердил
неизменный пустой `Previews Base` без bindings/runtime variables/secrets; production workers.dev
URL — `https://vico-forum.iliya1947a.workers.dev`. Existing `vico-forum-web` Hyperdrive
по-прежнему unbound/inactive и cache-disabled. Topology gate закрыт без deployment mutation.

Dedicated least-privilege migration credential для production подтверждён external execution как
`vico_forum_migrator`, production migration workflow не содержит database-owner exception, а
required direct non-grantable database `CREATE` capability подтверждена manual read-only
identity/capability workflow. Последующий authorized schema-first migration успешно применил
`0004`–`0020`; production postflight подтвердил complete ledger, full structural manifest и
privilege contract. Repository-owned evidence теперь покрывает `0020`, но Worker deployment,
runtime roles/Hyperdrive writes и другие schema-dependent runtime capabilities ещё не выкатывались.

До завершения Stage 6 ещё не выполнены:

- real Google OAuth configuration и smoke;
- server-controlled bootstrap первого authorization manager;
- production Worker rollout merged split-binding revision + deployed web-runtime acceptance для
  уже существующих usable credential и cache-disabled `vico-forum-web`;
- отдельные translation background/maintenance runtime capabilities;
- Cloudflare Queues и реальные translation providers;
- final preview/private-data isolation recheck для write-capability rollout;
- full production-like deployment smoke и backup/restore acceptance.

## Ближайший маршрут

Текущий активный маршрут — standalone UI/UX product pass по утверждённому target-product contract:

1. Reproducible visual baseline + GitHub Pages progress preview завершён и merged.
2. Foundations/homepage correction slice прошёл owner visual acceptance в GitHub Pages.
   Дальнейшая косметическая полировка homepage сейчас не является приоритетом.
3. `Popular` merged через PR #168 после green repository CI/Pages и owner visual
   acceptance 2026-10-02.
4. `Unanswered` реализован и merged через PR #169: реальный locale-aware public route использует
   существующие topic/post данные и семантику `isSolved = false` + ровно один persisted post;
   owner visual acceptance подтверждён 2026-10-02.
5. `Tags` реализован и merged через PR #170: free-form topic tags, canonical
   normalization/reuse, migration `0021_forum_tags`, public tag index/filter routes, topic creation
   и presentation integration; owner visual acceptance подтверждён 2026-10-02.
6. По выбору владельца следующая bounded product subtask — global Search. Текущая
   implementation-ветка использует existing current topic-title/post revisions и tags, без новой
   migration или отдельного search-index subsystem. Repository CI и GitHub Pages preview проходят;
   owner visual acceptance подтверждён 2026-10-03.
7. Presentation slices через PR #167 уже прошли owner review/merge в пределах Pages-preview.
   Heavy approved subsystems, которые всё ещё перечислены в `Under development`, остаются
   отдельными bounded tasks.
8. Уже существующие product capabilities подключаются к реальным данным/поведению; незавершённые
   approved entry points не имитируют работу и временно ведут на `Under development`.
9. После каждого implementation slice выполнять targeted automated checks и browser review.
10. Завершить UI/UX pass только после полного CI и обязательной real-runtime visual/product
   acceptance из `docs/UI_UX_PASS.md`; GitHub Pages не заменяет эту проверку.
11. Owner mobile review 2026-10-03 унифицировал compact destination cards на Category/Section/Tags/Search: entry action остаётся отдельной vertical orange rail справа по всей высоте карточки; нижний orange footer для этих карточек не используется.
12. Message links реализован и merged через PR #172: permanent message anchor + public Copy link + localized success/failure feedback; owner visual acceptance подтверждён 2026-10-03.
13. Reply/Quote реализован: migration `0022_forum_reply_relationships` добавляет nullable same-topic direct-parent relation; discussion остаётся линейным, Reply таргетирует concrete parent, child показывает parent anchor, parent — direct-reply anchors, Quote вставляет только реально выделенный текст как Markdown blockquote. Existing permissions/rate-limit semantics сохраняются; repository CI и GitHub Pages preview проходят, owner visual acceptance подтверждён 2026-10-03.
14. Stage 6 infrastructure gates остаются на паузе до отдельного указания владельца.

Ранее подготовленный защищённый manual rollout mechanism остаётся в repository. При явном
возобновлении Stage 6 актуальная последовательность остаётся следующей:

1. `.github/workflows/production-worker-rollout.yml` — manual main-only workflow через отдельный
   protected Environment `production-worker`, exact authorized SHA и explicit upload/promotion
   confirmations.
2. До Cloudflare access workflow повторно проверяет accepted live migration→runtime evidence для
   `0020`, disposable PostgreSQL contract, exact build и local split-Hyperdrive Workers smoke.
3. Exact pinned Wrangler `4.130.0` сначала создаёт новую Worker version через
   `versions upload` без traffic promotion. Runtime auth values поступают только из protected
   Environment; secrets используются из runner temp и не сохраняются как artifacts.
4. Uploaded version должна пройти GET-only public/auth/database-read smoke через Version URL.
   Promotion допускается только для version из того же authorized run и только при отдельном
   confirmation input.
5. После promotion выполняется production smoke. При automated failure workflow возвращает 100%
   traffic на accepted baseline version prefix `78f87645` и проверяет rollback state.
6. Interactive Google sign-in/session/logout остаётся owner post-deploy smoke и не автоматизируется
   через CI.
7. Подготовительный PR не создаёт `production-worker` Environment, Cloudflare API token,
   Google OAuth client/auth secrets, Worker version/deployment и не меняет traffic. Всё это требует
   отдельного explicit authorization после merge и review.

Stage 5 завершён только в repository/local-CI boundary. Real Google OAuth/bootstrap, remaining
production runtime rollout, Cloudflare Queues/providers, authoritative production
allowance/anti-abuse values, final preview isolation, deployed smoke и backup/restore остаются
Stage 6 работой и не входят в UI/UX product pass.

# Block E — Public forum / application security audit

## Статус

1. Это bounded audit plan для области 5 общей security-карты.
2. Audit target на момент подготовки: current `main` `f6fd4b2c031b2132b04eace18704a59aed1dfec8`.
3. Фактический аудит начат. **E2 PASS. E5: `FORUM-PUB-01 Moderate/P2`. E6: 0 additional findings; `FORUM-PUB-01` подтверждён для edit body. E7: `READSTATE-CACHE-01 Low/P3`. E3: `PUBLIC-PROJECTION-01 Low/P3`. E4: `DISCOVERY-BOUNDS-01 Low/P3`, `SEARCH-CONTROL-01 Low/P3`. E8: PASS — 0 additional findings. E1: `LOCALE-DEGRADED-WRITE-01 Low/P3`; `READSTATE-CACHE-01` scope expanded to shared `/:locale` member/session cache boundary. E9: PASS — 0 additional findings.** Remediation по Block E не назначена.
4. Проверка ведётся по реальным public/member route → service/repository paths, а не по одному UI.

## Граница блока

Block E проверяет обычный форум и member-facing application surfaces:

1. public locale/routing и cache boundary;
2. Markdown/content rendering;
3. public category/section/topic/profile reads;
4. Search/Popular/Unanswered/Tags и authenticated Unread;
5. создание topic/reply и participant publication lifecycle;
6. published-post edit lifecycle и Own solution behavior;
7. notifications/mentions/read-state;
8. profile/online-presence privacy effect;
9. application-level user-content translation presentation/generation admission;
10. cross-cutting input/failure/cache/replay boundaries этих surfaces.

Не переаудируются без нового противоречащего evidence:

1. authentication/session/linking — Block B;
2. generic authorization engine/Owner/permission resolution — Block C;
3. ordinary Admin, Complaints, Help Signals/reviewer flows и Any/admin Quick actions — Block D;
4. upload/download bytes, object storage, attachment admission/type/security — будущий Files & attachments block;
5. DB roles/migrations, Cloudflare runtime, secrets/supply-chain и provider/Queue internals — их отдельные security areas;
6. broad deployed DoS/traffic engineering — Abuse & availability block.
7. Settings Account & security mutation — Block B. Privacy-setting mutation не переаудируется здесь; E проверяет, что её persisted `showOnline` effect реально соблюдается public presence surfaces.

## Source-of-truth / реальные entrypoints

Перед планом сверены current `PROJECT.md`, `PROJECT_STATE.md`, `docs/EDITOR.md`,
`docs/auth/AUTHORIZATION.md`, `TRANSLATION_ARCHITECTURE.md`,
`docs/translation/LOCALES.md`, `CONTENT_TRANSLATION.md`,
`PROVIDERS_AND_JOBS.md` и current `app/routes.ts`.

Основные runtime entrypoints для аудита:

1. `/:locale/`, categories, sections, topics, profiles;
2. `/:locale/search`, `popular`, `unanswered`, `unread`, tags;
3. canonical topic action и `/posts/:postId/edit`;
4. `/:locale/notifications`, `mentions`, `presence`;
5. locale boundary/negotiation;
6. `ForumMarkdown`, content-translation presentation и forum repository/services.

## E1 — Locale routing / canonicalization / cache isolation

Проверить:

1. Unknown/malformed/inactive explicit locale для GET/HEAD даёт только внутренний bounded fallback/canonical redirect и не использует user/cookie/header negotiation.
2. Non-GET/HEAD locale, требующий redirect, fail closed до matched action и не переносит mutation body через 307/308.
3. Reserved technical segments, aliases/case variants и canonical BCP-47 identity не создают route confusion.
4. Client navigation через `/:locale` проходит server locale boundary, а не доверяет stale client state.
5. Root negotiation и locale-dependent responses имеют корректный no-store/Vary/cache contract.
6. Locale/registry degraded mode не раскрывает stale non-English data и не позволяет write.

### E1 — результат аудита

1. Audit target: current `main` `f6fd4b2c031b2132b04eace18704a59aed1dfec8`.
2. Verdict: **1 new current-scope finding — `LOCALE-DEGRADED-WRITE-01 Low/P3`; existing `READSTATE-CACHE-01 Low/P3` expanded to the shared `/:locale` member/session cache boundary.**
3. Explicit locale resolution — PASS: active canonical locale resolves directly; active case/alias/formatting-extension inputs canonicalize through internal `308`; malformed/unknown/inactive/disabled GET/HEAD use internal temporary `/en/...` `307`. Query string is preserved, destination is constructed from the current path and registry locale only; cookie/user/`Accept-Language` are not consulted for explicit locale fallback.
4. Non-GET redirect prevention — PASS outside the degraded-English finding below: `resolveExplicitLocale()` returns not-found for any non-GET/HEAD candidate that would require canonical/fallback redirect, and locale server middleware runs `guardLocale()` before `next()`. Existing regression confirms redirect-required POST does not reach downstream action.
5. Root negotiation — PASS: unprefixed `/` is GET/HEAD-only, priority = authenticated `user.locale` → locale cookie → `Accept-Language` → bootstrap English; invalid/inactive candidates are skipped, q=0 is ignored, wildcard does not choose an arbitrary locale. Redirect is same-origin/internal and explicitly `Cache-Control: no-store`.
6. Registry identity/reserved routes — PASS: canonical BCP-47 parsing uses `Intl`; registry rejects bootstrap/reserved exact identities and canonicalized aliases/matchTags for `api` / `assets`; technical `/api/*` routes are registered outside `/:locale`. No path from locale input to external redirect or dynamic locale creation was found.
7. Client navigation boundary — PASS: `/:locale` exports a server loader. Exact upstream `react-router@8.3.1` tag commit `da2a0f0948af60ba45d9590b427d5e58fe4b0109` shows SSR navigations use Single Fetch server-loader strategy, and router core marks a reused route for revalidation when its matched pathname/param instance changes. Therefore `/en/... → /he/...` cannot switch locale solely from stale client state.
8. Request-scoped registry — PASS: Worker creates a fresh registry loader per request; `createRequestRegistryLoader()` memoizes only one Promise inside that request. Classified unavailable/schema/integrity failures return bootstrap-English registry instead of any prior cross-request non-English snapshot.
9. Degraded reads — PASS: non-English GET/HEAD in degraded registry redirects temporarily to `/en/...` with `no-store`; active locale list becomes bootstrap English only. UI translation store does not read persistent DB state for `en`, and persistent non-English translation read failures degrade to local/canonical fallback rather than stale process state.
10. Canonical English formatting-extension/case redirects in degraded mode remain bounded to code-owned bootstrap `en`; no stale non-English publication identity is reconstructed.
11. Tests were read, not executed in this audit. No production/deployed cache behavior is claimed.

### LOCALE-DEGRADED-WRITE-01 — Low/P3

1. Source-of-truth requires: **writes in degraded LocaleRegistry state fail closed**.
2. Current `guardLocale()` special degraded branch runs only when `candidateIdentity !== loaded.registry.bootstrap.tag`.
3. Therefore a request such as authenticated same-origin `POST /en/sections/:sectionId` while registry health is `degraded` first resolves canonical bootstrap English normally, skips the degraded-write rejection, sets `localeContext`, and reaches the matched action.
4. Ordinary forum write actions do not independently check registry health. Their mutation guard checks session/origin and then can write through the separate forum/web database. Localization registry storage and forum storage are separate runtime dependencies, so localization DB degradation does not imply the forum writer is unavailable.
5. The same locale middleware is shared by localized application actions beyond one forum route; the finding is on the locale fail-closed boundary itself, not on one specific mutation implementation.
6. Impact: during a classified registry unavailable/schema/integrity state, authorized canonical-English mutations may still commit despite the explicit degraded-mode contract. No authentication/authorization bypass or cross-user write was found.
7. Severity — **Low/P3**: this is a real current fail-open integrity/availability boundary, but exploitation requires the registry already being degraded and normal mutation permissions still apply.
8. Remediation is not assigned during audit.

## E2 — Markdown / rendering / XSS / unsafe navigation

Проверить public `ForumMarkdown`, Preview и translated-content rendering:

1. raw HTML/script/event handlers не становятся executable DOM;
2. links/images не принимают `javascript:`, dangerous `data:`, control/Unicode-obfuscated scheme или unsafe target behavior;
3. custom spoiler/table/direction syntax не создаёт attribute/DOM injection;
4. fenced/inline code, Diff, file labels и quote metadata остаются inert text;
5. malformed Markdown/HTML и deeply nested structures не обходят safe renderer;
6. translated Markdown проходит тот же safe renderer и не получает privileged HTML path;
7. renderer/semantic parser disagreement не превращает mention/link/technical fragment в executable content.

### E2 — результат аудита

1. Audit target: current `main` `f6fd4b2c031b2132b04eace18704a59aed1dfec8`.
2. Verdict: **PASS — 0 current-scope security findings**.
3. Public/Preview renderer использует `react-markdown@10.1.0` без `rehype-raw`, `allowDangerousHtml` или другого raw-HTML activation path. Exact upstream source превращает raw HTML nodes в text и применяет `urlTransform` до React rendering. В Vico единственный production `dangerouslySetInnerHTML` относится к compile-time `THEME_BOOTSTRAP_SCRIPT` и не получает пользовательский контент.
4. Обычные Markdown URL проходят через upstream `defaultUrlTransform`; протоколы вне его allowlist дают пустой URL. Единственное Vico-исключение — exact image source `vico-attachment:<UUID>`; он не используется как DOM URL напрямую, а разрешается только через текущий attachment context и только для raster-типа. Произвольные remote Markdown images не отображаются. Пользовательские ссылки открываются с `target="_blank"` и `rel="nofollow noopener noreferrer ugc"`.
5. Custom syntax не создаёт generic user-controlled DOM properties: spoiler title — React text, spoiler body — тот же renderer, table cells — тот же renderer, direction принимает только exact `ltr|rtl`, table alignment — только фиксированный enum. Code/Diff/language/filename и quote metadata выводятся через React text/props, не raw HTML.
6. Editor Preview использует тот же `ForumMarkdown`. Simple visual editor не превращает authored link target в активный `<a>`; HTML paste проходит bounded allowlist conversion DOM → Markdown, а небезопасная/неподдерживаемая структура не вставляется как raw DOM.
7. Translated Markdown не имеет privileged render path: provider values возвращаются в Markdown AST как text nodes, protected tokens и structure signature проверяются, после чего результат отображается через `ForumMarkdown`. Имеющийся regression test подтверждает, что provider input вида Markdown-link с `javascript:` плюс `<script>` остаётся literal text, а попытка изменить block structure отклоняется.
8. Semantic consumers не создают executable sink: mention extraction принимает только exact internal profile path и исключает quote/code/html/image nodes. Даже если semantic tree сохраняет небезопасную authored URL как данные, публичный renderer отдельно применяет URL safety boundary.
9. Malformed/deep Markdown не обнаружил альтернативного пути к executable DOM. Availability, body-size и complexity/resource-exhaustion bounds здесь не закрывались: они относятся к E10 / Abuse & availability и не классифицируются как E2 finding без renderer-bypass evidence.
10. Remediation для E2 не требуется.

## E3 — Public object reads / projection / IDOR

Проверить category → section → topic → post/profile reads:

1. arbitrary IDs не позволяют cross-object substitution или private projection;
2. public DTO содержит только current public revisions и предназначенные public fields;
3. revision history, moderation state, private complaint/signal data, session/email/internal operation metadata не сериализуются;
4. reserved Help service section не становится public hierarchy route;
5. missing/deleted/stale objects не возвращают данные предыдущего target/request;
6. translation lookup строго связан с exact content/revision/locale и не подставляет чужой объект.

### E3 — результат аудита

1. Audit target: current `main` `f6fd4b2c031b2132b04eace18704a59aed1dfec8`.
2. Verdict: **1 current-scope finding — `PUBLIC-PROJECTION-01 Low/P3`**.
3. Generic hierarchy — PASS: homepage/category readers исключают reserved Help service section; `readSection(HELP_SOLUTIONS_SERVICE_SECTION_ID)` возвращает `undefined`, поэтому прямой обычный section route не открывает внутренний service section. Help topic breadcrumb отдельно ведёт обратно в public Help category.
4. Cross-object/current revision — PASS: section topics связывают exact topic with its current title revision; topic page связывает exact topic/post IDs with their current revisions и выбирает posts только по текущему topic. Missing category/section/topic/profile превращается в not-found вместо reuse данных предыдущего target.
5. Public profile projection — PASS: repository выбирает только public identity/profile/role/statistics fields, а route повторно проектирует конкретный allowlist. Existing route regression подмешивает fake `email` и `permissions` в reader result и подтверждает, что они не попадают в loader result.
6. Translation lookup — PASS: topic loader формирует identity из current topic/post revision IDs; batch reader фильтрует exact `contentType + contentId + revisionId + targetLocale`. Existing DB regression подтверждает, что translation старой revision не выдаётся для новой current revision и fallback остаётся current original.
7. Published attachment projection не переаудируется как Files/security storage block: E3 проверил только, что topic DTO получает attachments через persisted post-membership; bytes/object storage admission остаются отдельным block.
8. Единственный найденный дефект — moderator-only Help state пересекает public loader boundary, хотя presentation затем скрывает его условным рендерингом.

### PUBLIC-PROJECTION-01 — Low/P3

1. Source-of-truth требует: `Needs review` виден только relevant moderation actors; pending duplicate `Disputed` badge также moderator-only, при этом автор duplicate может видеть собственную pending appeal state/reason.
2. `readHelpSolutionsPage()` и related Help list readers возвращают `solutionModerationStatus` и `duplicateDisputed` для каждой question независимо от viewer authority. Public category loader копирует question objects в returned loader data без удаления этих полей; только React presentation проверяет `canViewSolutionModeration` / `canViewDuplicateDispute`.
3. `readTopicPage()` аналогично возвращает `duplicateDisputed` и per-post `solutionModerationStatus` для общего public topic DTO. Topic loader скрывает `duplicateRelationshipId` от non-manager, но не удаляет `duplicateDisputed` и не sanitizes `needs-review` status для guest/non-moderator.
4. Existing regressions проверяют визуальное скрытие: guest не видит `Needs review` / `Disputed` в DOM и private appeal explanation не читается. Но fixture/raw guest loader data всё ещё содержит эти moderation-only flags — UI hiding не является projection boundary.
5. Impact: публичный reader может определить, что конкретное Help solution находится в internal `needs-review` moderation state и что duplicate relationship имеет pending private dispute. Appeal explanation, appellant identity и relationship ID гостю не раскрываются по проверенному path.
6. Severity — **Low/P3**: это ограниченная утечка moderation workflow metadata без authority bypass или private appeal text, но она прямо противоречит current public-projection/privacy contract и поэтому не откладывается как Stage-6 hardening.
7. Public `outdated` solution status/reason не включён в finding: current source-of-truth явно делает `Solution outdated` public. `Needs review` и pending `Disputed` имеют другую visibility policy.
8. Remediation в рамках audit stage не назначена.

## E4 — Discovery / Search / Tags / pagination

Проверить Search, Popular, Unanswered, Tags и связанные browse queries:

1. query/cursor/page/tag input bounded и не приводит к SQL/raw-pattern injection;
2. wildcard/escape/Unicode/control input имеет literal/defined semantics;
3. private/reserved/internal content не попадает в discovery через альтернативный query path;
4. pagination/keyset не пропускает membership/projection boundary и не даёт unbounded response;
5. malformed/oversized queries fail controlled до дорогой работы;
6. public discovery responses не получают private member cache state.

### E4 — результат аудита

1. Audit target: current `main` `f6fd4b2c031b2132b04eace18704a59aed1dfec8`.
2. Verdict: **2 current-scope findings — `DISCOVERY-BOUNDS-01 Low/P3` и `SEARCH-CONTROL-01 Low/P3`**.
3. Search ordinary bounds — PASS кроме control-input finding ниже: route normalizes NFKC/whitespace, не выполняет DB search при normalized query >200 chars, repository повторно ограничивает query до 200 и limit до 1..100 (default 50).
4. Search pattern/injection boundary — PASS: `escapeSearchPattern()` удваивает `!` и экранирует `%` / `_` под explicit PostgreSQL `ESCAPE '!'`; existing DB regression подтверждает literal `%` и `_`. Exact `drizzle-orm@0.45.2` source at tag commit `273c78071d4841b497f5144734b38294df7ec64b` передаёт primitive template values как bound parameters, а не как raw SQL text.
5. Popular — PASS для E4 response bound: repository принимает только limit 1..20 (default 10) и route возвращает максимум этот limit в каждой из трёх period columns. То, что SQL агрегирует dataset за 30 дней до in-memory ranking, относится к E10/Abuse workload review и не дублируется здесь без отдельного impact finding.
6. Reserved Help location — PASS: Search, Unanswered, Tag detail и Unread используют `publicDiscoveryLocation()`; Help topic остаётся discoverable как public topic, но internal service-section ID/name заменяются category-only public location. Existing connected DB regression проверяет эти четыре readers и direct service-section lookup.
7. Discovery projection — PASS: Search/Popular/Unanswered/Tag не сериализуют private moderation/session/auth fields. Search и browse readers используют current title/post revisions; moderator-only finding E3 не переносится на эти DTO.
8. Public cache/member isolation — PASS кроме уже существующего E7 finding: Search/Popular/Unanswered/Tags не зависят от session/member state. Authenticated Unread остаётся covered by `READSTATE-CACHE-01`; E4 не создаёт duplicate cache finding.
9. Stored topic tags bounded at write boundary: NFKC normalized tag name <=64 chars, no `/`, max 10 unique tags per topic. Это не ограничивает общее число unique tags/topics в forum dataset, что и образует `DISCOVERY-BOUNDS-01`.
10. Broad request/traffic limits и expensive-query abuse остаются E10/Block K; E4 findings ниже фиксируют только доказанные application-level input/result-set gaps.

### DISCOVERY-BOUNDS-01 — Low/P3

1. `readUnanswered()` не имеет `limit`, cursor или pagination и возвращает все unsolved topics с ровно одним persisted post.
2. `readTags()` возвращает весь global tag index; `readTag(key)` возвращает все topics с данным tag. Unique tag count может расти вместе с forum topics, несмотря на per-topic max 10.
3. `readUnreadForUser(userId)` аналогично возвращает все new/unread topics current account без page/cursor/limit.
4. Routes `/:locale/unanswered`, `/:locale/tags`, `/:locale/tags/:tagKey` и authenticated `/:locale/unread` сериализуют эти arrays напрямую; bounded response layer выше repository отсутствует.
5. Impact current-scope: размер DB result, SSR/serialization и response body растёт пропорционально forum/account dataset; три первых routes доступны без authentication и могут повторно вызывать полный result path. Это не требует нарушения authorization и не раскрывает private fields.
6. Severity — **Low/P3**: дефект уже находится в обязательных pre-release discovery/unread surfaces, но substantial resource impact зависит от накопления большого dataset; production traffic amplification отдельно проверяется в Abuse/availability.
7. Search и Popular в finding не входят: Search result ограничен (default 50, max 100), Popular response — default 10/max 20 per period.
8. Remediation в рамках audit stage не назначена.

### SEARCH-CONTROL-01 — Low/P3

1. Public `/:locale/search?q=...` принимает query без запрета NUL. Standard URL parsing превращает `q=%00` в строку `U+0000`; current NFKC/trim/whitespace normalization её не удаляет.
2. `escapeSearchPattern()` экранирует только SQL LIKE escape/wildcards `!`, `%`, `_`, поэтому NUL остаётся внутри bound search pattern.
3. Exact `drizzle-orm@0.45.2` source подтверждает parameter binding primitive interpolation. PostgreSQL 17 official character/protocol docs фиксируют, что text values/text protocol не допускают embedded code-zero/NUL.
4. Hyperdrive forum wrapper классифицирует как availability только transport/connection/server-unavailable/query-timeout cases; invalid text value не попадает в этот набор. `forumReadLoader` поэтому не преобразует такой input в controlled 4xx/503 и rethrows его в generic route-error path.
5. Result: unauthenticated malformed search input может детерминированно вызвать server error/500 path вместо controlled validation/no-results response. Generic ErrorBoundary не показывает internal error detail, поэтому confidentiality leak не подтверждён.
6. Severity — **Low/P3**: это public malformed-input availability/error-path defect, но один request не доказывает Worker/process crash или broader traffic DoS. Broad flood protection остаётся Block K.
7. Exact deployed HTTP request не выполнялся; causal path проверен по current route/repository/wrapper code, Node URL behavior, exact Drizzle source и PostgreSQL 17 primary documentation.
8. Remediation в рамках audit stage не назначена.

## E5 — Topic / reply publication lifecycle

Проверить create-topic и reply direct HTTP/service paths:

1. actor берётся только из authoritative session; same-origin и exact effective participation permission остаются обязательными;
2. category/section/topic target и source locale валидируются server-side, client identity/role не выбирают authority;
3. whitespace/size/content bounds и attachment-only semantics не позволяют пустой/oversized hidden payload;
4. closed/confirmed-duplicate/topic-state rules проверяются внутри authoritative write path;
5. cooldown/rate admission не обходится parallel requests;
6. operation identity/fingerprint делает lost-response retry idempotent, changed replay конфликтует;
7. concurrent replies/publications не создают duplicate post/revision/notifications или partial state;
8. failed notification/mention/publication side effect не оставляет half-committed logical publish.

Attachment ownership/storage internals здесь не проверяются — только forum publication transaction вокруг opaque validated refs.

### E5 — результат аудита

1. Audit target: current `main` `f6fd4b2c031b2132b04eace18704a59aed1dfec8`.
2. Verdict: **1 current-scope finding — `FORUM-PUB-01 Moderate/P2`**.
3. Actor/authority — PASS: public create-topic/reply actions require authenticated same-origin request and fresh `forum.topic.create` / `forum.reply.create`; writer получает actor только из session. `editorActorId` — stale expectation, не authority.
4. Target/source identity — PASS: section/topic берутся из route target; Help creation hardcodes internal service section; repository rechecks section/topic/parent membership. Publication source locale создаётся server-side как `und`; client role/locale/author input не выбирает authority.
5. Empty/attachment-only semantics — PASS кроме finding ниже: whitespace-only text без опубликованного attachment selection отклоняется; attachment-only publish требует operation + selected IDs, а repository под operation scope проверяет current verified refs.
6. Topic state — PASS: reply transaction читает target topic `FOR UPDATE`, затем проверяет closure и active confirmed-duplicate до cooldown и side effects. Close/duplicate transitions используют тот же topic-row lock; существующие DB race regressions подтверждают commit-before-close / deny-after-close semantics. Matching committed receipt replay выполняется до этих fresh-state checks по утверждённому контракту.
7. Cooldown — PASS: topic/reply publication сериализует одного автора через Better Auth user-row `FOR NO KEY UPDATE`, после чего читает latest post и применяет 5-second cooldown в той же transaction. Parallel requests одного actor не проходят admission одновременно.
8. Retry/concurrency — PASS: operation scope сериализуется PostgreSQL advisory xact lock по `ownerId + contextKey`; receipt key = owner/context/draft, fingerprint включает publication target/content/attachments. Exact lost-response retry возвращает committed post, changed replay конфликтует. Receipt, post/revision, notifications/mentions и attachment publication находятся в одной transaction; failure откатывает logical publish.
9. Omitted `editorOperationId` на legacy text-only direct calls сам по себе не классифицирован finding: current first-party editors всегда отправляют operation ID; отсутствие ID создаёт обычную новую publication operation, а не authority bypass. Attachment publication без operation запрещена.
10. Broad edge/traffic DoS controls остаются Block K/E10. Однако `FORUM-PUB-01` ниже относится к current application write admission и не откладывается как Stage-6 infrastructure hardening.

### FORUM-PUB-01 — Moderate/P2

1. Обычные initial grants дают authenticated user `forum.topic.create` и `forum.reply.create`.
2. Create-topic/Help/reply и `editPost` actions materialize `request.formData()` and validate nonblank/attachment semantics, но не задают upper bound для topic title или Markdown body. First-party title fields также не имеют `maxLength`; `MarkdownEditor` не задаёт publication/edit body limit.
3. `ForumService.normalizeRevision()` проверяет только nonblank/source-locale semantics (body может быть blank для attachment-only), а `editPublishedPost()` проверяет ownership/CAS/attachment semantics, но не размер body. В schema `forum_topic_title_revisions.original_content` и `forum_post_revisions.original_content` — unbounded application-level `text` fields без `char_length` constraint.
4. Поэтому обычный участник может через штатный authorized create/reply/edit path долговечно сохранить arbitrarily large application payload до внешнего/runtime/DB предела. 5-second cooldown ограничивает частоту topic/reply creation, но не размер одного persisted write и не устраняет oversized edit.
5. Impact current-scope: persistent shared storage/resource consumption плюс повторная стоимость public read/SSR/Markdown processing для сохранённого контента. Это application-level amplification доступное базовому member, а не только гипотетический unauthenticated edge flood.
6. Finding не утверждает отсутствие внешних Cloudflare/body limits и не требует сейчас production traffic engineering. E10 может отдельно проверить общий HTTP request envelope, но этот exact publication-field bound повторно finding не дублируется.
7. Remediation не назначена в рамках audit stage.

## E6 — Published edit / Own solution business logic

Проверить ordinary participant flows:

1. post edit сохраняет exact post/topic membership и `expectedRevisionId` CAS;
2. stale/rebase/retry не меняет другой post и не повторяет уже committed edit;
3. current source/notification/mention effects следуют только successful committed revision;
4. Own solved/best-answer требует authoritative topic authorship, exact answer membership и valid topic state;
5. confirmed duplicate/closed/changed answer state не обходится stale form/replay;
6. no-op/retry/concurrency не создаёт duplicate revision/notification/domain effect.

Generic Own-vs-Any permission semantics уже покрыты Block C/D и здесь повторно не считаются отдельным finding без domain contradiction.

### E6 — результат аудита

1. Audit target: current `main` `f6fd4b2c031b2132b04eace18704a59aed1dfec8`.
2. Verdict: **0 additional current-scope findings**. Existing `FORUM-PUB-01 Moderate/P2` расширен на published-post edit body: это тот же missing application-level content bound, а не новый defect.
3. Edit authority/membership — PASS: route требует current session, same-origin и `forum.post.editOwn`; repository под row lock проверяет exact `postId + topicId`, authoritative author и `expectedRevisionId`. Forged actor/other-topic/other-user target не становится write authority.
4. Edit CAS/replay — PASS: operation scope lock = current actor + exact post edit context. Receipt fingerprint включает post/topic, expected revision, body и attachment selections. Matching committed lost-response retry no-op replay'ится; changed retry конфликтует. Stale revision не создаёт новую current revision до explicit rebase/new operation.
5. Edit side effects — PASS: revision insert, current-revision CAS, mention notification inserts, attachment membership changes и publication receipt находятся в одной transaction. Failed CAS/attachment publication откатывает revision/mentions; per-post notification uniqueness сохраняет already-notified set across later edits.
6. Closure/edit — PASS: source-of-truth явно сохраняет existing own-published-post edits при закрытии темы; implementation не использует closure как edit ban. Fresh measure restriction `posts.edit` проверяется внутри edit transaction; committed matching receipt остаётся replayable по общему contract.
7. Own solution authority — PASS: `operationScope=own` требует effective `forum.solution.manageOwn`, после чего repository под topic-row `FOR UPDATE` повторно проверяет authoritative topic author. Best-answer target обязан существовать в том же topic и не может быть original post.
8. Solution state/races — PASS: active confirmed duplicate блокирует own solved/best-answer; duplicate-confirm и solution mutations сериализуются через тот же topic-row lock. Solved и best-answer по утверждённому contract независимы: answer можно выбрать до solved и заменить после solved. Repeated same best-answer selection не создаёт dependent side effects; concurrent explicit selections сериализуются и остаются exact-target last-write semantics, а не silent retarget.
9. Closed topic не классифицирован как запрет Own solution mutations: действующий closure contract запрещает новые replies и не задаёт closure как solution-state restriction; противоречия code/source-of-truth не обнаружено.
10. Remediation по E6 не назначена; единственный Block E finding остаётся `FORUM-PUB-01`.

## E7 — Notifications / mentions / unread / read-state

Проверить:

1. mention extraction использует semantic rendered Markdown: code/quote/invalid links не создают ложного recipient;
2. reply + mention recipient deduplication и self-exclusion не создают duplicate/private notification;
3. notification rows создаются атомарно только после successful publication/edit;
4. inbox/read/open действия всегда scoped к current recipient; arbitrary notification ID не читает/mark-read чужое событие;
5. notification target/permanent link строится из authoritative stored target и не становится open redirect;
6. unread/topic-read marker принадлежит current user, движется только по допустимому topic/post state и не может быть forged за другого пользователя;
7. inbox/unread private responses используют private/no-store и не переиспользуются между accounts.

### E7 — результат аудита

1. Audit target: current `main` `f6fd4b2c031b2132b04eace18704a59aed1dfec8`.
2. Verdict: **1 current-scope finding — `READSTATE-CACHE-01 Low/P3`**.
3. Mention extraction — PASS: recipients берутся только из rendered internal profile links; blockquote/code/inline-code/html/image/spoiler-title и malformed/external URLs не создают recipient. Actor self-mention исключается.
4. Reply/mention dedup — PASS: topic author и direct parent dedup'ятся через in-memory set; mention insertion использует тот же unique `recipient_user_id + post_id`, поэтому reply+mention одного recipient не создаёт две строки. DB regression также подтверждает отсутствие self-notifications.
5. Atomicity — PASS: reply notification rows и mention rows создаются внутри publication/edit transaction. Notification insert failure откатывает post; stale/failed edit не создаёт mention notification.
6. Inbox/read/open scoping — PASS: unified inbox читает только `recipient_user_id = session.user.id`; open action получает userId только из session, exact notification row блокируется `FOR UPDATE` и scoped по recipient. Arbitrary чужой notification ID даёт not-found и не меняет `read_at`.
7. Target integrity — PASS: reply/mention notification schema требует exact composite post/topic FK; redirect строится только из stored topic/post IDs с URL encoding. Complaint notifications дополнительно recheck'ят participant membership перед read mutation. Open redirect path не найден.
8. Read-state authority — PASS: `markTopicRead` использует session userId, exact route topic и post membership; DB composite FK не допускает чужой topic/post marker. Upsert двигает marker только вперёд; concurrent advances сходятся на более новом post. Forged user identity не принимается.
9. Notification page — PASS: authenticated-only, bounded strict page, explicit `private, no-store`; POST body bounded 4096 bytes, same-origin required, controlled responses/redirects также private/no-store.
10. Mention autocomplete — PASS: authenticated-only, query bounded 64 chars, literal escaped ILIKE, result projection только `id + name`, limit 8, response `private, no-store` + `nosniff`.

### READSTATE-CACHE-01 — Low/P3

1. E7 first confirmed missing private cache policy on `/:locale/unread`, section `topicReadStates` and topic `topicReadState`. E1 expanded the same root cause: parent `/:locale` loader itself serializes session-specific `authUser` (`id/name/image`), Admin/Attention/Super-admin presentation capabilities and unread notification count.
2. `locale-boundary.tsx` exports no `headers()` and returns that account-specific parent data without cache headers. Public children such as Category/Search/Popular/Unanswered/Tags/Profile and normal Topic/Section GET paths do not universally replace the final response with an explicit `private, no-store` policy.
3. Exact official `react-router@8.3.1` source (`da2a0f0948af60ba45d9590b427d5e58fe4b0109`) confirms both document responses and Single Fetch `.data` loader responses derive final headers through `getDocumentHeaders()`: a route without a `headers` export inherits parent headers; loader headers are not promoted except Set-Cookie unless a route headers policy returns them. Topic's custom `headers()` also preserves an empty parent policy on a normal successful GET.
4. Worker auth-session prelookup does not close this gap: `withAuthSessionCookies()` deliberately propagates only Better Auth `Set-Cookie` values and does not copy auth endpoint cache headers. A Set-Cookie is not guaranteed on every session read. For comparison, notification inbox, Settings/Admin surfaces and homepage online-presence response explicitly use `private, no-store`.
5. Impact is the same privacy/cache root cause but broader than read-state: account identity, unread count, permission-derived navigation flags and per-user read state can be stored/reused if a browser/intermediary applies caching without an explicit private policy. Protected destination routes still perform their own server authorization; cached presentation flags do not grant authority. Cross-user shared-cache replay in the undeployed environment is **not proven**.
6. Severity remains **Low/P3**: the current app serializes member-specific state on public forum responses without its explicit cache-isolation contract, but actual cross-user cache reuse is not demonstrated and no authorization bypass results.
7. E1 completed the broader root/locale check and expanded this finding instead of creating a duplicate. E10 may only add new evidence/affected work if it finds a distinct cache/replay cause.
8. Remediation в рамках audit stage не назначена.

## E8 — Profiles / presence / public privacy

Проверить:

1. public profile projection не содержит email/session/authz/private Settings data;
2. profile URLs/links безопасно нормализуются и не создают executable scheme;
3. presence heartbeat subject берётся из current session и не принимает forged user ID;
4. `showOnline=false` исключает пользователя из public online list/count и прекращает дальнейшую heartbeat registration;
5. stale presence/expiry/concurrency не показывает скрытого пользователя или другого account;
6. account switch не переносит local/member state между users.

### E8 — результат аудита

1. Audit target: current `main` `f6fd4b2c031b2132b04eace18704a59aed1dfec8`.
2. Verdict: **PASS — 0 additional current-scope findings**.
3. Public profile projection — PASS: repository reader выбирает только `id/name/image/joinedAt/bio/githubUrl/websiteUrl/role/messageCount/bestAnswerCount`; route повторно строит explicit public projection. Existing route regression подмешивает private `email` / `permissions` и подтверждает, что они не сериализуются.
4. Profile ownership/edit boundary — PASS: public read остаётся guest-accessible; edit action требует authenticated session, same-origin и exact `session.user.id === params.userId`. Repository получает только server actor, locks exact user row и применяет `profile.edit` measure admission перед upsert.
5. Public profile URL safety — PASS: biography ограничена 500 Unicode code points и rejects forbidden controls; website принимает только absolute HTTP(S) без credentials/control/whitespace. GitHub additionally требует exact `github.com`, default port, no query/hash и single profile-name path. Presentation повторно проходит links/avatar через `safeHttpUrl`; avatar использует `referrerPolicy="no-referrer"`.
6. Profile identity path — PASS: locale/user ID кодируются `encodeURIComponent` как отдельные path segments; submitted profile fields не выбирают target account/role/name.
7. Heartbeat identity/origin — PASS: `/:locale/presence` принимает только authenticated same-origin POST; writer получает только current session user ID. Stale `expectedUserId` другого account даёт 409 до write; произвольный submitted `userId` не используется как subject.
8. Server-authoritative OFF enforcement — PASS: privacy save и heartbeat оба lock'ят ту же Better Auth user row `FOR UPDATE` under READ COMMITTED. Heartbeat после lock отдельным SELECT читает latest committed preference и при `show_online=false` не insert/refresh presence. OFF upsert + presence delete находятся в одной transaction; repeated OFF также чистит stale row.
9. Public list/count — PASS: `readOnlinePresence()` ограничивает active window пятью минутами и filters `show_online=false` **до** window count/order/`LIMIT 12`. Missing preference row считается ON по утверждённому contract; email/private setting/session data в public member DTO отсутствуют.
10. Stale-row/concurrency — PASS: connected PostgreSQL regression покрывает forced stale hidden presence row, filter-before-count/limit, rollback cleanup failure и обе очередности `heartbeat-first` / `off-first`; итог после гонки = OFF + no presence. Unrelated users не сериализуются глобально.
11. ON behavior — PASS: включение visibility само presence не создаёт; пользователь появляется только после следующего permitted heartbeat.
12. Browser/account switch — PASS: heartbeat effect зависит от current `user.id` и cleanup'ит старый timer/listener; in-flight stale heartbeat защищён `expectedUserId` server check. Privacy form keyed by `accountId:showOnline`, stale header identity скрывает form, а existing UI regression подтверждает reset при account switch и сохранение draft только для same account.
13. Homepage privacy/cache — PASS в узком E8 scope: online identities идут через homepage response с explicit `private, no-store`; optional storage outage отображается как unavailable, а не fabricated zero.
14. Отдельный cache-кандидат public profile **не классифицирован как E8 finding**: `profile.tsx` содержит member-specific `isOwner/canEditProfile/editing/saved`, но более широкий parent `/:locale` loader уже сериализует `authUser`, permissions и unread count без собственного document cache policy. Exact React Router `8.3.1` headers source уже подтверждает наследование parent headers при отсутствии child `headers`. Этот root public-vs-member cache contract запланирован в **E1**; не создавать здесь profile-specific duplicate до whole-root проверки.
15. Tests в этом audit не запускались; существующие route/UI/PostgreSQL regressions были прочитаны как evidence. Production/deployed presence acceptance не выполнялась и для E8 не требуется.
16. Remediation по E8 не назначена.

## E9 — User-content translation application boundary

Проверить только current application boundary, не provider/Queue internals:

1. presentation identity = exact content type + content ID + revision ID + target locale;
2. stale/invalid/missing translation показывает current original, а не старую/чужую revision;
3. translated Markdown/summary/table/spoiler output проходит validation и обычный safe renderer;
4. source locale/UI locale/target locale не подменяют друг друга как authority/identity;
5. generation request требует current registered eligible locale, exact current content revision и effective `forum.translation.generate`;
6. generation admission rate-limited/deduplicated и unknown locale не создаёт task/provider work;
7. ordinary public GET/SSR не вызывает provider синхронно и не становится translation proxy.

Durable Queue claim/retry/provider credentials/cost/reconciliation остаются вне E.

### E9 — результат аудита

1. Audit target: current `main` `f6fd4b2c031b2132b04eace18704a59aed1dfec8`.
2. Verdict: **PASS — 0 additional current-scope findings**.
3. Presentation identity/fallback — PASS: current translation выбирается только по exact `contentType + contentId + revisionId + targetLocale`. Wrong/unrequested/duplicate/invalid batch rows не подменяют requested unit; stale revision, invalid provenance/source metadata, missing row и classified storage outage возвращают current original.
4. Current revision binding — PASS: topic loader строит translation units из текущей title revision и current post revisions. Attachment-only/blank body не образует text translation unit. DB batch reader повторно фильтрует exact entity/revision/target identity.
5. Structured Markdown boundary — PASS: post body переводится через semantic AST protection; code/URL/technical tokens и quote attribution защищены, segment set/value bounded, restore требует точного token order и structure signature. Machine publication выполняет restore/validation до persistence. Публичная presentation затем идёт через тот же safe Markdown renderer, уже проверенный E2.
6. Source/UI/target locale separation — PASS: known source берётся из immutable revision metadata; `und` использует отдельный detector/policy path, а UI locale не становится source language. Manual source-locale correction создаёт новую revision и оставляет старые translations historical. Target generation locale берётся из server `localeContext`, а planner требует strict canonical active registry locale.
7. Generation authority — PASS: generation intent проходит authenticated same-origin mutation guard, effective `forum.translation.generate`, current user-measure admission и server-side current topic read. Actor берётся из session; title/post revision — из authoritative current topic state; post обязан принадлежать текущему topic. Client fields `actorId/targetLocale/sourceLocale/revisionId/provider/cost` authority не имеют.
8. Eligibility/no-work — PASS: unknown/inactive/noncanonical target, stale caller revision, same source/target, unresolved source, no semantic post text, unsupported provider capability и already-current exact translation не создают durable generation work.
9. Budget/dedup — PASS: requester identity pseudonymized server-side; global + requester fixed-window budget consumption выполняется внутри planning transaction после current revision/current translation checks. Generation-head/stable-task locks сериализуют concurrent planning; duplicate active task не создаёт вторую logical task, а request budget всё равно применяется.
10. Failure semantics — PASS: classified translation storage outage деградирует presentation к current original; classified generation planning/forum-read dependency failures дают controlled unavailable path. Unexpected programming/integrity errors не маскируются как normal fallback/success.
11. Public SSR/provider boundary — PASS: current Worker wiring использует только persisted translation batch reader для presentation и явно устанавливает `DISABLED_CONTENT_GENERATION_ACTION_RUNTIME`. Обычный public GET/SSR не вызывает provider и не является translation proxy; generation controls отсутствуют, пока runtime disabled.
12. Existing E1 `LOCALE-DEGRADED-WRITE-01` не дублируется: если generation runtime позже включить, degraded canonical-English mutation также должен быть закрыт общим locale fail-closed fix.
13. Реальные provider credentials/calls, Queue consumer/retry/claim/cost и deployed allowance policy остаются Stage 6 / provider-job / Abuse scope. Их отсутствие в текущем disabled runtime не является E9 current defect.
14. Tests в этом audit не запускались. Прочитаны relevant presentation, generation action/planning и source-locale correction regressions; production/deployed provider smoke не выполнялся.
15. Remediation по E9 не назначена.

## E10 — Cross-cutting failure / cache / replay / application abuse

Проверить:

1. typed dependency unavailable может дать controlled fallback/503 только там, где это предусмотрено; programming/schema errors не маскируются как ordinary denial/success;
2. public optional presentation degradation не заменяет protected participant mutation check;
3. request-local caches не смешивают actor/locale/target/revision;
4. failed 4xx/5xx stale recovery не replay'ит mutation автоматически;
5. request bodies, query strings, counts и expensive presentation work имеют bounded input/response limits;
6. application-level spam/replay protections не обходятся простой concurrency;
7. отсутствие production traffic/edge controls не объявляется current defect без доказанного current application impact — системный DoS остаётся Block K.

## Порядок фактической проверки

1. E2 Markdown/rendering/XSS.
2. E5 Topic/reply publication.
3. E6 Published edit / Own solution.
4. E7 Notifications/mentions/read-state.
5. E3 Public object reads/projections.
6. E4 Discovery/Search/Tags.
7. E8 Profiles/presence/privacy.
8. E1 Locale/routing/cache.
9. E9 Content-translation application boundary.
10. E10 Failure/cache/replay closeout.

## Критерий завершения Block E

1. Все перечисленные current public/member entrypoints проверены по actual route → service/repository path.
2. Rendering/injection findings имеют воспроизводимый input → sink → impact path.
3. Mutation findings доказывают unauthorized/duplicate/cross-object/partial side effect, а не только теоретическую слабость UI.
4. Private member data не попадает в public/shared cache/projection.
5. Каждый finding классифицирован по текущему Stage; future provider/runtime/DoS hardening не выдаётся за current application defect.
6. Remediation не начинается в рамках audit stage без отдельного решения владельца.

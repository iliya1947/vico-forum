# Block E — Public forum / application security audit

## Статус

1. Это bounded audit plan для области 5 общей security-карты.
2. Audit target на момент подготовки: current `main` `f6fd4b2c031b2132b04eace18704a59aed1dfec8`.
3. Фактический аудит начат. **E2 PASS. E5: `FORUM-PUB-01 Moderate/P2`. E6: 0 additional findings; `FORUM-PUB-01` подтверждён для edit body. E7: `READSTATE-CACHE-01 Low/P3`. E3: `PUBLIC-PROJECTION-01 Low/P3`.** Remediation по Block E не назначена.
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

1. `/:locale/unread` возвращает account-specific unread/new topics, counts и first/latest unread identities по current session, но route не экспортирует `headers()` и loader возвращает plain data без cache headers.
2. Public `/:locale/sections/:sectionId` также сериализует per-user `topicReadStates`, а `/:locale/topics/:topicId` — per-user `topicReadState`; эти successful GET paths не задают explicit `private, no-store` для member-specific read-state data.
3. Parent `locale-boundary` не задаёт Cache-Control. Exact official `react-router@8.3.1` source (`da2a0f0948af60ba45d9590b427d5e58fe4b0109`) подтверждает: route без `headers` наследует только parent headers, а loader/action headers не попадают в document response автоматически кроме Set-Cookie; topic `headers()` также получает пустой successful loader cache policy здесь.
4. Для сравнения current notification inbox и homepage с dynamic/member-sensitive presentation явно используют `private, no-store`.
5. Impact ограничен privacy/cache boundary: read/unread activity и account-specific presentation могут быть сохранены/переиспользованы кэшем, если конкретный browser/intermediary применит caching policy. Cross-user shared-cache replay в текущем undeployed environment **не доказан**.
6. Поэтому severity — **Low/P3**, но это current product defect: authenticated unread/new state входит в обязательный pre-release product scope, и отсутствие явного private cache contract находится в действующем E7 boundary, а не является только Stage-6 hardening.
7. Более широкий root/locale public-vs-member cache contract будет отдельно проверен в E1/E10; этот finding там не дублировать, а при необходимости только расширить affected surface одного root cause.
8. Remediation в рамках audit stage не назначена.

## E8 — Profiles / presence / public privacy

Проверить:

1. public profile projection не содержит email/session/authz/private Settings data;
2. profile URLs/links безопасно нормализуются и не создают executable scheme;
3. presence heartbeat subject берётся из current session и не принимает forged user ID;
4. `showOnline=false` исключает пользователя из public online list/count и прекращает дальнейшую heartbeat registration;
5. stale presence/expiry/concurrency не показывает скрытого пользователя или другого account;
6. account switch не переносит local/member state между users.

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

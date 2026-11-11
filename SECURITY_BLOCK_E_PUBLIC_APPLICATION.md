# Block E — Public forum / application security audit

## Статус

1. Это bounded audit plan для области 5 общей security-карты.
2. Audit target на момент подготовки: current `main` `f6fd4b2c031b2132b04eace18704a59aed1dfec8`.
3. Фактический аудит начат. **E2 завершён: PASS — 0 findings. E5 завершён: 1 current-scope finding — `FORUM-PUB-01 Moderate/P2`.** Remediation по Block E не назначена.
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
2. Create-topic/Help/reply actions materialize `request.formData()` and validate nonblank/attachment semantics, но не задают upper bound для topic title или Markdown body. First-party title fields также не имеют `maxLength`; `MarkdownEditor` не задаёт publication-body limit.
3. `ForumService.normalizeRevision()` проверяет только nonblank/source-locale semantics (body может быть blank для attachment-only). В schema `forum_topic_title_revisions.original_content` и `forum_post_revisions.original_content` — unbounded application-level `text` fields без `char_length` constraint.
4. Поэтому обычный участник может провести через штатный authorized publication path и долговечно сохранить arbitrarily large application payload до внешнего/runtime/DB предела. 5-second cooldown ограничивает частоту, но не размер одного persisted write.
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

## E7 — Notifications / mentions / unread / read-state

Проверить:

1. mention extraction использует semantic rendered Markdown: code/quote/invalid links не создают ложного recipient;
2. reply + mention recipient deduplication и self-exclusion не создают duplicate/private notification;
3. notification rows создаются атомарно только после successful publication/edit;
4. inbox/read/open действия всегда scoped к current recipient; arbitrary notification ID не читает/mark-read чужое событие;
5. notification target/permanent link строится из authoritative stored target и не становится open redirect;
6. unread/topic-read marker принадлежит current user, движется только по допустимому topic/post state и не может быть forged за другого пользователя;
7. inbox/unread private responses используют private/no-store и не переиспользуются между accounts.

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

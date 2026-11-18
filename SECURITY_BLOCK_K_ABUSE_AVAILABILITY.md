# Block K — Abuse & availability security audit

## Статус

1. Scope создан 2026-11-18; current K1 audit target — `main` `7cc23edede57994cdedab49c1556ddb55034dd29`.
2. Blocks A–J закрыты как audit blocks; их findings в K не дублируются.
3. **K1 — Abuse/availability inventory & ownership boundaries завершён: PASS, 0 новых current-scope findings и 0 deferred blockers.**
4. **K2 — Authentication brute-force / rate-limit bypass завершён: PASS, 0 новых current-scope findings и 0 deferred blockers.**
5. **K3 — Forum write spam & cross-endpoint concurrency завершён: 1 новый current-scope finding — `FORUM-EDIT-SPAM-01 Moderate/P2`; 0 deferred blockers.**
6. **K4 — Public expensive reads / query amplification завершён: 1 новый current-scope finding — `PUBLIC-READ-COST-01 Moderate/P2`; 0 deferred blockers.**
7. **K5 — Request body / attachments / storage exhaustion завершён: 1 новый current-scope finding — `ATTACH-SECURITY-EVENT-SPAM-01 Moderate/P2`; 0 deferred blockers.**
8. **K6 — Background / translation / notification amplification завершён: 1 новый current-scope finding — `MENTION-FANOUT-01 Moderate/P2`; 0 deferred blockers.**
9. **K7 — Dependency failure / backpressure завершён: 1 новый current-scope finding — `DB-CLEANUP-FLOAT-01 Low/P3`; 0 deferred blockers.**
10. **K8 — Cross-chain closeout завершён: PASS, 0 дополнительных current findings и 0 deferred blockers. Block K завершён.**
11. Final Block K: **5 current findings — 4 Moderate/P2 + 1 Low/P3; 0 deferred blockers.** Overall #315 = **33 current findings + 4 deferred Stage-6 blockers**.
12. Мира — auditor/coordinator. Remediation, technical planner и implementer не назначены.
13. Production/Cloudflare/Neon/GitHub/provider settings mutation, load testing и внешние destructive/fault-injection действия не разрешены и не выполнялись.

## Цель

Проверить generic abuse и availability поверхности Vico Forum: brute force, spam, rate-limit bypass/concurrency, expensive endpoints, amplification, resource exhaustion и dependency-failure pressure — только там, где root cause не принадлежит уже закрытым Blocks B/E/F/H/J.

## Current scope

1. Authentication abuse только как generic rate-limit/bypass/concurrency слой; identity/session correctness остаётся Block B.
2. Authenticated forum write spam и cross-endpoint cooldown/admission composition.
3. Complaint/Help/notification/presence и другие repeatable application writes с потенциальной amplification.
4. Public expensive reads и DB/SSR/translation amplification только для K-specific abuse chain; уже подтверждённые unbounded read defects остаются Block E.
5. Request-body, attachment и storage pressure только для independent generic resource-exhaustion chain; existing form-body и attachment-validation findings остаются E/F.
6. Translation/provider cost amplification только для application-side generic admission; provider/Queue-specific lifecycle remains J.
7. Dependency outage/backpressure/fail-closed behavior where repeated requests can amplify DB/runtime work.
8. Stage-6 infrastructure DDoS/WAF/account-level configuration is acceptance unless a concrete repository defect already requires a correction gate.

## Anti-duplication

1. **Block B:** auth/session/linking semantics and auth-specific findings.
2. **Block E:** public application validation, unbounded forum reads, generic form-body bounds and current forum publication limits.
3. **Block F:** attachment type/content/storage integrity.
4. **Block H:** Cloudflare Worker topology/runtime/version exposure.
5. **Block J:** provider/Queue-specific retries, external provider cost and external integration failures.
6. **Block L:** security monitoring/alerting/incident response.
7. One root cause → one finding ID.

## План проверки

### K1 — Abuse/availability inventory & ownership boundaries
1. Enumerate current generic rate limits, cooldowns, quotas, request-size ceilings and bounded expensive operations.
2. Map public/authenticated/privileged repeatable endpoints to existing admission controls.
3. Separate K-owned gaps from existing B/E/F/J findings and Stage-6 infrastructure acceptance.
4. Establish later bounded slices without creating findings for missing future infrastructure.

### K2 — Authentication brute-force / rate-limit bypass
1. Recheck canonical Better Auth rate-limit coverage on current exposed auth routes.
2. Verify trusted client identity/IP derivation and direct-route/direct-API consistency.
3. Test concurrency/bucket-key behavior conceptually against current DB-backed implementation and repository tests.
4. Do not duplicate auth enumeration/session findings from Block B.

### K3 — Forum write spam & cross-endpoint concurrency
1. Topic/reply/edit/signal/complaint repeat-write admission.
2. Per-user serialization, cooldown bypass across operation types and concurrent requests.
3. Replay/idempotency interaction with rate limits.
4. Notification/mention fan-out only where independently amplifiable.

### K4 — Public expensive reads / query amplification
1. Homepage/category/section/topic/discovery/search/profile public GET cost shape.
2. Distinguish existing E pagination/bounds findings from independent expensive-query chains.
3. Repeated anonymous request amplification and DB/SSR/translation work.
4. Cache behavior only where it affects abuse/availability rather than privacy.

### K5 — Request body / attachments / storage exhaustion
1. Body parsing limits beyond already-owned `FORM-BODY-BOUNDS-01`.
2. Attachment size/count/frequency and private-object lifecycle pressure.
3. Temporary/draft/journal cleanup amplification.
4. No duplicate of F content-validation findings.

### K6 — Background / translation / notification amplification
1. Generic generation-request admission and global/requester budgets.
2. Fan-out from mentions/notifications/content generation.
3. Reconciliation/cleanup batch bounds only for generic resource pressure; provider-specific replay stays J.
4. Repeated failure must remain bounded.

### K7 — Dependency failure / backpressure
1. PostgreSQL/storage/authz unavailable paths under repeated load.
2. Fail-open vs fail-closed and retry storms.
3. Request-scoped connection/resource cleanup.
4. Stage-6 external platform throttling stays acceptance unless repository path is already unsafe.

### K8 — Cross-chain closeout
1. attacker request → admission → DB/runtime work → durable/fan-out side effects;
2. dedup B/E/F/H/J/L;
3. current-vs-Stage-6 severity validation;
4. record release/Stage-6 abuse correction gates; remediation remains separate.

## K1 — результат

1. Audit target: current `main` `7cc23edede57994cdedab49c1556ddb55034dd29`.
2. Verdict: **PASS — 0 новых current-scope findings, 0 deferred blockers.**
3. Better Auth rate limiting is enabled in canonical Vico auth configuration with database storage and Cloudflare-derived `cf-connecting-ip` as the configured client-IP source. Exact route coverage/bucket semantics are intentionally deferred to K2.
4. Forum topic/reply publication uses a **5-second per-author cooldown**. The author Better Auth row is locked `FOR NO KEY UPDATE` and the latest post is checked inside the same transaction as the write, so concurrent same-author publication cannot trivially race around the cooldown.
5. Help-signal submissions use the same 5-second policy with an independent latest-signal check while holding the actor mutex. Signal review/withdrawal belongs to state/authorization semantics unless a distinct abuse chain is established later.
6. Complaint submission already has a bounded request body (32 KiB), domain rate-limit errors map to HTTP 429, and complaint-specific lifecycle/security remains Block D; K3 will only check generic cross-endpoint abuse composition.
7. Content-translation request admission has database-backed **global + requester fixed-window budgets** with atomic counter updates and bounded cleanup. Provider/Queue retry/cost lifecycle itself remains Block J.
8. Attachment ingestion enforces a default **50,000,000-byte per-object ceiling** and streaming validation. Attachment content-integrity defect `ATTACH-TEXT-TAIL-01` remains Block F; per-user/storage-frequency exhaustion is left for K5.
9. Online presence suppresses excess DB writes per user by updating an existing heartbeat only when the stored timestamp is older than 45 seconds. This is a concrete bounded repeat-write control.
10. Existing Block E findings already own the dominant known generic request amplification defects: `FORUM-READ-BOUNDS-01`, `DISCOVERY-BOUNDS-01`, `FORUM-PUB-01` and `FORM-BODY-BOUNDS-01`. K will not create duplicate IDs for the same root causes.
11. Existing J controls own provider-specific amplification: finite translation task attempt budgets, provider allowance and Queue/reconciliation semantics. K only evaluates generic application admission/fan-out around those mechanisms.
12. No repository evidence from K1 establishes a new independent generic DoS/spam root cause yet. Absence of Cloudflare WAF/rate-limit configuration in current repository is not itself a current finding during pre-release and paused Stage 6.
13. No load test, brute-force attempt, external request flood, production query, deployment or settings mutation was performed.
14. Next bounded slice: **K2 — Authentication brute-force / rate-limit bypass**.

## K2 — результат

1. Audit target: current `main` `7cc23edede57994cdedab49c1556ddb55034dd29`.
2. Verdict: **PASS — 0 новых current-scope findings, 0 deferred blockers.**
3. Canonical Vico auth config pins `better-auth@1.7.7` and `@better-auth/drizzle-adapter@1.7.7`, enables rate limiting explicitly, stores counters in PostgreSQL and uses only `cf-connecting-ip` as the Better Auth client-IP header.
4. Exact Better Auth `v1.7.7` source was rechecked. Built-in special rules limit `/sign-in*`, `/sign-up*`, `/change-password*` and `/change-email*` to **3 requests / 10 seconds per client-IP+path**; reset/verification families use **3 / 60 seconds**. Other HTTP auth routes use the configured global default.
5. The known PostgreSQL concurrency advisory `GHSA-44jh-23m7-hpcf` affects Drizzle/Better Auth versions `>=1.6.17,<1.7.7`; **1.7.7 is the patched version**. Exact v1.7.7 database limiter uses guarded atomic `incrementOne` admission so concurrent requests cannot all pass a stale counter read.
6. Vico has its own PostgreSQL contention regression test `tests/database/auth-rate-limit-concurrency.test.ts`: it blocks the authoritative rate-limit row, launches concurrent real SQL requests, then asserts exactly the configured number are admitted, the rest receive 429, the persisted count remains capped and a different client-IP bucket remains independent. K2 inspected this test; it was not executed during this audit slice.
7. Better Auth official rate-limit guidance requires trusting only a proxy-controlled client-IP header. Current Cloudflare documentation confirms `CF-Connecting-IP` is supplied by Cloudflare for ordinary visitor traffic to the origin/Worker boundary; Vico config lists only this header rather than caller-controlled `X-Forwarded-For`.
8. No missing-IP bypass was established in the pinned Better Auth implementation: v1.7.7 falls back to one shared per-path `no-trusted-ip` bucket rather than skipping rate limiting when no trusted IP can be resolved.
9. Public `/api/auth/*` requests go through `authRuntime.handle(request)` → canonical `auth.handler(request)`, so HTTP sign-in/sign-up/change-password requests traverse the request-phase limiter before auth endpoint execution.
10. Direct `auth.api.*` calls do not automatically pass the HTTP request-phase limiter, but Vico does not expose a server-only direct API for guest email/password sign-in or sign-up. The one password-guessing-sensitive internal Settings operation (`changePassword`) deliberately re-enters the canonical `/api/auth/change-password` handler specifically to share the DB-backed rate-limit bucket.
11. Other current direct `auth.api.*` uses are authenticated session/account operations (`getSession`, list/revoke sessions/accounts) and do not create an alternate unauthenticated password-guessing route. No direct-API brute-force bypass was established.
12. Per-IP rate limiting is intentionally IP-scoped in Better Auth. Rotating attacker source IPs can obtain separate buckets, but current project requirement is **basic anti-abuse/rate limiting**; repository scope does not establish an account-identity/global brute-force policy that this violates. Treating distributed-IP resistance as a new current defect would overstate the current contract. Stage-6 upstream WAF/account-level controls may be considered later if operational risk justifies them.
13. Existing `AUTH-ENUM-01` remains Block B and is not duplicated: K2 evaluated attempt throttling, not response-based account enumeration.
14. Exact deployed Cloudflare Transform Rules/WAF/Bot settings are **Информация не проверена** and are not required to prove the current repository rate-limit path; Stage 6 remains paused.
15. No brute-force traffic, load test, production request, credential attempt, external mutation or Cloudflare setting change was performed.
16. #315 aggregate remains **28 current findings + 4 deferred Stage-6 blockers**.
17. Next bounded slice: **K3 — Forum write spam & cross-endpoint concurrency**.

## K3 — результат

1. Audit target: current `main` `7cc23edede57994cdedab49c1556ddb55034dd29`.
2. Verdict: **1 новый current-scope finding — `FORUM-EDIT-SPAM-01 Moderate/P2`; 0 deferred blockers.**
3. Topic/reply publication share the same 5-second per-author cooldown because both persist a `forum_posts.created_at` row and call `enforceForumWriteCooldown()` while holding the authoritative actor mutex. Concurrent same-author creates are serialized; the second request sees the first committed post timestamp before admission.
4. Help-signal submission has an independent 5-second cooldown under the same actor mutex. Complaints use an independent stronger domain budget: 10 reports / 10 minutes and 50 / 24 hours, with actor serialization and exact replay/lifetime-duplicate handling before budget spending.
5. Replay/idempotency on initial topic/reply/edit publication is bounded by operation/draft receipts. Exact committed replay returns the prior entity instead of creating another post/revision; changed payload reuse conflicts. This prevents transport retries from multiplying a single committed publication.
6. Direct reply notification fan-out is bounded to topic/parent recipients, and DB uniqueness `(recipient_user_id, post_id)` prevents repeated edit/retry notifications to the same recipient for the same post. Parsed mention-recipient fan-out was left for K6; K6 later confirmed that it does not have its own recipient-count ceiling. This does not change the K3 edit-storage finding.
7. **Root cause:** `editOwnTopicTitle()` and `editPublishedPost()` perform authenticated persistent edits without calling `enforceForumWriteCooldown()` or any other request-count/quota policy. `assertActiveAccountForDrizzleMutation()` only serializes actor state with a row lock; it imposes no time floor and no per-account revision budget.
8. `editOwnTopicTitle()` is the simplest concrete abuse chain: after owning one topic, the caller submits a short changed title with the current `expectedRevisionId`; success inserts a fresh immutable `forum_topic_title_revisions` row, CAS-updates `current_title_revision_id`, and the HTTP action returns the newly created `revisionId`. The caller can immediately use that ID for the next edit and repeat indefinitely.
9. This chain does not depend on the existing `FORM-BODY-BOUNDS-01` or `FORUM-PUB-01`: alternating tiny valid titles are enough. Fixing request-byte/content ceilings alone would not bound the number of persistent rows created.
10. `editPublishedPost()` has the same missing anti-spam admission for immutable `forum_post_revisions`. Its CAS/post lock prevents conflicting simultaneous edits of one baseline, and publication receipts prevent exact replay duplication, but a sequential actor can continually obtain a new baseline and persist more revisions without cooldown.
11. There is no generic Worker/application POST throttle covering these forum edit routes. Repository search found rate-limit handling only in Better Auth, complaints and the forum create/signal-specific `ForumWriteRateLimitError` path; no global Worker rate limit closes the edit path.
12. **Impact:** one ordinary authenticated account can generate unbounded durable revision growth at application/request speed, increasing PostgreSQL storage/index/history-read work and creating a practical persistent resource-exhaustion/spam primitive. Because the product explicitly requires basic anti-spam/rate limiting on write boundaries and the edit capability is already current repository functionality, this is current-stage, not future hardening.
13. Severity: **Moderate/P2** — authenticated-only and serialized, with no demonstrated immediate takeover/data disclosure, but persistent unbounded DB growth is a meaningful abuse/availability defect rather than cosmetic hardening.
14. No additional K3 finding: topic/reply create concurrency is properly serialized; Help signals and Complaints have separate bounded policies; exact replay paths do not multiply writes.
15. No load/flood test, production write, external request or settings mutation was performed.
16. #315 aggregate becomes **29 current findings + 4 deferred Stage-6 blockers**. Current severity becomes **10 Moderate/P2 + 19 Low/P3**; deferred remains **2 Moderate/P2 + 2 Low/P3**.
17. Next bounded slice: **K4 — Public expensive reads / query amplification**.

### `FORUM-EDIT-SPAM-01` — Moderate/P2 — current

**Root cause:** authenticated own-topic-title and own-post edit paths persist a new immutable revision per successful changed edit but have no cooldown, quota or generic request-rate admission; actor/CAS locks serialize correctness only.

**Current impact:** one authenticated account can repeatedly alternate small valid edits and grow revision tables/indexes/history without a time or count bound, causing persistent database/storage/query amplification.

**Boundary:** exact replays and concurrent stale baselines are fenced, and create/reply/signal/complaint paths have their own controls. The defect is specifically repeated successful sequential edits. It is independent of existing Block-E request-size/content-bound findings.

## K4 — результат

1. Audit target: current `main` `7cc23edede57994cdedab49c1556ddb55034dd29`.
2. Verdict: **1 новый current-scope finding — `PUBLIC-READ-COST-01 Moderate/P2`; 0 deferred blockers.**
3. Block-E dedup was rechecked first. `DISCOVERY-BOUNDS-01` owns unbounded Unanswered/Tags/Tag/Unread result sets; `FORUM-READ-BOUNDS-01` owns unbounded canonical section/topic snapshots. K4 does not duplicate those response-size/read-set defects.
4. **Homepage:** unauthenticated `/[:locale]/` calls `readHomepage()` on every request. The repository performs two aggregate join queries over categories/sections/topics/posts with `count(distinct ...)`; response cardinality is relatively small, but aggregate work grows with total forum content. The route is explicitly `private, no-store` because online presence is user/privacy-sensitive, so this path has no shared document/data cache relief.
5. **Popular:** unauthenticated `/[:locale]/popular` calls `readPopular()` on every request. SQL aggregates every post from the last 30 days grouped by topic, returns one row per active topic to application memory, then JavaScript sorts the full row set three times before slicing each period to at most 20 results. Therefore the response is bounded while DB + Worker work is not bounded by the requested output size.
6. **Search:** unauthenticated `/[:locale]/search` limits output to 50 by default / 100 maximum, but the SQL joins current topic titles, current post revisions and tags, evaluates leading-and-trailing wildcard `ILIKE '%query%'`, groups by topic, orders matches and only then applies `LIMIT`. Repository search found no `pg_trgm` extension or GIN/GiST content index for these searchable text fields, so the current design has no repository-level index strategy that bounds arbitrary substring-search work as the corpus grows.
7. Search query length <=200 and SQL parameterization remain valid controls but do not cap dataset scan/join/aggregate cost. `SEARCH-CONTROL-01` remains separate and only owns malformed NUL handling.
8. Repeated public requests can therefore re-trigger corpus-proportional DB work without authentication or application-level per-client admission. This is distinct from generic Internet-scale DDoS: the application itself exposes requests whose backend cost grows materially with normal accumulated forum data even though response size is bounded.
9. Existing public section/topic/unanswered/tag issues are not counted again. Their backend cost is already inseparable from the same unbounded result sets documented in Block E; K4's new finding is limited to bounded-output but corpus-proportional computation where response pagination alone would not solve the root cause.
10. **Impact:** an unauthenticated client can repeatedly consume PostgreSQL CPU/I/O and Worker CPU on homepage/popular/search; cost grows with forum activity/content. The same expensive path is available to ordinary legitimate traffic, making availability degradation plausible before any external flood protection becomes relevant.
11. Severity: **Moderate/P2** — public unauthenticated trigger and persistent corpus-proportional computation; no data disclosure or authority bypass, and no production load measurement was performed.
12. Exact deployed Cloudflare cache/WAF/rate-limit behavior is **Информация не проверена** and cannot be relied upon as a repository mitigation. Stage 6 remains paused.
13. No load test, EXPLAIN on production data, external flood, production DB query or Cloudflare mutation was performed. Finding is established from current request→repository query shape and absence of a repository search-index/cache/admission bound.
14. #315 aggregate becomes **30 current findings + 4 deferred Stage-6 blockers**. Current severity becomes **11 Moderate/P2 + 19 Low/P3**; deferred remains **2 Moderate/P2 + 2 Low/P3**.
15. Next bounded slice: **K5 — Request body / attachments / storage exhaustion**.

### `PUBLIC-READ-COST-01` — Moderate/P2 — current

**Root cause:** several unauthenticated public readers have bounded output but corpus-proportional backend work and no application-level cache/admission mechanism that bounds repeated execution: homepage full aggregates, Popular 30-day aggregate + full in-memory ranking, and substring Search across joined current content/tags without a repository text-search index.

**Current impact:** repeated public GETs can amplify PostgreSQL/Worker resource use as the forum corpus grows, independent of the already-recorded unbounded response/result-set findings.

**Boundary:** this finding does not claim that every public query is expensive, does not duplicate `DISCOVERY-BOUNDS-01`/`FORUM-READ-BOUNDS-01`, and does not depend on unverified production WAF/cache behavior.

## K5 — результат

1. Audit target: current `main` `7cc23edede57994cdedab49c1556ddb55034dd29`.
2. Verdict: **1 новый current-scope finding — `ATTACH-SECURITY-EVENT-SPAM-01 Moderate/P2`; 0 deferred blockers.**
3. Block-E/F dedup: generic unbounded `request.formData()` remains `FORM-BODY-BOUNDS-01`; attachment type/content-tail integrity remains `ATTACH-TEXT-TAIL-01`. K5 does not duplicate either root cause.
4. Direct attachment upload itself is stream-bounded: `X-Vico-Attachment-Size` must be a safe integer, the default per-object ceiling is 50,000,000 bytes, oversize/empty metadata is rejected before R2 write, and the stream enforces both declared length and maxBytes without whole-object buffering.
5. Accepted-object cleanup is bounded and replay-safe: cleanup batch max is 20, stale draft refs expire after 24h of inactivity, orphan candidates use one-hour grace plus durable claims/leases, and reservation sweep is separately budgeted. Real scheduler/R2 activation remains Stage 6 acceptance by source-of-truth.
6. The owner-approved Editor contract explicitly says **do not introduce arbitrary per-user quotas on total file count or aggregate storage at this stage**. Therefore the absence of a general per-user file quota is not classified as a current defect.
7. **Independent K5 root cause:** suspicious rejected upload attempts are durably inserted into `forum_attachment_security_events`, but this write path has no cooldown/request budget and no event-retention cleanup in current repository code.
8. Static request→storage analysis shows that a suspicious rejection can reach `recordSecurityEvent()` after normal authenticated editor admission without producing an accepted attachment object. The event identity is derived from upload metadata including the attachment identity, so distinct upload attempts are not coalesced into one durable event.
9. `recordSecurityEvent()` uses `ON CONFLICT DO NOTHING` only for an identical derived event identity. That provides exact-event deduplication but does not impose a per-actor budget, cooldown or cross-attempt coalescing boundary.
10. `recordSecurityEvent()` persists a new row directly and does not call `measureAdmission()` or another rate limiter. Repository search found no delete/retention path for `forum_attachment_security_events`; monitoring readers page the accumulated table.
11. Result: one ordinary authenticated account with attachment-upload permission can repeatedly create distinct rejected security events and grow PostgreSQL/index state plus monitoring noise independently of accepted-object storage. This is separate from the intentionally absent general per-user file quota.
12. Severity: **Moderate/P2** — authenticated-only and no authority bypass/data disclosure, but low-cost unbounded durable DB/log growth plus monitoring-noise amplification is a practical current availability/operational-security defect.
13. No additional K5 finding: normal attachment byte ingestion is hard-bounded; cleanup passes are bounded; missing live cleanup scheduling/R2 configuration is explicitly Stage-6 acceptance rather than a current repository defect.
14. Exact deployed R2 limits/costs/scheduler state are **Информация не проверена** and were not used to establish the finding.
15. No upload attack, object write, cleanup run, production DB query, R2 request or external setting mutation was performed.
16. #315 aggregate becomes **31 current findings + 4 deferred Stage-6 blockers**. Current severity becomes **12 Moderate/P2 + 19 Low/P3**; deferred remains **2 Moderate/P2 + 2 Low/P3**.
17. Next bounded slice: **K6 — Background / translation / notification amplification**.

### `ATTACH-SECURITY-EVENT-SPAM-01` — Moderate/P2 — current

**Root cause:** suspicious rejected attachment attempts can produce distinct durable security-event rows, while the event-write path has only exact-event deduplication and no cooldown/budget/retention cleanup.

**Current impact:** an authenticated attachment-capable user can repeatedly grow PostgreSQL security-event/index state and monitoring noise through rejected upload attempts, independently of accepted-object storage.

**Boundary:** ordinary attachment content validation, 50 MB streaming bound and cleanup correctness remain Block F/current attachment controls; lack of general per-user file/storage quota is an explicit current product decision and is not this finding.

## K6 — результат

1. Audit target: current `main` `7cc23edede57994cdedab49c1556ddb55034dd29`.
2. Verdict: **1 новый current-scope finding — `MENTION-FANOUT-01 Moderate/P2`; 0 deferred blockers.**
3. Translation/background dedup first: provider/Queue-specific retries, external cost and provider failure lifecycle remain Block J. Current Worker keeps content generation disabled through `DISABLED_CONTENT_GENERATION_ACTION_RUNTIME`; provider, enqueuer and consumer are not wired in the current runtime.
4. Prepared content-generation admission is fail-closed and actor-bound: current permission is checked at the route, active-account/measure admission is checked server-side, and the action capability rechecks admission before planning.
5. Request-budget foundation is bounded: requester identity is pseudonymized, planning carries both global and requester fixed-window budgets, and the task stores consume those counters inside the same PostgreSQL transaction that creates/reactivates work. Budget denial rolls back provisional task/head mutations.
6. Duplicate/current-work behavior is bounded: current translation and completed task states return without creating new work; duplicate pending/processing planning does not create a second logical task. Translation task execution has a durable default maximum of 3 attempts.
7. Budget cleanup and reconciliation are bounded: expired budget cleanup accepts at most 1,000 rows per call; task reconciliation accepts at most 100 candidates per run and durably imposes a 60-second per-task reconciliation retry floor. A failed enqueue is counted and the bounded pass continues rather than recursively retrying inside the same run.
8. **Independent K6 root cause:** published mention extraction returns every distinct valid profile recipient found in the accepted Markdown, with no server-side maximum recipient count.
9. The publication transaction then resolves the complete recipient set against `user` and inserts one durable `forum_reply_notifications` row per matching recipient. The uniqueness constraint prevents duplicate recipient/post notifications, but it does not cap the number of different recipients in one successful publication.
10. The direct reply side of the same transaction is bounded to topic author and optional parent author; therefore this finding is specifically the mention-recipient fan-out, correcting the broader K3 wording rather than adding a second reply-notification root cause.
11. Editor autocomplete returns a small suggestion page, but that is presentation only. The authoritative publication parser accepts valid profile links from the submitted Markdown and does not require that each mention came from a particular UI suggestion interaction.
12. This is independent from `FORUM-PUB-01`: that finding concerns the byte/character size of authored content. Here the missing boundary is semantic fan-out — one accepted publication has no independent ceiling on durable notification recipients. A future body-size ceiling does not by itself define an acceptable mention-recipient budget.
13. Impact: one ordinary authenticated publisher can make a single successful forum write perform recipient-proportional user lookup and durable inbox insertion, creating notification spam and transaction/DB amplification proportional to the selected audience. The 5-second create/reply cooldown limits publication frequency but not recipients per publication; post-edit notification uniqueness prevents repeat notification to the same recipient/post but does not establish a general fan-out ceiling.
14. Complaint decision/appeal notification fan-out did not produce an additional K6 finding: it is tied to privileged terminal moderation actions and an already rate-limited complaint domain, not an ordinary member-controlled broadcast surface.
15. Severity: **Moderate/P2** — authenticated-only and no confidentiality/authority bypass, but the current member-facing mention feature provides an unbounded durable notification fan-out within one successful write.
16. No production notification flood, generation call, Queue/provider call, cleanup/reconciliation run or external mutation was performed. Tests and current code were inspected; they were not executed during K6.
17. #315 aggregate becomes **32 current findings + 4 deferred Stage-6 blockers**. Current severity becomes **13 Moderate/P2 + 19 Low/P3**; deferred remains **2 Moderate/P2 + 2 Low/P3**.
18. Next bounded slice: **K7 — Dependency failure / backpressure**.

### `MENTION-FANOUT-01` — Moderate/P2 — current

**Root cause:** server-side published-mention extraction and notification persistence have no independent maximum for distinct recipients in one accepted publication; recipient/post uniqueness only deduplicates repeats.

**Current impact:** an authenticated publisher can make one successful write create recipient-proportional durable inbox rows and associated DB work, producing notification spam and resource amplification.

**Boundary:** direct reply recipients remain bounded; authored-content size remains `FORUM-PUB-01`; post-edit repeated revision growth remains `FORUM-EDIT-SPAM-01`; provider/Queue amplification remains Block J.

## K7 — результат

1. Audit target: current `main` `7cc23edede57994cdedab49c1556ddb55034dd29`.
2. Verdict: **1 новый current-scope finding — `DB-CLEANUP-FLOAT-01 Low/P3`; 0 deferred blockers.**
3. Core PostgreSQL failure classification is bounded: web clients/pools use 3-second connection and 7-second query caller deadlines; known transport/timeout failures are translated to typed unavailable errors and normal forum/authz/member routes fail closed rather than continuing a protected mutation.
4. No generic automatic HTTP/database retry loop was found on current request paths. Forum/auth/authz wrappers propagate the classified failure, and current browser/server paths do not automatically replay failed protected mutations. Translation provider/Queue retry ownership remains Block J.
5. Request-local authorization resolution caches one same-user promise, so repeated permission checks inside one request do not create parallel duplicate DB resolution work. Auth/session and forum wrappers also own and discard their request-local clients in `finally` blocks.
6. Passive telemetry does not create an independent outage storm on an empty failed request: auth-fact and attempt collectors short-circuit when they have no pending records/gaps; operational recording similarly avoids opening a pool when no facts/storage observations were captured. Recorded telemetry is bounded and best-effort.
7. **Independent K7 root cause:** `bestEffortDiscardClient()` invokes `client.end()` / `pool.end()` and intentionally drops the returned Promise instead of awaiting it or registering it with the Worker execution context. This helper is reused by auth, forum, authorization, complaints, admin/settings, attachment and other web DB capabilities.
8. Current Cloudflare Workers lifecycle documentation explicitly states that async work which is neither awaited nor passed to `waitUntil()` can be canceled when an invocation ends. Current node-postgres API documentation defines `client.end()` / `pool.end()` as async shutdown operations intended to be awaited. Therefore Vico currently proves only that teardown was initiated, not that request-scoped database cleanup completed before the Worker invocation can finish.
9. Repository tests confirm the same boundary: cleanup tests assert that `end()` is called and that cleanup failures do not replace the domain result, but they do not require the returned cleanup Promise to settle before the request operation resolves.
10. Impact is bounded but current: under normal traffic and especially dependency degradation, incomplete teardown can leave connection/pool lifecycle cleanup to runtime cancellation/transport cleanup rather than application-controlled completion, weakening backpressure and resource-release guarantees across many request paths.
11. Severity: **Low/P3** — the cleanup guarantee is concretely missing in current Cloudflare Worker code, but no live connection exhaustion, leaked production session or sustained outage amplification was measured. The finding therefore remains hardening/availability rather than Moderate/P2.
12. No second K7 finding: classified DB/authz/storage outages fail closed; caller deadlines bound individual DB waits; no unbounded request retry loop was established; Stage-6 WAF/platform throttling remains future acceptance.
13. Exact deployed connection behavior under current production Hyperdrive is **Информация не проверена** and is not required to establish the missing Worker-lifecycle guarantee. Stage 6 remains paused.
14. No production fault injection, connection saturation, Hyperdrive probe, load test or external mutation was performed.
15. #315 aggregate becomes **33 current findings + 4 deferred Stage-6 blockers**. Current severity becomes **13 Moderate/P2 + 20 Low/P3**; deferred remains **2 Moderate/P2 + 2 Low/P3**.
16. Next bounded slice: **K8 — Cross-chain closeout**.

### `DB-CLEANUP-FLOAT-01` — Low/P3 — current

**Root cause:** shared request-scoped PostgreSQL cleanup starts asynchronous client/pool `end()` work but does not await it or attach it to the Cloudflare Worker execution lifetime.

**Current impact:** Vico cannot guarantee completion of DB connection/pool teardown before invocation termination, weakening resource-release/backpressure behavior across current request paths, especially during dependency degradation.

**Boundary:** request operations themselves have caller deadlines and fail closed; no production connection exhaustion was demonstrated. Provider/Queue retries remain Block J and external WAF/platform throttling remains Stage 6.

## K8 — результат

1. Audit target: current `main` `7cc23edede57994cdedab49c1556ddb55034dd29`.
2. Verdict: **PASS — 0 дополнительных current-scope findings, 0 deferred blockers; Block K завершён.**
3. End-to-end composition rechecked across current request admission → DB/runtime work → durable/fan-out side effects. The five K findings remain distinct root causes rather than one duplicated chain: edit revision growth, bounded-output public read cost, security-event growth, mention-recipient fan-out and asynchronous DB teardown completion.
4. K3/K6 composition does not create a new finding: repeated edit publication can interact with mention delivery, but the missing edit admission and missing recipient ceiling are already independently captured. Correcting both boundaries is sufficient for the current root causes; no additional authority bypass or separate persistence primitive was established.
5. K4 remains independent from Block E. E owns unbounded result/read-set size (`DISCOVERY-BOUNDS-01`, `FORUM-READ-BOUNDS-01`); K4 owns public readers whose output is bounded/small while backend work still grows with corpus size. No duplicate finding is created.
6. K5 remains independent from Block F and future Block L. F owns attachment content-validation integrity; K5 owns unbounded durable event creation under repeated rejected uploads. Block L may later audit event usefulness, alertability, retention policy and incident workflow, but must not duplicate K5's resource-growth root cause.
7. K7 remains K-owned generic backpressure/resource-lifecycle behavior rather than Block H topology or Block G database-role/migration scope. Current request operations have caller deadlines and fail-closed unavailable handling; the finding is only the missing guarantee that asynchronous DB teardown settles within Worker lifetime.
8. Block B auth/session findings, Block J provider/Queue retry/cost findings and Block H runtime/version blockers remain unchanged. K2 did not establish a second auth brute-force defect, and K6 did not establish a second provider-specific amplification defect.
9. Stage classification revalidated against current `PROJECT_STATE.md` / `ROADMAP.md`: Stage 6 is paused, but all five K findings are already reachable in repository/current product paths and therefore remain **current**, not deferred Stage-6 work.
10. Release correction gate: before public Stage 7 release, all five Block-K current findings require bounded remediation plus regression coverage appropriate to their root cause. This is an audit gate only; remediation is not started here.
11. Stage-6 acceptance remains separate: when external runtime resumes, recheck actual Cloudflare/Hyperdrive/R2/Queue/provider traffic/resource settings, authoritative translation budget values, cleanup scheduling and upstream throttling. Absence of those mutable settings in current pre-release repository is not converted into a new K blocker.
12. Exact deployed WAF/Bot/rate-limit rules, Hyperdrive connection behavior, live R2 cleanup schedule/costs and production translation allowance values are **Информация не проверена**. None is required to classify the five current repository findings.
13. No external request flood, production load/fault injection, provider/Queue call, R2 mutation, Hyperdrive probe, deploy or settings change was performed in K8.
14. Final Block K = **5 current findings: `FORUM-EDIT-SPAM-01 Moderate/P2`, `PUBLIC-READ-COST-01 Moderate/P2`, `ATTACH-SECURITY-EVENT-SPAM-01 Moderate/P2`, `MENTION-FANOUT-01 Moderate/P2`, `DB-CLEANUP-FLOAT-01 Low/P3`; 0 deferred blockers.**
15. Overall #315 remains **33 current findings + 4 deferred Stage-6 blockers**. Current severity remains **13 Moderate/P2 + 20 Low/P3**; deferred remains **2 Moderate/P2 + 2 Low/P3**.
16. Next security area after developer continuation: **Block L — Security monitoring & incident response**. It must be created as a separate bounded file; it is not started by K8.

## Finding criteria

1. Concrete current/prepared request or background path.
2. Attacker can bypass intended admission or cause materially disproportionate DB/CPU/storage/provider/fan-out work.
3. Impact is reproducible from current repository semantics, not only hypothetical Internet-scale DDoS.
4. Root cause belongs K rather than B/E/F/H/J/L.
5. Current Stage affected, or a concrete prepared Stage-6 path requires a deferred correction gate.

## Ограничения

1. Не выполнять production load/flood/brute-force/fault-injection.
2. Не менять Cloudflare/WAF/rate-limit/Neon/provider/GitHub settings.
3. Не создавать external resources или paid security services.
4. Не исправлять findings во время audit.
5. Пока над #315 работает одна Мира, PR comments для внутреннего обсуждения не использовать.

## Следующий шаг

1. После продолжения владельца начать **Block L — Security monitoring & incident response** отдельным bounded-файлом и выполнить его первый этап.
2. Remediation существующих findings/blockers Blocks B–K не начинать без отдельного назначения.

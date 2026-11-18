# Block K — Abuse & availability security audit

## Статус

1. Scope создан 2026-11-18; current K1 audit target — `main` `7cc23edede57994cdedab49c1556ddb55034dd29`.
2. Blocks A–J закрыты как audit blocks; их findings в K не дублируются.
3. **K1 — Abuse/availability inventory & ownership boundaries завершён: PASS, 0 новых current-scope findings и 0 deferred blockers.**
4. **K2 — Authentication brute-force / rate-limit bypass завершён: PASS, 0 новых current-scope findings и 0 deferred blockers.**
5. **K3 — Forum write spam & cross-endpoint concurrency завершён: 1 новый current-scope finding — `FORUM-EDIT-SPAM-01 Moderate/P2`; 0 deferred blockers.**
6. Overall #315 становится **29 current findings + 4 deferred Stage-6 blockers**.
7. Мира — auditor/coordinator. Remediation, technical planner и implementer не назначены.
8. Production/Cloudflare/Neon/GitHub/provider settings mutation, load testing и внешние destructive/fault-injection действия не разрешены и не выполнялись.

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
6. Reply notification fan-out is bounded per successful post by direct topic/parent recipients plus parsed mention recipients, and DB uniqueness `(recipient_user_id, post_id)` prevents repeated edit/retry notifications to the same recipient for the same post. This does not remove the edit-storage problem below.
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

1. После продолжения владельца выполнить **K4 — Public expensive reads / query amplification** на current main и остановиться после результата.
2. Remediation существующих findings/blockers Blocks B–K не начинать без отдельного назначения.

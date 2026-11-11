# Block H — Cloudflare / Workers / runtime security audit

## Статус

1. Bounded audit scope подготовлен 2026-11-11 против `main` `5992885e78b1642e41c9805116fcc256002b649c`; перед H2 current `main` продвинулся до `ce62e783e71433a00c2fe4874ee26dfc54614628` только документационным SA-03 closeout #326, без изменений H runtime/ingress source.
2. Block G закрыт: 3 current-scope findings; `DB-RUNTIME-EVIDENCE-01 Low/P3` сохранён отдельно как Stage-6 blocker и в H не дублируется.
3. **H1 — Worker composition & binding isolation завершён: PASS, 0 current-scope findings.**
4. **H2 — Ingress trust & source attribution завершён: PASS, 0 current-scope findings.**
5. **H3 — Runtime configuration and optional binding failure завершён: PASS, 0 current-scope findings.**
6. **H4 — Preview, Version URL and public entrypoint isolation завершён: 0 current-scope findings + 1 deferred Stage-6 blocker `WORKER-VERSION-URL-01 Moderate/P2`.**
7. **H5–H8 ещё не выполнялись.**
8. Следующий bounded slice после продолжения владельца — **H5: Worker deployment/version/rollback repository gates**.
9. Мира — auditor/coordinator. Remediation, technical planner и implementer не назначены.
10. Cloudflare/production mutation, deployment, binding changes и live topology checks не выполнялись.

## H1 — результат

1. Verdict на current `main` `5992885e78b1642e41c9805116fcc256002b649c`: **PASS, 0 current-scope findings**.
2. `wrangler.jsonc` объявляет две отдельные Hyperdrive bindings с разными repository IDs: `HYPERDRIVE` и `WEB_HYPERDRIVE`; runtime resolver принимает только эти две named capabilities.
3. `resolveRuntimeDatabaseConnectionStrings()` требует непустую `connectionString` для каждой binding независимо и при missing/blank значении бросает `RuntimeDatabaseBindingConfigurationError`; fallback между localization и web capability отсутствует.
4. Worker composition разводит capabilities по назначению: `createHyperdriveRegistryLoader` и `createHyperdriveUiTranslationStore` получают только `localizationConnectionString`; Better Auth, forum read/write, attachments DB metadata, authorization, Admin, Settings writers, measures, Complaints, Owner monitoring/profile, attempt telemetry, auth facts и content-presentation/admission получают `webConnectionString`.
5. Current web adapters используют explicit passed connection string через `createWebClient` / `createWebPool`; localization adapters используют `createLocalizationClient`. Runtime `workers/*`/DB adapter path не читает `DATABASE_URL`, `NEON_OWNER_DATABASE_URL` или migration credential как fallback.
6. Production migrator/owner database credentials существуют только в protected workflow/script paths; current Worker runtime composition не получает migration/admin database capability.
7. Content generation action runtime в Worker явно установлен в `DISABLED_CONTENT_GENERATION_ACTION_RUNTIME`; generation status reader не bind'ится. Forum action проверяет `runtime.enabled` до admission/capability use, а topic loader обращается к generation status только если generation уже enabled. Наличие web-backed admission adapter само по себе generation не включает.
8. Existing tests explicitly cover distinct binding resolution, missing/blank fail-closed behavior, representative adapter routing, shared web PostgreSQL factory and absence of generation-status binding. Ordinary CI additionally builds/smokes Worker with both local override names. Эти tests в H1 были прочитаны, но не запускались.
9. Local CI intentionally points both binding names at one disposable PostgreSQL superuser URL, поэтому сам integration smoke не доказывает production privilege separation; static resolver/composition tests и source mapping закрывают current wiring regression. Это test-environment limitation, а не current security finding при отсутствии misrouting.
10. Mutable deployed Worker/Hyperdrive bindings and actual production roles were not re-read live because Stage 6 is paused: **Информация не проверена**. Это не меняет H1 repository verdict.
11. H1 remediation не требуется. Следующий slice — H2 ingress trust; H1 выводы в H2 не переоткрывать без нового evidence.

## H2 — результат

1. Verdict на current `main` `ce62e783e71433a00c2fe4874ee26dfc54614628`: **PASS, 0 current-scope findings**.
2. Delta `5992885… → ce62e783…` — только docs SA-03 closeout #326; `workers/app.ts`, `app/observability/attempt-source.ts`, collector/auth runtime и ingress tests не менялись. H1 выводы сохраняются.
3. Worker создаёт request-local attempt collector только из `captureAttemptIngressSource(request)`; browser-provided XFF/True-Client-IP не используются для source identity.
4. Qualified network source допускается только при наличии Worker-only `request.cf.colo` metadata с валидной 3-letter colo shape и после строгой canonical IP validation. Cloudflare current Workers docs определяют incoming `request.cf` как read-only metadata, предоставляемую global network.
5. Для обычного visitor ingress Cloudflare current header contract говорит: `CF-Connecting-IP` отражает client IP, а `x-real-ip` при отсутствии Worker subrequest удалён. Поэтому normal direct ingress проходит source qualification без доверия к XFF/True-Client-IP.
6. Same-zone Worker subrequest по текущему Cloudflare contract получает `CF-Connecting-IP` из `x-real-ip`, который upstream Worker может изменить, но Cloudflare добавляет `CF-Worker` ко всем Worker `fetch()` subrequests. Current Vico при наличии `x-real-ip` **или** `CF-Worker` деградирует source в `unknown`, поэтому manipulated same-zone source не становится qualified IP.
7. Cross-zone Worker subrequest получает fixed Cloudflare Worker client IP `2a06:98c0:3600::103` и `CF-Worker`; Vico отдельно reject'ит и fixed address, и Worker marker. Arbitrary cross-zone Worker source therefore cannot become qualified visitor source.
8. Pseudo IPv4 `Overwrite Headers` заменяет `CF-Connecting-IP` Class-E pseudo IPv4 и сохраняет original IPv6 отдельно в `CF-Connecting-IPv6`. Vico reject'ит Class-E value и не повышает alternate header до identity: outcome `unknown`, а не false attribution. Это безопасная деградация.
9. Missing/invalid `cf.colo`, invalid/missing IP, CIDR/list/port/zone-id input, cross-zone fixed IP и subrequest markers также fail to `unknown`; source quality никогда не повышается до `trusted` из HTTP request. `trusted` создаётся только explicit synthetic helper для tests.
10. Request collector сохраняет network source только как telemetry dimension. Authenticated actor берётся отдельно только из resolved server session; network IP не превращается в user identity/Owner authority.
11. Repository search подтвердил: `captureAttemptIngressSource` вызывается production path только из `workers/app.ts`; его `networkIp/networkQuality` используются в Owner attempt telemetry/history, а не как application authorization decision.
12. Better Auth отдельно использует `cf-connecting-ip` для своего database-backed HTTP rate limit; этот auth-rate-limit semantic уже относится к Block B. H2 проверил только Cloudflare ingress assumption: direct edge value server-supplied, Worker-subrequest edge cases не дают Vico telemetry false qualified source.
13. Возможность client-supplied `CF-Worker` намеренно не используется как positive trust evidence. Даже если такой header когда-либо будет виден direct request, current branch лишь деградирует telemetry в `unknown`; privilege/authz/source impersonation не возникает. Current contract допускает unknown source and does not require exhaustive attribution, поэтому отдельный finding не создаётся.
14. Unit/DB ingress/collector tests были прочитаны, но в H2 не запускались. Они покрывают forged CF/XFF without `request.cf`, invalid colo, qualified direct shape, x-real-ip/CF-Worker/cross-zone/Class-E rejection, resolved-actor separation и bounded unknown/gap handling.
15. Mutable production Pseudo IPv4/Transform Rules/Worker routes and exact live subrequest topology: **Информация не проверена**; Stage 6 paused. Это external acceptance boundary, не current H2 defect.
16. H2 remediation не требуется. Следующий slice — H3 runtime configuration / optional binding failure.

Проверенная current official Cloudflare evidence:
- Cloudflare HTTP headers — direct `CF-Connecting-IP`, stripped direct `x-real-ip`, same/cross-zone Worker subrequest behavior and `CF-Worker`;
- Workers Request API — incoming `request.cf` global-network metadata/read-only contract;
- Pseudo IPv4 — Class-E overwrite and `CF-Connecting-IPv6` preservation;
- `cf.worker.upstream_zone` docs/changelog — platform distinction between direct visitor and Worker subrequests.

## H3 — результат

1. Verdict на current `main` `ce62e783e71433a00c2fe4874ee26dfc54614628`: **PASS, 0 current-scope findings**.
2. Required DB bindings остаются fail closed: `resolveRuntimeDatabaseConnectionStrings()` требует непустые `HYPERDRIVE` и `WEB_HYPERDRIVE` до Router/request capability composition. Missing/blank binding не fallback'ится к другой DB capability и не превращается в guest/permission=false.
3. Такой required-binding configuration failure проходит как configuration error, а не classified availability. Это соответствует current authorization contract: configuration/schema/programming errors не маскируются как controlled permission denial/503. Security bypass не подтверждён.
4. Optional `ATTACHMENT_R2` в Worker явно превращается в `privateAttachmentBucketContext=null`. Physical upload, authorized download и Complaint evidence read затем получают `AttachmentBucketUnavailableError` и возвращают bounded `503`/no-store вместо fallback storage, public bytes или success-shaped response.
5. Attachment upload при missing R2 не вызывает `createDraftAttachment`; existing route tests прямо покрывают fail-closed `503`. Download tests покрывают missing binding/object как unavailable. Complaint evidence routes также переводят missing/failed bucket read в private `503`. Это H3 runtime-config evidence; attachment content/storage root causes остаются Block F и здесь не дублируются.
6. `VICO_OWNER_USER_ID` является optional server-only binding до Stage 6. `validOwnerUserId()` принимает только exact nonblank trimmed string; missing/invalid value становится `undefined`. Authorization context получает no Owner, а current Owner mutation policy не fallback'ится к ordinary manager. Поэтому configuration omission выключает Owner authority, а не передаёт её другому пользователю.
7. Better Auth runtime получает Worker env values `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`; собственного Vico fallback на request header, hard-coded production credential или client input нет.
8. Current protected production rollout перед version upload проверяет nonempty Cloudflare credentials, `BETTER_AUTH_SECRET` длиной минимум 32, nonempty Google secret/client ID и exact `BETTER_AUTH_URL == https://vico-forum.iliya1947a.workers.dev`; upload передаёт auth secret/Google secret через temporary `--secrets-file`, URL/client ID как explicit vars. Поэтому repository Stage-6 rollout не рассчитывает на library default при missing production auth config.
9. Current official Better Auth documentation требует high-entropy secret минимум 32 chars; current docs также предупреждают, что base URL inference использовать не рекомендуется. Vico production rollout explicit pins secret and base URL before upload. Exact missing-config behavior pinned `better-auth@1.7.7` не нужен как security assumption для этого verdict.
10. Current Cloudflare Vite-plugin docs подтверждают: local secrets/vars загружаются из ignored `.dev.vars` или `.env`; `vite build` может сохранить local dev vars только для subsequent `vite preview`, они не deploy'ятся с Worker. Vico connected auth/Owner browser acceptance создаёт synthetic `.dev.vars` внутри disposable loopback CI и удаляет его после run.
11. Local Hyperdrive path по current Cloudflare docs требует explicit `localConnectionString` или `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_<BINDING>`; ordinary CI задаёт оба split override на disposable loopback PostgreSQL. Production Hyperdrive IDs из `wrangler.jsonc` поэтому не являются silent local fallback в утверждённом CI path.
12. `.env.example` содержит blank placeholders и сам по себе не загружается runtime. Auth-enabled connected smokes не используют его как credential; они создают synthetic local values. Наличие blank example не создаёт current security finding.
13. Current production rollout preparation ещё не выполняет real `VICO_OWNER_USER_ID` binding и не подключает `ATTACHMENT_R2`; source-of-truth уже относит real Owner binding, external R2/deployed attachment acceptance и full deployed product acceptance к Stage 6. Missing Owner fails closed; missing R2 gives 503. Это не current-scope defect и не дублируется как H finding.
14. `secrets.required` в `wrangler.jsonc` не объявлен. Current Cloudflare platform может использовать такой declaration для local secret loading/warnings, но Vico production rollout уже имеет own pre-upload validation, а current local auth acceptance supplies explicit synthetic vars. Отсутствие дополнительного platform declaration само по себе не создаёт current exploit path; finding не создаётся.
15. H3 tests/source/workflows были прочитаны, но tests не запускались. Mutable deployed Worker variables/secrets/bindings, live R2 and real Owner binding: **Информация не проверена**; Stage 6 paused.
16. H3 remediation не требуется. Следующий slice — H4 preview/version/public-entrypoint isolation.

Проверенная current official external evidence:
- Cloudflare Vite plugin — local `.dev.vars`/`.env`, preview/build secret loading and non-deployment semantics;
- Cloudflare Hyperdrive — explicit local connection string / binding-specific env override and separate remote mode;
- Better Auth — current secret/baseURL configuration requirements and recommendation to set base URL explicitly.

## H4 — результат

1. Verdict на current `main` `ce62e783e71433a00c2fe4874ee26dfc54614628`: **0 current-scope findings; 1 deferred Stage-6 blocker — `WORKER-VERSION-URL-01 Moderate/P2`.**
2. `production-worker-rollout.yml` в rollout job выполняет `wrangler versions upload` exact main version с top-level `wrangler.jsonc` production bindings: `HYPERDRIVE` и `WEB_HYPERDRIVE`. Upload также передаёт production `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_SECRET`, `BETTER_AUTH_URL` и `GOOGLE_CLIENT_ID`.
3. Current Cloudflare Version URL contract: Worker version captures code/configuration/bindings; Version URL использует **existing configuration and production resources** этой version, а не отдельную isolated environment.
4. Current Cloudflare access contract: при включённых Version URLs они **publicly available**; Access требуется отдельно, если нужно ограничить посетителей. `workers.dev` также публичен при включении.
5. Vico source-of-truth уже требует: preview/non-production path не должен иметь production auth/forum write/private capability без отдельной isolation либо отключения. Version URL из rollout этому требованию не соответствует: uploaded version получает `WEB_HYPERDRIVE` production write/private capability до production traffic promotion.
6. Workflow сам использует returned `preview_url` для `scripts/smoke-production-worker.sh`; parser требует HTTPS `*.workers.dev`. Smoke отправляет обычные unauthenticated GET requests и **не имеет Cloudflare Access service token/session**. Поэтому current successful workflow не доказывает и не требует защиту Version URL Access; наоборот, его scripted smoke рассчитан на напрямую доступный Version URL.
7. `wrangler.jsonc` не фиксирует `preview_urls=false` и не объявляет isolated Preview resources. Current Cloudflare config semantics: omitted `preview_urls` does not force a safe state; existing account/Worker setting remains authoritative. Source-of-truth historically records production/preview `workers.dev` URLs enabled, but exact mutable live Access/Version-URL state сейчас: **Информация не проверена**.
8. `promote=false` является штатным workflow input. В этом path после Version URL smoke workflow только записывает version/url в step summary; uploaded version не удаляется. Значит Stage-6 execution может оставить отдельно routable pre-production version, использующую production resources, после завершения run.
9. Entire uploaded Worker route table доступен через Version URL, а не только smoke endpoints: current app содержит `/api/auth/*`, attachment APIs и locale/forum/admin routes. GET-only smoke ограничивает только действия CI-клиента и **не ограничивает методы/маршруты внешнего посетителя**.
10. Application auth/authz/origin controls продолжают действовать и отдельный authz bypass H4 не доказан. Поэтому blocker не классифицируется как direct Owner/admin compromise. Security impact — появление публичного pre-production ingress с production web DB/auth capability вопреки утверждённой isolation boundary, включая окно до promotion и потенциально долгоживущий upload-only version.
11. Current Cloudflare Worker Previews (новый отдельный mechanism) предоставляют separate settings/resources and are recommended for isolated branch testing, но требуют Wrangler `4.135.0+`; repository сейчас pinned `4.130.0`. Это возможный future solution space, **не отдельный finding и не требование H4 remediation способа**.
12. `WORKER-VERSION-URL-01` **не current-scope**, потому что единственный подтверждённый activation path — manual `production-worker-rollout.yml`, а Stage 6 external integration paused. До dispatch/upload current local/CI product path не создаёт такой external ingress.
13. Blocker становится correction gate **до следующего Stage-6 Worker version upload с `WEB_HYPERDRIVE`/private production capability**. H4 не выбирает implementation fix; remediation остаётся отдельной задачей.
14. Current `Previews Base` historical zero-bindings state относится к new/branch preview configuration and does not neutralize Version URL semantics: Cloudflare отдельно указывает, что Version URLs use the resources configured for the Worker version. Exact mutable Previews Base/Access state — **Информация не проверена**.
15. H4 source/workflow/scripts были прочитаны; external upload/deploy/smoke не запускались.
16. Следующий slice — H5 deployment/version/rollback repository gates. `WORKER-VERSION-URL-01` в H5 не дублировать; H5 проверяет остальные rollout gates.

### `WORKER-VERSION-URL-01` — Moderate/P2 — deferred Stage-6 blocker

**Root cause:** protected rollout использует public-capable Version URL как pre-traffic smoke surface для version, которая уже содержит production `WEB_HYPERDRIVE`/auth configuration; workflow не устанавливает и не проверяет isolation/Access boundary для этого URL.

**Stage:** deferred Stage 6; не current-scope пока rollout paused.

**Correction gate:** до следующего schema/auth/forum-capable external Worker upload.

Проверенная current official Cloudflare evidence:
- Versions & Deployments: version captures code/configuration/bindings;
- Version URLs / Compare workflows: Version URL uses that version's production resources and is public when enabled; Access is separate;
- Worker Previews: isolated Preview settings/resources are separate from Version URLs; Preview URLs also public by default unless protected;
- Wrangler configuration: `preview_urls` is an explicit mutable setting; omission does not force isolation.

## Цель

Проверить current Cloudflare Workers/runtime foundation так, чтобы:

1. разные runtime capabilities не смешивались через binding/configuration fallback;
2. Worker ingress и platform-derived metadata не доверяли browser-controlled данным как infrastructure authority;
3. preview/version/public entrypoints не получали private/write production capability через repository-конфигурацию или текущий runtime composition;
4. runtime failure/observability paths не раскрывали secrets/private internals и не превращали auxiliary telemetry в veto/fail-open boundary;
5. repository deployment/version/rollback gates не позволяли обойти exact-revision и traffic-isolation invariants;
6. будущие Stage-6 topology/Access/Owner-isolation задачи не объявлялись current defects только потому, что их ещё нет.

Block H проверяет **Cloudflare/Workers/runtime root causes**, а не заново application authz, database grants, attachment semantics, secret lifecycle или future infrastructure design.

## Current Stage boundary

### В current scope

1. Current Worker entrypoint/composition `workers/app.ts` и request-scoped context wiring.
2. Current repository Worker configuration `wrangler.jsonc`.
3. `HYPERDRIVE` / `WEB_HYPERDRIVE` binding separation, fail-closed lookup и current local/CI wiring.
4. Current code handling platform ingress metadata where correctness/security depends on distinguishing Cloudflare-provided context from request headers.
5. Current Worker failure boundaries before/around Router: dependency outage classification, response preservation, telemetry/fact flush isolation.
6. Repository-visible preview/version/production rollout contract: manual exact-main/SHA gate, Version URL smoke, promotion, status assertion and rollback logic.
7. Current local/CI Workers smoke path where it is evidence for runtime composition or isolation.
8. Current repository assumptions about workers.dev/version URLs, preview bindings and production binding names **only to the extent represented in code/config**.

### Не считать current finding само по себе

1. Stage 6 external integration paused и current deployed Worker намеренно может отставать от `main`.
2. `WEB_HYPERDRIVE` ещё не принят как deployed production Worker binding.
3. Mutable Cloudflare dashboard topology, Environment protections, current Worker traffic/version, preview bindings, routes/domains и live Hyperdrive configuration без отдельной live read-only Stage-6 recheck.
4. Отсутствие отдельного Owner Worker, Cloudflare Access, separate Owner auth/session/DB plane или route concealment: это Block A / Stage-6 design boundary.
5. Реальные Google OAuth credentials, callbacks и provider configuration: Block B / External integrations.
6. Real R2 bucket policy/attachment storage semantics: Block F / Stage-6 acceptance.
7. Secret placement/rotation/GitHub Environment secret lifecycle как самостоятельный root cause: Block I.
8. Production observability tuning, alerting и incident-response completeness без current runtime exploit path: future monitoring/incident-response block.
9. Любая новая Cloudflare hardening идея без достижимой current repository/runtime path.

Для mutable external утверждений без отдельной разрешённой проверки использовать: **«Информация не проверена»**.

## Anti-duplication boundary

1. Owner/Super-admin isolated Worker, Access, privileged auth/session/DB/deploy plane → Block A.
2. Authentication/session/cookie/OAuth semantics → Block B.
3. Application permission/IDOR/Owner authority → Block C.
4. Admin/Complaint private projections → Block D.
5. Public request validation/cache/business logic/DoS root cause в application layer → Block E.
6. Attachment/R2 object admission/content/storage authority → Block F.
7. PostgreSQL roles/grants/migrations/transactions/destructive DB tooling → Block G.
8. `DB-RUNTIME-EVIDENCE-01` already confirmed Stage-6 blocker → reference only, never duplicate in H.
9. Secrets, GitHub Actions token/Environment lifecycle, dependency provenance → Block I unless Worker/runtime behavior itself is the root cause.
10. Providers/Queues/callback integrations → future external-integrations block.
11. Generic brute-force/resource exhaustion → future abuse/availability block.
12. Monitoring retention/incident response → future monitoring block.

## План проверки

### H1 — Worker composition & binding isolation

1. `HYPERDRIVE` and `WEB_HYPERDRIVE` must remain distinct capabilities with no fallback in either direction.
2. Every current Worker adapter must receive the intended connection string; no web/auth/admin/private adapter may accidentally use localization-read.
3. Missing/blank required DB binding must fail closed before application handling rather than silently degrading into a broader/narrower capability.
4. Disabled runtime capabilities, especially content generation, must not become reachable through composition drift.
5. Current Worker must not obtain migrator/admin database capability through runtime binding composition.
6. H1 is repository/local-CI only; no live Hyperdrive or Worker mutation.

### H2 — Ingress trust & source attribution

1. Distinguish Cloudflare runtime metadata from browser-controlled forwarding headers.
2. Check `cf-connecting-ip`, `x-real-ip`, `cf-worker`, subrequest/cross-zone and Pseudo IPv4 assumptions used by current security telemetry/rate-limit inputs.
3. Browser/Node requests must not forge a trusted infrastructure source merely by setting Cloudflare-looking headers.
4. Do not duplicate Block B auth rate-limit semantics; H2 root cause must be ingress/runtime trust.

### H3 — Runtime configuration and optional binding failure

1. Validate required/optional env/binding behavior at Worker startup/request composition.
2. Missing private storage/optional resources must produce controlled unavailable behavior rather than authority fallback.
3. Verify production-only assumptions are not silently imported into ordinary preview/local paths.
4. Secret values themselves remain Block I; H3 checks only runtime use/failure boundaries.

### H4 — Preview, Version URL and public entrypoint isolation

1. Repository config must not intentionally grant preview/version paths private/write production capability without an explicit isolation boundary.
2. Check workers.dev/version URL assumptions, route/domain composition and whether version smoke can expose protected data beyond intended GET-only checks.
3. Current same-origin Admin/Super-admin routing foundation is not a separate ingress boundary; future cross-origin/Owner Worker activation is Stage 6 / Block A.
4. Mutable dashboard state remains **Информация не проверена** without live read-only recheck.

### H5 — Worker deployment/version/rollback repository gates

1. Manual main/exact-SHA/run-attempt/confirmation boundary before protected Environment access.
2. Uploaded version identity must be tied to the authorized revision and validated before promotion.
3. Promotion must target only the run-created version; post-promotion status must prove exact 100% traffic state.
4. Rollback must restore the accepted exact baseline and verify it, including failure of status/assertion paths.
5. Reference `DB-RUNTIME-EVIDENCE-01` for schema evidence; do not duplicate it.
6. No dispatch, version upload or production traffic mutation during H5 audit.

### H6 — Runtime failure, cache and observability boundaries

1. Classified dependency outages must fail closed without leaking private error details.
2. Unexpected programming/configuration errors must not be reclassified as authorization success/empty data.
3. Best-effort telemetry/auth-fact failures must not replace or veto the original request result where contract says auxiliary.
4. Runtime response/cache semantics are checked only where root cause is Worker-wide composition; route-specific cache findings stay in earlier blocks.
5. Observability must not capture request URLs/query strings/secrets where current code/config claims redaction/minimization.

### H7 — Runtime topology Stage boundary

1. Reconcile repository runtime assumptions with current project contract without live mutation.
2. Identify only repository defects that already affect current local/CI/runtime path.
3. Record separately any blocker that becomes active only when Stage 6 resumes: preview/private-data isolation, real web Hyperdrive binding, Access/Owner isolation, real routes/domains/deployed calibration.
4. Do not implement or provision future topology.

### H8 — Cross-chain closeout

1. Re-run ingress → Worker composition → bindings → request context → response/telemetry and repository rollout chains.
2. Deduplicate H findings against Blocks A–G and deferred Stage-6 blockers.
3. Every candidate must have current Stage, attacker/capability/input path and observable security impact.
4. Separate current repository defect from paused external acceptance.
5. Remediation does not start automatically.

## Основные current code seams

1. `wrangler.jsonc`
2. `workers/app.ts`
3. `workers/database-bindings.ts`
4. `workers/app.test.ts`
5. `workers/database-bindings.test.ts`
6. `app/observability/attempt-source.ts`
7. current attempt/fact collector runtime seams used from Worker entrypoint
8. `.github/workflows/ci.yml`
9. `.github/workflows/production-worker-rollout.yml`
10. `.github/scripts/production-worker-rollout.mjs`
11. `.github/scripts/production-worker-rollout.test.mjs`
12. `scripts/smoke-workers.sh`
13. `scripts/smoke-production-worker.sh`
14. relevant generated Worker/env typing and current route/runtime configuration.

Список — starting map, не гарантия finding и не разрешение расширять H в unrelated application/security domains.

## Evidence hierarchy

1. Current `main` Worker/config/runtime code and tests.
2. Current local/CI Workers behavior where executable without external mutation.
3. Repository deployment/workflow contracts.
4. Current official Cloudflare documentation for exact behavior that materially affects a candidate finding.
5. Historical external evidence only for already recorded past acceptance.
6. Mutable Cloudflare live state only after separately authorized read-only Stage-6 check.

Green CI or historical acceptance alone do not prove current security correctness.

## Критерий Block H finding

Finding фиксируется только если одновременно установлены:

1. concrete current Worker/runtime/repository path;
2. violated current security/runtime contract;
3. reachable actor/input/configuration/capability state;
4. causal chain to observable security impact;
5. root cause belongs to Cloudflare/Workers/runtime rather than an earlier/later block;
6. issue belongs to current Stage rather than only paused Stage-6 external topology.

## Критерий завершения Block H

1. H1–H8 пройдены против зафиксированного stable current-main target либо явно описанного descendant.
2. Worker composition, ingress trust, binding isolation, preview/version exposure, deployment gates and runtime failure behavior checked as one chain.
3. Every finding has causal path, impact, severity and Stage classification.
4. Mutable external claims not verified live are marked **«Информация не проверена»**.
5. Deferred Stage-6 blockers are kept separate from current findings.
6. Remediation starts only as a separate bounded correction task after audit findings are confirmed.

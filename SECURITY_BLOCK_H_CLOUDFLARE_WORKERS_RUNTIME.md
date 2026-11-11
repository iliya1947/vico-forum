# Block H — Cloudflare / Workers / runtime security audit

## Статус

1. Bounded audit scope подготовлен 2026-11-11 против `main` `5992885e78b1642e41c9805116fcc256002b649c`; перед H2 current `main` продвинулся до `ce62e783e71433a00c2fe4874ee26dfc54614628` только документационным SA-03 closeout #326, без изменений H runtime/ingress source.
2. Block G закрыт: 3 current-scope findings; `DB-RUNTIME-EVIDENCE-01 Low/P3` сохранён отдельно как Stage-6 blocker и в H не дублируется.
3. **H1 — Worker composition & binding isolation завершён: PASS, 0 current-scope findings.**
4. **H2 — Ingress trust & source attribution завершён: PASS, 0 current-scope findings.**
5. **H3 — Runtime configuration and optional binding failure завершён: PASS, 0 current-scope findings.**
6. **H4 — Preview, Version URL and public entrypoint isolation завершён: 0 current-scope findings + 1 deferred Stage-6 blocker `WORKER-VERSION-URL-01 Moderate/P2`.**
7. **H5 — Worker deployment/version/rollback repository gates завершён: 0 current-scope findings + 1 deferred Stage-6 blocker `WORKER-ROLLBACK-FINALIZER-01 Moderate/P2`.**
8. **H6 — Runtime failure, cache and observability boundaries завершён: PASS, 0 current-scope findings, 0 новых deferred blockers.**
9. **H7 — Runtime topology Stage boundary завершён: PASS, 0 current-scope findings, 0 новых deferred technical blockers.**
10. **H8 ещё не выполнялся.**
11. Следующий bounded slice после продолжения владельца — **H8: Cross-chain closeout**.
12. Мира — auditor/coordinator. Remediation, technical planner и implementer не назначены.
13. Cloudflare/production mutation, deployment, binding changes и live topology checks не выполнялись.

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

## H5 — результат

1. Verdict на current `main` `ce62e783e71433a00c2fe4874ee26dfc54614628`: **0 current-scope findings; 1 deferred Stage-6 blocker — `WORKER-ROLLBACK-FINALIZER-01 Moderate/P2`.**
2. Exact-revision admission itself PASS: GitHub `workflow_dispatch` fixes `GITHUB_SHA` to the selected ref; workflow additionally requires `GITHUB_REF=refs/heads/main`, `GITHUB_RUN_ATTEMPT=1`, exact `expected_sha == GITHUB_SHA`, 40 lowercase hex chars and explicit upload/promotion confirmations before Cloudflare Environment access.
3. Verify/rollout jobs independently checkout exact `expected_sha` and compare `git rev-parse HEAD`; rollout also verifies pinned `wrangler@4.130.0`. Main moving after dispatch does not silently change the artifact being built.
4. Upload identity PASS: exact pinned Wrangler structured output must contain exactly one `version-upload` record with UUID version ID; that ID is carried through job output, checked with `wrangler versions view`, then the same ID is the only candidate supplied to promotion.
5. Current Cloudflare model supports this proof: a Worker Version is immutable identity for bundled code/config/bindings, and a Deployment selects which exact version(s) receive traffic. Therefore matching active deployment to the run-created Version ID is meaningful evidence.
6. Baseline precondition PASS/fail-closed: before upload, workflow resolves exactly one full UUID matching accepted `78f87645` prefix and requires current production deployment to contain exactly one positive-traffic version — that baseline at 100%. Missing/ambiguous baseline or split/unexpected traffic stops before upload.
7. Exact `wrangler@4.130.0` source confirms `deployments status --json` returns the latest deployment object directly and `versions deploy <id>@100% -y` creates a deployment for that explicit version. Current `assertSingleVersionDeployment()` rejects wrong ID, split traffic and non-100% traffic.
8. Ordinary promotion failure paths are covered: command failure, production smoke failure, status command failure or status assertion failure set `rollout_failed=true`; workflow then deploys exact stored baseline ID at 100%, re-reads deployment status and requires exact baseline/100% before exiting failed.
9. **Confirmed gap:** promotion + verification + rollback live inside one shell step/job with `timeout-minutes: 20`. Once `wrangler versions deploy "$VERSION_ID@100%"` succeeds, Cloudflare production state persists independently of the GitHub runner.
10. Both `scripts/smoke-workers.sh` and `scripts/smoke-production-worker.sh` use curl requests without an overall `--max-time`; post-promotion smoke can therefore remain blocked until the GitHub job timeout. GitHub documents that a job reaching `timeout-minutes` is automatically cancelled/killed. In that path shell control never reaches the `rollout_failed` rollback branch.
11. The same causal gap exists for manual cancellation, runner loss or process termination after Cloudflare accepted promotion but before rollback/status reconciliation. GitHub cancellation kills the running process tree; no separate `always()` reconciliation job or out-of-band deployment-state finalizer exists.
12. Observable outcome: the new version may remain at **100% production traffic without successful smoke/status acceptance**, with production web/auth capability, while the workflow itself ends timed-out/cancelled/unknown. This violates H5 rollback/verification contract. It is distinct from H4 Version-URL exposure and G4 migration-evidence gap.
13. `WORKER-ROLLBACK-FINALIZER-01` is **deferred Stage 6**, not current-scope: no Cloudflare deployment occurs in current repository/local-CI development and Stage 6 rollout is paused. Correction gate is before any next production traffic promotion.
14. Cloudflare rollback/deploy is itself another external mutation and can fail; H5 does not require impossible atomicity, but an accepted rollout must have an independent bounded reconciliation path that can determine/restore production state after the runner that initiated promotion disappears. Remediation design is not selected during audit.
15. Current migration contract requires application rollback code to remain compatible with already-applied forward schema. Current post-`0020` repository search found no later ALTER of baseline localization tables `locales`, `ui_translations`, `ui_translation_bundles`; no separate current rollback-schema defect was established. `DB-RUNTIME-EVIDENCE-01` remains the existing Stage-6 schema gate and is not duplicated.
16. Exact `wrangler@4.130.0` source also shows `versions deploy` patches configured **non-versioned** settings after deployment (currently observability). Traffic/version rollback therefore does not by itself prove restoration of previous non-versioned observability state. This is handed to **H6**, not classified as a separate H5 finding yet.
17. GitHub API recheck found current `main` branch `protected=false` and repository ruleset `Protect main` with `enforcement=disabled`. That affects source/supply-chain provenance rather than Worker deployment mechanics and belongs to **Block I**; H5 does not duplicate/classify it. Exact collaborators/Actions actor policy and `production-worker` Environment protection rules: **Информация не проверена**.
18. Current GitHub docs confirm any repository user with write access can normally trigger `workflow_dispatch`, while Environment protection can independently gate jobs/secrets. Because exact actor/environment policy is not verified and root cause belongs Block I, no H5 actor finding is created.
19. H5 source/tests/workflows and exact tagged Wrangler `4.130.0` deployment/status source were read. Tests, workflow dispatch, Worker upload, promotion and rollback were **not** executed.
20. Следующий slice — H6 runtime failure/cache/observability. Existing H4/H5/G blockers не дублировать.

### `WORKER-ROLLBACK-FINALIZER-01` — Moderate/P2 — deferred Stage-6 blocker

**Root cause:** production promotion and rollback/reconciliation are coupled to the lifetime of the same GitHub runner/job. After Cloudflare accepts 100% promotion, timeout/cancellation/runner loss can terminate the job before rollback or final deployment-state verification.

**Impact:** an unaccepted Worker version can remain serving 100% production traffic with private/write runtime capability while the rollout run ends without proving either success or restoration.

**Stage:** deferred Stage 6; current local/CI path does not activate it.

**Correction gate:** before the next production traffic promotion.

Проверенная current official evidence:
- GitHub Actions workflow syntax: job `timeout-minutes` automatically cancels the job;
- GitHub workflow cancellation: running step process tree is signalled and then killed;
- Cloudflare Versions & Deployments: deployment determines active traffic and persists independently after creation;
- Cloudflare Rollbacks: rollback creates a new active deployment and itself is an explicit external operation;
- exact tagged `wrangler@4.130.0` source: `versions deploy` calls Cloudflare deployment API, while `deployments status --json` returns latest deployment state.

## H6 — результат

1. Verdict на current `main` `ce62e783e71433a00c2fe4874ee26dfc54614628`: **PASS, 0 current-scope findings, 0 новых deferred Stage-6 blockers**.
2. Worker auth-session outage boundary fail closed: classified PostgreSQL availability/connection/query-timeout failure becomes `AuthSessionUnavailableError`, а Worker отвечает generic `503 Service unavailable` с `Cache-Control: no-store` до Router. Cause/SQL/driver message клиенту не сериализуются.
3. Better Auth registration-policy storage outage также переводится в generic `503` + `no-store`; unexpected schema/config/programming error deliberately rethrows вместо ложного 403/empty-success. Account-security adapters аналогично переводят только classified storage outage в `AccountSecurityError("unavailable")`.
4. Forum/authorization controlled availability paths сохраняют тот же принцип: known dependency outage становится bounded `503`; unexpected errors не маскируются. Exact-Owner Super-admin routes отдельно используют `private, no-store` для document/data и controlled 400/401/403/404/503 responses.
5. React Router server diagnostics не логируют raw exception message/cause/request URL/body: `reportRouteError()` оставляет только error kind, allowlisted PostgreSQL code и максимум 8 source frame locations после удаления message prefix; SSR stream logging оставляет только fixed event/phase/error kind. Unit tests прямо проверяют OAuth/session/cookie/query-like synthetic secrets и multiline fake stack injection.
6. Worker 5xx telemetry пишет только status + bounded latency into `system.requestFailed`; URL, query, body, headers, cookies, actor data и exception text туда не попадают. Write выполняется через `executionContext.waitUntil(...catch(() => undefined))` и не меняет исходный response.
7. Auth-transition facts и auth/access attempt telemetry также request-local/bounded: fact writer failure превращается только в attempt gap, individual attempt writer failure — в bounded gap; sink creation/record/close failures поглощаются. Original authentication/authorization response or exception сохраняется.
8. Current official Cloudflare guidance подтверждает `ctx.waitUntil()` как правильную boundary для logging/analytics after response; work after response имеет bounded 30-second extension and is not durable. Current Vico contract explicitly describes these telemetry streams as best-effort/limited coverage rather than lossless audit, поэтому сам `waitUntil` limit finding не создаёт.
9. Ранний auth-session `503` возвращается до Router и therefore не проходит `recordRequestFailure()`. Это не объявляется H6 defect: `system.requests` contract прямо описан как **recorded 5xx only / limited coverage**, не total error-rate/audit monitor, а этот outage использует тот же web PostgreSQL sink, который сам может быть unavailable. Durable second-sink/full incident coverage belongs later monitoring/incident-response scope.
10. Cloudflare Workers Logs включены repository config через `observability.enabled=true`, `head_sampling_rate=1`, `redact_query_string=true`. Current official docs подтверждают: invocation logs по умолчанию содержат request/response metadata and fetch method/URL; `redact_query_string` removes query strings from logged/traced request URLs. Repository production code does not issue generic raw `console.log/error` outside sanitized server logging.
11. Workers Logs также могут retain uncaught exceptions platform-side. H6 не подтвердил concrete current secret-bearing uncaught path: classified DB/auth outages are converted to generic responses; route/SSR errors are handled/logged through sanitized React Router hooks; missing binding errors expose only binding configuration identity. Therefore no speculative exception-leak finding is created.
12. Exact live Workers Logs retention/access/destinations, current dashboard invocation-log setting and any account-level observability overrides are mutable external state: **Информация не проверена**. Stage 6 paused; no live read/mutation was performed.
13. Exact tagged `wrangler@4.130.0` source confirms `versions deploy` calls `maybePatchSettings()` after deployment and syncs `observability` as a **non-versioned script setting**. Therefore version/traffic rollback by itself does not restore an older observability configuration.
14. На current exact repository config это не образует отдельного security blocker: desired setting being applied is observability enabled, full sampling and query-string redaction; no tail/log destinations are configured, and no demonstrated weaker baseline state/security impact exists. Stage-6 acceptance must nevertheless verify final observability state after rollout/rollback.
15. Failure/cancel ambiguity while applying deployment/non-versioned settings does not create a second H6 finding: lost/unknown post-promotion reconciliation is already the root cause of `WORKER-ROLLBACK-FINALIZER-01`; H6 only extends its evidence with non-versioned observability semantics.
16. Route-specific personalized/public cache defects already confirmed as `AUTH-CACHE-01` / `READSTATE-CACHE-01` remain in Blocks B/E. H6 found no additional Worker-wide cache authority/fallback root cause and does not duplicate them.
17. H6 source/tests and exact Wrangler source were read; tests were **not run**. No Cloudflare logs, dashboard settings, deployment or Hyperdrive state was mutated or live-read.
18. Следующий bounded slice — H7 Runtime topology Stage boundary.

Проверенная current official external evidence:
- Cloudflare Workers Logs — invocation logs are emitted by default when Workers Logs is enabled, include request/response metadata, and can be disabled explicitly;
- Cloudflare observability config/API — `redact_query_string` removes query strings from logged/traced request URLs; sampling `1` means 100%;
- Cloudflare Workers best practices/limits — `ctx.waitUntil()` is for non-response-critical logging/analytics and extends post-response work for up to 30 seconds;
- exact tagged `wrangler@4.130.0` source — `versions deploy` patches observability/logpush/tail consumers as non-versioned settings after creating deployment.

## H7 — результат

1. Verdict на current `main` `593a03964b8407b249f7c9f5eb117ddb8b07736d`: **PASS, 0 current-scope findings, 0 новых deferred technical Stage-6 blockers**.
2. Delta `ce62e783… → 593a0396…` — SA-04 A1 #327: migration `0065_sa04_account_state_foundation`, schema + DB tests/manifest. Worker entrypoint, Wrangler/runtime topology config, rollout workflow, ingress/routing and H1–H6 seams не менялись; H conclusions сохраняются.
3. Ordinary PR CI не имеет Cloudflare deployment path: Worker acceptance uses local `vite preview` with disposable PostgreSQL Hyperdrive overrides. Repository search не нашёл `wrangler deploy`, `wrangler preview`, `cf previews deploy`, Deploy Hooks, Builds-connect commands или direct Cloudflare API deployment path вне protected manual Worker rollout.
4. Единственный repository production Worker mutation path остаётся `.github/workflows/production-worker-rollout.yml`: manual `workflow_dispatch`, protected `production-worker` Environment, `wrangler versions upload` and optional exact-version deployment. Therefore ordinary merge/local-CI does not itself activate production runtime.
5. Current `wrangler.jsonc` top-level topology declares Worker name/entrypoint/observability and two production Hyperdrive IDs only. It contains **no** `env`, `previews`, `routes/route`, `r2_buckets`, Queues, runtime `vars`, `workers_dev` or `preview_urls` declarations.
6. Current Cloudflare Wrangler contract: with no `route/routes`, omitted `workers_dev` defaults to true; omitted `preview_urls` does **not** force a value and leaves an existing setting unchanged. Therefore Git alone cannot prove current production/Preview URL state. This matches project source-of-truth: external topology is mutable and must be re-read immediately before Stage-6 action.
7. Current Cloudflare routing docs confirm `workers.dev`, Custom Domains and Routes are independent inbound endpoint classes. Historical project evidence says production/preview `workers.dev` enabled and custom domains/routes absent; exact live state now: **Информация не проверена**.
8. Current Cloudflare Builds docs confirm that if a Git repository is connected and its production branch build is enabled, pushes to that branch execute build + deploy; preview builds can independently create Preview deployments. Historical project evidence says native Git Builds was disabled, but repository cannot enforce/dashboard-prove that state. Exact live Builds/branch-control state now: **Информация не проверена**.
9. New Cloudflare Worker Previews use a separate `previews` configuration/resources and do not use production settings; existing Workers connected before the Preview migration can remain on the previous preview model until a one-time switch. Repository currently has no `previews` block and pinned Wrangler `4.130.0`; it does not invoke the new Preview command. This is not a current defect and does not prescribe the H4 remediation design.
10. H4 already owns the proven technical defect that current manual rollout uses a public-capable production-resource Version URL. H7 does **not** duplicate it as a generic preview-topology finding.
11. Source-of-truth requires final preview/private-data isolation recheck before any auth/forum write-capability rollout. Because Stage 6 is paused and this is explicitly an external acceptance step, absence of a live recheck **today** is not a current defect and does not create a new blocker ID. Before Stage 6 resumes, that recheck remains mandatory.
12. That Stage-6 topology recheck must establish at least: native Builds/auto-deploy state; active production deployment/version; production binding/var/secret set; Preview model and Preview/Version URL exposure; Previews Base/Preview resources; custom domains/routes; `workers.dev` production/preview settings; unexpected alternate deployment entrypoints. H7 does not perform these external reads.
13. `WEB_HYPERDRIVE` is present in repository production config but source-of-truth still records the real production Hyperdrive as unbound/inactive. Repository config presence is preparation, not evidence of deployed binding. Actual binding/deadline/runtime calibration remains Stage-6 acceptance; no current H7 finding.
14. `ATTACHMENT_R2`, real Google OAuth values, `VICO_OWNER_USER_ID`, Queues/providers and separate Owner infrastructure are not declared as completed deployed topology. Their absence is already an explicit Stage-6 boundary, not a current H defect.
15. Current React Router registers public/forum/Admin/Super-admin routes in the same Worker. `AdministrativeRouting` only separates **outgoing address families**; default Super-admin URLs remain same-origin and exact Owner admission remains application-side. Separate Owner Worker/Access/auth-session/DB/deploy capability isolation is explicitly future Block-A/Stage-6 work and is not duplicated as H7 defect.
16. Production `workers.dev` being public is not itself a H7 security finding: Vico is a public forum, and current contract does not require a custom domain before pre-release. Cloudflare recommends routes/custom domains for business-critical production, but that recommendation alone is not a current project security requirement.
17. Existing deferred correction gates remain unchanged: `DB-RUNTIME-EVIDENCE-01` before schema-dependent Worker rollout; `WORKER-VERSION-URL-01` before write/private-capable Worker upload; `WORKER-ROLLBACK-FINALIZER-01` before production traffic promotion.
18. Current main exposes a separate non-H contradiction: code/migration history now contains `0065_sa04_account_state_foundation`, while `PROJECT_STATE.md`, `ROADMAP.md` and `docs/SUPER_ADMIN.md` still describe repository migration history through `0064` / SA-04+ as not implemented. H7 does not choose or repair that product-documentation state; the shared Stage-6-paused/topology boundary is consistent across those documents and sufficient for this H verdict.
19. H7 source/config/workflows were read; current official Cloudflare Wrangler/routing/Builds/Worker-Previews documentation was rechecked. No live Cloudflare read, upload, deployment, binding, route, Build setting or secret mutation was performed.
20. Следующий bounded slice — H8 Cross-chain closeout.

Проверенная current official external evidence:
- Wrangler configuration — `workers_dev` default and `preview_urls` omission semantics;
- Routes and domains — independent `workers.dev`, Routes and Custom Domains endpoints;
- Workers Builds branch control — production branch pushes can build/deploy when connected/enabled;
- Worker Previews configuration — Preview-specific settings/resources are separate from production and existing Workers may require an explicit one-time switch.

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

# Block H — Cloudflare / Workers / runtime security audit

## Статус

1. Bounded audit scope подготовлен 2026-11-11 против current `main` `5992885e78b1642e41c9805116fcc256002b649c`.
2. Block G закрыт: 3 current-scope findings; `DB-RUNTIME-EVIDENCE-01 Low/P3` сохранён отдельно как Stage-6 blocker и в H не дублируется.
3. **H1 — Worker composition & binding isolation завершён: PASS, 0 current-scope findings.**
4. **H2–H8 ещё не выполнялись.**
5. Следующий bounded slice после продолжения владельца — **H2: Ingress trust & source attribution**.
6. Мира — auditor/coordinator. Remediation, technical planner и implementer не назначены.
7. Cloudflare/production mutation, deployment, binding changes и live topology checks не выполнялись.

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

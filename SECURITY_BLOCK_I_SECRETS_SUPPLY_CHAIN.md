# Block I — Secrets & supply chain security audit

## Статус

1. Scope подготовлен 2026-11-12 против current `main` `593a03964b8407b249f7c9f5eb117ddb8b07736d`.
2. Block H закрыт; его deferred blockers в I не дублируются.
3. **I1–I8 ещё не выполнялись.**
4. Следующий bounded slice после продолжения владельца — **I1: Repository authority & main provenance**.
5. Мира — auditor/coordinator. Remediation, technical planner и implementer не назначены.
6. Production/Cloudflare/Neon/GitHub settings mutation, secret rotation и workflow dispatch не разрешены и не выполнялись.

## Цель

Проверить, что repository/workflow/dependency supply chain или случайная утечка secret не позволяют:

1. незаметно изменить trusted code/release revision;
2. получить privileged GitHub token, Environment secret или deployment credential из less-trusted event/branch/PR;
3. подменить dependency, Action, container/toolchain или install input без обнаруживаемой provenance boundary;
4. вынести secret через logs/artifacts/cache/temp files/build/Pages;
5. использовать stale/over-scoped credential после bounded operation;
6. обойти уже проверенные Stage-6 deployment/DB gates через supply-chain authority.

## Scope-preparation facts — **не findings**

1. Repository public.
2. GitHub API: current `main` имеет `protected=false`; ruleset `Protect main` — `enforcement=disabled`.
3. Текущий main commit имеет `verified=true`; это факт только об одном commit, не policy.
4. Workflow search не нашёл `pull_request_target`, `workflow_run`, `repository_dispatch`.
5. Все current workflow `uses:` refs pinned к full commit SHA.
6. PostgreSQL service jobs используют mutable image tag `postgres:17`.
7. `package.json` pins direct packages, Node и `pnpm@12.3.4`; CI использует `pnpm install --frozen-lockfile`.
8. `pnpm-lock.yaml` committed; current tree не содержит `.npmrc`, Dependabot/Renovate config или CODEOWNERS.
9. `.gitignore` исключает `.env*` и `.dev.vars*`, кроме пустого `.env.example`.
10. Production workflows используют named GitHub Environments. Exact reviewers/branch policy/admin bypass/secret inventory/actor access: **Информация не проверена**.
11. `codex-service-channel-bridge.yml`: `issue_comment` + `contents: write`, exact PR #147 and exact bot filter, push только service branch. Полная trust chain — I2.
12. `ui-preview-pages.yml`: `pages: write` + `id-token: write`; branch/artifact/deploy authority — I2.
13. Secret values не читались и в audit-файлы не переносятся.

## Current scope

1. Repository authority: collaborators/roles, branch/ruleset/merge provenance, direct push and release-authoritative main.
2. Workflow events/ref trust, untrusted event fields, shell/script interpolation.
3. Effective `GITHUB_TOKEN`, Pages/OIDC/write permissions and cross-workflow authority.
4. Environment secret admission: reviewers, protected refs, bypass, actor access.
5. Secret custody: env/argv/temp/log/artifact/cache/build exposure and cleanup.
6. Dependency/lock/registry/lifecycle-script provenance.
7. GitHub Action and container/tool image provenance.
8. Generated artifacts/Pages only where they can affect trusted release or expose secret.
9. Security/update automation only where it changes a demonstrated current path.
10. Stage-6 credentials only for custody/scope/lifetime; provider runtime semantics remain Block J.

## Не считать current finding само по себе

1. Public repository.
2. Absence of CODEOWNERS/Dependabot/SBOM/signed-commit requirement/branch protection without a proven current authority path.
3. Mutable version/tag merely because a stricter pin is possible.
4. Presence of Environment secret/long-lived credential if access/scope/lifetime are appropriate and no exposure path exists.
5. Future Stage-6 secrets not provisioned/activated.
6. Generic GitHub/npm/Cloudflare recommendation without Vico causal chain.
7. Abstract Owner-account compromise without repository/workflow weakness.
8. Vulnerable package not applicable/reachable in current path.

## Anti-duplication

1. Block A — Owner auth/Access/runtime isolation.
2. Block B — Better Auth/OAuth/session semantics; I only secret provenance/custody.
3. Block G — SQL/migration/role correctness; I checks who can alter trusted workflow/credential path.
4. Block H — Worker routing/deploy mechanics; I checks authority/provenance driving those mechanics.
5. Block J — provider credentials/callback/runtime behavior.
6. Block L — monitoring/incident response unless root cause is secret exposure.
7. One root cause → one finding ID.

## План проверки

### I1 — Repository authority & main provenance

1. Current collaborators/roles and actual write paths to `main`.
2. Disabled ruleset/unprotected main + merge settings + direct push + required checks + commit verification policy.
3. Concrete less-trusted actor/input → trusted main path.
4. `protected=false` / disabled ruleset remain candidate evidence until causal chain is proven.

### I2 — Workflow events, tokens & write authority

1. All triggers and event trust levels.
2. Effective token permissions.
3. Checkout ref/SHA and event-field trust.
4. Codex bridge bot/comment/branch-push boundary.
5. Pages OIDC/pages-write artifact provenance.
6. Dangerous cross-event patterns with write/secrets.

### I3 — Production Environments & secret admission

1. Environment policy without reading secret values.
2. Reviewers, protected refs, admin bypass, dispatch/approval authority.
3. Guard → Environment → secret-use chain for each privileged workflow.
4. Consumed/one-shot workflows and unintended reusable authority.
5. Unreadable mutable external policy → **Информация не проверена**.

### I4 — Secret custody & leakage

1. Current-tree/history-sensitive secret material.
2. Env/argv/temp/log/artifact/cache exposure.
3. Cleanup on success/failure/cancel.
4. Build/Pages/client exposure of server-only env.
5. Rotation/lifetime where current contract relies on bounded use.

### I5 — Dependency & install provenance

1. Exact package/lock/frozen-install boundary.
2. Registry assumptions/config.
3. Install lifecycle scripts and executable transitive packages.
4. Lockfile resolution/integrity/update authority.
5. Advisories only after exact-version/path applicability is established.

### I6 — Actions, tools & containers

1. Full-SHA Action provenance.
2. Action security-sensitive inputs/transitive behavior.
3. Mutable `postgres:17` and other image/tool inputs.
4. Wrangler/Node/pnpm/external binary pinning/fetch.
5. No finding for stricter pinning alone.

### I7 — Release/deployment supply-chain cross-check

1. main provenance → production DB workflows → Worker rollout.
2. Can repository change bypass review/checks then reach Environment?
3. Can workflow/script change exfiltrate secrets before H/G guards matter?
4. Dedup existing G/H blockers.
5. Stage-6-only activation remains deferred unless repository authority is already unsafe now.

### I8 — Cross-chain closeout

1. source → install → CI → protected secret admission → external mutation.
2. Dedup A–H/J/L.
3. Stage/severity validation.
4. Record correction gates; remediation remains separate.

## Finding criteria

I finding requires all of:

1. concrete current repository/workflow/dependency path;
2. less-trusted actor/input/package/action or accidental secret path crosses a trust boundary;
3. observable impact: unauthorized trusted-code/provenance change, credential exposure/use, artifact substitution or protected-gate bypass;
4. root cause is I, not an earlier Block;
5. current Stage affected; future activation alone is classified separately.

## Ограничения

1. Не читать/публиковать secret values.
2. Не dispatch'ить production workflows и не менять repository/Environment/ruleset settings.
3. Не вращать credentials и не создавать test secrets.
4. Не выполнять unreviewed dependency updates/install experiments.
5. Scope preparation ничего не запускал.
6. PR comments пока не использовать: над #315 работает одна Мира.

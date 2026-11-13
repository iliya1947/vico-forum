# Block I — Secrets & supply chain security audit

## Статус

1. Scope подготовлен 2026-11-12 против current `main` `593a03964b8407b249f7c9f5eb117ddb8b07736d`.
2. Block H закрыт; его deferred blockers в I не дублируются.
3. **I1 — Repository authority & main provenance завершён: 1 current-scope finding — `REPO-MAIN-GATE-01 Moderate/P2`.**
4. **I2–I8 ещё не выполнялись.**
5. Следующий bounded slice после продолжения владельца — **I2: Workflow events, tokens & write authority**.
6. Мира — auditor/coordinator. Remediation, technical planner и implementer не назначены.
7. Production/Cloudflare/Neon/GitHub settings mutation, secret rotation и workflow dispatch не разрешены и не выполнялись.

## I1 — результат

1. Verdict на current `main` `593a03964b8407b249f7c9f5eb117ddb8b07736d`: **1 current-scope finding — `REPO-MAIN-GATE-01 Moderate/P2`.**
2. GitHub branch metadata сообщает `main.protected=false`. Repository ruleset `Protect main` существует, targets default branch, но `enforcement=disabled`.
3. Disabled ruleset содержит именно intended integrity gates: pull-request requirement, block deletion/non-fast-forward and strict required status checks `checks` + `database`. Поскольку ruleset disabled, эти правила не enforce'ятся.
4. Repository merge settings разрешают squash merge and disable merge/rebase/auto-merge, но это только PR merge mode; direct branch update при отсутствии branch/ruleset protection ими не запрещён.
5. Current CI workflow запускается только на `pull_request`. Следовательно direct update `main` не проходит обязательные `checks` / `database` CI jobs через этот workflow.
6. Concrete delegated writer path подтверждён без mutation main: connected GitHub integration фактически создаёт/обновляет файлы в repository service branch; connector installation repository metadata reports `push:true` (and `admin:true`). Current GitHub REST contract требует Contents(write) для Create/Update Contents и при omitted `branch` target defaults to repository default branch.
7. Поэтому same delegated repository-write capability технически может update ordinary code/config file directly on unprotected default `main` without PR and without PR-only CI. Дополнительный Workflows(write) permission для этого не нужен, пока изменяется не workflow file.
8. Это не только теоретическая branch setting: последние 100 `main` commits содержат 4 owner-authored direct GitHub web updates `AGENTS.md` без PR-number commit subject; 96/100 имеют PR-like `(#N)` subject. То есть direct-main path уже фактически использовался, хотя observed direct commits были owner-authorized.
9. Все последние 100 commits `verified=true`, включая direct web edits. Поэтому GitHub verified signature текущего history не является review/CI provenance proof: GitHub-signing подтверждает commit source/signature, но не то, что change прошёл PR/check gates.
10. Current latest main commit likewise verified and is PR-like; finding не утверждает, что current main уже malicious/incorrect. Root cause — отсутствие enforcement, позволяющее delegated write identity bypass'ить current review/CI boundary.
11. Current `ui-preview-pages.yml` запускается на push в `main`, builds repository content and deploys GitHub Pages with `pages:write` / `id-token:write`. Поэтому direct unreviewed main update имеет current external effect path: изменённый UI-preview source может автоматически стать public Pages artifact без PR CI gate.
12. Production Worker/DB deploy автоматически не запускается от main push; Stage 6 paused. Поэтому I1 не заявляет current production compromise и severity остаётся Moderate/P2, а не P1/P0.
13. Exact human collaborator roster endpoint недоступен текущему connector read surface; owner permission отдельно подтверждена как `admin`, `chatgpt-codex-connector[bot]` user permission returns `none`. **Информация не проверена** для возможных иных human collaborators/roles.
14. Branch-protection detail endpoint вернул 403 для integration, но branch object `protected=false` plus repository ruleset detail `enforcement=disabled` дают достаточный repository-state evidence. Finding не зависит от неизвестного human collaborator roster, потому что delegated repository-write integration path already exists.
15. No separate finding for lack of required approvals, CODEOWNERS or signed-commit policy: их отсутствие не нужно для causal chain и не размножается как hardening findings.
16. Remediation не начиналась. I1 only records defect; technical solution must be selected in separate remediation task.
17. I1 tests/workflows/settings changes не выполнялись; main/ruleset/Environment state не mutated.
18. Следующий bounded slice — I2 workflow events/tokens/write authority. I2 должен проверить, создаёт ли какой-либо current workflow второй independent write-escalation path; `REPO-MAIN-GATE-01` не дублировать.

### `REPO-MAIN-GATE-01` — Moderate/P2

**Root cause:** release-authoritative default branch `main` has no active branch/ruleset enforcement, while a delegated repository integration has Contents-write capability and repository CI is PR-only.

**Current impact:** a delegated write-capable identity can alter trusted `main` code/config without PR/status-check enforcement; a main push also feeds the current public GitHub Pages deployment path.

**Boundary:** no automatic production Worker/DB rollout from push was established; Stage 6 remains paused.

Проверенная current official GitHub evidence:
- protected branches/rulesets are the controls that enforce pull-request/status-check requirements on branch updates;
- disabled rulesets do not enforce their configured rules;
- REST Create/Update Contents accepts GitHub App installation/user tokens with Contents(write), and omitted `branch` defaults to the repository default branch;
- rulesets apply to REST content/Git reference updates when enforced.

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

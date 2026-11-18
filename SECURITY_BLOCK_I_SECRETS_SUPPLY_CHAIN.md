# Block I — Secrets & supply chain security audit

## Статус

1. Scope подготовлен 2026-11-12; current I6 audit target — `main` `7cc23edede57994cdedab49c1556ddb55034dd29`.
2. Block H закрыт; его deferred blockers в I не дублируются.
3. **I1 — Repository authority & main provenance завершён: 1 current-scope finding — `REPO-MAIN-GATE-01 Moderate/P2`.**
4. **I2 — Workflow events, tokens & write authority завершён: PASS, 0 новых current-scope findings.**
5. **I3 — Production Environments & secret admission завершён: PASS по repository-side chain, 0 новых current-scope findings; exact mutable GitHub Environment policy и secret inventory/location — `Информация не проверена`.**
6. **I4 — Secret custody & leakage завершён: PASS, 0 новых current-scope findings и 0 новых deferred blockers.** Current tree / production Actions logs / production artifacts / exact current-main Pages artifact не подтвердили secret leakage; live `vico_forum_web` остаётся LOGIN-role без password expiry, но единственный current Neon project member — Owner/Admin, поэтому plaintext SQL-Editor-history risk не образует proven less-trusted access path.
7. **I5 — Dependency & install provenance завершён: 1 current-scope finding — `CI-PYPI-PROVENANCE-01 Low/P3`; 0 новых deferred blockers.** Node/pnpm dependency chain PASS; Python browser acceptance installs exact Playwright but resolves unhashed floating transitives online on every run.
8. **I6 — Actions, tools & container provenance завершён: 1 current-scope finding — `CI-POSTGRES-IMAGE-PROVENANCE-01 Low/P3`; 0 новых deferred blockers.** GitHub Actions refs/transitive composite action refs PASS; единственный external service image `postgres:17` остаётся mutable tag и разрешается в digest только во время run.
9. Следующий bounded slice после продолжения владельца — **I7: Release/artifact supply-chain provenance**.
10. Мира — auditor/coordinator. Remediation, technical planner и implementer не назначены.
11. Production/Cloudflare/Neon/GitHub settings mutation, secret rotation и workflow dispatch не разрешены и не выполнялись.

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

## I2 — результат

1. Audit target обновлён до current `main` `7cc23edede57994cdedab49c1556ddb55034dd29`. Delta от I1 target содержит 15 merged commits, включая новые browser/local-CI workflows, но production manual workflow authority и Pages/Codex bridge contracts не были заменены.
2. Verdict: **PASS, 0 новых current-scope findings**. Existing `REPO-MAIN-GATE-01 Moderate/P2` остаётся действующим: current main по-прежнему `protected=false`, ruleset `Protect main` по-прежнему `enforcement=disabled`.
3. Current workflow inventory повторно проверен. Repository не использует `pull_request_target`, `workflow_run` или `repository_dispatch`; privileged cross-event checkout chain не найден.
4. Ordinary CI и все current browser acceptance workflows используют `pull_request` и explicit top-level `permissions: contents: read`. Production secrets/Environment vars в этих PR workflows не используются.
5. GitHub current permission semantics: если workflow явно задаёт один или несколько `permissions`, неуказанные `GITHUB_TOKEN` scopes становятся `none`. Следовательно browser/CI jobs не получают repository write, Pages, OIDC, Actions-write или deployment authority через default token.
6. PR/browser jobs исполняют branch-controlled code (install/build/tests), но только с read-only repository token, disposable PostgreSQL/local synthetic auth/R2 fixtures and no production secrets. No privileged follow-up workflow consumes their uploaded artifacts. Поэтому current untrusted-PR → privileged-token/secret chain не подтверждён.
7. Browser workflows, где используется `github.event.pull_request.head.sha`, передают его через job `env`, а не интерполируют untrusted PR-controlled text напрямую в shell source. Он используется как data/diagnostic identity; independent shell injection root cause не найден.
8. `codex-service-channel-bridge.yml` — единственный current workflow с `contents: write`. Trigger — `issue_comment: created`; GitHub current event contract исполняет `issue_comment` workflow из default branch context, не из PR code.
9. Bridge допускает job только для exact PR #147, open pull request and exact GitHub account `chatgpt-codex-connector[bot]`. Comment body, URL/time/id передаются в shell через intermediate environment variables. GitHub current secure-use guidance прямо рекомендует такой pattern для untrusted context вместо direct ${{ }} substitution в `run`.
10. В bridge body выводится только через quoted `printf '%s\n' "$COMMENT_BODY"`; branch/file/commit target hard-coded to `chatgpt/ui-ux-product-pass` / `.github/ui-ux-service-channel.md`. Workflow не исполняет checked-out branch code, package scripts or comment-derived command/filename/ref. Current comment → shell execution / arbitrary-ref push chain не подтверждён.
11. Bridge write capability не создаёт второй I1 finding: он сам не targeting `main`; риск того, что любой delegated Contents writer может писать в unprotected main, уже полностью owned by `REPO-MAIN-GATE-01`.
12. `ui-preview-pages.yml` intentionally grants `contents: read`, `pages: write`, `id-token: write` and deploys artifact from `main`, `chatgpt/ui-*` pushes (except service branch) or manual dispatch. No repository/provider secret is referenced.
13. GitHub current OIDC contract confirms `id-token: write` only enables requesting an OIDC JWT; by itself it does not grant write access to external resources. No current external cloud trust consuming this Pages OIDC identity was established.
14. Pages build job executes branch-controlled package/build code while workflow-level Pages/OIDC permissions are present. This is broader authority than strict job-level least privilege, but no independent security impact beyond the workflow's explicitly intended public Pages deployment was proven: no production secret, no repository contents-write, and no demonstrated external OIDC trust. **Finding не создаётся**; I7 may re-evaluate only if a later trusted release chain consumes this artifact/identity.
15. `workflow_dispatch` current GitHub contract requires repository write access and can target a selected branch/tag. Every production DB/credential/Worker workflow additionally gates protected job execution to `refs/heads/main`; Worker rollout also binds authorized `expected_sha == GITHUB_SHA`, while credential one-shot paths have run/attempt guards where required.
16. Production workflows explicitly restrict `GITHUB_TOKEN` to `contents: read` or `actions: read + contents: read`. User-provided confirmation/run inputs are placed in environment variables before shell validation rather than directly substituted into executable shell source.
17. Production secrets appear only in jobs declaring named `production-db` / `production-worker` Environments. Whether Environment reviewers/ref restrictions/admin bypass actually prevent an arbitrary repository writer from reaching those secrets/mutations is **not an I2 assumption** and is the dedicated I3 question.
18. Current exact Environment policies/authorized reviewers/secret inventory were not read in I2: **Информация не проверена**.
19. Current repository Actions-global settings (default token policy / fork approval policy) were not required to establish I2 verdict because every sensitive current workflow declares explicit token permissions; mutable settings not exposed by available connector remain **Информация не проверена**.
20. No workflow dispatch, comment event, Pages deployment, production job or settings mutation was executed. Tests were read, not run.
21. Следующий bounded slice — I3 Production Environments & secret admission. Existing `REPO-MAIN-GATE-01` remains one root cause and must not be duplicated.

## I3 — результат

1. Audit target: current `main` `7cc23edede57994cdedab49c1556ddb55034dd29`; I2 workflow inventory reread and all 11 current `production-*.yml` workflows with production Environment/secret use were checked end-to-end.
2. Verdict: **PASS по repository-side admission chain, 0 новых current-scope findings, 0 новых deferred technical blockers.** Existing `REPO-MAIN-GATE-01 Moderate/P2` remains I1 root cause and is not duplicated.
3. Все production workflows, которые получают production secret/variable inputs, запускаются только через `workflow_dispatch`; current GitHub documentation requires repository write access to manually run such workflow and allows selecting a ref for the dispatch.
4. Every secret-consuming production job independently rejects non-`main` execution before protected work: direct jobs use `if: github.ref == 'refs/heads/main'`; one-shot credential paths add pre-Environment guard jobs; Worker rollout uses separate guard + repository verification jobs before the `production-worker` job.
5. `production-db` secret-consuming jobs cover migration/identity/runtime privilege/provisioning and credential diagnostic/bootstrap/recovery paths. `production-worker` secret-consuming work is isolated to the rollout job after exact-main/SHA/confirmation and local verification gates.
6. Pre-Environment guard jobs do not receive production secrets. Bootstrap/recovery/recovery-v2/rollback paths additionally enforce first-run/attempt where their one-shot contract requires it; recovery-v2 verifies same-main validation evidence before Environment access.
7. Current GitHub documentation confirms that configured Environment protection rules must pass before a job referencing the Environment is sent to a runner; Environment secrets become available only after that admission boundary.
8. Exact mutable settings for `production-db` and `production-worker` could not be read through the available GitHub connector, and Browser connector access was unavailable in the current originating context. Therefore required reviewers, prevent-self-review, deployment branch/tag policy, administrator bypass, custom protection rules and exact secret inventory/location are **Информация не проверена**.
9. Secret values were not read. No workflow dispatch, approval, GitHub setting mutation, Cloudflare/Neon action or production operation was performed.
10. Unknown external Environment policy is not classified as a current defect by itself. Stage 6 remains paused; exact Environment policy/secret placement must be re-read immediately before any future production dispatch that depends on those controls.
11. I3 therefore adds no finding and does not change #315 aggregate. Next bounded slice after owner continuation is I4; remediation remains separate.

## I4 — результат

1. Audit target: current `main` `7cc23edede57994cdedab49c1556ddb55034dd29`. Verdict: **PASS, 0 новых current-scope findings, 0 новых deferred technical blockers.**
2. Current-tree scan по production secret names / credential-like patterns не подтвердил committed real credentials. `.env.example` содержит пустые secret placeholders; `.gitignore` исключает `.env*` и `.dev.vars*`, кроме `.env.example`. Найденные hard-coded auth/DB values относятся к synthetic/local/example test fixtures.
3. Production credential scripts используют secrets через environment, не argv, и deliberately map raw failures to bounded stage/reason/compensation codes. Raw URL/password/SCRAM verifier/exception text в их CLI output не выводятся.
4. Historical current production workflow jobs были проверены по доступным GitHub Actions logs: bootstrap, diagnostics, recovery, recovery-v2, Worker rollout, production migration success/failure. В проверенных logs не найдено PostgreSQL URI или SCRAM verifier; GitHub-secret values представлены mask'ами, а Vico-owned output остаётся bounded.
5. Для проверенных production runs GitHub Actions API возвращает **0 uploaded artifacts**. Production migration summary содержит только run/SHA/journal evidence; Worker summary — revision/version/traffic metadata без secret values.
6. Worker rollout создаёт temporary secrets JSON только в `$RUNNER_TEMP`, с `umask 077` / mode 0600 и EXIT cleanup. Current GitHub contract дополнительно очищает `RUNNER_TEMP` в начале/конце job, а `ubuntu-latest` job работает на fresh hosted VM, decommissioned after completion. Concrete persistence/exfiltration path для этого temp file не подтверждён.
7. Exact successful GitHub Pages run для audited main SHA `7cc23ede…` был скачан и распакован. Artifact содержит только static preview files; credential values, PostgreSQL URL, SCRAM verifier, Owner binding или other production secret values не найдены. Bundled JS содержит строковое **имя** `BETTER_AUTH_SECRET` из dependency code, но не значение.
8. Pages workflow не получает production secrets и builds isolated `app/ui-preview`. Current Vite contract exposes client env automatically only for configured prefix (default `VITE_`); preview config does not customize envPrefix and audited artifact contains no `VITE_*` secret values.
9. Current Neon read-only recheck: `vico_forum_web` exists as non-superuser LOGIN role; `rolvaliduntil = NULL`, which PostgreSQL 17 defines as no password expiration. This confirms current credential lifetime is not bounded by `VALID UNTIL`.
10. Repository source-of-truth records that accepted web credential was once entered as plaintext in Neon SQL Editor history. Current Neon project-members query returns one current member with effective Admin access. Therefore no less-trusted Neon principal with access to that history was established; abstract compromise of the Owner/Neon account is outside I finding criteria. No rotation finding is created from history presence alone.
11. Exact current GitHub Environment secret inventory/location and whether consumed temporary secret entries still exist remain **Информация не проверена** because the connector does not expose those settings. GitHub Secret Scanning open-alert state / complete historical repository scan is likewise **Информация не проверена**. Neither unknown state is evidence of an active leak.
12. Secret values were not deliberately read or copied into audit files. No workflow dispatch, secret rotation, settings mutation, production write, Cloudflare mutation or Neon data mutation was performed; Neon checks were read-only metadata/catalog reads.
13. Existing `REPO-MAIN-GATE-01` remains the only Block-I finding so far. I4 does not duplicate I1/I3 or Block-H Version URL/rollback findings. #315 aggregate remains **25 current findings + 3 deferred Stage-6 blockers**.
14. Next bounded slice after owner continuation: **I5 — Dependency & install provenance**. Remediation remains separate.

## I5 — результат

1. Audit target: current `main` `7cc23edede57994cdedab49c1556ddb55034dd29`. Verdict: **1 новый current-scope finding — `CI-PYPI-PROVENANCE-01 Low/P3`; 0 новых deferred technical blockers.**
2. Node/pnpm dependency path PASS. `package.json` pins every direct dependency/devDependency and `packageManager` to exact versions; active workflows use `pnpm install --frozen-lockfile`.
3. Current `pnpm-lock.yaml` was read and parsed as both YAML documents. Package-manager bootstrap has 9 package entries and application lock has 544; **all 553 registry package entries carry sha512 integrity**. Git/VCS, direct tarball, `file:`, `link:` and workspace package sources are absent.
4. Project has no `.npmrc`, pnpmfile hook or repository registry override. Search found no `NPM_CONFIG_REGISTRY` / `pnpm_config_*` override path and no dynamic `pnpm add` / equivalent dependency mutation in current workflows.
5. `pnpm-workspace.yaml` permits dependency build scripts only for `esbuild` and `workerd` via `allowBuilds`. Current pnpm 12 inherits pnpm 11+ supply-chain defaults including a 1-day `minimumReleaseAge` and blocking exotic subdependencies; absence of an explicit `minimumReleaseAge` is therefore not a disabled control.
6. Exact current-main Pages run `44286477786` provides runtime evidence: pnpm reported `Verifying lockfile against supply-chain policies (544 entries)`, PASSed that check, declared the lockfile up-to-date and skipped resolution before build. No Node dependency finding is created.
7. Lack of Dependabot/Renovate, SBOM, CODEOWNERS or `trustPolicy` is not independently classified: no additional concrete current authority/installation path requiring those controls was established.
8. Separate Python browser path is materially different. Fourteen current PR browser workflow files create a fresh venv and execute `pip install playwright==1.62.0`; they do not consume a repository requirements/lock file, local hashes or `--require-hashes`.
9. A successful current browser run was inspected directly: SA08 run `44295360463` installed `playwright==1.62.0` but online resolution selected `pyee 13.0.1`, `greenlet 3.5.6` and `typing-extensions 4.16.0`. Those transitive versions are not fixed in repository state.
10. PyPI metadata for Playwright 1.62.0 defines transitive requirements `pyee<14,>=13` and `greenlet<4.0.0,>=3.1.1`; pyee in turn brings unconstrained `typing-extensions` in the observed environment. Thus unchanged repository code can execute a different newly compatible transitive package on a later browser run.
11. Current pip security documentation explicitly states that default pip installation does not protect against remote tampering and executes arbitrary code from distributions; its supported strict mode requires locally specified hashes for **all** dependencies and pinned requirements. Current Vico Python install does not meet that boundary.
12. Playwright 1.62.0 itself is an old fixed PyPI release (2026-07-31) with published wheel hashes, so the finding is not based on speculative replacement of that exact wheel. Root cause is Vico's unpinned/unhashed online Python dependency set; current release metadata also records no provenance for 1.62.0.
13. All affected browser workflows are `pull_request` jobs with explicit `contents: read`, no production Environment/secrets and disposable/local synthetic DB/auth/R2 resources. Therefore a compromised/newly malicious compatible Python dependency could alter code executed in browser acceptance and falsify or distort acceptance evidence, but no direct repository write, production mutation or secret compromise is proven. Severity remains **Low/P3**.
14. This is distinct from `REPO-MAIN-GATE-01`: I1 covers direct write authority to unprotected `main`; I5 covers mutable external code executing inside acceptance jobs. It also does not duplicate I2 because no privileged token/secret escalation is claimed.
15. No remediation was started. No dependency update, workflow run, package installation, secret/settings change or production mutation was performed by this audit. Existing workflow logs were read only.
16. #315 aggregate becomes **26 current findings + 3 deferred Stage-6 blockers**.
17. Next bounded slice after owner continuation: **I6 — Actions, tools & container provenance**.

### `CI-PYPI-PROVENANCE-01` — Low/P3

**Root cause:** current browser acceptance workflows install only top-level `playwright==1.62.0` from PyPI without a repository-owned fully pinned/hash-checked Python dependency set, so compatible transitives are freshly resolved from the external index on each run.

**Current impact:** unchanged repository/workflow code can execute changed external Python dependency code inside browser acceptance runners, allowing a compromised or malicious compatible transitive release to alter/falsify acceptance evidence.

**Boundary:** affected jobs have `contents: read` only, no production secrets/Environment and disposable/synthetic resources; no repository-write, production-mutation or secret-exfiltration path is established.

## I6 — результат

1. Audit target: current `main` `7cc23edede57994cdedab49c1556ddb55034dd29`. Verdict: **1 новый current-scope finding — `CI-POSTGRES-IMAGE-PROVENANCE-01 Low/P3`; 0 новых deferred technical blockers.**
2. Все 28 current workflow files были перечитаны по `uses:`, `image:` и runner/tool entrypoints. Current repository использует семь уникальных external GitHub Actions: `actions/checkout`, `pnpm/action-setup`, `actions/setup-node`, `actions/upload-artifact`, `actions/configure-pages`, `actions/upload-pages-artifact`, `actions/deploy-pages`.
3. Every current external Action reference is pinned to a full 40-hex commit SHA. Current GitHub secure-use guidance recognizes full-length commit SHA pinning as the accepted fallback when a workflow dependency lockfile is not used.
4. Exact pinned `action.yml` revisions were read for all seven actions. Six are Node actions with no nested `uses:`; `actions/upload-pages-artifact` is composite and its only nested action is `actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02`, also a full SHA. No mutable transitive Action ref was found.
5. No independent remote executable download/install path was found in current workflow/scripts beyond dependency managers already covered by I5. Repository search found no `wget`, `git clone`, `npx`, `apt-get` or `docker run`; current `curl` use is local/production HTTP smoke or GitHub API JSON retrieval, not downloaded code execution.
6. `ubuntu-latest` and `ubuntu-24.04` are GitHub-hosted runner labels. Current GitHub docs confirm GitHub maintains and updates their preinstalled software weekly. This is treated as the chosen CI platform trust root; no separate less-trusted publisher/code path or concrete current compromise chain was established, so runner-image mutability alone is not classified as a finding.
7. External container inventory has one image only: `postgres:17`, referenced by **19 service jobs across 16 workflow files** (ordinary database CI, browser acceptance, and the paused Stage-6 Worker verification job).
8. Current successful SA08 browser run `44295360463` proves the runtime resolution path: runner executed `docker pull postgres:17`, then resolved digest `sha256:0d938e975177bef9f1f61f3f9dbcf2e0aa0a139568f66d3415ed8892eb97f6ac`. The repository itself records only the tag and therefore does not authorize/review that digest as code state.
9. Current Docker documentation explicitly states image tags are mutable and a later pull can resolve different content; digest references are immutable and identify one exact image.
10. Current CI/database and connected-browser acceptance execute application migrations/tests against that service. Therefore an updated or compromised compatible `postgres:17` publication can change executable database/service behavior used to decide CI/browser acceptance **without any repository change or review**.
11. Impact boundary is bounded. The inspected service-container creation receives synthetic `POSTGRES_*`, `GITHUB_ACTIONS=true` and `CI=true`; no repository token, production secret or workspace mount is present. Current PR/browser jobs also remain `contents: read` with no production Environment. Thus direct repository write, production secret exfiltration or production mutation is not proven; severity is **Low/P3**.
12. `production-worker-rollout.yml` uses the same mutable `postgres:17` in its pre-Cloudflare verify job. Stage 6 is explicitly paused, so this future execution path does not create a second/deferred finding or raise current severity. The same root cause must nevertheless be included when `CI-POSTGRES-IMAGE-PROVENANCE-01` is remediated before Stage-6 verification resumes.
13. No separate finding is created for lack of a GitHub workflow dependency lockfile, runner-image exact snapshot pinning or action allowlist enforcement: all observed action refs/transitive refs are exact SHAs, and no independent current exploit path from those missing hardening controls was established.
14. No workflow run, package/image pull, settings mutation, production action or remediation was initiated by this audit. Existing repository files and existing Actions logs were read only.
15. #315 aggregate becomes **27 current findings + 3 deferred Stage-6 blockers**.
16. Next bounded slice after owner continuation: **I7 — Release/artifact supply-chain provenance**.

### `CI-POSTGRES-IMAGE-PROVENANCE-01` — Low/P3

**Root cause:** CI and browser acceptance execute the external Docker service image by mutable tag `postgres:17` rather than an immutable digest, so the executable image can change without a repository change.

**Current impact:** changed or compromised image content can alter PostgreSQL/service behavior used by current CI and connected-browser acceptance, weakening the provenance of acceptance evidence.

**Boundary:** inspected service containers do not receive repository/production secrets or a workspace mount; affected PR/browser jobs have read-only repository authority. No direct repository-write, production-mutation or secret-exfiltration path is proven. Stage-6 Worker verify uses the same root cause but remains paused.

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

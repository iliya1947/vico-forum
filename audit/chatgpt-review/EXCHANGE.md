# ChatGPT Audit Review Channel

> **WORKING COMMUNICATION — NOT A SOURCE OF TRUTH**

This PR is the ChatGPT-side audit mailbox. Codex keeps ownership of PR #78; ChatGPT does not commit
to Codex's PR branch.

## REVIEW CODEX-PR-78 / 1

Reviewed PR: #78  
Reviewed head: `0ecd4c1875c8fce633330f00a615eb7ffa68789c`  
Status: reviewed

### Result

The methodology changes claimed in the latest Codex report are present in PR #78:

- substantive pre-classification was removed from `COVERAGE.md`;
- normative evidence now requires provenance;
- the F/A/C/D/O/G/T category sweep is required for every PR;
- a deliberate disconfirmation pass is required;
- intermediate status transitions are defined;
- target hypotheses are deferred;
- origin/change/acceptance provenance fields are explicit.

I found no new methodology defect in those changes that requires another correction cycle.

### Current workflow issue

One process assumption in PR #78 is now outdated by observed tool behavior: `EXCHANGE.md` still
requires ChatGPT to append responses directly to the Codex workspace. A direct ChatGPT commit to
the head branch of PR #78 caused Codex to lose its normal ability to update that PR.

Use the two-PR channel from now on:

- PR #78: Codex-owned working audit PR.
- This PR: ChatGPT-owned review/response PR.
- Codex reads ChatGPT responses here and records any accepted material in its own PR.
- ChatGPT reads Codex tasks/reviews from PR #78 and does not modify its head branch.

This is a workflow correction only. No project decision is classified or finalized by this entry.

### Next

Codex can update its exchange instructions to point ChatGPT responses to this PR, then issue the next
narrow audit task in PR #78.


## RESPONSE DL-EXTRACT-001/1

From: ChatGPT  
Status: submitted  
Responding in: PR #79 at `8bc919ca1ab91ff8b91d394d7ad5514aa5c4a26e`  
Task source: PR #78 head \`207a1e8d8a8debe598d4b3071135d2d0adc3cdef\`  
Claims: evidence extraction only; no project-decision classification

### Coverage sweep

#### PR #12 / baseline \`8010bdce49274e50c8f6035604daa64c2ddfcfc1\`

F: none | A: Stage 1 delivery split; locale negotiation cache boundary; security/auth boundaries | C: documentation synchronization/hardening after audit | D: \`README.md\`, \`PROJECT_STATE.md\`, \`ROADMAP.md\`, \`SCAFFOLD_PLAN.md\` | O: Stage 1 explicitly excludes production/external infrastructure setup | G: Stage 2 blocked until full Stage 1 acceptance; explicit-locale policy left as a pre-1B gate | T: acceptance/test requirements added; no executable tests/build/lint run in this docs-only PR

Evidence inspected:
- PR body and merge diff.
- Internal sequence: \`39c940b\` “link translation architecture” → \`9c567c3\` “refresh project state” → \`7caf056\` “harden stage 1 scaffold plan” → \`3936eb6\` “tighten roadmap security and stage 1 delivery”.
- Available review: Codex review on final head \`3936eb6\` reported a conflict between the new 1A/1B/1C split and the still-existing ROADMAP rule requiring locale/i18n foundations “from the first scaffold”.
- Later evidence sampled for dependency candidates: PRs #5, #13–#24, #53, #55, #56, #61, #76.

Completeness limitations:
- PR #12 is a control-point baseline, not the origin of every contract it contains; PRs #7–#11 are backward dependencies and are not decomposed in this task.
- No repository evidence inspected here proves which PR #12 statements were direct user decisions; merge alone is not treated as user approval.
- The review comment was made on the final PR head; no later PR #12 commit followed it.

#### PR #5 / \`b0632c024e8fff0aca07d815cb48bed1ef9cc954\`

F: none | A: minimal React Router 8.3.1 Framework Mode SSR + Cloudflare Workers scaffold; Stage 1A technical-only boundary | C: reconciles the ROADMAP “first scaffold” wording with the 1A/1B/1C split | D: \`PROJECT_STATE.md\`, \`README.md\`, \`ROADMAP.md\` synchronized to Stage 1A | O: Worker/Vite/Wrangler runtime configuration added; no external provisioning/deploy in this PR | G: frozen install + lint + typecheck + test + build become Stage 1A/CI gates; next gate is explicit-locale policy before 1B | T: ESLint, Vitest smoke, TypeScript projects, build scripts, lockfile, GitHub Actions CI

Evidence inspected:
- PR body and complete merge diff.
- Internal sequence contains one rebuilt commit only: \`3c5ba21\` “feat(scaffold): establish Stage 1A foundation”, parented directly on PR #12 baseline.
- PR body explicitly says the older PR #5 branch/version was rebuilt and its old verification was not evidence for this version.
- No current GitHub PR review comments were present.
- Later dependency candidates sampled: PR #13, #15–#19, #23–#24, #53, #55.

Completeness limitations:
- The earlier pre-rebuild incarnation of PR #5 is not present in the current one-commit internal sequence; this extraction covers the rebuilt PR merged as \`b0632c0\`.
- Generated \`pnpm-lock.yaml\` detail is treated as implementation evidence for the package/toolchain candidate rather than decomposed package-by-package.

#### PR #13 / \`0526b29078db82169b316d1c788b083167d7f84f\`

F: none | A: explicit-locale fallback/canonicalization policy | C: closes the explicit unknown/inactive-locale policy gate left open by PR #12 | D: \`PROJECT_STATE.md\`, \`SCAFFOLD_PLAN.md\`, \`docs/translation/LOCALES.md\` | O: none | G: removes the pre-1B route-policy blocker and points next step to Stage 1B | T: Stage 1 acceptance cases updated in documentation; no executable tests/build/lint run

Evidence inspected:
- PR body and merge diff.
- Internal sequence: \`8a32444\` state recording → \`8d96e8e\` scaffold-plan policy → \`e0aa98e\` detailed locale redirect behavior.
- Available Codex review on final head \`e0aa98e\`: formatting-extension tags such as \`/en-u-nu-arab/...\` were not given a deterministic redirect case in the new policy.
- Later dependency candidates sampled: PR #14, #16, #22, #23, #28, #38, #55.

Completeness limitations:
- The PR body says the policy was “decided”, but no direct-user-decision evidence is present in the GitHub-visible material inspected here.
- The formatting-extension review point remained visible on the final PR head; this pass does not determine where it was later resolved.

#### PR #14 / \`752060513bd8b632d026a3fb42cee32e15f579e0\`

F: none | A: method-aware locale redirect and root-negotiation policy; pre-action server guard | C: changes the PR #13 redirect contract after considering method-preserving redirect semantics | D: \`PROJECT_STATE.md\`, \`SCAFFOLD_PLAN.md\`, \`docs/translation/LOCALES.md\`, \`docs/translation/RESEARCH.md\` | O: none | G: redirect-required mutations must terminate before matched action; active canonical locale remains routable | T: targeted mutation-safety/redirect tests specified; docs-only PR did not run lint/typecheck/test/build

Evidence inspected:
- PR body and merge diff.
- Internal sequence: \`2749e63\` locale method policy → \`c24b4fb\` Stage 1B test alignment → \`316a309\` recorded RFC/React Router evidence → \`d039d12\` project-state record.
- Available Codex review on final head \`d039d12\`: \`PROJECT.md\`, \`TRANSLATION_ARCHITECTURE.md\`, and \`ROADMAP.md\` still described missing-locale negotiation without the new GET/HEAD method restriction.
- Later dependency candidates sampled: PR #16, #22, #23, #53, #55, #56.

Completeness limitations:
- The external RFC/React Router claims are historical evidence that PR #14 recorded those claims; this extraction did not independently re-verify the external sources.
- The visible review identified cross-document scope disagreement; this task does not decide its resolution or classify it.

#### PR #15 / \`8ea9d3267870584df4114087f7e0e572f23b1ecf\`

F: none | A: none | C: hardens the existing CI workflow | D: none | O: GitHub Actions token/action-supply-chain configuration | G: top-level workflow permission boundary and immutable action references | T: \`.github/workflows/ci.yml\` only

Evidence inspected:
- PR body and complete one-file diff.
- Internal sequence contains one commit: \`a484b7d\` “ci: harden workflow permissions and action pins”.
- No GitHub-visible review comments were present.
- Later dependency candidates sampled: PR #24 reuses the pinned actions; PR #44 later requires \`actions: read\` for migration-evidence verification.

Completeness limitations:
- PR #15 states that tag targets were resolved against official upstream repositories; the underlying resolution commands/output are not preserved in the PR material inspected here.
- This pass does not independently verify the upstream action SHAs.

### Candidate atomic decisions

#### Candidate DLX12-01 — Translation architecture is an explicit repository entry point

Atomic decision: README points readers to \`TRANSLATION_ARCHITECTURE.md\` as the mandatory multilingual/translation architecture contract and to its detail documents.

Introduced/changed/recorded by: introduced as repository-navigation wording in \`39c940b\`; recorded in PR #12 merge \`8010bdc\`. The underlying translation architecture predates PR #12.

Normative provenance: \`README.md\` change in \`39c940b\` — \`PR-or-review-discussion\`; underlying architecture — backward \`pre-existing-project-contract\` from earlier PRs not decomposed here.

Historical evidence: \`39c940b\` only changes README linkage/description.

Current-behavior locations to verify later: current \`README.md\`, \`TRANSLATION_ARCHITECTURE.md\`, \`docs/translation/*\`.

Backward dependencies: PRs #7–#11 translation-architecture work.

Forward-dependency candidates: PRs #13–#20 repeatedly use \`SCAFFOLD_PLAN.md\`/\`docs/translation/*\` as implementation contracts; later translation stages continue to reference those contracts.

Contrary evidence searched/found: no review objected to the linkage itself; this commit does not prove that the underlying architecture originated or was user-approved in PR #12.

Unknowns: exact acceptance provenance of the earlier architecture is outside this block.

#### Candidate DLX12-02 — Stage 1 is delivered as 1A → 1B → 1C, with Stage 2 gated on full Stage 1 acceptance

Atomic decision: Stage 1 is one stage delivered as three compact PRs: 1A technical scaffold/quality gates, 1B locale boundary/resolution, 1C UI translation runtime; no transition to Stage 2 until all Stage 1 acceptance checks pass.

Introduced/changed/recorded by: introduced in \`7caf056\` (\`SCAFFOLD_PLAN.md\`) and recorded in \`3936eb6\`/\`9c567c3\`; changed by PR #5 \`3c5ba21\` to reconcile the ROADMAP invariant; merge records are \`8010bdc\` then \`b0632c0\`.

Normative provenance: PR #12 changed \`SCAFFOLD_PLAN.md\`/\`ROADMAP.md\` — \`PR-or-review-discussion\`; PR #5 reconciliation — \`PR-or-review-discussion\`. No direct-user-decision evidence found in this extraction.

Historical evidence: PR #12 split text plus Stage 2 gate; PR #5 body explicitly identifies and changes the conflicting “from first scaffold” ROADMAP rule.

Current-behavior locations to verify later: historical/current \`ROADMAP.md\`, \`SCAFFOLD_PLAN.md\`, \`PROJECT_STATE.md\`; implementation lineage PR #5 → #16 → #17 → #18.

Backward dependencies: pre-PR12 Stage 1 roadmap/scaffold contract.

Forward-dependency candidates: PR #5 implements 1A; #13/#14 close pre-1B policy; #16 implements 1B; #17 implements 1C; #18 records Stage 1 acceptance; #20 starts Stage 2 preflight.

Contrary evidence searched/found: PR #12 Codex review states the split conflicted with the unchanged ROADMAP rule requiring locale/i18n foundations “from the first scaffold”; PR #5 later changes that rule.

Unknowns: whether the split itself was a direct user choice is not established by Git-visible evidence in this block.

#### Candidate DLX12-03 — Root locale negotiation uses a non-cacheable Stage 1 baseline

Atomic decision: request-dependent root negotiation \`/\` uses \`Cache-Control: no-store\` as the Stage 1 baseline; an equivalent alternative cache policy may replace it only after separate justification and test coverage.

Introduced/changed/recorded by: introduced in \`7caf056\`; repeated in \`3936eb6\`; recorded by merge \`8010bdc\`.

Normative provenance: changed \`SCAFFOLD_PLAN.md\` and \`ROADMAP.md\` — \`PR-or-review-discussion\`.

Historical evidence: \`7caf056\` adds the no-store contract and test requirement; \`3936eb6\` adds the corresponding Stage 1 work/acceptance wording.

Current-behavior locations to verify later: \`app/routes/locale-negotiation.ts\`, locale request/response tests, current \`SCAFFOLD_PLAN.md\`.

Backward dependencies: existing root negotiation based on cookie/\`Accept-Language\`/default locale.

Forward-dependency candidates: PR #16 explicitly implements root \`307\` + \`Cache-Control: no-store\`; PR #22 uses no-store in degraded locale fallback behavior; #23 preserves request-scoped registry/routing semantics.

Contrary evidence searched/found: the PR itself explicitly permits a later equivalent \`Vary\`/edge policy if separately justified/tested; no scoped review contradicted the Stage 1 baseline.

Unknowns: whether any later PR replaced the baseline is left for cross-stage/current-consumer review.

#### Candidate DLX12-04 — Explicit unknown/inactive locale policy remains an open pre-1B gate

Atomic decision/open gate: explicit \`/:locale\` must not silently fall through to cookie/header negotiation; the exact unknown/inactive route policy must be chosen and recorded before the PR that implements locale resolution.

Introduced/changed/recorded by: gate wording refined in \`7caf056\`; project-state gate recorded in \`9c567c3\`; merge \`8010bdc\`.

Normative provenance: pre-existing explicit-URL-authority contract plus PR #12 gate wording — \`pre-existing-project-contract\` + \`PR-or-review-discussion\`.

Historical evidence: \`SCAFFOLD_PLAN.md\` allows an explicit future choice (example 404 or approved redirect), while \`PROJECT_STATE.md\` says it is not a blocker for 1A but must be chosen before locale routing/resolution.

Current-behavior locations to verify later: \`app/localization/resolver.ts\`, \`app/routes/locale-boundary.tsx\`, locale route tests.

Backward dependencies: earlier locale architecture/explicit URL authority.

Forward-dependency candidates: PR #13 selects an initial explicit-locale redirect policy; PR #14 changes its method scope; PR #16 implements it.

Contrary evidence searched/found: no evidence in PR #12 closes the gate; later PR #13 is the first scoped PR in this block claiming closure.

Unknowns: formatting-extension handling was later raised separately in PR #13 review.

#### Candidate DLX12-05 — Runtime validation and server-side authorization are general protected-operation boundaries

Atomic decision: external/user data is runtime-validated at the relevant boundary, and protected operations perform server-side authorization.

Introduced/changed/recorded by: \`3936eb6\` elevates these rules into ROADMAP-wide principles and tightens later forum-write wording; merge \`8010bdc\`.

Normative provenance: earlier Stage-specific validation/authz wording is a \`pre-existing-project-contract\`; PR #12 generalization is \`PR-or-review-discussion\`.

Historical evidence: ROADMAP top-level rule 7 and Stage 8 write-operation wording.

Current-behavior locations to verify later: forum mutation/action modules, authorization resolver, route actions, auth request context.

Backward dependencies: prior forum/auth requirements in the roadmap.

Forward-dependency candidates: PR #55 validated/authenticated topic/reply actions; PR #61 request-scoped permission resolution and forged-input tests; #76 later changes failure classification around authorization infrastructure.

Contrary evidence searched/found: later use is recorded only as a dependency candidate, not proof of original authority; no scoped review directly disputes the boundary.

Unknowns: exact direct-user provenance is not established here.

#### Candidate DLX12-06 — State-changing browser/write boundaries require origin/CSRF and basic anti-abuse controls

Atomic decision: state-changing browser actions require applicable CSRF/origin protection; public write/generation boundaries require basic rate limiting/anti-spam without restricting public read; concrete thresholds are selected at implementation time rather than fixed as architecture.

Introduced/changed/recorded by: \`3936eb6\`; merge \`8010bdc\`.

Normative provenance: changed ROADMAP — \`PR-or-review-discussion\`.

Historical evidence: ROADMAP top-level rule 8, forum-write stage, solved/best-answer stage, production readiness/security checks.

Current-behavior locations to verify later: Better Auth runtime config, forum mutation origin checks, write throttling/rate-limit implementation and tests.

Backward dependencies: public-read/authenticated-write product model and existing auth plan.

Forward-dependency candidates: PR #53 keeps Better Auth CSRF/origin protections and DB-backed rate limiting; PR #55 adds origin-checked forum mutations; PR #56 explicitly says write anti-spam/rate limiting was not changed in that slice; PR #61 requires same-origin/runtime validation for management mutations.

Contrary evidence searched/found: no scoped review rejects the boundary; later implementation is not treated as proof that the original decision was required.

Unknowns: exact implementation thresholds/mechanism were intentionally left open.

#### Candidate DLX12-07 — Better Auth must be checked at the exact selected version and does not automatically secure forum actions

Atomic decision: the auth stage must verify selected-version cookie/trusted-origin/CSRF behavior and must not assume the auth library automatically protects future forum actions; server-side authz remains separate.

Introduced/changed/recorded by: \`3936eb6\`; merge \`8010bdc\`.

Normative provenance: changed ROADMAP — \`PR-or-review-discussion\`.

Historical evidence: Stage 4 work/acceptance/test additions in PR #12.

Current-behavior locations to verify later: \`app/auth/auth.server.ts\`, \`app/auth/request-context.ts\`, auth resource route, forum/authorization actions.

Backward dependencies: Better Auth + Google OAuth baseline and server authz requirement.

Forward-dependency candidates: PR #53 implements Better Auth 1.7.4 runtime and records CSRF/origin/rate-limit settings; PR #56 adds Google auth controls; PR #59 explicitly separates identity/session from application authorization; PR #61 enforces application permissions on mutations.

Contrary evidence searched/found: no scoped review contradicts separation of authn/authz; direct acceptance provenance remains unknown.

Unknowns: external Better Auth version semantics are outside this extraction.

#### Candidate DLX12-08 — Stage 1 excludes production/external service provisioning

Atomic decision: Stage 1 does not configure preview/production Cloudflare infrastructure, PostgreSQL/Drizzle persistence, Better Auth/Google OAuth, Queues, or translation providers; it implements only the assigned Stage 1 boundaries.

Introduced/changed/recorded by: explicit Stage 1 scope in \`7caf056\`; merge \`8010bdc\`.

Normative provenance: \`SCAFFOLD_PLAN.md\` — \`PR-or-review-discussion\`.

Historical evidence: Stage 1 “not included” section and 1A/1B/1C boundaries.

Current-behavior locations to verify later: roadmap stage boundaries and the later infrastructure/auth PRs.

Backward dependencies: staged roadmap.

Forward-dependency candidates: PR #18 records a first Workers deploy only after Stage 1 acceptance; PR #20 opens Stage 2 persistence preflight; PR #23 adds Hyperdrive integration; PR #24 adds production migration workflow.

Contrary evidence searched/found: PR #18 is temporally after Stage 1 and therefore does not contradict the literal Stage 1 scope; no claim is made here about whether later external gates were necessary.

Unknowns: none within the literal scope boundary; later operational policy is cross-stage work.

#### Candidate DLX5-01 — Stage 1A is technical scaffold/quality gates only

Atomic decision: PR 1A does not implement locale business behavior; locale routing/registry moves to 1B and canonical UI/i18next runtime to 1C, while both remain mandatory within Stage 1.

Introduced/changed/recorded by: PR #12 introduced the split; PR #5 \`3c5ba21\` changes ROADMAP rule 4 to make the split internally explicit; merge \`b0632c0\`.

Normative provenance: PR #12/PR #5 changed docs and PR #5 RCA — \`PR-or-review-discussion\`.

Historical evidence: PR #5 body explicitly identifies the residual contradiction from PR #12 and rewrites ROADMAP rule 4.

Current-behavior locations to verify later: historical \`ROADMAP.md\`/\`SCAFFOLD_PLAN.md\`; PR #16/#17 implementation boundaries.

Backward dependencies: DLX12-02 and the PR #12 review comment.

Forward-dependency candidates: PR #13/#14 pre-1B policy; PR #16 1B; PR #17 1C; PR #18 full Stage 1 acceptance.

Contrary evidence searched/found: PR #12 final-head review is the contrary evidence; PR #5 is the later record that changes the conflicting invariant.

Unknowns: user-approval provenance for the reconciliation is not visible in the PR.

#### Candidate DLX5-02 — Establish the minimal React Router/Workers SSR runtime scaffold

Atomic decision: use React Router 8.3.1 Framework Mode SSR on Cloudflare Workers with a Worker request handler, server/client entrypoints, route config, root layout, minimal home route, and Cloudflare Vite/Wrangler configuration.

Introduced/changed/recorded by: \`3c5ba21\`; merge \`b0632c0\`.

Normative provenance: PR #5 body plus pre-existing stack baseline — \`PR-or-review-discussion\` + \`pre-existing-project-contract\`.

Historical evidence: new \`app/*\`, \`workers/app.ts\`, \`react-router.config.ts\`, \`vite.config.ts\`, \`wrangler.jsonc\`.

Current-behavior locations to verify later: those runtime files plus route modules and Worker request context.

Backward dependencies: project stack baseline and PR #12 1A boundary.

Forward-dependency candidates: PR #16 extends routes/request context for locale handling; #17 adds translation runtime; #19 adds Workers runtime smoke; #23 and #53 later inject DB/auth request-scoped capabilities through the Worker.

Contrary evidence searched/found: no PR #5 review contradicts the runtime shape; later extensions are not treated as proof of original necessity.

Unknowns: low-level scaffold choices not changed by a visible review in this PR.

#### Candidate DLX5-03 — Pin an exact Stage 1A toolchain/dependency baseline

Atomic decision: record exact Node \`24.21.0\`, pnpm \`12.3.4\`, exact package versions/lockfile, and pnpm build-script allowlist limited to \`esbuild\`/\`workerd\`.

Introduced/changed/recorded by: \`3c5ba21\`; merge \`b0632c0\`.

Normative provenance: PR #5 implementation/body and pre-existing scaffold plan — \`PR-or-review-discussion\` + \`pre-existing-project-contract\`.

Historical evidence: \`.node-version\`, \`package.json\`, \`pnpm-lock.yaml\`, \`pnpm-workspace.yaml\`.

Current-behavior locations to verify later: the same package/toolchain files and CI setup.

Backward dependencies: Stage 0 scaffold/version research referenced by project state/scaffold plan.

Forward-dependency candidates: PR #17 and #19 verification explicitly report Node \`24.21.0\` / pnpm \`12.3.4\`; all later application/CI PRs build on the package graph until subsequent version changes.

Contrary evidence searched/found: no scoped review disputes the pins; this extraction does not verify the original external version-selection research.

Unknowns: generated lockfile package-level decisions are not separately decomposed.

#### Candidate DLX5-04 — Make frozen install, lint, typecheck, test and build the pull-request CI gate

Atomic decision: create a pull-request GitHub Actions workflow running frozen install, lint, typecheck, Vitest, and production build, backed by ESLint/TypeScript/Vitest scripts/config.

Introduced/changed/recorded by: \`3c5ba21\`; merge \`b0632c0\`.

Normative provenance: PR #5 and existing roadmap check requirements — \`PR-or-review-discussion\` + \`pre-existing-project-contract\`.

Historical evidence: \`.github/workflows/ci.yml\`, ESLint config, TS configs, Vitest config/test, package scripts; PR body records run \`34424935801\` as successful on final head.

Current-behavior locations to verify later: \`.github/workflows/ci.yml\`, package scripts, test configs, later CI scripts/jobs.

Backward dependencies: PR #12/roadmap requires Stage PRs to keep mandatory checks green.

Forward-dependency candidates: PR #15 hardens workflow permissions/action refs; PR #19 adds Workers smoke; PR #24 adds a separate migration workflow using existing pinned actions; PR #44 later adds migration-evidence verification to CI.

Contrary evidence searched/found: PR #15 changes how the workflow obtains permissions/actions; PR #19 extends CI beyond the original five steps. Those are changes/extensions, not classified here.

Unknowns: none material to the existence of the initial gate.

#### Candidate DLX13-01 — Unavailable explicit locale temporarily falls back to the same path under bootstrap English

Atomic decision: malformed/unknown/inactive/disabled explicit locale receives a temporary \`307\` to the same route remainder under \`/en/...\`, preserving query string and not consulting user/cookie/\`Accept-Language\`.

Introduced/changed/recorded by: state wording \`8a32444\`; normative contract \`8d96e8e\` + \`e0aa98e\`; merge \`0526b29\`; method scope changed by PR #14.

Normative provenance: changed \`SCAFFOLD_PLAN.md\`/\`LOCALES.md\` and PR #13 body — \`PR-or-review-discussion\`. Direct-user-decision evidence not found.

Historical evidence: exact route matrix in \`8d96e8e\`/\`e0aa98e\`.

Current-behavior locations to verify later: \`app/localization/resolver.ts\`, locale boundary/negotiation routes and tests.

Backward dependencies: DLX12-04 open gate; bootstrap English and explicit-URL-authority contracts from earlier translation architecture.

Forward-dependency candidates: PR #14 restricts this redirect to GET/HEAD; PR #16 implements it; PR #22 reuses English fallback/no-store behavior for degraded registry loading; PR #28 later changes registry failure boundaries.

Contrary evidence searched/found: PR #14 body explicitly identifies mutation ambiguity in the PR #13 method-preserving redirect policy and changes its method scope.

Unknowns: no direct acceptance provenance beyond repository/PR record.

#### Candidate DLX13-02 — Canonicalizable active locale forms permanently redirect to the canonical locale URL

Atomic decision: alias/deprecated/case variant of an active locale receives \`308 Permanent Redirect\` to its canonical \`/:locale/...\` URL.

Introduced/changed/recorded by: \`8d96e8e\` + \`e0aa98e\`; merge \`0526b29\`; method scope changed by PR #14.

Normative provenance: \`PR-or-review-discussion\`, with backward \`pre-existing-project-contract\` for canonicalization/URL identity.

Historical evidence: explicit \`308\` branch in scaffold/detail docs.

Current-behavior locations to verify later: locale parser/registry/resolver and route tests.

Backward dependencies: pre-existing BCP-47 canonicalization/alias contract.

Forward-dependency candidates: PR #14 limits canonical redirect to GET/HEAD; PR #16 implements method-aware \`308\`; PR #38 later addresses canonical locale persistence and formatting extensions at the persistent write boundary.

Contrary evidence searched/found: PR #13 review says formatting-extension tags were not assigned a deterministic case by the new alias/deprecated/case wording.

Unknowns: formatting-extension URL behavior remains an explicit completeness question in this block.

#### Candidate DLX13-03 — Locale redirect targets are internal and explicit locale never falls through to preference negotiation

Atomic decision: explicit locale handling preserves route remainder/query, builds only an internal Vico redirect target, and does not use \`user.locale\`, cookie, or \`Accept-Language\` to replace an explicitly present invalid/unavailable locale.

Introduced/changed/recorded by: explicit redirect-construction wording in \`8d96e8e\`/\`e0aa98e\`; explicit-URL-authority behavior predates PR #13; merge \`0526b29\`.

Normative provenance: \`pre-existing-project-contract\` for explicit URL authority; \`PR-or-review-discussion\` for exact redirect-target/query wording.

Historical evidence: PR #13 body and both normative docs.

Current-behavior locations to verify later: locale resolver/route tests, any callback/redirect helpers.

Backward dependencies: locale architecture and SEC-01 side-effect/open-redirect boundary.

Forward-dependency candidates: PR #14 retains internal-target/no-preference behavior with method restrictions; PR #16 implements query-preserving internal redirects; PR #56 later constrains auth callback paths inside the locale namespace.

Contrary evidence searched/found: no scoped review disputes the no-preference/internal-target rule; review focuses on a missing formatting-extension case.

Unknowns: none beyond extension/canonicalization completeness.

#### Candidate DLX14-01 — Locale correction/fallback redirects are GET/HEAD-only; redirect-required mutations fail closed

Atomic decision: GET/HEAD may use the PR #13 \`307\`/\`308\` branches; any non-GET/HEAD explicit locale that would require such redirect gets \`404\` without \`Location\`, without preference negotiation, before matched action; canonical active locale proceeds normally.

Introduced/changed/recorded by: \`2749e63\`, synchronized in \`c24b4fb\`, evidence recorded in \`316a309\`, project state recorded by \`d039d12\`; merge \`7520605\`.

Normative provenance: project policy in \`LOCALES.md\`/\`SCAFFOLD_PLAN.md\` — \`PR-or-review-discussion\`; RFC/React Router claims recorded in \`RESEARCH.md\` — \`external-platform-requirement\` provenance as cited by the PR, not independently verified here.

Historical evidence: method matrix and pre-action \`404\` contract in PR #14 diff.

Current-behavior locations to verify later: \`app/localization/resolver.ts\`, \`app/routes/locale-boundary.tsx\`, mutation route tests.

Backward dependencies: PR #13 \`307\`/\`308\` route policy.

Forward-dependency candidates: PR #16 implements method-aware guard/redirect behavior; PR #22 preserves fail-closed mutation behavior under persistent registry loading; PR #55 adds locale-scoped state-changing forum actions.

Contrary evidence searched/found: no visible review disputes the explicit-locale non-GET/HEAD branch itself; the review instead identifies governing-doc disagreement for root negotiation.

Unknowns: external standard/source correctness is not independently revalidated in this task.

#### Candidate DLX14-02 — Root language negotiation is navigation-only and restricted to GET/HEAD

Atomic decision: unprefixed root locale negotiation/redirect occurs only for GET/HEAD; other methods do not language-negotiate into a mutating locale route.

Introduced/changed/recorded by: \`2749e63\`/\`c24b4fb\`; research record \`316a309\`; merge \`7520605\`.

Normative provenance: changed locale/scaffold docs — \`PR-or-review-discussion\`.

Historical evidence: explicit root method restriction in both \`LOCALES.md\` and \`SCAFFOLD_PLAN.md\`.

Current-behavior locations to verify later: \`app/routes/locale-negotiation.ts\`, route/request tests.

Backward dependencies: root negotiation and no-store baseline from DLX12-03.

Forward-dependency candidates: PR #16 implements root GET/HEAD negotiation; PR #53 later adds authenticated \`user.locale\` as an input to root negotiation while keeping explicit locale authoritative.

Contrary evidence searched/found: PR #14 final-head Codex review says \`PROJECT.md\`, \`TRANSLATION_ARCHITECTURE.md\`, and \`ROADMAP.md\` still had unconditional missing-locale negotiation wording.

Unknowns: this pass does not establish where/when that cross-document disagreement was reconciled.

#### Candidate DLX14-03 — A server boundary must stop redirect-required mutations before action side effects

Atomic decision: method-aware locale guarding must execute on the server boundary before matched action when a redirect would be required; acceptance must prove absence of action side effect, while exact placement may use server middleware/shared server logic.

Introduced/changed/recorded by: \`2749e63\` detailed boundary; \`c24b4fb\` targeted test requirement; \`316a309\` research rationale; merge \`7520605\`.

Normative provenance: \`PR-or-review-discussion\`; cited React Router exact-version semantics are recorded as \`external-platform-requirement\` evidence.

Historical evidence: \`LOCALES.md\` and \`SCAFFOLD_PLAN.md\` explicitly require pre-action termination and side-effect testing.

Current-behavior locations to verify later: locale-boundary middleware/loader, action dispatch tests, forum/auth route actions.

Backward dependencies: DLX14-01 route policy plus React Router server loader/middleware contract from earlier locale docs.

Forward-dependency candidates: PR #16 says it wires a server loader + middleware guard and tests fail-closed mutation behavior; PR #55 later adds actual forum actions whose canonical-locale path must remain reachable.

Contrary evidence searched/found: root-negotiation governing-doc conflict from PR #14 review may affect the overall method-scope contract, but no separate review challenges the before-action requirement.

Unknowns: whether every later action path consumes the same guard is cross-stage/current-consumer work.

#### Candidate DLX15-01 — Pull-request CI gets explicit least-privilege top-level token permission

Atomic decision: the CI workflow explicitly grants only \`contents: read\` at top level instead of relying on default \`GITHUB_TOKEN\` permissions.

Introduced/changed/recorded by: \`a484b7d\`; merge \`8ea9d32\`.

Normative provenance: PR #15 rationale cites GitHub guidance; repository-visible source is \`PR-or-review-discussion\`, with an asserted \`external-platform-requirement\` basis not independently verified here.

Historical evidence: six-line workflow change adding \`permissions: contents: read\`.

Current-behavior locations to verify later: \`.github/workflows/ci.yml\` and workflows that need additional scoped permissions.

Backward dependencies: CI workflow from DLX5-04.

Forward-dependency candidates: PR #44 later adds GitHub Actions API verification and therefore a need for \`actions: read\`; PR #76 later changes where that live verification runs.

Contrary evidence searched/found: later PR #44 demonstrates that \`contents: read\` was not the final permission set for every later CI function; this is a later change, not a classification of PR #15.

Unknowns: official GitHub permission recommendation was not independently rechecked in this extraction.

#### Candidate DLX15-02 — Third-party CI actions are pinned to immutable full commit SHAs with readable version comments

Atomic decision: \`actions/checkout\`, \`pnpm/action-setup\`, and \`actions/setup-node\` references move from mutable major tags to exact full SHAs, retaining comments for the human-readable major version.

Introduced/changed/recorded by: \`a484b7d\`; merge \`8ea9d32\`.

Normative provenance: PR #15 rationale — \`PR-or-review-discussion\`; asserted immutable-reference guidance — \`external-platform-requirement\` as recorded, not independently revalidated here.

Historical evidence: exact workflow diff records the three SHAs.

Current-behavior locations to verify later: \`.github/workflows/ci.yml\` and other workflow files using those actions.

Backward dependencies: action-tag references introduced in PR #5 CI.

Forward-dependency candidates: PR #24 explicitly says its migration workflow reuses the existing pinned action versions; later workflow additions should be checked for the same policy during cross-stage review.

Contrary evidence searched/found: no PR #15 review comments; later reuse is only dependency evidence and not proof of the original decision's authority/correctness.

Unknowns: the tag-to-SHA resolution itself is asserted by the PR body but the upstream lookup output is not preserved in the inspected repository evidence.

### Extraction reconciliation

- unclassified text/changes remaining:
  - PR #12: \`PROJECT_STATE.md\` factual summaries and README wording that only restate/link extracted decisions were not duplicated as separate decision records.
  - PR #5: cosmetic scaffold page/CSS copy, generated lockfile entries, individual TypeScript compiler flags, the 5-second render timeout, and bodyless HEAD rendering remain implementation details under DLX5-02/DLX5-03 unless Codex wants finer-grained records.
  - PR #13/#14: project-state “next step” wording is treated as recording/gating evidence for the extracted locale decisions rather than separate product decisions.
  - PR #14: the external research citations are evidence basis for the policy, not independently classified project decisions.
  - PR #15: readable \`# v5/#v4/#v6\` comments are treated as part of the SHA-pinning decision.

- inaccessible evidence:
  - direct ChatGPT/Codex task transcripts linked from historical PRs;
  - any user decision that was made outside GitHub and not copied into repository/PR discussion;
  - the pre-rebuild historical content of the old PR #5 branch;
  - raw commands/output used in PR #15 to resolve upstream action tags;
  - external RFC/React Router/GitHub documentation was not independently revalidated in this extraction.

- reasons extraction may still be incomplete:
  - PR #12 inherits substantial contracts from PRs #7–#11; those are only backward references here, not fully decomposed.
  - Forward-dependency candidates above were found from known later PR bodies/searches through #77 but are explicitly non-exhaustive until the full cross-stage/current-consumer pass.
  - PR #13 formatting-extension review and PR #14 governing-document review expose unresolved questions whose later resolution was not traced to closure in this task.
  - Current main behavior has not been used to validate these historical decisions; the listed current-behavior paths are locations for later verification, per task scope.

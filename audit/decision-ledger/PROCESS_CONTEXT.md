# Decision Audit and Remediation Process Context

> **DURABLE WORKING MEMORY — NOT A PROJECT SOURCE OF TRUTH**
>
> This file explains why this process exists, how it is governed, how work moves between PR #78 and
> PR #79, and how to resume safely after either assistant loses conversational context. It does not
> change product architecture, the roadmap, project state, or any audit finding.

## Why this process exists

The process was started because ChatGPT repeatedly made unreliable corrective reviews of Codex work.
The recurring failure mode was to see an intentionally incomplete future-proof boundary, notice that
its future consumer did not yet exist, and call the boundary a present-stage defect. That could cause
Codex to remove or redesign valid preparation, implement future functionality too early, add needless
architecture to satisfy a mistaken review, or rewrite documentation so the correction later appeared
to have been the original plan.

The audit therefore looks specifically for historical cases where a ChatGPT correction:

- changed a correct original implementation;
- damaged a deliberate future-proof boundary;
- pulled later-stage functionality or external infrastructure into an earlier stage;
- introduced avoidable architectural or operational complexity;
- caused documentation or `PROJECT_STATE.md` to legitimize an erroneous correction after the fact;
- produced a regression, contradictory contract, or false state claim.

This is not permission to assume that every ChatGPT correction was bad. The audit must also identify
real implementation defects that ChatGPT corrected correctly, acceptable choices among multiple valid
architectures, and cases where evidence is insufficient. The goal is to prove mistakes, not invent
them.

## Governing principle: incomplete is not automatically wrong

Before treating unused or incomplete work as a defect, determine:

1. which stage/slice owned the current work;
2. whether a future consumer had already been accepted;
3. whether the change was a minimal boundary or a complete future subsystem;
4. whether later retrofit would alter persistent identity, schema, URLs, or other expensive contracts;
5. whether the work created a blocker or gate for unrelated current product development;
6. whether later consumers used it as designed, without treating later use alone as proof that it was
   originally correct.

An adapter, schema identity, task identity, immutable revision boundary, cache key, provider-neutral
interface, or similar foundation may be justified before its consumer. Cheap workflow, deployment,
external verification, and hardening work generally has a weaker case for early implementation. This
is an audit question, not a predetermined verdict.

## Authority and roles

### Codex

Codex leads the process and owns PR #78. Codex:

- defines bounded tasks;
- independently verifies ChatGPT's evidence and omissions;
- maintains the coverage map, ledger, dependency chains, questions, and accepted process record;
- decides whether a submission is accepted, needs a narrow revision, or needs a full replacement;
- performs the eventual cross-stage synthesis and disconfirmation passes;
- asks the user only for choices that evidence cannot resolve.

### ChatGPT

ChatGPT is a supporting reviewer and owns PR #79. ChatGPT:

- reads the current PR #78 head before working;
- answers only the bounded task assigned there;
- supplies Git evidence, counter-evidence, provenance, omissions, and uncertainty;
- does not classify decisions unless the task explicitly reaches the classification stage;
- does not treat its response as accepted before Codex review;
- does not edit PR #78 or take over process direction.

This relationship is intentionally strict because the process is remediating consequences of
ChatGPT's earlier review failures.

### User

The user sponsors the process and is the final authority for unresolved product, architecture, and
operational choices. Ordinarily the user only tells one side to check the other PR. If another action
or decision is needed, it must be requested explicitly at the start of the message.

## Two-PR communication and ownership protocol

- **PR #78 is Codex-owned.** It contains this durable audit workspace, Codex tasks, accepted reviews,
  coverage, ledger indexes, dependency work, and user questions.
- **PR #79 is ChatGPT-owned.** It contains ChatGPT responses and its own continuity note.
- Neither side commits to the other's PR or cherry-picks the other's mailbox commits.
- Before acting, fetch/read the current GitHub head of both PRs. Do not rely on a SHA relayed earlier
  if the head has advanced.
- Every response/review names its task ID, PR number, response commit, and observed head.
- If two submissions use the same response ID, reconcile them explicitly. Do not silently combine
  contradictory versions.
- Accepted material is independently indexed in PR #78; existence in PR #79 is not acceptance.
- The user should not need to relay large messages. Normal handoff is only `check PR #78` or
  `check PR #79`.

The project exists on GitHub. A transient execution checkout is not a user-managed local copy and must
not be treated as the shared source of truth. A task is not available to the other assistant until the
corresponding commit is actually published to the appropriate GitHub PR head.

## Evidence model

Do not use one universal source ranking. Record evidence by the question it answers:

- **Normative intent:** what was required or chosen, and by whom.
- **Historical fact:** what commits, diffs, reviews, CI records, and deployment artifacts prove
  happened.
- **Current behavior:** what current code, tests, schema, workflow, and configuration actually do.
- **Possible target:** considered only after cross-stage review and any required user decisions.

Allowed provenance labels include `direct-user-decision`, `pre-existing-project-contract`,
`PR-or-review-discussion`, `assistant-authored-proposal`, `external-platform-requirement`, and
`later-retrospective-summary`. A committed document proves that text was committed; it does not prove
that the text had user authority or was correct. Merge, green CI, deployment, and later use likewise
do not establish approval or correctness.

Conflicts must remain visible. Current documentation cannot validate its own history, tests can encode
regressions, state files can contain false or laundered conclusions, and later corrections must not be
applied retroactively.

## Atomic extraction rules

Each independently changeable decision, failure mode, operational claim, verification fact, or gate
gets its own ID. In particular, do not collapse:

- domain/schema identity with external provider topology;
- migration representation with rollout enforcement;
- runtime connectivity with database privileges;
- degradation behavior with release acceptance or recovery strategy;
- an external operation with verification of that operation;
- pre-call race prevention with post-call publication fencing;
- validation categories whose defects and corrections have different histories.

Each PR receives a complete `F/A/C/D/O/G/T` sweep:

- `F` — feature/domain;
- `A` — architecture/contract;
- `C` — corrective/review;
- `D` — documentation/state;
- `O` — operational/infrastructure;
- `G` — gate/process;
- `T` — tests/config/workflows.

Explicit `none` values are required. Every changed file and meaningful change must be reconciled.
Generated or mechanical changes may be grouped only with a concrete explanation.

## Status and closure discipline

The ledger progresses through `open`, `evidence-collected`, `preliminary`, `block-reviewed`,
`cross-stage-review-pending`, `cross-stage-reviewed`, `awaiting-user`, and `final`.

Extraction acceptance means only that the candidate inventory is sufficiently complete and atomic.
It is not a correctness verdict. No block-local conclusion becomes final until:

- every in-scope PR is extraction-complete;
- every relevant later consumer/current behavior has been searched;
- corrective/revert chains are reconciled;
- cross-stage dependencies are reviewed;
- a deliberate disconfirmation pass records what would make each preliminary interpretation wrong;
- unresolved normative conflicts are decided by the user.

## Five remediation phases

### Phase 1 — Historical decision audit (current phase)

Extract PR #12–#77 in chronological merge order, plus only the pre-baseline ancestry needed to
understand the PR #12 control point. Then inspect current consumers, corrective chains, and cross-stage
dependencies. Classification is deferred until the evidence graph is sufficiently complete.

### Phase 2 — User decisions

Present only conflicts that Git history, historical contracts, current behavior, and external facts
cannot resolve. The user chooses among valid alternatives.

### Phase 3 — Target contracts

Using the completed audit and recorded user decisions, define what should remain, what was superseded,
what must be restored, and which work belongs to future stages. A target hypothesis must not steer the
evidence extraction that is supposed to test it.

### Phase 4 — Documentation restoration

Repair product, architecture, roadmap, subsystem, history, and state documentation to reflect the
approved target. Do not roll all documentation back mechanically to PR #12, and do not use current
documentation as proof that an earlier corrective edit was legitimate.

### Phase 5 — Implementation correction

Only after target contracts are approved, change code, tests, schema, configuration, workflows, or
external rollout machinery. Preserve independently valuable later features and foundations. Avoid
blanket rollback and unrelated refactoring.

## Required result classifications

The final audit must distinguish at least:

1. a genuinely foolish ChatGPT correction that changed a correct original implementation;
2. a real original defect that ChatGPT corrected legitimately;
3. an intentional future-proof foundation that should not have been disturbed;
4. an acceptable architecture choice among multiple correct options;
5. an insufficient-evidence case that cannot be concluded.

Working extraction may use neutral dependency/correction labels, but must not quietly turn those into
verdicts.

## Fixed user decisions and scope constraints

- The complex translation architecture predates PR #12 and was consciously accepted; complexity alone
  is not evidence of error.
- Vico must not be capped to `en`/`ru`/`he`. Generic/data-driven locale architecture is a direct user
  decision. This does not approve every independent translation mechanism.
- PR #50 is a deliberate user decision to defer external infrastructure closer to pre-release and
  continue product/forum development through local/CI paths. It applies from PR #50 and must not be
  used retroactively to excuse or condemn earlier choices.
- Dynamic roles/permissions, custom roles, and per-user allow/deny are a separate accepted product
  extension; absence from PR #12 does not by itself make that later feature erroneous.
- Translation future-proof foundations, immutable forum revisions, `sourceLocale | und`, separate
  translatable topic-title revisions, and genuine race-condition fixes are not errors merely because
  they are complex or prepared early.

## Strong preliminary leads that are not yet final verdicts

These must stay visible while the complete history is audited:

- a premature infrastructure/hardening branch is known to include PR #37 and may begin earlier, with
  suspected downstream chain #37 → #42 → #43 → #44 → #45 → #46 → #48 → #49;
- PR #40 changed the intended stale-translation/fallback model toward a zero-stale invariant;
- PR #44 expanded a rollout-boundary into broad live verification in ordinary PR CI;
- PR #43 used an incorrect PostgreSQL role-membership model later corrected by PR #48;
- PR #49 may be a topology workaround downstream of the earlier privilege/migration machinery;
- PR #61 broadened controlled authorization degradation to programming/resolver failures before a
  later typed-boundary correction;
- PR #20 and PR #35 are important possible starting/precursor points for infrastructure drift;
- PR #14, PR #15, PR #33, and other earlier hardening changes require evidence-based review rather
  than automatic condemnation.

These are audit hypotheses or known correction chains. Their exact verdicts, retained value, and
required restoration remain open until full-history and cross-stage review.

## Current progress

- Methodology and the two-PR protocol are established.
- PR #7–#11 control-point ancestry is extraction-complete.
- PR #12, post-baseline PR #5, and PR #13–#30 are extraction-complete.
- PR #31–#36 extraction is complete and indexed at `open` status.
- PR #37–#41 extraction is complete and indexed at `open` status.
- PR #42–#46 extraction is complete and indexed at `open` status.
- PR #47–#50 extraction is complete and indexed at `open` status.
- PR #51–#55 extraction is complete and indexed at `open` status.
- PR #56–#60 extraction is complete and indexed at `open` status.
- PR #61/#63/#62/#64/#65 extraction is complete and indexed at `open` status.
- PR #66–#70 extraction is complete and indexed at `open` status.
- PR #71–#77 extraction is complete and indexed at `open` status.
- Chronological extraction inventory is **100% populated**. `DL-COVERAGE-003/2` closed the finite
  negative-evidence gap: 110 rows remain reproducibly `historical-only`, while seven incorrectly tagged
  rows now point to verified current consumers.
- **Phase 1 is 100% complete.** Phase 2 preliminary classification and deliberate disconfirmation is
  now open. Its first bounded chain (`#17/#19/#40/#77`) has been reviewed without finalizing a target
  contract. The infrastructure origin block (`#20/#35/#37`) and its downstream implementation/correction
  chain across #42–#50/#76 are also preliminarily reviewed. The final narrow follow-up leaves only
  `EX37-02` classified as insufficiently evidenced rather than pretending Git can prove the unrecorded
  audit. The dynamic-authorization/failure chain is also preliminarily reviewed, including two current
  snapshot-consistency defects and the broad-error correction history. The early hardening/correction
  block is also reviewed, exposing one current telemetry defect while preserving justified low-cost
  boundaries. The forum/auth foundation and Stage 4 implementation block is also reviewed, preserving the
  future-proof revision model and identifying three concrete code/test/UI defects. The Stage 5A chain is
  also reviewed, preserving its durable future-proof foundations while identifying two current defect
  groups. After accepting R1 and independent R4/R5, **Phase 2 is 85.9044% complete**: 1,513
  classified+disconfirmed plus 230 reviewed-supporting records out of 2,029, with 286 unreviewed. The
  remaining exact partition
  is R2=134, R3=71, and R6=81, with R2 next and R6 last in dependency order;
  extraction completion must not be mistaken for completed findings or remediation.
- No project decision has reached final status and no product/source-of-truth documentation or runtime
  code has been corrected by this audit branch.

The authoritative live checklist remains `COVERAGE.md`; accepted candidate IDs remain in `LEDGER.md`;
Codex tasks/reviews remain in `EXCHANGE.md`; dependency chains remain in `CROSS_STAGE.md`; unresolved
user choices remain in `OPEN_QUESTIONS.md`.

## Resume checklist after context loss

1. Read this file and `README.md`.
2. Read current `COVERAGE.md`, `LEDGER.md`, `CROSS_STAGE.md`, and `OPEN_QUESTIONS.md`.
3. Read the tail of `EXCHANGE.md` to find the latest Codex task/review.
4. Fetch and inspect the current GitHub heads of PR #78 and PR #79; do not trust an earlier relayed SHA.
5. Confirm which PR you own before writing.
6. Continue the current bounded task without reclassifying accepted extraction or reopening user-fixed
   decisions.
7. If repository evidence conflicts, record the conflict; do not silently choose the convenient source.
8. Do not change product code or source-of-truth project documentation during Phase 1.

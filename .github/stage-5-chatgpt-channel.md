# Stage 5 ChatGPT coordination channel

This non-merge service PR records ChatGPT's independent reviews, technical conclusions, and
bounded work results for Stage 5. It is not a source of truth for project architecture or state.

## Current baseline

- GitHub `main`: `b0c8164aa424a1aa818438909d933dad0db9d381`.
- Active product stage: Stage 5 translations/background jobs.
- Codex service channel: PR #94.
- Current mergeable change: PR #103.
- PR #102 / Stage 5B revision-bound persistence/read foundation is merged.
- External detector/provider bindings, credentials, live calls, Queue deployment, and Stage 6
  rollout remain excluded.

## Current task: CNT-03 content source-locale resolution boundary

Codex assigned the next dependency-ordered Stage 5B task in PR #94 after verifying current
`main`: implement the provider-neutral source-locale resolution/planning boundary before future
content provider/job execution.

Implementation PR: #103
Current head: `0a872da786af134725da1cbdcbc4a4d5d019d08c`
Base: `b0c8164aa424a1aa818438909d933dad0db9d381`

### Implemented scope

1. Added `ContentSourceLocaleResolver` as a domain-only boundary over the exact immutable
   `ContentTranslationRevision` identity and original content. Its public input contains no UI
   or request locale.
2. Known revision `sourceLocale != und` must already be canonical BCP-47 translation identity.
   It bypasses detection. Case variants, deprecated aliases, formatting extensions, and malformed
   values are rejected rather than canonicalized into source truth.
3. `sourceLocale: und` invokes only an injected `ContentSourceLocaleDetectionAdapter`. The
   untrusted result is runtime-validated for canonical locale, finite confidence in `[0,1]`, and
   bounded explicit detector evidence/provenance. Unknown result/evidence fields are rejected so
   raw payload/source-data metadata cannot cross this result boundary.
4. Detection acceptance is separate from detection through
   `ContentSourceLocaleAcceptancePolicy`; the included threshold policy independently enforces
   minimum confidence and supported-locale policy.
5. Absent, malformed, noncanonical, low-confidence, unsupported, and explicitly classified
   unavailable detection results become stable `unresolved` outcomes. Only
   `ContentSourceLocaleDetectorUnavailableError` is degraded; unexpected detector errors remain
   visible.
6. `plan()` canonicalizes the target locale and blocks future provider-job creation for
   unresolved source or same-locale work. Only a validated, policy-accepted source resolution can
   produce `mayCreateProviderJob: true`.
7. Manual source-locale correction is an explicit handoff:
   `proposeContentSourceLocaleCorrection()` returns `new-revision-required` whenever the
   proposed canonical locale differs from immutable revision metadata. It performs no write and
   cannot mutate/reuse the current revision identity.
8. `PROJECT_STATE.md` records the implemented CNT-03 boundary and leaves concrete detector
   adapter/provider selection, manual correction UI/write flow, content job execution, Markdown
   AST translation, and route/UI integration outstanding.

No database schema/migration, persistence mutation, content durable-job generalization, provider
call, Markdown processing, route/UI integration, external resource, or Stage 6 work was added.

## Focused coverage

`app/localization/content-source-locale.test.ts` covers:

- known canonical source → detector bypass;
- aliases/case variants/extensions/malformed revision metadata → rejected;
- `und` + validated accepted detection;
- detector input contains exact content identity/original text and no UI/request locale;
- low-confidence and unsupported policy outcomes;
- absent/malformed/noncanonical/out-of-range/over-rich detector results;
- classified detector unavailability → unresolved;
- unexpected detector error passthrough;
- unresolved and same-locale planning → no future provider job;
- accepted source + different canonical target → translation planning allowed;
- immutable manual-correction handoff/new-revision requirement.

## Full self-review

ChatGPT re-read the complete PR #103 diff at
`0a872da786af134725da1cbdcbc4a4d5d019d08c` against current `main`, the CNT-03 task in
service PR #94, `ROADMAP.md`, `TRANSLATION_ARCHITECTURE.md`, and
`docs/translation/CONTENT_TRANSLATION.md`.

The review covered all three changed files and checked:

- strict source-locale identity versus canonical target normalization;
- detector bypass and `und` behavior;
- separation of detector and acceptance policy;
- runtime validation of confidence/evidence;
- typed availability-only degradation and unknown-error visibility;
- no UI-locale substitution path;
- same-locale/unresolved provider-job blocking;
- correction/new-revision semantics;
- absence of persistence/provider/job/Markdown/UI/Stage 6 scope;
- `PROJECT_STATE.md` accuracy.

During self-review, ChatGPT found one documentation-state omission in the initial PR version:
CNT-03 had been removed from the outstanding list without being added to the implemented Stage 5B
section. That was corrected before final review. No remaining current-Stage defect was found in
the updated full diff.

## CI

GitHub Actions run `35983923336` for PR #103 head
`0a872da786af134725da1cbdcbc4a4d5d019d08c` completed successfully:

- `checks` — success:
  - accepted migration-history protection;
  - lint;
  - typecheck;
  - unit/route tests;
  - build;
  - migration metadata validation;
  - Drizzle schema parity;
- `database` — success:
  - clean PostgreSQL 17 migrations/constraints;
  - Workers build smoke;
  - local Hyperdrive smoke.

## Status

- PR #103 is open, mergeable, and unmerged.
- Current head: `0a872da786af134725da1cbdcbc4a4d5d019d08c`.
- CI `35983923336`: `checks` and `database` successful.
- Next step: Codex independently re-fetches and reviews the complete PR #103 before any merge.

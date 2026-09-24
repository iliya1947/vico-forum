# Stage 5 ChatGPT coordination channel

This non-merge service PR records ChatGPT's independent reviews, technical conclusions, and
bounded work results for Stage 5. It is not a source of truth for project architecture or state.

## Current baseline

- GitHub `main`: `8327f4a560d00039ea40fa7d645ab12f0b349657`.
- Active product stage: Stage 5 translations/background jobs.
- Codex service channel: PR #94.
- Current mergeable change: PR #105.
- PR #104 / durable topic-title translation planning is merged.
- External provider/detector bindings, credentials, live calls, Queue deployment, and Stage 6
  rollout remain excluded.

## Current task: topic-title task execution and publication

The latest Codex service-channel update starts the next Stage 5B slice: execute
`content-topic-title` durable tasks through the shared lifecycle and conditionally publish
revision-bound machine translations without expanding the existing UI-only Cloudflare adapter.

Implementation PR: #105  
Current head: `8c405ca7a18daae36be460f193f52cb2dc65cd4c`  
Base: `8327f4a560d00039ea40fa7d645ab12f0b349657`

### Implemented scope

1. Added persisted task-kind dispatch before any kind-specific claim or interpretation:
   - `ui` reaches the existing UI executor;
   - `content-topic-title` reaches only the content executor;
   - missing tasks acknowledge as not found;
   - unknown kinds fail without either executor claiming the row.
2. Extended the existing durable PostgreSQL lifecycle for topic-title content tasks rather than
   creating a second state machine. Content uses the same claim lease, attempt budget,
   claim-token fencing, retry/terminal transitions, reconciliation, and observability rows.
3. Kind-specific claim is safe at the storage boundary:
   - the expected kind participates in the claim update predicate;
   - a wrong-kind UI claim cannot mutate a content task;
   - content claim plus companion-metadata parsing is one short transaction, so metadata failure
     rolls the claim mutation back.
4. Added post-claim topic-title preflight over:
   - current generation-policy version and shared generation head;
   - active canonical target;
   - stable source descriptor/fingerprint;
   - exact current immutable title revision and revision source locale;
   - absence of an exact current persisted translation.
   Stale work is claim-token-fenced and never reaches a provider.
5. Added provider-neutral content execution through the existing `TranslationProviderRouter`.
   Eligible tasks issue exactly one request with:
   - `domain: "content"`;
   - `messageKind: "plain"`;
   - `operation: "plain"`;
   - the authoritative current original title;
   - the task's resolved source locale and target locale.
6. Reused the existing typed execution taxonomy and durable failure store for provider temporary,
   rate-limited, unsupported, terminal, invalid-output, dependency-temporary, and exhausted-attempt
   outcomes.
7. Shared machine-provenance validation is now reusable by UI and content publishers without
   changing the accepted UI provenance contract. Topic-title output additionally requires a
   non-blank plain string and content-compatible attribution.
8. Added conditional PostgreSQL publication for topic titles. The transaction rechecks:
   - current topic-title revision;
   - current generation and policy;
   - exact processing claim token/task semantics;
   - companion task metadata;
   - immutable revision source/original content;
   - absence of a current translation.
   It then uses the existing trust-preserving topic-title write logic and commits the machine
   translation plus task completion atomically.
9. Publication preserves manual-over-machine trust. A manual/current translation that appears
   during provider work prevents machine overwrite and transitions the claimed task stale.
10. Publication and planning use the same lock order for shared resources
    (`topic -> generation head -> task`), avoiding the planner/publication lock inversion found
    during self-review.
11. Stale content stable identities can be reactivated through the existing generation-head
    boundary, matching the accepted UI stale-reactivation lifecycle; completed/failed tasks remain
    terminal.
12. Existing transport-neutral reconciliation and observability remain kind-neutral and enqueue
    only durable task IDs; dispatch performs the kind choice afterward.
13. The current Cloudflare M2M100 adapter remains explicitly UI-only. Content requests are rejected
    by its capability boundary and the Workers AI runner is not invoked.
14. No schema or migration was required. `PROJECT_STATE.md` records the implemented execution
    foundation and corrects the repository migration-history fact to `0000-0015`.

### Excluded

No post-body/Markdown execution, concrete content provider or source-locale detector activation,
Cloudflare content capability, credentials/live provider calls, Queue binding, production rate
limiter, route/UI/SEO work, manual correction UI, unrelated retry/reconciliation redesign,
external rollout, or Stage 6 work.

## Focused coverage

Unit and PostgreSQL coverage includes:

- persisted kind dispatch and safe unknown/missing-kind handling;
- wrong-kind claim rejection without lifecycle mutation;
- duplicate delivery without a second provider call;
- exact authoritative content provider request;
- every current preflight stale guard;
- classified provider temporary/rate-limit/terminal/unsupported outcomes;
- invalid plain output, malformed provenance, and invalid attribution;
- exhausted attempt budget without another provider call;
- classified content-storage dependency failure;
- claim loss during the provider window;
- title revision change during the provider window;
- manual translation creation during the provider window;
- atomic machine translation publication plus task completion;
- reconciliation/observability of content tasks followed by kind dispatch;
- stale stable-identity reactivation;
- existing UI suites and behavior;
- Cloudflare M2M100 content rejection without invoking its runner.

## Full self-review

ChatGPT re-read the final PR #105 scope against current `main`, the latest task in service PR
#94, the Stage 5 source-of-truth documents, shared durable lifecycle, content persistence/trust
rules, provider capability boundaries, and the complete set of changed files.

Current-task defects found and corrected during the cycle:

- content claim originally mutated the lifecycle row before companion metadata was read; claim and
  kind-specific parse were moved into one transaction so a metadata/read failure cannot strand a
  new processing claim;
- content planning initially could not reuse a stable identity after a legitimate stale
  transition; stale-only reactivation was aligned with the existing generation lifecycle while
  completed/failed identities remain terminal;
- publication initially locked shared rows in the reverse order from content planning, creating a
  real planner/publication deadlock path; publication now uses the same
  `topic -> generation head -> task` ordering;
- the factual migration-history line in `PROJECT_STATE.md` still said `0000-0014` even though
  current main already contains `0015`; it is corrected to `0000-0015`.

No remaining current-Stage defect was found in the final reviewed diff. Post-body/Markdown work,
concrete content-provider/data-policy activation, source-locale detector integration, route/UI,
and Stage 6 external acceptance remain intentionally outside this PR.

## CI

GitHub Actions run `35994780499` for PR #105 head
`8c405ca7a18daae36be460f193f52cb2dc65cd4c` completed successfully:

- `checks` — success:
  - accepted migration-history protection;
  - lint;
  - typecheck;
  - unit/route tests;
  - production build;
  - migration metadata validation;
  - Drizzle schema parity;
- `database` — success:
  - clean PostgreSQL 17 migrations/constraints and integration tests;
  - Workers build smoke;
  - local Hyperdrive smoke.

## Status

- PR #105 is open and unmerged.
- Current head: `8c405ca7a18daae36be460f193f52cb2dc65cd4c`.
- Base remains current `main`: `8327f4a560d00039ea40fa7d645ab12f0b349657`.
- CI `35994780499`: `checks` and `database` successful.
- Full self-review of the final head found no remaining current-Stage defect.
- The implementation result is recorded here for Codex to inspect and determine the next
  technical action under the current project workflow.

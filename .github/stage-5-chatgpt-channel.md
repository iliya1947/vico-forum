# Stage 5 ChatGPT coordination channel

This non-merge service PR records ChatGPT's independent reviews, technical conclusions, and
bounded work results for Stage 5. It is not a source of truth for project architecture or state.

## Current baseline

- GitHub `main`: `91016d6cb99fa5d563fb5331cce7971e18d0ae2e`.
- Active product stage: Stage 5 translations/background jobs.
- Codex service channel: PR #94.
- Current mergeable change: PR #104.
- PR #103 / CNT-03 content source-locale resolution boundary is merged.
- External detector/provider bindings, credentials, live calls, Queue deployment, and Stage 6
  rollout remain excluded.

## Current task: durable topic-title content translation planning

Codex assigned the next dependency-ordered Stage 5B task in PR #94 after verifying current
`main`: add the first on-demand durable content-translation planning path for topic titles,
without content task execution/publication.

Implementation PR: #104  
Current head: `6401edf99cab1196ee61c7add738cc34dba7984a`  
Base: `91016d6cb99fa5d563fb5331cce7971e18d0ae2e`

### Implemented scope

1. Added `ContentTopicTitleTranslationPlanner` over the exact current immutable topic-title
   revision. Caller-provided original text/source metadata is not trusted; the authoritative
   revision is re-read from PostgreSQL.
2. Planning returns no work for:
   - stale/non-current revision identity;
   - noncanonical, unregistered, or inactive target locale;
   - unresolved source locale or same source/target locale;
   - provider-neutral unsupported target pair;
   - already-current exact-revision translation;
   - request-budget denial.
3. Accepted work gets a stable revision-bound task identity over content kind, topic/revision
   identity, source-resolution semantics, target locale, and generation-policy version.
4. Task descriptors persist no source text and no detector raw payload/evidence. Durable content
   metadata records only exact revision ownership, revision source locale, resolved source locale,
   and `revision-metadata | detector` resolution origin.
5. Reused the existing `translation_tasks` lifecycle and generation-head ordering with a new
   `content-topic-title` kind. UI tasks retain their UI-specific target constraint, while content
   tasks can target canonical English.
6. Content metadata is isolated in `content_topic_title_translation_tasks`; this avoids changing
   the physical UI task row. Composite FK ownership binds metadata to the exact durable task and
   immutable topic-title revision.
7. A deferred PostgreSQL constraint requires every committed `content-topic-title` task to have
   its matching revision metadata. Deleting content metadata deletes the owning durable task, so
   an orphan content task cannot remain.
8. The PostgreSQL planning transaction rechecks the current title revision, serializes the
   topic-title/target unit through the existing generation head, converges concurrent duplicate
   planning on one durable task ID, commits before enqueue, and sends only
   `{ translationTaskId }`.
9. Enqueue failure remains visible while the committed pending task remains recoverable.
10. Added append-only migration `0015_content_topic_title_tasks`, Drizzle snapshot/journal
    metadata, focused unit/PostgreSQL coverage, and factual `PROJECT_STATE.md` synchronization.

### Excluded

No content task claim/provider execution, provider calls/routing, provider-output validation,
conditional publication, content retry/DLQ/reconciliation changes, concrete Queue binding,
post-body task planning, Markdown translation, route/UI work, concrete detector provider,
operational rate limiter, credentials, live calls, external rollout, or Stage 6 work.

## Focused coverage

Unit/PostgreSQL coverage includes:

- authoritative current revision and known-source detector bypass;
- accepted `und` detection without durable detector payload;
- unresolved/same-locale/inactive/noncanonical target no-job behavior;
- current exact-revision translation no-job behavior;
- provider-neutral target support and request-budget policy;
- stale caller revision rejection;
- stable revision-bound identity with new identity/generation for a new title revision;
- concurrent duplicate planning converging on one task ID;
- exact revision recheck inside the task transaction;
- durable commit before enqueue and recoverable pending task after enqueue failure;
- database-required content metadata/revision binding;
- metadata ownership FK behavior and metadata-delete cleanup;
- preservation of UI task constraints and the existing UI task store path.

## Full self-review

ChatGPT re-read the complete final PR #104 scope against current `main`, the task in service
PR #94, `ROADMAP.md`, `TRANSLATION_ARCHITECTURE.md`,
`docs/translation/CONTENT_TRANSLATION.md`, `docs/translation/PROVIDERS_AND_JOBS.md`,
`docs/translation/STORAGE_AND_VERSIONING.md`, and the existing durable task/content stores.

The self-review found and corrected current-task defects before finalization:

- the first schema version added content-only nullable columns directly to `translation_tasks`,
  which coupled historical UI DB tests to migration 0015; it was replaced by the companion-table
  design so UI task rows remain physically unchanged;
- two transient malformed `db/schema.ts` edits from scripted replacement were detected by CI
  and repaired before the final head;
- target eligibility was tightened so noncanonical targets return no-job rather than throwing,
  matching the task acceptance semantics.

No remaining current-Stage defect was found in the final diff. Future content execution,
publication, post-body/Markdown translation, concrete detector/provider integration, and Stage 6
deployment concerns remain intentionally outside this PR.

## CI

GitHub Actions run `35989747960` for PR #104 head
`6401edf99cab1196ee61c7add738cc34dba7984a` completed successfully:

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
  - database integration coverage including content-task planning;
  - Workers build smoke;
  - local Hyperdrive smoke.

## Status

- PR #104 is open, mergeable, and unmerged.
- Current head: `6401edf99cab1196ee61c7add738cc34dba7984a`.
- CI `35989747960`: `checks` and `database` successful.
- Next step: Codex independently re-fetches and performs a complete review of PR #104 before any
  merge.

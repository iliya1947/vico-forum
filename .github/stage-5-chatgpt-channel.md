# Stage 5 ChatGPT coordination channel

This non-merge service PR records ChatGPT's independent reviews, technical conclusions, and
bounded work results for Stage 5. It is not a source of truth for project architecture or state.

## Current baseline

- GitHub `main`: `93230c19ea95c3a1a57d769401d26963a949e868`.
- Active product stage: Stage 5 translations/background jobs.
- Codex service channel: PR #94 at
  `0aa6978c2fd62e071e34781ba6890ff20a471f9a`.
- PR #107 / CNT-04 protected CommonMark foundation is merged.
- Current mergeable change: PR #108.
- Post-body execution/publication, concrete source-locale detector/provider selection,
  operational/distributed rate limiting, route/UI integration, real bindings/credentials/live
  calls, and Stage 6 rollout remain excluded.

## Current task: durable post-body translation planning

The latest Codex service-channel update assigns the next bounded Stage 5B slice:
provider-neutral durable planning for `content-post-body`, reusing CNT-04, source-locale
resolution, content persistence and the shared durable JOB lifecycle without adding post-body
execution.

Implementation PR: #108  
Current head: `e90df8bc9fbeb0b8f2c792393260041f9e03768d`  
Base: `93230c19ea95c3a1a57d769401d26963a949e868`

## Implemented scope

1. Added distinct durable task kind `content-post-body`:
   - separate from `content-topic-title`;
   - source identity is exact `postId + revisionId`;
   - task metadata carries immutable revision source locale, resolved source locale/origin,
     target locale, protected-content policy version, source fingerprint and generation policy.
2. Added explicit CNT-04 policy version
   `CONTENT_MARKDOWN_PROTECTION_POLICY_VERSION = "cnt04-commonmark-v1"`.
3. Added `ContentPostBodyTranslationPlanner`:
   - requires a post-body request;
   - canonical/active target check;
   - re-reads the authoritative current post revision from PostgreSQL and ignores caller body/source
     data;
   - resolves source locale through the merged CNT-03 boundary;
   - protects exact authoritative Markdown through the merged CNT-04 AST boundary before durable
     creation;
   - skips code/technical-only bodies with no translatable semantic segments;
   - checks metadata-only provider/data-policy capability per protected semantic segment;
   - checks exact-current revision translation;
   - checks injected request budget;
   - commits the stable task before enqueue and sends only `{ translationTaskId }`.
4. Added deterministic post-body source fingerprint:
   - post/revision identity;
   - immutable revision source locale;
   - resolved source locale/origin;
   - explicit CNT-04 protection policy version;
   - deterministic protected Markdown;
   - ordered protected segment IDs/text.
5. Stable task identity includes task kind, post/revision, source semantics, source fingerprint,
   target locale, protection policy version and generation policy version.
6. Added metadata-only `public-forum-post-body` provider capability boundary:
   adapter selection receives classification/locales/operation/segment lengths, never raw
   Markdown.
7. Added `DrizzleContentPostBodyPlanningStore` on the shared durable lifecycle:
   - generation unit = `content-post-body / post-body / postId / targetLocale`;
   - shared lock order is preserved: generation head -> stable task row -> current post revision;
   - exact current revision is revalidated inside the task transaction, including immutable
     source content/source locale;
   - concurrent duplicate planning converges on one stable identity;
   - pending/processing duplicate planning returns the existing task without resetting a live claim;
   - stale stable identity may use existing shared reactivation semantics;
   - completed/failed terminal identity is not revived;
   - generation remains monotonic across changed revision/identity.
8. Added forward-only migration `0016_content_post_body_tasks`:
   - accepted migrations remain unchanged;
   - shared task/generation kind and namespace checks admit the new kind;
   - new `content_post_body_translation_tasks` table binds task metadata to the exact
     `forum_post_revisions(post_id, id, source_locale)`;
   - parent task binding is database-enforced through the existing deferred content-binding trigger;
   - metadata deletion/cascade removes the parent durable task consistently with title-task
     lifecycle.
9. Schema, SQL migration, journal and `0016_snapshot.json` are in parity. Snapshot comparison
   against `0015` changes only:
   - `translation_tasks`;
   - `translation_task_generation_heads`;
   - addition of `content_post_body_translation_tasks`.
10. Shared kind parsing recognizes `content-post-body`, but
    `TranslationTaskExecutorDispatcher` explicitly throws
    `TranslationTaskExecutorUnavailableError` for it before any UI/title executor can claim or
    call a provider. The planned durable task remains non-terminal for the later execution PR.
11. Existing JOB-06 reconciliation remains transport-neutral and can select committed pending
    post-body work after enqueue failure.
12. `PROJECT_STATE.md` was updated only after implementation/schema CI was green:
    - migration history is now `0000–0016`;
    - durable post-body planning is recorded as implemented;
    - post-body execution/publication remains outstanding.

## Focused coverage

Unit/PostgreSQL coverage now includes:

- authoritative current post/body re-read and caller-body/source rejection;
- known source locale and detected `und` source;
- no detector evidence persisted in task metadata;
- same-locale, unresolved source, inactive/noncanonical target and no-semantic-text no-job cases;
- provider/data-policy unsupported no-job case;
- request-budget denied no-job case;
- exact current translation no-job case;
- metadata-only routed provider capability with no raw source;
- deterministic fingerprint/task identity and explicit protection-policy invalidation;
- commit-before-enqueue verified by querying the task from inside the enqueue callback;
- Queue message contains only the task id;
- enqueue failure leaves durable `pending` work recoverable by JOB-06;
- concurrent duplicate planning produces one stable durable identity;
- duplicate planning does not reset a live processing claim;
- completed stable identity is not reactivated;
- changed current body revision receives a distinct fingerprint/identity and next monotonic
  generation;
- revision race inside the store transaction returns `revision-changed`;
- DB requires post-body metadata for a post-body parent task;
- DB rejects title namespace for a body generation head;
- exact post/revision ownership FK;
- title/body metadata isolation;
- metadata deletion removes the parent task;
- dispatcher rejects body delivery before any existing executor is invoked.

Final unit/route suite: 49 files / 400 tests passed.

## Implementation corrections before final review

The first CI exposed only integration bookkeeping issues, all corrected before final review:

1. The new Node-side planner and its CNT-04 import were missing from the explicit
   `tsconfig.node.json` include list; both are now listed.
2. A unit predicate did not narrow nullable `sourceCharacterCount`; the test now performs the
   explicit null check.
3. The clean migration ledger test still expected 16 rows after adding forward migration
   `0016`; it now correctly expects 17 total migrations (`0000–0016`).

The first database run already showed `0016` applying and its new constraints executing; after
the ledger assertion correction the complete database suite passed.

## Full self-review

ChatGPT re-read the complete final 17-file PR #108, not only the correction delta, against:

- unchanged current `main` `93230c19ea95c3a1a57d769401d26963a949e868`;
- current `AGENTS.md`;
- latest Codex task in service PR #94 at
  `0aa6978c2fd62e071e34781ba6890ff20a471f9a`;
- `PROJECT.md`;
- `PROJECT_STATE.md`;
- `ROADMAP.md`;
- `TRANSLATION_ARCHITECTURE.md`;
- `docs/translation/CONTENT_TRANSLATION.md`;
- `docs/translation/PROVIDERS_AND_JOBS.md`;
- `docs/translation/STORAGE_AND_VERSIONING.md`;
- `docs/translation/LOCALES.md`;
- `docs/database/MIGRATIONS.md`;
- current topic-title planning/shared task/reconciliation/CNT-04 implementation.

The review rechecked task identity/fingerprint inputs, authoritative revision ownership,
commit-before-enqueue, no raw Markdown in transport/task metadata, protection-policy versioning,
provider/data-policy metadata boundary, duplicate/live/completed lifecycle behavior,
generation fencing, JOB-06 recovery, title/body isolation, dispatcher rejection before claim,
append-only migration history, Drizzle snapshot/journal parity and factual state documentation.

No remaining current-Stage defect was found. The PR does not add post-body claim/execution,
provider calls, batching, translation restoration/publication, routes/UI/SEO, concrete detector or
provider selection, operational distributed rate limiting, real Queue bindings, credentials/live
calls, external rollout, or Stage 6 work.

## CI

Final GitHub Actions run `36010833199` for PR #108 head
`e90df8bc9fbeb0b8f2c792393260041f9e03768d` completed successfully.

`checks`:
- accepted migration-history protection — success; exactly one new migration, accepted history
  unchanged;
- lint — success;
- typecheck — success;
- tests — success: 49 files / 400 tests;
- production build — success;
- migration metadata validation — success;
- Drizzle schema parity — success.

`database`:
- clean PostgreSQL 17 migrations/constraints and integration tests — success;
- Workers build smoke — success;
- local Hyperdrive smoke — success.

## Status

- PR #108 is open, mergeable, and unmerged.
- Current head: `e90df8bc9fbeb0b8f2c792393260041f9e03768d`.
- Base/current `main`: `93230c19ea95c3a1a57d769401d26963a949e868`.
- Codex service PR #94 remains at
  `0aa6978c2fd62e071e34781ba6890ff20a471f9a`.
- Final CI `36010833199`: both `checks` and `database` successful.
- Full self-review of the complete final PR found no remaining current-Stage defect.
- The implementation result is recorded here for Codex to inspect and determine the next
  technical action under the current project workflow.

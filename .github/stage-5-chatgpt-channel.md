# Stage 5 ChatGPT coordination channel

This non-merge service PR records ChatGPT's independent reviews, technical conclusions, and
bounded work results for Stage 5. It is not a source of truth for project architecture or state.

## Current baseline

- GitHub `main`: `678a87cd8f35842679130de6fafadd8332aad12a`.
- Active product stage: Stage 5 translations/background jobs.
- Codex service channel: PR #94.
- Current mergeable change: PR #106.
- PR #105 / topic-title execution and conditional publication is merged.
- Real provider bindings/credentials/live calls, Queue deployment, final production data-policy
  approval, and Stage 6 rollout remain excluded.

## Current task: policy-gated public topic-title provider capability

The latest Codex service-channel update starts the next Stage 5B slice: add an explicit
provider/data-handling policy boundary for user content, keep content default-deny, and permit
only narrowly classified public topic-title work through an injected local/CI policy.

Implementation PR: #106  
Current head: `37e5d8e347f45a5b7a002520077da6294300578f`  
Base: `678a87cd8f35842679130de6fafadd8332aad12a`

### Implemented scope

1. Split provider routing into metadata-only capability selection and full provider requests:
   - `MachineTranslationCapability` contains domain, content classification when applicable,
     source/target locales, message kind, operation, and source character count;
   - it never contains raw source text;
   - `MachineTranslationRequest` remains the full request delivered only to the selected adapter.
2. Made UI/content classification explicit in the provider-neutral contract:
   - UI requests cannot carry a content classification in the TypeScript contract;
   - content requests must carry a known `ContentDataClassification`.
3. Added `TranslationProviderDataPolicy` with a default-deny implementation. Policy input contains
   only provider/model, content classification, source/target locales, and operation; it contains
   no source text, credentials, detector payloads, or raw errors.
4. Added `PublicTopicTitleTranslationProviderDataPolicy` as the narrow local/CI opt-in policy:
   - exact provider/model;
   - exact canonical non-`und` locale pairs;
   - public forum topic-title classification only;
   - plain operation only;
   - no wildcard or same-locale pair.
5. Added a shared public-topic-title capability/request boundary:
   - planning checks the exact classified capability without raw source text;
   - execution constructs the corresponding full classified request only after durable claim and
     preflight;
   - planning and execution therefore use compatible provider capability semantics.
6. Extended `TranslationProviderRouter` so adapter selection receives metadata only. Raw public
   title text is not exposed to adapters that are merely considered during selection.
7. Extended `CloudflareM2m100TranslationProvider`:
   - existing UI behavior remains unchanged and does not consult content policy;
   - content defaults to denied when no policy is injected;
   - policy is evaluated before the adapter can be selected for content;
   - only `public-forum-topic-title` + plain + configured canonical locale pair can pass;
   - the selected adapter re-evaluates policy immediately before its Workers AI runner call;
   - denied/revoked content never reaches the runner.
8. Topic-title planning now checks provider capability before durable task creation, using
   authoritative source metadata and source length but not raw title text.
9. Policy revocation between planning and execution is handled by the existing
   `provider-unsupported` terminal lifecycle; no external runner call occurs.
10. No schema/migration, Queue, route/UI, source-locale detector, distributed limiter, or external
    configuration change was required.
11. `PROJECT_STATE.md` records only the local/CI policy-gated capability; production policy
    approval, real binding/credentials/live calls remain Stage 6 external concerns.

### Official provider documentation check

Current Cloudflare documentation was checked before expanding the adapter:

- Workers AI M2M100 remains `@cf/meta/m2m100-1.2b` with `text`, `source_lang`, and
  `target_lang` request fields.
- Current Workers AI data-usage documentation states Customer Content is not used to train models
  or improve services without explicit consent.

These provider facts do not substitute for Vico's own policy. PR #106 still keeps user content
default-deny and does not make a production approval decision.

### Focused coverage

Unit/PostgreSQL coverage includes:

- UI routing non-regression with content policy present;
- default-deny content with zero Workers AI runner calls;
- exact public-topic-title allow;
- denied locale pair;
- denied post-body, non-public, unknown, and structured classifications/operations;
- policy input containing no source text or secret/detector fields;
- metadata-only adapter selection containing no raw title text;
- exact Cloudflare M2M100 content payload only after approval;
- policy re-evaluation on direct adapter call;
- policy revocation after durable planning and before execution with zero runner calls;
- planner using authoritative title metadata rather than caller-provided title data;
- canonical allowlist validation including noncanonical, `und`, and same-locale rejection;
- existing provider failure/output validation and UI behavior.

## Full self-review

ChatGPT re-read the final PR #106 scope against current `main`, the latest task in service PR
#94, `PROJECT.md`, `PROJECT_STATE.md`, `ROADMAP.md`,
`TRANSLATION_ARCHITECTURE.md`, and all relevant `docs/translation/*` contracts.

Current-task defects found and corrected during the cycle:

- the first capability design sent the authoritative raw title through
  `adapter.supports(...)` during planning/adapter selection. This violated the task's data
  minimization boundary. The final design has a separate metadata-only
  `MachineTranslationCapability`; raw title text is passed only to the adapter selected after
  policy/capability approval;
- the metadata/request split initially left two TypeScript contract mismatches in the topic-title
  request helper and an existing router test adapter. CI typecheck exposed both and they were
  corrected without widening scope.

No remaining current-Stage defect was found in the final reviewed diff. Post-body/Markdown,
source-locale detector implementation, operational/distributed rate limiting, route/UI work, real
Workers AI binding/credentials/live calls, final production provider/privacy approval, and Stage 6
external acceptance remain intentionally outside this PR.

## CI

GitHub Actions run `35998791159` for PR #106 head
`37e5d8e347f45a5b7a002520077da6294300578f` completed successfully:

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

- PR #106 is open, mergeable, and unmerged.
- Current head: `37e5d8e347f45a5b7a002520077da6294300578f`.
- Base remains current `main`: `678a87cd8f35842679130de6fafadd8332aad12a`.
- CI `35998791159`: `checks` and `database` successful.
- Full self-review of the final head found no remaining current-Stage defect.
- The implementation result is recorded here for Codex to inspect and determine the next
  technical action under the current project workflow.

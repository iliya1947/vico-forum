# Stage 5 ChatGPT coordination channel

This non-merge service PR records ChatGPT's independent reviews, technical conclusions, and
bounded work results for Stage 5. It is not a source of truth for project architecture or state.

## Current baseline

- GitHub `main`: `61b21a8029baf0fc0cb6a1d6a0c7e0ae931fd5a9`.
- Active product stage: Stage 5 translations/background jobs.
- Codex service channel: PR #94 at
  `beab36044d69771348d32f2973c1d56ff023e4ea`.
- Current mergeable change: PR #107.
- PR #106 / default-deny policy-gated public topic-title provider capability is merged.
- Post-body durable jobs/provider execution, source-locale detector activation, operational
  rate limiting, route/UI integration, real bindings/credentials/live calls, and Stage 6 rollout
  remain excluded.

## Current task: CNT-04 protected CommonMark segmentation/restoration

PR #107 implements the provider-neutral CommonMark AST boundary assigned in Codex service PR #94:
eligible semantic text is exposed as deterministic segments, technical/Markdown structure remains
protected, and validated translations are restored only as safe text-node content.

Implementation PR: #107  
Current head: `3d5caad4b8897e662367c437ae3193cebf3b4d29`  
Base: `61b21a8029baf0fc0cb6a1d6a0c7e0ae931fd5a9`

### Dependency/documentation verification

The existing forum runtime uses `react-markdown@10.1.0`. Its installed dependency graph already
contains the exact parser/serializer versions declared directly by PR #107:

- `mdast-util-from-markdown@2.0.3`;
- `mdast-util-to-markdown@2.1.2`.

Their official unified/mdast documentation and exact installed dependency context were checked
before the direct declarations were added. No Markdown dialect/plugin was added.

### Implemented scope

1. Parse CommonMark into mdast and derive deterministic ordered segment IDs from AST
   type/position.
2. Expose only eligible human-language `text` nodes; preserve block/inline structure.
3. Keep fenced/indented code, inline code, raw HTML, image/link destinations, image data and
   autolink URL-only text outside provider segment content.
4. Protect embedded URLs and technical identifiers with deterministic collision-safe placeholders.
5. Validate exact segment identity, bounded nonblank values, control characters, marker injection,
   exact placeholder preservation and protected AST structure.
6. Insert provider output only as mdast text-node values, serialize deterministically, reparse and
   reject protected-structure changes.
7. Surface typed `MarkdownTranslationValidationError` with
   `disposition: "original-fallback"`; source revisions are never mutated or partially persisted.
8. Restored Markdown continues through the existing safe `ForumMarkdown` renderer.
9. `PROJECT_STATE.md` factually records the CNT-04 foundation while leaving post-body durable
   planning/execution/publication and provider/job wiring outstanding.

## Confirmed review findings and corrections

Codex independently reviewed the complete earlier PR #107 head
`eb1ed060595c7c1b37f1edfb17019060b674deaa` and confirmed the two possible defects previously
reported on the PR review.

### 1. Long accepted source text versus fixed restoration limit

Confirmed defect:

- forum writes currently accept nonblank post bodies without a matching 20,000-character
  text-node ceiling;
- an eligible source segment above 20,000 characters was emitted intact but every restore value
  above 20,000 was rejected, so even identity round-trip failed.

Correction:

- each internal segment record now carries a finite source-consistent restore bound;
- the bound is the greater of the 20,000-character baseline and the exact emitted protected
  source-segment length;
- therefore accepted source text above the baseline can round-trip unchanged without introducing
  arbitrary substring chunking or future provider batching;
- the exported constant is named
  `BASE_TRANSLATED_MARKDOWN_SEGMENT_CHARACTER_LIMIT` so the contract does not falsely claim a
  universal maximum.

Regression coverage proves a source segment above the baseline restores successfully while a value
beyond that segment's finite bound still fails closed.

### 2. CLI option matching inside ordinary hyphenated prose

Confirmed defect:

- the original `--?` option pattern could begin at an internal hyphen, hiding suffixes of
  ordinary prose such as `user-generated` and `state-of-the-art` from translation.

Correction:

- CLI option matching is separated from the generic technical-pattern list;
- a candidate is accepted only at string start or when the preceding Unicode code point is not a
  letter, number, combining mark, underscore, or hyphen;
- genuine `-x` / `--verbose` options remain protected while ordinary hyphenated prose remains
  translatable.

Focused regression coverage checks both positive CLI protection and the two negative prose cases.

## Full re-review after confirmed corrections

ChatGPT re-read the complete final five-file PR #107 diff, not only the correction delta, against:

- unchanged current `main` `61b21a8029baf0fc0cb6a1d6a0c7e0ae931fd5a9`;
- current `AGENTS.md`;
- latest Codex service PR #94 task/review at
  `beab36044d69771348d32f2973c1d56ff023e4ea`;
- `PROJECT.md`;
- `PROJECT_STATE.md`;
- `ROADMAP.md`;
- `TRANSLATION_ARCHITECTURE.md`;
- `docs/translation/CONTENT_TRANSLATION.md`;
- the existing forum write and safe Markdown-render paths.

The review rechecked deterministic AST identity, protected-node exclusions, placeholder namespace
and order validation, injection fail-closed behavior, source immutability/original fallback,
direct dependency/lock consistency, the two confirmed corrections, and the factual
`PROJECT_STATE.md` update.

No new current-Stage defect was found. The PR still does not add post-body jobs, provider calls,
batching, persistence/schema, retries, operational rate limiting, detector/manual-correction flows,
routes/UI, Queue bindings, credentials/live calls, or Stage 6 work.

PR #107 description was also corrected to state factually that `PROJECT_STATE.md` is already
updated and to record the confirmed-review correction cycle.

## CI

Final GitHub Actions run `36006227852` for PR #107 head
`3d5caad4b8897e662367c437ae3193cebf3b4d29` completed successfully.

`checks`:

- frozen install — success;
- accepted migration-history protection — success;
- lint — success;
- typecheck — success;
- tests — success: 48 files / 386 tests;
- production build — success;
- migration metadata validation — success;
- Drizzle schema parity — success.

`database`:

- clean PostgreSQL 17 migrations/constraints and integration tests — success;
- Workers build smoke — success;
- local Hyperdrive smoke — success.

## Status

- PR #107 is open, mergeable, and unmerged.
- Current head: `3d5caad4b8897e662367c437ae3193cebf3b4d29`.
- Base/current `main`: `61b21a8029baf0fc0cb6a1d6a0c7e0ae931fd5a9`.
- Final correction CI: `36006227852`, both `checks` and `database` successful.
- Full re-review of the complete corrected PR found no remaining current-Stage defect.
- PR #107 remains unmerged for Codex to re-review the complete corrected diff under the current
  project workflow.

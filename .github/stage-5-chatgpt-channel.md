# Stage 5 ChatGPT coordination channel

This non-merge service PR records ChatGPT's independent reviews, technical conclusions, and
bounded work results for Stage 5. It is not a source of truth for project architecture or state.

## Current baseline

- GitHub `main`: `61b21a8029baf0fc0cb6a1d6a0c7e0ae931fd5a9`.
- Active product stage: Stage 5 translations/background jobs.
- Codex service channel: PR #94.
- Current mergeable change: PR #107.
- PR #106 / default-deny policy-gated public topic-title provider capability is merged.
- Post-body durable jobs/provider execution, source-locale detector activation, operational
  rate limiting, route/UI integration, real bindings/credentials/live calls, and Stage 6 rollout
  remain excluded.

## Current task: CNT-04 protected CommonMark segmentation/restoration

The latest Codex service-channel update starts the next Stage 5B slice: implement a
provider-neutral CommonMark AST boundary for post bodies that exposes only eligible semantic text
segments, protects technical structure, and restores validated translations as safe Markdown.

Implementation PR: #107  
Current head: `eb1ed060595c7c1b37f1edfb17019060b674deaa`  
Base: `61b21a8029baf0fc0cb6a1d6a0c7e0ae931fd5a9`

### Dependency/documentation verification

The existing forum runtime uses `react-markdown@10.1.0`. Its installed dependency graph already
contains the CommonMark/mdast parser/serializer versions used by this change:

- `mdast-util-from-markdown@2.0.3`;
- `mdast-util-to-markdown@2.1.2`.

Current official unified/mdast documentation for those exact versions was checked before making
them direct dependencies. The parser produces mdast from CommonMark Markdown, and the serializer
emits Markdown from mdast while escaping text where needed to preserve text semantics. Both are
ESM/modern-browser compatible and therefore suitable for the existing Workers-oriented build.
No Markdown dialect/plugin was added.

### Implemented scope

1. Added a provider-neutral `ProtectedMarkdownTranslationDocument` boundary:
   - parses source Markdown with `mdast-util-from-markdown`;
   - traverses mdast rather than using regex as the Markdown parser;
   - exposes deterministic ordered translation segment descriptors;
   - segment IDs derive from AST node type/position paths, not text or random IDs.
2. Only mdast `text` nodes containing human-language letters become translation segments.
   Block/inline structure remains in the protected document.
3. Code and non-text structure are never segment payload:
   - fenced and indented code;
   - inline code;
   - raw HTML nodes;
   - link/image destinations;
   - image data/alt metadata;
   - autolink URL-only text.
4. Technical fragments embedded inside otherwise translatable text are replaced with
   collision-free deterministic placeholders. The current boundary recognizes URL/mail/path,
   package/qualified identifier, CLI flag, function-like identifier, common code-identifier, and
   version-like forms without treating Markdown itself as regex-parsed text.
5. Placeholder namespaces are deterministically chosen so source text cannot collide with the
   generated namespace.
6. Restoration runtime-validates:
   - exact segment-ID set;
   - no duplicate/missing/extra IDs;
   - bounded nonblank strings;
   - forbidden control-character rejection;
   - no segment-marker injection;
   - exact protected-token count/order with no invented token namespace.
7. Provider values are inserted only as mdast `text` node values, never parsed as trusted
   Markdown fragments. The result is serialized deterministically and reparsed.
8. A structural signature verifies that all protected mdast structure/metadata remains unchanged.
   Values of the approved translated text-node positions are the only ignored fields in this
   comparison. Link/image destinations, code, HTML, node types/order, and other metadata therefore
   remain fenced.
9. A validation failure throws typed `MarkdownTranslationValidationError` with
   `disposition: "original-fallback"`, providing the later content executor a controlled
   exact-original fallback boundary without modifying or persisting the source revision.
10. Restored Markdown remains input to the existing safe `ForumMarkdown` renderer. This change
    does not introduce raw HTML rendering or `dangerouslySetInnerHTML`.
11. Direct dependencies were added only for the exact parser/serializer versions already present
    in the installed `react-markdown` dependency graph.
12. `PROJECT_STATE.md` records CNT-04 as implemented foundation and leaves post-body durable
    planning/execution/publication plus provider/job wiring outstanding.

### Focused coverage

The new tests cover:

- paragraphs, headings, lists, blockquotes, emphasis and strong structure;
- translated link labels with unchanged destinations;
- inline, fenced and indented code exclusion;
- autolink URL exclusion;
- raw HTML and external-image policy compatibility;
- deterministic segment IDs/serialization;
- escaped Markdown;
- Unicode/RTL text;
- repeated URLs/technical identifiers;
- collision-like source marker text;
- exact protected-token order and duplicate-token rejection;
- missing, extra and duplicate segment IDs;
- blank, oversized and control-character values;
- inline Markdown/HTML injection remaining text;
- block-structure injection failing closed;
- round-trip rendering through the existing safe `ForumMarkdown` component;
- typed original-fallback failures.

Final unit/route suite: 48 files / 384 tests passed.

## Full self-review

ChatGPT re-read the complete final PR #107 diff against unchanged current `main`, the latest
task in service PR #94, `PROJECT.md`, `PROJECT_STATE.md`, `ROADMAP.md`,
`TRANSLATION_ARCHITECTURE.md`, `docs/translation/CONTENT_TRANSLATION.md`,
relevant `docs/translation/RESEARCH.md`, and the existing forum Markdown renderer/tests.

Corrections made during the implementation cycle:

- initial lint used a control-character regexp and one unnecessary regexp escape; the validation
  was rewritten to an explicit character-code check and the token patterns corrected;
- one follow-up path-regexp edit was malformed; it was replaced with separate Windows/Unix path
  token patterns and subsequently passed lint/typecheck;
- the first hand-edited direct parser lock entry omitted the existing `supports-color` peer
  snapshot context, so TypeScript could not resolve the direct module despite frozen install
  succeeding. The importer now points to the already-present exact peer-context snapshot;
- tests initially used unsupported Jest-DOM matcher extensions in this Vitest configuration and
  assumed serialized Markdown would preserve unescaped `API_TOKEN`. Assertions now check semantic
  renderer output, which preserves the exact visible token while allowing safe canonical Markdown
  escaping;
- the marker-collision test was corrected to reflect the stronger behavior: source text resembling
  a technical marker is itself protected and restored, while generated markers use a different
  deterministic namespace.

No remaining current-Stage defect was found in the final reviewed diff. The change does not add
post-body durable task lifecycle, provider calls, persistence/schema, batching, operational rate
limiting, detector/manual-correction flows, routes/UI, Queue bindings, credentials/live calls, or
Stage 6 work.

## CI

GitHub Actions run `36003691986` for PR #107 head
`eb1ed060595c7c1b37f1edfb17019060b674deaa` completed successfully.

`checks`:
- accepted migration-history protection — success;
- lint — success;
- typecheck — success;
- tests — success (48 files / 384 tests);
- production build — success;
- migration metadata validation — success;
- Drizzle schema parity — success.

`database`:
- clean PostgreSQL 17 migrations/constraints and integration tests — success;
- Workers build smoke — success;
- local Hyperdrive smoke — success.

## Status

- PR #107 is open, mergeable, and unmerged.
- Current head: `eb1ed060595c7c1b37f1edfb17019060b674deaa`.
- Base remains unchanged current `main`:
  `61b21a8029baf0fc0cb6a1d6a0c7e0ae931fd5a9`.
- Codex service PR #94 remains at
  `b054058b41aa3ecdf8ca4e83dba023a7ebc32f03`; the assigned CNT-04 task did not change during
  implementation.
- Full self-review of the final head found no remaining current-Stage defect.
- The implementation result is recorded here for Codex to inspect and determine the next
  technical action under the current project workflow.

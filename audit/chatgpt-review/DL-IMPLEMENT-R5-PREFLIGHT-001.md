# DL-IMPLEMENT-R5-PREFLIGHT-001/1 — Phase 5 R5 preflight

**Status: PASS**

> **PREFLIGHT ONLY — R5 IMPLEMENTATION IS NOT AUTHORIZED**
>
> Codex remains the lead reviewer. No implementation branch/PR is created. Runtime, tests, styles,
> schema, migrations, project source-of-truth docs and PR #78 are not modified by this task.

## 1. Verified post-R4 baseline

- current main: 73accda528c1a007cfe18117bb7dcc0bdf272cbb;
- this is the merge commit of PR #88;
- R1: 944ea2f01ab85e1e888981c2d789f2cfde0bb3b0;
- R2: adb5eed73fccd7110c5f6f95dc933e217ea03c72;
- R3: c2ea076af1ca100de02f32c6e3aa06f840731e1d;
- R4: current main;
- ancestry checks confirm R1–R3 are ancestors of current main;
- PR #78 remains open/unmerged as control channel;
- PR #79 remains open/unmerged as audit/response channel.

PR #79 head before the R5 artifacts:
f8daef5f909ce114a1450d89892f4a4abad69dd8.

Accepted remediation plan blobs:

- machine: 739d326eb9e00a705003fff43ba4592c2f453e56
- narrative: d7766b1a857a8f70d279778fb82a478c74d3161c

## 2. Exact accepted R5 scope

R5 contains exactly two remediation units.

### REM-07 / CD-06 / TC-06-B

Atomic IDs: EX52-25, EX52-26.

Target: make section topic/message totals plural-aware without changing forum counting/query semantics.

### REM-09 / CD-08 / TC-06-D

Atomic ID: EX58-43.

Target: make one desktop post content region contain best-answer label, body and solution controls,
while preserving the author column and mobile one-column layout.

No hard dependencies or recommended predecessor units exist for R5.

## 3. Currentness

### EX52-25 — CURRENT

PR #52 introduced English count presentation through ordinary interpolation using literal
topic(s) / message(s). PR #71 later converted sectionCount to the structured plural runtime, so
the earlier broad count-string concern became narrower, but the accepted REM-07 residual remains.

Current post-R4 catalog still contains one ordinary interpolation identity:

~~~text
topicAndPostCount = "{{topics}} topic(s) · {{posts}} message(s)"
~~~

Current CategoryRoute still performs one lookup with topics and posts together. The route file has
not changed since PR #52.

Verdict: **current**.

### EX52-26 — CURRENT

The accepted review finding is that two independent counts inside one ordinary translation message
cannot independently select the grammatical number of both nouns through normal i18next plural
resolution.

Current code still uses exactly that combined message. Existing tests prove plural resolution for
sectionCount but do not cover independent topic/message plural selection or the mixed pairs
1 topic · 2 messages and 2 topics · 1 message.

Verdict: **current**.

### EX58-43 — CURRENT

PR #58 added best-answer/solution presentation into the existing two-column post grid, but the
added elements remained direct grid siblings without one stable content-column boundary.

Current TopicRoute still renders, as direct children of .forum-post:

1. header
2. conditional .best-answer-label
3. ForumMarkdown → .post-body
4. conditional .solution-form

Current CSS still uses a two-column grid and contains no content wrapper, grid-column or grid-area
placement for those content siblings. The max-width:38rem rule only switches the grid to one
column; it does not repair desktop placement.

Verdict: **current**.

## 4. Deliberate disconfirmation against PR #53–#88

The previous classifications were not copied forward mechanically.

1. app/routes/category.tsx has no commit after PR #52.
2. PR #71 introduced the current structured plural infrastructure and converted only sectionCount;
   topicAndPostCount remained ordinary interpolation.
3. Later catalog changes added unrelated messages, not independent topic/message plural identities.
4. PR #61 changed solution authorization/presentation availability but kept the same post content
   siblings.
5. PR #76 restored typed authorization failure handling only.
6. app/styles.css has no later post-grid placement correction.
7. Current render tests check solved/best-answer/authorization behavior but not one common content
   region.
8. R1–R4 do not fix these R5 presentation defects.

Result: all three atomic IDs are **current**. None is already-fixed, superseded or
insufficient-evidence.

## 5. Existing plural capability is sufficient

The repository already has:

- pluralMessage canonical descriptors;
- structured source payloads;
- LocaleRulesProvider;
- compiler expansion to i18next JSON v4-style suffix keys;
- runtime t(key, { count }) lookup;
- English and multi-branch Russian plural tests.

Current i18next documentation confirms that plural selection requires the option named count and
uses JSON v4 suffixes such as _one/_other, with additional locale-specific branches where needed:

https://www.i18next.com/translation-function/plurals

No localization runtime redesign is needed.

## 6. REM-07 selected boundary

Replace topicAndPostCount with two independent plural canonical identities:

~~~text
topicCount:
  one   = "{{count}} topic"
  other = "{{count}} topics"

messageCount:
  one   = "{{count}} message"
  other = "{{count}} messages"
~~~

Each descriptor is messageKind plural with exactly one placeholder: count.

CategoryRoute independently resolves topicCount and messageCount with their respective numeric count,
then composes the two already-localized fragments with the existing neutral separator.

Invariant:

- topic grammar is selected by topic count;
- message grammar is selected by message count;
- route only composes localized fragments;
- route contains no locale-specific plural rule.

## 7. Catalog identity, fingerprints and old translations

### Old key

topicAndPostCount should be intentionally removed from the canonical catalog.

Keeping it as a supported canonical identity would preserve a message shape unable to satisfy
independent plural selection for two counts.

### Fingerprints

No fingerprint registry/generated fingerprint file needs editing. sourceFingerprint is computed per
descriptor from source, description, placeholders, message kind and protected terms.

Therefore:

- new topicCount/messageCount naturally receive new fingerprints;
- unrelated descriptor fingerprints remain unchanged;
- no hard-coded fingerprint migration is needed.

### Local/manual packs

Current manual-packs.ts contains only heading overrides for ru/he. It contains no
topicAndPostCount entry.

Decision: **no manual-pack change**.

### Persistent manual/machine rows

Current persistent source behavior already treats a row whose canonical key no longer exists as
historical data: it skips the row and reports unknown-key. There is an existing direct regression
for this behavior in app/localization/persistent-sources.test.ts.

Therefore old raw topicAndPostCount rows do not require a schema/data migration.

### Persisted compiled bundles

Removing one key and adding two canonical identities changes code-owned bundle identity. A compiled
bundle containing the removed key or an old bundleVersion is rejected by current verification and
request loading safely falls back through raw/local/English sources.

R5 must not add request writes, alter the R4 reconciliation boundary, claim external incidence, or
perform external cleanup.

## 8. REM-09 mechanism

Selected mechanism: **one content wrapper**.

Future DOM boundary:

~~~text
li.forum-post
├── header                   author region
└── div.forum-post-content   content region
    ├── best-answer label    conditional
    ├── ForumMarkdown
    └── solution form        conditional
~~~

This makes the post grid have exactly two direct grid items.

CSS Grid documentation confirms that direct children are grid items and unpositioned grid items are
auto-placed in source order, creating implicit rows when necessary. That supports the current
EX58-43 diagnosis:

https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Grid_layout/Basic_concepts
https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Grid_layout/Auto-placement

### Why wrapper, not explicit placement

Explicit placement on three conditional siblings could be made correct, but it leaves three
independent grid items and repeated placement rules. One wrapper represents the semantic content
region directly and makes conditional rendering structurally stable.

### CSS boundary

Only the layout-preservation changes needed for nesting are allowed:

- keep the existing desktop columns;
- add .forum-post-content with the content-region min-width/padding responsibility;
- remove outer padding from nested .post-body to avoid double padding;
- preserve solution spacing;
- make .best-answer-label block-level only if needed to preserve current presentation;
- no new breakpoint, visual-system redesign or locale-specific CSS.

### Domain/auth boundary

Do not change loader authorization, canManageSolution semantics, solved/best-answer conditions,
actions/mutations, hidden form fields, stable post anchors, ForumMarkdown or forum domain behavior.

## 9. Mobile invariant

Existing responsive CSS switches .forum-post to one column below 38rem and changes only the header
border.

With exactly two direct grid children, normal one-column placement becomes:

1. header
2. content wrapper

No mobile-specific DOM branch or new breakpoint is required.

## 10. Delivery decision

**One small standalone R5 implementation PR** is preferred.

Reasons:

1. both units are bounded presentation corrections;
2. neither changes DB/schema/dependencies/domain semantics;
3. both share app/forum/public-read.test.tsx as the smallest correct render-regression location;
4. splitting duplicates CI/visual review without improving isolation;
5. separate REM-07 and REM-09 commits inside the PR preserve reviewability.

## 11. Exact future changed-file allowlist

If implementation is later authorized on this baseline, the complete tracked allowlist is:

1. app/localization/catalog.ts
2. app/localization/resources.test.ts
3. app/routes/category.tsx
4. app/routes/topic.tsx
5. app/forum/public-read.test.tsx
6. app/styles.css

REM-07 uses files 1, 2, 3, 5.

REM-09 uses files 4, 5, 6.

No seventh tracked file is currently justified.

## 12. PROJECT_STATE / archive decision

**PROJECT_STATE update required: NO.**

PROJECT_STATE records stage/architecture/operational state and the current R7 authorization
snapshot limitation. It does not enumerate these presentation defects.

R5 changes no project phase, architecture, DB/external state, authorization semantics or
translation-job state.

Explicitly excluded:

- PROJECT_STATE.md
- every doc_old/PROJECT_STATE_* archive

Creating an archive without a state-file change would be unrelated churn.

## 13. Future test contract

### REM-07 changed tests

Minimal changed test files:

- app/localization/resources.test.ts
- app/forum/public-read.test.tsx

Must prove:

1. topic count 1 selects singular;
2. topic count 2 selects other/plural;
3. message count 1 selects singular;
4. message count 2 selects other/plural;
5. rendered 1 topic · 2 messages;
6. rendered 2 topics · 1 message;
7. topic/message fragments resolve independently;
8. both descriptors are plural with exactly count placeholder;
9. both descriptors produce valid SHA-256 source fingerprints;
10. CategoryRoute contains no locale-specific plural branch.

Existing unchanged tests continue to protect compiler plural structure, placeholder validation,
historical unknown-key persistent rows and plural fallback/hydration.

### REM-09 changed tests

Minimal changed test file:

- app/forum/public-read.test.tsx

Must prove:

1. best-answer label is inside .forum-post-content;
2. ForumMarkdown .post-body is inside the same content region;
3. eligible solution form is inside the same content region;
4. header remains a sibling author region outside the wrapper;
5. existing positive/negative solution-control assertions remain green;
6. authorization/domain rendering conditions are unchanged.

app/forum/markdown.test.tsx remains unchanged but is part of focused verification.

## 14. Exact focused commands for future implementation

Localization/category:

~~~sh
pnpm exec vitest run app/localization/resources.test.ts app/localization/bundles.test.ts app/localization/translation-validation.test.ts app/localization/persistent-sources.test.ts app/localization/resource-loader-bundles.test.ts app/forum/public-read.test.tsx
~~~

Topic structure/Markdown:

~~~sh
pnpm exec vitest run app/forum/public-read.test.tsx app/forum/markdown.test.tsx
~~~

Repository gates:

~~~sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
git diff --check
~~~

On the actual future implementation PR head:

- GitHub Actions checks: green.

R5 does not change DB behavior, so pnpm db:test and the Actions database job are not
scope-derived R5 merge gates.

The current standard workflow nevertheless runs database. If it runs for future R5, record its
factual result in the implementation report without reclassifying it as an R5-required gate.

## 15. Screenshot plan

R5 has a perceptible layout change, so future implementation requires visual evidence.

Current repository has no committed Playwright/browser screenshot dependency and no dedicated
visual fixture. Adding either only for R5 evidence would be unnecessary scope expansion.

Minimal safe path:

1. use a local worktree of the actual implementation head and existing dependencies;
2. create a temporary untracked Vite/React harness, e.g. .tmp-r5-visual/;
3. import the **actual** TopicRoute and **actual** app/styles.css;
4. provide Router/i18next context using the same in-memory pattern as public-read.test.tsx;
5. fixture one solved topic with at least two posts and canManageSolution=true:
   - best-answer post exercises label + body;
   - non-best post exercises body + solution form;
6. capture desktop screenshot above 38rem, recommended 1280×900;
7. capture narrow screenshot below 38rem, recommended 375×812;
8. verify the temporary harness is untracked and absent from the implementation diff.

The harness must import production component/CSS; it must not copy the post markup/styles to
manufacture evidence.

Desktop evidence must show author metadata in the narrow author column and label/body/solution
controls in the content column.

Mobile evidence must show author region above one content region with no extra column/cell or
horizontal layout regression.

**Stop condition:** if the executing environment cannot render the unmodified actual TopicRoute and
actual stylesheet, or cannot capture both viewports without adding a repository dependency or
production demo route, stop and return to Codex. Do not claim visual acceptance.

## 16. Explicit forbidden future scope

Every tracked path outside the six-file allowlist is forbidden unless Codex revalidates the
preflight.

Explicitly forbidden include:

- PROJECT_STATE.md and all project-state archives;
- app/localization/manual-packs.ts;
- app/localization/fingerprint.ts;
- app/localization/sources.ts;
- app/localization/persistent-sources.ts;
- app/localization/bundles.ts;
- app/localization/resource-loader.ts;
- app/localization/translation-validation.ts;
- app/forum/markdown.tsx;
- forum query/repository/counting/pagination code;
- solved/best-answer authorization/action/mutation/domain-semantic code;
- db/schema.ts;
- all drizzle SQL/meta paths;
- package.json and pnpm-lock.yaml;
- project/translation/auth/database source-of-truth docs;
- .github/workflows;
- Queue/Workflow/provider/translation-job paths;
- R6/R7 implementation;
- Stage 6/external operations;
- PR #78.

## 17. Stop conditions

Stop and revalidate if:

1. main moves from 73accda528c1a007cfe18117bb7dcc0bdf272cbb before implementation;
2. an R5 finding becomes independently fixed/superseded;
3. REM-07 requires locale-specific route logic, counting-query changes, manual-pack migration,
   DB/schema work or translation-job changes;
4. removing topicAndPostCount exposes data that current unknown-key/bundle fallback cannot safely
   degrade;
5. REM-09 requires changing solution authorization/domain semantics or visual redesign;
6. REM-09 requires changing ForumMarkdown, adding a dependency, adding a production demo route or
   tracked screenshot fixture/helper;
7. a seventh tracked implementation file becomes necessary;
8. honest screenshots cannot be captured from actual implementation code using existing
   dependencies plus an untracked harness;
9. any external DB/deployment/provider/Queue/credential action becomes necessary.

## 18. Outcome

**PASS**

- EX52-25: current
- EX52-26: current
- EX58-43: current
- both accepted R5 units remain live
- preferred delivery: one small standalone R5 PR if later authorized
- exact future tracked allowlist: 6 files
- PROJECT_STATE/archive: excluded
- no manual-pack/fingerprint-file migration
- old raw translation rows are supported as historical unknown-key data
- old persisted bundles safely degrade through existing verifier/fallback
- selected REM-09 mechanism: one content wrapper
- no DB/schema/dependency/source-of-truth update required
- implementation remains unauthorized
- Codex remains the lead reviewer

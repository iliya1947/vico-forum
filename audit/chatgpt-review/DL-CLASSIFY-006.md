# DL-CLASSIFY-006 — forum/auth foundations and Stage 4 implementation

> **PRELIMINARY AUDIT MATERIAL — NOT A SOURCE OF TRUTH**
>
> Scope is exactly PR #47 → #51 → #52 → #53 → #54 → #55 → #56 → #57 → #58.
> No target contract, remediation, unrelated authorization/infrastructure classification, or final verdict is selected.

## Audited heads and evidence

- PR #78 audited head: `54690bf7639b1b00f3d2692c0dbf1009a40c6689`
- PR #79 base head: `675bc9ba5fb721781a691df265547a053263bfc4`
- Atomic records classified: **273**
- Current source-of-truth documents read for this block: `PROJECT.md`, `PROJECT_STATE.md`, `ROADMAP.md`, `README.md`, `TRANSLATION_ARCHITECTURE.md`, `docs/translation/CONTENT_TRANSLATION.md`, `docs/translation/UI_TRANSLATION.md`, `docs/auth/AUTHORIZATION.md`, and `docs/database/MIGRATIONS.md`.
- Historical PR bodies/review threads, the accepted extraction ledger, current schema/runtime/tests, and current consumers were checked.
- Repository/GitHub evidence is sufficient for the classifications below; no external provider/runtime behavior is asserted beyond the checked repository evidence.

## Executive result

This block contains real fixes, useful future-proof foundations, deliberate staged delivery, and a small set of still-live issues. It is **not** evidence that Stage 4's revision/auth foundations were generally overbuilt.

1. **PR #47** is a useful migration-only Better Auth foundation. Its schema/identity and least-privilege separation boundaries are independently useful and later consumed. Real OAuth, dedicated external runtime roles/Hyperdrive, migration acceptance and preview isolation are separate external boundaries; from PR #50 onward their scheduling is explicitly Stage 6.
2. **PR #51** correctly lays the Stage 4B revision model needed by already-accepted Stage 5B translation identity: immutable revision identity, separate topic-title revisions and revision-local `sourceLocale | und`. Missing Stage 5B persistence is not a defect. `EX51-22` remains a real schema-integrity concern but evidence is insufficient to call it a present-stage runtime defect; `readHierarchy`'s N+1 weakness was bypassed by #52 on the public route path.
3. **PR #52** fixes a real opaque-ID route bug in-PR. Public page-shaped reads and unpaginated early lists are acceptable Stage 4C choices. The literal combined count label remains a current presentation/i18n defect: `topicAndPostCount` still uses `topic(s)` / `message(s)`.
4. **PR #53** provides the real local/CI auth/session runtime without requiring deployed Google OAuth. Lost refresh `Set-Cookie` propagation was a real bug and was fixed in-PR. Preview isolation is a legitimate future external boundary, not a current local/CI defect; the separate missing-secret smoke prediction is contradicted by the final successful smoke.
5. **PR #54** is a justified documentation-only correction of the stale Stage 4 blocker label.
6. **PR #55/#56** add proportional authenticated-write and auth-UX boundaries. Session-derived actor identity, same-origin enforcement, validation and atomic writes are current requirements, not premature hardening. #56's stale header state was a real bug fixed in-PR. `EX55-18` remains a credible current failure-semantics concern, but the checked contracts are insufficient to prove that generic writer `503` handling is itself a present defect.
7. **PR #57** adds a reusable safe-Markdown boundary and a genuine transactional same-author cooldown/concurrency fix. The open rollback review `EX57-27` is independently confirmed as a **current test defect only**: that test can reject on cooldown before reaching the duplicate-insert rollback path.
8. **PR #58** implements the accepted solved/best-answer slice. The initial `RESTRICT` FK was a real aggregate-delete defect and the deferred `NO ACTION` correction is justified. Topic-row locking is a live race-safety boundary. `EX58-43` is independently confirmed as a **current desktop-layout defect**.
9. **Strict documentation laundering is not confirmed.** #54 transparently repairs a stale state label; the Stage 4 state documents consistently distinguish local/CI completion from deferred external acceptance. No checked edit makes a later correction appear to have been an older original requirement.

Confirmed still-live defects in this bounded block:

- `EX52-25` / finding `EX52-26`: combined count presentation remains literal `(s)`;
- `EX57-27`: rollback test can pass for the wrong rejection;
- `EX58-43`: desktop post-grid auto-placement regression.

Finite insufficient-evidence set:

- `EX51-22`: direct deletion of superseded revisions is a live future-integrity concern, but no present application consumer/Stage 5B persistence makes current runtime impact established;
- `EX55-18`: broad unknown-writer → controlled `503` remains current, but no checked forum-writer contract proves that this boundary must rethrow/classify unexpected failures.

No item in this block requires a user product/architecture choice merely to establish the conclusions above.

## Current/later consumer check

- PR #47 schema remains the Better Auth persistence foundation; current auth runtime still consumes it.
- PR #51 revision tables/current-revision pointers and `sourceLocale` remain live, and Stage 5B's accepted contract explicitly consumes `revisionId` identity later.
- PR #52 page-shaped readers remain the public forum path; the old `readHierarchy` helper is not the public route consumer.
- PR #53 request-scoped auth/session runtime remains current; real external provider acceptance is still Stage 6.
- PR #55 authenticated forum actions remain live and were later wrapped by dynamic authorization without replacing their transaction/origin/session boundaries.
- PR #56 header auth state synchronization remains current.
- PR #57 `ForumMarkdown` and write cooldown remain current.
- PR #58 solved/best-answer schema, row locks and UI remain current; later permission-based authorization extends who may manage solutions without removing the domain invariants.

## Deliberate-disconfirmation profiles

Every atomic row below maps to one of these profiles. A profile records the strongest competing interpretation, what evidence would overturn the preliminary classification, the contrary evidence actually found, and the current/later consumer check.

### A — PR #47 Better Auth schema foundation

This would be wrong if #47 implemented a future auth runtime rather than only the schema/identity boundary, if the exact Better Auth schema was never consumed, or if the foundation forced external rollout before forum work. #47 added the pinned 1.7.4 schema/migration and kept Worker auth runtime absent. The current auth runtime still consumes that schema, and the current production verifier still treats auth tables separately from the read-only localization capability. Contrary evidence: #47 also carried external rollout plans; those are classified separately under B rather than used to condemn the schema foundation.

### B — PR #47 external rollout plans

Calling these deferred boundaries would be wrong if external migration/auth-role/Hyperdrive/preview work was already necessary to prove local/CI Stage 4 behavior. The current roadmap and migration contract place real OAuth, write runtime roles/Hyperdrive, preview isolation and pending external migrations in Stage 6; PR #50 is the direct-user scheduling authority from that point forward. Contrary evidence: #47 did describe external apply/verify and least-privilege runtime prerequisites before #50. That historical scheduling is preserved, but it does not make the migration-only foundation defective and is not projected forward as the current gate.

### C — PR #51 forum/revision foundation

This would be wrong if revision identity, separate topic-title revisions and revision-local source language were speculative conveniences with cheap later retrofit. Current `ROADMAP.md` Stage 4B explicitly requires the immutable revision boundary, separate translatable topic-title unit and independent `sourceLocale | und` so Stage 5B does not require identity-model redesign. `CONTENT_TRANSLATION.md` makes future translation identity include `revisionId` and says this boundary must be considered when the forum revision model is designed. Current schema and forum services still consume these identities. Contrary evidence: Stage 5B translation persistence is not implemented yet. That absence is the intentional stage boundary, not evidence against the foundation.

### D — PR #51 open direct-delete / old hierarchy concerns

For `EX51-22`, the schema still protects revisions from UPDATE but does not independently reject DELETE of a superseded revision. This would be a confirmed present defect if a current application path deleted such revisions, if current Stage 5B persistence depended on their permanent retention, or if the governing Stage 4B contract explicitly required a database-level no-delete invariant independent of aggregate deletion. No such current application consumer was found; aggregate deletion intentionally cascades revision history, and Stage 5B is still pending. The gap is therefore real future-integrity evidence but insufficient to classify as a present-stage runtime defect.

For `EX51-30/31`, the N+1/unbounded helper behavior was real. #52 replaced it on the public route path with page-shaped reads. The helper remains in the repository, but no current public-route consumer was found. A newly found live caller would reopen the current-impact conclusion.

### E — PR #51 state/simplification

These classifications would be wrong if the removed indexes/constraints carried a distinct invariant or if the removed assertion tested the forum change. The PR history identifies them as redundant/unrelated, while the retained composite owner-matching FKs preserve the actual invariants. State rows are treated only as historical claims and never as proof that the implementation was correct.

### F — PR #52 public read/UI slice

This would be wrong if #52 reintroduced the #51 hierarchy fan-out, broke canonical locale routing, or prematurely built pagination/extra product scope. The current route path uses page-shaped readers, locale-preserving links, route-level not-found/error behavior and a deliberately unpaginated early forum list. Contrary evidence: unpaginated lists can become a scalability limit; no reviewed current-stage load requirement makes pagination mandatory here.

### G — PR #52 opaque-ID routing correction

The initial raw path interpolation is a concrete defect because forum IDs were not constrained to URL-safe segments and reserved characters can change route structure. The in-PR switch to centralized path generation plus regression coverage directly closes that failure mode. This conclusion would be wrong if IDs had already been constrained to safe route segments; the inspected service contract did not establish such a restriction.

### H — PR #52 count presentation and documentation

The literal English `(s)` form is a visible presentation defect, not evidence that Stage 4C needed the complete future machine-translation subsystem. Current code has corrected `sectionCount` to a plural descriptor, but `topicAndPostCount` still renders the ordinary interpolation source `{{topics}} topic(s) · {{posts}} message(s)`. The classification would be wrong if the current combined message had become count-neutral or structured; it has not. Separately, the stale blocker label was a documentation synchronization defect later corrected by #54.

### I — PR #53 auth/session runtime foundation

This would be wrong if real Google OAuth credentials/deployed smoke were required to establish the local/CI session boundary, or if #53 silently made public reads depend on a valid session. #53 kept guest/expired states nullable, added the server auth capability and local PostgreSQL integration, and explicitly deferred real provider acceptance. Current roadmap still places real Google OAuth acceptance in Stage 6. No missing real OAuth smoke is classified as a Stage 4D defect.

### J — PR #53 session refresh cookie correction

The initial pre-routing session lookup could refresh Better Auth cookies without copying those Set-Cookie headers to the final application response. The in-PR correction requests response headers and preserves all Better Auth Set-Cookie values while retaining application cache headers; local integration covers the boundary. This would be wrong if no refresh header could be produced or if the final response already propagated it; the historical implementation and correction chain show the opposite.

### K — PR #53 preview-isolation and smoke reviews

The preview-isolation review identifies a legitimate future external safety boundary, but current project state explicitly has external forum/auth write capabilities and preview isolation deferred to Stage 6. It becomes a present defect only if such an external preview/write path is activated without isolation. The separate missing-secret review prediction is contradicted by the final green Workers smoke and therefore is not treated as a proven defect.

### L — PR #54 stale blocker label

#52 made the Stage 4C blocker label stale and #53 carried it forward. #54 changed only that label to the current Stage 4D target. This would be wrong if #54 silently introduced a new runtime/product contract; its diff is documentation-only and the historical chain identifies the stale origin.

### M — PR #55 authenticated write boundaries

This would be wrong if session-derived actor identity, same-origin checks, transactional topic+initial-post creation, server-side validation, or owner/topic consistency were unnecessary future hardening rather than current write requirements. Stage 4D explicitly requires authenticated writes, runtime validation, applicable CSRF/origin protection and basic anti-abuse boundaries. Current forum actions still consume these boundaries. Contrary evidence: several error/status choices are implementation details rather than user-authorized product rules; they are treated as acceptable choices, not immutable requirements.

### N — PR #55 catch-all writer 503

Current `executeForumWrite()` still converts any unrecognized writer exception into controlled `503`. This is a credible observability/failure-classification concern because programming/schema bugs can be hidden behind an availability-shaped response. However, unlike authorization after #76, no reviewed forum-writer source-of-truth contract requires an explicit typed availability classifier or requires all unexpected writer exceptions to escape this boundary. A safe generic client failure is itself a defensible design. Therefore the evidence is insufficient to declare `EX55-18` a present-stage defect. A governing failure-semantics contract, evidence of lost required observability, or a demonstrated misclassified live failure would change that conclusion.

### O — PR #55 fixture and staged slices

The initial integration fixture leaked a created topic; the finally-cleanup correction is a justified test fix. Anti-spam, auth UX, Markdown and solved/best-answer work were explicitly subsequent slices and were in fact consumed by #56–#58. Calling their absence in #55 a defect would confuse staged delivery with incomplete implementation. External provisioning likewise remained outside the local/CI slice.

### P — PR #56 auth UX and stale-header correction

The initial `useState(initialUser)` snapshot could remain stale after loader revalidation. The review finding is concrete, and the current provider still contains the in-PR `useEffect(...,[initialUser])` synchronization plus regression coverage. The locale-safe return-path, pending/error and immediate sign-out presentation boundaries are small current UX/security measures, not a future auth subsystem. Real provider smoke remains deferred.

### Q — PR #57 Markdown boundary

This would be wrong if forum content could still activate raw HTML/images or bypass the normal renderer, or if the extra dependency were unused. The current forum route renders persisted bodies through `ForumMarkdown`; it suppresses images, emits external links with defensive rel attributes, and repository DOM tests cover the intended safety behavior. No claim here relies on undocumented provider behavior beyond what repository code/tests establish.

### R — PR #57 cooldown/concurrency and rollback-test review

The same-author transaction mutex/cooldown would be unjustified if it solved no demonstrated race or globally serialized unrelated users. Repository PostgreSQL concurrency coverage exercises genuinely concurrent same-author writes and allows only one graph to commit, while different authors remain independent. This is a genuine race/anti-abuse boundary and introduces no new schema.

The open rollback-test review is independently confirmed as a **test defect**: the current test creates a writer with an advancing future-ish clock, then uses a default-clock repository with the same author and accepts any rejection, so cooldown can reject before the intended duplicate insert. This would become a runtime defect only if transaction rollback itself were shown incorrect; separate transaction/no-partial-write coverage does not show that.

### S — PR #58 solved/best-answer product and invariants

Solved/best-answer behavior is an accepted forum product feature. Current repository code still uses topic-row locking for state-changing solution operations, validates solved state and same-topic post membership, and later dynamic authorization preserves/extends these domain invariants. This would be wrong if those locks/invariants were dead future machinery or later removed; they remain live consumers.

### T — PR #58 FK/cascade correction

The initial `ON DELETE RESTRICT` best-answer FK conflicts with deleting a solved topic whose posts are deleted by cascade. The in-PR change to the current deferred `NO ACTION` composite FK is directly exercised by PostgreSQL integration coverage, including same-topic enforcement and solved-topic aggregate deletion. This is a concrete schema defect/fix chain, not speculative hardening. The audit does not infer a broader Drizzle capability claim beyond the checked-in representation and tests.

### U — PR #58 test fixture and current desktop layout

The cooldown-contaminated solution fixture and missing cleanup were real test defects and were fixed in-PR. Separately, `EX58-43` remains a current UI defect: desktop `.forum-post` is a two-column grid; `best-answer-label` and `solution-form` are direct grid children without an explicit content-column assignment/wrapper, so auto-placement can move body/control content into the author column/next grid row. This conclusion would be wrong if current CSS/DOM assigned those children to the content column; inspected current code does not.

### V — historical verification/scope/state rows

These rows record what CI/tests/docs/scope claimed or verified at the time. They are not promoted into correctness authority. The classification would change only if the historical fact itself were false; correctness of the underlying implementation is classified on its own rows and profiles.


## Atomic classification matrix

| Record | Preliminary classification | Confidence | Profile | Atomic decision |
| --- | --- | --- | --- | --- |
| `EX47-01` | acceptable preparatory foundation | M | A | better-auth is pinned at 1.7.4. |
| `EX47-02` | acceptable preparatory foundation | M | A | @better-auth/drizzle-adapter is pinned at 1.7.4. |
| `EX47-03` | intentional preparatory schema/identity foundation | H | A | Stage 4A creates Better Auth core user/session/account/verification schema as persistent foundation. |
| `EX47-04` | intentional preparatory schema/identity foundation | H | A | Stage 4A includes database-backed Better Auth rate_limit storage. |
| `EX47-05` | intentional preparatory schema/identity foundation | H | A | user.locale is nullable Better Auth user metadata. |
| `EX47-06` | intentional preparatory schema/identity foundation | H | A | Better Auth user.locale is server-owned input:false metadata. |
| `EX47-07` | intentional preparatory schema/identity foundation | H | A | user.locale has no foreign key to persistent locales. |
| `EX47-08` | acceptable preparatory foundation | M | A | Stage 4A is one append-only forward migration 0003. |
| `EX47-09` | intentional migration-only stage boundary | H | A | Stage 4A remains migration-only and introduces no Worker auth dependency. |
| `EX47-10` | historical verification/state fact; not correctness authority | H | V | Clean PostgreSQL tests verify exact Better Auth table shape. |
| `EX47-11` | acceptable preparatory foundation | M | A | Production verifier expands to exact Better Auth table column shape. |
| `EX47-12` | acceptable preparatory foundation | M | A | Application-table ownership scope expands to include auth tables. |
| `EX47-13` | acceptable least-privilege separation boundary | H | A | Localization runtime relation privileges remain limited to the three localization tables. |
| `EX47-14` | acceptable least-privilege separation boundary | H | A | Existing localization runtime receives no auth-table access. |
| `EX47-15a` | intentional deferred external boundary; scheduling later superseded by PR #50 | H | B | PR #47 records external application of migration 0003 as a next-step gate. |
| `EX47-15b` | intentional deferred external boundary; scheduling later superseded by PR #50 | H | B | PR #47 records successful target verification after migration 0003 as a separate next-step gate. |
| `EX47-16a` | intentional deferred external boundary; scheduling later superseded by PR #50 | H | B | The then-planned runtime/auth PR is gated on a dedicated least-privilege auth runtime role. |
| `EX47-16b` | intentional deferred external boundary; scheduling later superseded by PR #50 | H | B | The then-planned runtime/auth PR is gated on a separate auth Hyperdrive binding. |
| `EX47-16c` | intentional deferred external boundary; scheduling later superseded by PR #50 | H | B | The then-planned runtime/auth PR is gated on exact auth database grants. |
| `EX47-16d` | intentional deferred external boundary; scheduling later superseded by PR #50 | H | B | The then-planned runtime/auth PR is gated on preview isolation. |
| `EX47-16e` | intentional deferred external boundary; scheduling later superseded by PR #50 | H | B | The then-planned runtime/auth PR is gated on recorded migration evidence. |
| `EX47-17` | historical verification/state fact; not correctness authority | H | V | Project state records Stage 4A foundation as implemented while runtime auth remains absent. |
| `EX51-01` | acceptable Stage 4B domain foundation | M | C | Stage 4B adds persistent forum category identity. |
| `EX51-02` | acceptable Stage 4B domain foundation | M | C | Forum sections belong to categories with cascade ownership. |
| `EX51-03` | acceptable Stage 4B domain foundation | M | C | Forum topics belong to sections. |
| `EX51-04` | acceptable Stage 4B domain foundation | M | C | Forum topics are authored by existing Better Auth user identity. |
| `EX51-05` | acceptable Stage 4B domain foundation | M | C | Forum posts belong to topics. |
| `EX51-06` | acceptable Stage 4B domain foundation | M | C | Forum posts are authored by existing Better Auth user identity. |
| `EX51-07` | intentional future-proof revision/translation foundation | H | C | Topic title is a separate revisioned/translatable unit. |
| `EX51-08` | intentional future-proof revision/translation foundation | H | C | Post body is stored as immutable revision identity. |
| `EX51-09` | intentional future-proof revision/translation foundation | H | C | Forum revision payload preserves original content. |
| `EX51-10` | intentional future-proof revision/translation foundation | H | C | Forum revision identity stores source locale independently of current UI locale. |
| `EX51-11` | intentional future-proof revision/translation foundation | H | C | Translation source locale is not foreign-keyed to LocaleRegistry persistence. |
| `EX51-12` | intentional future-proof revision/translation foundation | H | C | und is an allowed source-language identity. |
| `EX51-13` | intentional future-proof revision/translation foundation | H | C | Non-und source locales are canonicalized through the existing translation-locale boundary. |
| `EX51-14` | intentional future-proof revision/translation foundation | H | C | Formatting/Unicode-extension locale forms are rejected for content source identity. |
| `EX51-15` | intentional future-proof revision/translation foundation | H | C | Topic keeps an explicit current-title-revision pointer. |
| `EX51-16` | intentional future-proof revision/translation foundation | H | C | Post keeps an explicit current-body-revision pointer. |
| `EX51-17` | intentional future-proof revision/translation foundation | H | C | Current topic-title pointer is owner-matched at the database boundary. |
| `EX51-18` | intentional future-proof revision/translation foundation | H | C | Current post-body pointer is owner-matched at the database boundary. |
| `EX51-19` | intentional future-proof revision/translation foundation | H | C | Current-revision owner-matching FKs are DEFERRABLE INITIALLY DEFERRED. |
| `EX51-20a` | intentional future-proof revision/translation foundation | H | C | Revision-to-owner containment FKs remain immediate. |
| `EX51-20b` | intentional future-proof revision/translation foundation | H | C | Revision-to-owner containment FKs cascade revision rows with aggregate-owner deletion. |
| `EX51-21` | intentional future-proof revision/translation foundation | H | C | Revision rows are protected from in-place UPDATE. |
| `EX51-22` | insufficient evidence for a present-stage defect; live future-integrity concern | H | D | P2 review records that superseded revision rows remain directly deletable. |
| `EX51-23` | acceptable aggregate-lifecycle choice | M | C | Aggregate hierarchy deletion intentionally cascades revision history with its owner. |
| `EX51-24` | acceptable atomicity/concurrency/validation boundary | H | C | createTopic creates topic identity and initial title revision atomically. |
| `EX51-25` | acceptable atomicity/concurrency/validation boundary | H | C | createPost creates post identity and initial body revision atomically. |
| `EX51-26` | acceptable atomicity/concurrency/validation boundary | H | C | Topic-title revision append uses optimistic current-pointer compare-and-swap. |
| `EX51-27` | acceptable atomicity/concurrency/validation boundary | H | C | Post-body revision append uses optimistic current-pointer compare-and-swap. |
| `EX51-28` | acceptable atomicity/concurrency/validation boundary | H | C | Failed optimistic revision advancement aborts the transaction. |
| `EX51-29` | acceptable atomicity/concurrency/validation boundary | H | C | ForumService validates nonblank entity/parent/content input. |
| `EX51-30` | historical scalability weakness; current public path superseded | H | D | Initial readHierarchy is an unbounded nested hierarchy reader. |
| `EX51-31` | valid scalability defect finding on the old helper; no current public-route consumer | H | D | P2 review records N+1/unbounded readHierarchy scaling risk. |
| `EX51-32` | historical state/verification fact; not correctness authority | H | V | Migration 0004 is append-only repository history. |
| `EX51-33a` | historical state/verification fact; not correctness authority | H | V | PROJECT_STATE records Stage 4B forum foundation as complete for local/CI development. |
| `EX51-33b` | intentional local/CI versus external stage boundary | H | E | Stage 4B completion explicitly excludes external production migration/runtime rollout. |
| `EX51-34` | historical state/verification fact; not correctness authority | H | V | Native Cloudflare Git integration is recorded as disabled by the user. |
| `EX51-35a` | historical state/verification fact; not correctness authority | H | V | Stage 4C public reading is selected as the next product slice. |
| `EX51-35b` | historical state/verification fact; not correctness authority | H | V | PROJECT_STATE records no product or operational blocker for continuing into Stage 4C. |
| `EX51-36` | justified simplification of redundant schema objects | H | E | Redundant owner-side composite UNIQUE constraints are removed before merge. |
| `EX51-37` | justified simplification of redundant schema objects | H | E | Redundant revision-owner single-column indexes are removed before merge. |
| `EX51-38` | justified unrelated-test cleanup | H | E | An unrelated locale semantic-identity assertion is removed from the forum migration test. |
| `EX52-01` | acceptable Stage 4C read/UI implementation choice | M | F | Public forum reading is exposed through a ForumReader capability. |
| `EX52-02` | acceptable Stage 4C read/UI implementation choice | M | F | ForumReader is request-context injected. |
| `EX52-03` | acceptable Stage 4C read/UI implementation choice | M | F | Hyperdrive forum reads create and close a PostgreSQL client per reader operation. |
| `EX52-04` | acceptable Stage 4C read/UI implementation choice | M | F | Worker constructs the forum reader from the existing HYPERDRIVE connection. |
| `EX52-05` | acceptable Stage 4C read/UI implementation choice | M | F | Forum index lists categories with section counts. |
| `EX52-06` | acceptable Stage 4C read/UI implementation choice | M | F | Category page returns sections with aggregate topic/post counts. |
| `EX52-07` | acceptable Stage 4C read/UI implementation choice | M | F | Section page returns current topic title, author and post count. |
| `EX52-08` | acceptable Stage 4C read/UI implementation choice | M | F | Topic page returns current title, section/category ancestry and author. |
| `EX52-09` | acceptable Stage 4C read/UI implementation choice | M | F | Topic page returns current post-body revisions with authors. |
| `EX52-10` | acceptable Stage 4C read/UI implementation choice | M | F | Public page-shaped reads replace per-row readHierarchy usage on the Stage 4C route path. |
| `EX52-11` | acceptable Stage 4C read/UI implementation choice | M | F | Forum public collections use deterministic createdAt/id ordering. |
| `EX52-12` | acceptable Stage 4C read/UI implementation choice | M | F | Stage 4C public read lists are not paginated. |
| `EX52-13` | acceptable Stage 4C read/UI implementation choice | M | F | Public forum routes live under the existing canonical locale namespace. |
| `EX52-14` | acceptable Stage 4C read/UI implementation choice | M | F | Public forum links preserve the current canonical locale. |
| `EX52-15` | confirmed implementation defect at introduction | H | G | Initial Stage 4C links interpolate opaque entity IDs directly into paths. |
| `EX52-16` | valid defect finding | H | G | P2 review identifies reserved-character path corruption for opaque IDs. |
| `EX52-17` | justified fix of a real routing defect | H | G | Central generatePath helpers replace raw forum path interpolation. |
| `EX52-18` | justified fix of a real routing defect | H | G | Route-path regression covers opaque IDs as one encoded path segment. |
| `EX52-19` | acceptable Stage 4C read/UI implementation choice | M | F | Stage 4C adds a classic forum shell and breadcrumbs. |
| `EX52-20` | acceptable Stage 4C read/UI implementation choice | M | F | Stage 4C adds explicit empty states for categories/sections/topics/posts. |
| `EX52-21` | acceptable Stage 4C read/UI implementation choice | M | F | Missing category/section/topic returns route-level 404. |
| `EX52-22` | acceptable Stage 4C read/UI implementation choice | M | F | Forum route ErrorBoundary distinguishes 404 from generic read failure. |
| `EX52-23` | acceptable Stage 4C read/UI implementation choice | M | F | Locale-scoped catch-all uses the forum localized 404 boundary. |
| `EX52-24` | acceptable Stage 4C read/UI implementation choice | M | F | Canonical English catalog gains Stage 4C forum-read UI descriptors. |
| `EX52-25` | confirmed presentation/i18n defect; partially current | H | H | Count strings initially encode English “(s)” through ordinary interpolation. |
| `EX52-26` | valid defect finding; combined-count label remains current | H | H | P2 review records count/plural presentation-contract concern. |
| `EX52-27` | historical verification/scope/state fact; not correctness authority | H | V | Stage 4C read/UI is exercised in both LTR and RTL fixtures. |
| `EX52-28` | historical verification/scope/state fact; not correctness authority | H | V | Stage 4C does not modify forum schema 0004. |
| `EX52-29` | historical verification/scope/state fact; not correctness authority | H | V | PROJECT_STATE marks Stage 4C completed local/CI. |
| `EX52-30` | documentation synchronization defect | H | H | The blocker heading becomes stale when Stage 4C is marked complete. |
| `EX53-01` | acceptable Stage 4D auth/session foundation | M | I | Better Auth runtime consumes the checked-in Stage 4A schema through the Drizzle PostgreSQL adapter. |
| `EX53-02` | acceptable Stage 4D auth/session foundation | M | I | Better Auth user additionalFields reuses the server-owned locale definition. |
| `EX53-03` | acceptable Stage 4D auth/session foundation | M | I | Better Auth runtime uses database-backed rate limiting. |
| `EX53-04` | acceptable Stage 4D auth/session foundation | M | I | Better Auth client-IP trust is restricted to cf-connecting-ip. |
| `EX53-05` | acceptable Stage 4D auth/session foundation | M | I | Better Auth CSRF and origin checks are not disabled. |
| `EX53-06` | acceptable Stage 4D auth/session foundation | M | I | Google is configured as a Better Auth social provider from server environment values. |
| `EX53-07` | intentional deferred real-OAuth boundary | H | I | Real Google credentials and external OAuth smoke remain deliberately deferred. |
| `EX53-08` | acceptable Stage 4D auth/session foundation | M | I | Auth runtime is exposed as a request capability. |
| `EX53-09` | acceptable Stage 4D auth/session foundation | M | I | Every auth operation owns a fresh PostgreSQL client. |
| `EX53-10` | acceptable Stage 4D auth/session foundation | M | I | Auth runtime is instantiated from the existing Worker HYPERDRIVE connection. |
| `EX53-11` | acceptable Stage 4D auth/session foundation | M | I | No module-global PostgreSQL auth connection is introduced. |
| `EX53-12a` | acceptable Stage 4D auth/session foundation | M | I | AuthRuntime is a typed request-scoped RouterContextProvider capability. |
| `EX53-12b` | acceptable Stage 4D auth/session foundation | M | I | Resolved AuthSession\|null is a separate typed request-scoped RouterContextProvider capability. |
| `EX53-13` | acceptable Stage 4D auth/session foundation | M | I | Worker resolves the session before React Router handles the request. |
| `EX53-14` | acceptable Stage 4D auth/session foundation | M | I | Guest, invalid and expired session states are represented as null context rather than blocking public requests. |
| `EX53-15` | acceptable Stage 4D auth/session foundation | M | I | /api/auth/* is registered before the generic /api/* catch-all. |
| `EX53-16` | acceptable Stage 4D auth/session foundation | M | I | Authenticated user.locale becomes the first root-negotiation user preference. |
| `EX53-17` | acceptable Stage 4D auth/session foundation | M | I | Explicit /:locale authority remains outside the authenticated root preference. |
| `EX53-18` | confirmed implementation defect at introduction | H | J | Initial pre-routing session lookup did not propagate Better Auth refresh Set-Cookie headers. |
| `EX53-19` | justified fix of a real session-cookie propagation defect | H | J | ed8c59a requests Better Auth session response headers. |
| `EX53-20` | justified fix of a real session-cookie propagation defect | H | J | Only Better Auth Set-Cookie values from pre-routing lookup are copied to the final page response. |
| `EX53-21` | justified fix of a real session-cookie propagation defect | H | J | Multiple Better Auth Set-Cookie values are preserved. |
| `EX53-22` | justified fix of a real session-cookie propagation defect | H | J | Final page cache headers survive auth session refresh. |
| `EX53-23` | historical verification/scope fact; not correctness authority | H | V | Local PostgreSQL integration exercises the real Better Auth 1.7.4 schema/runtime. |
| `EX53-24` | historical verification/scope fact; not correctness authority | H | V | Local auth integration proves persisted sign-up/session handling. |
| `EX53-25` | historical verification/scope fact; not correctness authority | H | V | Local auth integration proves sliding-session refresh crosses the application response boundary. |
| `EX53-26a` | historical verification/scope fact; not correctness authority | H | V | Local Better Auth integration verifies guest requests resolve to no session. |
| `EX53-26b` | historical verification/scope fact; not correctness authority | H | V | Local Better Auth integration verifies expired-session cleanup and cookie invalidation. |
| `EX53-27` | historical verification/scope fact; not correctness authority | H | V | Node typecheck explicitly includes auth server/context modules. |
| `EX53-28` | historical verification/scope fact; not correctness authority | H | V | PR #53 adds no database schema or migration. |
| `EX53-29` | valid future external-isolation concern; not a current local/CI defect | H | K | P1 review records preview-isolation risk from reusing the fixed HYPERDRIVE binding for auth writes. |
| `EX53-30` | disproven review prediction | H | K | P1 review predicts Workers smoke failure from missing Better Auth secret. |
| `EX53-31` | historical counter-evidence fact | H | K | Final CI Workers smoke succeeds despite the env shape cited by EX53-30. |
| `EX53-32` | historical state fact; not correctness authority | H | V | PROJECT_STATE marks Stage 4D runtime/session foundation started/completed as a slice. |
| `EX54-01` | documentation synchronization defect | H | L | The blocker stage label first becomes stale at PR #52. |
| `EX54-02` | documentation synchronization defect | H | L | PR #53 carries the stale label forward after Stage 4D begins. |
| `EX54-03` | justified documentation correction | H | L | PR #54 changes only the blocker target label from Stage 4C to Stage 4D. |
| `EX54-04` | justified documentation correction | H | L | PR #54 is documentation synchronization rather than a new blocker contract. |
| `EX55-01` | acceptable reusable Stage 4D write/safety boundary | M | M | ForumWriter is a distinct request capability for forum mutations. |
| `EX55-02` | acceptable reusable Stage 4D write/safety boundary | M | M | ForumWriter is injected through RouterContextProvider. |
| `EX55-03` | acceptable reusable Stage 4D write/safety boundary | M | M | Worker constructs ForumWriter from the existing HYPERDRIVE connection. |
| `EX55-04` | acceptable reusable Stage 4D write/safety boundary | M | M | Each forum writer operation owns and closes its PostgreSQL client. |
| `EX55-05` | acceptable reusable Stage 4D write/safety boundary | M | M | Browser-created forum identities are server-generated UUIDs. |
| `EX55-06` | acceptable reusable Stage 4D write/safety boundary | M | M | Browser-created topic title revisions use sourceLocale und. |
| `EX55-07` | acceptable reusable Stage 4D write/safety boundary | M | M | Browser-created post/reply revisions use sourceLocale und. |
| `EX55-08` | acceptable reusable Stage 4D write/safety boundary | M | M | Section route action creates a topic plus its initial post. |
| `EX55-09` | acceptable reusable Stage 4D write/safety boundary | M | M | Topic route action creates a reply. |
| `EX55-10` | acceptable reusable write-integrity/safety boundary | H | M | Mutation actor identity comes only from Better Auth session. |
| `EX55-11` | acceptable reusable write-integrity/safety boundary | H | M | Browser forum mutations require exact same Origin as request URL. |
| `EX55-12` | acceptable reusable write-integrity/safety boundary | H | M | Guest forum mutations return controlled 401. |
| `EX55-13` | acceptable reusable write-integrity/safety boundary | H | M | Invalid/missing route params return controlled 400. |
| `EX55-14` | acceptable reusable write-integrity/safety boundary | H | M | Required title/body form values are trimmed and blank values rejected. |
| `EX55-15` | acceptable reusable write-integrity/safety boundary | H | M | FormData parse failure returns controlled 400. |
| `EX55-16` | acceptable reusable write-integrity/safety boundary | H | M | Domain content validation failure maps to controlled 400. |
| `EX55-17` | acceptable reusable write-integrity/safety boundary | H | M | Missing target section/topic maps to controlled 404. |
| `EX55-18` | insufficient evidence for a present-stage defect; current failure-boundary concern | H | N | All other writer failures map to generic 503. |
| `EX55-19` | acceptable reusable Stage 4D write/safety boundary | M | M | Successful topic creation redirects to canonical locale topic path. |
| `EX55-20` | acceptable reusable Stage 4D write/safety boundary | M | M | Successful reply redirects to the same canonical locale topic path. |
| `EX55-21` | acceptable reusable write-integrity/safety boundary | H | M | Write forms are rendered only when the public loader sees an authenticated session. |
| `EX55-22` | acceptable reusable write-integrity/safety boundary | H | M | Topic, title revision, initial post and body revision are created in one transaction. |
| `EX55-23` | acceptable reusable write-integrity/safety boundary | H | M | createTopicWithInitialPost checks target section existence before graph insertion. |
| `EX55-24a` | acceptable reusable write-integrity/safety boundary | H | M | Initial post must target the newly created topic. |
| `EX55-24b` | acceptable reusable write-integrity/safety boundary | H | M | Initial post must use the same author as the newly created topic. |
| `EX55-25` | acceptable reusable write-integrity/safety boundary | H | M | Reply creation checks topic existence before inserting post/revision. |
| `EX55-26` | acceptable reusable write-integrity/safety boundary | H | M | ForumService remains the content/source-locale validation boundary for writer-generated revisions. |
| `EX55-27` | historical verification fact; not correctness authority | H | V | PostgreSQL integration verifies topic/reply persistence through the runtime writer. |
| `EX55-28` | historical verification fact; not correctness authority | H | V | PostgreSQL integration verifies transaction rollback for incomplete topic graph. |
| `EX55-29` | historical verification fact; not correctness authority | H | V | Route-action tests verify forged author input is ignored. |
| `EX55-30` | historical verification fact; not correctness authority | H | V | Route-action tests verify guest, cross-origin and invalid input cause no write call. |
| `EX55-31` | confirmed test-fixture defect at introduction | H | O | Initial integration test left its created runtime topic in the shared fixture. |
| `EX55-32` | justified fix of a real test-fixture defect | H | O | 43874ac isolates the integration fixture with finally cleanup. |
| `EX55-33` | intentional staged product boundary later consumed | H | O | Separate forum write anti-spam/rate limiting remains explicitly unfinished. |
| `EX55-34a` | intentional staged product boundary later consumed | H | O | Sign-in UX remains an unfinished Stage 4D product slice after PR #55. |
| `EX55-34b` | intentional staged product boundary later consumed | H | O | Markdown editor/rendering remains an unfinished Stage 4D product slice after PR #55. |
| `EX55-34c` | intentional staged product boundary later consumed | H | O | Solved-topic/best-answer flow remains an unfinished later product slice after PR #55. |
| `EX55-35` | intentional external-rollout deferral | H | O | PR #55 performs no external write-capability provisioning or rollout. |
| `EX56-01` | acceptable Stage 4D auth-UX implementation choice | M | P | Better Auth browser operations are wrapped behind AuthClientActions. |
| `EX56-02` | acceptable Stage 4D auth-UX implementation choice | M | P | Google sign-in uses Better Auth social sign-in with provider=google. |
| `EX56-03` | acceptable Stage 4D auth-UX implementation choice | M | P | Sign-out uses the Better Auth client signOut operation. |
| `EX56-04` | acceptable Stage 4D auth-UX implementation choice | M | P | LocaleBoundary loader adds only a minimal SSR auth presentation snapshot. |
| `EX56-05` | acceptable Stage 4D auth-UX implementation choice | M | P | HeaderAuthProvider owns client presentation state initialized from the SSR snapshot. |
| `EX56-06` | confirmed client-state defect at introduction | H | P | Initial HeaderAuthProvider state did not follow later loader snapshot changes. |
| `EX56-07` | valid defect finding | H | P | P2 review identifies stale authenticated-header state after revalidation/navigation. |
| `EX56-08` | justified fix of a real stale-header defect | H | P | ede785c synchronizes HeaderAuthProvider state from changed server snapshots. |
| `EX56-09` | justified regression coverage | H | P | 39a0fd9 adds a server-auth-snapshot revalidation regression. |
| `EX56-10` | acceptable reusable auth-UX/safety boundary | H | P | Safe sign-in return paths are limited to the current canonical locale namespace. |
| `EX56-11` | acceptable reusable auth-UX/safety boundary | H | P | Safe local return paths preserve a valid query string. |
| `EX56-12` | acceptable reusable auth-UX/safety boundary | H | P | Protocol-relative/external or other-locale return paths fall back to the current locale root. |
| `EX56-13` | acceptable reusable auth-UX/safety boundary | H | P | Successful sign-out immediately clears authenticated presentation state. |
| `EX56-14` | acceptable reusable auth-UX/safety boundary | H | P | Successful sign-out triggers React Router revalidation. |
| `EX56-15` | acceptable reusable auth-UX/safety boundary | H | P | Authentication controls are disabled while an operation is pending. |
| `EX56-16` | acceptable reusable auth-UX/safety boundary | H | P | Authentication client failures expose only a generic localized error. |
| `EX56-17` | acceptable Stage 4D auth-UX implementation choice | M | P | Guest header presentation exposes Sign in with Google. |
| `EX56-18` | acceptable Stage 4D auth-UX implementation choice | M | P | Authenticated header presentation shows user name and Sign out. |
| `EX56-19` | acceptable Stage 4D auth-UX implementation choice | M | P | Auth-control strings use the existing canonical English/i18n catalog. |
| `EX56-20` | historical verification/scope/state fact; not correctness authority | H | V | Auth controls are exercised in both LTR and RTL page contexts. |
| `EX56-21` | historical verification/scope/state fact; not correctness authority | H | V | LocaleBoundary loader typing follows the extended loader return shape. |
| `EX56-22` | historical verification/scope/state fact; not correctness authority | H | V | PR #56 adds no schema, migration or server auth mechanism. |
| `EX56-23` | intentional deferred real-OAuth boundary | H | P | Real Google OAuth credentials and deployed provider smoke remain deferred. |
| `EX56-24a` | historical verification/scope/state fact; not correctness authority | H | V | PROJECT_STATE records Google sign-in/sign-out UX as implemented. |
| `EX56-24b` | historical verification/scope/state fact; not correctness authority | H | V | PROJECT_STATE still records Stage 4D as incomplete after the auth-UX slice. |
| `EX57-01` | acceptable reusable safe-Markdown boundary | H | Q | react-markdown is pinned at 10.1.0 for forum body rendering. |
| `EX57-02` | acceptable reusable safe-Markdown boundary | H | Q | ForumMarkdown is a reusable renderer for persisted post-body content. |
| `EX57-03` | acceptable reusable safe-Markdown boundary | H | Q | CommonMark paragraphs/emphasis/lists/inline code/fenced code are enabled through react-markdown. |
| `EX57-04` | acceptable reusable safe-Markdown boundary | H | Q | Raw HTML is not turned into active DOM by the forum renderer. |
| `EX57-05` | acceptable reusable safe-Markdown boundary | H | Q | ForumMarkdown suppresses image rendering. |
| `EX57-06` | acceptable reusable safe-Markdown boundary | H | Q | Unsafe javascript-style link output is not allowed to remain executable. |
| `EX57-07` | acceptable reusable safe-Markdown boundary | H | Q | User links open externally with UGC/noopener/noreferrer/nofollow attributes. |
| `EX57-08` | acceptable reusable safe-Markdown boundary | H | Q | Markdown/code presentation adds wrapping and RTL-safe layout support. |
| `EX57-09` | acceptable/genuine concurrency and anti-abuse boundary | H | R | Forum write cooldown is one shared five-second policy for topic/reply content writes. |
| `EX57-10` | acceptable/genuine concurrency and anti-abuse boundary | H | R | The write policy clock and cooldown duration are injectable. |
| `EX57-11` | acceptable/genuine concurrency and anti-abuse boundary | H | R | Cooldown rejection uses a typed ForumWriteRateLimitError with retryAfterMs. |
| `EX57-12` | acceptable/genuine concurrency and anti-abuse boundary | H | R | Cooldown enforcement runs inside the same PostgreSQL transaction as the forum write. |
| `EX57-13` | acceptable/genuine concurrency and anti-abuse boundary | H | R | The existing Better Auth user row is the per-author serialization mutex. |
| `EX57-14` | acceptable/genuine concurrency and anti-abuse boundary | H | R | Cooldown history is derived from the latest forum_posts.created_at for the same author. |
| `EX57-15` | acceptable/genuine concurrency and anti-abuse boundary | H | R | The policy timestamp becomes the createdAt of the committed initial post/reply. |
| `EX57-16` | acceptable/genuine concurrency and anti-abuse boundary | H | R | Topic creation and reply creation share the same author cooldown. |
| `EX57-17` | acceptable/genuine concurrency and anti-abuse boundary | H | R | Different authors do not share a cooldown mutex/history. |
| `EX57-18` | acceptable/genuine concurrency and anti-abuse boundary | H | R | Same-author concurrent attempts are serialized before cooldown evaluation. |
| `EX57-19` | historical verification/scope/state fact; not correctness authority | H | V | Real PostgreSQL concurrency coverage requires only one same-author write graph to commit. |
| `EX57-20` | acceptable/genuine concurrency and anti-abuse boundary | H | R | Cooldown rejection occurs before partial topic/reply graph persistence. |
| `EX57-21` | historical verification/scope/state fact; not correctness authority | H | V | No new schema/migration is introduced for the cooldown. |
| `EX57-22` | acceptable/genuine concurrency and anti-abuse boundary | H | R | ForumWriteRateLimitError maps to HTTP 429. |
| `EX57-23` | acceptable/genuine concurrency and anti-abuse boundary | H | R | Retry-After is emitted as a positive ceiling in seconds. |
| `EX57-24` | acceptable/genuine concurrency and anti-abuse boundary | H | R | Rate-limit responses use localized safe presentation without domain details. |
| `EX57-25` | historical verification/scope/state fact; not correctness authority | H | V | Markdown security behavior has dedicated DOM tests. |
| `EX57-26` | historical verification/scope/state fact; not correctness authority | H | V | The DB suite includes deterministic cooldown boundary/rollback/author-isolation cases. |
| `EX57-27` | confirmed current test defect; not evidence of a runtime defect | H | R | P2 review identifies that the incomplete-topic rollback test can pass for the wrong rejection. |
| `EX57-28` | historical verification/scope/state fact; not correctness authority | H | V | PROJECT_STATE marks Stage 4D complete in the local/CI path. |
| `EX57-29a` | intentional next-slice/external stage boundary | H | R | Solved/best-answer becomes a distinct next product slice after Stage 4D completion. |
| `EX57-29b` | intentional next-slice/external stage boundary | H | R | Minimum-role/authorization work remains a distinct later Stage 4E slice. |
| `EX57-30a` | intentional next-slice/external stage boundary | H | R | Real Google OAuth acceptance remains deferred to Stage 6. |
| `EX57-30b` | intentional next-slice/external stage boundary | H | R | General external deployment acceptance remains deferred to Stage 6. |
| `EX58-01` | accepted product-supporting schema/invariant choice | H | S | forum_topics gains persistent is_solved state. |
| `EX58-02` | accepted product-supporting schema/invariant choice | H | S | forum_topics gains optional best_answer_post_id. |
| `EX58-03` | accepted product-supporting schema/invariant choice | H | S | A best answer is only valid when the topic is solved. |
| `EX58-04` | accepted product-supporting schema/invariant choice | H | S | forum_posts gains unique (topic_id,id) identity for same-topic best-answer enforcement. |
| `EX58-05` | accepted product-supporting schema/invariant choice | H | S | Best-answer database integrity uses composite (topic id, post id) identity. |
| `EX58-06` | confirmed schema defect at introduction | H | T | The initial best-answer FK used ON DELETE RESTRICT. |
| `EX58-07` | valid defect finding | H | T | The initial RESTRICT behavior conflicts with deleting a solved topic whose posts cascade. |
| `EX58-08` | justified fix of a real FK/cascade defect | H | T | 0ce4208 changes the best-answer FK to ON DELETE NO ACTION. |
| `EX58-09` | justified fix of a real FK/cascade defect | H | T | The final best-answer FK is DEFERRABLE INITIALLY DEFERRED. |
| `EX58-10` | acceptable checked-in migration representation choice | M | T | The circular deferred best-answer FK remains manual SQL outside Drizzle’s declarative snapshot model. |
| `EX58-11` | historical verification fact; not correctness authority | H | V | PostgreSQL tests assert exact best-answer FK metadata. |
| `EX58-12` | historical verification fact; not correctness authority | H | V | PostgreSQL deferred-constraint coverage rejects a cross-topic best-answer. |
| `EX58-13` | historical verification fact; not correctness authority | H | V | Solved-topic aggregate deletion is explicitly regression-tested. |
| `EX58-14` | acceptable/genuine transactional authorization and consistency boundary | H | S | markTopicSolved locks the target topic row. |
| `EX58-15` | acceptable/genuine transactional authorization and consistency boundary | H | S | markTopicSolved requires the actor to equal the topic author. |
| `EX58-16` | acceptable/genuine transactional authorization and consistency boundary | H | S | markTopicSolved distinguishes a missing topic. |
| `EX58-17` | acceptable/genuine transactional authorization and consistency boundary | H | S | markTopicSolved sets isSolved=true atomically in its transaction. |
| `EX58-18` | acceptable/genuine transactional authorization and consistency boundary | H | S | selectBestAnswer locks the topic row before checking state. |
| `EX58-19` | acceptable/genuine transactional authorization and consistency boundary | H | S | selectBestAnswer requires the actor to equal the topic author. |
| `EX58-20` | acceptable/genuine transactional authorization and consistency boundary | H | S | Best answer selection requires the topic to already be solved. |
| `EX58-21` | acceptable/genuine transactional authorization and consistency boundary | H | S | Best answer selection distinguishes a missing post. |
| `EX58-22` | acceptable/genuine transactional authorization and consistency boundary | H | S | Best answer selection rejects a post from another topic. |
| `EX58-23` | acceptable/genuine transactional authorization and consistency boundary | H | S | An existing best answer can be replaced by another valid post from the same topic. |
| `EX58-24` | acceptable Stage 4E solved/best-answer implementation choice | M | S | Public ForumTopic/ForumTopicPage carries isSolved and bestAnswerPostId. |
| `EX58-25` | acceptable Stage 4E solved/best-answer implementation choice | M | S | ForumWriter adds markTopicSolved and selectBestAnswer operations. |
| `EX58-26` | acceptable Stage 4E solved/best-answer implementation choice | M | S | Topic action introduces explicit markSolved and selectBestAnswer intents. |
| `EX58-27` | acceptable reuse of existing write safety/identity boundary | H | S | Solution mutations reuse the existing same-origin/session mutation boundary. |
| `EX58-28` | acceptable reuse of existing write safety/identity boundary | H | S | Solution actor identity comes only from the resolved Better Auth session. |
| `EX58-29` | acceptable Stage 4E solved/best-answer implementation choice | M | S | ForumAuthorizationError maps to controlled 403. |
| `EX58-30` | acceptable Stage 4E solved/best-answer implementation choice | M | S | ForumStateConflictError maps to controlled 409. |
| `EX58-31` | acceptable Stage 4E solved/best-answer implementation choice | M | S | Solved state is publicly visible. |
| `EX58-32` | acceptable Stage 4E solved/best-answer implementation choice | M | S | A selected best answer is visually marked on the corresponding post. |
| `EX58-33` | acceptable Stage 4E solved/best-answer implementation choice | M | S | Topic heading exposes a stable go-to-solution fragment link. |
| `EX58-34` | acceptable Stage 4E solved/best-answer implementation choice | M | S | Only the topic author is offered Stage 4E1 solution-management controls. |
| `EX58-35` | acceptable Stage 4E solved/best-answer implementation choice | M | S | Mark-solved control is shown only while the topic is unsolved. |
| `EX58-36` | acceptable Stage 4E solved/best-answer implementation choice | M | S | Best-answer selection controls appear after solved state on non-selected posts. |
| `EX58-37` | historical scope/state fact; not correctness authority | H | V | Migration 0005 is append-only checked-in history for solved/best-answer state. |
| `EX58-38` | historical scope/state fact; not correctness authority | H | V | PR #58 does not change the immutable content revision model. |
| `EX58-39` | confirmed test-fixture defect at introduction | H | U | Initial CI #115 fails in the new solution fixture because the forum cooldown fires. |
| `EX58-40` | confirmed test-fixture defect at introduction | H | U | The failed solution fixture contaminates later shared-fixture assertions. |
| `EX58-41` | justified fix of a real test-fixture defect | H | U | 9cda880 gives the solution test a deterministic advancing write-policy clock. |
| `EX58-42` | justified fix of a real test-fixture defect | H | U | 9cda880 guarantees cleanup with finally. |
| `EX58-43` | confirmed current desktop-layout implementation defect | H | U | P2 review records a two-column grid regression in best-answer post presentation. |
| `EX58-44` | historical scope/state fact; not correctness authority | H | V | PROJECT_STATE records Stage 4E solved/best-answer author slice implemented local/CI. |
| `EX58-45` | intentional later-stage/external boundary | H | S | Minimum roles and moderator/admin authorization remain later Stage 4E2 work. |
| `EX58-46a` | intentional later-stage/external boundary | H | S | Real Google OAuth acceptance remains outside the solved/best-answer slice. |
| `EX58-46b` | intentional later-stage/external boundary | H | S | General external deployment acceptance remains outside the solved/best-answer slice. |


## Classification counts

- 1 — acceptable aggregate-lifecycle choice
- 6 — acceptable atomicity/concurrency/validation boundary
- 1 — acceptable checked-in migration representation choice
- 2 — acceptable least-privilege separation boundary
- 5 — acceptable preparatory foundation
- 7 — acceptable reusable auth-UX/safety boundary
- 8 — acceptable reusable safe-Markdown boundary
- 11 — acceptable reusable Stage 4D write/safety boundary
- 15 — acceptable reusable write-integrity/safety boundary
- 2 — acceptable reuse of existing write safety/identity boundary
- 6 — acceptable Stage 4B domain foundation
- 20 — acceptable Stage 4C read/UI implementation choice
- 8 — acceptable Stage 4D auth-UX implementation choice
- 17 — acceptable Stage 4D auth/session foundation
- 11 — acceptable Stage 4E solved/best-answer implementation choice
- 14 — acceptable/genuine concurrency and anti-abuse boundary
- 10 — acceptable/genuine transactional authorization and consistency boundary
- 5 — accepted product-supporting schema/invariant choice
- 1 — confirmed client-state defect at introduction
- 1 — confirmed current desktop-layout implementation defect
- 1 — confirmed current test defect; not evidence of a runtime defect
- 2 — confirmed implementation defect at introduction
- 1 — confirmed presentation/i18n defect; partially current
- 1 — confirmed schema defect at introduction
- 3 — confirmed test-fixture defect at introduction
- 1 — disproven review prediction
- 3 — documentation synchronization defect
- 1 — historical counter-evidence fact
- 1 — historical scalability weakness; current public path superseded
- 3 — historical scope/state fact; not correctness authority
- 1 — historical state fact; not correctness authority
- 5 — historical state/verification fact; not correctness authority
- 7 — historical verification fact; not correctness authority
- 7 — historical verification/scope fact; not correctness authority
- 13 — historical verification/scope/state fact; not correctness authority
- 2 — historical verification/state fact; not correctness authority
- 1 — insufficient evidence for a present-stage defect; current failure-boundary concern
- 1 — insufficient evidence for a present-stage defect; live future-integrity concern
- 7 — intentional deferred external boundary; scheduling later superseded by PR #50
- 2 — intentional deferred real-OAuth boundary
- 1 — intentional external-rollout deferral
- 16 — intentional future-proof revision/translation foundation
- 3 — intentional later-stage/external boundary
- 1 — intentional local/CI versus external stage boundary
- 1 — intentional migration-only stage boundary
- 4 — intentional next-slice/external stage boundary
- 5 — intentional preparatory schema/identity foundation
- 4 — intentional staged product boundary later consumed
- 2 — justified documentation correction
- 2 — justified fix of a real FK/cascade defect
- 2 — justified fix of a real routing defect
- 4 — justified fix of a real session-cookie propagation defect
- 1 — justified fix of a real stale-header defect
- 3 — justified fix of a real test-fixture defect
- 1 — justified regression coverage
- 2 — justified simplification of redundant schema objects
- 1 — justified unrelated-test cleanup
- 3 — valid defect finding
- 1 — valid defect finding; combined-count label remains current
- 1 — valid future external-isolation concern; not a current local/CI defect
- 1 — valid scalability defect finding on the old helper; no current public-route consumer


## Documentation-laundering check

No strict laundering is established in this block. The strongest candidate is the stale blocker text carried from #52 into #53, but #54 corrects it as a present-state synchronization issue rather than rewriting provenance. Likewise, local/CI Stage 4 completion and deferred external OAuth/migrations are stated separately in current source-of-truth documentation.

## Boundaries after this block

- **Product/foundation intent:** forum revisions, separate topic-title identity, revision-local source language, authenticated participation, safe Markdown, cooldown, and solved/best-answer remain valid.
- **Current behavior:** the three confirmed live defects listed above remain preliminary audit findings; two additional concerns remain insufficiently evidenced.
- **Desired target/remediation:** **not selected in this task**.
- **Final status:** no record is advanced to `final`.

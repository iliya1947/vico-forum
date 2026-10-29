# Лёва — Codex-6.1 Sol

## PR #255 — CODE-PREVIEW-01 + CODE-PREVIEW-02 / author implementation handoff / STOP (2026-10-29)

Assignment: #6502560117; verification #6499986202 / reconciliation #6502470140.
Separate authorized branch: fix/preview-scenario-state.
Base/main: a4d552a4ce57986d97c02e2695f4546cffccecfd.
Stable exact head:39c6f16ad6f68d8abed7c9f46f52dd8535de801b.
PR:https://github.com/iliya1947/vico-forum/pull/255.

### Implemented bounded scope

Two distinct Preview causes, not one deduplicated defect:
- CODE-PREVIEW-01: actual typed-api route and wildcard topic fallback now obtain props from a shared private primaryTopicScenarioData projection. Dedicated confirmation keeps isSolved=false, bestAnswerPostId=answer and author/manage fixture flags. Query/hash routing is unchanged. Only primary-topic dispatch uses this helper; other known/unknown topic navigation retains its separate fixture path. Normal solved/unsolved/reply/error states preserve their former data/feedback semantics.
- CODE-PREVIEW-02: local sample filtering explicitly maps group appeals to case type appeal. Ordinary kind matching, needs-review review-status inclusion, mixed-topic selection/count semantics and intentional empty fixture remain unchanged. No production group/case renaming or generalized fixture framework.

Exactly3 files,+141/-42: preview-app.tsx,preview-app.test.tsx,PROJECT_STATE.md. Shared projection removes the former divergent duplicate topic-state derivation. Product actions/permissions/queue identities, other UI, schema, dependencies, localization catalogs and external services are unchanged. React author checklist: pure local derived data, no new hooks/effects/shared mutable runtime state or component identity changes.

### Author regression evidence

Before production edits, the expanded Preview suite ran against old source:5 FAIL/10 PASS. The five failures are initial confirmation, RU/HE confirmation locale remapping, confirmation-to-other-topic navigation and advertised Appeals card. Controls already passed.

After correction:88 focused tests/2files PASS (Preview15 + public-read73),12.85s. The final Preview15 suite was repeated after fixing test-only TypeScript API usage and passed15/15,6.72s. Eleven new permanent integration tests mount actual EmbeddedPreview/Router/shared views rather than inspecting private helpers or only scenario declarations. They verify initial prompt/Yes/No, real No dismissal preserving selected best answer and unsolved state, RU/HE query remapping, normal solved/guest-unsolved/reply/rate-limited states, navigation to another topic, actual Appeals tab/card/reporter/explanation/canonical link, Duplicate controls, needs-review plus review-status, Mixed1 with2 case cards and intentional empty Attention.

Personally run full generated-type/typecheck PASS, source lint PASS (one pre-existing ui.test.tsx unused-eslint-disable warning), current UI Preview build PASS and diff-check PASS. Initial local typecheck caught two test API typing issues; fixed without production changes or weakened type checks. No local full application/PostgreSQL suite or production build was separately rerun; full exact-head results are CI observations below.

Fresh actual static UI Preview/Chromium154.0.8037.57 evidence:66 observations across EN/RU/HE x390/1280, all desired assertions PASS,0 page errors/blocked/external/mutating requests. Includes24 topic states,6 native No dismissals and36 actual signal-group tab navigations. Each dedicated state renders confirmation1/solved0/best-answer1, and No preserves best-answer1/solved0 while removing prompt. All6 Appeals cases render appeal-146 with reporter/canonical link and count1. Adjacent group counts remain1/2/1/1/1/2; Mixed1 represents one topic with two case cards. Locale switches preserve confirmation query through the actual Preview router.

This is static synthetic Preview engineering validation, not production DB/auth/HTTP E2E or owner visual acceptance. Existing Preview mutation interception is retained. No real services or production acceptance is claimed.

### Exact-head CI

https://github.com/iliya1947/vico-forum/actions/runs/40914016260 — SUCCESS on39c6f16.
checks123589297495:1560 application tests/104files, lint/typecheck/application and UI-preview builds/history/migration/schema gates SUCCESS.
database123589297721:346 PostgreSQL17 tests/31files, schema parity/runtime privilege/provisioning/credential probes and local Workers smoke SUCCESS.
Completed job steps and logs inspected. CI merge86c81a056282f6de5965e3fa33c664561f155dd2 and implementation head have identical tree7db4d3e68d03be5e5e25fe946a9925928fdf7948, fetched/compared via Git. Full results are exact-head CI observations, not local full-suite claims. PR head/base rechecked unchanged; open/Draft/mergeable.

### Cleanup and handoff

Native/browser artifacts outside tracked source: /workspace/work/preview-implementation (red.log,focused.log,preview-final.log,typecheck-final.log,lint.log,preview-build.log,browser.py/browser.json/browser.log and screenshots). Node24.21.0 and existing pinned dependencies used. Ephemeral loopback HTTP/Chromium contexts closed; no application runtime/DB/container started. Dependency symlink removed; checkout clean.

This is author implementation/verification, not whole-PR self-review, team acceptance or merge approval. Coordinator whole-PR review of stable exact head is next, followed by eligible independent reviewers. Implementation and author verification COMPLETE; exact-head CI evidence recorded. Лёва STOP.


---

## Лёва — PR #251 / независимая проверка и технический план опубликованы / STOP (2026-10-29)

- Выполнено прямое назначение владельца [6500245214](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6500245214): source/contract verification и техническая декомпозиция, без реализации.
- Planning exact head cb0341fc5895dcda93d01b41637d52bd059bf54b, plan blob bb1533a2ce67369b650342fca7d6a447cb381edc; проверенный current main a4d552a4ce57986d97c02e2695f4546cffccecfd. Оба remote refs повторно проверены перед публикацией. Local f5dfd7a сравнен с main через GitHub; #252/#253 учтены.
- [Полный отчёт и план AP-01…AP-11](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6502711944). Продуктовая модель совместима с existing authz; уточнены две технические зависимости: History с реальным producer/atomic mutation transaction и Quick actions раньше новых зависимых object surfaces. Это planning review, не code defect audit/implementation acceptance.
- Proposed sequence: permanent contract → shell/Overview → History+authz producer → existing Roles integration → existing topic Quick actions/history → category/section browsing → topic/message contexts → close/reopen → Users → block enforcement после owner effect decision → integration/closeout.
- Сохраняются единый PermissionResolver/dynamic grants/overrides/freshness/snapshot/lockout, attention boundaries и обычный domain backend. Новые keys только с исполняемой capability. Ни второй RBAC, ни super-admin/account deletion/infra UI не нужны.
- Block effect matrix остаётся owner gate, уже предусмотренным исходным планом. Conditional usable-manager lockout нужен в AP-10 только если block запрещает login/authz management. Settings и неопределённый CRUD не объявлены готовыми; техническое предложение не является принятым продуктовым решением.
- Runtime tests/CI/browser будущей реализации не запускались. Git checkout clean; code/schema/dependencies/main PROJECT_STATE и проверяемый plan не менялись. Implementation branches/PR, merge/deployment не создавались/не выполнялись.
- Отчёт опубликован по прямому разрешению назначения в #251; текущий результат и context зафиксированы в #236 по AGENTS. Следующий шаг — Мира/owner согласуют technical plan и отдельно назначают AP-01. Самостоятельного запуска другого агента/implementation нет. Лёва STOP.

## Лёва — CODE-PREVIEW-01 + CODE-PREVIEW-02 / verification + bounded correction plan / STOP (2026-10-29)

Assignment: #6499792954. Superseded EDITOR-05 assignment #6499651711 was not executed.
Exact current-main baseline: a4d552a4ce57986d97c02e2695f4546cffccecfd.

### Verdict / classification

Both findings remain confirmed current-Stage preview/tooling defects (P3), not production forum defects or future-only polish. Neither was closed by subsequent merges. They share the UI Preview scenario/route/fixture adaptation module, but have TWO distinct causes and must not be deduplicated. One bounded preview implementation package is appropriate; no shared production architecture change is required.

### CODE-PREVIEW-01 — matched topic route drops the confirmation scenario state

scenarios declares topic-best-answer-unsolved with user identity and path /en/topics/typed-api?solutionPrompt=answer#solution-confirmation. PreviewController exposes the option for User and sends it to EmbeddedPreview. EmbeddedPreview preserves query/hash when remapping locale and passes scenario.path to createMemoryRouter initialEntries.

The concrete /:locale/topics/:topicId route selects PreviewTopicRoute. Its typed-api branch computes solved by excluding only topic-unsolved/topic-reply-error; the dedicated confirmation variant is omitted. It also calls topicData without solutionAuthor, so actual props are isSolved=true,bestAnswerPostId=answer,canManageSolution=false,isTopicAuthor=false. The correct special case in previewElement(case topic) exists but belongs to the wildcard route, so it never serves this matching URL.

TopicView's real guard requires author + manage permission + unsolved + selected best-answer ID matching solutionPrompt. Multiple required fixture props are wrong; fixing just the solved boolean is insufficient. The URL/query itself is not lost. Production setBestAnswer action still redirects with the intended solutionPrompt/hash; production topic guard is correct and existing positive author/non-author tests pass.

Personally executed two additional temporary native diagnostics (2/2 PASS): instrumented actual EmbeddedPreview dispatch confirms the four received props; on the SAME scenario route, passing intended unsolved/selected-answer/author/manage fixture props to the REAL TopicView immediately renders Problem solved?, Yes and the correct No permalink. This is a diagnostic positive control, not an implemented correction. Test file removed after execution; source is saved outside checkout.

### CODE-PREVIEW-02 — plural group vs singular case identity

Actual PreviewAttentionRoute accepts group=appeals. Its sample appeal-146 intentionally has type=appeal,kind=appeal; selectedCases filters item.kind===group, with an explicit special case only for needs-review review-status. The comparison appeal===appeals is false, while counts explicitly advertises appeals:1. Clicking the real Appeals tab therefore renders count1 with zero cases.

Production plural group identity is intentional: AttentionGroup/route allowlist/repository use appeals; production repository maps those rows to singular case kind/type appeal. The production queue/view contract must not be renamed to satisfy the preview filter. Needs-review2 and Mixed1 are useful controls: review-status must remain included, and Mixed1 counts a topic with two cases rather than demanding count==number of case cards.

### Fresh independent evidence on this main

- Existing preview-app.test.tsx + public-read.test.tsx:77/77 PASS across2files,13.01s; includes real production author/non-author confirmation controls. Their green state does not cover these two broken Preview compositions.
- Additional actual-dispatch/intended-props diagnostics:2/2 PASS,2.35s; no production mock substitutes for TopicView rendering.
- Fresh actual UI Preview build PASS using pinned Node24.21.0/existing Vite8.2.2. No new dependencies.
- Chromium154.0.8037.57 with actual freshly built preview main/EmbeddedPreview/router/shared components:60 observations in EN/RU/HE x390/1280. Twenty-four topic observations cover dedicated confirmation, ordinary solved, ordinary unsolved and editor reply. In all6 dedicated cases, solved badge1 + best-answer badge1 + confirmation0. Ordinary solved controls remain solved; unsolved/reply controls remain unsolved with no confirmation. Thirty-six Attention observations click all6 signal groups: case counts1/2/1/1/0/2 respectively for needs-details/needs-review/outdated/duplicate/appeals/mixed; Appeals tab advertises1 in every locale/width. Zero page errors or external/mutating requests. Current-behavior assertions passed; this does NOT mean desired behavior passed.
- Compared current preview source against historical audit baseline d72b27c: only an unrelated auth-click interception line changed; these topic/group chains were not corrected.

### Minimal correction boundary / later implementation plan

1. Keep changes local to app/ui-preview/preview-app.tsx, focused preview integration tests and PROJECT_STATE.md. No production actions/readers/permissions/Attention identifiers, schema, dependencies, general preview framework or unrelated UI cleanup.
2. CODE-PREVIEW-01: apply the intended confirmation fixture at the actual PreviewTopicRoute typed-api dispatch, including unsolved state, bestAnswerPostId=answer and author/manage flags. Prefer one small shared topic-scenario data helper used by actual matched route and any retained wildcard fallback so the existing divergent branches cannot drift. Do not let this dedicated typed-api fixture bleed into other navigated topics. Preserve query/hash and locale remapping; no synthetic write success is needed.
3. CODE-PREVIEW-02: explicitly map the appeals group to the appeal case type/kind in the local sample selection, keeping ordinary signal and review-status/mixed behavior. Do not rename plural production group IDs or singular case identities. Global fixture registry/count-generation refactor is unnecessary for these two defects.
4. Focused native regressions must mount EmbeddedPreview, not call the wildcard renderer or merely inspect scenario metadata. Desired confirmation scenario should initially show the real prompt/Yes/No, preserve selected answer on an unsolved topic, and dismiss via the existing No link without a write. Check normal solved/unsolved/reply and non-author/other-topic controls, plus locale changes preserving the prompt query.
5. Appeals regression must click the actual tab and assert active group/heading, count1 AND appeal-146 card, submitter/explanation/canonical-original link. Keep Duplicate1, Needs-review2 and Mixed1/two-case controls; do not convert intentional empty fixtures or placeholder modes into fabricated records.
6. Repeat focused current-main Chromium EN/RU/HE narrow/desktop scenarios after implementation, followed by applicable native tests/lint/typecheck/preview build and standard exact-head CI. Record only actual results; production behavior/owner acceptance is not inferred from static preview.

Source-of-truth classification: UI_UX_PASS.md requires representative, truthful preview through the shared presentation; the declared named confirmation state and nonzero Appeals fixture currently fail that purpose. Broader visual refinement, generalized fixtures, real provider/auth/DB functionality and owner visual acceptance remain outside this package.

### Cleanup / handoff

Implementation not performed; no branch/PR/commit/push/merge created. Only existing detached checkout moved to assigned main. Temporary diagnostic removed; dependency symlink removed, git diff/check clean. Own ephemeral loopback servers, Chromium contexts and temporary builds closed; no product runtime/DB/container or external service started. Static build/evidence retained outside tracked source in /workspace/work/preview-verification (browser.py/browser.json, logs/screenshots, diagnostic.tsx/log and this report).

Verification + plan COMPLETE. Coordinator reconciliation next; implementation requires a separate authorized task/branch/PR. EDITOR-05 remains unworked. Лёва STOP.


---

## Лёва — PR #252 independent whole-PR review / PASS / published

Date: 2026-10-29. Assignment: PR236 #6498377619.
Exact head: afc5b3d8c7e0e656746296cefe11d8cbe72604d1.
Base/main: f5dfd7a48093745ba216ec0e8d5c2e08c3cc9d96.
Scope: DISCOVERY-01; all five changed files, +201/-19.

## Verdict

PASS. Confirmed current-Stage defects: 0. Future-only findings/blockers: 0.
This is my independent whole-PR verdict, not team acceptance or merge approval.
No implementation edits during review. Developer authorized publication of this completed verdict.

## Complete source/diff review

Read every changed line of db/forum-repository.ts, app/forum/views.tsx,
app/forum/public-read.test.tsx, tests/database/stage4-core-e2e.test.ts and
PROJECT_STATE.md, plus the relevant unmodified readers/loaders/wrappers/consumers.
Checked the current Help contract, reserved identifiers and migration0027 against
UI_UX_PASS and the accepted DISCOVERY-01 correction boundary.

The shared private publicDiscoveryLocation function creates an explicit category
object and either an explicit normal section object or null for the exact reserved
HELP_SOLUTIONS_SERVICE_SECTION_ID. The original SQL row is not spread/serialized.
It is called by all four generic readers: Unanswered, Search, Tag detail and Unread.
The repository still selects private columns internally to identify the special
section; these fields do not cross the reader return boundary.

All changed query predicates, joins, ranking, ordering, grouping, limits and counts
are unchanged: the production change is final result mapping plus nullable types.
Public Help topics are retained, not excluded; public category is retained. Normal
section identity is unaffected. Popular has no section/location projection; tag index
contains tags/counts, so neither needs this nullable boundary. Home/direct-section,
dedicated Help, topic breadcrumb and authoring/moderation were not expanded.

All four views guard nullable section and only omit its markup/separator; links,
counts, tags, read-state grouping and first-unread anchors remain unchanged. CSS
contains no unconditional pseudo-separator that would expose an empty section label.
Inspected all production consumers of the changed interfaces/read methods. The extra
consumer in sectionLoader only uses topic id/state, not nullable section, and was
also exercised with real PostgreSQL data below. Topic/thread section remains non-null
and unchanged; it is a separate contract.

Read all added tests. The three application regressions use a projected reader fixture;
therefore they alone do not prove the repository boundary. The PostgreSQL test checks
actual four-reader results and normal controls. Migration0023 is added only to the
existing test schema list, enabling actual read-state tables; no production migration
history changes. State text describes implementation without claiming external/browser
acceptance or independent review in advance.

## Personally executed evidence

Pinned Node24.21.0, existing exact project dependencies:
- public-read.test.tsx: 73/73 PASS,11.67s, including new route/presentation regressions.
- Disposable local PostgreSQL17, actual stage4-core-e2e.test.ts plus one independent
  diagnostic: 4/4 PASS,2.64s (three submitted tests plus my additional check).

The additional diagnostic was temporarily appended, executed and restored byte-for-byte;
source is saved separately as diagnostic.txt. It creates its own normal and Help topics,
users and tag, deliberately names the normal section Questions and renames the reserved
section to Private service marker in the disposable DB. This proves hiding is based on
reserved identity, not visible-name matching, and normal Questions stays public.

It exercises actual PostgreSQL -> createHyperdriveForumReader (local Client factory) ->
real Unanswered/Search/Tag/Unread loaders for EN/RU/HE, without mocking reader results.
Both topics stay present; Help section is null; normal category/section are retained;
serialized loader payloads contain neither reserved section id nor renamed service label.
Checks tag count2, search post count2 after reply, real Help new -> read -> unread -> read
lifecycle, firstUnreadPostId/latestPostId/unreadCount, exclusion from Unanswered after a
reply, sectionLoader normal read-state projection, hidden-section direct404 and guest
Unread401. These are native server/data checks, not actual HTTP/Chromium/SSR E2E.

## Exact-head CI independently checked

CI40881203274 SUCCESS; completed steps and logs inspected:
- checks123472871435:1549 application tests/104files, lint/typecheck/application and
  UI-preview builds/history/migration/schema gates SUCCESS. One existing unused-eslint
  disable warning, no errors.
- database123472870906:346 native PostgreSQL17 tests/31files, schema parity/runtime
  privilege/provisioning/credential probes and local Workers smoke SUCCESS.

Full local suites, lint/typecheck/builds were not separately repeated; their full results
above are CI observations. Git-fetched CI merge ab9077e871bfa1d4db1918cb39bfb6597e6a4e16
has tree3ada2304d104820e8bf4ef6dd2c69cd2c2f8daef, identical to assigned implementation
head. Final GitHub metadata still has assigned head/base, open/Draft/mergeable.

## Limits / cleanup / stop

No separate real Chromium or full application HTTP/SSR E2E, no real external services,
production or owner visual acceptance performed or inferred. No broader Help/privacy
policy change proposed. No independent result inferred from other auditors' conclusions.

Temporary test edits restored; git diff empty and diff-check PASS. Dependency symlink
removed. Own disposable leva-pr252-review-pg removed with volume; port55442 closed.
No application server was started. Artifacts outside checkout: native.log,database.log,
diagnostic.txt,stage4-original.ts and this report in /workspace/work/pr252-review.

Independent review COMPLETE; developer authorized publication. This report is now published.
Mira coordinator reconciliation is next; this personal verdict does not certify PR253 or team merge readiness. Лёва STOP.


---

## PR #253 — responsive containment / author implementation handoff / STOP (2026-10-29)

Assignment: PR236 #6497648909; accepted verification #6497466128 / reconciliation #6497607854.
Authorized separate branch: fix/responsive-containment.
Base/main: f5dfd7a48093745ba216ec0e8d5c2e08c3cc9d96.
Stable exact head: ca51415bf1cfe72c28c1b05867e158c39b409194.
PR: https://github.com/iliya1947/vico-forum/pull/253 (open/Draft/mergeable; metadata rechecked).

### Implemented boundaries

Three distinct causes remain separately named in one bounded package:

- RES-UI-01: at <=44rem, the main extra-menu details is static so its absolute popup uses the bounded, already-sticky toolbar; popup width is min(18rem,100%). The trigger summary remains positioned to preserve its former pointer paint order beside fullscreen controls. Nested menu anchors and desktop placement are retained.
- CODE-HISTORY-01: history gets full-row grid-column:1/-1, min-inline-size:0 and bounded width. Raw pre gets local overflow-x:auto without whitespace/source transformation; history metadata can break long text. No raw content is hidden through document-level overflow masking.
- M-M07: existing <30rem account row stays nowrap. Attention text wraps inside its own bounded link; auth uses min-content sizing, unshrunk action labels and a2.5rem profile minimum that contains the complete avatar/padding. Long names can truncate; actions and permission semantics are unchanged.

Production delta is50 CSS lines (+48/-2). Other changes are PROJECT_STATE.md and five browser harness files. Total7files,+401/-2. No production TSX/editor source/parser/history retrieval/auth/API/schema/dependency changes. Contrast M-M10/F06, owner visual and unrelated responsive cleanup remain outside scope.

### Reproducible browser regressions

Maintained opt-in harness: tests/browser/responsive/check.py, actual shared presentation/styles via existing Vite; Python Playwright1.62.0 + Chromium154.0.8037.57, pinned Node24.21.0. Instructions and prerequisite boundary are in its README. No npm/browser platform dependency added.

RED on unchanged base CSS: all3 original EN320 cases fail as expected: manager document357, opened More410, opened history4045 for the deliberately longer regression payload. No browser errors/external requests. The earlier verification's shorter history line produced789; these are different payloads, not inconsistent measurements.

Final corrected-head run:240/240 PASS,0 page errors,0 blocked/external/mutating requests:
-90 header cases:10 widths x EN/RU/HE x guest/user/manager. Bounds/hit testing of visible actions, long public name, full avatar rectangle and narrow single-row vertical intersection checked.
-120 menu cases:10 widths x EN/RU/HE x Simple/Advanced x in-page/fullscreen. Real native More click, item hit testing including scrolling to enabled controls, keyboard Tab/Enter/Space, popup/document bounds, computed sticky preservation and closing checked. At320, all12 mode/locale/fullscreen combinations additionally click nested emoji, verify its presence in the actual hidden body and resize390→320 with the menu open.
-30 history cases:10 widths x3 locale/direction/date contexts, actual TopicView + real Router fetcher dispatch to a fixed in-memory revision action. Two long raw revisions, exact pre.textContent including Hebrew/newlines/spaces, preserved white-space:pre, independent horizontal scroll, open/close containment checked. History UI labels deliberately remain English in this fixture; header/menu use actual EN/RU/HE preview packs.
Widths:320,360,390,479,480,703,704,767,768,1280. One-pixel geometry tolerance for rounding.

Author diagnosis caught a real intermediate regression: replacing the relative details anchor changed pointer painting in fullscreen and let Advanced intercept the More trigger. A keyboard-only opening did not catch this. Restoring positioned painting only on summary keeps the popup attached to the toolbar and restores native pointer targeting. The final240 run includes ordinary clicks and supersedes the earlier keyboard-only240 result.

An earlier harness run inherited preview-only pointer-events:none for sign-out and asserted the narrow row contract at wider widths; it was discarded, not counted as product failures. The final fixture omits preview.css and checks the one-row contract only below480. Its interrupted process family was explicitly stopped; all final runs closed normally.

### Native/static/build checks

Personally run:267 targeted native tests/3files PASS (public-read, auth-controls, markdown-editor). Full local lint PASS with the existing ui.test.tsx unused-eslint-disable warning only. Full local generated-type/typecheck and production build PASS. Browser TSX fixture separately strict-typechecked with the project-pinned compiler PASS (it lives outside normal app tsconfig include). Python syntax compiled; generated __pycache__ removed. Final diff-check PASS.

Full local application/PostgreSQL suites were not separately rerun. Native full suites and preview build below are new exact-head CI observations, not inferred local runs. Browser fixture uses synthetic identities/fixed revisions, not real auth/session/DB/server permission verification, SSR or production E2E. These layout checks are engineering validation, not owner visual acceptance.

### Exact-head CI

https://github.com/iliya1947/vico-forum/actions/runs/40882061194 — SUCCESS on ca51415.
checks123475877559:1546 application tests/104files, lint/typecheck/application and UI-preview builds/history/migration/schema guards SUCCESS.
database123475877099:345 native PostgreSQL17 tests/31files, schema parity, runtime privilege/provisioning/credential probes, local Workers smoke SUCCESS. Completed steps and logs inspected.
CI checkout0ca12886151ce4ff3b03a384a07d8d2ce2236f25 merges the assigned base/head and has the same tree36e950859005ff45c922d59119a5968d98cc2897 as the implementation head (Git-fetched and compared). Earlier CI40881448898 passed9ba3d5d but is not final-head evidence.

### Cleanup and handoff

No local DB/container/production service or runtime server was started. Ephemeral loopback HTTP servers, Chromium contexts and temporary build directories closed/removed. Discarded diagnostic process family stopped; dependency symlink removed and checkout clean. No merge or owner visual/production acceptance performed.
Artifacts outside checkout: /workspace/work/responsive-implementation, including red/results.json,green-corrected/results.json, logs/screenshots, native/static/build logs and diagnostic alternatives. Only final corrected-head results support this handoff.

Implementation and author verification COMPLETE. This is not whole-PR self-review, independent PASS or merge approval. Mira starts coordinator whole-PR review of stable ca51415, then eligible independent reviewers check the same head. Лёва STOP.


---

## Лёва — responsive package / verification complete + implementation plan / STOP (2026-10-29)

Assignment: #6497168605. Exact current-main baseline: `f5dfd7a48093745ba216ec0e8d5c2e08c3cc9d96`.
Scope: RES-UI-01, CODE-HISTORY-01, M-M07. These remain THREE distinct current-Stage causal groups; later merges have not closed them. This is verification/planning, not an implementation or whole-PR review.

### Personally reproduced on current source

Fresh current-source UI Preview build and separate actual TopicView + real stylesheet/React Router fixture, Chromium. Widths 320/360/390/768/1280. Menu/header: EN/RU/HE; history: EN with a raw source line. Header has manager permission fixture incl. Needs attention, notifications, profile, authorization and sign-out. History action is an explicitly fixed local fixture returning revision text; no DB/server authorization claim.

| Finding | Current observation | Cause and minimal boundary |
| --- | --- | --- |
| RES-UI-01 | In each of EN/RU/HE, opening More changes document320→410,360→440,390→458. Wider768/1280 controls fit. | Main details is a relative anchor at an interior toolbar offset, while the absolute popup has width min(18rem,75vw) and inset-inline-start:0. Popup width ignores actual remaining space. On narrow layouts, anchor the main popup to the bounded toolbar instead; main details position:static, popup width min(18rem,100%). Preserve existing sticky toolbar, scrolling and nested menus. No fixed viewport offsets or global overflow hiding. |
| CODE-HISTORY-01 | At320, closed document320; open history789; close320. Raw pre scroll728/client148. | Raw pre has white-space:pre/visible overflow; mobile .forum-post-content display:contents makes history a grid item without full-row/shrink boundary. Add full-row grid-column:1/-1 + min-inline-size:0/max-inline-size:100% to history and max width + overflow-x:auto to its pre. Keep exact raw text and pre whitespace; scroll only the raw source region. |
| M-M07 | Manager EN320→357; RU320→382 and RU360→382. HE and larger controls do not reproduce document overflow. | Account row and auth row are nowrap; fixed notification/control widths plus unbreakable Needs attention and authorization/sign-out labels exceed available width. Profile-only flex shrinking was experimentally insufficient. Preserve the accepted single account row by allowing localized attention text to wrap inside its own link, sizing auth controls against their min-content and reserving a complete avatar minimum before truncating profile name. Do not hide authorization/sign-out or change permission semantics. |

Source chain read: app/forum/markdown-editor.tsx toolbar/details markup; app/forum/views.tsx history fetch/render; app/forum/ui.tsx manager/account header; app/auth/auth-controls.tsx; applicable complete CSS rule groups including later overrides. Contract checked against docs/UI_UX_PASS.md current mobile single-account-row decision and narrow/overflow hardening, docs/EDITOR.md toolbar grouping and history, ROADMAP.md current defect vs later refinement distinction, current PROJECT_STATE.md. Existing native history permissions/actions remain outside this CSS correction.

### Diagnostic experiments, not implementation

All style changes were injected into disposable browser pages. No tracked source was edited.

- Baseline matrix:35 scenarios,0 page errors. Main menu and header EN/RU/HE×5widths plus5 history widths.
- Menu experiment repeated across all15 locale/width pairs while explicitly preserving position:sticky: document equals viewport in all15. The preliminary broader toolbar-relative experiment was discarded because it would remove stickiness. Preferred production media boundary is the existing narrow breakpoint, leaving desktop placement unchanged.
- History localized scroll/full-row experiment: document equals viewport at all5 widths, raw text remains preformatted and locally scrollable. At320 pre client238/scroll728. A layout fixture verifies geometry, not real history permission/data persistence.
- Header row wrapping removes document overflow but contradicts the current accepted one-row composition; discarded. Profile-only flex experiment still fails EN/RU narrow widths; discarded. Bounded attention-text wrapping and auth min-content correction retains nowrap account/auth composition and fixes current EN/RU width failures. Final avatar minimum is2.5rem (not2.15rem, which would clip avatar/padding). Final15/15 EN/RU/HE×5width cases have document==viewport and the full avatar rectangle inside the profile control;0 page errors. These are geometry checks, not a claim of completed interaction/owner acceptance.

### Bounded implementation package

1. Create one separately authorized implementation branch/PR from the then-current main; recheck these three source boundaries if main moved. Keep three causal findings named separately.
2. Local CSS corrections only where sufficient: narrow main extra-popup containing block/width, raw history grid/shrink/scroll, narrow manager header allocation/attention-label wrapping. Expected production file app/styles.css; source markup only if a concrete regression proves CSS insufficient. No layout rewrite, parser/editor state/history APIs/auth changes/dependencies.
3. Add focused reproducible real-browser layout coverage using actual shared components/styles and fixed local fixture data. No jsdom geometry assertions or tests merely matching CSS text. Preserve a script + exact-head JSON results and representative screenshots as engineering evidence; choose a small maintained harness consistent with existing project tooling, without adding a browser platform dependency merely for this package.
4. Browser regression matrix:320/360/390 + existing breakpoint boundaries703/704 and767/768 +1280; EN/RU/HE; guest/user/manager controls; long identity/attention labels. Assert document scrollWidth<=clientWidth (rounding tolerance1px), rendered/control bounds and hit testing, localized accessible labels, controls retained, no overlapping/clipped avatar/action buttons. Account/auth row remains one row; attention text may wrap inside its link.
5. Menu: Simple/Advanced and fullscreen/nonfullscreen, native keyboard/click opening/closing, nested emoji/direction/language controls, viewport resize while open, RTL + sticky toolbar after scrolling. Ensure all items remain reachable and focus visible; popup local vertical scrolling permitted. No weakening existing editor data/selection/Undo behavior.
6. History: open/close at mobile/desktop, multiple revisions, long unbroken lines and mixed RTL/LTR source, exact pre.textContent, independent pre horizontal scroll, no ancestor/document expansion, long author/date labels and message action placement. Reuse real TopicView and its fetcher action shape; backend permission contract unchanged.
7. Run relevant native component suites (public-read/auth-controls/markdown-editor), full lint/typecheck/builds and applicable exact-head CI; update PROJECT_STATE.md with actually implemented state. Finish implementation checks before coordinator and independent whole-PR reviews.

No new future-only finding is promoted into this package. Deferred M-M10/F06 contrast refinement, owner visual acceptance, unrelated responsive cleanup and external/production services are excluded. Engineering layout checks do not certify owner acceptance.

Artifacts outside tracked source: /workspace/work/responsive-verification (current builds, fixture, browser scripts/JSON/logs including rejected alternatives). No production implementation edits, new branch/PR, commit, push or merge. No real services/DB started. Ephemeral HTTP servers and browsers closed. Dependency symlink removed; checkout clean.

Verification and technical plan COMPLETE. Implementation requires separate developer authorization for the new branch/PR. Coordinator should reconcile this bounded plan first. STOP.


---

## Лёва — PR #250 / independent whole-PR review — PASS / STOP

Date:2026-10-29. Assignment:PR236 comment6496099834.
Exact head:750d6e9a5d9f1cd89a45afc40c864c93b0bf0772.
Base/main:0a09482fc2653b65e775ae069c86c48ab247b4fb.
Scope:CODE-SEARCH-01, all 3 changed files (+188/-1 against base).
Публикация завершённого независимого review разрешена разработчиком. Вердикт относится только к указанному exact head.

## Verdict

PASS. Confirmed current-Stage defects:0. Future-only blockers:0. This is a personal independent verdict, not team acceptance or merge approval. The whole assigned PR was checked, not only the last correction.

## Source and causal review

Read the complete three-file diff: views.tsx, public-read.test.tsx and PROJECT_STATE.md. The entire production delta against base is a useLocation call and an input key. The search route loader, URL parsing, NFKC/trim/whitespace normalization, backend reader, form method/action, uncontrolled defaultValue, limits and other input attributes are unchanged.

Input identity now follows the committed Router location.key. Distinct raw queries that normalize to the same loader query get distinct history entry identities and reset a dirty input. Back/Forward reuses each entry's key, which differs from the active entry. Editing without navigation leaves the key stable and the input editable. The existing Form already required router context; useLocation does not introduce a new unsupported standalone-render requirement. Checked the pinned React Router declaration documenting the unique location key and initial default key.

All 167 added test lines were read: original distinct-query A/B navigation, new normalized-equivalent raw GET/dirty Back/Forward, and empty/whitespace-equivalent entries assert raw URL plus authoritative loader/result state and visible input. The state document accurately describes the current boundary and does not assert unperformed external acceptance.

## Independent execution

- Local pinned Node24.21 toolchain: public-read.test.tsx70/70 PASS,9.56s. This includes the real SearchRoute/searchLoader/createMemoryRouter tests and positive TypeScript result fixtures. No temporary diagnostic tests or implementation changes were needed.
- Actual local Vico React19.3/ReactRouter8.3.1 application on4218 with disposable migrated PostgreSQL17 on55441, actual Chromium:19 settled-state observations,19 expected-state checks PASS. This repeats the prior exact reproducer, including normalized-equivalent GET, unrelated dirty draft, Back/Forward and empty/whitespace pair. Normal A/B, edit-before-submit, initial normalized and over-limit controls also pass. Zero browser page errors and zero console errors.
- Six additional SSR/hydration checks PASS: JavaScript disabled and enabled, each with normalized full-width/spaced query, whitespace-only query and over-limit query. Original server response input value and final browser input agree with normalized loader value; response status200. No hydration or console errors.
- Two additional real-browser checks PASS: after an SPA GET creates a non-default history location key, enter a dirty draft and hard-reload; server/client field is the committed query and the existing history key is retained. Back after reload correctly restores the previous query/input. No runtime/hydration errors.
- Total browser evidence:27 observations/checks across these distinct paths. Artifacts:browser.py/browser.json/browser.log,ssr.py/ssr.json/ssr.log,reload.py/reload.json/reload.log.

Browser uses a disposable migrated database without topic fixtures: real SQL returns empty results and the result panel explicitly identifies the authoritative normalized query. Positive matching-result behavior is independently covered by the native route fixture. This is local engineering validation, not owner visual/deployed acceptance.

## CI and exact head

Read the completed logs and job steps of exact-head CI40868500419:all steps SUCCESS. checks123429231677:1268 application tests/103files, lint/full typecheck/application+preview builds/history/schema guards PASS. database123429231250:345 PostgreSQL17 tests/31files plus schema/runtime privilege/provisioning/credential probes and local Workers smoke PASS. Full local app/native PG/build suites were not separately repeated; these full results are CI observations.

CI checkout783b57b30494844f35c08e62a3d8c14bc159b514 merges the exact assigned head/base and has the same tree44fff84f21adc3ee35adb27220fd55c083129bfb as the head, verified through Git fetch/tree comparison. Final GitHub metadata:head/base unchanged, open/Draft/mergeable,3 changed files.

## Cleanup and publication boundary

Local Vite3658/Workerd3689 stopped; ports4218/55441 closed. Disposable leva-pr250-review-750-pg removed with volume. Synthetic .dev.vars and dependency symlink removed; checkout clean and diff-check PASS. Browser contexts closed. During review, no implementation changes/commits, branch pushes, service report/comment publication or merge were performed. Publication now follows the developer's separate command. No real external services/providers/production or owner visual acceptance.

Independent review COMPLETE; developer authorized publication. Мире — coordinator reconciliation личного PASS на этом exact head. Лёва STOP.


---

## PR #247 — bounded plain serializer correction / author handoff / STOP (2026-10-29)

Assignment: PR236 comment6495447379. Existing PR247 and branch chatgpt6/batch-l2-20261027.
Baseline:2105c1063f57c0cc0ea662fb3b65413e33ba8bae.
Stable implementation head:d0574225f6b0fc8285e69268441b989927d7e1db.
Base/main:0a09482fc2653b65e775ae069c86c48ab247b4fb.

### Implemented causal scope

Both confirmed LITERAL-TEXT-01 residuals are corrected in the existing plain serializer boundary. clipboardPlainToMarkdown normalizes the incoming fragment through existing textareaMarkdown before any line escaping or contextual code classification. The private textAsMarkdown and tab gate now receive the same LF input; initial conversion, physical-line indices and repeated codeLines conversion cannot disagree about standalone CR. The existing source document is not normalized.

Marker neutralization escapes the final punctuation, preserving any preceding digits. Thus1. becomes1\\. and1) becomes1\\), while single-character markers keep their prior escaping. No heading-specific or CR-specific compensating parser was added. Existing Advanced raw input, dedicated existing-code insertion, rich HTML/TSV conversion and contextual literal tab-code semantics retain their boundaries. Schema, dependencies, parser and translation protection policy are unchanged.

PROJECT_STATE.md and docs/EDITOR.md describe the implemented LF input view and source/code EOL boundary. Change from baseline:5files,+111/-5; one production module, two test files and two state/contract documents. No new branch/PR or merge.

### Regression evidence

- New tests ran against the old implementation before the production edit:12 FAIL /2 PASS /220 skipped. Failures cover ordered markers under all3 EOLs, standalone-CR/mixed contextual-code classification and mounted literal publishing. The two passing cases are genuine LF/CRLF tab-code controls.
- After correction:360 tests /3files PASS,17.10s:clipboard serializer, actual MarkdownEditor component and existing source-positioned code-paste suite. Includes all14 new tests and the126 existing dedicated-code model tests.
-6 new mounted Simple Ctrl+Shift+V → actual onPastePlain/context → hidden body/FormData → actual ForumMarkdown → single Undo/Redo cases cover LF/CR/CRLF in root/outer spoiler. Existing CRLF document bytes outside insertion remain exact; public heading/ordered-list/nested-spoiler activation is absent; displayed digits/punctuation are literal with no extra backslash; original source returns on Undo and encoded source on Redo.
- Pure permanent controls cover heading/quote/bullet/ordered/rules/entities/tilde, multi-digit ordered marker, intended raw-tab code in root/spoiler and a mixed-EOL mid-paragraph tab insertion. Existing HTML/TSV and native/code controls remain in focused suites.
- Actual ForumMarkdown SSR/DOM matrix:120/120 PASS on current implementation.4 EOL modes LF/CR/CRLF/mixed × root/spoiler ×14 marker payloads, plus intended tab-code cases. Covers Vico opener/closer/table/direction, backticks, literal entities and punctuation. Prose whitespace is assessed with ordinary Markdown rendering normalization; intended code content is checked literally. This is a converter/public-render matrix, not Chromium or HTTP/DB publication.
- Local full tsc-b:PASS. Source/test ESLint:0 errors/0 warnings. git diff --check:PASS.

### Exact-head CI

CI40866592828 SUCCESS on d0574225f6b0fc8285e69268441b989927d7e1db. Completed logs and every job step read/checked: checks123422794815 and database123422794287 both SUCCESS. Full application1543 tests/104files and native PostgreSQL17 345tests/31files PASS; lint, full typecheck, app/UI-preview builds, migration/history/schema parity, runtime privilege/provisioning/credential probes and local Workers smoke PASS. These are actual new CI results, not reused old-head checks.

CI checkout8f2862a4ec3f0ac064c4b98b5e43f85be993ca5b merges exact head/base. Its tree609b2bd40e9a31b5d8aa6fd6245d466f111a91c9 matches implementation head, checked through Git fetch. Remote exact head/base unchanged; PR open/Draft/mergeable. No merge performed.

### Limits / cleanup / handoff

No new actual Chromium, HTTP/DB application publication, local full app/native PG or local builds were run for this small serializer correction. Their success is not inferred from earlier heads; applicable full checks are supplied by the new exact-head CI. New mounted public-render/history evidence is specific to this implementation.

Dependency symlink removed; checkout clean. No local server/container was started. Artifacts live outside tracked source in /workspace/work/pr247-serializer-correction: red.log,focused.log,matrix.tsx,matrix.json,matrix.log,typecheck.log,lint.log. The standalone SSR fixture emits an i18next missing-provider warning; the mounted component tests use the real test runtime and pass. The fixture's literal structure/content assertions do not depend on translated UI labels.

This is author implementation verification only, not whole-PR self-review or team acceptance. Previous reviews refer to2105c10. Mira must begin a new whole-PR coordinator cycle on d057422, followed by eligible non-author reviewers on the same stable head. STOP after implementation handoff.


---

## PR #247 — standalone-CR author verification / CONFIRMED / STOP (2026-10-29)

Назначение: [#6486554293](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6486554293).
Unchanged exact head: `2105c1063f57c0cc0ea662fb3b65413e33ba8bae`.
Base/main: `0a09482fc2653b65e775ae069c86c48ab247b4fb`.

### Вердикт и causal chain

**Согласованный current-Stage P2 LITERAL-TEXT-01 подтверждён.** Это несовпадение общей physical-line boundary plaintext serializer и Markdown parser, а не отдельный heading edge case.

`textAsMarkdown()` (clipboard-markdown.ts:13–35) заменяет CRLF на LF и делит по LF. После standalone CR serializer продолжает ту же logical line; line-start guards heading/quote/list/rule/indentation не запускаются. Public CommonMark parser распознаёт CR как перевод строки. Для `before\r# literal heading` source остаётся с неэкранированным heading marker, actual ForumMarkdown создаёт h1 и убирает literal # из текста.

Проверен реальный mounted Simple путь: Ctrl+Shift+V / clipboardData → VisualMarkdownEditor onPastePlain → clipboardPlainToMarkdown с selection/context → hidden body/FormData → actual ForumMarkdown → Undo/Redo. CR создаёт h1; LF и CRLF сохраняют literal #. Три diagnostic checks подтвердили именно текущее поведение, а не успех будущего исправления.

### Минимальная bounded correction

1. Canonicalize CRLF, standalone CR и LF к одному LF view **на общем входе plain clipboard serializer до line splitting, marker escaping и contextual raw-tab classification**. Существующий pure `textareaMarkdown` уже задаёт такую нормализацию; новый parser/framework или heading-specific special-case не требуется.
2. Initial conversion, context gate, line indices и повторный `textAsMarkdown(..., codeLines)` должны использовать один и тот же normalized input. Удалить либо согласовать прежние разрозненные CRLF-only assumptions внутри этой private boundary.
3. Не нормализовать целый существующий Markdown document. Native Advanced raw paste и dedicated existing-code operation с source EOL fidelity не переводить на prose serializer. Rich HTML/TSV conversion не расширять.
4. После отдельного implementation assignment: EOL/marker regressions плюс mounted FormData/public-render/history, затем applicable exact-head CI и новый review cycle.

Это техническая граница предложения; production implementation не менялась.

### Изолированный эксперимент и существенный control limit

Вне implementation checkout создана копия serializer с одним входным `text.replace(/\r\n?/gu, "\n")`. Imports указывают на реальные текущие modules; это диагностический candidate, не опубликованная реализация.

Матрица: 4 EOL режима (LF/CR/CRLF/mixed) × root/spoiler ×14 marker payloads, плюс intended tab-code controls;120 наблюдений current +120 candidate. Проверялся actual ForumMarkdown SSR/DOM, отсутствие непреднамеренных структуры/направления и видимые literal symbols с обычной prose whitespace normalization. Candidate сохраняет EOL-independent результат для heading/quote/bullets/rules, Vico spoiler opener/closer/table/direction, backticks/entities/tilde и contextual raw-tab code.

**Current80/120, candidate104/120**. Нельзя объявлять весь candidate PASS: оставшиеся16 failures относятся к двум ordered-marker controls `1.`/`1)` во всех EOL/root/spoiler combinations.

**Отдельное author-confirmed наблюдение, не CR cause:** replacement на clipboard-markdown.ts:31–32 ставит backslash перед цифрой (`\1.`/`\1)`), а не перед Markdown punctuation. На публичном render получается видимый лишний backslash. Это есть уже при LF/CRLF и та же логика присутствует в base/main0a09482; это не следствие root-cause code correction. Два дополнительных mounted Simple paste→FormData→ForumMarkdown controls подтверждают лишний backslash и отсутствие ol.

Не включаю это молча в согласованный standalone-CR finding и не меняю scope реализации. Мире нужно отдельно reconcile этот existing control defect перед назначением пакета. EOL normalization закрывает CR line-boundary bypass, но сама не исправляет ordered-marker encoding.

### Regression boundary

- Heading, quote, unordered/ordered markers, horizontal/Setext-like rules, initial four spaces, raw tabs.
- Vico opener/closer, table-shaped literal text, direction lookalikes, backticks, entities/tilde.
- LF/CR/CRLF/mixed, root и outer spoiler; genuine tab-code должен сохранять literal punctuation/entities.
- Existing document CRLF source вне вставки остаётся exact; mounted selection/FormData/public semantics и single Undo/Redo.
- Native Advanced raw/code operation, existing code/container preservation, HTML/TSV и обычный prose — controls. Ordered-marker known control issue учитывать отдельно, не скрывать failing assertion и не выдавать candidate за полный PASS.

### Проверки и ограничения

5 mounted diagnostic checks PASS /180 existing tests skipped,1.96s:3 EOL reproduction/control cases +2 ordered marker observations. Это не запуск всего application suite. Матрица240 actual-render observations; candidate не применялся к mounted implementation.

Артефакты: /workspace/work/pr247-cr-verification/{candidate.ts,matrix.tsx,matrix.json,matrix.log,mounted-all.log}. Candidate и артефакты вне tracked implementation. Временные mounted tests удалены, исходный test file восстановлен; dependency symlink снят, checkout clean, diff-check PASS. Remote head/base повторно сверены.

Новые CI/full app/PG/browser/HTTP publication не запускались и не заявляются. Для author verification использованы actual converter и mounted/public components; production/external/provider/owner visual не затрагивались.

**Мире:** согласованный CR finding подтверждён; общий EOL-input fix достаточен для его causal path. Отдельно reconcile existing ordered-marker literal defect и затем выдать bounded implementation assignment. **Лёва STOP.**


---

## Лёва — PR #250 / independent whole-PR review — CHANGES REQUIRED

Date: 2026-10-29. Assignment: PR236 comment6486530815.
Exact head: a5f58c5a9f0e85b95c4aa529e1d3a01a437112c1.
Base/current main: 0a09482fc2653b65e775ae069c86c48ab247b4fb.
Scope: CODE-SEARCH-01, all3 changed files (+81/-1).
Разработчик разрешил публикацию завершённого независимого review. Вердикт относится только к указанному exact head; coordinator reconciliation ещё требуется.

## Verdict

One confirmed current-Stage P2 residual in CODE-SEARCH-01. No other confirmed findings in the assigned scope; no future-only blocker. Core A/B navigation works, but navigation between raw queries mapping to the same normalized query does not reset the dirty input. The fix is incomplete against the explicitly assigned normalized-query/history contract.

## P2 — normalized query collisions retain a dirty search field across history

Location: app/forum/views.tsx:458-459, key={query} with defaultValue={query}.

The real loader in app/routes/search.tsx normalizes q using NFKC, trim and whitespace collapse (and truncates over-limit input for presentation). Different URL/history entries can therefore share one query/key. React retains the dirty uncontrolled input for that identity even after navigation has completed. The URL, loader query and displayed results follow the navigated entry, but the visible input can show an unrelated unsubmitted draft.

Actual Vico/Chromium reproduction on exact head:

1. Load /en/search?q=Beta. Input/defaultValue are Beta; results panel says no topics found for Beta.
2. Submit raw query `  Ｂｅｔａ  ` through the actual GET form. URL q contains that raw value; loader normalizes it to Beta. Because the input key is still Beta, the visible value retains the raw full-width/spaced string.
3. Edit the input to `Unsaved other query` without submitting; this is permitted editing and does not change the results.
4. Browser Back to /en/search?q=Beta. After settled navigation, input.value is still `Unsaved other query`, defaultValue is Beta, and the rendered results still correspond to Beta. Forward to the full-width URL retains the same stale draft.

The same cause also leaves spaces in the field for whitespace-only submissions/history between empty-equivalent queries. These are manifestations of one identity/synchronization defect, not additional findings.

Independent native reproduction uses actual SearchRoute + searchLoader + createMemoryRouter and the repository reader/runtime fixtures. Initial TypeScript → GET full-width/spaced TypeScript → edit unrelated draft → Back TypeScript. Navigation is idle, URL is ?q=TypeScript and the expected TypeScript result link is present, but the searchbox remains `Unsaved unrelated query`. An assertion expecting TypeScript fails. This is not an abstract React16 harness or only a source inference.

Required boundary: synchronize committed navigation/history transitions even when normalized query is equal, while retaining draft editing before submit. Do not expand backend/search/URL normalization semantics. Add a native regression with two distinct raw URL queries sharing the normalized query and a dirty-field Back/Forward case; include empty-equivalent control. No implementation suggestion was applied.

## Whole-scope checks and passing controls

- Read every changed line of views.tsx, public-read.test.tsx and PROJECT_STATE.md; followed route loader and repository search normalization. Only production change is one input key. No backend, parser, schema, dependency or unrelated search behavior change was introduced.
- Existing native public-read suite:68/68 PASS,8.85s. The new PR test covers distinct normalized TypeScript/WebAssembly keys, history, draft-before-submit and empty query. It does not cover two entries with equal normalized query.
- Additional native desired-behavior regression:1 FAIL /68 skipped,4.45s, with exact URL/result assertions passing before the searchbox assertion fails. Temporary test was removed and the original tracked file restored byte-for-byte; implementation never changed. Log: normalized-native.log.
- Actual local Vico React19.3/ReactRouter8.3.1 + Chromium + disposable PostgreSQL17:19 settled-state observations.14 expected-state controls pass;5 failures are the single normalized-identity family. Covers initial query, editable draft, GET A/B, Back/Forward, empty transitions, normalization-changing-key, normalization-equal-key, whitespace-only, normalized SSR and over-limit SSR. Zero browser page errors. Artifacts: browser.py, browser.json, browser-stable.log.
- The first preliminary browser capture could snapshot before POP data settled; that transient distinct-key snapshot is not a finding. The final run waits for settled navigation; ordinary different-key controls pass.
- Full CI40807997303 independently read: both jobs and all steps SUCCESS. checks123231420980:1266 app tests/103files, lint/full typecheck/builds/guards PASS. database123231421234:345 PG17 tests/31files plus schema/runtime/Workers PASS. These are CI observations, not a claim that the reviewer personally reran all suites/builds locally.
- Synthetic merge24105ed570772569236020921587b6f72dfc6c22 has the same tree b7fd2746e6e431d03f9d691dd421a4ecf98b181e as the exact head, verified by Git fetch/tree comparison.
- Final GitHub metadata: unchanged head/base,3 changed files, open/Draft/mergeable.

## Cleanup and publication

Local Vite73090/Workerd73125 stopped; ports4218/55441 closed. Disposable leva-pr250-review-pg container and volume removed. Synthetic .dev.vars and dependency symlink removed; temporary native test restored; checkout clean and diff-check PASS. Во время review implementation commit, изменение ветки, публикация или merge не выполнялись; отчёт публикуется после отдельной команды разработчика. No real external service/provider/production/owner visual acceptance.

Independent review COMPLETE. Публикация разрешена разработчиком. Мире — reconciliation одного P2 на этом exact head. Лёва STOP.


---

## PR #247 — accepted LITERAL-TEXT-01 correction / author handoff / STOP

Assignment: PR236 comment6485551587; accepted root-cause plan comment6485172583.
Author: Лёва — Codex-6.1 Sol. Date: 2026-10-29.
Baseline: e1c8391d15e604dedfd525a2e8b1b1cfd26d1881.
Integrated accepted main: 0a09482fc2653b65e775ae069c86c48ab247b4fb (merged PR249).
Stable head: 2105c1063f57c0cc0ea662fb3b65413e33ba8bae.
Existing branch: chatgpt6/batch-l2-20261027. No new branch or PR.

## Implementation boundary

The old raw-substring helper is replaced with actual code-unit discovery, logical content replacement, and bounded encoding. Existing parser token handlers supply exact code data, padding and container boundaries. The locator follows actual renderer units: root/protected Markdown, spoiler bodies, table header/body cells. Source UTF-16 offsets and CR/LF/CRLF are retained.

Inline edits reuse the extracted existing inline-code padding primitive and preserve a safe delimiter width (only matching backtick run lengths conflict). Indented/quoted/list code receives structural continuation prefixes on new physical lines; semantic indentation, including partial-tab content, stays in the value. Fenced candidates use the common physical-line view and actual semantic validation before widening outer fences. No whole-document serialization is used. Existing commitSource/history applies one operation and caret mapping.

Shared narrow table-code semantics matches GFM escaped-pipe handling: escaped pipes in inline code become literal pipes, while other backslashes, punctuation and entity syntax stay literal. Renderer, semantic consumer and clipboard cell parsing use the same rule. The source-positioned locator uses the same decoder/encoder with boundary projection. The existing table lexer/grammar is unchanged. Odd literal backslash count before a pipe and physical multiline cell code are unrepresentable in this grammar and explicitly blocked without buffer mutation; none of the four confirmed failures is closed by blocking it.

Known-code blocked outcomes do not fall back to prose serialization. Successful encoding is checked against the actual renderer semantic tree with just the selected code value changed; surrounding structure/membership must remain identical. Generic clipboard feedback was updated in EN/RU/HE and the reviewed fingerprint refreshed for that descriptor only.

Shared semantic changes advance content protection to cnt06-table-code-direction-v4, preserving the merged PR249 direction contract. No provider activation, recovery system, schema or dependency change. PROJECT_STATE.md and docs/EDITOR.md describe the implemented behavior.

Commits: 42cc32b (correction), 1f4e384 (main integration), f28aa57 (joint table-code/direction regression), 2105c10 (explicit Node project file list). The final commit changes only tsconfig.node.json, with all application/test blobs identical to f28aa57.

## Local verification

- Baseline four residuals were previously reproduced by this author on e1c8391d (six browser executions); old evidence is in pr247-review-e1c8391d. This implementation does not invent new baseline results.
- New code model suite: 126 cases. Root/spoiler/table header/body inline spaces/all-spaces/backticks/Unicode/pipe parity; block indents, quotes/lists/nesting, blank lines/semantic tabs; CR/LF/CRLF/mixed endings, fence widths/types; partial/whole selections, empty code, caret and exact Undo/Redo; blocked and prose controls.
- Full local app before integrating PR249: 1514 tests /103 files PASS, 147.45s. This is explicitly pre-integration evidence, not the final combined full-suite count.
- After integration: 332 tests /4 files PASS, 31.85s (code model, editor component, semantic serialization, protection/public rendering). Joint direction + escaped-pipe code regression passes.
- Local full TypeScript build tsc -b PASS after adding table-code.ts to the explicit Node project include list. Earlier application-only tsc passed but missed that composite-project omission.
- ESLint: 0 errors; one existing unused-disable warning in app/forum/ui.test.tsx:174. git diff --check PASS.

## Actual application-path verification

The actual local Vico Worker/React Router application ran on port4216 with a disposable PostgreSQL17 on55440. Synthetic email/password user and forum section; no OAuth, real provider, external DB or production. Current repository migrations applied to the disposable database.

Eleven actual Chromium clipboard/native cases were executed before integration, then all eleven repeated after integration:

1. Table-body inline code with literal punctuation/entities/pipes.
2. Inline leading/trailing spaces.
3. Root indented multiline code.
4. Spoiler indented multiline code.
5. Quoted fenced multiline code.
6. CR-only matching-fence payload.
7. LF matching-fence control.
8. CRLF matching-fence control.
9. Nested list/quote fenced code.
10. Native Advanced inline paste control.
11. Table-header code with padding/backticks/pipe together.

Each path: actual clipboard → UI command/native control → collapsed exact caret → Undo original source → Redo encoded source → FormData → one real publication POST → redirected public topic → expected code content and surrounding membership. A separate SQL query for every topic asserted original_content equals the exact editor source; source/textarea caret normalization asserted independently. All 11 passed after integration. CR/CRLF sources remained exact in DB; public code text checked with physical EOL normalization, and unselected Outside remained outside code. No injected strong formatting appeared. Table rows/columns remained intact.

The first development run published table-cell successfully, then encountered the existing five-second topic write cooldown. The harness was corrected to wait six seconds between publications; application policy was not changed. This preliminary interrupted run is not counted as a complete PASS.

Artifacts: browser.py, browser-results.json, postmerge-browser.log, persistence.mts, persistence.json, postmerge-persistence.log. Pre-integration copies are named explicitly. No old application E2E head is reused as new evidence.

## CI

Initial final-candidate run40804490437: database PASS (345 tests /31files, schema/runtime/build/Workers); checks failed TS6307 because table-code.ts was absent from tsconfig.node.json's explicit include list. No app tests/build success is claimed for that failed job. The build list was corrected in2105c10 and a new exact-head CI is required.

Final exact-head CI40804856322 SUCCESS on2105c1063f57c0cc0ea662fb3b65413e33ba8bae:
- checks123221241225: 1529 application tests /104files PASS,74.47s; migration guards, lint, full typecheck, application/UI-preview builds, migration metadata and Drizzle schema parity PASS.
- database123221241408: 345 PostgreSQL17 tests /31files PASS,29.43s; schema manifest, runtime privilege/provisioning/credential probes, build and local Workers smoke PASS.
- Completed logs for both jobs read; all steps successful. Checkout test merge d1ec7790ccd5963939810971a0e8b08e484e7cbd from exact head/base. Git tree equality with implementation head checked separately.
- Final head was rechecked through GitHub; unchanged, PR open/Draft/mergeable. No whole-PR self-review.

## Cleanup / limits / handoff

Local Vite68016/Workerd68046 stopped, ports4216/55440 closed. Disposable leva-pr247-code-correction-pg removed with its volume. Synthetic .dev.vars removed, dependency symlink removed, checkout clean. Browser contexts closed. No new branch/PR, no merge of PR247, no external/production/provider/Queue/owner visual action.

This is author implementation verification, not a whole-PR self-review or team acceptance. Previous whole-PR reviews describe the superseded e1c8391d head. Mira must start a new coordinator whole-PR cycle on the stable new head, then assign eligible non-author independent reviewers. STOP after handoff.


---

## PR #247 — root-cause / bounded redesign proposal — PROPOSED / STOP

Дата: 2026-10-29. Автор: Лёва — Codex-6.1 Sol.
Назначение: PR236 comment6484849949.
Unchanged exact head: e1c8391d15e604dedfd525a2e8b1b1cfd26d1881.
Base/main: ebdb482e8bb37cf18d7085beb2926930139b00d6.

Статус: **техническое предложение к согласованию, не утверждённый implementation plan**. Implementation не менялась. Новый review/CI/E2E не запускались: использованы уже полученные exact-head browser artifacts, текущий source и профильные contracts. Новых findings сверх согласованных четырёх не вводится.

## 1. Root cause и масштаб

Четыре residual не являются четырьмя случайными независимыми regexp bugs. Общая неправильная модель helper: selected source substring считается literal rendered code content, а безопасная вставка — raw replacement плюс отдельные поправки delimiter длины.

В действительности между source и code value есть несколько обязательных преобразований:

- Vico table/spoiler задают локальные Markdown documents;
- code span имеет delimiter/padding и CommonMark normalization;
- block code внутри indentation/quote/list имеет structural continuation prefixes;
- physical CR/LF/CRLF участвуют в определении code lines и closing candidates.

Следовательно, баги имеют разные конкретные проявления, но один неверный контракт редактирования. Нужна **ограниченная замена модели pastePlainTextIntoExistingCode**, не четвёртый пакет исключений и не новый редактор/универсальный CST framework.

Одного локального изменения только helper недостаточно для полного case1 с literal pipe: shared table-cell parsing также должен согласовать structural pipe escaping внутри code. Это часть уже подтверждённого case1, не новый fifth finding.

## 2. Сравнение с существующей правильной основой

- segmentTechnicalMarkdown уже задаёт реальные source spans table cells и spoiler bodies; использовать именно эти boundaries, без второй table/spoiler grammar.
- ForumTable разбирает cell.text отдельно, ForumMarkdown разбирает spoiler body отдельно. Code context discovery обязан делать то же и сохранять global↔local source coordinates.
- parseRenderedForumMarkdown соответствует semantic boundaries, но прямо предупреждает: позиции локальные, дерево не предназначено для source edits. Нельзя подать его позиции напрямую в replaceSourceRange или сериализовать всё дерево обратно.
- inlineCodeAffixes/inlineCodeMarkdown уже учитывают backtick delimiter и padding для крайних spaces/all-space content. Новый helper дублирует только часть этой логики, поэтому теряет spaces.
- editableCodeRanges/codeNodeContentRange — primitives для разрешённых source keyboard edits, не полноценное представление rendered code value. Не расширять их молча так, чтобы поменять semantics Tab/Enter/IME вне этой команды.
- commitSource/EditorSnapshot/recordEditorEdit уже дают одну undoable transaction, selection и exact source edits. Сохранить этот механизм.
- encodeTableCell/decodeTableCell предназначены для literal visual-cell input и снимают/добавляют escapes всей ASCII punctuation. **Не применять decodeTableCell ко всей authored Markdown cell до parsing**: это превратит экранированную literal punctuation в formatting.

## 3. Предлагаемая минимальная граница решения

Заменить внутренность существующей plain-code operation на три последовательных действия:

**A. Locate actual code unit → B. Replace its logical content → C. Encode bounded source edit.**

Не строить новую универсальную paste subsystem. Public command остаётся прежней, clipboardPlainToMarkdown остаётся prose path. Native Advanced source paste, Simple input, rich HTML/TSV и прочие editor commands не переводятся на новую модель.

### A. Один read-only source-positioned locator

- Обойти реальные renderer units: root prose/protected, spoiler body, header/body table cell. Внутри — существующий parser с ancestor path quote/list и code/inlineCode nodes.
- Вернуть target code unit, его envelope/source spans, map source offsets↔code-content boundaries и container projection (cell/spoiler/quote/list/indent).
- Structural padding/indentation не считать частью logical code content; собственные spaces/tabs пользователя не считать structural prefix. Для CRLF и Unicode сохранять корректные JS UTF-16 source coordinates.
- Определить container prefixes по parser/container structure и actual source spans, а не копировать первый raw indent на все случаи.
- Различать not-code и known-code-but-unrepresentable/ambiguous selection. Только not-code идёт в prose serializer. Невозможность безопасно отобразить selection не должна незаметно превращаться в raw/prose fallback.

### B. Вставка в code value

Смысл операции: old logical prefix + clipboard content + old logical suffix. Это test oracle, а не raw source.slice equality.

Для line handling использовать один code-specific physical-line iterator, распознающий CRLF, LF и CR, с сохранёнными terminator/source spans. Не нормализовать весь документ и не расширять глобальную Vico table/spoiler grammar на новые line endings без необходимости.

### C. Bounded encoding

1. **Inline code:** использовать одну существующую normalization/padding rule из inlineCodeAffixes; сохранять existing delimiter width как минимум, расширять только при необходимости. Structural padding отделяется от content. Крайние literal spaces и backticks должны пройти parse→value round-trip. Меняется только target inline unit и необходимые delimiters, не paragraph/table целиком.
2. **Indented / quote / list code:** новые physical lines получают required structural code/container continuation prefix. Clipboard semantic indentation не срезается. Existing unselected code prefix/suffix и outer paragraph/table/spoiler сохраняются. Не сериализовать весь list/blockquote ради вставки одного фрагмента.
3. **Fenced code:** анализировать closing hazards на logical code lines после container projection, используя тот же CR/LF/CRLF line view. При matching/longer candidate согласованно расширять actual opener/closer, сохраняя marker type, info string/filename и окружающий source. Новый fragment также получает нужные quote/list prefixes.
4. **Table code:** один shared узкий table-cell code transport codec для parser/renderer и encoder/source mapping. Минимальная предложенная semantics — обычный escaped pipe внутри table inline code представляет pipe, а не prose backslash (GFM example200). Существующие table dimensions/alignment и cell boundaries остаются authoritative. Не подключать весь GFM stack и не заменять table lexer на новую grammar ради этого case.

Важная явная часть scope: current ForumTable и semantic consumers сейчас получают code value с literal backslash в \|. Исправление shared table-code semantics меняет этот ошибочный rendered value; это должно быть согласовано и отражено явно, а не спрятано в editor-only escaping. Один и тот же cell parsing/codec должен применяться в ForumTable, semantic consumer и code locator; existing clipboard cell parsing также должен видеть согласованную semantics. Не декодировать произвольно все backslashes/entities.

Для pipe/backslash parity использовать спецификацию/reference behavior и round-trip tests, а не предположить, что один replace('|','\\|') достаточен. Подтверждённый текущий payload с pipe обязан успешно вставляться без отказа. Для действительно не представимых вне подтверждённого scope combinations — только явный безопасный отказ без изменения buffer/source, не silent data loss и не имитация успешного paste. Ни один из четырёх подтверждённых cases нельзя закрыть таким отказом.

Результат операции — edit plan (source edits + final caret) или отдельный not-code/blocked outcome. Существующий command применяет successful plan одним commitSource/history step. Предупреждение использует existing UI mechanism с корректным generic wording, без новых диалогов или технических деталей для пользователя.

## 4. Обязательные invariants

- Actual parsed/rendered target code value равен logical prefix + payload + suffix с явно учтённой CommonMark normalization, structural prefixes и source EOL fidelity; source string совпадение само по себе не oracle.
- Unselected visible text и его code/quote/list/table/spoiler membership сохранены; не появляются новые strong/headings/links вне code.
- Source вне target code envelope и действительно необходимых structural edits остаётся побайтово неизменным. Whole-document AST serialization запрещена.
- Нельзя иметь known code context → null → prose fallback.
- Outer table shape/alignment, spoiler summary, code info/filename, соседние targets и direction не меняются от paste.
- One Undo возвращает exact original source/selection, Redo — exact new source; caret остаётся в logical месте вставки после delimiter/prefix changes.

## 5. Реализационный порядок

1. Зафиксировать existing four failures и passing controls как acceptance tests, включая expected parsed value и surrounding structure. Не менять implementation до утверждения этой границы.
2. Согласовать shared table-cell code transport rule; проверить представимость подтверждённого payload и round-trip pipe/backslash cases. Обновить только необходимую shared cell semantics и source mapping, не whole table grammar.
3. Заменить внутренний raw-insertion контракт helper на locator/value/encoder. Сразу применять один line iterator для всех block encoders и одну inline padding rule.
4. Подключить edit result к existing command/history, сохранив prose/native/TSV/HTML paths. Отдельно обработать blocked, не masquerade как not-code.
5. Проверить shared-consumer regression effects: semantic Markdown/protected content, mentions/quotes, table source boundaries. Если меняется реально versioned semantic/protection contract, отразить это явно по текущим docs; не вводить LOC-09 recovery, migration или provider rollout. Не трогать соседний PR #249.
6. Новый stable exact head, applicable full CI и browser/application acceptance, затем новый independent whole-PR cycle. Автор не выдаёт self-verdict.

## 6. Regression matrix — конечная, с конкретными пересечениями

Не бесконечный Cartesian product. Обязательны все шесть failed browser executions из четырёх cases + перечисленные controls. Остальная matrix — targeted pairwise coverage между axes с обязательными intersections ниже.

| Context/boundary | Обязательные values и controls |
| --- | --- |
| Inline root, spoiler, table header/body cell | sensitive ASCII/entities, pipe/backslashes с проверкой parity, leading/trailing/both spaces, all-space content, существующий padding, backtick runs1/2/longer, Unicode |
| Indented root/spoiler | single/multiline, blank lines, tabs/spaces, content indentation vs structural indentation, unselected Before/After, supplied-prefix control |
| Fenced root/spoiler | backtick/tilde, shorter/equal/longer/opposite candidates, CR/LF/CRLF и mixed endings, 0–3-space indentation, info/filename, unselected Outside |
| Quote/list containers | fenced и indented code, continuation prefixes, одна nested quote/list representative комбинация, multiline payload, невыделенный suffix остаётся code |
| Selection/source mapping | caret insertion, partial replacement, entire code value, edge spaces/padding, multiline source selection, UTF-16/CRLF offset boundaries; cross-container selection не имеет silent fallback |
| Integration controls | prose plain command; native Advanced raw paste; Simple input; HTML/TSV; spoiler closer; tabbed table-shaped paste; mentions/LOC-03/LOC-06 existing regressions |

Обязательные intersections: table cell×pipe/backslashes×inline padding/backtick widening; indented/quote/list×multiline×unselected suffix; fenced×все3EOL×marker/relative width; UTF-16/source selection×prefix/delimiter edits.

Уровни evidence:
1. Pure source-map/encode→actual parse/value tests, целостность outside source/structure.
2. Mounted actual command→FormData→ForumMarkdown, selection и single-step Undo/Redo.
3. Chromium с настоящим clipboard/UI command для каждого failure и основных controls. Representative plain-code inserts пройти через настоящий forum POST/DB revision/public topic page на новом head, не выдавать прежние E2E за новый результат.
4. Full app/native PG/lint/typecheck/build/Workers CI exact head. Green helper-string tests или CI не заменяют invariants и browser evidence.

## 7. Что не предлагается

Новый editor engine, общий CST всей системы, whole-document serialization, новая library/dependency по умолчанию, wholesale GFM table rewrite, изменение native Advanced typing/paste, production/provider/external rollout, LOC-09 recovery. Это bounded замена одного неверного literal-code edit boundary и необходимое согласование table-cell code semantics.

## Sources / limits

Текущий source и артефакты /workspace/work/pr247-review-e1c8391d/advanced-expanded.json, advanced-controls.json, fence-controls.json; source contracts docs/EDITOR.md §2/§3.3/§10.
Official GFM: https://github.github.com/gfm/#code-spans и https://github.github.com/gfm/#example-200. Проверены relevant normalization/table-pipe sections. Reference mdast-util-gfm-table source показывает отдельный inTable code-text handler; библиотека не установлена и dependency не добавлялась.
Документы/reference copies сохранены в /workspace/work/pr247-literal-redesign/. Candidate design не реализован и не объявлен проверенным решением. Repo чистый, новые tests/servers/DB не запускались.

**Мире:** согласовать proposed helper/model boundary и узкую shared table-code semantics, затем выдать отдельное implementation assignment. До этого implementation не менять. STOP.


---

## PR #247 — independent whole-PR review / REQUEST CHANGES / STOP (2026-10-29)

Дата: 2026-10-29. Назначение: PR236 comment6484190656.
Exact head: e1c8391d15e604dedfd525a2e8b1b1cfd26d1881.
Base/current main: ebdb482e8bb37cf18d7085beb2926930139b00d6.

### Verdict: REQUEST CHANGES

Проверен весь Batch L2 scope EDITOR-10, LITERAL-TEXT-01, LOC-03, LOC-06, все 17 changed files относительно main (8 production, 8 test, PROJECT_STATE) и относящиеся UI/parser/validation/planning call chains. Это новый независимый whole-PR cycle, не только последний patch. Coordinator/reviewer findings этого head до завершения не использовались.

Подтверждены **4 current-Stage P2 residual subcase одной family LITERAL-TEXT-01**. В расширенном Chromium run это 6 failed executions (один subcase имеет3 container variants). Прежние три correction cases проходят. В EDITOR-10/LOC-03/LOC-06 новых current-Stage defects нет; отдельных новых future-only findings не установлено.

### 1. Plain command не находит inline code в Vico table cell

Relevant app/forum/editor-document.ts:421–428: locate разбирает spoiler, prose, protected, но не part.kind=table.

Initial Advanced source:
```text
| A | B |
| --- | --- |
| `Alpha` | Other |
```
Выделить только Alpha. Clipboard: ~~literal~~ &copy; | value |. More tools → Paste without formatting.
Actual FormData cell source между backticks: \~\~literal\~\~ &amp;copy; \| value \|.
Actual public table p code.textContent содержит эти escapes/entities вместо literal payload.

Причина: helper возвращает null для table, команда fallback-ится в prose serializer. Public renderer реально разбирает каждую ячейку отдельно и поддерживает inline code. Это не будущая table-code capability: тот же UI/source/public renderer уже показывает code до вставки. Root inline code с тем же payload — passing control.

### 2. Clipboard spaces по обоим краям inline code теряются

Relevant app/forum/editor-document.ts:436–445, особенно fast return440 и padding442.

Initial source: `Alpha` с одиночными backticks. Выделить Alpha и вставить payload " padded " (по одному ASCII space с обеих сторон).
Actual source: ` padded `; actual public inline code.textContent: "padded". Expected literal code value: " padded ".

Причина: direct insertion не учитывает существующее CommonMark inline-code normalization — обе крайние spaces удаляются parser-ом. Даже branch расширения ticks добавляет padding только для backticks, не для padded non-space content.
Control с исходным ` Alpha ` оставляет дополнительный structural padding и сохраняет payload spaces. Уже существующий inlineCodeAffixes в том же module22–35 явно поддерживает этот normalization contract; это подтверждённая потеря допустимых текущих code characters, не новое требование будущей работы.

### 3. Multiline plain command выходит из indented/quoted code и меняет невыделенный suffix

Relevant app/forum/editor-document.ts:434,449,458: raw direct replacement не переносит required code/container prefix на следующие clipboard lines.

Initial root source (TAB — настоящий U+0009):
```text
<TAB>Before
<TAB>Alpha
<TAB>After

Outside
```
Выделить Alpha. Payload: First\n**Payload formatted**\nLast (настоящие LF).
Actual source:
```text
<TAB>Before
<TAB>First
**Payload formatted**
Last
<TAB>After

Outside
```
Public code теперь содержит только Before/First; Payload formatted становится strong вне code, а невыделенный After перестаёт быть частью исходного code и становится continuation paragraph.

Тот же trigger подтверждён:
- внутри indented code в Vico spoiler body;
- внутри quoted fenced code, где следующие payload lines не получают `> `, закрывая code/quote context и также активируя formatting.

Это 3 concrete executions одной causal boundary — потеря structural continuation prefix при raw multiline insertion. Single-line root/spoiler code, root fenced code с тем же multiline payload и варианты с уже supplied correct TAB/quote prefixes сохраняют code/After (controls). Зависимость от наличия пользовательских continuation prefixes прямо отделяет проблему от clipboard decoding, selection или formatting payload как такового.

### 4. Matching fenced-code protection пропускает CR-only clipboard lines

Relevant app/forum/editor-document.ts:453: body.split(/\r?\n/u) не разбивает standalone U+000D.

Initial triple-backtick text fence со строками Before / Alpha / After, после closing fence — paragraph Outside. Выделить Alpha.
Payload — три backticks, CR, **Payload formatted**, CR, три backticks.
Actual hidden body/FormData содержит настоящие CR. Opening/closing delimiters остаются 3, вместо widening. Public ForumMarkdown создаёт2code blocks и strong Payload formatted между ними.

С тем же payload при LF и CRLF helper расширяет оба внешних fences до 4, public остаётся одним code block без strong. Clipboard write/read в настоящем Chromium сохраняет CR в этом случае, поэтому это не только hypothetical raw string. Current Markdown/code path принимает CR (другие source-range helpers явно обрабатывают CR/LF), внешнего rollout не нужно. Это текущий matching-fence residual, не future-only.

### Evidence и controls

Все новые symptoms проверены через настоящий Chromium clipboard/UI command → actual MarkdownEditor source → FormData при локальном harness-submit → actual ForumMarkdown DOM. Сравнивались code.textContent, strong nodes и принадлежность невыделенного After к code. Undo/Redo assertions проходили для всех advanced-expanded/advanced-controls cases.

Это component/public-render browser harness, **не повторная DB/HTTP публикация форума на новом head**. Server write implementation в этом PR не менялась; full native PostgreSQL/Workers evidence — exact-head CI ниже. Результаты full-application публикаций старого7c6bd4e8 не выдаются за новые E2E.

Artifacts /workspace/work/pr247-review-e1c8391d/:
- advanced-expanded.py/.json/.log:16 cases, в том числе 6 failure executions четырёх boundaries;
- advanced-controls.py/.json/.log: LF/CRLF, fenced multiline и supplied indentation/quote controls;
- fence-controls.py/.json/.log:5 matching/longer/shorter/opposite marker scenarios, exact one code block, Outside prose, no strong, UndoRedo asserted PASS;
- custom-paste/nested-paste: root literal custom syntax, tabbed tables и closer preservation перепроверены;
- browser-existing/browser-paste/browser-context/browser-mentions: прежние 25 asserted regression controls PASS;
- probe/context-matrix/loc03/loc06: независимые pure/domain diagnostics.

Всего 62 browser observations: 25 previous asserted controls, 5 asserted fence controls и 32 additional observations. Последние включают 6 подтверждённых failure executions; весь browser run НЕ PASS. Generic 96 ampersand/tilde payload checks и 28 native indentation paragraph controls имеют ограниченный scope и не используются как доказательство всех custom contexts.

### Остальной scope и checks

- EDITOR-10: full name serialization/recipient path перепроверен; 255 code-point AST controls без mismatches,12 browser name cases в Simple/Advanced PASS. Immutable profile destinations/recipients сохраняются.
- LOC-03: scanner/controlled-token validation, provider publication/compiler/verifier/runtime call chains перепроверены. 9 injected variants rejected, 8 unchanged valid controls accepted, 3 malformed bounded-size inputs rejected быстро. Новых current defects нет.
- LOC-06: authoritative revision/no-text guard и callers/permission/runtime/currentness boundaries перепроверены. 14 capability→real planner diagnostics PASS, включая 12 no-text no-op без detector/upsert/enqueue и 2 prose queued. Новых current defects нет.
- Full local application: **1380 tests /102 files PASS**,157.01s.
- Exact-head [CI #40785122902](https://github.com/iliya1947/vico-forum/actions/runs/40785122902) SUCCESS; completed logs checks123156264275/database123156263484 прочитаны: **1380 app /102 files, 326 PostgreSQL17 /30 files**; lint 0 errors/один прежний warning,typecheck,application/UI builds,metadata/schema/runtime probes/Workers smoke PASS. CI checkout test merge f9376f86 из e1c8391d +base ebdb482.
- Native PG/build/Workers отдельно локально не повторялись. External/provider/production/owner visual не выполнялись.

Implementation не менялась; repo clean после удаления dependency symlink. Chromium/own HTTP stopped. Разработчик разрешил публикацию командой «Публикуй»; результат передан в служебный PR для coordinator reconciliation. Review завершён во всём scope; STOP.


## PR #249 — bounded unpersisted LOC-05 correction complete / STOP (2026-10-29)

Автор: Лёва — Codex-6.1 Sol. [Назначение #6483820011](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6483820011), после author verification6480789597.
Существующие PR #249 / branch fix/l8-localization-runtime; новая ветка/PR не создавались.
Previous head0c7bc53b7cfae56bd6b80bb0cc074c82c4a9de14 → **stable exact head ae501c80fb20ce3108e5da2136f9cbfc1d402c61**.
Base/main ebdb482e8bb37cf18d7085beb2926930139b00d6. Merge не выполнялся.

### Причина и изменение

Author verification установила полный current path: service.plan(A) материализует jobs без task/head writes; serviceB.planAndDispatch создаёт B1/current; задержанный dispatcher(A) omitted/false попадал в absent-row branch и делал A2/current, лишая B conditional publication right. Поздний consumer policyB отклонял A, но не возвращал B currentness.

Коррекция закрывает именно absence branch и согласует explicit authorization:
- **Любая новая UI identity требует options.freshPlanning===true.**
- Без разрешения выбрасывается **UiTranslationFreshPlanningRequiredError**. Это typed planning precondition, не SQL availability/corruption и не provider retry.
- Исключение внутри той же transaction откатывает и tentative первый head: не остаётся durable task/head mutation, dispatcher не enqueue-ит отсутствующую task.
- Known identity по-прежнему поддерживает transport replay без fresh permission. Прежняя защита stale/superseded, current processing duplicate и completed/failed terminal сохранена.
- Fresh UiTranslationService.planAndDispatch уже передавал true; новый eligible identity и A→B→A работают через прежние locks/monotonic ordering. Return type upsertPending не менялся; для неавторизованного создания Promise отклоняется, это явно документировано.
- Existing-row guard также сравнивает permission строго с true; новый provider/config/schema/retry mechanism не вводился.

Это одна correction LOC-05, **10 files +125/−58**:
production — typed error/API comment и store guard; PROJECT_STATE/JOB-03 отражают факт;
6 native test files содержат51 явную fresh annotation genuine creation calls плюс2 dispatcher setup calls. Existing duplicate/replay negative assertions не превращались в fresh; test contracts не ослаблялись. Остальная механика publication/policy/content stores не переписывалась.

### Regressions / causal controls

В L8 native suite добавлены4 parameterized scenarios:
1–2. Actual service.plan(A) даёт canonical heading/A при0tasks/0heads. Actual serviceB.planAndDispatch создаёт B. Delayed dispatcher(A), отдельно omitted иfalse, теперь отклонён typed error.
Проверено: A row отсутствует, полная head row неизменна (включая timestamps), claim B неизменен/current, queue messages count не увеличился; actual PG publication B успешно возвращает true.
После этого actual fresh serviceA.planAndDispatch создаёт A2/pending, показывая сохранение права нового eligible planning.
3–4. Те же omitted/false при пустом unit: task count0 и head count0 после rejection, tentative head rolled back.

RED на прежнем source: **4 failed /13 skipped**, поскольку операции неожиданно resolved/создавали задачи.
GREEN focused: **42 tests /3 files PASS**; после усиления assertions до typed error они включены в full native suite.
Existing fresh A–B–A→3, stale/superseded replay, current duplicate claim, completed terminal и old publication fencing controls сохраняются и проходят.

### Verification

- Full local PostgreSQL17: **345 tests /31 files PASS**,85.37s.
- Local lint:0errors/один прежний app/forum/ui.test.tsx174 warning; typecheck,diff-check PASS.
- **[Exact-head CI #40791016237](https://github.com/iliya1947/vico-forum/actions/runs/40791016237): SUCCESS.** Прочитаны completed logs checks123175960536 и database123175960836: **1265 application tests /103 files**, **345 PostgreSQL17 /31 files**; lint/typecheck/app+UI-preview builds/history/metadata/schema/runtime probes/Workers smoke PASS. Все steps обеих jobs success. Checkout test merge7e62fca3 из exact head ae501c8 +baseebdb482.
- Full app/build/Workers локально не повторялись: выполнены exact-head CI. Дополнительный Chromium не запускался: correction только server-side task planning guard; owner visual не выполнялась.
- Disposable local PG/schema/container/volume удалены, dependency symlink снят; checkout clean. Artifacts /workspace/work/l8-unpersisted-correction/ (red.log,focused.log,database.log,lint.log,typecheck.log,fixture update script).
- LOC-09 остаётся future-only, PR247 и external/provider/Queue activation/production не затрагивались.

Это **author implementation handoff**, не independent whole-PR self-review. Старые reviews относятся к0c7bc53.

**Мире:** coordinator whole-PR review PR #249 на ae501c8, затем non-author independent reviewers того же head. **Лёва STOP.**

## PR #247 — independent application E2E verification of matching fence: CONFIRMED / STOP (2026-10-29)

Выполнено [назначение #6482419654](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6482419654).
Unchanged exact head **7c6bd4e8f3391e1189f130e40903184d7e484a7d**, base/main ebdb482e8bb37cf18d7085beb2926930139b00d6; remote повторно совпал.
Только третий residual LITERAL-TEXT-01; первые два не перепроверялись, новый whole-PR review не проводился.

**CONFIRMED: current-Stage P2 subcase. Matching fence из clipboard преждевременно закрывает existing code и меняет публичную структуру. Application path это не нейтрализует.**

### Полный настоящий application path

Это не component-only harness:
- неизменный Vico Worker/React Router dev runtime на127.0.0.1:4216;
- disposable local PostgreSQL17 с actual migrations всех текущих файлов;
- синтетические category/section и аккаунт, созданный настоящим /api/auth/sign-up/email; никаких mock session/route/repository;
- Chromium открывает actual /en/sections/fence-e2e-section, заполняет штатный topic form, переключает общий MarkdownEditor в Advanced;
- настоящий navigator.clipboard, More tools → Paste without formatting;
- сравнение hidden body и new FormData(form) с resulting source;
- настоящий Create topic → POST section action → server repository/transaction → redirect на /en/topics/{id};
- actual публичный ForumMarkdown на topic page, затем независимый прямой SQL read saved current post revision.

Во всех пяти окончательных сценариях actual DB original_content **побайтово совпал с editor/FormData source**. На каждую форму зафиксирован один фактический POST; URL созданной локальной темы и payload сохранены в artifacts. Поэтому source/CommonMark гипотеза подтверждена до сохранённой публикации, не только parse helper.

### Минимальный repro и результат

Initial Advanced body: outer triple-backtick text fence, внутри строки Before / Alpha / After; после outer closing fence отдельный prose paragraph Outside.
Выделяется только Alpha.
Clipboard payload: standalone triple-backticks, строка **Payload formatted**, standalone triple-backticks.

Команда raw-вставляет payload в существующий code. Actual saved source:
````text
```text
Before
```
**Payload formatted**
```
After
```

Outside
````

В public DOM появляются **два code blocks**, а Payload formatted рендерится **strong между ними**, хотя это был literal clipboard text, вставленный внутрь code. After оказывается в новом code block. Исходный code envelope не сохраняется.

### Проверенные variants / controls

1. outer3 backticks / candidate3 backticks: reproduced,2code blocks,strong1; Outside остаётся prose.
2. outer3 backticks / candidate4 backticks: reproduced,2code blocks,strong1; дополнительно **невыделенный Outside попадает внутрь нового code**, поскольку старый closing3 не закрывает новый fence4.
3. outer4 backticks / candidate3: passing control,1code block,strong0, code.textContent точно Before + payload + After; Outside остаётся prose.
4. outer3 tildes / candidate3 backticks: passing control,1code block,strong0, exact literal code text и Outside prose.
5. outer3 tildes / candidate3 tildes: reproduced,2code blocks,strong1.

Все5 — реальные локальные публикации и independent SQL persistence checks. Первоначальная отдельная same-fence probe также воспроизвела симптом. Это не утверждение о зелёном поведении всех5:3reproductions,2passing controls.

### Причинная цепочка / классификация

markdown-editor.tsx625–628 видит selection внутри editableCodeRanges и вызывает raw replaceSourceRange(selection,text). Fence opener/closer при этом не адаптируется к standalone closing candidate в payload. Existing keyboard-range helper корректно определяет выбранный body; проблема здесь не в missing range, а в изменении delimiter semantics после raw insertion.
Ни submit validation, ни repository/immutable revision write, ни публичный renderer не вводят neutralizing protection; actual saved body совпадает с raw insertion, а renderer штатно применяет CommonMark matching-fence semantics.
Текущая команда, code context и сохранение literal clipboard/code content уже входят в docs/EDITOR.md §10. Принимая запрошенный контракт plain-command сохранения existing code/невыделенного content, это current LITERAL-TEXT-01, не future rollout. Обычное intentional Advanced source editing и эта целевая команда — разные проверяемые действия.

### Artifacts / operational limits

/workspace/work/pr247-fence-e2e/:
- seed.mts/seed.log — actual migrations и synthetic section;
- inspect_forum_ui.py/inspect.log — local auth/UI readiness, без session token в отчёте;
- verify_fence.py,verify_remaining.py,browser.log,remaining.log,browser-results.json — реальные UI commands/submissions/public DOM;
- verify_persistence.mts,persistence.json,persistence.log — exact source persisted и current DOM classification по каждой теме;
- debug_command.py/debug-command.log — повторный same-fence actual submission.

Первый automation wait на expected source истёк до submit, отдельный слишком быстрый consecutive-submit run остановился на ожидании redirect. Это не объявлялось product defects. В окончательных runs проверена готовность editor source и соблюдена штатная5-second write cooldown; все5 окончательных publications и SQL checks завершились.
Full app/CI/browser matrix не повторялись: targeted unchanged-head verification только этого residual.
External/provider/production/owner visual acceptance не выполнялись. Hyperdrive connection overrides направляли обе local bindings только на disposable local PG; Google config была dummy и OAuth не вызывался.
Implementation не менялась. Временные .dev.vars, dependency symlink и synthetic auth state удалены; own Vite/Workerd процессы и PG container/volume остановлены/удалены. Checkout clean.

**Мире:** actual application E2E подтверждение третьего subcase готово; учесть в reconciliation/correction scope PR #247. Implementation correction не выполнялась. **Лёва STOP.**

## PR #247 — independent whole-PR review / REQUEST CHANGES / STOP (2026-10-28)

Дата: 2026-10-28. Назначение: PR236 comment6481023543.
Exact head: 7c6bd4e8f3391e1189f130e40903184d7e484a7d.
Base/current main: ebdb482e8bb37cf18d7085beb2926930139b00d6.

### Verdict: REQUEST CHANGES

Проверен весь scope EDITOR-10, LITERAL-TEXT-01, LOC-03, LOC-06. Рассмотрены все 15 changed files относительно main, включая 7 production files, тесты и PROJECT_STATE; отдельно прослежены parser/source selection/paste/public rendering и translation validation/planning call chains. Выводы координатора/других reviewers на этом head не использовались.

**Два подтверждённых current-Stage P2 subcase одной family LITERAL-TEXT-01:** команда Paste without formatting в Advanced всё ещё применяет prose escaping внутри inline code и внутри spoiler-local indented code. Это residual определения code context, не отсутствие исправления прежних root fenced/spoiler-closer/tabbed-table cases. Новых future-only findings не установлено.

### 1. P2 — inline code не входит в code-context guard plain command

Relevant code: app/forum/markdown-editor.tsx:625–628; app/forum/editor-document.ts:344–360.

Initial Advanced source: `Alpha` (одинарные backticks вокруг Alpha).
Выделить только Alpha, настоящий clipboard payload: ~~literal~~ &copy; | value |.
More tools → Paste without formatting.

Actual FormData/source: `\~\~literal\~\~ &amp;copy; \| value \|` (backticks по-прежнему окружают весь inline code).
Actual public p code.textContent: \~\~literal\~\~ &amp;copy; \| value \|.
Expected code.textContent: ~~literal~~ &copy; | value |.

Source/content меняется из-за добавленных escapes; wrapper и destination не являются причиной. Тот же initial/payload обычным Ctrl+Shift+V в Advanced textarea сохраняет raw source и точный code text. Undo/Redo точно восстанавливает обе версии source.

Причина: новый inCode guard использует editableCodeRanges, который выбирает только node.type=code и не возвращает inlineCode. Для inline source ranges=[]; команда уходит в clipboardPlainToMarkdown, предназначенный для prose, и escapes не декодируются внутри inline code.

Это существующая доступная Advanced plain command и поддержанный inline-code контекст. docs/EDITOR.md §10 требует plain text/source сохранение; дополнительной будущей capability или rollout не требуется. Current-Stage LITERAL-TEXT-01.

### 2. P2 — indented code внутри Vico spoiler не виден whole-document code ranges

Initial valid Advanced source (TAB — настоящий U+0009):

```text
:::spoiler Outer
<TAB>Alpha
:::
```

Public renderer уже до вставки показывает Alpha как code внутри Outer: spoiler body разбирается независимо. Выделить только Alpha в Advanced textarea, тот же clipboard payload, More tools → Paste without formatting.

Actual source:

```text
:::spoiler Outer
<TAB>\~\~literal\~\~ &amp;copy; \| value \|
:::
```

Actual details pre code.textContent содержит \~\~literal\~\~ &amp;copy; \| value \| вместо точного payload. Тот же Ctrl+Shift+V в Advanced сохраняет исходный текст code. Root indented code и root fenced code с этой командой проходят — дефект требует renderer-local code context.

Причина: editableCodeRanges разбирает весь source через parseForumMarkdown, не используя Vico spoiler segmentation. Generic root parser видит :::spoiler как paragraph, а indented Alpha — его continuation; ranges=[] и guard ошибочно считает selection prose. Actual parseRenderedForumMarkdown/Public ForumMarkdown видит code в отдельно разобранном body. Explicit context diagnostic подтвердил эту разницу; это не неизвестный/неподдерживаемый синтаксис.

Это дополнительная конкретная причинная граница в той же family: inlineCode отсутствует в type selection, а spoiler-local code отсутствует из-за несовпадения parser contexts. Не предлагается менять всю keyboard-helper семантику: review только фиксирует установленный trigger/result.

### Browser evidence и controls

Actual Chromium headless, настоящий navigator.clipboard.writeText/readText, выбор диапазона textarea, настоящие More tools/Paste without formatting, hidden body → FormData при локальном submit → тот же ForumMarkdown. Сравнивался textContent самого p code или pre code, не HTML-encoded строка и не toolbar text.

- advanced-context-command.py/.json/.log: 9 cases — root fenced sensitive command, ordinary command, native paste, inline command/native control, root indented command, spoiler-indented command/native control, prose command. 2 command contexts воспроизводят residual; остальные отделяют правильный clipboard/selection/public rendering path. Undo/Redo asserted во всех 9.
- code-contexts.ts/.json/.log: actual editableCodeRanges=[] для inline и spoiler-indented, nonempty для root-indented/root-fenced. Сохранены generic и rendered AST для сопоставления.
- custom-paste.py/.json/.log: 8 root payload observations. Прежние literal spoiler/table/ltr+rtl direction и tab-indented table-shaped cases теперь нейтрализованы/выводятся без лишних escapes.
- nested-paste.py/.json/.log: 3 cases, literal full spoiler и closer-only сохраняют After внутри Outer; ordinary control также сохраняется. Прежний spoiler-closer defect не воспроизводится.
- Прежние 25 browser regression controls повторены: 4 native space-tab/focus/history, 3 root/spoiler raw-code paste, 6 prose/heading/list/spoiler paste, 12 mentions Simple/Advanced. Все asserted controls PASS. Дополнительные 20 custom/nested/Advanced observations включают 2 описанных failure; весь browser run НЕ PASS.

### Остальной scope

- EDITOR-10: полный production diff и call sites проверены повторно; immutable profile ID/recipient сохранён. AST matrix 255 code points 1..255 без mismatches; browser 12 complex/control/Unicode names PASS.
- LITERAL-TEXT-01: shared native/clipboard/table code, HTML/TSV fallback, source selection и affected technical segmentation проверены, не только последний commit. Generic 96 ampersand/tilde context checks и 28 native-indentation paragraph controls PASS. Они имеют ограниченный охват и не доказывают корректность всех custom grammars.
- LOC-03: полный scanner/token validation и compiler/publication/runtime path перепроверен. 9 injected nesting variants rejected, 8 unchanged controls accepted, 3 malformed inputs 75/1035/9011 chars rejected за bounded time (max 0.47 ms). Новых подтверждённых current-Stage defects нет.
- LOC-06: authoritative revision/no-text guard до source resolver и route permission/runtime/currentness boundaries перепроверены. 14 capability→real planner cases: 12 no-text без detector/upsert/enqueue и 2 ordinary prose queued PASS. Новых подтверждённых current-Stage defects нет.

### Checks и ограничения

- Full local application: **1368 tests /102 files PASS**, 150.27s.
- Exact-head [CI #40765793732](https://github.com/iliya1947/vico-forum/actions/runs/40765793732) SUCCESS. Completed logs checks123089469826/database123089470313 прочитаны: 1368 app /102 files, 326 PostgreSQL17 /30 files; lint 0 errors/один прежний warning,typecheck,application/UI builds,metadata/schema/runtime probes/Workers smoke PASS. Все job steps success. Checkout test merge 8dc5da20 из 7c6bd4e8 +base ebdb482.
- Native PG/build/Workerd отдельно локально не повторялись; это completed exact-head CI evidence. Provider/external/production и owner visual acceptance не выполнялись.
- Implementation не менялась. Артефакты только /workspace/work/pr247-review-7c6bd4e8/. Repo checkout clean, dependency symlink снят, Chromium/own HTTP stopped.
- Разработчик разрешил публикацию командой «Публикуй»; результат передан в служебный PR для coordinator reconciliation. Whole-PR review завершён, первый finding не остановил проверку. STOP.


## PR #249 — author verification: unpersisted UI replay LOC-05 CONFIRMED / STOP (2026-10-28)

Выполнено [назначение #6478119245](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6478119245).
Предыдущее correction assignment6477922024 снято сообщением6478118423; implementation не изменялась.
Проверенный unchanged exact head **0c7bc53b7cfae56bd6b80bb0cc074c82c4a9de14**, base/main ebdb482e8bb37cf18d7085beb2926930139b00d6. Remote повторно совпал перед публикацией.

**CONFIRMED: current-Stage P2 residual LOC-05.** Это author verification согласованного finding, не whole-PR self-review.

### Полная фактическая цепочка

1. **Материализация без persistence реальна.** Выполнен настоящий UiTranslationService(policy-a).plan({targetLocale:fr,namespaces:[common]}) с actual DrizzleUiTranslationStore, пустым валидным LocalTranslationSource и зарегистрированным active fr в InMemoryLocaleRegistry. Возвращены 533 jobs, включая canonical heading/A с валидным source fingerprint/identity. Прямой SQL после plan: tasks=0,heads=0. Никаких поддельных specs, ручного INSERT task/head или mocked task store.
2. **Delayed split dispatch допускается существующим API.** Public PersistentTranslationJobDispatcher.dispatch принимает ранее возвращённый heading/A без options и с freshPlanning:false. Первый вариант проверен отдельно от второго. Сам план не dispatch-ит и не сохраняет jobs. Обычный UiTranslationService.planAndDispatch всегда передаёт true — этот shortcut корректен; bug относится к отдельному реализованному public plan/dispatch/replay boundary.
3. **B создаётся настоящим fresh path.** Между plan(A) и dispatch(A) вызван настоящий UiTranslationService(policy-b).planAndDispatch. B/heading persisted generation1 и current; claim B успешно получен. Preflight с depsB до replay не находит stale reason.
4. **New-identity branch не требует authorization.** При delayed dispatch(A) существующей A row нет. Guard у existingRows не выполняется; new identity получает generation2, durable heading head меняется1→2. A становится current, а B claim получает generation-superseded.
5. **Последствие подтверждено actual publisher.** DrizzleUiTranslationPublicationStore.publishClaimedMachineResult(B) после replay возвращает false. Independent no-replay control того же свежего B успешно публикует Fondation B в ui_translations. Поэтому отказ не объясняется неизвестным key, неверным fingerprint, payload validation или сломанным publication harness.
6. **Consumer policy guard не нейтрализует mutation.** Настоящий UiTranslationTaskConsumer с current depsB принимает ID A и возвращает stale/policy-changed. A помечается stale, но durable head остаётся2, B по-прежнему non-current. Guard защищает от выполнения неправильной A policy, но не возвращает B publication right.

### Native PostgreSQL17 observations

- omitted options: A plan оставляет0tasks/0heads; B1/current → delayed A2/current; B publication=false; consumerA policy-changed; head2 и B non-current сохраняются.
- explicit freshPlanning:false: тот же результат.
- fresh-control: новое действительное serviceA.planAndDispatch после B законно создаёт A2/current. Это разрешённая fresh ordering decision, не доказательство исправления негативных случаев.
- no-replay-control: B1/current, actual publication=true, persisted heading=Fondation B.

Все четыре diagnostic scenarios завершены успешно; первые два **подтверждают дефект**, а не зелёное поведение implementation. Migrations применены в отдельной local schema на disposable PG17; schema удалена в finally, container/volume удалены. Provider/Queue adapter реальный внешний не использовался: FakeTranslationTaskEnqueuer записывает ID; planning/store/consumer/publication настоящие.

### Current-Stage vs live rollout

JOB-03 прямо различает новое eligible planning decision и replay ранее полученного job-list; последнее не имеет права само передвигать head. Ошибка доступна в уже реализованных public in-process API этой foundation, без нового provider, scheduler, external rollout или schema.
При этом поиск callsites не установил работающий HTTP/production scheduler, автоматически выполняющий именно такой delayed split replay: стандартный planAndDispatch всегда ставит true. **Production incident/автоматический live trigger не заявляется.** Это ограничение наблюдаемости не превращает нарушение явного текущего public API contract в future-only.
Дополнительное fresh planning B впоследствии может создать новую B occurrence и восстановить её ordering; это новое решение, а не текущий guard, который нейтрализует уже совершённое нарушение.

### Causal locations / boundary

- app/localization/ui-translation-service.ts:88 — public plan возвращает jobs без durable writes;125 — shortcut передаёт true.
- app/localization/translation-tasks.ts:216–219 — dispatcher принимает omitted/false и передаёт их store.
- db/translation-task-store.ts:459–468 — fresh authorization только внутри existing-row branch.
- db/translation-task-store.ts:500–523 — absent-row branch создаёт generation/current head без fresh guard.
- publication head check и consumer policy check выполняются после этой durable mutation и не исправляют её.

Artifacts: /workspace/work/l8-unpersisted-verification/probe.mts,probe.log,results.json,control.mts,control.log,control-results.json.
Code/project docs/test files не изменены; commit/push/новой ветки не было. Checkout clean, dependency symlink снят.
Full app/CI/build/browser не повторялись: unchanged implementation, bounded native chain проверена непосредственно.
Это не самостоятельное разрешение correction: предыдущее назначение снято, действующее требует verification и STOP.

**Мире:** принять author confirmation и отдельно определить следующий correction assignment. **Лёва STOP.**

## PR #247 — targeted reconciliation: Advanced plain command in fenced code CONFIRMED / STOP (2026-10-28)

Выполнено [назначение #6477884660](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6477884660) на unchanged exact head `4cc3122b3323bc9fb90467a076a6e34e9cc1bdc1`, base `ebdb482e8bb37cf18d7085beb2926930139b00d6`.
Это targeted author-independent verification coordinator hypothesis, не новый whole-PR review.

**CONFIRMED: current-Stage P2 subcase той же family LITERAL-TEXT-01.**

### Actual Chromium command chain

Advanced source `\x60\x60\x60text\nAlpha\n\x60\x60\x60` (три настоящих backticks, обычный fenced code).
Выделить только Alpha в textarea. Clipboard payload: `~~literal~~ &copy; | value |`.
Открыть More tools и нажать настоящую кнопку **Paste without formatting**. navigator.clipboard.readText читает настоящий clipboard, не mock API.
Hidden body/FormData через локальный submit даёт:
````text
```text
\~\~literal\~\~ &amp;copy; \| value \|
```
````
Actual public `pre code.textContent` равен `\~\~literal\~\~ &amp;copy; \| value \|`, то есть содержит лишние backslashes и изменённый ampersand. Это не HTML serialization вроде &amp;amp; и не toolbar text: сравнивается textContent самого code.

Controls в том же Chromium:
1. Та же команда с ordinary control внутри того же fence → точный code text.
2. Тот же sensitive payload через обычный **Ctrl+Shift+V** Advanced textarea → raw source и точный code text `~~literal~~ &copy; | value |`.
3. Та же команда вне code, в обычном prose → escaped source, но точный visible literal text без formatting.
4. Undo/Redo во всех четырёх случаях точно восстанавливает initial и вставленный source.

### Причина

`markdown-editor.tsx:625` в plain command безусловно вызывает prose-oriented clipboardPlainToMarkdown, даже когда selected content находится внутри существующего fenced code.
`clipboard-markdown.ts:143–144` вычисляет escaped initial и немедленно возвращает его для payload без leading tab; passed document context для этого payload не анализируется. Обычный Advanced native paste использует другой source path, сохраняющий raw input.
Escapes, необходимые в prose, внутри code становятся буквальными данными. Ошибка не в clipboard/read permissions, selection, React decoding, public renderer или Undo/Redo: passing controls отделяют эти причины.

Current docs/EDITOR.md §10 уже требует plain text без форматирования и сохранения содержимого кода. Это доступная текущая команда, не provider/future-only concern. Существующие два согласованных subcases не заменяются этим — это дополнительный подтверждённый context внутри той же family; окончательную correction grouping выполняет Мира.

Artifacts: /workspace/work/pr247-review-4cc3122b/advanced-plain-command.py, .json, .log.
Первый harness attempt выбрал несуществующий textarea[name=body] (body хранится в hidden input); поправлен только внешний selector, окончательные четыре browser observations завершены. Implementation не менялась, checkout clean, Chromium/own HTTP stopped.
Full app/CI не повторялись: unchanged source, bounded command path проверен напрямую. External/provider/production/owner visual не выполнялись.

**Мире:** включить подтверждённый subcase в reconciliation LITERAL-TEXT-01 PR #247. **Лёва STOP.**

## PR #247 — independent whole-PR re-review / REQUEST CHANGES / STOP (2026-10-28)

Дата: 2026-10-28. Назначение: PR236 comment6477338488.
Exact head: 4cc3122b3323bc9fb90467a076a6e34e9cc1bdc1.
Base/main: ebdb482e8bb37cf18d7085beb2926930139b00d6.

### Verdict: REQUEST CHANGES

Проверен весь заявленный scope EDITOR-10, LITERAL-TEXT-01, LOC-03, LOC-06, все 14 changed files и вызывающие UI/runtime/action boundaries. Подтверждены **два current-Stage P2 subcase одной family LITERAL-TEXT-01**, с разными причинными границами ниже. Новые future-only findings не установлены. Три исходных root payload из предыдущей reconciliation теперь исправлены; это не закрывает новые подтверждённые контексты.

### P2 / LITERAL-TEXT-01 / spoiler closer остаётся активным при буквальной вставке

Relevant code: app/forum/clipboard-markdown.ts:27 (экранирует opener, не closer), technical-markdown.ts:151–166 (штатно выбирает raw ::: как ближайший closer).

Initial valid Simple source:

```text
:::spoiler Outer
Alpha

After
:::
```

Выделить только Alpha внутри существующего спойлера и выполнить настоящий Ctrl+Shift+V с payload:

```text
:::spoiler Label
Alpha
:::
```

Actual FormData/source:

```text
:::spoiler Outer
\:::spoiler Label
Alpha
:::

After
:::
```

Public renderer закрывает Outer на вставленном closer. Его body содержит только literal opener и Alpha; After становится root paragraph вне спойлера, а старый завершающий ::: появляется буквальным текстом после After. Вставленный closer исчезает из literal text. Это меняет структуру ранее существовавшего сообщения за пределами выделения.

Минимальный payload `:::` даёт тот же результат: Outer получает пустое body, After выходит наружу. Control `ordinary control` сохраняет After внутри Outer. Diagnostic source с инертным `\:::` также сохраняет literal marker и After внутри; это проверка renderer behavior, не правка implementation. Undo/Redo в настоящем браузере проходит и восстанавливает ошибочный source точно, поэтому history и clipboard не являются причиной.

Expected: literal pasted text остаётся видимым, не завершает существующий spoiler и не перемещает невыделенный After. Контракт docs/EDITOR.md §2/§10 уже действует; не future-only.

Artifacts: nested-paste.py/.json/.log; causal-controls.tsx/.json/.log.

### P2 / LITERAL-TEXT-01 / table-shaped tab input показывает лишние escapes

Relevant code: app/forum/clipboard-markdown.ts:15,25,142–192. Initial candidate используется для code/prose classification до финального escaping, которое само меняет его technical segmentation.

Initial Simple source Alpha, выделить весь leaf; Ctrl+Shift+V:

```text
<TAB>| A | B |
<TAB>| --- | --- |
<TAB>| 1 | 2 |
```

Actual FormData содержит (TAB настоящий U+0009):

```text
<TAB>\| A \| B \|
<TAB>\| --- \| --- \|
<TAB>\| 1 \| 2 \|
```

Public renderer создаёт indented code с **буквальными лишними обратными слэшами** перед каждым pipe. Это проверено по actual pre/code.textContent, не toolbar text и не отображаемому source field. Variant с одним space перед TAB воспроизводит то же.

Причина прослежена отдельно: textAsMarkdown без codeLines сначала возвращает raw tab lines. Vico segmenter видит initial candidate как vicoTable (splitCells trim-ит indent); collectRendered разбирает cells без raw leading tabs, поэтому codeLines пуст. Финальный textAsMarkdown экранирует pipes. Table grammar перестаёт совпадать, и та же строка теперь разбирается как CommonMark code: в code escape sequences не декодируются. Pure actual AST diagnostic подтверждает vicoTable→code classification flip.

Control одно tab-indented `| A | B |` без separator остаётся raw code и выводит pipes без лишних слэшей. Обычная root table-shaped вставка без tabs теперь корректно остаётся literal prose. Вариант с четырьмя spaces нейтрализуется structural entity и не создаёт table. Поэтому issue не сводится к любому pipe или ко всякому code; это подтверждённое взаимодействие custom table classification и финального escaping. Expected: буквальные pipe characters не получают пользовательских лишних слэшей; intentional code и plain-text contract сохраняют содержимое. Current-Stage, без внешних предпосылок.

Artifacts: custom-paste.py/.json/.log (table-tab и table-space-tab), causal-controls.tsx/.json/.log.

### Остальной scope и checks

- EDITOR-10: production diff и literal-name/immutable recipient paths перепроверены. AST matrix 255 code points 1..255 без mismatches; Chromium autocomplete Simple/Advanced для 6 names (12 cases) PASS.
- LITERAL-TEXT-01: original root literal spoiler/table/ltr+rtl direction теперь сохраняют буквальный text и не создают структуру/dir override. Прежние 4 space-tab native-input, 3 raw-code root/spoiler paste и 6 prose/heading/list/spoiler paste scenarios проходят с FormData/public renderer/UndoRedo. Вместе с mentions это 25 прежних browser controls PASS. Дополнительно 8 custom payload observations и 3 nested-spoiler observations; среди них 4 failed executions двух описанных subcases, поэтому весь browser run НЕ PASS.
- Generic context matrix 96 ampersand/tilde literal-payload checks PASS; native indentation matrix 28 paragraph controls PASS. Эти matrices не используются как доказательство полноты custom-grammar preservation.
- LOC-03: полная validator/publication/runtime цепочка проверена заново; 9 injected nesting variants отвергнуты, 8 unchanged controls приняты; 3 malformed inputs 75/1035/9011chars fail-closed за bounded time (max 1.24 ms в этом run). Нового current producer неподдерживаемой grammar не найдено; future-only finding из этого не создаётся.
- LOC-06: authoritative revision/no-text guard и route permission/runtime/currentness boundaries перепроверены; 14 независимых capability→real planner cases PASS: 12 no-text без detector/upsert/enqueue, 2 prose controls queued. Caller text не заменяет authoritative revision.
- Full local app: **1358 tests /102 files PASS**,164.83s.
- [Exact-head CI #40743626291](https://github.com/iliya1947/vico-forum/actions/runs/40743626291): SUCCESS. Прочитаны completed logs checks123011494370 и database123011495039: 1358 app /102 files, 326 PostgreSQL17 /30 files; lint 0 errors/один прежний warning,typecheck,application/UI builds,metadata/schema/runtime probes/Workers smoke PASS. Все steps success. Checkout test merge 63b4af7c из 4cc3122b +ebdb482.
- Native PG/build/Workerd отдельно локально не повторялись, использованы exact-head CI logs. Production/provider/external/owner visual не выполнялись.

Implementation не менялась. Все scripts/artifacts находятся вне repo в /workspace/work/pr247-review-4cc3122b/. Выводы координатора/других reviewers для данного head не читались. Разработчик дал команду «Публикуй»: результат опубликован в личном отчёте и служебном PR для coordinator reconciliation. Implementation не менялась. STOP.


## PR #249 — LOC-05 bounded correction complete / STOP (2026-10-28)

Автор: Лёва — Codex-6.1 Sol. [Назначение #6476626714](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6476626714), coordinator reconciliation6476625161, finding Лиры6476514032.
Существующий PR #249 / ветка fix/l8-localization-runtime. Новая ветка/PR не создавались.
Previous head c4e32d3014ee8e1391f9d0776384647fa1229361 → **stable exact head 0c7bc53b7cfae56bd6b80bb0cc074c82c4a9de14**.
Base/current main ebdb482e8bb37cf18d7085beb2926930139b00d6.

### Подтверждённая причина

На настоящем disposable PostgreSQL17 добавлены два dispatcher→store negative scenarios: stale A всё ещё generation1/current либо stale A generation1 superseded by processing B generation2. Дважды вызывается PersistentTranslationJobDispatcher.dispatch([A]) — без options и с freshPlanning:false.
До correction оба сценария падают: task A меняется stale→pending; superseded A получает generation3. Старый guard исключал stale из необходимости fresh authorization. Это current LOC-05, не новая family.

### Минимальная correction

Изменён один guard condition в db/translation-task-store.ts:
- отсутствие freshPlanning сразу возвращает existing task независимо от stale/pending/processing status;
- completed/failed identities сохраняют terminal semantics даже с fresh authorization;
- non-stale current duplicate сохраняет claim/lease/attempt;
- fresh stale или superseded pending/processing проходят существующий locked reactivation path.

Head lock, task lock, generation advancement и conditional UPDATE прежние. First-seen identity и enqueue transport contract не менялись; Queue по-прежнему передаёт только ID. Stale replay может повторно enqueue ID, но durable task остаётся terminal, claim возвращает terminal, head и current B не меняются. Это не активация внешней Queue.

Correction scope: **6 files +53/−8**, из них production изменение только guard/comment. Два прежних stale-reactivation positive tests явно используют freshPlanning:true, поскольку они моделируют новое planning decision. Новые negative tests сравнивают полную task и полную head row (включая timestamps) до/после обоих видов replay, проверяют current B claim, terminal claim A, permitted fresh reactivation и old-token publication rejection.
Сохранены/усилены positive A–B–A→3, duplicate current processing claim при true, completed terminal при true и false/default.
PROJECT_STATE и JOB-03 wording уточнены: stale тоже требует fresh permission.

### Verification

- RED на original c4e32d3 production: 2 failed /4 skipped, именно unexpected stale→pending/generation mutation.
- GREEN focused: **38 tests /3 files PASS** (generation isolation, task store, all L8 native corrections).
- Full local native PostgreSQL17: **341 tests /31 files PASS**,72.69s.
- Local lint:0errors/один прежний warning app/forum/ui.test.tsx174. Typecheck PASS. git diff --check PASS.
- **[Exact-head CI #40741659301](https://github.com/iliya1947/vico-forum/actions/runs/40741659301): SUCCESS.** Прочитаны completed logs checks123004562070 и database123004562645: **1265 app tests /103 files**, **341 PostgreSQL17 /31 files**; lint/typecheck/app+UI-preview builds/history/metadata/schema/runtime probes/Workers smoke PASS. Все шаги обеих jobs success. CI checkout test merge fb16133b: head0c7bc53 +baseebdb482.
- Full application/build/Workers smoke локально повторно не запускались: они выполнены exact-head CI. Chromium повторно не запускался: correction меняет только durable server guard и DB tests. Whole-PR self-review и owner visual не выполнялись.
- Disposable local PG container/volume удалены, dependency symlink снят; checkout clean. Production/real provider/Queue/external state не затрагивались.
- Artifacts: /workspace/work/l8-loc05-correction/ (red.log,focused-green.log,database.log,lint.log,typecheck.log).

LOC-09 scope не расширялся, PR247 не менялся. Остальные L8 mechanisms не переписывались. Старые independent reviews относятся к c4e32d3.

**Мире:** coordinator whole-PR review PR #249 на 0c7bc53, затем non-author independent reviewers того же head. Автор correction independent verdict не выдаёт. **Лёва STOP.**

## PR #247 — reconciliation: LITERAL-TEXT-01 custom-syntax residual CONFIRMED / previous PASS withdrawn / STOP (2026-10-28)

Проверено [назначение Миры #6475748706](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6475748706) на неизменном exact head `915643fd5fd94031d5a4ba9397276f187aa28075`, base `ebdb482e8bb37cf18d7085beb2926930139b00d6`.

**Подтверждаю current-Stage P2 defect одной family LITERAL-TEXT-01 с тремя subcases. Прежний общий PASS из #6475636980 отзываю.** Два ранее исправленных tab subcase остаются закрытыми; результаты EDITOR-10/LOC-03/LOC-06 эта проверка не опровергает.

### Actual browser chain

Тот же bundled exact-head MarkdownEditor/ForumMarkdown в локальном Chromium. Для каждого payload: Simple editor с Alpha → выделение всего leaf → настоящий navigator.clipboard.writeText(payload) → Control+Shift+V → hidden body/FormData → локальный submit → actual public ForumMarkdown. Это component/public-render harness, не удалённая публикация и не provider pipeline.

| Literal payload | Сохранённый source | Public result |
| --- | --- | --- |
| `:::spoiler Label\nAlpha\n:::` | побайтово равен payload | один details/summary, visible text LabelAlpha; authored markers скрыты |
| `\| A \| B \|\n\| --- \| --- \|\n\| 1 \| 2 \|` | побайтово равен payload | одна Vico table, visible text AB12 вместо literal table-shaped source |
| `Text {:vico-dir=rtl}` | побайтово равен payload | p dir=rtl и computed CSS direction=rtl; visible text Text, literal marker скрыт |

Control `~~literal~~ &copy;` превращается в escaped source и показывает точный literal text без del. Все четыре случая сохраняют ожидаемый source в FormData; Undo/Redo восстанавливает начальный и повторный source. Поэтому причина не в clipboard permissions, потере буфера, HTML paste или history.

### Причина и классификация

`app/forum/clipboard-markdown.ts:7–25` защищает CommonMark punctuation/entities/line markers, но не neutralizes Vico spoiler/table/direction syntax. Эти payload не содержат raw leading tab, поэтому дополнительный context/code branch вообще не запускается. Затем `segmentTechnicalMarkdown` и paragraph-direction parser распознают неэкранированные custom constructs штатно. Actual Ctrl+Shift+V path передаёт результат этого serializer в источник без последующей literal protection.

Контракт docs/EDITOR.md §10: Ctrl+Shift+V — только текст без форматирования. Здесь literal text скрывается/становится таблицей, spoiler или direction override уже в текущем runtime, без external state. Поэтому **current-Stage residual существующего LITERAL-TEXT-01**, не future-only и не отдельная новая audit family. Предыдущие 96 matrix cases проверяли ampersand/tilde payload внутри contexts, а не literal insertion самих custom grammars; они не обосновывали общий PASS.

Artifacts: /workspace/work/pr247-review-915643fd/reconciliation-custom-paste.py, .json, .log. Все три reproduced плюс passing CommonMark control. Полный suite не повторялся: implementation не менялась; bounded request проверен напрямую в Chromium. Checkout clean, browser и own HTTP stopped.

**Мире:** расхождение подтверждено; назначить bounded correction этой family автору PR #247. Лёва implementation не менял и останавливается. **STOP.**

## PR #247 — independent whole-PR review / PASS / STOP (2026-10-28)

Назначение: PR236 comment6475387518. Дата: 2026-10-28.
Exact head: 915643fd5fd94031d5a4ba9397276f187aa28075.
Base/current main: ebdb482e8bb37cf18d7085beb2926930139b00d6.

### Verdict

PASS в полном заявленном scope: EDITOR-10, LITERAL-TEXT-01, LOC-03, LOC-06.
Новых подтверждённых current-Stage defects не найдено. Отдельных новых future-only findings не установлено. Два current-Stage subcase из предыдущего собственного review на 51e2301d больше не воспроизводятся. Это результат независимой проверки кода/поведения данного head, не author implementation verification и не утверждение об отсутствии любых возможных ошибок форума.

### Проверено

- Все 14 changed files относительно current main: 6 production files, 7 test files, PROJECT_STATE. Прослежены вызывающие UI/runtime/action boundaries. Сопоставлены PROJECT.md, актуальные relevant PROJECT_STATE sections, docs/EDITOR.md, CONTENT_TRANSLATION/UI_TRANSLATION contracts.
- EDITOR-10: numeric escaping ASCII punctuation сохраняет literal authoritative display name, один profile anchor/text child и immutable recipient. Pure AST matrix 255 code points 1..255: 0 mismatches. Actual Chromium autocomplete→FormData→ForumMarkdown: 12 cases (6 names ×Simple/Advanced), punctuation/entities/autolink/nested markup/control/Unicode; 0 failures. NUL не заявлен поддержанным persistent name: PostgreSQL text его не допускает.
- LITERAL-TEXT-01: общая literal escaping boundary, structural prefix и fresh DOM→source selection; parser учитывает тот же spoiler/table segmentation, что renderer. Pure native indentation matrix 28 cases:paragraph preserved. Clipboard/public-render matrix 96 cases проверяет сохранение literal ampersand/tilde payload в root/prose/list/quote/spoiler/table contexts. Это 96 отдельных literal payload checks, не доказательство всех возможных structural properties.
- Chromium: 4 existing space-tab editable paragraphs с реальным keyboard.type(x) сохраняют leaf/focus, text и Undo/Redo. 3 root/spoiler code paste cases сохраняют raw tab/entity/tilde без visible escapes, 6 дополнительных prose/heading/list/spoiler paste cases проходят publication и Undo/Redo. Итого с mentions 25/25 browser cases PASS. Clipboard использует настоящий navigator.clipboard +Control+Shift+V; внешний provider не нужен.
- LOC-03: scanner quote/parenthesis boundary и full-token equality проверены против runtime i18next. 9 added tokens rejected, 8 unchanged valid controls accepted. 3 unclosed inputs 75/1035/9011chars rejected (<1ms в этом run), без pathological regexp. Provider publication/compiler/verifier/shared persistent validation используют тот же validator. Unsupported/malformed nesting fail-closed; не расценено как defect из-за отсутствия текущего producer для unsupported grammar.
- LOC-06: authoritative revision читается до protection; отсутствие segments останавливает planning до locale resolver.14 независимых capability→real planner cases:automatic/explicit ×empty/whitespace/fenced/inline-code/URL/numeric-only/prose. 12 no-text cases возвращают bounded no-op, detector/upsert/enqueue 0; 2 prose controls queued с 1/1/1. Existing route integration tests дополнительно покрывают permission/runtime/current revision, authoritative empty vs forged prose. No-op не обходит эти guards.

### Проверки

Full local application: 1346 tests /102 files PASS,159.33s.
Exact-head GitHub Actions 40723598148 SUCCESS. Прочитаны completed logs checks122940805079 и database122940806079:
- 1346 app /102 files; lint 0 errors/один прежний warning;typecheck;application/UI-preview builds;history/metadata/schema parity PASS.
- 326 PostgreSQL17 /30 files;schema manifest/runtime privileges/web relation/credential probes;local Workers smoke PASS.
CI выполнялся на GitHub test merge 061e9d24 из exact head 915643fd +base ebdb482, что явно подтверждено checkout logs.
Native PG/Workerd отдельно локально не повторялись: использованы exact-head CI logs. Production/external/provider/owner visual не проверялись и не заявляются.

### Ограничения и остановка

Первый запуск внешнего SSR harness упал из-за React global, первый LOC06 script — из-за CJS top-level await. Исправлены только внешние harness scripts; окончательные runs PASS. Это не дефекты PR.
Implementation не менялась. Implementation commit/push не выполнялись. Публикация результатов в служебном PR разрешена разработчиком после завершения проверки. Артефакты только в /workspace/work/pr247-review-915643fd/. Выводы координатора/других reviewers не читались.
Разработчик дал команду «Публикуй». Результат передан для coordinator reconciliation; новых работ не начинать. STOP.


## L8 — implementation handoff: PR #249 (2026-10-28)

Автор: Лёва — Codex-6.1 Sol. Назначение: [6474296261](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6474296261), reconciliation6474179882.
Отдельная ветка `fix/l8-localization-runtime`; base/main `ebdb482e8bb37cf18d7085beb2926930139b00d6`; stable exact head **`c4e32d3014ee8e1391f9d0776384647fa1229361`**.
[Implementation PR #249](https://github.com/iliya1947/vico-forum/pull/249). Один commit, 27 файлов +465/−65. Merge не выполнялся.

### Реализация пяти согласованных causal chains

1. **LOC-01.** COMMIT classifier использует уже существующий PostgreSQL availability classifier вместе с SQLSTATE40003 и statement timeout. Неизвестный transport outcome идёт через прежний pre/expected/actual semantic reconciliation. Нет blind retry. Native regression выполняет настоящий COMMIT, затем имитирует потерю ACK (ECONNRESET, EPIPE, code-less Connection terminated unexpectedly); независимый observer видит desired state и результат reconciles. Third-state control выбрасывает AmbiguousCommitOutcomeError, commit не повторяется.
2. **LOC-02.** CompiledBundleValidationError помечает известную deterministic validation у источника. Persisted verifier оборачивает только этот класс и TranslationValidationError; unknown crypto/programming/operational failure проходит наружу без права DELETE. Неправильный пустой policy context — TypeError, также не data corruption. Native PG controls: valid row остаётся после injected digest TypeError и invalid policy; доказанно несовместимый bundleVersion удаляется.
3. **I18N-UI-POLICY-01.** Format vico-ui-bundle-v3 включает generationPolicyVersion (string|null) в digest. Один input проведён через publication/compiler, verifier, persisted read/reconcile, resource loader и Hyperdrive request cache key; CLI имеет явный --generation-policy. Locale boundary получает request context uiGenerationPolicyContext. Поскольку утверждённой Worker machine-generation конфигурации сейчас нет, default null отключает machine source и оставляет manual/local/English. Нового выдуманного policy version, env/provider/Queue activation нет. Raw manual rows не invalid-ятся; derived bundle с другой identity можно удалить/rebuild. Реальные loader HIT/MISS и публикация в PG проверяют одинаковую policy, stale machine исключается при transition, manual priority сохраняется.
4. **LOC-05.** UI fresh eligibility отмечается freshPlanning:true из UiTranslationService до task store. Прямой delayed dispatcher retry этим флагом не обладает; существующий delayed-old-planning regression сохранён без изменения и проходит. После head lock superseded pending/processing UI A получает новое generation и сброс старого claim. Content title/body planners уже представляют fresh authoritative eligibility и получают аналогичный head check с revision/manual/request-budget controls. Старые claim и allowance owners fence-ятся; UPDATE guarded old status+generation; актуальный duplicate claim и terminal completed/failed не сбрасываются. Native A–B–A =1,2,3; старый publisher, failure writer и allowance token не меняют новую occurrence.
5. **LOC-08.** Общий L7 semantic serializer reifies paragraph/heading dir metadata в authored token; literal lookalikes экранируются через официальный default text handler. Обработка идемпотентна при nested spoiler/table serialization. Pre-canonicalization direction signature не позволяет уже потерянной metadata стать новым expected baseline. Protection version cnt06-custom-structure-direction-v3. Paragraph, ATX/Setext heading, list, spoiler, table, literal controls проходят перевод и восстановление; Chromium дополнительно проверяет rendered text, dir attributes и computed direction.

PROJECT_STATE и STORAGE_AND_VERSIONING/PROVIDERS_AND_JOBS синхронизированы. Схема/зависимости не менялись. LOC-09 не включён: future rollout prerequisite по принятому reconciliation. PR247 не изменён.

### Авторская проверка

- Full local application: **1265 tests /103 files PASS**, после последней однострочной TypeError taxonomy правки focused final **31 tests /3 files PASS**.
- Exact-final-source native **PostgreSQL17:339 tests /31 files PASS**, включая 13 новых native regressions. Реальная локальная схема и migrations; внешний DB не использовался.
- Lint:0errors/один прежний warning app/forum/ui.test.tsx174. Typecheck, app build, UI-preview build PASS.
- Local Workerd smoke: PASS. Только disposable local PG и local Hyperdrive connection overrides; external binding/service не использовался.
- Chromium component harness: **10/10 PASS**, actual protect→restore→ForumMarkdown, text+dir+computed CSS. Это не owner visual acceptance и не real provider pipeline.
- Artifacts: /workspace/work/l8-implementation/ (app-final.log, final-focused-app.log, database-final.log, lint-final.log, typecheck-final.log, build-final.log, ui-build.log, smoke.log, browser/check.log/results.json). smoke script выводит лог только при ошибке, пустой smoke.log при exit0 штатен.
- Checkout clean; dependency symlink удалён. Chromium/ownHTTP/Workerd остановлены; disposable PG container удалён.

### Exact-head CI

[GitHub Actions #40728534829](https://github.com/iliya1947/vico-forum/actions/runs/40728534829): **SUCCESS**, full head c4e32d3014ee8e1391f9d0776384647fa1229361.
Прочитаны completed logs обеих jobs:
- checks122958247252 — **1265 application tests /103 files PASS**, migration-history guards, lint (один прежний warning), typecheck, app/UI-preview build, migration metadata и schema parity PASS.
- database122958247050 — **339 PostgreSQL17 tests /31 files PASS**, schema manifest/runtime privileges/web relation + credential probes и Workers smoke с локальными override PASS.
Логи negative controls содержат ожидаемые synthetic failure/constraint-denial messages; jobs и все шаги завершились success.


Это implementation handoff автора, **не independent whole-PR verdict**. External/provider/production/owner visual не выполнялись.

**Следующий шаг Миры:** coordinator whole-PR review PR #249 на c4e32d3, затем non-author independent reviewers того же stable exact head. **Лёва STOP.**

## L8 — техническая подготовка, без implementation (2026-10-28)

Автор: Лёва — Codex-6.1 Sol.
Поручение: PR236 comment6473705886.
Проверенный main: ebdb482e8bb37cf18d7085beb2926930139b00d6 (merged L7/#248).
Новая ветка не создавалась; использован detached checkout существующего worktree. PR247/Batch L2 не изменялся и не включён в пакет.

## Результат классификации

Подтверждены пять current-Stage findings: LOC-01, LOC-02, LOC-05, LOC-08, I18N-UI-POLICY-01.
Для LOC-09 подтверждена условная legacy-state цепочка; самостоятельный current-Stage trigger не установлен. Его нельзя автоматически переносить в обязательный correction scope только потому, что прежний аудит отметил этот ID.

### LOC-01 — current; отдельная COMMIT outcome boundary
db/locale-repository.ts ControlledLocaleWriter/isAmbiguousCommitError.
Настоящий local PG COMMIT + инъекция потери ACK с ECONNRESET/EPIPE или стандартным code-less "Connection terminated unexpectedly": desired locale уже persisted, apply отклонён, reconciliation readAll не вызван. SQLSTATE08007 control reconciles успешно; failure до COMMIT не заявляет success; third-state control даёт AmbiguousCommitOutcomeError.
Существующий общий availability classifier уже знает эти transport cases, но COMMIT classifier их пропускает.
Действующий docs/translation/LOCALES.md требует semantic pre/expected/actual reconciliation неизвестного commit outcome; controlled test/admin writer — существующая Stage2 capability.
Минимум: расширить только подтверждённую COMMIT failure classification; повторно читать через независимый/fresh repository после потери соединения. Не превращать unknown result в blind retry и не добавлять command journal/idempotency table. Failure до COMMIT, concurrent third state и неожиданные programming errors остаются разными outcomes.

### LOC-02 — current; integrity vs runtime failure у compiled verifier
db/ui-translation-bundle-store.ts verifyPersistedCompiledBundle/reconcilePersistedBundle.
Valid compiled bundle реально записан в PG. Однократный injected crypto.subtle.digest TypeError оборачивается в PersistentBundleIntegrityError; reconciler принимает это за доказанную порчу и реально DELETE-ит корректную row. Runtime read отдельно скрывает тот же failure как invalid-bundle и показывает English. Controls: valid bundle current; действительно несовместимый bundleVersion удаляется; unknown SQL failure не считается integrity.
Минимум: типизированно отделить детерминированно invalid/obsolete inputs от operational/programming/crypto failures. Известные validation/mismatch failures допускают invalidate/rebuild; неизвестный verifier failure пробрасывается и не разрешает DELETE.
Не достаточно просто перестать ловить любые ошибки: compiler сейчас бросает и generic Error для действительно invalid shape/unknown key, их нужно корректно типизировать у источника. Это не новый cache/recovery framework.

### I18N-UI-POLICY-01 — current read-contract inconsistency; связан с LOC-02
app/localization/persistent-sources.ts, bundles.ts, resource-loader.ts, app/routes/locale-boundary.tsx, db/ui-translation-publication-store.ts.
На одном локальном наборе inputs: DatabaseMachineTranslationSource(requiredPolicy=v2) отвергает approved machine v1, помечает key stale; тот же текст проходит реальный compiler + persisted verifier; loader bundle HIT возвращает его, MISS с policy-aware raw source — исключает. Active locale boundary создаёт raw machine source без required-policy аргумента, тогда как generation planning/publication передают policy.
Это нарушение уже существующего STO-03 и source-merge/currentness contract (STORAGE_AND_VERSIONING.md), а не заявление о существующих production legacy rows. Проверка не зависит от реального provider/Queue/rollout.
Минимум: один явный desired/current machine-policy input в generation/publication/runtime raw/compiled verification/reconciliation; policy-sensitive compiled identity и правильный miss/rebuild для incompatible machine policy. Значение policy должно поступать из утверждённой generation configuration/dependencies, а не выбираться произвольным новым default.
Проверки manual/local priority обязательны: manual value не становится invalid только от machine-policy transition. Local control persistent_manual с null generationPolicyVersion остаётся eligible. Не вводить broad invalidation пользовательских/manual translations или per-read full raw namespace query.
LOC-02 должен различать "доказанно obsolete по required policy" и "проверить не удалось"; поэтому bundle-policy correction зависит от безопасной error taxonomy/cleanup boundary, хотя причины этих двух findings разные. Объединение в один root cause неверно.

### LOC-05 — current; fresh desired generation не равна duplicate delivery
db/translation-task-store.ts, db/content-topic-title-task-store.ts, db/content-post-body-task-store.ts.
Actual PG: свежие planning requests A→B→A дают поколения1,2,1. Pending/processing existing A возвращается до сопоставления с current head. UI deliveries, полностью обработанные current A consumer/executor, заканчиваются stale/terminal, provider/publication не вызываются, pending/reconciliation candidates не остаётся. Для title/body actual allowance acquisition отвергает старое A как terminal. Более поздний дополнительный fresh plan уже после stale marking восстанавливает generation3: это потеря запрошенного fresh generation до следующего planning, не утверждение о вечной невосстановимости.
Controls: already-stale A возвращается как fresh generation3; duplicate актуального live claim не сбрасывает lease/attempt.
Минимум: при свежем upsert сверять stable task с сериализованным generation head; superseded pending/processing identity не возвращать как current. Продвижение нового desired generation обязано fence старые claim/publication/allowance tokens. Обычный duplicate current generation сохраняет claim, attempt и dedup.
Общий invariant применяется к UI/title/body, но revision locks, current-translation/manual checks и request-budget admission у content stores сохраняются. Не навязывается единый generic repository/новая Queue; existing locks/schema сначала проверить на достаточность.
Это отдельная причина от compiled currentness и completed-translation projection. Stable taskIdentity сама по себе не является current desired generation.

### LOC-08 — current; отдельный direction round-trip поверх принятого L7
app/markdown-syntax.ts, app/forum/semantic-markdown.ts, app/localization/content-markdown-translation.ts.
Actual current protection → identity restore → actual ForumMarkdown SSR:
- active ltr/rtl marker теряется у paragraph, heading, list item, spoiler body, table cell; public dir становится auto;
- escaped literal "\\{:vico-dir=rtl}" отвергается при unchanged translation как structure mismatch;
- ordinary no-marker prose проходит.
L7 уже даёт renderer-compatible tree/segmentation для tables/spoilers: повторно реализовывать grammar не требуется. Непосредственная причина — active marker превращается в data.hProperties.dir, generic serializer не восстанавливает authored token; expectedStructure строится уже после потери metadata. Literal escape — второй обязательный control той же parse/serialize boundary.
Минимум: сохранить authored direction и literal/active distinction в существующем semantic parse/serialize/protection contract; проверять invariant до потери исходной direction, а не только на post-serialization canonical tree. Учитывать paragraph/ATX/Setext/list и L7 cells/body. Не переписывать renderer/придумывать скрытые direction symbols.
Изменение protection representation требует согласованной task/policy identity; это не разрешение автоматически инвалидировать persistent manual translations.

### LOC-09 — legacy rollout concern в доказанном reproduction; current-Stage correction пока не обоснован
app/localization/content-generation-view.ts, db/hyperdrive-content-generation-status.ts.
Полная local PG цепочка воспроизведена: специально созданные completed task старой protection policy + same-revision stored quote translation с повреждённой attribution → current read rejects translation → status completed → UI converging, automatic/explicit false; повторный loader не лечит state. Новая current-policy generation вручную через planner/executor действительно исправляет состояние.
Но trigger этой проверки требует seeded legacy invalid translation/old protection task. Normal current-policy execution в отдельном local PG control публикует валидный result и loader даёт current. Текущий publisher валидирует restored content/quote structure и fencing до atomic result+completion; отдельный штатный current producer того seed-state не установлен.
Это соответствует уже принятому reconciliation #248 comment6473203795: production/external upgrade с долговечным legacy state не входит в принятый current Stage. Не исправлять условную future-only ситуацию как обязательный current defect и не заменять completed→idle глобально.
Зависимость только условная: перед future rollout политика stale/completed status должна учитывать desired task/protection policy и actual valid translation. LOC-05 сам по себе не решает rejected completed translation, а UI bundle policy вообще другой domain. Не объединять их и не отменять manual provenance/priority. Если Мира требует defensive LOC-09 сейчас как заранее одобренную foundation-work — это отдельное явное scope решение, не вывод о доказанном current defect.

## Предлагаемые implementation boundaries / порядок

1. LOC-01: отдельный узкий COMMIT reconciliation correction.
2. LOC-02: безопасная verifier error taxonomy и cleanup.
3. I18N-UI-POLICY-01: согласованный desired machine-policy input для raw/compiled/runtime/publication/reconciliation; отдельный correction поверх шага2.
4. LOC-05: fresh generation upsert invariant во всех трёх stores с claim/allowance/publication fencing и duplicate controls.
5. LOC-08: direction/literal round-trip в существующем L7 semantic boundary; технически независим от шагов1–4 и может быть отдельным commit.
6. LOC-09: сохранить как future rollout prerequisite, не включать в обязательный current correction без отдельного подтверждённого штатного trigger или явного foundation assignment.

Итого: не один общий "durable localization mechanism", а 5 ограниченных corrections; связанная пара2→3, общий generation invariant для трёх stores в4. LOC-09 — не шестой обязательный fix.
Новая схема/миграция, provider/Queue activation и external infrastructure сейчас фактами не требуются. Если существующие locks/schema окажутся недостаточны, расширение обосновывается отдельным experiment, а не задаётся заранее.
PR247 не prerequisite и не часть L8; перед implementation заново сверить main и сохранить изменения Лиры, если они к тому времени merged.

## Evidence и границы

Артефакты в /workspace/work/l8-preparation, diagnostic test copies вне репозитория.
На текущем main выполнены26 диагностических cases:17 native PG cases +9 semantic/policy cases; из17 native cases LOC016,LOC024,LOC05 UI3/title1/body1,LOC09 legacy+normal2. После исправления только внешнего afterAll evidence-path LOC09 отдельно перезапущен:2/2 PASS; implementation не менялась. Initial aggregate все26 assertions прошли, один artifact-writing hook изначально упал; не выдаётся за полностью green aggregate run.
Дополнительный ранний diagnostic batch17PASS включал два старых LOC06 controls вне L8; они не использованы для L8 classification.
Native local PostgreSQL17, accepted migrations до0046; actual transactions и source APIs. COMMIT ACK/hash faults injected, не реальное внешнее отключение. Providers/Queues synthetic/spy, без real calls.
Full app suite/CI/builds не повторялись: implementation не менялась, задача — technical preparation. SSR checks — actual renderer, не browser/owner visual acceptance.
Все исходные SOT целевых invariants сверены с текущим main; это не новый полный аудит документации/всего форума.

**Статус:** технический план предлагается Мире на согласование, не объявлен утверждённым implementation assignment. STOP.

Локальный checkout clean; temporary PostgreSQL container/volume удалены, dependency symlink снят. Main повторно подтверждён как ebdb482. Общий service-channel не меняется до согласования плана Мирой.

## Независимый whole-PR review #247 — Лёва (2026-10-28)

Exact head: 51e2301d9c5e3aca5b5238a7681878b1a4199829.
Base: 2ff3aeb3c8feeab3df4b674d711ff3845c09b0e0.
Assignment: PR236 comment6473042616. Scope: EDITOR-10, LITERAL-TEXT-01, LOC-03, LOC-06.
Прочитан весь diff: 14 paths, 6 implementation modules, 7 test files, PROJECT_STATE. Проверены current source и действующие Editor/translation contracts. Выводы других reviewers этого цикла не читались.

## Verdict: CHANGES REQUIRED
Два подтверждённых P2 subcases одной current-Stage family LITERAL-TEXT-01. Первый finding не завершал review; весь assigned scope проверен. Implementation не менялась. Review завершён и сначала передан разработчику в чате; публикуется по его прямой команде «Публикуй». Это личный независимый verdict, не утверждённый командный статус. Общий service-channel до reconciliation не меняется.

### F1 / P2 — 1–3 leading spaces before existing tab turn edited prose into protected code
app/forum/visual-markdown-editor.tsx:44–55 (onInput347–358).
Минимальный valid existing source: `&#32;\tAlpha` (здесь \t — actual U+0009, не два символа).
Simple сначала отображает один editable prose leaf " \tAlpha". Обычный keyboard.type('x') в конце даёт source " \tAlphax": он уже indented code. Editable leaf count становится0, activeElement BODY, public получает code block вместо paragraph. Автор теряет возможность продолжать ordinary Simple editing.

Подтверждено actual Chromium на минимальном случае и расширенных 1/2/3 spaces +tab + literal entity/strike cases; 4-space+tab control остаётся paragraph, focus/editor preserved. В расширенных4 случаях Undo/Redo exact.

Причина: structural prefix создаётся только для /^ {4}|^\t/. Вариант /^ {1,3}\t/ проходит без structural entity в clipboardPlainToMarkdown без prose context; textAsMarkdown видит raw indented-code tab, оставляет его raw. Последующая reconstruction меняет исходный paragraph на code. Это не намеренный Advanced code: до 'x' source корректно парсится как prose и editable в Simple.
Сравнение source-extracted exact baseline main helper2ff3aeb/current: оба дают code для1/2/3space+tab. Это residual исходного LITERAL-TEXT-01, не новая regression последней correction.

Не спутать с первым диагностическим экспериментом: CDP insert_text целой строки с tabs в пустой leaf приводит к browser-normalized spaces/NBSP. Одного pure-helper результата было недостаточно; finding подтверждён именно обычным вводом x в уже существующий допустимый prose.

### F2 / P2 — forced plain paste at beginning of spoiler body serializes code as prose
app/forum/clipboard-markdown.ts:145–169, особенно collect(parseForumMarkdown(candidate)):160.
Исходник:
```md
:::spoiler Label
Alpha
:::
```
В Simple раскрыть spoiler, выделить Alpha, положить в clipboard actual tab + '&copy; ~~literal~~', нажать Ctrl+Shift+V.
Actual inserted body: "\t&amp;copy; \\~\\~literal\\~\\~".
Whole source parser считает строку продолжением paragraph с ':::spoiler', поэтому codeLines пуст и применяется prose escaping. Actual ForumMarkdown отделяет spoiler body, где та же строка — indented code. Public code text становится literal "&amp;copy; \\~\\~literal\\~\\~", вместо исходного "&copy; ~~literal~~".

Проверен настоящий Chromium clipboard через navigator.clipboard.writeText + keyboard.press(Control+Shift+V), actual editor selection/source/FormData/public renderer; exact Undo/Redo. Root code и spoiler body после отдельного paragraph+blank line — проходящие controls.
Сравнение с exact clipboard source46a7cda: там inserted body raw и actual segmented body code.value == original; на51e2301d появились escape artifacts. Это regression context-aware path внутри PR, тот же literal-text family, не future-only: Simple spoiler body editing/paste поддержаны текущим Editor contract.

## Остальной scope
EDITOR-10: 255 code-point name controls (U+0001–U+00FF) через actual mentionProfileLink/project parser/publishedMentionRecipients, mismatches0; complex allowed names из suites. Actual Chromium autocomplete12 cases (6 имён × Simple/Advanced), literal name, one profile anchor /en/users/member-42, no unintended formatting. Runtime fetch synthetic only.
LOC-03: validator call chains provider publication, local/persistent sources, compiled verification прослежены; actual i18next runtime9 added nesting variants все rejected;8 valid identical-source token controls accepted; unclosed inputs75/1035/9011 chars rejected, max measured<1ms. JSON options/quotes/interpolation covered; additional current-Stage findings не установлены. Official nesting docs прочитаны; installed i18next implementation сопоставлен.
LOC-06: authoritative read→protected segments no-op before source resolver проверен по actual planner, action capability и added route/planner regressions; invalid target/current revision/disabled-runtime/permission boundaries не обойдены. Blank/whitespace/fenced-only bodies и forged caller prose tests проходят; normal prose queues. Additional findings не установлены.

## Validation
- Лично local pinned Node24.21.0 full app1211/1211,102 files PASS.
- Local typecheck, lint0errors/1 existing warning(ui.test.tsx174), app/UI-preview builds PASS.
- Exact-head CI40589705256 SUCCESS. Completed logs обеих jobs fetched/read: checks122490424584 app1211/102; database122490425213 PG17 tests323/29, runtime probes/Workers smoke PASS.
- Local native PG/Workerd separately не запускались: выше CI evidence.
- Browser: 10 native fresh-input controls;4 existing-prose cases (3fail+1control) with exact history;1 minimal ordinary keyboard 'x' reproduction;12 mention cases PASS;3 native forced-clipboard scenarios (1fail+2controls) with exact history.
- Pure probes:28 leading-indent cases,255 name controls,28 clipboard contexts;8 baseline helper executions +2 spoiler-baseline/current comparisons; LOC03 9reject/8accept/3bounded malformed probes.
- Browser is local component harness with synthetic API404/mention replies, not deployed-site/owner visual acceptance. Production/external infrastructure not touched.
- PR body still names historical894f9719 as "New stable exact head"; authoritative metadata/checkout/CI are51e2301d. Это информационная неточность PR description, не дополнительный code finding.
- Checkout clean, dependency symlink removed; generated UI artifact moved outside checkout; Chromium/HTTP server stopped. Head rechecked stable.

Артефакты — эта папка: probe.json/probe.ts, baseline.log/baseline.ts/source-extracted baseline modules, browser-native.json, browser-existing.json, minimal-native.json, browser-mentions.json, browser-paste.json, spoiler-baseline.log; loc03.json; app/typecheck/lint/build/ui-build logs.


**Мире:** согласовать два подтверждённых subcases LITERAL-TEXT-01 на указанном exact head. **Лёва STOP.**

## PR #248 / EDITOR-03 — bounded Clear-link collision correction (2026-10-28)

Назначение: [#6468774979](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6468774979); reconciliation #6468773541. Author implementation handoff, не independent whole-PR verdict.

**Stable exact head:** `e428833b6452f0cb09b25d5ffc4fda76b39d4238`, base `2ff3aeb3c8feeab3df4b674d711ff3845c09b0e0`; existing PR #248 / branch fix/l7-editor-structure. От0af3738: **4 files +114/−8**, production **+22/−3** (включая rename helper/call и comment).

### Изменение

Существующая selected-side boundary protection расширена для reopened links и переименована из protectSelectedAttentionBoundaries в protectSelectedInlineBoundaries. Для actual insertion, начинающегося с '[', она находит предыдущий surviving source character с учётом child delimiter deletions. Если это выбранный неэкранированный '!', переписывает только его как `&#33;`. Odd backslash escaping оставляется неизменным; even count разрешает защиту. Existing numeric reference тоже не меняется. Destination, title, label и остальной suffix source не переписываются.

Новая '[' больше не объединяется с literal '!' в image syntax. Используются прежние rewrites/mapOffset, поэтому source selection растёт на длину entity, а visual selection и отображаемый текст остаются прежними. Attention/GFM coalescing, reconstruction, Enter/Backspace, consumers, grammar/dependencies/schema не менялись.

Примеры:
- `[a !b!](https://example.test)`, Clear `a !` → `a &#33;[b!](https://example.test)`.
- Clear только `!` → `[a ](https://example.test)&#33;[b!](https://example.test)`.
- `[**a !** b!](https://example.test)`, Clear `a !` → `a &#33;[ b!](https://example.test)`: фактическая opening boundary сдвинута после удалённых '**', и тоже защищена.
- `[**a !b!**](https://example.test)` → `a &#33;[**b!**](https://example.test)`: suffix strong/link сохранены.
- `**[a !b!](https://example.test)**` → `a !**[b!](https://example.test)**`: между ! и '[' уже стоит strong delimiter, избыточное encoding не требуется.
- Escaped `\!` и `&#33;` остаются в исходной форме.

### Tests / evidence

Добавлены **23 regressions/controls: 13 helper +10 mounted**. Включены terminal '!', выделение одной punctuation, '!!', '? . : , - < ;', odd/even backslashes, existing numeric reference, child-deletion shifted anchor, nested/outer strong, repeated strike и Unicode. Проверяются source, text, link destinations, отсутствие images, selected-side source slice, actual Simple FormData/public renderer, per-character selected/unselected formats и Undo/Redo.

Две начальные bracket-fixtures не были валидными whole-label links; заменены валидными punctuation controls. Ранний полный suite остановлен после исправления этих fixtures; для итогового результата используется отдельный полный app-final.log. Это test fixture correction, production logic после первого patch не менялась.

- Full local application suite на pinned Node24.21.0/pnpm12.3.4: **1250/1250 PASS /102 files**.
- Final focused suites: **230/230 PASS** (editor-document107 +markdown-editor123).
- **25/25 Chromium PASS**: 10 новых link/punctuation cases +15 предыдущих repeated-strike/formatting controls; actual toolbar→FormData→public renderer, exact displayed text/per-character formats, unchanged destination/title attributes, **25/25 visual selection и Undo/Redo**.
- Прежняя property matrix: **597 valid source cases /14 597 selections /0 failures**, раньше на0af3738 —81 failed executions /66 unique source+range. Ни остаточных image collisions, ни новых failures в этом наборе не установлено. Это bounded diagnostic matrix, не доказательство whole-PR completeness.
- Local typecheck, lint (0 errors/1 existing warning ui.test.tsx:174), application/UI-preview builds PASS.
- PROJECT_STATE заменяет старое open limitation фактическим corrected behavior и границами verification.
- Отдельные local native PG/Workerd не повторялись; они проверяются exact-head CI. Production/external/owner visual не выполнялись; synthetic browser API404 не является deployed acceptance.

### Exact-head CI / итог

[Run #40689282340](https://github.com/iliya1947/vico-forum/actions/runs/40689282340) **completed SUCCESS** для head `e428833b6452f0cb09b25d5ffc4fda76b39d4238`. Completed logs обеих jobs лично прочитаны:
- checks `122819640969`: **1250/1250 application tests /102 files**, helper107 +mounted123; lint/typecheck, обе builds, migration/schema parity guards PASS.
- database `122819640458`: **326/326 PostgreSQL17 tests /30 files**; runtime privilege probes и Workers smoke PASS.
- GitHub head/base повторно подтверждены, PR open/mergeable. Merge не выполнялся. Локальный checkout clean, dependency symlink удалён, Chromium закрыт, HTTP server остановлен.
- Это завершение назначенной correction. Нужен новый coordinator whole-PR review, затем non-author independent reviewers того же head; green CI и diagnostic matrix не являются self-approval всего PR.

Артефакты: `/workspace/work/l7-clear-link-correction/` — focused-final.log, app-final.log, typecheck.log, lint.log, build.log, ui-build.log, matrix.ts/matrix-results.json/matrix.log, browser.py/browser-results.json/browser.log.

Correction и exact-head checks завершены. Мире — начать новый coordinator whole-PR review PR #248. Автор не делает independent whole-PR self-approval. **Лёва STOP.**
## PR #248 / EDITOR-03 — repeated-strike bounded correction (2026-10-28)

**Назначение:** [#6468332229](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6468332229), после author verification #6468030466. Это implementation handoff автора, не независимый whole-PR verdict.

**Новый stable exact head:** `0af3738d66ef6a8c7f0abdb98b95101e86cb5ad7`.
Base `2ff3aeb3c8feeab3df4b674d711ff3845c09b0e0`.
Existing branch `fix/l7-editor-structure`, implementation PR #248. От предыдущего 5e562539: **4 файла, +124/−1**, production helper **+32/−1**, **22 новых regressions/controls** (15 helper, 7 mounted).

### Что изменено и почему

Предыдущая защита selected-side attention учитывала соседнюю family, но не обеспечивала pairing полного `~~**~~(` / `~~*~~(` sequence. Перенос lookup на actual anchor сам по себе недостаточен — no-space reproduction ломался даже после character-reference protection.

Использована идемпотентность strike: вложенный delete ничего не добавляет к effective strike, пока внешний delete покрывает тот же текст. Подготовка существующего source-edit plan удаляет **оба delimiter spans избыточного внутреннего delete** только когда Clear пересекает этот wrapper либо выносит его к вновь построенной границе. Внешний delete продолжает обеспечивать strike невыделенному остатку. Для вновь exposed wrapper проверяется отсутствие intervening text, игнорируются только whitespace и delimiter spans его ancestor path. Вложенный strike вдали от затронутой границы остаётся byte-identical.

Остальные wrappers проходят прежний child-first algorithm; deletions учитываются при расчёте boundaries, поэтому ambiguous repeated tilde sequence вообще не создаётся. Coalescing удаляет только delimiter spans; весь документ не пересериализуется, а прежние selected-side reference rewrites продолжают работать; существующая attention protection для обычных intraword cases и source-selection mapping сохранены.

Общая reconstruction-модель, serializer, parser grammar, Enter/Backspace, secondary Markdown consumers, dependencies/schema не менялись. Это локальное coalescing redundant formatting в Clear, не новая универсальная сериализация.

### Подтверждённые выходы

| Source; Clear a | После correction |
| --- | --- |
| `~~**~~a (b)~~**~~` | `a ~~**(b)**~~` |
| `~~**~~a(b)~~**~~` | `&#97;~~**(b)**~~` |
| `~~*~~a (b)~~*~~` | `a ~~*(b)*~~` |
| `~~*~~a(b)~~*~~` | `&#97;~~*(b)*~~` |
| `[~~**~~a (b)~~**~~](https://example.test)` | `a[ ~~**(b)**~~](https://example.test)` |

Selected a plain; весь невыделенный suffix сохраняет effective strike + strong/emphasis и link, где он был. Видимые markers не появляются. Уменьшение числа redundant delete AST ancestors намеренное; вложенность одинакового strike не является дополнительным визуальным formatting.

### Проверки

- До fix первый helper batch: **8 FAIL /81 PASS**, что подтверждает regressions против оригинального 5e562539.
- Финальный full application suite на pinned Node24.21.0/pnpm12.3.4: **1227/1227 PASS, 102 files**.
- Focused editor suites на промежуточном наборе: **206 PASS**; после последнего untouched-wrapper control итоговые helper94 + mounted113 =207 включены в full suite.
- Новые tests: repeated strong/emphasis, whitespace/no-space, outer link, whole phrase, mid-word Clear, разные spans внешнего/внутреннего strike, exposed unselected wrapper, Unicode BMP/supplementary, exact selected text, соседние CRLF/code block bytes, untouched redundant wrapper вне seam; mounted actual FormData/public rendering и Undo/Redo.
- **15/15 Chromium scenarios PASS**: DOM Range selection → actual toolbar click → FormData → actual ForumMarkdown; per-character effective formats и текст, 15/15 exact selection и Undo/Redo. Включены mandatory cases, two-level, flat, reversed, whole phrase, старые intraword a/l, punctuation, Unicode. API synthetic404; не deployed-site/owner visual acceptance.
- Локальные typecheck, lint (0 errors /1 existing warning ui.test.tsx:174), application build и UI-preview build PASS.
- Diagnostic property matrix: **597 valid source cases /14 597 selections** на цепочках wrappers до depth4 и разных spans. До/после сопоставлены по исходному source+range: **216 →66 уникальных нарушений, 150 исправлены, новых 0**. С учётом повторов одинаковых sources в generator: **277 →81 failed executions**. **Весь matrix не объявляется PASS** — остаток ниже.
- Production/external/owner visual не затрагивались. Full local PostgreSQL/Workerd отдельно в этой correction не повторялся; exact-head CI evidence указывается отдельно после завершения.
- PROJECT_STATE отражает реализацию и отдельное известное ограничение. Checkout clean; dependency symlink удалён, HTTP server остановлен, Chromium закрыт.

### Exact-head CI

[Run #40685817846](https://github.com/iliya1947/vico-forum/actions/runs/40685817846) **completed SUCCESS**, trigger pull_request для `0af3738d66ef6a8c7f0abdb98b95101e86cb5ad7`. Completed logs обеих jobs лично fetched/read:
- checks `122807769482`: **1227/1227 app tests /102 files**, editor-document94, markdown-editor113; lint/typecheck, application/UI-preview builds и schema parity guards PASS.
- database `122807769908`: **326/326 native PostgreSQL17 tests /30 files**; migrations, runtime privilege probes и local Workers smoke PASS.
- Это CI evidence. Full local PG/Workerd separately не запускались; прежний known lint warning вне diff не исправлялся.
- GitHub head/base совпадают с заявленными, PR open/mergeable; merge не выполнялся.

### Отдельный подтверждённый старый Clear-link path — НЕ исправлен этим пакетом

Все оставшиеся 81 failed matrix executions /66 unique source+range имеют link image collision `![`, а не повторную strike-pairing ambiguity. 60/66 дают byte-identical output до/после correction; в 6 output меняется из-за устранения repeated strike, но независимый image collision сохраняется.

Минимальный case уже на **исходном 5e562539**, без strike:
`[a !b!](https://example.test)`, Clear `a !` (source [1,4)) →
`a ![b!](https://example.test)`.

Project parser получает image вместо невыделенного link b!. Actual Chromium FormData/public ForumMarkdown подтвердил до/после: исходно visible `a !b!`, после public text **`a `** — этот renderer не показывает remote image. External URL requests заблокированы harness. Причина: literal selected '!' прилегает к вновь открытому '['; нужна отдельная literal/image boundary защита. Это **другая causal chain**, воспроизводимая до данного correction, не regression coalescing strike. Не добавляю исправление вне явно назначенного repeated-strike scope. Зафиксировано в PROJECT_STATE; Мире требуется отдельное scope/reconciliation решение. Whole-PR completion/merge не заявляются.

### Артефакты

`/workspace/work/l7-repeated-strike-correction/`: red.log, focused.log, app.log, typecheck.log, lint.log, build.log, ui-build.log; matrix.ts, matrix-before.ts, original.ts, matrix-results.json, matrix-before.json, matrix-delta.json; browser.py/browser-results.json/browser.log; link-bang.py/link-bang-browser.json.

**Следующий шаг:** Мире — проверить новый head и согласовать отдельный подтверждённый Clear-link path. Старые whole-PR verdicts относятся к 5e562539; автор не даёт independent whole-PR self-approval. Merge не выполнялся. **Лёва STOP.**

## PR #248 / EDITOR-03 — author verification repeated nested strike (2026-10-28)

**Назначение:** [#6467691554](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6467691554), reconciliation #6467690170. Это author verification одного finding, не независимый whole-PR review.

**Exact head:** `5e5625390501753edb07c323b8c662cec9902474`; base `2ff3aeb3c8feeab3df4b674d711ff3845c09b0e0`. Проверены GitHub metadata и локальный HEAD. Implementation не менялась; checkout clean.

### Вердикт

**CONFIRMED: P2 / current-Stage EDITOR-03, один residual family.** Поддерживаемые inline nodes уже корректно отображаются и редактируются в Simple. docs/EDITOR.md §2 / §3.6 требует сохранять смысл, содержимое и нетронутые фрагменты, Clear — только выбранное inline-оформление. Это не future-only и не запрос на новую поддержку Markdown.

Оригинальные TypeScript helper и parser, затем реальные MarkdownEditor / ForumMarkdown в локальном Chromium:

| Source; Clear a | Actual source | Actual public result |
| --- | --- | --- |
| `~~**~~a (b)~~**~~` | `a ~~**~~(b)~~**~~` | `a <del>**</del>(b)<del>**</del>` |
| `~~*~~a (b)~~*~~` | `a ~~*~~(b)~~*~~` | `a <del>*</del>(b)<del>*</del>` |
| `[~~**~~a (b)~~**~~](https://example.test)` | `a[ ~~**~~(b)~~**~~](https://example.test)` | Link вокруг suffix сохранён, но звёздочки literal, (b) без strike/strong |
| `~~**~~a(b)~~**~~` | `&#97;~~**~~(b)~~**~~` | Та же потеря suffix formatting и literal **, несмотря на сработавшую attention protection |

До Clear первый source имеет AST `delete → strong → delete → text("a (b)")` и public `<del><strong><del>a (b)</del></strong></del>`. После Clear видимый текст меняется с `a (b)` на `a **(b)**`.

### Причинная цепочка и существенное уточнение reconciliation

1. Child-first traversal правильно удаляет три opening delimiters: [4,6), [2,4), [0,2).
2. Для target [6,7) remainingSourceBoundary trim-ит пробел offset7. Все reopenings приходят в offset8, insertions = [[8,"~~**~~"]].
3. protectSelectedAttentionBoundaries читает только insertion[target.end=7]; actual offset8 пропускается. Это подтверждённый gap, но **не вся причина**.
4. В последовательности `~~**~~(` внутренний ~~ находится между punctuation '*' и '('. В установленном GFM tokenizer он одновременно opener/closer; resolver закрывает им предыдущий ~~ раньше intended nesting. Child stars становятся literal.
5. Контроль **без пробела** имеет reopening ровно на target.end=7. Protection срабатывает, a становится `&#97;`, однако public output всё равно повреждён. Поэтому исправление только смещения lookup / сканирование всех anchors недостаточно: важна корректность полного mixed sequence, включая повторную семью и реальный suffix punctuation.
6. Letter suffix `beta` в `~~**~~a beta~~**~~` проходит; two-level strong/strike, flat strike, reversed strong/strike, Clear всей фразы проходят. Не каждый nested strike сломан.

Проверка установленного micromark-extension-gfm-strikethrough/lib/syntax.js: `token._open = !after || after === 2 && Boolean(before)`; `token._close = !before || before === 2 && Boolean(after)`. Punctuation с обеих сторон даёт обе роли. Повторное использование исходных delimiters после удаления начальной a меняет их pairing.

### Сопоставление с baseline / масштаб следующего решения

На accepted main helper 2ff3aeb и initial PR helper 16f4b95 те же три reproductions (strong, emphasis, no-space) тоже некорректны: literal markers и/или selected a остаётся deleted. Проверены actual TS outputs и project parser, всего 6 baseline cases. Это недозакрытый исходный EDITOR-03, а не новая регрессия последнего commit.

Общая reconstruction-модель / весь редактор не доказаны требующими замены. Проблема локализована в сборке полного delimiter sequence на новых границах, а не source offsets, FormData, history или renderer.

Однако очередного расширения single-neighbor predicate недостаточно. С учётом повторных corrections технический план должен учитывать реальные anchors после trimming и совместное pairing повторных семей. Следующий bounded correction должен проверять full affected seam и сохранность suffix semantics, не ограничиваться наличием insertion[target.end]. Переписывать весь документ, менять supported grammar или добавлять ещё один частный predicate без этой проверки оснований нет.

Отдельно parser подтвердил существование локальных семантически эквивалентных представлений `a ~~**(b)**~~`, `a ~~*(b)*~~` и link variant с устранённым redundant inner delete. Это лишь проверка представимости трёх примеров, **не реализованный/доказанный универсальный алгоритм и не утверждённый correction**. Требуется учитывать разные spans внешнего/внутреннего strike; слепое удаление всех повторных delete не обосновано.

### Лично выполненные проверки и границы

- 9 valid helper/parser cases: 4 confirmed reproductions + 5 controls; отдельный invalid input `~~**~~(b) a~~**~~` изначально не даёт ожидаемого nested AST и исключён из доказательств finding.
- Instrumented diagnostic copy вне checkout: deletion ranges / depths / actual insertion anchors; outputs совпали с оригинальным helper.
- 9 Chromium scenarios: DOM Range selection + actual toolbar click → FormData → actual project ForumMarkdown. Source совпал с helper во всех 9; **9/9 selected text и Undo/Redo сохранены**. Это reproductions/controls, не 9 passing correctness cases.
- 6 baseline executions + project AST checks; 3 static semantic-representation controls.
- Full application/native PG suites, builds, CI заново не запускались: implementation не менялась. Числа reviewer property matrix самостоятельно не воспроизводились.
- Browser harness synthetic /api/**404, не deployed-site/owner visual acceptance. Production/external services не затрагивались.
- Локальный HTTP harness остановлен, browser закрыт, dependency symlink удалён; git diff --check / clean checkout.

Артефакты: `/workspace/work/l7-repeated-strike-verification/` — probe.ts/results.json/probe.log, instrumented.ts, browser.py/browser-results.json, base-results.jsonl, controls.json.

**Передача:** Мире — подтверждение finding с уточнением causal chain и bounded correction scope. Implementation остаётся на 5e562539. Исправление в этом verification не выполнялось. **Лёва STOP.**

## PR #248 / EDITOR-03 — bounded nested-strike correction (2026-10-28)

**Автор:** Лёва — Codex-6.1 Sol. Implementation report, не независимый whole-PR verdict.
**Назначение:** [#6454603798](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6454603798), после author verification [#6454498746](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6454498746).
**PR:** [#248](https://github.com/iliya1947/vico-forum/pull/248).
**Previous head:** `c87ca0ed6e0ec669ac6c97d5c68d547980e6541d`.
**Новый stable exact head:** `5e5625390501753edb07c323b8c662cec9902474`, branch `fix/l7-editor-structure`; accepted base `2ff3aeb3c8feeab3df4b674d711ff3845c09b0e0`. PR open/mergeable; merge не выполнялся.

### Изменён только назначенный residual EDITOR-03

От previous head: **4 файла, +101/−6** — `editor-document.ts`, `editor-document.test.ts`, `markdown-editor.test.tsx`, `PROJECT_STATE.md`. Production diff ограничен комментариями и проверкой соседей attention delimiters; parser grammar, reconstruction plan/history, другие L7 paths и dependencies/schema/migrations не менялись.

Предыдущий predicate снимал сразу весь mixed run `~~**` или `**~~`. Поэтому соседние child stars исчезали из контекста, хотя определяли, может ли внешний GFM `~~` открыть/закрыть strike. Сейчас opening и closing проверяются раздельно: удаляется **только крайний homogeneous run одной семьи** маркеров. Child family остаётся видимой как punctuation. Existing selected-side character-reference escaping защищает границу и сохраняет правильное GFM pairing.

Это локальная correction уже существующего boundary-protection helper; новый serializer или повторная сериализация документа не добавлялись. Homogeneous `***` продолжает рассматриваться как одна семья; уже исправленные strong/emphasis/link whitespace paths сохраняют semantics.

### Подтверждённые результаты

Source `~~**alpha beta**~~`:
- Clear первой a → `&#97;~~**lpha beta**~~`. Public DOM: plain a, затем del→strong `lpha beta`. Literal tildes нет; selected a не форматирована, весь невыделенный остаток сохраняет strike/strong.
- Clear l → `~~**a**~~&#108;~~**pha beta**~~`. Public DOM: del→strong a, plain l, del→strong `pha beta`. Выбранная l больше не остаётся во вложенном del.
- Character references изменяют только source representation выбранного символа; отображаемая буква и DOM selection сохраняются, исходный невыделенный source не нормализуется.

Эквивалентные outer-delete / inner-emphasis cases исправлены. Flat strike, whole-word clear, whole-range clear и reversed nesting controls проходят. Для некоторых mixed controls representation выбранной буквы тоже может стать reference; visible semantics, selection и exact history сохраняются.

### Регрессии и проверки

Добавлены **26 cases: 19 helper +7 mounted component**:
- a/l для outer delete + inner strong и emphasis;
- flat strike, whole-word и reversed nesting controls;
- whole-range clear;
- BMP/supplementary Unicode boundary и mapping source selection;
- actual editor → FormData → public ForumMarkdown: отсутствие literal markers, per-character selected/unselected del/strong/em semantics, DOM selection, exact Undo/Redo.

Red helper stage до correction: **6 FAIL /73 PASS** (оба strong cases, оба emphasis cases и два Unicode boundary cases). После correction: **185 focused editor tests PASS**.

- Полный локальный app suite: **1205 tests /102 files PASS**; контрольный полный прогон на pinned **Node24.21.0** — **1205/102 PASS**.
- Прежняя semantic matrix: **96/96 PASS**, включая strong/emphasis/link whitespace boundaries.
- **13 headless Chromium scenarios PASS**: assigned minimal cases, equivalent emphasis, flat/whole-word/reversed nesting, whole-range, BMP/supplementary Unicode. DOM selection → actual toolbar → FormData → actual public renderer. **13/13 selection и exact Undo/Redo**.
- Local `pnpm typecheck`, source lint (0 errors / один прежний warning в ui.test.tsx), app build и UI-preview build PASS. Generated artifact вынесен из checkout перед source lint.
- **[Exact-head CI #40592508871](https://github.com/iliya1947/vico-forum/actions/runs/40592508871) SUCCESS: checks `122500070291` — **1205 app tests /102 files PASS**; database `122500071007` — **326 PostgreSQL17 tests /30 files PASS**. Completed logs обеих jobs прочитаны; typecheck/lint, app/UI-preview builds, migration/schema/runtime probes и Workers smoke успешны.**

Full local native PG/Workerd smoke в этой correction отдельно не повторялся; выполнен exact-head CI. Browser — local component harness с synthetic API responses, не owner visual acceptance/live deployment. External/provider/production services не затрагивались.

Артефакты: `/workspace/work/l7-strike-correction/red.log`, `mounted.log`, `app.log`, `app-pinned.log`, `semantic-matrix.json`, `browser-results.json`, `typecheck.log`, `lint.log`, `build.log`, `ui-build.log`, `browser.py`.

PROJECT_STATE отражает correction и её дату. Нового independent whole-PR verdict автор не выносит; старые reviewers verdicts относятся к previous head. Локальный harness остановлен; dependency symlink удалён, implementation checkout clean.

**Мире:** новый coordinator whole-PR review PR #248 на `5e5625390501753edb07c323b8c662cec9902474`, затем non-author independent reviewers того же head. Implementation зафиксирована. **Лёва STOP.**

## PR #248 / EDITOR-03 — author verification nested GFM strikethrough (2026-10-27)

**Назначение:** [#6454156161](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6454156161), reconciliation [#6454152253](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6454152253).
**Проверенный PR:** [#248](https://github.com/iliya1947/vico-forum/pull/248), exact head `c87ca0ed6e0ec669ac6c97d5c68d547980e6541d`, base `2ff3aeb3c8feeab3df4b674d711ff3845c09b0e0`. Remote/local head проверены в начале и перед публикацией, совпадают.
**Автор:** Лёва — Codex-6.1 Sol, автор реализации; targeted verification, **не независимый whole-PR review**.

**Технический verdict: EDITOR-03 CONFIRMED / current Stage. Оба назначенных cases нарушают selected-only Clear, но симптомы различаются. Implementation не менялась, correction не начиналась.**

### Case 1 — Clear первой a: теряется strike невыделенного остатка

Source `~~**alpha beta**~~`, selection source `[4,5)`:
```md
a~~**lpha beta**~~
```

Выполнен оригинальный `clearInlineMarkdownFormatting`, затем project `parseForumMarkdown` и настоящий public `ForumMarkdown` через actual Simple editor в Chromium. Public DOM:
```html
<p dir="auto">a~~<strong>lpha beta</strong>~~</p>
```
`<del>` нет; невыделенный `lpha beta` сохраняет strong, но теряет исходный strike, а `~~` видны буквально. Это подтверждает основную формулировку reviewer finding.

### Case 2 — Clear l: выделенная буква остаётся зачёркнутой

Тот же source, selection `[5,6)`:
```md
~~**a**~~l~~**pha beta**~~
```
Project parser/public renderer:
```html
<p dir="auto"><del><strong>a</strong><del>l</del><strong>pha beta</strong></del></p>
```
Весь `alpha beta` остаётся внутри внешнего del; выбранная `l` дополнительно попадает во внутренний del. Strong с неё снят, **strike не снят**.

Уточнение scope: для этого case неверно описывать результат только как «теряется strike невыделенного текста». Невыделенные `a` и `pha beta` сохраняют нужное оформление; нарушается очистка **выделенной** `l`. Оба симптома — одна текущая family EDITOR-03, не два отдельных defects.

### Causal chain / GFM pairing

1. Исходный project AST: delete `[0,18)` → strong `[2,16)` → text `[4,14)`. Поддерживаемая грамматика — project GFM strikethrough extension с `singleTilde:false`, используемая и helper parser, и public renderer.
2. Child-first reconstruction удаляет/разделяет strong, затем планирует delete. Порядок вложенности сохраняется как локальные смешанные runs `~~**` и `**~~`, но их GFM роли зависят от соседних букв и punctuation каждого **отдельного** delimiter family.
3. В первом case новый `~~` стоит после `a` и перед `*`. По фактическому installed `micromark-extension-gfm-strikethrough/lib/syntax.js` before — letter, after — punctuation: token не может открыть strike. Получаются literal tildes без del.
4. Во втором case intended closing `~~` после `**a**` имеет before `*`/after `l` и становится **opener**, а intended reopening `~~` перед `**pha` имеет before `l`/after `*` и становится **closer**. Они образуют внутренний del вокруг l; исходные outer markers продолжают охватывать весь paragraph. Actual project AST подтверждает outer delete `[0,26)`, inner delete `[7,12)`.
5. `protectSelectedAttentionBoundaries()` (editor-document.ts:674+) снимает весь mixed run регулярным выражением `^[*_~]+|[*_~]+$` и в этих случаях смотрит на исходные соседние буквы. Внутренний punctuation context между `~~` и `**`/`*` скрыт этой операцией; character-reference protection не срабатывает. Общей проверки final GFM pairing нет.

Это **не** прежняя whitespace/empty-link причина: split здесь находится внутри слова и не имеет пробела у границы. Общий high-level механизм тот же — partial Clear reconstructs nested delimiters; недостающая часть — сохранение GFM semantics при смешанных delimiter runs на буквенной границе.

### Насколько широк finding

Подтверждены также аналогичные `~~*alpha beta*~~` (outer delete / inner emphasis) для a и l.

Контрпримеры на том же source path:
- whole-word alpha или beta в `~~**alpha beta**~~` очищаются корректно; остаток сохраняет strike/strong;
- `**~~alpha beta~~**` с a/l работает корректно;
- flat `~~alpha beta~~` с a/l работает корректно;
- whole-range Clear `~~**alpha beta**~~` даёт `alpha beta`.

Следовательно нельзя расширять finding до любого nested/flat strike или любой границы. Минимальный подтверждённый scope — найденная outer-delete / inner-strong-or-emphasis комбинация с partial intraword selection.

### Предыдущие heads / current-Stage classification

На копиях исходных helpers из accepted base `2ff3aeb` и первоначального L7 head `16f4b95`:
- Clear l даёт тот же `~~**a**~~l~~**pha beta**~~`;
- Clear a даёт более ранний неверный `~~~~a~~**lpha beta**~~` (unchanged project parser распознаёт code block).

Это **остаточный subcase исходного EDITOR-03**, а не новая регрессия, впервые внесённая correction `c87ca0e`. Последняя correction устранила прежние whitespace/link и empty-wrapper cases, но не закрыла final mixed-run GFM pairing. «Новый subcase» означает вновь выявленный, не вновь внесённый.

Current contract: docs/EDITOR.md §3 (:76, :81) явно включает strong/emphasis/strike и Clear только выделенного содержимого; nested supported inline syntax уже штатная. Future Stage, LOC-08 или требования к внешним сервисам не задействованы.

### Проверки и границы

- **17 helper cases**, включая source/AST traces на 16 selections и whole-range control; **10 actual Chromium component scenarios**, **4 previous-head source controls**.
- Chromium: DOM selections в Simple → actual Clear toolbar → FormData source → actual ForumMarkdown; все назначенные симптомы и перечисленные browser controls воспроизведены. **10/10 exact Undo/Redo**; отдельное повреждение history не утверждается.
- TS helper повторно выполнен с pinned toolchain. Проверены оригинальные project parser/render path, а не самостоятельная модель delimiter operations или сторонний Markdown dialect.
- Baseline controls выполняли оригинальные helpers из git blobs с адаптированными import paths к unchanged project Markdown syntax; старые whole applications/CI не запускались.
- Full suites/typecheck/native PG/CI повторно не запускались: код не менялся, это targeted source/DOM verification. Другие L7 PASS-области не пересматривались.
- Chromium — local component harness с synthetic API responses, не production и не owner visual acceptance. External/provider/live services не затрагивались.
- Артефакты: `/workspace/work/l7-strike-verification/helper-results.json`, `helper-summary.jsonl`, `browser-results.json`, `base-results.jsonl`, `probe.ts`, `browser.py`, `base-controls.ts`.
- Tracked/staged diff отсутствуют; dependency symlink удалён, локальные browser/server остановлены.

**Мире:** author verification подтверждает одну current-Stage family EDITOR-03 с указанным уточнением второго симптома и residual classification. Correction по этому назначению не выполнялась. **Лёва STOP.**

## PR #248 / L7 — bounded correction после verification (2026-10-27)

**Автор:** Лёва — Codex-6.1 Sol. Отчёт реализации correction и её проверок, не независимый whole-PR verdict.
**Назначение:** [#6451604065](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6451604065), после author verification [#6451496176](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6451496176).
**PR:** [#248](https://github.com/iliya1947/vico-forum/pull/248).
**Предыдущий проверенный head:** `16f4b955c364e38ddc77dfce0cb4a995b4577bc3`.
**Новый stable exact head:** `c87ca0ed6e0ec669ac6c97d5c68d547980e6541d`, branch `fix/l7-editor-structure`; accepted base `2ff3aeb3c8feeab3df4b674d711ff3845c09b0e0`. PR open/mergeable, merge не выполнялся.

### Scope correction

Только три назначенные families. От предыдущего head изменены **4 файла, +332/−83**: `app/forum/editor-document.ts`, `editor-document.test.ts`, `markdown-editor.test.tsx`, `PROJECT_STATE.md`. Другие implementation paths L7, custom parser/recipients/translation policy, publication actions, dependencies/schema/migrations не изменялись.

### EDITOR-03 — nested reconstruction и link whitespace

- Форматирование рассчитывается **изнутри наружу**: перед границей внешнего wrapper известны удаления и вставки delimiters детей. Общий source-edit plan применяет изменения по исходным offsets и отображает selection без пересериализации документа.
- Emphasis boundary whitespace исключается из его delimiters; link label не требует такого trim, поэтому невыделенные пробелы остаются внутри ссылки. Если после удаления child delimiters видимого остатка нет, wrapper не открывается повторно и пустая ссылка не создаётся.
- `**alpha *beta gamma* delta**` + clear beta → `**alpha** beta ***gamma* delta**`; public alpha сохраняет strong, gamma — strong/emphasis, delta — strong.
- `[alpha beta](https://x)` + clear alpha → `alpha[ beta](https://x)`, public anchor text ` beta`.
- `[**alpha beta**](https://x)` + clear beta → `[**alpha** ](https://x)beta`: одна ссылка с text `alpha `, без empty anchor.
- Контроли вложенной ссылки внутри strong показали, что учитывать нужно **и вставленные** brackets/target ребёнка; иначе outer delimiter может пересечь link structure. При соприкосновении выбранного слова с link punctuation CommonMark attention дополнительно требует literal reference на выделенной границе. Например `bet&#97;**[ gamma](https://x) delta**` отображает тот же beta и сохраняет стиль/ссылку невыделенного текста. Используется стандартное Markdown character-reference escaping (аналогичная необходимость подтверждена mdast serializer), а не HTML или добавление видимых/zero-width символов.
- Source mapping учитывает длину reference и supplementary Unicode; mounted/Chromium controls проверили `𐐀amma`, selection после Clear и exact history. Неизменённый окружающий source не нормализуется.

### EDITOR-06 — actual boundaries после nested reconstruction

- Убран единый whitespace snapshot до удаления inner wrapper. Для каждого crossing wrapper вычисляется его реально оставшаяся граница, включая planned child delimiters; Empty residual wrappers удаляются. Paragraph insertion и caret отображаются общей source-edit plan.
- Enter перед beta в `**alpha *beta gamma* delta**` → `**alpha** \n\n***beta gamma* delta**`; после gamma → `**alpha *beta gamma***\n\n **delta**`.
- Public renderer показывает два корректных paragraphs без literal delimiters, нужные strong/emphasis сохраняются. Контроль Enter внутри beta остаётся корректным.
- Невыделенные соседние блоки/CRLF/code source не пересериализуются; существующие cross-leaf/cross-block selection и history tests проходят.

### RES-EDITOR-02 — terminal manual direction

- При join previous paragraph сохраняет свой explicit block style: его распознанный terminal marker удаляется со старой позиции и ставится в конец объединённого paragraph. Если у второго paragraph тоже explicit marker, он заменяется previous override, чтобы не появлялся literal internal token.
- `Alpha {:vico-dir=rtl}\n\nBeta` → `AlphaBeta {:vico-dir=rtl}`; аналогично ltr. Public paragraph имеет нужный dir, text `AlphaBeta`, marker скрыт.
- Если previous paragraph auto, right-only explicit direction остаётся прежним. Есть controls на оба explicit overrides, wrapper coalescing, CRLF и empty trailing paragraph.
- Caret отображается **перед** скрытым terminal marker, включая empty paragraph join; native browser проверил offset 5 между Alpha и Beta. Undo/Redo восстанавливают точный source.
- Перенос опирается на уже распознанную parser metadata; direction grammar и отдельный LOC-08 translation round-trip не redesign-ились.

### Проверки

- До correction новые helper regressions: **11 FAIL /46 PASS**, подтверждая causal chains. После: **159 focused editor tests PASS**.
- **27 добавленных regressions/controls**: 16 helper cases и 11 mounted component cases. Проверяются source/selection, public ForumMarkdown, anchor whitespace/empty links, nested Enter, direction и history.
- Полный локальный app suite: **1179 tests /102 files PASS**.
- **96 semantic matrix controls PASS**: несколько nested strong/emphasis/strike/link fixtures, Clear по каждому слову и Enter в начале/середине/конце, сравнение rendered symbols/formatting и unselected link membership.
- **11 headless Chromium scenarios PASS**: DOM selection + actual toolbar/native keyboard → submitted source → public renderer; selected character references/Unicode, join caret, **11/11 exact Undo и Redo**.
- Final local `pnpm typecheck` и `tsc -b`, source lint (0 errors / прежний warning в ui.test.tsx), app build и UI-preview build PASS. Generated UI artifact вынесен за checkout до source lint.
- **[Exact-head CI #40573112857](https://github.com/iliya1947/vico-forum/actions/runs/40573112857) SUCCESS: checks `122432285927` — **1179 app tests /102 files PASS**; database `122432286421` — **326 PostgreSQL17 tests /30 files PASS**. Completed logs обеих jobs прочитаны; typecheck/lint, both builds, migration/schema/runtime probes и Workers smoke успешны.**
- Full local native PG/Workerd smoke на correction отдельно не повторялись: эти suites выполнены exact-head CI. Chromium — локальный component harness с synthetic API responses, не live deployment или owner visual acceptance. Внешние сервисы/production не затрагивались.

Артефакты: `/workspace/work/l7-correction-red.log`, `l7-correction-mounted.log`, `l7-correction-app.log`, `l7-correction-typecheck-final.log`, `l7-correction-tsc.log`, `l7-correction-lint.log`, `l7-correction-build.log`, `l7-correction-ui-build.log`, `/workspace/work/l7-correction/semantic-matrix-results.json`, `browser-final-results.json`.

PROJECT_STATE синхронизирован с correction. Локальный server/browser остановлены, dependency symlink удалён, implementation checkout clean. Предыдущие independent verdicts относятся к старому head; автор новый independent whole-PR self-review не выполняет.

**Handoff Мире:** coordinator whole-PR review PR #248 на `c87ca0ed6e0ec669ac6c97d5c68d547980e6541d`, затем non-author independent reviewers того же head. Correction завершена; implementation head фиксирован. **Лёва STOP.**

## PR #248 / L7 — verification согласованных findings, без correction (2026-10-27)

**Автор проверки:** Лёва — Codex-6.1 Sol, автор реализации. Это targeted verification трёх согласованных families, **не независимый whole-PR review**.
**Действующее назначение:** [#6451338805](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6451338805), заменившее correction-поручение #6451308188.
**Reconciliation:** [#6451237180](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6451237180).
**Проверенный PR:** [#248](https://github.com/iliya1947/vico-forum/pull/248), exact head `16f4b955c364e38ddc77dfce0cb4a995b4577bc3`, base `2ff3aeb3c8feeab3df4b674d711ff3845c09b0e0`. Remote head проверен в начале и перед публикацией; не изменился.

**Технический verdict: все 3 families подтверждены как current-Stage defects. Неверных findings среди назначенных нет. Ни implementation, ни project documentation не менялись; correction не начиналась.**

### 1. EDITOR-03 — CONFIRMED; nested wrappers и link whitespace различаются по непосредственной причине

**Nested reproduction:** source `**alpha *beta gamma* delta**`, выделить только `beta` в Simple и выполнить Clear formatting. Реальный submitted source:
```md
**alpha **beta ***gamma* delta**
```
Публичный renderer выводит literal `**alpha **`; невыделенный `alpha` теряет strong. Helper и настоящий toolbar path в Chromium дали один и тот же результат.

**Причина:** `editor-document.ts:597–612` вычисляет позиции закрытия/повторного открытия по raw slices исходника. Внешний prefix оканчивается delimiter вложенного emphasis, скрывающим trailing space. После удаления inner delimiter outer closing оказывается после whitespace и нарушает CommonMark flanking. Расчёт не учитывает видимый остаток после реконструкции вложенных wrappers.

**Дополнительный nested-link control:** `[**alpha beta**](https://x)`, clear `beta` →
```md
[**alpha**](https://x) beta[](https://x)
```
В actual public DOM появляются две ссылки, вторая с пустым textContent. Внешний suffix считается непустым из-за raw `**`, хотя это удаляемый delimiter ребёнка; затем link открывается повторно без оставшегося видимого содержимого. Это та же family некорректной реконструкции nested formatting.

**Отдельный обязательный subcase — link boundary whitespace:** `[alpha beta](https://x)`, clear только `alpha` → `alpha [beta](https://x)`. Невыделенный пробел оказывается вне anchor: before link text `alpha beta`, after `beta`. Это **не видимая потеря символа или поломка URL**: plain text остаётся `alpha beta`, но меняется link membership невыделенного пробела.

Непосредственная причина whitespace subcase — применение emphasis-style trim к link delimiters. Link label допускает boundary whitespace; переносить его наружу не требуется. Контроль на accepted base даёт `alpha[ beta](https://x)`; тот же current parser сохраняет link text ` beta`. Значит whitespace subcase — регрессия L7, а не ограничение renderer/CommonMark. Nested/empty-link неисправности воспроизводятся и на accepted base (с несколько иным source), то есть остаются незакрытыми частями исходного EDITOR-03.

**Current contract:** docs/EDITOR.md:39 и :81 — содержимое/нетронутые фрагменты сохраняются, Clear применяется только к выделенному содержимому. Flat strong control `**alpha beta**` → `alpha **beta**` работает; это не подтверждает корректность nested/link случаев. Reconciliation корректно объединяет subcases в одну family EDITOR-03, но их непосредственные причины не полностью одинаковы.

### 2. EDITOR-06 — CONFIRMED; уточнена причина на обоих visual boundaries

Source `**alpha *beta gamma* delta**`.
- Native Enter **перед beta** → `**alpha **\n\n***beta gamma* delta**`: первый paragraph — literal `**alpha **`, strong потерян.
- Native Enter **после gamma** → `**alpha *beta gamma***\n\n** delta**`: второй paragraph — literal `** delta**`, strong потерян.
- Контроль **внутри beta**, после `be`, → `**alpha *be***\n\n***ta gamma* delta**`: оба paragraphs сохраняют нужные strong/emphasis и не показывают лишние delimiters.

Все три paths выполнены native Enter в actual Simple component, затем FormData и actual public renderer.

**Причина:** `insertVisualParagraph`, editor-document.ts:390–405, один раз вычисляет leftSpace/rightSpace **до** удаления inner wrapper. Перед beta original prefix заканчивается `*`, после gamma original suffix начинается `*`, поэтому whitespace не обнаружен. Inner-wrapper removal открывает пробел для outer wrapper, но whitespace/flanking не пересчитывается; outer delimiter вставляется на неправильной стороне пробела.

Формулировка «работает по смещённой строке» описывает симптом слишком широко: для этих reproductions ключевой механизм — устаревший whitespace snapshot после удаления вложенного delimiter, а не доказанная самостоятельная ошибка пересчёта всех source offsets. Сам finding верен. На accepted base raw Enter тоже ломал enclosing formatting; current helper не закрыл эти nested boundaries.

**Current contract:** docs/EDITOR.md:39 (смысл, содержимое и нетронутые фрагменты) и исходный agreed EDITOR-06. Начало/конец visual leaf — штатные позиции ввода, не future-only case.

**Связь с EDITOR-03:** общий недостаток модели — raw delimiter text не равен видимому остатку после изменений вложенных wrappers. Но операции/функции и causal paths различны: partial formatting removal и paragraph insertion; это не дубликаты одного пользовательского действия и не основание убрать отдельный finding.

### 3. RES-EDITOR-02 — CONFIRMED; только предыдущий terminal marker в минимальном воспроизведении

Для обоих разрешённых значений `rtl` и `ltr`:
```text
Alpha {:vico-dir=rtl}

Beta
```
Native Backspace в начале Beta →
```text
Alpha {:vico-dir=rtl}Beta
```
Before первый public paragraph имеет `dir=rtl`, text `Alpha`; after единственный paragraph имеет `dir=auto`, text содержит literal `{:vico-dir=rtl}`. Для `ltr` наблюдается тот же механизм. Helper и native browser path совпали.

**Причина:** paragraph source range содержит terminal marker; `joinVisualParagraph` удаляет separator после этого полного range (editor-document.ts:448–455), не перенося metadata marker к концу объединённого paragraph. `applyParagraphDirections` в markdown-syntax.ts распознаёт только terminal token; после добавления Beta token закономерно становится обычным текстом. Это не ошибка unsupported value и не translation/serialization path.

**Контрпример, ограничивающий формулировку:** `Alpha\n\nBeta {:vico-dir=rtl}` → `AlphaBeta {:vico-dir=rtl}`; override второго paragraph сохраняется и marker не виден. Поэтому неверно расширять finding до «Backspace всегда теряет любое направление». Минимальный подтверждённый scope — manual marker предыдущего paragraph при join со следующим обычным paragraph. Для подтверждения дефекта не нужен выбор продукта между двумя конфликтующими explicit directions.

**Current contract:** docs/EDITOR.md §9 (:315–319), включая действующий способ сохранения manual override и отсутствие literal marker в visual/public views. Отдельный LOC-08 translation round-trip не задействован.

### Проверки, история и пределы

- **12 helper/AST cases**, **9 actual Chromium component scenarios**, **3 accepted-base Clear controls**; все заявленные outputs и контрпримеры воспроизведены.
- Browser использовал DOM selections, настоящий toolbar/native Enter/Backspace, FormData и ForumMarkdown. В **9/9** сценариях Undo восстановил точный source; finding не следует расширять до повреждения Undo/history.
- Локальный component harness с synthetic API responses; публикация в настоящую БД и live forum не выполнялась. Для этих source/DOM findings native PG не требуется. Full suites/typecheck/CI повторно не запускались; прежний green CI не опровергает новые воспроизведения.
- Артефакты вне checkout: `/workspace/work/l7-findings-verification/helper-results.json`, `helper-summary.jsonl`, `browser-results.json`, `base-results.jsonl`, `probe.ts`, `browser.py`, `base-control.ts`.
- Репозиторий остался на exact head, tracked/staged diffs отсутствуют; временный dependency symlink удалён, локальные browser/server процессы остановлены.
- Другие PASS-области L7 не пересматривались и не изменялись; этот отчёт не является новым whole-PR verdict.

**Мире:** targeted verification поддерживает reconciliation: три current-Stage families требуют correction. Настоящее поручение correction не разрешало; для её начала требуется следующее назначение. **Лёва STOP.**

## PR #248 — L7 implementation handoff (2026-10-27)

**Автор:** Лёва — Codex-6.1 Sol. Это отчёт реализации и её проверок, не независимый whole-PR review.
**Назначение:** [#6447752059](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6447752059).
**Implementation PR:** [#248](https://github.com/iliya1947/vico-forum/pull/248).
**Accepted base:** `main 2ff3aeb3c8feeab3df4b674d711ff3845c09b0e0`.
**Stable exact head:** `16f4b955c364e38ddc77dfce0cb4a995b4577bc3`, branch `fix/l7-editor-structure`; 1 commit, 18 files, +669/−66. PR open, mergeable=true; merge не выполнялся.

### Завершённая реализация: все семь пунктов L7

| Finding | Причина → исправление → проверяемый результат |
| --- | --- |
| EDITOR-03 | Partial clear открывал delimiter непосредственно перед пробелом, ломая невыделенный suffix. Boundary whitespace вынесен наружу новых wrappers; при необходимости underscore delimiters преобразуются в эквивалентные asterisks для intraword flanking. `**alpha beta**` + clear alpha → `alpha **beta**`; unit/selection regressions и native Chromium → FormData → public renderer. |
| EDITOR-06 | Simple Enter вставлял raw blank line внутрь inline wrapper. Source transformation закрывает и повторно открывает активные wrappers, убирает пустые, учитывает boundary whitespace. Strong/emphasis/strike/nested/link controls, неизменные соседние CRLF/code spans, native Enter → два strong nodes; exact Undo. |
| RES-EDITOR-02 | Native Backspace не имел операции перехода между отдельными contentEditable leaves. Ordinary paragraph join теперь изменяет source/history, сохраняет leading/trailing spaces, пустой trailing paragraph и body спойлера; совпадающие wrappers coalesce, underscore flanking сохраняется. Heading/list/code/table boundary controls, native keyboard, Undo/Redo и public renderer. |
| EDITOR-07 | Tab включал строку на exclusive selection end, в том числе closing fence. Конечная строка исключается при selection end сразу после newline. Indent/outdent regressions, closing fence с тремя пробелами и After paragraph, exact Undo; native Tab/public renderer. |
| EDITOR-11 | Initial publication использовала trim-returning requiredFormText для body. Topic/Help/reply читают raw form string, trim применяется лишь к проверке содержательности; IDs/title validation прежняя. Три action-level и native action → actual local adapter → service/repository → PostgreSQL regressions сохраняют leading indented code/trailing whitespace; topic replay не создаёт дубликат. Multipart EOL normalization не переопределялась. |
| MARKDOWN-CUSTOM-STRUCTURE-DIVERGENCE-01 | Plain CommonMark parse всего source расходился с renderer boundaries. Новый semantic tree использует canonical technical segmentation: отдельные prose/cells/spoiler bodies, literal summary. **Оба обязательных subcases выполнены:** mention recipients исключают literal summary/quoted and code cells; translation защита сохраняет dimensions/alignment/spoiler markers и internal Markdown, переводит human text и literal summary. Protection policy `cnt06-custom-structure-v2`; provider boundary injection rejected. Actual ForumMarkdown tests, native durable notification recipients. |
| MARKDOWN-SPOILER-01 | Каждый unmatched opener повторно сканировал оставшийся source. Fence-aware closing index вычисляется за O(n log n) / O(n) memory; opener lookup не сканирует suffix. Regression считает actual parser work на 1000 openers; 10 000 ограниченных mixed-fence/table/spoiler differential fixtures совпали со старой грамматикой. Production CPU limits не измерялись. |

### Проверки и доказательства

- Red regressions до правки: `/workspace/work/l7-red-first.log`, `l7-red-editor-translation.log`; исходные причины сверены с canonical audit findings.
- Полный локальный app suite: **1151 tests /102 files PASS**; после последнего paragraph boundary изменения **44 focused document tests PASS**; mounted/editor/translation focused checks проходили отдельно.
- Полный локальный PostgreSQL17: **326 tests /30 files PASS**, включая новый native publication/notification файл (3 cases).
- Typecheck, final `tsc -b`, source lint, app build, UI-preview build, локальный Workers smoke PASS. Один прежний lint warning в `app/forum/ui.test.tsx`; ошибок source lint нет. Generated UI artifact вынесен за checkout перед source lint.
- **9 headless Chromium checks PASS** на последнем implementation source: native Enter/Backspace, exact Undo/Redo, partial clear, equivalent/different delimiter spelling, empty/leading-space paragraph, spoiler body, exclusive-fence Tab, exact submitted source и public rendering. Это локальный component harness с synthetic API responses, не owner visual acceptance и не проверка production/browser deployment.
- Локальные artifacts: `/workspace/work/l7-browser/results-exact.json`, `/workspace/work/l7-all-native.log`, `l7-app-final.log`, `l7-paragraph-final.log`, `l7-typecheck-final2.log`, `l7-tsc-final.log`, `l7-lint-source.log`, `l7-build.log`, `l7-ui-build.log`, `l7-smoke-isolated.log`, `l7-segmentation-differential.ts`.
- **[Exact-head CI #40548381709](https://github.com/iliya1947/vico-forum/actions/runs/40548381709) SUCCESS: checks `122345095310` — **1152 app tests /102 files PASS**; database `122345094684` — **326 PostgreSQL17 tests /30 files PASS**. Lint/typecheck, both builds, migration/schema/runtime privilege probes и Workers smoke успешны; completed logs обеих jobs лично прочитаны.**

`PROJECT_STATE.md` синхронизирован; translation detail contract явно описывает custom structural boundaries. Scope не включает отдельный direction parse/serialize round-trip LOC-08 (L8), PR #247 literal-paste/mention-label correction и external/live services. Новых dependencies/schema/migrations нет.

Локальные HTTP/Workerd/Chromium процессы остановлены, disposable PG container/volume удалены, dependency symlink убран; implementation checkout clean. Автор не выполнял независимый whole-PR self-review.

**Handoff Мире:** coordinator whole-PR review PR #248 на `16f4b955c364e38ddc77dfce0cb4a995b4577bc3`, затем non-author independent reviewers того же head. Изменения проекта завершены. **Лёва STOP.**

## PR #247 — independent whole-PR review after second correction (2026-10-27)

2026-10-27. Назначение #236 comment 6443697491. **Verdict: CHANGES REQUIRED — 2 current-scope regressions.**

Exact head `46a7cda762ea763509ba3034c9be0c2aa0d6830e`, base `082530ab6a62c37f4d7acf17556bc496e677ab5f`; GitHub/local refs повторно сверены в конце, PR open/Draft, 13 changed files. Проверены все 13 файлов и весь EDITOR-10/LITERAL-TEXT-01/LOC-03/LOC-06, не только последняя correction. Автор Лира, независимый проверяющий Лёва не участвовал в реализации PR247. Findings других reviewers текущего цикла не использовались. PR245 не входит в задачу.

## A. P2 / LITERAL-TEXT-01 — raw-tab bypass отключает escaping и в prose context

Источник: `app/forum/clipboard-markdown.ts:12–16`, вызов из `app/forum/visual-markdown-editor.tsx:43–46` и forced-plain paste path.

Новая ветка возвращает любую строку с tab в leading indent без escaping, предполагая indented-code context. Этот контекст определяется не одной строкой clipboard: indented code не прерывает уже начатый paragraph; вставка может вообще происходить в середине prose, а native typing предварительно добавляет structural entity, предотвращающую code block.

Независимые actual mounted editor → FormData source → фактический ForumMarkdown/SSR воспроизведения:

1. Caret в конце существующего `Before`, Ctrl+Shift+V с clipboard `\t&copy; ~~literal~~`. Новый source `Before\t&copy; ~~literal~~`; published text `Before\t© literal`, создаётся `<del>literal</del>`. Предыдущий exact-head serializer `53f059d` даёт `Before\t&amp;copy; \~\~literal\~\~`, отображается literal `Before\t&copy; ~~literal~~` без del.
2. Полная forced-plain вставка `Before\n\t&copy; ~~literal~~` (также space+tab после newline): continuation line остаётся paragraph, entity декодируется и тильды форматируют. На прежнем head оба сохранялись literal. Вариант `Before\n\n\t…` с пустой строкой — проходящий code control, именно его покрывают новые author tests.
3. Native Simple input `\t\t&copy; ~~literal~~` получает source `&#9;\t&copy; ~~literal~~`; `    \t&copy; ~~literal~~` получает `&#32;   \t&copy; ~~literal~~`. Первый structural entity не позволяет code block, но оставшийся leading tab попадает под новый bypass. Оба публикуют ©/del вместо literal input. Извлечённая настоящая baseline visual escape function с baseline clipboard dependency сохраняет исходные символы в обоих случаях. Single-tab native input и ordinary leading spaces — проходящие controls.

Все три проявления — **одна причинная ошибка**, не три самостоятельных finding. Регрессия внесена именно второй correction относительно `53f059d`, а не историческая whitespace normalization. Raw tab сохранён, но это не оправдывает изменение видимых символов plain input. Ordinary TSV conversion и intentional Advanced Markdown к finding не относятся.

Минимальный correction scope: различать фактический prose/code context с учётом позиции вставки, предшествующих строк и structural prefix visual typing; не использовать lexical leading-tab как достаточное доказательство code context. Закрепить mid-paragraph/continuation/native mixed-indent случаи вместе с изолированным tab-code и TSV/Advanced controls. Общая переработка Markdown renderer не обоснована. Реализация не менялась.

## B. P2 / EDITOR-10 — numeric encoding допустимых control characters заменяет имя символом U+FFFD

Источник: `app/forum/mentions.ts:22–29`. Все ASCII controls превращаются в numeric references, но parser не обязан декодировать запрещённые numeric-reference code points в исходный character. Для части controls он возвращает replacement character.

Это не гипотеза о потенциальном будущем name domain. Проверен **настоящий текущий public email/password signup runtime → actual PostgreSQL17** в disposable schema:

- имя с code points `[65,1,66]` (A + U+0001 + B), signup HTTP200, PostgreSQL хранит ровно `[65,1,66]`;
- имя `[65,127,66]` (A + U+007F + B), signup HTTP200, БД также сохраняет его без изменения.

Новый serializer создаёт соответственно `[A&#1;B](/en/users/member-42)` и `[A&#127;B](/en/users/member-42)`. Фактический Markdown parser даёт text child `A�B` (U+FFFD вместо исходного control). Actual Simple и Advanced autocomplete для первого имени + published ForumMarkdown подтверждают видимую замену. Старый serializer того же допустимого имени сохраняет прежнее значение; это **новая регрессия второй correction**. Immutable recipient/profile destination не меняются.

Дополнительная enumeration ASCII1–127 (внутри `A…B`, не trim на краю) обнаруживает replacement для1–8,11,14–31,127. NUL не включался: PostgreSQL text его не допускает. Все остальные проверенные ASCII syntax punctuation/обычные characters сохраняются как единый text child одной profile-ссылки; обычные Unicode/ampersand/tilde/autolink cases проходят. Поэтому сама защита autolink действительно работает, но утверждение «весь уже допустимый name domain» ещё не выполнено.

Минимальный scope: literal serializer должен учитывать реальные character-reference decoding semantics и сохранять уже допустимые данные. Изменение допустимого name domain/миграция существующих имён не являются автоматически разрешённым обходом этой serializer regression. Исходные ограничения sign-up trim/nonblank/≤100 рассмотрены, DB searchMentionableUsers возвращает stored user.name без такой замены. OAuth/provider/production не проверялись.

## Прежние findings и остальной scope

- Isolated raw-tab Ctrl+Shift+V теперь действительно показывает `&copy;`/`~~literal~~` без служебных escapes в code context. Отдельно найден A, где code context отсутствует.
- Autolink-like имя `Ada <https://example.test> &copy; ~~name~~` через оба autocomplete paths теперь остаётся одной literal profile-ссылкой, без внешнего anchor/formatting; member42 сохраняется. Отдельно найден B для реально допустимых controls.
- LOC03 malformed nesting performance не регрессировало: scanner по-прежнему однопроходный по quotes/escapes/depth. На этом head повторены actual publisher/compiler/verifier с malformed input длиной31/4099/10000 —9 ограниченных controls возвращают Malformed nesting без публикации. Source/options/lng/placeholders/provenance/plural/compiled/i18next paths просмотрены вместе с тестами. Findings нет.
- 4+ leading spaces, literal tilde mention, Setext equals/dashes сохраняют прежние исправления. Raw Advanced Markdown по-прежнему даёт intentional h1/del. HTML rich paste и технические code/table branches не изменены второй correction.
- LOC06 authoritative target/revision checks и no-segments guard перед source resolver сохраняются. Пересмотрены route/capability/planner/store paths; независимая actual HTTP action→capability→real planner/resolver matrix10 cases вновь PASS (automatic/explicit blank/whitespace/fenced/inline-only и prose202). Permission/guest/origin/disabled runtime guards сохранены. Findings нет.
- PROJECT_STATE описывает задуманный literal contract; A/B нарушают его в указанных поддерживаемых условиях. Schema/dependencies/public endpoints не менялись в PR247. Это whole-PR code review текущего Stage, не аудит внешних сервисов или всей документации.

## Проверки / evidence

- Лично exact head: **1159 application tests /102 files PASS**,147.91s; typecheck PASS; lint12changed TS/TSX files PASS; app/UI-preview builds PASS (existing chunk-size advisory).
- **27 independent editor/parser/generation controls PASS**,42 unrelated generation-fixture cases skipped; дополнительно1midline regression probe PASS и2actual signup/PostgreSQL domain probes PASS. Controls утверждают observed defects и baseline comparisons; их PASS не implementation acceptance. Enumeration127characters внутри одного test, не127отдельных tests.
- Первый property probe ожидал literal roundtrip для всех controls и упал на code1; последующий probe перечислил весь диапазон и подтвердил actual mismatch. Это обнаружение дефекта, а не product/test-code correction. Проверяемые implementation tests не правились.
- CI #40507554527 jobs и completed logs независимо прочитаны: checks122200650876 SUCCESS (1159/102), database122200651009 SUCCESS (304PG/28), applicable checks PASS. CI synthetic merge99f9c54… head46a7cda с указанной base. Full local PG suite не повторялась и не присваивается; лично выполнены только2 targeted PostgreSQL signup cases сверх app suite.
- Evidence: `/workspace/work/pr247-r3-{app,type,build,lint,preview,final-probes,midline,name-domain,validation-chain}.log`; saved probes/baseline sources в `/workspace/work/pr247-r3-evidence/`.
- Production/external/owner visual не выполнялись; OAuth не вызывался, только локальный email/password endpoint на synthetic accounts. Редакторные proofs — mounted jsdom events и actual ForumMarkdown SSR, не Chromium/owner visual acceptance.

Временные probes удалены, tracked/untracked checkout чист, git diff --check PASS; preview artifact вынесен, disposable PG container/volume остановлены и удалены. Implementation/main и удалённые отчёты/комментарии не менялись. Findings сначала переданы только разработчику в текущем чате по independent-review правилу AGENTS.md. Эта публикация выполнена по прямой команде разработчика «Публикуй». Следующий шаг — согласование опубликованных reviews координатором в #236. Исправления не начинались. Лёва STOP.


## PR #245 — bounded v2 storage-fence implementation handoff (2026-10-27)

2026-10-27, Asia/Jerusalem. Assignment #236 comment 6442252441; feasibility6441222913. Author implementation verification, not independent whole-PR review.

Existing PR245/branch fix/l6-attachment-storage-zip. Previous head c00b416eabe5f8cbe68b4fc35a175f0d7ef6e757 → stable new head cc0f3ad5d5888311d833fe5cbfdb1ccc208206a8, base082530ab6a62c37f4d7acf17556bc496e677ab5f. No new branch/PR. Commit changes 24 paths relative to previous head; PR totals26 changed paths relative to base. Implementation title/body updated.

## Changed invariant

Post-write terminal knowledge is no longer the only route to finite cleanup. A request first commits PREPARING journal, performs one create-only reservation PUT at one fresh physical key, then commits READY with the positively acknowledged reservation ETag under an unclaimed journal condition. Only then may the unique payload PUT positively match that ETag. A claimed journal can never activate again, even after lease expiry. Metadata for a fenced key always requires an unclaimed READY journal, including when an internal caller omits requireUploadRecord; the route additionally requires a structurally verified stored result.

Cleanup's durable claim excludes metadata admission. For READY the initializer already finished and is not repeated; DELETE removes a payload committed before it, or makes a late payload's positive match false. PREPARING has no payload permission and cannot gain it after claim. A successful DELETE therefore permits journal retirement without the removed completeUploadObjectWrite/write_completed_at transition. Failed/unknown DELETE or DB retirement keeps discoverability for later token-fenced cleanup. Authoritative assets are reconciled to existing reference-aware cleanup, not deleted as upload orphans.

A late PREPARING initialization can leave only a reservation, never data. A new bounded marker sweep walks the dedicated v2 namespace with a durable cursor and fenced lease. It verifies absence of both journal and authoritative asset before deleting candidates from LIST. A stale LIST plus asset-present check cannot destroy accepted data; DB errors never become negative ownership proof. Old processors cannot overwrite a reclaimed checkpoint. Full cycles revisit keys materialized before an earlier cursor. No permanent per-key tombstone and no same-key initialization retry. Default bounded pass: up to20 journal/asset deletes plus at most5 listed entries/marker deletes; small custom batches retain one marker entry. Liveness assumes eventual DB/storage availability and ongoing fair cleanup at serviceable load, not a fixed elapsed-time proof of remote settlement.

The Worker adapter passes create-only/positive-match conditions and server metadata through actual R2 operations. Existing known-length streaming/cancellation is preserved. A successful reservation waits1 second before returning to activation/payload, spacing same-key writes according to documented R2 per-key rate. This adds about1 second to normal successful uploads; it is pacing, not a retry. An immediate best-effort DELETE may still fail, and the journal/sweep recover it.

## Migration/schema policy

Per assignment, compatibility with this PR's intermediate v1 design is removed: accepted0000–0045 remain byte-for-byte unchanged, unmerged0046/0047 replaced by one0046_attachment_upload_fences. It creates forum_attachment_upload_objects with reservation_etag and forum_attachment_sweep with cursor/claim identity, seeded singleton. Schema snapshots/journal/manifest synchronized; actual manifest49 tables verified against PostgreSQL. Existing web capability retains only INSERT/SELECT/UPDATE for upload journal; sweep remains maintenance-only, no new web grant. Migration guard confirms1 new migration and accepted history unchanged; Drizzle generation finds no schema changes.

Existing registered legacy private/<uuid> assets remain readable/reference-aware, but new storage admission accepts only fenced-v1 identities. No claim about historical untracked storage, deployed old writers or production state: owner explicitly permits replacing the unmerged intermediate design; no external migration/reconciliation is performed.

## Verification personally executed

- Full application:1123 tests / 102 files PASS,160.22s; unchanged ZIP classic65535/reverse order/ZIP64/descriptor/bounded-read cases included. No whole compressed-payload buffer/decompression added, ATTACH-02/ATTACH-STRUCT-01 code unchanged.
- Full PostgreSQL17:323 tests / 29 files PASS,50.31s. Protocol-native19 cases PASS: successful payload/metadata; terminal rejection/short/read; actual server-side activation UPDATE timeout; actual post-payload metadata INSERT timeout; commit/rollback/lost metadata ACK; genuinely unknown full-body commit before/after revoke; blocked in-flight payload; late PREPARING initializer with/without ACK; one initialization/no same-key retry; claimed/expired journal activation denial; metadata READY gate; bounded durable pagination; real SQL ownership-read failure; concurrent/expired journal and sweep claims/checkpoint fencing; asset-present stale-list protection.
- Local pinned Workerd + R2 emulator, actual unchanged-at-head helper/adapter:9 controls PASS. normal5000stored; short/read typed failures; activation failure payload0; full PUT lost ACK; initialization lost ACK reservation1/activation0; late in-flight conditional payload after DELETE fails; explicit forbidden re-create ABA negative control demonstrates why oldkey cannot be reused; actual bounded LIST cursor finds/reclaims markers. This is local emulator/native FixedLengthStream evidence, not live R2 acceptance. Native PostgreSQL tests separately exercise route/real SQL/cleanup.
- Typecheck (wrangler types/react-router typegen/tsc-b) PASS. ESLint0errors/1preexisting unused-disable warning in ui.test.tsx. App/UI-preview builds PASS, existing chunk-size advisory only.
- 152 .github script tests PASS; migration guard1new PASS; Drizzle metadata/check/schema parity PASS; manifest49-table parity PASS; runtime positive/negative privileges, split-authority provisioning, credential diagnostic/recovery/bootstrap compensation probes PASS; built application Worker HTTP smoke PASS. git diff --check PASS.

First full native run had the obsolete48migration count assertion after replacement by47total migrations, and one reconciliation CLI10s deadline under parallel application/native load. Count expectation corrected; isolated retry64 tests PASS, then complete native rerun323 PASS. No test timeout enlarged. Initial disposable PG used trust authentication, which invalidated the credential probe's expected password rejection; local host authentication changed to SCRAM, recovery/bootstrap probes then passed. Initial preview override omitted a password required by Miniflare; corrected only the local test URL. Early unit/native fixture failures were updated for reservation/activation contract; final suites above include fixes. These diagnostics do not describe production incidents.

## CI and handoff

Exact-head CI40517308507 SUCCESS: checks122234213784 and database122234213258 both SUCCESS. Completed job logs independently fetched:1123 application +323 PostgreSQL tests, migration-history1new, manifest49 tables and applicable checks PASS. CI tests synthetic merge6b9455a… of this exact head with the designated base; personal local suites ran directly on cc0f3ad.

Local diagnostic Worker/application preview stopped, disposable PostgreSQL container stopped/removed, dependency symlink removed; implementation checkout clean. Evidence retained outside checkout.

No production/external account/services, scheduler, paid resources, OAuth/backup/restore/owner visual actions. CPU/deployment candidateC and PR247 not changed. Local evidence /workspace/work/l6-v2-*.log and l6-v2-worker-check/{entry.ts,entry.mjs,wrangler.jsonc,results.json,server.log}. Next: Mira new exact-head coordinator cycle, then non-author independent reviewers. Author does not self-review; no merge or L7/L8 work. STOP after publication.


## PR #247 — independent whole-PR re-review after correction (2026-10-27)

2026-10-27. Назначение #236 comment 6441255042. **Verdict: CHANGES REQUIRED — 2 подтверждённых current-scope findings.**

Новый exact head `53f059dbd43ecb8339f2b611eb4eef3ac6774cff`; base `082530ab6a62c37f4d7acf17556bc496e677ab5f`. GitHub head/base повторно подтверждены в конце проверки, PR open/Draft, 13 changed files. Проверены все 13 файлов и весь scope steps2–5: EDITOR-10, LITERAL-TEXT-01, LOC-03, LOC-06, включая underlying editor/parser/renderer/validation/planning boundaries и актуальные применимые Stage/SOT требования. PR #245 в задачу не входил и не менялся. Автор реализации Лира; проверяющий Лёва к реализации этого PR не привлекался. Findings других reviewers этого цикла не читались и не использовались.

## A. P2 / LITERAL-TEXT-01: Ctrl+Shift+V с ведущей табуляцией показывает новое escaping пользователю

`app/forum/clipboard-markdown.ts:6–17`, actual forced-plain path `app/forum/visual-markdown-editor.tsx:583–585`.

Обычный paste с tab направляется в spreadsheet conversion; поэтому finding воспроизведён именно через **реальный mounted Ctrl+Shift+V** (keydown modifier + paste + selection), а не подменён ordinary paste. Это предусмотренная пользовательская команда «только текст без форматирования», docs/EDITOR.md §10.

| Clipboard | Base source / видимый code text | Head source / видимый code text |
|---|---|---|
| tab + `&copy;` | tab + `&copy;` / `&copy;` | tab + `&amp;copy;` / `&amp;copy;` |
| space + tab + `~~literal~~` | space + tab + `~~literal~~` / `~~literal~~` | space + tab + `\~\~literal\~\~` / `\~\~literal\~\~` |

True baseline serializers извлечены из указанной base через git show; тест использует фактический ForumMarkdown renderer. New head guard защищает только четыре ASCII spaces. Tab остаётся indented-code marker; в code content ampersand entities и backslash escapes не декодируются, поэтому новый escapeText меняет видимые символы. Native Simple typing tab+entity остаётся literal через structural `&#9;`, что является passing control.

Причина относится к изменениям этого PR относительно base. Это **остаток текущей literal escaping regression**, не новая потребность превратить tab в structural entity. Решение автора сохранить прежнюю raw-tab сериализацию учтено: finding НЕ требует менять raw-tab контракт, spreadsheet detection или превращать весь paste в prose. Оно требует не показывать пользователю новое служебное escaping в уже существующем forced-plain пути. Четыре leading spaces теперь исправлены, но это не устраняет приведённый tab-case.

Минимальный correction scope: serialization/escaping в согласованном raw-tab context, с regression реального Ctrl+Shift+V + published render, контролями ordinary TSV paste и native typing. Во время review не исправлялось.

## B. P2 / EDITOR-10: допустимый autolink-подобный display name перестаёт быть единой буквальной profile-link подписью

`app/forum/mentions.ts:17–21`; имя разрешено текущим sign-up name validation (`app/auth/auth.server.ts:45–54`: string, trim, nonblank, ≤100), reader/mentions route не исключает `<…>`.

Authoritative имя `Ada <https://example.test> &copy;` через actual autocomplete в **Simple и Advanced** сериализуется как:

```text
[Ada <https://example.test> &amp;copy;](/en/users/member-42)
```

Actual ForumMarkdown/SSR вместо одной буквальной profile-link подписи создаёт:

- profile anchor с текстом `Ada `;
- отдельный внешний anchor `https://example.test`;
- ` &copy;` вне profile anchor.

Видимый combined text — `Ada https://example.test &copy;`: угловые скобки имени исчезли, а часть authoritative display name стала внешней ссылкой. Это обычный HTTPS autolink CommonMark, не full-GFM expansion и не запрос нового parser feature. Mention serializer не экранирует `<`/`>`; escaping `&` и `~` не предотвращает этот interpretation.

Проверены фактические parsed AST, HTML, mounted chooseMention paths и recipient extraction. Recipient остаётся `member-42`, исходный profile destination не подменяется. Ошибка notification recipient, XSS или переход на произвольную схему не заявляются.

На извлечённом baseline serializer такой autolink тоже создаёт два anchors. Значит **это не новая регрессия correction**, а ранее существовавший незакрытый случай текущего EDITOR-10 literal authoritative-label результата. Исходный task/PR и текущий PROJECT_STATE объявляют имя authoritative literal text; пример включает также character-reference-подобный текст, targeted entity/tilde controls проходят. Проблема не переносится в future-only work просто потому, что причина старше correction.

Минимальный correction scope: literal escaping link-label для поддерживаемого parser/autolink syntax + published-label regression в обоих editor modes. Не менять member IDs, recipient logic, auth model или требования к допустимым именам как обход.

## Проверка прежних четырёх findings на новом head

1. **LOC-03 performance — конкретная регрессия устранена.** Nested-repeat regexp удалён; scanner двигается вперёд по quotes/escapes/depth. Actual UiTranslationResultPublisher.publish, compileNamespaceBundle, verifyCompiledNamespaceBundle проверены malformed input длиной31,4099,10000: все9 controls возвращают Malformed nesting без записи. Publish/compile ~0.5–1.3ms; verifier ~16.6–20.1ms вместе со своей работой. Ранее31символ не возвращался за2s. Корректные nesting/options/placeholders, смена lng, malformed/unsupported syntax и реальная i18next интерпретация проверены source/tests. Ни quota, ни production CPU утверждений нет.
2. **Четыре+ spaces paste — исправлено для прежнего воспроизведения.** Actual mounted paste и published render сохраняют entity/tilde text без code/visible escapes; отдельно выявлен A с tabs.
3. **Literal tilde mention — исправлено.** `~~Ada &copy;~~` через Simple/Advanced autocomplete и настоящий renderer остаётся literal, без del; member42 сохраняется. Отдельно выявлен B с autolink syntax.
4. **Setext equals — исправлено.** `Heading\n===`, `---`, repeated equals/dashes проходят actual paste; native typing с реальным Enter затем marker не создаёт heading/hr. Advanced raw source продолжает создавать intended h1/strikethrough, Bold после native entity text работает.

## Остальной whole-PR scope

- LOC-06: authoritative revision/target identity checks сохраняются до нового no-segments guard. Guard до locale resolver предотвращает пустой/защищённый-only content planning. Caller prose не подменяет authoritative empty revision. Authz/guest/origin/disabled runtime, source resolution/prose capability/current translation/task enqueue paths рассмотрены, контракт не менялся. Независимая расширенная actual HTTP action→default capability→real planner/resolver matrix10 cases PASS: automatic/explicit blank, whitespace, fenced, inline-code-only + prose202. Findings нет.
- LOC-03: publication и compiled bundle boundaries используют общий validator; size/placeholders/protected terms/plural branches и provenance сохранены. Новый scanner не вводит повторного backtracking. Дополнительных findings нет.
- Literal/editor controls: ordinary paste, multiline Setext, leading spaces, entity/tilde typing, repeated native edits без double encoding, intentional toolbar Bold/Advanced raw semantics проверены. HTML clipboard conversion сохраняет technical code branches; table serialization/recipient API contracts не менялись.
- PROJECT_STATE additions соответствуют четырём declared fixes и LOC06 implementation, дата и stale LOC06 sentence исправлены. Обнаруженные A/B означают, что общий literal-label/text результат ещё не полностью обеспечен.

## Наблюдения, не объявленные новыми дефектами

Native editable leaf имеет aria-multiline=false и нормализует искусственно присвоенный ему newline в space. Первоначальный diagnostic probe, присвоивший `Heading\n===` непосредственно leaf.textContent, не моделировал native Enter. Его ложное expectation отброшено; заменён actual Enter control, который прошёл.

На continuation prose lines mdast сохраняет structural leading whitespace, а published Markdown→HTML soft-line handling его нормализует. Сопоставление ordinary text с base даёт то же поведение. Это не включено в findings этого PR как новая escaping regression и не использовано для требования общего renderer rewrite.

Обычный tab-paste превращается в таблицу по существующему spreadsheet path. Это намеренное поведение, не finding A; A ограничен Ctrl+Shift+V. `<b>Ada</b>` control отображается literal (HTML не выполняется); B относится к конкретному поддерживаемому autolink path.

## Проверки / доказательства / границы

- Лично на exact head: **1148 application tests/102files PASS**,135.07s; typecheck PASS; ESLint12изменённых TS/TSXfiles PASS; app build и UI-preview build PASS. Preview выдаёт существующее nonblocking chunk-size предупреждение.
- **43 независимых diagnostic controls PASS /42 unrelated route tests skipped**: 33editor/parser/renderer/control +10generation route. Часть asserts фиксирует подтверждённые defects/baseline comparisons; их PASS не означает acceptance.
- Nine bounded actual publication/compiler/verifier controls PASS. Первоначальный diagnostic launcher не нашёл top-level esbuild, затем .ts runner выбрал CJS для top-level await; исправлен только launcher на tsx/.mts. До исправления эти запуски не достигли validation; времена взяты только из финального успешного лога.
- Independently fetched CI #40491273526 jobs и completed logs: checks122145529893 SUCCESS (1148/102), database122145530412 SUCCESS (304nativePG/28files + applicable probes/Worker smoke). CI checkout synthetic merge b011214… head53f059d с base082530a; личные local app runs непосредственно на head. Локальная PG suite для review не запускалась и не присваивается.
- Artifacts `/workspace/work/pr247-r2-{app,type,lint,build,preview,final-probes,validation-chain}.log`, diagnostic editor/generation/base serializers и `pr247-r2-validation-chain-probe.mts`. Временные tests/serializers удалены из checkout, symlink и preview dist вынесены/убраны; tracked/untracked checkout чист, git diff --check PASS.
- Нет production/provider/Queue/external services/OAuth/backup/restore действий. Browser end-to-end и owner visual acceptance не заявляются: редакторные proofs mounted jsdom events + actual parser/ForumMarkdown SSR. Implementation/main/GitHub reports/comments не менялись; никаких исправлений в review.

Результат сначала передан только разработчику в текущем чате, согласно independent-review publication barrier AGENTS.md. Эта публикация выполнена по прямой команде разработчика «Публикуй». Следующий шаг — согласование опубликованных reviews координатором в #236. Исправления или самостоятельную сверку с чужими reviews не начинал. Лёва STOP.


## PR #245 — storage-fence feasibility proof (2026-10-27)

Дата: 2026-10-27. Назначение #236 comment 6440923322, после плана 6440713368. GitHub/local head повторно подтверждён: `c00b416eabe5f8cbe68b4fc35a175f0d7ef6e757`, base `082530ab6a62c37f4d7acf17556bc496e677ab5f`.

**Verdict: протокол для новых uploads архитектурно выполним в существующих R2/Workers + PostgreSQL, но требует расширить текущий внутренний интерфейс. Одних conditional PUT недостаточно.** Необходимы pre-write reservation, durable activation, positive ETag condition и bounded discovery/sweep поздних reservation-маркеров. Нового внешнего сервиса не требуется. Это feasibility/design result, не implementation acceptance; PR/schema/dependencies не изменены. Legacy unconditional writers остаются отдельным reconciliation/migration case, безопасный автоматический drain для них не доказан.

## A. Проверенные primitive и границы доказательства

Официальные документы:

- https://developers.cloudflare.com/r2/reference/consistency/ — conditional write проверяется атомарно при commit; отрицательный read не завершает ранее начатую запись.
- https://developers.cloudflare.com/r2/api/workers/workers-api-reference/ — Workers put supports onlyIf/etagMatches и customMetadata; precondition failure возвращает null; LIST имеет prefix, limit, cursor, include customMetadata.

Текущий PrivateAttachmentBucket возвращает только size, скрывает ETag и не предоставляет condition/custom metadata/LIST. Текущий Workers adapter отправляет unconditional PUT. Через этот неизменённый интерфейс нужного протокола нет. Ни DB claim, ни новые колонки сами по себе не отменяют такой PUT.

Дальнейший протокол — собственный вывод из documented primitive. Исполняемая конечная модель проверяет interleavings при этих семантиках, не моделирует всю сеть/provider и не является математическим доказательством любого возможного protocol. Дополнительный local Workerd + local R2 emulator проверяет конкретные API controls, не production R2.

## B. Конкретный минимальный протокол v2

### 1. Одноразовая identity и PREPARING

Новый серверный random physical key в выделенной v2 namespace, например `private/fenced-v1/<uuid>`. Не переиспользовать key при retry, не восстанавливать reservation по старому key. До любой storage mutation записать journal PREPARING. Протокол определяется namespace/version; v1 rows нельзя принять за PREPARING v2.

В рамках одного key — ровно одна логическая initialization PUT и не более одной логической payload PUT. При неизвестном initialization outcome request прекращает эту попытку: не повторяет initialization на том же key и не начинает payload. Новый пользовательский retry получает новую physical identity. Возобновление payload по одной лишь найденной reservation запрещено.

### 2. Reservation и durable READY

Один небольшой служебный PUT на тот же key, с If-None-Match:* и server-only customMetadata `kind=reservation` + protocol identity. Получить положительный ACK и ETag reservation. Payload/body клиента не используется как служебная metadata.

Затем выполнить атомарный DB activation PREPARING→READY с этим ETag, только если journal всё ещё существует, не claimed и принадлежит этой попытке. Только подтверждённое committed activation разрешает payload. Никаких data PUT из PREPARING. Потеря activation ACK не разрешает optimistic upload; допустимо прекратить попытку. Cleanup увидит фактическое committed состояние БД.

Свойство READY: initialization уже положительно завершилась, повторных initialization для key нет, следовательно старая reservation не сможет появиться повторно после её удаления. Если claim победил activation, writer не получает data permission.

### 3. Payload

Единственный payload PUT на тот же key с `onlyIf: {etagMatches: reservationEtag}`. Это положительное совпадение существующего объекта, а не If-None-Match. Payload PUT заменяет server metadata на `kind=data`. Существующие streaming/length/structural gates и private asset authorization сохраняются.

Completion marker может оставаться для совместимости и metadata gating, но новое orphan retirement больше не зависит от успешности post-PUT UPDATE этого marker. Если settlement UPDATE не записался, request по-прежнему может вернуть503 без metadata; cleanup располагает pre-write протоколом, которого сейчас нет.

### 4. Cleanup как отзыв права

Под прежним DB row lock проверить authoritative asset и зафиксировать claim. Registered object передать существующему reference-aware asset cleanup, не удалять как orphan. Claim атомарно запрещает дальнейший activation и metadata admission.

Для PREPARING: ни один data writer не был разрешён и после claim уже не будет. Возможна только поздняя initialization reservation.

Для READY: initialization уже завершена, её повторение запрещено. Выполнить DELETE. Если payload commit был раньше DELETE, bytes удаляются. Если commit позже DELETE, positive ETag match не проходит, поскольку reservation уже отсутствует. Следовательно **положительно завершившийся DELETE сам становится revoke для v2 READY**, а не просто наблюдением отсутствия.

После положительного DELETE retire journal по тому же claim token/version. Если DELETE ACK неизвестен — journal сохраняется, следующий pass повторяет DELETE. Если DB retirement не записался — journal сохраняется, следующий pass повторяет безопасный DELETE. Durable claim запрещает вернуть попытку в READY/unclaimed, даже после истечения lease: новый claim только продолжает cleanup.

### 5. Конечный lifecycle поздних reservation

Claim/DELETE могут обогнать initialization PREPARING; поздно закоммившаяся initialization создаст reservation после retirement journal. Data PUT всё равно запрещён: activation больше невозможен. Но оставить такой marker навсегда нельзя.

Поэтому обязательна **bounded paginated sweep** v2 namespace с server-only reservation metadata и durable cursor/checkpoint. На каждом проходе — жёсткий лимит просмотренных entries, DB probes и deletes; общий budget делится с существующим cleanup так, чтобы обычные assets и journal не голодали. В конце страницы/цикла прогресс сохраняется, следующий полный цикл снова начинается с начала prefix. Это итеративный обход v2 keyspace, с реальной дополнительной стоимостью; не бесплатная операция и не полный scan в одном request.

Перед удалением найденного reservation-кандидата подтвердить в authoritative DB **отсутствие и journal, и asset** для этого physical key. DB failure/timeout не трактовать как отсутствие. LIST может быть устаревшим относительно последующего commit: без проверки asset можно удалить уже принятый файл. No-reuse identity и обязательный journal для metadata исключают создание нового authoritative owner после положительно установленного отсутствия обоих.

Если journal ещё существует — marker sweep не вмешивается; его lifecycle ведёт journal cleanup. Если asset существует — skip независимо от старого LIST. Data objects не являются targets marker sweep.

Каждая попытка имеет максимум одну initialization commit. После её фактического завершения поздний marker обнаруживается очередным fair sweep и удаляется. Не требуется постоянный per-key tombstone. Liveness предполагает eventual availability, продолжающиеся bounded cleanup runs и fair progress при обслуживаемой нагрузке; конечное число operations данного key, а не фиксированный wall-clock срок, обеспечивает отсутствие бесконечного recreation.

## C. Causal proof / ABA

Безопасность получается из двух разных барьеров:

1. PREPARING защищён DB activation fence: после claim не может появиться data writer, даже если reservation materializes позже.
2. READY защищён storage positive-match fence: после DELETE старая payload operation не проходит условие, а initialization уже завершилась и не повторяется.

Ключевое отсутствие ABA — следствие single initialization, запрета повторного использования key и DB activation, а не предположение об уникальности ETag. Даже identical reservation body/ETag нельзя заново записывать на этот key. При нарушении этого правила старый PUT действительно снова получает право: counterexample есть в модели и локальном R2 control.

Таким образом terminal outcome не требуется переносить в durable storage после факта, чтобы cleanup смог остановить будущую materialization. Права ограничены до payload; потеря post-terminal settlement UPDATE больше не делает terminal и genuinely unknown writer неразрешимо различимыми для cleanup.

Никакой одинаковый timestamp/grace не используется как доказательство завершения старого RPC. Genuine unknown payload сохраняется tracked до подтверждённого v2 DELETE-revoke. В v1 этого свойства нет.

## D. Executable evidence

`model.py` разделяет initialization commit/ACK, DB activation, payload begin/commit/ACK, metadata admission, claim/DELETE/retire и marker LIST/DB-check. Condition проверяется в момент commit. Перечислены 7920 допустимых порядков двух цепочек и sweep; 8 fault modes ×13 crash positions = **823680 schedules PASS**.

Modes: normal; initialization не committed; initialization ACK lost; activation не committed; activation ACK lost; settlement не committed; payload ACK lost; terminal data failure. Crash прекращает последующие local request steps, но не отменяет ранее начатые remote commits. Финальный fair orphan sweep после всех delayed commits проверяет finite control-state reclamation. Это модель одного key; cursor fairness, concurrent claim token реализации и actual PG новой схемы остаются обязательными implementation acceptance tests.

Четыре негативных controls нашли counterexamples:

- Заменить positive match на If-None-Match: payload создаётся после DELETE и остаётся untracked.
- Разрешить recreated reservation с прежним ETag: старый delayed payload проходит после journal retirement (ABA).
- Убрать orphan sweep: late initialization оставляет control object без journal.
- Не проверять authoritative asset при stale LIST: accepted payload удаляется marker collector.

Local pinned Wrangler/Workerd + эмулированный R2: **6/6 controls PASS** — reservation→positive-match payload; DELETE→positive-match rejection; committed payload→DELETE; поздний marker виден LIST и удаляется; forbidden recreation действительно снова разрешает старый ETag; FixedLengthStream body in flight + DELETE до окончания body приводит к отказу conditional PUT. Последний case — local emulator behavior, а general commit-semantics опирается на official docs.

Artifacts: `/workspace/work/pr245-fence-feasibility/{model.py,results.json,entry.mjs,wrangler.jsonc,workerd-results.json,server.log}`. Диагностические files вне PR, без dependencies/schema modifications. Broad application/PG suites не повторялись: новой реализации нет, whole-PR acceptance не заявляется.

## E. Минимальное расширение и обязательные acceptance gates

Требуются: internal bucket reservation/conditional payload operations с ETag+metadata; bounded LIST API; durable PREPARING/READY distinction (например nullable reservation ETag в v2 journal, не переосмысление terminal write_completed_at); один lease/token-fenced checkpoint обхода; v2 key validator/namespace; protocol-aware journal/metadata cleanup. Конкретные migration/table names — implementation design, не уже внесённые изменения. Очередь, новый внешний coordinator, полный upload buffer или новая dependency не требуются данным протоколом.

Дополнительно к перечисленной executable matrix implementation должна подтвердить actual action→adapter→PostgreSQL CAS/claim/metadata races; real server-side settlement SQL timeout; settlement/metadata commit rollback/lost ACK; concurrent expired claims; durable cursor recovery, empty/truncated pages, marker после cursor boundary; budget/fairness при большом v2 prefix; no protocol downgrade и no same-key initializer retry.

## F. Legacy boundary

Existing v1 NULL row с потенциальным unconditional PUT нельзя сделать v2 добавлением ETag/колонки или ожиданием grace. Такой PUT игнорирует условие и может материализовать bytes после DELETE. Legacy rows с durable settled marker/authoritative asset могут завершаться прежним безопасным путём; genuinely unknown v1 требуют отдельного доказанного drain/reconciliation решения. **Bounded automatic transition для неизвестного v1 writer не доказан и этим результатом не обещается.**

До eventual rollout должна быть установлена фактическая применимость legacy case: ещё не развёрнутый код и пустой disposable storage не равны доказательству состояния production. Production проверка здесь не проводилась и не предлагается неявно. Необходимо либо подтвердить отсутствие старых writers/rows в назначенном acceptance scope, либо сохранить отдельный legacy handling. Смешанный rollout не допускает old code создавать unconditional writes в v2 namespace.

## G. Итог

Все восемь пунктов назначения разобраны: identity/activation до data, recoverable revoke через claim+positive-match DELETE, late payload rejection, no-recreate ABA invariant, конечный marker lifecycle через bounded discovery, metadata/claim fencing, явный legacy exception и local/CI проверяемость. Через текущий неизменённый PrivateAttachmentBucket результат недостижим; указанное внутреннее расширение необходимо для предложенного протокола.

Feasibility для новых uploads — положительная при явно сформулированных single-attempt/no-reuse/fair-sweep условиях. Это основание для согласования ограниченного implementation plan, а не разрешение молча начать его. Code PR #245/main/schema/deps не менялись; PR #247/CPU/deployment исключены. Локальный Wrangler/Workerd остановлен после controls, evidence сохранён; git diff --check PASS, прежний untracked node_modules symlink сохранён. Результат опубликован в рамках назначения #6440923322. Это архитектурная feasibility-проверка, не independent review; отдельный publication barrier независимых проверок к ней не применяется. STOP.


## PR #245 — root-cause correction plan (2026-10-27)

Дата: 2026-10-27. Назначение #236 comment 6440418586. Head `c00b416eabe5f8cbe68b4fc35a175f0d7ef6e757`, base `082530ab6a62c37f4d7acf17556bc496e677ab5f`. Код не изменён. CPU/deployment и PR #247 исключены.

## Вывод и рекомендуемое направление

Проблема — не число попыток UPDATE, а отсутствие восстанавливаемого durable доказательства после утраты process-local знания. При текущих безусловных PUT/DELETE и единственном terminal marker в PostgreSQL невозможно одновременно гарантировать finite retirement каждого terminal writer после не записавшегося settlement и safety для genuinely unknown PUT.

Поэтому **не рекомендую очередной локальный retry patch или объявление NULL завершённым по возрасту**. Рекомендуемое изменение модели: cleanup должен уметь получить durable доказательство, что право данного writer материализовать bytes отозвано (storage write fence), независимо от потерянного сообщения request. Это более сильная и полезная граница, чем «мы когда-то получили успешный ответ PUT».

Это законченный root-cause анализ и план следующей ограниченной работы, но **не утверждённый, готовый к implementation протокол**: конкретная реализация fence в текущем storage adapter ещё не доказана. Утверждать обратное означало бы скрыть новый race. Нужна отдельная protocol-design/feasibility стадия до изменения PR.

## 1. Фактическая модель 0046/0047

| Состояние | Durable данные | Что знает request | Что может доказать cleanup |
|---|---|---|---|
| admission отсутствует | нет journal | PUT ещё запрещён | ничего об объекте; PUT не должен быть запущен |
| admitted, до/во время PUT | row, NULL completion | pre-write/in-flight | writer мог ещё материализовать bytes |
| full-body outcome unknown | та же row/NULL | ответ потерян | поздний PUT возможен |
| terminal outcome, settlement не записан | та же row/NULL | PUT завершён / definitively failed | неотличимо от in-flight/unknown |
| settlement persisted | timestamp | terminal | settlement существовал к моменту claim |
| asset committed | authoritative asset + refs | metadata принято либо ACK потерян | asset reconciliation, reference-aware cleanup |
| claimed | claim token/time поверх предыдущего состояния | metadata admission конфликтует | один claim, но не доказательство прекращения storage write |

NULL не кодирует причину отсутствия timestamp. Claim lease ограничивает конкуренцию cleanup, но не срок жизни storage PUT. `write_completed_at` — positive evidence, отсутствие которого не означает ни active, ни failed. `createDraftAttachment` требует completion + unclaimed journal, при этом только structurally verified stored result разрешает вызов metadata admission.

## 2. Causal proof: почему меньшего исправления недостаточно

Две истории дают одинаковое доступное durable состояние:

A. PUT definitively failed; UPDATE settlement отменён; fallback DELETE успешен; request завершён.
B. Полный PUT ещё может закоммититься; его ответ неизвестен; DELETE успешен, пока key отсутствует.

Обе: row NULL, metadata отсутствует, storage read может вернуть absent. Если cleanup удаляет tracking в A лишь по этим данным, он должен сделать то же в B и потеряет поздние bytes. Если он безопасно сохраняет B, тем же правилом сохраняет A бессрочно. Нужен новый различающий durable факт или возможность физически прекратить право на запись.

Верификация 6440054664 уже показала A настоящим PostgreSQL timeout и четыре повторных DELETE. B и DELETE/completion order подтверждались предыдущими native interleaving regressions. Для плана повторять full suite/те же probes не требовалось.

Отсюда недостаточны: N retries, waitUntil без durable handoff, ещё одна колонка, фиксированный deadline, successful DELETE, отрицательный HEAD, DB row/advisory lock без storage enforcement. Отдельный receipt после terminal outcome может закрыть конкретный SQL timeout при доступном втором хранилище, но оставляет crash window перед receipt и такой же дефект, если receipt не записался. Он не является полным root-cause решением и не рекомендуется как самостоятельный пакет.

## 3. Требуемый invariant новой модели

`retire journal => authoritative asset owns object OR (writer capability durably revoked AND delete completed after that revocation)`.

Для каждой загрузки право материализации должно быть связано с единственным immutable identity/generation. Отзыв должен быть recoverable после crash и применяться на стороне storage в момент commit каждого потенциально позднего write. Cleanup обязан уметь завершить этот отзыв по durable admission information без process-local результата завершившегося request.

Liveness формулируется при восстановлении доступности БД/storage и повторном запуске bounded cleanup; успешная работа при вечной недоступности сервисов не обещается. Но временная DB-недоступность в момент settlement не должна создавать невосстанавливаемую дыру.

Сначала durable claim/revoke-intent блокирует metadata; затем подтверждённый storage fence; затем DELETE; затем retirement по тому же claim/generation. Если ACK fence потерян, intent сохраняется до положительного восстановления fence; отрицательный read не считается подтверждением. Если DELETE/DB retirement не завершились — тот же bounded cleanup продолжает lifecycle, не новая очередь ретраев.

## 4. Минимальная следующая стадия и её границы

До implementation подготовить и проверить один протокол storage-enforced revocation в existing private bucket boundary. Публичная официальная документация R2 подтверждает atomic conditional PUT в момент commit и Workers `onlyIf`/ETag conditions. Это подходящая primitive для исследования, **но не доказательство готовности простого tombstone алгоритма**.

Обязательные proof obligations для conditional-write варианта:

- Кто создаёт reservation, как её identity durably связывается с journal до любого payload PUT.
- Как fenced generation отклоняет payload PUT, начатый раньше cleanup.
- Что происходит при неизвестном результате самой reservation/fence операции: поздняя initializer/retry не должна воскресить прежнее право.
- Как избежать ABA: удаление guard/tombstone не должно снова сделать старое условие истинным. В частности, `If-None-Match:*` + удалить tombstone — НЕ безопасное решение.
- Как удаляются сами control objects; перенос бесконечного journal в бесконечные untracked markers не считается устранением дефекта.
- Как восстанавливаются concurrent/expired claims без разрушающего позднего cleanup над уже принятым asset.
- Старые rows/старые unconditional writers: новый протокол не имеет права задним числом считать их fenced. Нужен явный compatibility/drain policy; ожидание фиксированного grace не доказывает drain.

Если эти условия не выполнимы через existing binding, остановиться с конкретным доказанным ограничением. Тогда потребуется отдельное техническое решение об abortable storage writer или другом durable coordinator; не добавлять такой сервис неявно в текущий correction.

После доказанного протокола bounded implementation scope: внутренний storage contract/adapter, upload admission/finalization, существующий journal lifecycle/cleanup, metadata gate и относящиеся native/Workerd regressions. Если нужна durable generation/phase — только forward migration, без переписывания 0046/0047. Не обещать заранее zero schema changes: доказательство выбранного протокола определит необходимую persistence. ZIP/TAR/редактор, CPU, production provision и публичные endpoints не менять.

## 5. Regression matrix для принятия протокола/последующей correction

| Сценарий | Обязательный результат |
|---|---|
| valid successful PUT | verified stored → metadata commit, content/private refs сохранены |
| definitive rejection | metadata 0; finite cleanup после recovery |
| short body / partial read failure | metadata 0; producer остановлен; finite cleanup |
| actual settlement SQL failure | crash/end request после failure; восстановление только durable state; конечное retirement без ручного UPDATE |
| crash до/после terminal receipt/transition | отсутствие потери tracking, сохранение progress после recovery |
| genuinely unknown full-body PUT | late commit до fence учитывается, после fence запрещён; ни одного untracked object |
| reservation/fence lost ACK и definitive failure | возможность восстановления доказана; отсутствие ложного terminal по absent/timeout |
| initializer или повторный write после fence/DELETE | capability не воскресает, ABA исключена |
| completion до/во время/после cleanup DELETE | удаление tracking только после относящегося к этому writer fence/settlement |
| metadata commit/rollback/lost ACK | authoritative asset защищён, rollback остаётся cleanup-recoverable |
| concurrent cleanup + expired claim | token/generation fencing, поздний processor не удаляет accepted asset |
| больше batch limit terminal/unknown/ordinary assets | bounded work и fairness, никакого полного bucket/DB scan |
| legacy rows/writers | явная безопасная compatibility policy, без ложной миграции NULL→terminal |

Матрица выполняется actual action→adapter→Drizzle→PostgreSQL и native local Workerd на fault-controlled bucket с gateable commit. Модель/fake должна явно разделять начало операции и atomic storage commit, иначе не проверяет основной race. Локальные доказательства не объявлять live-service acceptance.

## 6. Проверенные источники и статус

- https://developers.cloudflare.com/r2/reference/consistency/ — conditional-write commit semantics и non-final negative reads.
- https://developers.cloudflare.com/r2/api/workers/workers-api-reference/ — conditional binding options и precondition rejection.

Прочитаны 0046/0047, schema, helper, Workers adapter, route, store adapter, metadata admission и cleanup exact head. Повторная проверка status: implementation tracked files без изменений; существует прежний untracked node_modules symlink. Команды к аккаунту/provider не выполнялись. Публичные docs изучены для проверки primitive, аудит внешней инфраструктуры не проводился.

План сначала передан разработчику в текущем чате; опубликован по его прямой команде «Публикуй». Рекомендация координатору: сначала назначить ограниченное доказательство storage-fence протокола с указанными gate criteria; не назначать ещё один blind retry correction. Реализацию PR #245 пока не начинать. STOP.


## PR #245 — targeted technical verification: lost durable settlement (2026-10-27)

2026-10-27. Задание: #236 comments 6439775390, 6439811250, 6439845898. **Verdict: CONFIRMED current-scope ATTACH-01 defect.** Это проверка внешнего finding по назначению, не independent whole-PR self-review и не новый correction plan.

Проверенный GitHub/local exact head `c00b416eabe5f8cbe68b4fc35a175f0d7ef6e757`, base `082530ab6a62c37f4d7acf17556bc496e677ab5f`. PR #247 исключён последним назначением и не проверялся. Implementation, schema и dependencies не изменены.

## Независимое воспроизведение

Использован настоящий upload action → storePrivateAttachmentStream → createHyperdriveForumAttachmentStore.completeUploadObjectWrite → Drizzle → disposable PostgreSQL17. Это реальный локальный SQL-вызов через production adapter с отдельным клиентом; внешние Hyperdrive/R2 не подключались. Storage — controlled byte bucket, terminal result известен по завершившемуся PUT, definitive rejection или остановленному short body.

Чтобы проверить потерю записи, а не просто подменить ответ callback, установлен диагностический PostgreSQL BEFORE UPDATE OF write_completed_at trigger с pg_sleep(0.2). Клиент settlement получил statement_timeout=50 ms. PostgreSQL сам отменил настоящий UPDATE с SQLSTATE 57014 / `canceling statement due to statement timeout`; adapter преобразовал исключение в ForumAttachmentStorageUnavailableError. Затем trigger удалён, БД снова доступна до первого cleanup. Это моделирование окончательно не записавшегося settlement, не предположение о природе неизвестного commit.

| Writer outcome | Settlement fault | HTTP | Calls settlement / metadata | Journal после request | После четырёх cleanup |
|---|---|---|---|---|---|
| успешный PUT | actual SQL timeout | 503 | 1 / 0 | NULL | остаётся NULL |
| definitive rejected PUT | actual SQL timeout | 503 | 1 / 0 | NULL | остаётся NULL |
| short body, 5000 из 10000 bytes | actual SQL timeout | 503 | 1 / 0 | NULL | остаётся NULL |
| definitive rejected PUT | нет | 503 | 1 / 0 | terminal timestamp | journal удалён |
| успешный PUT | committed settlement + simulated lost ACK | 503 | 1 / 0 | terminal timestamp | journal удалён |

Во всех трёх дефектных случаях fallback DELETE успешен; объектов и metadata нет. Journal состарен до >1h, четыре настоящих cleanup.runOnce выполняются с injected clock, шагом 6 минут (>5m claim lease). Каждый проход: claimed=1, deleted=1, failed=0. Вместе с fallback получаются 5 успешных DELETE; единственная settlement attempt остаётся единственной. В двух контролях — fallback + один cleanup DELETE (2 всего), затем claimed=0. Lost-ACK контроль подменяет только результат после настоящего committed UPDATE и явно отличается от actual SQL timeout.

Итог диагностической матрицы: **5 PASS / 56 unrelated tests skipped**, 1.75 s. Assertions подтверждают наблюдаемую цепочку/контроли, не acceptance реализации. Первоначальный диагностический запуск не достиг upload из-за неполного reader fixture для topic scope; probe переключён на существующий section scope с корректным reader. Продуктовый код не исправлялся.

## Причинная цепочка и классификация

1. `app/routes/attachment-upload.ts:190–191` передаёт единственный callback для settlement.
2. `app/forum/attachment-r2.ts:286–320`: terminal failed/successful outcomes вызывают afterWrite один раз. Если запись не завершилась, выполняется best-effort DELETE и request выходит с ошибкой. Воспроизведён именно успешный fallback DELETE.
3. `db/hyperdrive-forum-attachments.ts:61–79` выполняет одну операцию в отдельном клиенте и выбрасывает availability error; восстановительного durable handoff здесь нет.
4. `db/forum-attachments.ts:142–150` — единственный production writer write_completed_at. Отменённый PostgreSQL UPDATE не изменяет NULL. Metadata admission не вызывается; иной authoritative asset для reconciliation отсутствует.
5. `db/forum-attachment-cleanup.ts:51–81` правильно требует установленное ДО DELETE settlement для retirement. При NULL сохраняет tracking и обновляет claim. Время/lease только делает запись снова доступной; terminal transition эти проходы не выполняют.
6. После завершения request process-local terminal proof больше не имеет исполнителя, способного записать его в эту запись. Поиск production references не обнаружил другого writer/recovery transition. Повторная пользовательская загрузка создаёт новый random object key и старую запись не завершает.

Четыре прохода — наблюдаемая проверка повторяемости. Бессрочность следует из отсутствия дальнейшего перехода в текущем коде, а не из экстраполяции только четырёх измерений. Ручное изменение БД или будущая реализация сюда не относятся.

Это текущий ATTACH-01 defect конечного lifecycle известного завершённого writer, уже включённого в принятую A/B correction, а не новый scheduler/future-only запрос. PROJECT_STATE:38–48 обещает finite retirement для proven terminal failures и сохраняет tombstone для действительно неизвестного PUT. Здесь PUT уже terminal, а durable representation после SQL failure неотличимо от genuinely unknown. Граница дефекта — потеря durable settlement evidence; cleanup сам по себе не может безопасно объявить такой NULL завершённым.

Существующая защита late materialization остаётся необходимой: успешный DELETE и elapsed grace не доказывают settlement неизвестного writer. Findings не обосновывают удаление всех NULL rows по таймеру или ослабление fencing. Возможное исправление/пересмотр модели в рамках этого задания не выбирались: раннее поручение составить plan заменено более поздним «сначала verdict и STOP».

## Границы и сохранённые доказательства

Локальный controlled storage и PostgreSQL17; не live R2/Hyperdrive/Neon, без production, CPU/deployment, browser/owner visual или backup/restore. Broad suites и whole-PR review не повторялись: проверка только данного внешнего finding. Это не повторный independent verdict автора собственной реализации.

`/workspace/work/pr245-settlement-verification.log` содержит SQLSTATE, результаты request и все cleanup counts. `/workspace/work/pr245-settlement-review.probe.test.ts` содержит диагностическую матрицу и исходные fixtures exact head. Временный probe удалён из checkout; tracked files чисты, git diff --check PASS. Изначальный node_modules symlink сохранён. Disposable PostgreSQL container остановлен и удалён. Implementation/main и удалённые файлы не менялись.

Результат сначала передан только разработчику в текущем чате; эта публикация выполнена по его прямой команде «Публикуй». Следующий шаг — согласование verdict координатором в #236 и отдельное назначение дальнейшей работы. Новый plan и implementation не начинать без следующего назначения. Лёва STOP.


## PR #247 — независимая whole-PR проверка Лёвы (2026-10-27)

Дата: 2026-10-27. Verdict: **FAIL / changes required**.

Задание: PR #236, comment 6438925775. Проверены все 13 изменённых файлов PR #247, шаги 2–5 Batch L2: EDITOR-10, LITERAL-TEXT-01, LOC-03, LOC-06. EDITOR-04 уже принят отдельным PR #246 и повторно в объём не включён.

Проверенный неизменившийся head: `810f7fcceb69fef4e27a909adc08cb05c4a938ff`; base `082530ab6a62c37f4d7acf17556bc496e677ab5f`. Проверяющий не участвовал в реализации. Реализация не изменялась. Отчёт опубликован по прямой команде разработчика «Публикуй» после выдачи verdict в текущем чате.

## 1. P1 — LOC-03: новый nesting scanner расходует экспоненциальное время на короткий некорректный перевод

Источник: `app/localization/translation-validation.ts:118–127`. Вложенное повторение `[^()"']+` внутри повторяемой группы допускает множество разбиений одного участка текста; при отсутствии завершающей скобки regex перебирает их до выбрасывания Malformed nesting.

Проверка вызвала настоящий `validateTranslation` с коротким незавершённым nesting, без production или внешних запросов. Наблюдения по длине текста: 15 символов — 0.47 ms, 19 — 2.4 ms, 23 — 33.5 ms, 27 — 487.5 ms. На 31 символе отдельный диагностический процесс был остановлен по двухсекундному deadline, после входа в validator и до возврата. Ограничение перевода 10 000 символов этот случай не отсекает.

Достижимость подтверждена через настоящие UiTranslationResultPublisher.publish, compileNamespaceBundle и verifyCompiledNamespaceBundle: короткий контроль отвергается как malformed без записи, более длинный тест в каждом методе не возвращает результат за 2 s. Дополнительно один ограниченный локальный Workerd-запрос к exact-head validator вошёл в validation и не вернул ответ за 2.003 s; процесс после проверки остановлен. Это доказательство блокирования синхронной validation, без предположений о тарифе, production CPU limit или публичном неавторизованном endpoint.

Последствие: некорректный provider/local/persistent UI-текст вместо ограниченного отказа надолго блокирует обработку на общем validation boundary. Это регрессия текущего PR и относится к LOC-03, а не к будущему расширению синтаксиса.

Необходимый объём исправления: ограниченный разбор поддерживаемого nesting и регрессии malformed input на publication/compiled boundaries. Исправление в ходе review не выполнялось.

Доказательства: `pr247-regex-probe.log`, `pr247-validation-chain-probe.log`, `pr247-validator-worker/request.log` и server.log в `/workspace/work`.

## 2. P2 — LITERAL-TEXT-01: plain paste с четырьмя пробелами показывает служебное экранирование

Источник: `app/forum/clipboard-markdown.ts:6–18`. Новый escaping применяется до определения block context; plain-text path сохраняет четыре начальных пробела, поэтому Markdown распознаёт indented code, внутри которого entities/backslash escapes уже не декодируются как prose.

Воспроизведено через mounted Simple paste → authoritative body source → настоящий ForumMarkdown:

| Clipboard text | Сохранённый source | Видимый code text |
|---|---|---|
| четыре пробела + `&copy;` | четыре пробела + `&amp;copy;` | `&amp;copy;` |
| четыре пробела + `~~literal~~` | четыре пробела + `\~\~literal\~\~` | `\~\~literal\~\~` |

Сравнение с base, используя извлечённый неизменённый baseline clipboard serializer: code text был соответственно `&copy;` и `~~literal~~`. Значит видимое искажение внесено PR; сам indented-code разбор существовал раньше. Контроль native Simple typing того же текста сохраняет leading whitespace через structural entity и показывает правильный literal text. Обычные новые случаи без отступа работают; intentional Bold и Advanced strikethrough controls также работают.

Необходимый объём исправления: согласовать literal plain-paste escaping с leading whitespace/block context и закрепить roundtrip проверками. Пересмотр общего Markdown parser не требуется по установленным данным.

Доказательства: `pr247-clipboard-comparison.log`, `pr247-review-probes.log`, диагностический `pr247-review.probe.test.tsx` в `/workspace/work`.

## 3. P2 — EDITOR-10: literal mention-label contract остаётся неполным для допустимого имени с тильдами

Источник: `app/forum/mentions.ts:17–21`. Serializer экранирует ampersands и часть Markdown-символов, но оставляет `~`. Auth display-name validation разрешает такое имя; настоящий published renderer поддерживает GFM strikethrough.

Authoritative имя `~~Ada &copy;~~` через autocomplete в Simple и Advanced превращается в `[~~Ada &amp;copy;~~](/en/users/member-42)`. Настоящий ForumMarkdown создаёт `<del>` внутри ссылки и показывает `Ada &copy;`: буквальные тильды исчезают и появляется форматирование. Immutable profile destination и recipient `member-42` сохраняются; перенаправление получателя не заявляется. Контроль имени `Ada &copy;` проходит.

Причина с неэкранированными тильдами существовала до PR. Это **не новая регрессия**, а остаточный дефект заявленного текущего результата EDITOR-10: исходное задание и описание PR требуют буквального authoritative display name, включая имена с character-reference-подобным текстом. Полностью буквальная подпись для проверенного допустимого имени всё ещё не обеспечена. Обычный mdast parser без GFM в pure mention tests этот результат пропускает; проверка выполнена с фактическим published renderer и обоими autocomplete paths.

Необходимый объём исправления: literal mention-label escaping в соответствии с действующим renderer плюс регрессия опубликованного текста. Расширение модели mentions/recipient logic не требуется.

## Остальной проверенный scope

- EDITOR-10: entity-only имена, immutable href и recipient IDs проходят; проблема 3 отделена от новой ampersand-защиты.
- LITERAL-TEXT-01: обычный typing/paste для дефисов, тильд и entities, native leading whitespace, intentional toolbar и Advanced formatting проверены; проблема 2 специфична для paste в indented-code context.
- LOC-03: новые проверки полного nesting token/options, изменения lng, malformed syntax, publisher/compiled rejection и i18next semantics рассмотрены вместе с тестами; проблема 1 блокирует безопасную bounded validation.
- LOC-06: ранний authoritative no-segments guard стоит до source-locale planning после проверки target/revision identity. Пустые, whitespace, fenced/inline-code-only пути не вызывают planner/provider; prose продолжает queued 202. Независимо расширена временная матрица реального topic HTTP action → capability → real planner/resolver четырьмя случаями: explicit whitespace, automatic fenced-code-only, automatic и explicit inline-code-only. Все 10 выбранных маршрутных случаев прошли. Authz/guest/origin/disabled-runtime guards рассмотрены, контракт не изменён. Findings по LOC-06 нет.
- Reviewed project state и применимые EDITOR/translation source-of-truth требования. Устаревшая строка LOC-03 «LOC-06 ещё не начат» противоречит более новому верхнему блоку с завершённым LOC-06; это хронологический остаток документа, не отдельный implementation blocker.

## Проверки и границы

Локально на exact head: 1134 application tests / 102 files PASS; typecheck PASS; lint 12 изменённых TS/TSX файлов PASS; application build и UI preview build PASS. Дополнительные 11 mounted/parser/render/control probes PASS: они утверждают наблюдаемое поведение, в том числе дефекты, а не означают отсутствие findings. Дополнительная route matrix: 10 PASS, 42 unrelated tests skipped. `git diff --check` PASS.

Независимо прочитаны jobs и логи CI #40480837338: checks SUCCESS (1134/102), database SUCCESS (304 PostgreSQL tests/28 files, сопутствующие проверки и Worker smoke). Actions тестировал synthetic merge `28435bd…` head 810f7fc… с base 082530a…; локальные проверки выполнялись непосредственно на head. Личный локальный PG прогон для этого review не заявляется.

Внешние сервисы, production, OAuth, реальные provider/Queue/storage/backup операции не выполнялись. Owner visual acceptance и браузерное end-to-end acceptance не заявляются; редакторные доказательства получены mounted jsdom events и фактическим published renderer, а не визуальной оценкой скриншота.

Временные диагностические изменения тестов сохранены вне checkout и удалены/восстановлены. Проверяемый checkout чист; implementation-ветка и main не изменены. Во время независимой проверки findings другим проверяющим не публиковались. Текущая публикация — по прямой команде разработчика; следующий шаг — согласование опубликованных reviews координатором в #236. Исправления и merge не выполнялись. Лёва STOP.


## PR #245 — bounded ATTACH-01 correction A/B implementation handoff (2026-10-27)

Assignment: [#6438118930](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6438118930), following [second adjudication #6437634238](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6437634238). Author implementation-complete, not an independent whole-PR verdict.

Existing [draft PR #245](https://github.com/iliya1947/vico-forum/pull/245), branch `fix/l6-attachment-storage-zip`. Previous reviewed head `86258701e56407f9ee16505aaf092d23559521df`; new stable exact head **`c00b416eabe5f8cbe68b4fc35a175f0d7ef6e757`**, base `082530ab6a62c37f4d7acf17556bc496e677ab5f`. GitHub head/base re-fetched unchanged, mergeable=true. Eight-file correction; no new branch/PR.

### One writer-settlement lifecycle for A and B

- Existing `write_completed_at` records established terminal writer settlement: successful PUT or a definitive failed/stopped write. It does not by itself authorize metadata; the route still requires the helper's structurally verified `stored` result before metadata admission.
- Short sniff prefix is rejected before journal/PUT. After PUT failure, the helper cancels upstream; a provably incomplete stopped fixed-length producer can settle, as can explicit bucket proof of settled storage. Generic full-body errors and full-body read failures without a definitive remote result remain unknown: no outcome inferred from error text, elapsed grace or DELETE.
- Workers adapter counts the bounded streaming producer, distinguishes a full-body unknown failure from an acknowledged result/incomplete stopped writer, and reports explicit internal settlement proof. It cancels its FixedLengthStream readable as well as its pump when the RPC fails/declines, so a definitive rejection without a consuming reader cannot leave a backpressured pump hanging. No whole-body buffering added.
- Cleanup captures writer settlement under the existing claim transaction **before** storage DELETE. Only that captured settlement can authorize retiring this claim's journal row after DELETE. A completion update appearing during/after DELETE therefore leaves tracking until a later pass whose DELETE starts after settlement. Existing claim token identity, authoritative asset reconciliation and bounded retry fairness retained.
- A known failed request now has finite journal retirement after grace/DELETE; a genuinely unknown write still retains durable discoverability for late bytes until safe settlement is established. These are intentionally distinct states; unknown transport results are not silently declared collected.
- No schema/migration/dependency/public route change. PROJECT_STATE synchronized with the actual settlement and pre-DELETE snapshot rules. ZIP algorithms/limits, accepted attachment/editor contracts and CPU candidate C untouched. C remains the previously documented unverified deployment/acceptance boundary.

### Regressions and author verification

- Old-head native control: against `8625870`, desired finite short-body retirement and the protected DELETE→completion interleaving give **2 FAIL / 1 PASS / 49 skipped**. The other B ordering is the passing control. Isolated baseline worktree removed.
- Corrected attachment native suite: **56 PASS**, including terminal short body, partial read failure, explicit definitive rejection, full-body unknown transport/read controls, and both actual PostgreSQL DELETE/completion interleavings. Late materialization after failed fallback DELETE remains journaled and is deleted on the later properly ordered pass; successful upload/metadata and ordinary cleanup controls retained.
- Workers adapter suite: **5 PASS**; pre-admission short-prefix regression added. Original ATTACH-02 / ATTACH-STRUCT-01 tests remain in the full app suite.
- Final local application suite: **1120 tests / 102 files PASS**, 132.43 seconds. Local full native PostgreSQL17 suite: **318 tests / 28 files PASS**, 76.27 seconds.
- Typecheck PASS; lint 0 errors / 1 existing unused-disable warning in ui.test.tsx. Application and UI-preview builds PASS. Migration history guard (0046/0047 new against main, accepted history unchanged), Drizzle check/generation parity (no new schema drift), 48-table schema parity and runtime privilege probes PASS. Disposable local PG provisioning/diagnostic/recovery/bootstrap probes and built application Worker HTTP smoke PASS.
- Additional **six real local pinned Workerd controls with native FixedLengthStream** exercised the unchanged public helper+Workers adapter and controlled byte-storage transport: normal→201/stored/settlement1; short body→400/settlement1; partial read error→400/settlement1; definitive rejection without reading→503/settlement1; full-body unknown→503/settlement0; short prefix→400/no PUT/no settlement. This is actual local Workerd stream behavior, with controlled storage—not live R2.
- That Workerd run caught a difference from Node's TransformStream test double: an unconsumed native FixedLengthStream needed readable cancellation to release the aborted pump. The final code handles it; all six controls then passed. Initial adapter test mocks also needed a valid FixedLengthStream constructor. Final results above include the corrections.

[Exact-head CI #40484192014](https://github.com/iliya1947/vico-forum/actions/runs/40484192014) **SUCCESS**. Jobs checks `122121746586` and database `122121746983` SUCCESS; completed logs independently retrieved and show **1120 application + 318 PostgreSQL tests** and applicable checks PASS. CI evidence is distinct from personally executed local runs.

Bounds: controlled byte storage and local PostgreSQL/Workerd; no real external R2/Cloudflare/Neon/Hyperdrive/OAuth/backup/restore/account/production/browser/owner visual actions. No Free/Paid CPU acceptance or quota claim. Generic full-body unknown results still require real settlement evidence; no unsafe expiry added.

Local evidence under /workspace/work: l6-ab-{baseline,db-target-final,db-full,app-final,type-final,lint-final,build-final,preview,schema,pg-probes,smoke,worker-final}.log; l6-ab-worker-check/{entry.ts,entry.mjs,wrangler.jsonc,results.log,server.log}. Baseline worktree removed, disposable PG and both local Worker processes stopped, implementation worktree/evidence preserved.

Next: Mira starts a **new whole-PR coordinator cycle on c00b416**, then designated independent reviewers excluding the implementation author. Prior head verdicts do not apply to the new implementation. No self whole-PR review, merge, L7/L8, CPU correction or Batch L2 work. Leva STOP.

## PR #245 — second technical adjudication: A/B confirmed, C deployment boundary (2026-10-27)

Date: 2026-10-27, Asia/Jerusalem. Assignment: service PR #236 comment 6432134667. Stable exact head `86258701e56407f9ee16505aaf092d23559521df`; designated base `082530ab6a62c37f4d7acf17556bc496e677ab5f`. Explicitly assigned technical diagnosis by the implementation author; not an independent whole-PR self-review. No implementation correction performed.

## Classification

- Candidate A: **CONFIRMED current-scope defect, ATTACH-01** for conclusively failed/finished writers, distinct from genuinely unresolved remote PUT outcomes.
- Candidate B: **CONFIRMED current-scope defect, ATTACH-01**, reproduced with actual upload action, Drizzle, PostgreSQL 17 and controlled storage interleaving. R2 strong consistency does not invalidate the sequence.
- Candidate C: **deployment/acceptance boundary not established as a current-scope defect**. Free-plan 10 ms compatibility is not demonstrated and the measured local footprint is much larger; however no authoritative Free-plan requirement/account plan was established. Actual production CPU quota compliance remains **Информация не проверена**. No acceptance PASS for Free or Paid is claimed.

## A — failed requests retain journal rows permanently

Three actual upload actions each declared 10000 bytes and supplied 5000 ASCII bytes, enough to pass prefix inspection and admit the journal. The stream length error occurred after journal admission while bucket.put consumed the stream. Each route returned 400. completeUploadObjectWrite was called 0 times; no metadata was admitted, and the controlled byte bucket never committed an object. This is a known terminated producer/body failure, not merely a never-returning remote operation.

The same actual PostgreSQL journal rows were aged past grace. Four sequential existing cleanup passes, separated by injected 6-minute lease intervals, each successfully deleted the three keys. The rows remained with write_completed_at=NULL and claimed=true after every pass. Fifteen DELETE calls total: three immediate failure cleanup attempts plus 4 × 3 cleanup calls. This loop is structurally permanent: completeUploadObjectWrite is only called on successful PUT; there is no failed-writer terminal transition, another completion path or conditional retirement for this finished request. A normal new upload uses a new random physical key, so client retry cannot settle the earlier journal.

The existing distinction in correction docs—retain truly unknown writers—is necessary but does not establish a finite lifecycle for known-terminal failures. Repeating cheap invalid-size requests can accumulate rows and recurring work despite the per-pass batch reservation. Four observed passes establish the repeated condition; source-level reachability establishes that this finished request has no future transition to completion.

Minimal correction scope: the existing upload/journal/reconciliation lifecycle needs a terminal outcome for definitively stopped writers, covering short body, read failure and confirmed PUT failure, separately from successful metadata eligibility. Establish safe storage-write settlement/cancellation before permitting journal retirement. Preserve genuinely unresolved outcomes until a real settlement/fence exists. Do not reinterpret a timeout, negative GET or one successful DELETE as proof that an unknown PUT can no longer commit. No new scheduler/public endpoint/general architecture is automatically required.

## B — completion becomes visible after DELETE but before journal retirement

Actual PostgreSQL + actual upload action sequence, with controlled byte bucket and promise gates:

1. Journal committed; PUT is held before object visibility. Journal is aged past grace.
2. Existing cleanup commits claim_token in its own transaction.
3. Storage DELETE physically completes while key is absent; delivery of its successful acknowledgement is held to expose the legal scheduling window.
4. PUT commits bytes; actual completeUploadObjectWrite commits write_completed_at on the claimed row. Metadata admission is held separately.
5. Successful DELETE acknowledgement returns to cleanup. Its actual SQL DELETE sees the newly non-null completion and removes journal by key+claim token.
6. Metadata admission resumes: actual store transaction rejects missing journal; upload action returns400. Its final best-effort object DELETE is made to fail.
7. Object exists, metadata count 0, journal count 0. Another cleanup after lease expiry claims 0 / deletes 0 and leaves the object present.

Control changes only the order: allow cleanup's SQL DELETE to run while completion is stillNULL, then commit PUT/completion. Journal remains (count 1); after the same failed fallback DELETE, later cleanup claims 1 / deletes 1 and removes object. Both branches use actual SQL, not an in-memory journal model.

Evidence trace defect: physical DELETE → PUT committed → completion UPDATE committed → cleanup journal DELETE finished. Control trace: physical DELETE → cleanup journal DELETE finished → PUT committed → completion UPDATE committed. The storage gate delays acknowledgement after the physical DELETE, not the physical deletion itself; PUT therefore completes later, consistent with the official R2 rule that the last writer to complete wins.

Official R2 consistency documentation was fetched during this adjudication: competing PUT/DELETE to the same key use last-completing-writer semantics; reads/negative absence do not wait for or cancel an earlier in-flight PUT. Strong consistency does not make a DELETE, an independently committed journal UPDATE and a later SQL DELETE one atomic operation. No live R2 reproduction is claimed.

Minimal correction scope: journal retirement must depend on writer settlement already established **before** the storage DELETE it relies on, with claim/state identity preserved. A completion which appears during or after DELETE cannot retroactively make that earlier DELETE final; retain tracking and perform a subsequent correctly ordered deletion. A claim-time settled-state snapshot/version or equivalent atomic lifecycle rule can establish this without expanding ZIP scope. Do not merely test current non-null completion after await. Coordinate this with A's failed-writer terminal state so fixing one path does not reintroduce the other.

## C — applicable CPU budget and measured runtime footprint

Contract/configuration checks:
- PROJECT.md establishes Cloudflare Workers as the runtime, but does not select Workers Free/Paid or a CPU budget.
- Repository-wide searches of PROJECT_STATE, ROADMAP, docs, wrangler.jsonc and workflows did not establish a Free-plan mandate or explicit cpu_ms/usage_model. Service-channel/comment context contains no earlier authoritative Free/Paid decision found by the same targeted search.
- wrangler.jsonc has neither CPU override nor R2 binding. An absent CPU override does not identify an account plan: Free and Paid have different defaults outside this config.
- PROJECT.md's pre-release principle and ROADMAP Stage 6 defer external infrastructure/production-candidate acceptance; docs/EDITOR.md defers actual R2 provisioning and paid actions. These are not a declaration that every feature already supports Free 10 ms.
- Current official Workers limits: CPU excludes network/I/O wait; Free 10 ms per HTTP request; Paid default 30 seconds with configurable maximum 5 minutes. Account/subscription settings were not queried.

Additional local runtime diagnostic, rather than using Node wall time as Worker CPU proof:
- Bundled the unchanged exact-head storePrivateAttachmentStream/finalizer into a disposable local Worker, using the project's pinned Wrangler 4.130.0 / workerd 1.20260908.1, same compatibility date 2026-09-09.
- Supplied the independently generated valid classic 65535 ZIP (5613812 bytes) to the actual helper/finalizer. Storage was a diagnostic in-memory byte bucket; no auth/DB/full application request or live R2 cost was represented by this wrapper.
- Three local requests all returned diagnostic HTTP 200 with outcome=stored and 45 GETs.
- V8 inspector sampling at 1 ms: sampled non-idle sums 732.795 ms, 759.371 ms, 710.221 ms; wall durations 741.998 ms, 764.234 ms, 722.592 ms. Raw cpuprofiles saved. These are local profiler observations, **not Cloudflare's billed/enforced cpuTime**; profiling, hardware and the synthetic bucket affect them.
- The result supplies no support for a 10 ms Free claim, but local execution does not enforce/prove a production Free/Paid CPU budget. It is neither a measured production quota failure nor a Paid acceptance certificate.

Therefore the premise that the current project necessarily has an applicable Free 10 ms budget is unproven. Record C as an unresolved deployment/acceptance requirement, with a strong local warning against assuming Free compatibility. Establish the target plan/budget and verify the release path against it at the relevant acceptance boundary before choosing CPU-related implementation changes. No current correction scope is authorized by an assumed plan. Future choice of Free could make this a concrete incompatibility; it should not be silently declared resolved.

## Verification and artifacts

- Three targeted native diagnostic cases PASS: A and B's two orders; 49 unrelated existing tests skipped. Assertions capture observed defects/controls; this is not an implementation acceptance PASS. No broad suites rerun and no correction code written.
- `/workspace/work/pr245-adjudication2-pg.log` and corrected-order temporary snippet/test evidence.
- `/workspace/work/pr245-adjudication2-cpu.log`, `pr245-adjudication2-cpu-{0,1,2}.cpuprofile`, local Worker bundle/source and diagnostic driver.
- Saved official pages/text: https://developers.cloudflare.com/r2/reference/consistency/ and https://developers.cloudflare.com/workers/platform/limits/ .
- Disposable local PostgreSQL and Workerd only; no external services/account inspection, production, browser or owner visual acceptance.

Results published by the owner's explicit «Публикуй» instruction. Disposable PostgreSQL/Workerd stopped, diagnostic worktree removed; local evidence retained. Implementation, PR/head/main, migration/schema/dependencies unchanged. No correction, merge or unrelated Batch L2 work. STOP.

Publication preflight: PR #245 open, exact head `86258701e56407f9ee16505aaf092d23559521df` and base `082530ab6a62c37f4d7acf17556bc496e677ab5f` unchanged. No implementation correction or merge started.

## PR #245 — bounded L6 correction implementation handoff (2026-10-27)

Assignment: [#6431047906](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6431047906), following targeted adjudication [#6431037229](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6431037229). Author implementation-complete; **not an independent whole-PR verdict**.

Existing branch `fix/l6-attachment-storage-zip` and [draft PR #245](https://github.com/iliya1947/vico-forum/pull/245). Previous reviewed/adjudicated head `f673c90cb8d95c68623b690f4f3a0f340f24e03a`. Correction commit `18b687e`; final stable exact head **`86258701e56407f9ee16505aaf092d23559521df`**, a merge of correction and accepted main `082530ab6a62c37f4d7acf17556bc496e677ab5f`. Integration conflict was solely PROJECT_STATE; current main's EDITOR-04 state/code preserved alongside corrected L6 state. GitHub head/base re-fetched unchanged, mergeable=true. No new branch/PR.

### Implemented correction and essential bounds

1. **ATTACH-01:** forward migration `0047_attachment_upload_write_completion` adds nullable `write_completed_at` to the existing L6 journal. Successful PUT is confirmed before that marker is written; metadata admission requires it and the existing unclaimed row lock. Cleanup may DELETE an old unfinished/unknown writer's key, but cannot retire its journal row on that DELETE success. A late materialization therefore remains discoverable and is retried after the existing claim lease. Once PUT completion is known, successful deletion can retire the row. Confirmed authoritative assets still transfer to ordinary reference-aware cleanup after lost metadata ACK. Unknown PUT outcomes deliberately retain retry tombstones until completion is established; a fixed elapsed grace is not treated as proof that no write remains possible. Retry rows rotate by last claim time, and each default bounded pass reserves progress for ordinary assets. No scheduler, public endpoint or general attachment redesign.
2. **ATTACH-STRUCT-01:** central entries are indexed and local records validated in physical-offset order, independently of central order. The next actual local offset bounds this record's header/data/required descriptor; the missing descriptor cannot alias bytes of the next header. Duplicate/overlapping local offsets reject. Existing signed/unsigned classic/ZIP64 descriptors and CRC/signature ambiguity remain supported.
3. **ATTACH-02:** read central metadata in128KiB chunks, retain only that metadata bounded by the50MB upload cap, and use compact12-byte-per-entry ordering indexes. Local validation uses a two-block128KiB cache and physical traversal. No whole compressed payload buffering or decompression. The valid65,535-entry storage finalization now makes **45GETs**, both normal and reversed central order, maximum range128KiB. Actual upload action returns201 within a990-GET test cap; the lower Free internal-service budget is covered without a quota override.

Schema manifest targets0047 and includes the new column; original accepted migrations unchanged. No dependency/public contract changes. PROJECT_STATE updated only for implemented behavior; no preclaimed acceptance. Merged TAR/Remove/405/Editor lifecycle preserved.

### Regression and author verification

- New ZIP/storage regression tests copied onto the old `f673c90` code: **4 FAIL /36 PASS**, proving old descriptor acceptance and per-entry GET amplification; isolated baseline worktree removed after the control. The same targeted current ZIP/storage/action suites: **65 PASS**.
- Actual action→Drizzle→PostgreSQL pending-PUT regressions retain the journal during cleanup, fence late metadata, preserve discoverability after failed fallback DELETE and reconcile after confirmed completion/lease retry. Controls before grace201 and after grace with successful DELETE remain valid. Additional unknown-write test materializes bytes after a successful empty-key DELETE and proves recurring cleanup can find/delete them; retry fairness test preserves settled-asset progress. Current attachment native suite **49 PASS**. These replace the old counterexample behavior recorded in the adjudication.
- Full final local application suite: **1116 tests /102 files PASS**,151.80seconds.
- Full native PostgreSQL17 suite: **311 tests /28 files PASS**,75.56seconds.
- Typecheck PASS; lint0errors/1existing unused-disable warning in ui.test.tsx.
- Application build, UI preview build, built local Worker HTTP smoke PASS.
- Drizzle metadata and generation parity PASS (no additional schema changes); accepted migration-history guard PASS (0046+0047 new against current main); production schema manifest parity48tables, runtime positive/negative privileges, web provisioning/diagnostic/recovery/bootstrap disposable-PG probes PASS.
- Dedicated resource measurement:65,535 fixed-width distinct named empty entries,5,636,032bytes;45GETs for both normal/reversed central directory, max range131,072bytes, outcome stored.

[Exact-head CI #40432588993](https://github.com/iliya1947/vico-forum/actions/runs/40432588993) **SUCCESS**. Database job `121953595669` and checks job `121953596192` both SUCCESS; retrieved completed job logs independently confirm1116app and311PG tests plus applicable checks. Local verification and CI are distinguished above.

Initial author checks found a test-fixture issue (makeOrphan retained a live draft ref, and intentionally pending journal rows needed cleanup between tests), and TypeScript rejected a fixture imported outside its composite include. Fixed the test setup/isolation and moved the shared fixture under app; no implementation workaround or configuration expansion. Final counts above are the successful final runs.

Bounds: controlled byte storage / synthetic ZIPs and local PostgreSQL/Worker; no live R2/Cloudflare/Neon/Hyperdrive/OAuth/backup/restore/production/browser/owner visual actions. Actual external quotas are represented by counted-storage tests; no live account quota or deployment claim. Unresolved writer tombstones are intentionally retained, not silently declared collected. Disposable PG and local preview stopped; baseline worktree removed; implementation worktree/evidence retained for assigned follow-up.

Next: Mira starts a **new whole-PR cycle** on stable `8625870`, followed by designated independent reviewers excluding the implementation author. Old head reviews/adjudication do not supply a verdict for this new head. No self-review, merge, L7/L8 or Lira package changes. Leva STOP.

Local evidence: l6-correction-{app-full,db-full,target3,db-target4,type-final,lint-final,build,preview,schema,pg-probes,smoke,baseline-control,resource}.log under /workspace/work; resource probe source retained there.

## PR #245 — targeted technical adjudication: three CONFIRMED findings (2026-10-27)

Assignment: #236 comment 6430502049. Date 2026-10-27 UTC. Exact head `f673c90cb8d95c68623b690f4f3a0f340f24e03a`, base `bff130db5fb245e3a9ad3391fad54a2fe81aac88`. Author of implementation conducting explicitly assigned technical adjudication, not independent whole-PR self-review. No implementation correction performed. Published by the owner's explicit «Публикуй» command.

## Verdict

All three candidates are confirmed current-scope code defects, with qualifications below. The whole PR is not ready for acceptance on this head. Prior green suites did not exercise these boundaries. Seven focused local diagnostics passed: three real route/Drizzle/PostgreSQL pending-PUT cases and four ZIP/finalizer/quota tests. Passing diagnostic assertions record defective current behavior; they do not indicate acceptance PASS.

## 1. Upload journal retired before a still-active PUT settles — CONFIRMED, ATTACH-01

Actual code: route awaits journal admission before PUT, but no request/PUT deadline or durable writer-completion marker protects that record. cleanupUploadObjects claims a record older than one hour if there is no authoritative asset, deletes the object and then deletes the journal. A DELETE of an absent key does not fence a later write. createDraftAttachment requires the same journal row, so late metadata admission fails after cleanup removes it.

Actual route+Drizzle+PostgreSQL 17 diagnostic holds a PUT pending before object visibility, runs existing cleanup with injected time, then releases the write:
- At 30 minutes: journal remains; PUT completes; HTTP 201, metadata 1, object retained and referenced. Control PASS.
- At 61 minutes with successful fallback DELETE: cleanup removes empty key/journal; PUT then writes; missing journal causes HTTP 400; fallback DELETE removes object. No orphan. Therefore a slow PUT alone does not prove a lasting orphan.
- At 61 minutes with failed fallback DELETE: same order, HTTP 400, metadata 0, object remains. A further cleanup reports claimed 0 / deleted 0 / failed 0: no journal/asset remains from which to discover the object. Durable orphan reproduced. The existing contract explicitly includes recovery after best-effort DELETE failure, so this combination is current scope.

Controlled time advanced without an actual hour-long wait. Byte storage models pending/late commit and DELETE failure; not a live R2 experiment. Current app has no finite PUT timeout. Official Workers limits say HTTP execution and individual subrequests have no fixed wall-clock deadline while the client remains connected; CPU budget is not a one-hour upload bound. Thus runtime does not establish the missing proof that every admitted PUT settles before grace.

Minimal necessary correction scope: upload journal/PUT lifecycle plus existing reconciliation. Durable discoverability must persist until an admitted writer can no longer create/recreate the object, including unknown write outcome and failed DELETE. A journal row lock only around metadata, an increased fixed grace, or a retry of the same best-effort DELETE does not establish that invariant. Preserve ordinary cleanup of settled objects and authoritative committed metadata after lost ACK. Add pending-PUT/cleanup race and failure controls; no new scheduler/public endpoint/external rollout needed. Specific mechanism requires a bounded design before implementation; no schema redesign presumed automatically necessary.

## 2. Missing descriptor accepted by aliasing the next local header — CONFIRMED, ATTACH-STRUCT-01

Generated an independent 201-byte two-entry archive. File a payload is hex 41424344d5702ddf, CRC32=0x04034b50, uncompressed 8 bytes. Valid raw DEFLATE 20 bytes uses a stored block and empty blocks, independently decompressed by Python zlib. File b uses valid 3-byte raw DEFLATE for one byte. Both files extracted and CRC-checked with Python zipfile.

File a sets bit 3 and has no data descriptor. At its dataEnd, the next genuine local header starts. That header's first 12 bytes reinterpret as CRC 0x04034b50, compressed 20, uncompressed 8. descriptorMatches accepts those bytes, with only central-directory offset as upper bound. The validator separately accepts file b at that same offset; no occupied-record interval check forbids overlap.

Executed actual TypeScript validateZipAttachmentStructure and actual storePrivateAttachment/storage finalizer:
- Missing descriptor/next-header overlap 201 bytes: validator=true, outcome=stored.
- Separate unsigned descriptor 213 bytes: true/stored.
- Separate signed descriptor 217 bytes: true/stored.
- Countercontrol changes file b method (consistently in its local/central metadata) so its initial bytes no longer imitate file a's descriptor: false/rejected. The rejection is specifically from failed descriptor matching, not file b extraction support (the generic ZIP path does not restrict method 9).

APPNOTE 4.3.9.1 requires a descriptor immediately after compressed bytes when bit 3 is set. Extractability via central-directory metadata is not proof that the missing descriptor exists as a separate record.

Minimal correction: descriptor/local-record validation must establish actual occupied ranges and prevent a descriptor/data/header interval from overlapping another entry's local record. Return/track matched descriptor length and account for all relevant local offsets without assuming central order equals physical order. Preserve valid signed/unsigned 32/64-bit descriptors and CRC/signature ambiguity. Tests must include this counterexample and valid controls through finalizer. No decompression, payload CRC recalculation, AV or public contract change needed.

## 3. Classic 65535 acceptance exceeds normal Worker subrequest budget — CONFIRMED current-scope algorithm defect, ATTACH-02

Independent Python zipfile generator, allowZip64=False, created 65,535 distinct named empty entries. Archive 5,613,812 bytes, under 50,000,000-byte upload cap. Python verified entry count and CRC/extraction. It is classic ZIP, no ZIP64 requirement.

Actual storePrivateAttachment finalizer over counted bucket completed stored with **262,142 GETs**: 4 per entry (central fixed+variable and local fixed+name) plus 2 (directory tail/archive-extra inspection). privateObjectSource.read maps each nonzero read to bucket.get, and workers/attachment-storage.ts forwards get one-for-one without cache/coalescing.

Quota-model diagnostics execute both finalizer and real upload action with a controlled bucket throwing after 1,000 or 10,000 GETs. Finalizer throws AttachmentStorageError, attempts deletion; upload action returns HTTP 503 with 0 metadata writes. The attempt counters are 1,001 and 10,001 respectively. This proves app behavior under those documented budgets, not a live runtime quota measurement.

Official Workers documentation fetched during adjudication defines R2 calls as subrequests: internal services Free 1,000, Paid configured default 10,000; Paid can configure a higher limit. Current wrangler.jsonc has no limits.subrequests override. It also has **no ATTACHMENT_R2 binding**; workers/app.ts explicitly accepts an optional binding and sets null otherwise. Consequently no claim that an existing deployed upload currently exhausts R2 quota is established: without an injected/provisioned bucket, the route returns unavailable earlier. Live account settings and production behavior were not inspected. This qualification does not resolve the algorithm defect against the explicitly assigned Workers-compatible 65535 acceptance case; deployment of R2 is deferred, but the requested code boundary is current L6 scope.

Minimal correction: bounded, batched/coalesced random access with traversal locality, rather than one remote read for each record field. Prove 65535 finalization within the supported request/storage budget using counted storage regressions; preserve 50 MB memory/streaming bounds and structural validation. Do not merely reject65535, buffer arbitrarily, or silently require a paid quota increase. A configurable higher quota is an alternative deployment requirement/tradeoff, not an automatic correction of the existing default-budget acceptance claim; it would require explicit agreement.

## Sources and evidence

- Official https://developers.cloudflare.com/workers/platform/limits/ (saved HTML/text): subrequests/R2 quotas, CPU versus I/O wait, HTTP/subrequest duration.
- Official https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT (saved), 4.3.9.1–4.3.9.4.
- `/workspace/work/pr245-zip-adjudication.log`: 4 focused tests PASS with structured observed results.
- `/workspace/work/pr245-journal-adjudication.log`: 3 focused PostgreSQL cases PASS; 44 unrelated tests skipped.
- `/workspace/work/pr245-make-zip-probes.py` and generated pr245-descriptor-*.zip / pr245-classic-65535.zip.
- `/workspace/work/pr245-journal-probe-snippet.txt` and saved temporary ZIP diagnostic source.

No broad regression rerun: no implementation changes were made. No live Cloudflare/R2/Neon/Hyperdrive/OAuth/backup/restore/production/browser/visual actions. Local PostgreSQL disposable only. Reports from others were treated as hypotheses and all three causal paths were checked against actual code and targeted controls. Correction, new head, PR edits, merge and next packages not started. Findings published in the service PR by explicit owner instruction; correction still not started. STOP.

Publication preflight: PR #245 is open; head `f673c90cb8d95c68623b690f4f3a0f340f24e03a` unchanged. The designated adjudication baseline remains `bff130db5fb245e3a9ad3391fad54a2fe81aac88`; no claim that current main still equals that baseline.

## PR #246 — independent whole-PR review PASS (2026-10-27)

Date: 2026-10-27 (owner timezone). Assignment: service PR #236 comment6429594867. Individual verdict: **PASS**. No confirmed current-Stage defect found in the assigned EDITOR-04 scope. This is not a team merge-readiness declaration.

Exact head: `4196c36539e71b881f4ced4e1ef8e224acb3ea44`.
Base/current main: `bff130db5fb245e3a9ad3391fad54a2fe81aac88`.
PR: https://github.com/iliya1947/vico-forum/pull/246

Reviewed all six changed files and the complete EDITOR-04 contract: PROJECT_STATE.md; markdown-editor.tsx and its regressions; localization catalog, reviewed fingerprints and RU/HE values. Traced the actual VisualMarkdownEditor paste dispatch, spreadsheetToMarkdown acceptance/decline conditions, clipboardPlainToMarkdown fallback, source-range insertion/history, notice rendering/reset paths, and translation resource loading/runtime. Canonical finding6390856951 distinguishes this missing feedback from EDITOR-01 and other queued literal-text fixes; these independent scopes were not expanded into this PR. PROJECT.md and docs/EDITOR.md contract retained; state addition accurately describes implementation without preclaiming acceptance.

Confirmed behavior:
- Declined TSV conversion uses the unchanged escaped plain-text insertion, then sets fallback notice after replaceSourceRange clears old notice. This fixes the original silent path.
- Valid table conversion and ordinary plain paste clear earlier notice through the existing insertion path. Ctrl+Shift+V bypasses table conversion and produces no misleading decline feedback.
- Generic HTML/no-insertion warning remains distinct from successful plain fallback. Scope/account/context reset clears notice. Undo/Redo retains the inserted source. No state reaches backend persistence.
- English new descriptor and RU/HE manual values are current and consistent with the source fingerprint; actual loader→i18next→mounted component renders the intended text for all three locales.
- No schema/dependency/clipboard parser/public contract change. Other Batch L2 fixes were not folded into this implementation.

Personally executed on the exact head:
- Full application suite: **1097 tests /102 files PASS**,149.89seconds.
- Eight additional temporary mounted review probes PASS: EN/RU/HE actual resource paths and fingerprint; repeated decline→ordinary paste→decline→valid table; explicit plain paste; HTML error distinction and context reset; Undo/Redo; replacement of only the selected source span with surrounding text preserved.
- Typecheck PASS; lint0errors/1existing unused-disable warning in ui.test.tsx:174.
- Application build and UI preview build PASS; diff-check PASS.

Exact-head CI independently fetched and checked: run40417475881 SUCCESS; checks121903280125 and database121903279852 both SUCCESS. Completed job logs show1097application tests/102files and304nativePG tests/28files PASS. CI database evidence is not a personal local PostgreSQL run. PR head/base re-fetched after testing, unchanged.

Verification bounds: mounted components use jsdom and synthetic clipboard events; system clipboard/browser/owner visual, local PG/Worker and external/production services were not run. This feedback-only behavior is exercised through actual component dispatch and actual translation runtime; no layout/visual acceptance is claimed. No whole-PR self-review of authored PR245 performed.

Implementation, remote branches, PR contents and main remain unchanged. Review probes/logs preserved locally outside the disposable worktree. Published by the owner's explicit «Публикуй» command after the completed review. No merge or further implementation started. STOP.

Evidence files: `/workspace/work/pr246-app.log`, `pr246-probes.log`, `pr246-typecheck.log`, `pr246-lint.log`, `pr246-build.log`, `pr246-preview.log`, and `pr246-review.probe.test.tsx`.

Publication preflight independently re-fetched PR246: exact head4196c365 and basebff130db unchanged, PR open. Individual verdict remains applicable.

## L6 — implementation handoff, PR #245 (2026-10-27)

Assignment: [6428907339](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6428907339). Owner explicitly authorized one new implementation branch in this chat after the earlier branch-gate STOP. That blocker is resolved.

Implementation: [draft PR #245](https://github.com/iliya1947/vico-forum/pull/245), branch `fix/l6-attachment-storage-zip`, baseline `bff130db5fb245e3a9ad3391fad54a2fe81aac88`, stable head `f673c90cb8d95c68623b690f4f3a0f340f24e03a`. Scope only ATTACH-01, ATTACH-02, ATTACH-STRUCT-01.

### Implemented behavior and necessary scope

- ATTACH-01: upload route durably records a server-generated private object key before PUT. Migration `0046_attachment_upload_object_journal` adds `forum_attachment_upload_objects`; accepted migrations unchanged. Existing asset/reference cleanup cannot discover objects whose metadata insertion rolled back, which makes this small journal necessary. Metadata admission and journal reconciliation take the same row lock. Existing bounded cleanup preserves authoritative assets after an unknown metadata commit result, deletes unregistered objects after the existing one-hour grace, and retains failed DELETE claims for lease-based retry. Stable-ID retry duplicates and failed best-effort deletion remain discoverable. Journal admission failure prevents PUT. Web runtime receives INSERT/SELECT/UPDATE for journal locking; schema manifest and actual runtime probes include the new relation.
- ATTACH-02: consistent classic EOCD with exactly 65,535 entries is accepted. A genuine ZIP64 locator/EOCD is required when classic bounds cannot describe the directory; ZIP64/classic field consistency retained. A locator-like signature in a classic central comment does not force ZIP64 interpretation.
- ATTACH-STRUCT-01: local/central flags, CRC and sizes agree when bit3 is off; bit3 requires a matching descriptor immediately after compressed bytes. Signed/unsigned classic and ZIP64 descriptors accepted, including CRC equal to the optional signature. Local ZIP64 sizes and malformed descriptor controls covered. Validation remains bounded metadata inspection, with no decompression or recomputation of payload CRC.
- PROJECT_STATE synchronized. Merged TAR/Remove/405 and Editor lifecycle preserved; no dependency change, public endpoint, scheduler, text-draft persistence or AV work.

### Author verification (not independent whole-PR review)

Personally executed on final implementation:
- Full application suite: **1107 tests / 102 files PASS**.
- Native PostgreSQL17 suite: **306 tests / 28 files PASS**.
- Typecheck PASS; lint 0 errors / 1 existing unused-disable warning in ui.test.tsx.
- Application build, UI preview build, built Worker HTTP smoke with split local connection overrides PASS.
- Drizzle metadata check, generation parity (no schema changes), migration-history guard (one new migration, accepted history unchanged), schema manifest parity (48 tables), runtime positive/negative privileges and journal FOR UPDATE probe PASS.
- Disposable PostgreSQL provisioning/credential diagnostic/recovery/bootstrap probes PASS. These are local test checks, not production operations.

Failure-chain evidence: actual upload action + Drizzle + PostgreSQL + controlled byte bucket verifies (1) journal exists before PUT; (2) real metadata INSERT failure/rollback leaves no asset and cleanup deletes the retained object; (3) metadata commits then ACK is lost, response is503 and cleanup preserves the authoritative object/ref; (4) stable-ID retry duplicate DELETE fails, cleanup removes only duplicate and preserves authoritative object; (5) failed orphan DELETE retains claim, blocks late metadata admission, and retries idempotently after lease expiry.

ZIP regressions cover valid/malformed classic/ZIP64 controls and actual storage finalization with range reads/deletion. Running the new ZIP tests temporarily against the baseline validator yielded8 failures/9 passes; restoring the fix yielded17 passes, with the later central-comment regression bringing the final ZIP suite to18 passes. Final archive/storage targeted run35 tests PASS; full application count above includes final tests. PKWARE APPNOTE4.3.9/4.4 consulted.

Verification bounds: controlled byte store and synthetic archive bytes; no real external R2/Cloudflare/Neon/OAuth/backup/restore or production changes. No browser/owner visual acceptance. Cleanup retains the existing one-hour grace and external invocation model; this package does not introduce a scheduler. No test simulates an in-flight storage PUT lasting beyond that grace. Author implementation checks are not an independent review verdict.

### Exact-head GitHub CI

[Run40417069540](https://github.com/iliya1947/vico-forum/actions/runs/40417069540) **SUCCESS** for `f673c90cb8d95c68623b690f4f3a0f340f24e03a`. `checks`121901961935 and `database`121901962286 both SUCCESS. Retrieved both completed job logs:1107 application tests/102 files and306 PostgreSQL tests/28 files PASS; lint/typecheck/builds/metadata/parity and database schema/privileges/Worker smoke passed. GitHub PR245 head unchanged, base bff130db, mergeable=true. Local preview and disposable PG stopped/removed; worktree preserved for any assigned corrections.

Next: Mira starts the coordinator whole-PR cycle on the stable exact head; independent reviewers must not include the implementation author. Lira's Batch L2 remains separate. No merge or L7/L8 work; Leva STOP after handoff.

## L6 — branch authorization blocker (2026-10-27)

Assignment: [6428907339](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6428907339). Scope remains ATTACH-01, ATTACH-02, ATTACH-STRUCT-01; designated main bff130db5fb245e3a9ad3391fad54a2fe81aac88 verified by git ls-remote.

Read-only branch preflight: enumerated actual remote refs via git ls-remote --heads, compared local branches/remotes, and fetched merged PR238/239 metadata. My prior implementation refs fix/auth-rate-limit-race-01, fix/auth-session-identity and fix/failure-semantics-edit-recovery are absent from GitHub. Local worktrees/branches and stale remote-tracking refs are not existing remote branches; publishing one again would create a branch. Other historical remote refs exist, but no safely suitable L6 implementation branch was established; they were not repurposed without provenance/assignment. GitHub issue-search returned no open results even though communication PR236 is known, so that empty result was not used as proof that all branches are unassigned.

Assignment explicitly says: «не создавай новую ветку только ради этой задачи без отдельного разрешения владельца… если такой ветки нет и без новой продолжить нельзя — сообщи blocker и STOP».

L6 implementation NOT started. No branch/PR/code/main mutation, no implementation checks or verdict. Request: authorize one new L6 implementation branch from bff130db, or designate an existing branch safe to reuse. Leva STOP.

---

## PR241 aa41937 — Leva independent whole-PR review

Date: 2026-10-26 (Asia/Jerusalem).
Assignment: https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6426806294

**Verdict: PASS on aa41937edf6ce32d74bed27d39c9d7c43aa1eecf. No confirmed current-Stage defect found in the complete assigned package5 scope.** This is a new whole-PR review, not restoration of the withdrawn PASS for f5cdf718 and not merely a review of Lira's correction diff. The earlier omissions and adjudication remain recorded.

GitHub base:4c4bb59c4b7e3c47a6598034b9bd75b6a06d032a.
Actual PR merge-base:1364d5768906c6746c4397c615f846797051eb76.
Head tree:0d127f2ef1b417f2b073a67c66aaa1de59aea8fd.
Reviewed complete PR merge-base...head:16 files,549 additions/54 deletions, and also compared the explicit current base. Its extra AGENTS.md changes are base-side only, not a PR deletion or implementation change. Current owner assignment governs review roles.

### Canonical coverage and causal assessment

#### HELP-01 — all three canonical subcases

Canonical6388946847 explicitly includes stale relationship removal, stale appeal resolution, stale author appeal creation. All three were checked against actual current source end-to-end, with native action/write-path controls, rather than inferring closure from lock presence or passing suites.

Removal form carries observed duplicateRelationshipId; topic action rejects missing expectedRelationshipId; writer/service require and forward it; repository locks topic and active relationship, then compares before any terminal mutation. Replacement R1->R2 rejects old R1, preserving R2 and pending state.

Accept/reject forms carry pending appeal ID. Both topic action and the pre-existing Attention route pass expectedAppealId. It is mandatory throughout service/writer/repository; repository locks topic/relationship/pending appeal and rejects a different current ID before updating appeal/relationship. Native replacement while waiting rejects old appealA and leaves new pendingB. Current reject works. Existing database tests cover current accepted resolution/removal and the Attention pathway.

Author creation is now fenced separately: loader gives the topic author appealExpectedRelationshipId from the same topic presentation, even without moderation permission; generic topic.duplicateRelationshipId stays null for non-managers and guests get no author field ID. The form submits the observed identity. Action, writer, service and repository pass/check it. Ownership, Help section, active relationship and no-pending checks remain. The authoritative ID comparison runs after topic/relationship locks and before appeal insertion.

Personally reran the previously failed causal sequence through actual topicAction->real writer->ForumService->DrizzleForumRepository->PostgreSQL: missing expected ID400; R1 removed/no replacement409; R1->R2 stale form409/no appeal; wrong owner403; request already blocked on topic lock while R2->R3 replacement commits409/no appeal; matching currentR3 creates intended pending appeal302; second pending appeal409. An observed pg_stat_activity Lock event confirms the concurrency boundary was exercised. The previous stale-create finding is closed on this head.

#### HELP-MOD-01 — all three moderation intents

Canonical6389030386 includes needs-review/outdated/clear for a replaced best answer. Each form submits expectedBestAnswerPostId; action rejects absence; service/writer propagate; repository reads/compares under topic lock before post update or signal supersession. Best-answer replacement itself uses the same topic serialization boundary.

Independent real-action probes replaced A->B during an observed lock wait: stale needs-review409/newB untouched. Then all three stale intents, including outdated with old reason and clear while B has a new moderation status, return409 and preserve B. Current needs-review/outdated/clear work with302 and intended stored state. Existing revalidation textarea reset remains intact; identity fencing supplements it.

#### HELP-02 — both lifecycle mutation paths

Canonical6391531526 covers manual relationship removal and accepted/rejected appeal resolution using transaction-start time after lock waits. Both terminal timestamp expressions now use statement_timestamp() in updates executed after topic/relationship/appeal locking. Each terminal update statement obtains fresh time; no JavaScript/transaction-start timestamp is reused. Schema lifecycle checks remain.

Personally executed native PostgreSQL suite, including tests that observe actual lock waiting, advance relationship.confirmed_at or appeal.created_at after the waiting transaction starts, commit the blocker and require waiting removal/resolution to succeed under the original CHECK constraints. No new schema/migration workaround. Pending-appeal terminal update during manual removal also uses the same post-lock SQL statement-time expression.

#### TAG-CARDINALITY-01 — both public topic flows

Canonical6388113646 concerns durable write fan-out of one ordinary topic publication, not arbitrary corpus scale or body-size policy. normalizeForumTags caps at10 unique nonempty names after NFKC/trim/whitespace collapse/en-US case deduplication. Existing per-tag length/slash validation remains. Both service createTopic and createTopicWithInitialPost normalize before entering repository; public section/Help writer uses this service boundary. Direct repository is not the public input boundary.

Independent real action->writer->PG probe for sectionAction and helpSolutionsCategoryAction:10 unique plus empty/case/NFKC duplicates returns302 and persists10tags;11unique returns400 with unchanged topic and global-tag counts. Native regression separately checks overflow creates neither a topic nor global tags. No per-write cooldown or downstream list limit was misrepresented as the cardinality guard.

#### DOC-03 — all three canonical locations

Canonical6391770817 explicitly names UI_UX_PASS, PROJECT_STATE and catalog metadata. Checked all three on this head, not only edited UI_UX_PASS:

- UI_UX_PASS:pending badge moderator-only in lists/topic; author own pending message distinguished.
- PROJECT_STATE:older public assertion corrected to moderation-only; later accepted contract and new package note agree.
- catalog:helpDuplicateDisputed description now Moderator-only; source remains Disputed.

Verified actual list/topic visibility guards and existing guest/author/manager mounted regression. New author relationship expectation does not grant management authority or make generic list IDs public. Independently computed new descriptor fingerprint27f9d069cb3b7de40dac264b83180fa8df8fd83af306b4cdcb5a7ca241738f8d; checked reviewed literal and LocalTranslationSource RU/HE packs remain current and return the existing translations. No metadata staleness introduced. This closes the second adjudicated finding; no runtime visibility defect is claimed.

### Complete diff and regression assessment

Reviewed all16 changed files, including all test changes, PROJECT_HISTORY H-013 and PROJECT_STATE statements. Policy-clock correction is test-only. No schema, migration, dependency or authorization redesign. Current Help/source-of-truth boundaries and original implementation handoff6418615989 were compared. No remaining canonical subcase, new current-Stage regression or future-only concern requiring correction was identified. Unrelated backlog is not claimed closed.

### Personally executed verification

- Full application suite:102 files/1081 tests PASS,177.96seconds.
- Full disposable PostgreSQL17 suite:28 files/304 tests PASS,91.49seconds, including new stale-create sequential/lock-wait case and lifecycle timestamp tests.
- Additional native action probes:four observed replacement lock waits (remove,resolve,best-answer,author create), all expected HTTP/domain responses and persisted-state assertions PASS; both public tag paths PASS as described.
- Independent DOC-03 fingerprint/manual-pack probe PASS for RU/HE.
- pnpm typecheck PASS.
- pnpm lint PASS;0errors/1existing unused-disable warning in ui.test.tsx:174.
- pnpm build and pnpm ui-preview:build PASS.
- pnpm db:check PASS;git diff --check PASS. No drizzle/schema/dependency diff.
- Exact-head GitHub CI40393643866 independently fetched:SUCCESS;checks121820842407/database121820843041 SUCCESS. CI Worker/runtime/privilege guards are CI evidence, not personally rerun local Worker smoke.

Evidence under /workspace/work/:pr241-new-app.log,pr241-new-db.log,pr241-new-typecheck.log,pr241-new-lint.log,pr241-new-build.log,pr241-new-preview.log,pr241-new-metadata.log,pr241-new-route-probes.mjs/.log,pr241-new-doc-probe.mts/.log. Native probes adapt my earlier independent harness to the current mandatory-ID contract and extend it with stale author creation/current/negative/ownership/lock controls; all assertions were rerun on this exact head.

### Limits and handoff

Auth session/permission context in extra route probes is controlled; actual ownership validation, action, writer, service, repository and transactions use real local PostgreSQL. Mounted UI uses jsdom and fixtures. No Chromium/browser, owner visual acceptance, external Cloudflare/Neon/Hyperdrive/R2/OAuth/backup/restore, production or deployment checks were performed. No implementation or main changes. Local PostgreSQL container stopped/removed and isolated worktree removed after completion.

This is a personal independent technical verdict for aa41937 only, not a whole-team synthesis or merge authorization. Lira participated in correction and is not counted as an independent reviewer. Published after the owner's explicit «Публикуй» instruction following the completed review in this chat. Leva STOP.


---

## PR244 — independent whole-PR review by Leva

Date: 2026-10-26, Asia/Jerusalem.
Assignment: direct owner instruction in current chat, «Проверь #244». This renews the previously canceled PR244 review scope; no other implementation task is implied.

Verdict: PASS. No confirmed current-Stage defect found in the complete LOC-04 PR.
Exact head: 7c750ba8bfa0d0efc9d6046395a97d033c64d6a5
Base: 4c4bb59c4b7e3c47a6598034b9bd75b6a06d032a
Tree: dbda7b45f92f4b3e3c06869887201c6b33512abb
6 changed files;62 additions/1 deletion. Implementation was not edited.

### Original task and complete coverage

Implementation assignment6424272144 requires history-specific loading copy, preserving attachment copy and other localization/runtime semantics. Canonical LOC-04 / I18N-COPY-01 mapping appears in reconciliation6387795828 and6387897803: pending post-history uses attachment-restoring text. Compared the complete six-file diff with that causal chain, current docs/EDITOR.md effective-history-permission contract, TRANSLATION_ARCHITECTURE.md local/manual freshness and fallback contracts, and surrounding current TopicView/action/resource code. No other reviewer's conclusions were used.

- app/forum/views.tsx:2899 changes only the history-fetcher pending message key to postHistoryLoading. Existing role=status, permission gate, historyPostId/current-post guard, pending/idle/error/revisions branches and data fetching remain unchanged. readPostHistory action still checks effective forum.post.history.read, validates post ID, returns protected revisions or typed failure. No authorization/attachment changes.
- app/localization/catalog.ts:407 adds one ordinary common message with source “Loading edit history…” and protected-revisions loading description, no placeholders. The existing attachment-restoring descriptor is byte-for-byte unchanged.
- app/localization/manual-values.ts adds appropriate Russian/Hebrew loading-history text; app/localization/manual-fingerprints.ts adds the reviewed fingerprint for the exact source semantics. This is a new key, not an unjustified regeneration of old translations. Both complete packs remain fresh.
- app/forum/public-read.test.tsx mounts actual TopicRoute through createMemoryRouter/RouterProvider, clicks Edit history, checks the submitted intent/post ID, deliberately holds a deferred action response, observes loading role=status/history copy and absence of attachment copy, resolves postHistory revisions and checks revision content plus status disappearance. It verifies actual pending UI rather than only calling a label helper. Existing tests cover history/edit visibility and associated permission presentation. Data/action fixtures are controlled; this is not live DB/auth E2E.
- PROJECT_STATE.md scopes the correction to an implementation branch and correctly records copy/key/test changes; it does not predeclare CI, independent review or merge acceptance.

No uncovered canonical subcase, independent current-Stage defect or regression in this PR was identified. Existing wider localization/backlog findings are not claimed fixed and were not added to this narrow scope.

### Verification personally performed

- Four existing suites: app/forum/public-read.test.tsx, app/localization/resources.test.ts, app/localization/resource-loader-bundles.test.ts, app/localization/bundles.test.ts. All100 tests PASS,16.65seconds. Includes new mounted pending-history regression, existing permission/presentation behavior, full reviewed-pack completeness/currentness and resource/bundle handling.
- ESLint on all five changed TS/TSX files: exit0, no warnings/errors.
- Independent native localization probe computes sourceFingerprint(postHistoryLoading) and verifies exact45f26d22cf537dbc34b316a306b1e151e2f312f42f4f81b33023f1dca9155105. Runs actual LocalTranslationSource/CanonicalEnglishSource -> TranslationResourceLoader -> createTranslationRuntime for EN/RU/HE, verifies exact history-specific strings and no stale key; then injects a stale fingerprint separately for RU/HE and observes the English history fallback. All five locale scenarios and fingerprint assertions PASS. Attachment string remains distinct.
- git diff --check PASS; tracked implementation worktree clean.
- Independently fetched CI40380768112 on exact head: SUCCESS, checks121776038928/database121776039411 SUCCESS, including CI lint/typecheck/test/build/UI-preview/migration/schema/DB/Worker steps. These are GitHub CI observations; no claim of personally running those full suites locally.

Evidence: /workspace/work/pr244-focused-tests.log, pr244-lint.log, pr244-localization-probe.mts and pr244-localization-probe.log.

### Limits and handoff

No new tests or changes to implementation, schema, dependencies, permissions or runtime contracts. Focused local tests plus complete source/canonical comparison are appropriate to this six-file copy/key correction; full application/typecheck/build/PG/Worker checks were verified in exact-head CI and not unnecessarily rerun locally. No browser/Chromium, owner visual acceptance, live service, production or external rollout was performed. No merge authorization or whole-team synthesis is claimed.

Published after the owner's explicit «Публикуй» instruction following the completed review in the current chat. PR243/PR241 implementation untouched. Isolated worktree removed after review. Leva STOP.


---

## PR243 — independent whole-PR review by Leva

Date: 2026-10-26 (Asia/Jerusalem).
Assignment: https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6425662329
Supersedes the PR244 part of assignment6425483005: PR244 was NOT reviewed.

Verdict: PASS. No confirmed current-Stage defect found in the assigned whole-PR scope.
Exact head: d5f992602fcc78276155a63aa14f56b931dd7656
Base: 4c4bb59c4b7e3c47a6598034b9bd75b6a06d032a
Tree: d6a30dd6522a6cabce87dee23b998ff11dfa7e0f
18 changed files;404 additions/18 deletions. Implementation was not edited.

### Scope and original finding coverage

Reviewed all18 changed files, affected callers and renderer/write boundaries against current docs/EDITOR.md, ROADMAP current-Stage boundary, PROJECT_STATE and original canonical findings. This review did not rely on another reviewer's verdict.

ATTACH-03: canonical reconciliation6391178524, with implementation assignment6421152256. Existing TAR support requires valid nonzero empty archives. Content detection now recognizes two512-byte zero end markers; post-storage structural validation requires the entire empty archive to be zero padding and block-aligned. Header-bearing archives retain existing validation. Type/MIME/extension gates remain. Stream-to-private-object finalization rejects malformed trailing content and removes rejected objects. Existing size/length/error handling is retained. This closes the canonical empty-TAR subcase without claiming all attachment findings closed.

ATTACH-04: canonical6391178524 and assignment6421809155 require local pending Remove, keeping text/other selected files, with late ACK suppression; no per-file network abort/DELETE required. Reviewed UI button gating, remove handler, per-request WeakSet, all progress/load/error/abort callbacks, published-edit410 operation restart, blocking/selected IDs, whole-operation Cancel and image removal callback. Removed callbacks return before terminal handling. Existing mounted regressions exercise unsaved text plus three files, kept stored/pending files, late success/error/progress, and removed published-edit410 without restarting the kept operation. Local Remove changes selection only and leaves ordinary private lifecycle intact.

ATTACH-HTTP-405-01: canonical6388141755 and assignment6422256497 concern real router dispatch and Allow. Reviewed actual route registration and both exports. Unsupported HEAD is handled by loader and PATCH/PUT/OPTIONS by action, using405 with Allow: GET, POST, DELETE plus no-store/nosniff. Tests invoke createStaticHandler.queryRoute using configured resource path and actual exports; successful GET200/POST201/DELETE200 remain tested. Existing per-file DELETE stays405. Supported permission/origin/write paths are unchanged.

EDITOR-01: canonical6390856951 and assignment6422608436 concern global newline collapse corrupting successful HTML pre conversion. Generated fences protect code from prose compaction. Fence length remains greater than any code backtick run. Existing regressions verify exact parser code value, embedded backticks and adjacent prose. Independently checked flat, blockquote, unordered-list and ordered-list HTML pre examples with four consecutive newlines: all preserve parsed code value. Nested containers prefix blank lines with quote/list markers, so the prose newline compactor does not collapse those code lines. Other clipboard fallback behavior was not claimed fixed.

EDITOR-02: canonical reconciliation6389485203; assignment6423361282. Reviewed spreadsheet/HTML table conversion through serializeTable/encodeTableCell, Simple decode/edit and actual ForumTable ReactMarkdown rendering. All ASCII punctuation is escaped as literal; generated separator rules remain raw structural Markdown. Editing decodes supported escapes and re-encodes once; addTableDimension preserves existing cell source escapes verbatim. Existing regressions cover TSV/HTML output, parser segmentation, rendered literal strong/link syntax, backslash/pipe/newline, mounted paste/edit. Independently checked21 cell values through source->decode->real ForumMarkdown SSR and again after adding a column, including entities, links/images/code/strike syntax, escaped pipe/backslash combinations, Unicode and punctuation. All preserved literal text with no generated strong/link/image/code elements. Authored ordinary Markdown rendering and unrelated serializers were unchanged; wider LITERAL-TEXT-01/EDITOR-10 findings remain separate.

PROJECT_STATE describes implementation branch progress, does not predeclare independent acceptance. No schema, migration, dependency, authorization or external service changes are in this PR. No uncovered canonical subcase or additional confirmed current-Stage defect was identified.

### Verification personally performed

- pnpm test:101 files/1090 tests PASS (144.42seconds).
- pnpm typecheck: exit0. Wrangler emitted a log-directory diagnostic for inaccessible default user config path; generated types/router types/TypeScript completed. No tracked generated file changes.
- pnpm lint: exit0, zero errors, one existing unused-disable warning in app/forum/ui.test.tsx:174.
- pnpm build: PASS.
- pnpm ui-preview:build: PASS.
- git diff --check: PASS; tracked worktree clean throughout review.
- Independent probe:4 HTML code container cases;21 literal-table render/decode/dimension cases;12 actual chunked upload/finalization TAR controls (257-byte input chunks, sizes512/1024/1536/4096/10240/67584, validzero and nonzero-tail variants). All assertions PASS. Storage is a controlled in-memory PrivateAttachmentBucket, not external R2. Initial probe incorrectly expected a storage DELETE for an invalid signature rejected before any object was written; corrected the probe invariant to require zero retained rejected objects. No implementation correction was required. SSR probe used actual ForumMarkdown with no initialized i18next provider; literal text cases do not depend on translated controls.
- Independently fetched exact-head CI40375402307: completed SUCCESS. Checks121756983540/database121756983160 SUCCESS, including CI database/runtime/Worker checks. These are CI observations, NOT personally rerun local PostgreSQL/Worker smoke.

Evidence: /workspace/work/pr243-review-probe.mts and .log; pr243-tests.log, pr243-typecheck.log, pr243-lint.log, pr243-build.log, pr243-preview-build.log.

### Limits and handoff

No local PostgreSQL, browser/Chromium, visual acceptance, production or external-provider test was run. Mounted regressions use jsdom/FakeXMLHttpRequest; extra rendering uses SSR; object bytes use an in-memory adapter. None is represented as live-service E2E. No merge authorization or whole-team synthesis is claimed. PR241 correction belongs to Lira; PR244 review was expressly canceled for this assignment.

Review complete. Published by the owner's explicit «Публикуй» instruction after the result was reported in the current chat. No review findings were disclosed to other reviewers during this assignment. Leva STOP.


---

## PR241 — adjudication Лёвы: A CONFIRMED; B CONFIRMED

Date:2026-10-26,Asia/Jerusalem. Assignment:[6420951578](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6420951578).
Unchanged exact head:`f5cdf71837aee78a31856c766c087c9bbf54a496`;base:`1364d5768906c6746c4397c615f846797051eb76`;tree:`4ba25681febb43f1392a826b0a2cf2d7b9dd8b6f`.

**The previous personal whole-PR PASS published in6420790016 is withdrawn for this head. My corrected technical verdict is CHANGES REQUIRED.** I independently confirmed both disputed remaining parts of the original scope. This is not a majority vote,not an expansion of scope and not a new implementation assignment. No change to PR241/main was made.

My prior review exercised stale removal,resolution and best-answer moderation but missed the separately canonicalized stale appeal-creation case. It checked the edited DOC-03 paragraph against presentation code but failed to check all locations explicitly included in the canonical finding. Those omissions made my claimed full-scope PASS incorrect.

### A — HELP-01 stale appeal creation: CONFIRMED

Canonical source:[6388946847](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6388946847),HELP-DUP-STALE-01. It explicitly defines three subcases:stale relationship remove,stale appeal resolution,**stale appeal creation**. The creation subcase is current-Stage relationship semantics,not future hardening. PR241 closes the first two but not the third.

Actual source chain on the assigned head:
- [Author form,views.tsx:2634](https://github.com/iliya1947/vico-forum/blob/f5cdf71837aee78a31856c766c087c9bbf54a496/app/forum/views.tsx#L2634) sends intent/explanation and no observed relationship expectation.
- [Action,actions.server.ts:365](https://github.com/iliya1947/vico-forum/blob/f5cdf71837aee78a31856c766c087c9bbf54a496/app/forum/actions.server.ts#L365) forwards only topicId,actorId,explanation.
- [Writer:220](https://github.com/iliya1947/vico-forum/blob/f5cdf71837aee78a31856c766c087c9bbf54a496/db/hyperdrive-forum.ts#L220) and [service:251](https://github.com/iliya1947/vico-forum/blob/f5cdf71837aee78a31856c766c087c9bbf54a496/db/forum-service.ts#L251) have no expected-relationship parameter.
- [Repository:3433](https://github.com/iliya1947/vico-forum/blob/f5cdf71837aee78a31856c766c087c9bbf54a496/db/forum-repository.ts#L3433) locks/selects the currently active relationship and [inserts:3452](https://github.com/iliya1947/vico-forum/blob/f5cdf71837aee78a31856c766c087c9bbf54a496/db/forum-repository.ts#L3452) against that relationship. Ownership/Help/pending checks are valid but do not bind the intent to R1.
- [Loader:185](https://github.com/iliya1947/vico-forum/blob/f5cdf71837aee78a31856c766c087c9bbf54a496/app/routes/topic.tsx#L185) removes the newly introduced relationship ID from actors without management permission; the ordinary author currently cannot obtain it for this form either.

Independent native reproduction used clean disposable PostgreSQL17 with all46 migrations and the real topicAction→writer→service→repository path:
1. Author's public topic snapshot contains R1,Duplicate of original-X.
2. Manager removes R1 using its correct existing removal expectation.
3. Negative control before replacement:the old appeal submission returns409 and creates0appeals. Thus the no-active-relationship guard works.
4. Manager creates R2 for the same question,now pointing to original-Y.
5. Submit exactly the old author-form fields,intent=appealHelpDuplicate plus explanation="This question is not a duplicate of original X."
6. Actual response302; PostgreSQL stores a pending appeal against **R2/original-Y** with the explanation for original-X. The current relationship remains R2 and becomes disputed.
7. Additional control:even sending an unsolicited expectedRelationshipId=R1 is ignored by the current action; it again returns302 and creates a pending appeal for R2 after the previous appeal was resolved.

This needs neither simultaneous requests nor a browser-specific event to fail:ordinary state replacement between page load and submit is enough. Role/origin/ownership guards do not prevent it because the same author legitimately owns the same question. The missing information is which relationship the author's intent concerned.

Classification:remaining **current functional defect within the existing HELP-01 family**,not a fourth subcase/new root-cause group. Required correction outcome:the author operation must carry the observed relationship identity through all relevant boundaries and compare it under the existing locks; stale R1 submission after R2 replacement must conflict without creating an appeal for R2. The author must be able to supply that expectation without granting moderation authority or expanding unrelated public list projections. Implementation mechanism/scope is not assigned by this report.

### B — DOC-03 incomplete cleanup: CONFIRMED

Canonical source:[6391770817](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6391770817). It explicitly includes all three locations:UI_UX_PASS,PROJECT_STATE and localization catalog metadata. It classifies the inconsistency as current SOT/copy documentation,**not a runtime visibility defect**.

On the exact head:
- UI_UX_PASS:439–445 was corrected to the moderator-only contract.
- [PROJECT_STATE:1446–1447](https://github.com/iliya1947/vico-forum/blob/f5cdf71837aee78a31856c766c087c9bbf54a496/PROJECT_STATE.md#L1446) still says the topic page publicly shows a neutral Disputed marker. The same file [1455–1457](https://github.com/iliya1947/vico-forum/blob/f5cdf71837aee78a31856c766c087c9bbf54a496/PROJECT_STATE.md#L1455),the accepted re-test at1466–1469 and the new package5 note at35–36 say moderator-only.
- [Catalog:192](https://github.com/iliya1947/vico-forum/blob/f5cdf71837aee78a31856c766c087c9bbf54a496/app/localization/catalog.ts#L192) still describes helpDuplicateDisputed as "Public neutral marker while a confirmed duplicate relationship has a pending author appeal."
- Existing code continues to gate the list badge with canViewDuplicateDispute and the topic badge with canManageHelpDuplicate; an appealing author gets a separate own pending message. That code was not changed in this adjudication.

PROJECT_STATE's own purpose at7–8 says it records current state,not contradictory historical guidance; adding another correct note above does not remove the stale assertion. The canonical DOC-03 already named these exact remaining locations. Moving them into future DOC-01 would therefore change the agreed finding boundary and leave the assigned package5 sidecar incomplete. No evidence supports RECLASSIFIED or REJECTED.

Classification:remaining **current documentation/localization-metadata defect within DOC-03**,not a newly confirmed runtime defect. Required outcome:make the two remaining texts agree with the existing moderator-only contract,with applicable localization-metadata/fingerprint checks. General PROJECT_STATE reorganization remains a separate DOC-01 concern; this narrow wording correction does not depend on it.

### Verification limits and next step

This was the assigned two-finding adjudication,not another full whole-PR review. The unchanged head's earlier1080app/303PG green suites do not prove closure of these untested/unread canonical subparts. No unnecessary full-suite rerun was used as a substitute for the focused reproduction. New native probe passed all assertions proving the stale behavior and its controls. Source/canonical comparisons establish B. Auth session was a controlled fixture; actual database ownership validation,writer,service,repository and transactions were used. No Chromium,visual acceptance,production or external-service checks were performed.

Evidence outside implementation:`/workspace/work/pr241-stale-create-adjudication.mjs` and `pr241-stale-create-adjudication.log`. No project source/schema/dependency or implementation PR change. Test PG container stopped/removed; isolated clean worktree removed after completion.

Мире:both disputed remaining parts are independently CONFIRMED; account for withdrawal of my previous PASS and establish the bounded correction assignment separately. This report does not start correction,assign an implementer,merge PR241 or start another package. Лёва STOP.


## Предыдущие отчёты — historical context; PR241 PASS ниже отозван adjudication выше

## PR241 — independent whole-PR technical review Лёвы

Date:2026-10-26,Asia/Jerusalem. Assignment:PR236 comment6419875144. Process decision:6419873950 (parallel blind reviews; no publication before all assigned independent reviews finish and separate developer instruction).

**Verdict: PASS in the full assigned repository/local-CI scope. No confirmed current-Stage defects found.** The report stayed local/private during the blind review. No GitHub comment,personal-file update or shared-status write was made before completion. Publication is now explicitly authorized by the developer's subsequent command «Публикуй». Findings/verdicts of other reviewers were not consulted or used as proof.

- Exact implementation head:`f5cdf71837aee78a31856c766c087c9bbf54a496`.
- Base:`1364d5768906c6746c4397c615f846797051eb76`.
- Tree:`4ba25681febb43f1392a826b0a2cf2d7b9dd8b6f`.
- Scope:HELP-01,HELP-02,HELP-MOD-01,TAG-CARDINALITY-01;DOC-03.
- Whole diff:14files,353additions/42deletions. All changed production paths,tests and documentation reviewed against original package assignment6418615989,current Stage and relevant source-of-truth.

### Technical review

#### Help identity/state fences (HELP-01,HELP-02,HELP-MOD-01)

Checked end-to-end input flow:TopicView hidden fields → topicAction validation/authz → writer → service runtime text checks → repository comparison after existing topic/relationship/appeal locks.

- Duplicate removal requires exact expectedRelationshipId; current active relationship is selected/locked before equality check. A stale relationship never removes its replacement.
- Appeal decisions require expectedAppealId. Selected current pending appeal must match exactly; resolved/missing/replaced appeal is a domain conflict.
- All three solution moderation intents require expectedBestAnswerPostId; repository rechecks Help section,solved state,selected answer and identity under topic lock before changing post status/signals.
- Missing expected identity produces controlled400; existing auth/session/origin/permissions remain authoritative. Identity is a concurrency expectation,not an authorization grant.
- Forms carry the actual observed IDs for removal,accept/reject and needs-review/outdated/clear. Existing mounted/public-read regressions pass.
- New relationship ID is returned by real topic reads,then nulled by topic loader for actors without duplicate-management permission. Both Help list projection builders explicitly select existing public fields and do not spread the new ID. Private appeal details retain existing author/manager scope. Guest/author/manager projection regressions pass.

Additional independent native action probes used actual topicAction/writer/service/repository/PostgreSQL. In three cases an action was started while a separate transaction held its topic row lock; pg_stat_activity confirmed actual Lock wait. The blocker then replaced the relationship,pending appeal or selected best answer before releasing the lock. All three stale actions returned409; current replacement state remained unchanged. Current-target controls returned302 and applied only the intended mutation. All six moderation intents without identity returned400. Auth-session and permission resolution were controlled fixtures for these focused probes; the actual writer/transactions were not mocked.

#### Lifecycle timestamps after lock waits

Checked that removal/appeal resolution evaluate statement_timestamp in subsequent UPDATE statements after acquiring the relevant locks,not transaction-start now(). Repository mutations acquiring the same topic lock cannot replace that state between identity validation and mutation. Existing transaction rollback and relationship/appeal CHECKs remain intact.

Personally ran both new real PostgreSQL wait regressions in the full303suite:they establish an actual Lock wait,write a later confirmed_at/created_at while holding the blocker,then release it and complete transitions without inverted timestamps. They do not infer ordering from a guessed sleep. Accepted/rejected appeal behavior and manual removal's handling of pending appeals remain covered.

#### Public tag cardinality (TAG-CARDINALITY-01)

Checked both public authoring actions and writer→service validation order. Limit10 is applied after NFKC,trim,whitespace collapse and existing case-insensitive key deduplication. It rejects before repository topic/global-tag persistence; service normalization remains the shared boundary. Each tag's existing length/slash rules remain enforced; no schema/dependency changes.

Additional independent real public section/help action probes each:
- accepted10 unique tags with empty entries,case duplicates and fullwidth NFKC-equivalent duplicates; stored exactly10;
- rejected11 unique tags with controlled400;
- compared total topic and global-tag counts before/after rejection and observed zero writes.

Full application tests also include the new normalization cases; native suite independently verifies service rejection leaves no topic/overflow global tags.

#### DOC-03 and scope

Compared changed UI_UX_PASS contract with existing list/topic badge conditions and author-specific appeal presentation. Pending Disputed badge is permission-gated to duplicate managers in both places; an author can see their own pending appeal message without the moderator badge. PROJECT_STATE/H-013 describe current identity/timestamp/tag implementation without claiming external rollout or merge. No existing Help feature was redesigned beyond the assigned boundaries.

### Personally executed verification

- **1080/1080 application tests PASS** (102files).
- **303/303 disposable PostgreSQL17 tests PASS** (28files),including both lock-wait timestamp regressions.
- Additional native real action probes above PASS; all3 observed-lock stale-target cases and both public tag authoring flows.
- Project typecheck (Wrangler types,React Router typegen,TypeScript) PASS.
- ESLint0errors,one preexisting unused-disable warning at app/forum/ui.test.tsx:174.
- Production and UI-preview builds PASS; existing preview chunk-size warning retained.
- Drizzle metadata check PASS; migration-history guard PASS with0new migrations and accepted history unchanged.
- Local built Worker smoke PASS.
- Exact-head CI40345202786 independently checked SUCCESS; checks121650163977/database121650163590 SUCCESS.
- Final metadata remains same head/base;PR241 open and unmerged. No tracked implementation changes.

No Chromium/owner visual acceptance,real Cloudflare/Neon/external Hyperdrive/R2/OAuth/backup-restore,production/deployment,merge or next-package work was performed. Node/action and PostgreSQL probes establish functional boundaries; they are not external/visual acceptance. Local Worker/PG stopped/removed; temporary clean review worktree removed after verification. Shared dependencies were not changed.

### Local evidence

Under `/workspace/work`:pr241-review-app.json,pr241-review-db.json,pr241-route-probes.mjs,pr241-route-probes.log,pr241-review-typecheck.log,pr241-review-lint.log,pr241-review-build.log,pr241-review-preview.log,pr241-review-drizzle.log,pr241-review-migrations.log,pr241-review-worker.log,pr241-review-smoke.log and pr241-review-preview-artifact/. The extra probe source was outside the implementation worktree. Reproduction requires checking out the same head at the original review path and providing local PG; the worktree was removed after completion.

### Stop/publication barrier

Review complete. The developer subsequently gave the separate command «Публикуй» authorizing publication of this completed personal verdict. Only this reviewer’s result is published; no conclusion about completion/verdicts of other reviewers or whole-team merge authorization is inferred. Мира coordinates the review-cycle synthesis. Лёва STOP.


## PR240 — final independent technical review Лёвы: PASS (2026-10-26)

Assignment: [6415538591](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6415538591). Scope: DB-01,DB-02,DB-03,CORE-01,CORE-02,CORE-03 and DOC-02.

Exact head: `ec954ac55a140c5cee7cb66b5b7d6ca4537b9480`.
Base: `8f56479890f63000149354820a6b5162bb9de492`.
Tree: `ecfd455e50df0fb4242f0c8541e15e03804df3c0`.
18 changed files,5532 additions/15 deletions; most additions are the generated migration snapshot.

**Verdict: PASS in the entire assigned repository/local-CI scope. No confirmed current-Stage defects found.** This is an independent technical review of Мишаня's implementation. His handoff and other reviewers' PASS verdicts were not used as proof. PR240/main were not modified or merged; no implementation correction was started.

### Scope and causal checks

| Group | Independently checked result |
| --- | --- |
| DB-01 | Explicit non-NULL state/generation/attempt guards close SQL CHECK's UNKNOWN acceptance in the active branch; all-null inactive branch remains valid. Forward0045,Drizzle schema and snapshot agree. Native exhaustive matrix across all10 metadata presence bits for leasing/admitted/deferred:3072 combinations,7 valid forms accepted,3065 invalid forms rejected by the intended allowance-shape constraint. Valid admitted reservation optionality is preserved. |
| DB-02 | Actual `pg_get_expr(indpred,indrelid,false)` feeds SHA-256 in the snapshot; null ordinary predicates normalize consistently. Full manifest parity matches all47 public tables. Additional rollback-only native probes changed a real partial unique index predicate to FALSE and removed its predicate: both structural drifts were rejected; restored database matched again. |
| DB-03 | Web contract includes exactly SELECT/INSERT/UPDATE on forum_topic_read_states, with no new DELETE/grantable/owner capability. Existing full native runtime positive/negative probes passed. Additional limited-role repository calls inserted/read/upserted a real marker; revoking UPDATE caused actual operation to fail42501. Local role/data mutations were rolled back. |
| CORE-01 | Source transaction and FK-lock order inspected; NO KEY UPDATE remains mutually conflicting for same-author writers, while compatible with recipient FK KEY SHARE. Personally ran real synchronized crossed-reply regression and existing genuinely concurrent same-author cooldown regression as part of the full native suite: both replies succeed with2 notifications; same-author competing writes yield1success/1rate-limit and no partial publication. |
| CORE-02 | Unread-first before deterministic created_at/id ordering keeps bounded output while making old unread reachable. Original >50 PG regression passed. Additional real notifications loader/action→writer/repository/PG probe seeded116 rows (61unread,55read history), all equal creation timestamps:61 unread opened exactly once across2 bounded50-row loads, final unread0. Actual action redirects and loader readAt projections were checked. |
| CORE-03 | Marker derives from chronological delivered topic.posts, not a separately queried newer read-state cursor. ReadTopicPage ordering, TopicView best-answer display reordering, action target validation and monotonic repository upsert were inspected. Mounted route regression with a concurrent unseen latest cursor passed; full app suite covers related read-state behavior. No requirement to mark unpublished/undelivered concurrent posts is introduced. |
| DOC-02 | PROJECT_STATE current migration history, H-012, web ACL/mutex documentation and Editor historical draft-migration caveat agree with authoritative0000–0045 chain. External accepted evidence is still separately bounded through0020; no external rollout is asserted. |

Generated0045 snapshot was compared structurally with0044: apart from id/prevId, only the allowance-shape check changed. Journal is append-only with1new migration; accepted SQL/snapshots were not rewritten. New schema-manifest regression is included in CI. The PR stays within the assigned six causal groups and documentation sidecar.

### Personally executed verification

- Full application: **1077/1077 PASS** (101files).
- Full disposable PostgreSQL17: **303/303 PASS** (28files), including synchronized locking, constraints, migrations and unread reachability.
- Schema/runtime/migration script regression files PASS.
- Production schema manifest parity PASS for47 public tables.
- Runtime privilege positive/negative native probes PASS.
- Independent extra probes described above PASS:3072 NULL combinations, real predicate drift controls, actual limited-role read-state operations,116-row route/action inbox flow.
- React Router type generation + Wrangler type generation + TypeScript PASS; ESLint0errors/1preexisting unused-disable warning at app/forum/ui.test.tsx:174.
- Application and UI-preview builds PASS; existing preview chunk-size warning remains.
- Drizzle metadata check PASS; migration-history guard PASS (1new migration, accepted history unchanged).
- Local built Worker smoke PASS.
- Exact-head [CI40311315111](https://github.com/iliya1947/vico-forum/actions/runs/40311315111) independently verified SUCCESS; checks121532906638/database121532906942 SUCCESS.
- Final PR metadata still points to ec954ac5/base8f564798, open and unmerged. No tracked implementation changes in the isolated review worktree.

### Harness/environment notes and limits

The initial direct tsc command in a fresh checkout lacked ignored Worker-generated declarations. Running the project's Wrangler types step resolved this; final tsc passed. An extra predicate probe initially assumed a nonunique partial index existed; all current partial indexes are unique. It was corrected to select an actual unique index and clear its data inside the rollback-only probe before rebuilding it, isolating predicate drift. A direct Node route import initially failed on a Vite .webp asset; a narrow inert CSS/image module loader enabled route-only execution without changing production code or route handlers. These were harness issues, not product findings.

An automatic-approval usage-limit failure prevented one initial manifest command from executing. After the user renewed the session and asked to continue, the same command ran successfully. No approval bypass or unresolved blocker remains.

No Chromium/owner visual acceptance is claimed in this review: the changed UI contract is covered by mounted Router tests and the surrounding SQL/action paths by native probes. No real Cloudflare,Neon,external Hyperdrive,R2,OAuth,backup/restore,production/deployment action was performed. Only disposable local PG,local Worker and repository checks were used. Local Worker and PG container stopped/removed after verification. Package5+ was not started. PR236 remains communication-only and must never merge.

Evidence retained under `/workspace/work`: pr240-review-app.json,pr240-review-db.json,pr240-review-scripts.log,pr240-review-manifest.log,pr240-review-privileges.log,pr240-independent-probes2.log,pr240-notification-route-probe2.log,pr240-review-typegen.log,pr240-review-worker-types.log,pr240-review-typecheck2.log,pr240-review-lint.log,pr240-review-build.log,pr240-review-preview.log,pr240-review-migrations.log,pr240-review-drizzle.log,pr240-review-smoke.log. Additional probe sources are outside the implementation checkout: pr240-independent-probes.mjs,pr240-notification-route-probe.mjs,pr240-probe-assets.mjs.

### Handoff

Мире: account for this final independent technical PASS on ec954ac5 and coordinate the package4 review-cycle outcome/owner decision. This personal verdict does not merge PR240 or claim external/visual acceptance. Лёва STOP.


## PR239 — LEVA-PR239-A7D2954-01 correction (2026-10-26)

Assignment: [PR236 comment6412640448](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6412640448). The assigned correction is implemented; this is author implementation verification, not a new whole-PR independent PASS.

- PR239 exact head: `780ba72043d4edb227c299f0f7e0cc9ab15c0f0f`.
- Parent: `a7d29546f334a59d42b30b10c67c32595ea98ec1`.
- Base main: `f59785c50e91fc1615b568b74a0a56909a92c871`.
- Tree: `d7c7a678bced5507f86215b80453e405e9b466a6`, identical to locally tested commit `18d125eec524f3220bd846533589b3248da07848`.
- Bounded correction:4files,150 additions/15 deletions. Whole PR:43files,1166 additions/66 deletions.

### Diagnosis and implementation

The previous regex searched an entire image/definition span. A bare definition's URL ends at the span boundary, so its required trailing delimiter never matched. A destination-like string in an alt code span could be selected before the actual URL. Adding EOF to the regex alone would leave the second defect and valid escaped/entity-written URL forms unresolved.

`replaceAttachmentImageId` now records exact destination token offsets through the existing `mdast-util-from-markdown`2.0.3 compiler extension API. The installed official README/TypeScript declarations and current parser implementation were inspected before use. The handler retains normal `CompileContext.buffer()` behavior; existing default exit handlers still decode and assign node URLs. The same existing forum Markdown grammar is used, without changing global parsing/rendering or adding dependencies.

Only matching image URL spans and the first effective definitions used by actual image references are changed. Labels, code spans/fences, titles, escaped image literals, ordinary links, unused definitions and duplicate shadowed definitions remain unchanged. Replacement uses source spans in descending order, preserving untouched source/line endings. Bare/full/collapsed/shortcut references, case-normalized identifiers, angle/title forms, entity/escape destinations and nested blockquote positions are covered. Definitions shared with active image references necessarily remain the source for those references; no duplicate definition is introduced.

The existing MarkdownEditor history mapping applies this corrected function to current/past/future snapshots. Uploader operation transitions, File retention, selected/retained IDs, Remove, domain receipts and permissions remain unchanged. No server recovery endpoint or permission relaxation was added.

### Verification

- Before implementation:9 new source regressions failed on the previous head,19 controls passed. The final review had already reproduced both complete UI failure chains on that head.
- After implementation:61 targeted tests PASS (editor-document, edit-recovery, attachment-operation).
- Full application:1076/1076 PASS; native local PostgreSQL17:300/300 PASS.
- New mounted TopicRoute tests drive committed/lost response → upload410 → fresh Retry/newasset → stale409 → explicit rebase → successful Save/editor close for both reference and label variants. Exact submitted body/selection are checked; current/past/future history and the same File survive. Positive real-renderer controls and final inline-image rendering pass.
- TypeScript PASS; lint0errors and one preexisting unused-disable warning at app/forum/ui.test.tsx:174.
- Application and UI-preview builds PASS; existing preview chunk-size warning remains. Migration-history guard PASS,0new migrations; local built Worker smoke PASS.
- Chromium:both variants PASS through actual built Worker edit actions/native PostgreSQL, real response loss after commit, actual Node upload handler returning410/201, stale409/rebase and final Save. Database body and unique published ref use the new asset; label remains exact; Undo/Redo and final inline `<img>` source/visibility pass.
- Browser boundary:upload session is a controlled fixture, authorization/store gates use actual native adapters; private byte storage is synthetic. Image delivery uses a controlled PNG response fixture to isolate inline-position rendering. This is not download-handler/R2/provider E2E or owner visual acceptance. Production/external services were not accessed.
- First browser run reached final save and persisted the correct body/ref, then a harness selector for a nonexistent class reported0 images. The selector was corrected to the existing `[data-message-body]`; both full scenarios then passed. No product change was made for that harness issue.
- Local Worker and disposable PostgreSQL container stopped/removed. No new schema/migrations/dependencies/endpoints or permission contracts. Package4+ not started.
- CI: **[Exact-head CI40301421307](https://github.com/iliya1947/vico-forum/actions/runs/40301421307) SUCCESS; checks121499966129/database121499965589 SUCCESS on780ba720**.

Evidence: `/workspace/work/pr239-rekey-red.json`, `pr239-rekey-targeted.log`, `pr239-rekey-app.json`, `pr239-rekey-db.json`, `pr239-rekey-types.log`, `pr239-rekey-lint.log`, `pr239-rekey-build.log`, `pr239-rekey-preview.log`, `pr239-rekey-migrations.log`, `pr239-rekey-smoke.log`, `pr239-rekey-browser-results.json`, `pr239-rekey-browser2.log`; browser/bridge scripts are outside the implementation worktree. Tracked regression tests are included in PR239.

Publication:automatic review initially rejected uploading full PROJECT_STATE due to infrastructure content. Read-only comparison proved the complete previous payload exactly equals the already-public parent blob `b451e090e86bca6ace8d87caf35329f69536ba1e`; all existing bytes stay unchanged, only the scoped21-line correction note is added. Same-repository correction authorization and the AGENTS project-state requirement were shown. The same GitHub blob tool then accepted the upload; no alternate destination/channel or bypass was used. All four blobs and final tree matched local hashes. No publication blocker remains.

### Handoff

Мире: coordinate a new whole-PR review cycle on780ba720 for all8 package3 groups, all prior bounded chains and this source-destination correction. Previous findings/PASS verdicts apply to earlier heads, not the new implementation. No new independent PASS or merge readiness is asserted by the author. PR236 is communication-only and must never merge. Лёва STOP after handoff.


## PR239 — final technical review: CHANGES REQUIRED (2026-10-26)

Date: 2026-10-26 (Asia/Jerusalem). Assignment: PR236 comment 6412169759.

Exact head: `a7d29546f334a59d42b30b10c67c32595ea98ec1`.
Base: `f59785c50e91fc1615b568b74a0a56909a92c871`.
Reviewed implementation tree: `5caf7582cb6358ff377c5443b6e24718f6e5cae5`.
Local equivalent commit: `a37703469714f6f83d0acfc47bff99af85df366d`.

Verdict: **CHANGES REQUIRED**. One confirmed current-Stage defect, with two reproduced manifestations. The whole assigned review is complete; implementation was not changed. This is the author's final technical review, not a claim of independent authorship. Other reviewers' PASS verdicts were not used as evidence.

## LEVA-PR239-A7D2954-01 — P2 — attachment re-key leaves active image destinations stale

Location: `app/forum/editor-document.ts:91–102`, called by `MarkdownEditor.replaceImage` and attachment Retry when an entry moves to another operation.

After a committed published edit loses its response, a new image upload can receive typed410 gone. The uploader correctly changes operation; Retry creates and uploads a new asset ID. However, `replaceAttachmentImageId` does not reliably replace the active image destination:

1. An ordinary reference image `![screenshot][file]` with bare definition `[file]: vico-attachment:OLD` keeps OLD. The parsed definition's source span ends immediately after its URL, so the regex's required trailing whitespace/angle/parenthesis cannot match. A trailing document newline or a following paragraph does not help: both are outside the definition span. Angle-delimited or titled definitions are positive controls already covered by existing tests.
2. For `![` + backtick + `x](vico-attachment:OLD)` + backtick + `](vico-attachment:OLD)`, the parser identifies one valid image with destination OLD. The regex finds the destination-like text inside its alt label first, changes that text to NEW and stops; the actual destination remains OLD.

The subsequent stale409 and explicit rebase work; Save becomes available with the new selected attachment ID. Mounted TopicRoute tests drove this path through the actual client/action/component code, completed the final successful mocked writer response and observed editor closure. The submitted body still had OLD. Real `ForumMarkdown` rendered no inline image with the NEW published attachment. Original source with OLD attachment, and the same source with only the actual destination corrected to NEW, both rendered an image: these controls rule out unsupported Markdown and a broken renderer fixture.

Separate native PostgreSQL probes invoked the actual topicAction → writer/service/repository chain. It accepted both faulty re-key results (302), persisted the stale body and published the NEW attachment ref. The server does not repair the Markdown; inline presentation resolves only IDs in current authorized refs. Thus the image disappears from its authored inline position despite successful recovery/Save. The second variant also changes authored label text. The file remains an attachment; this is not deletion of its bytes or an access-control bypass.

Current-Stage applicability: reference images are already parsed/rendered and explicitly covered by editor source handling. The correction promises active image re-key throughout text/Undo/Redo without touching labels. This defect is in newly introduced recovery code, not a future feature or an external storage issue.

Required outcome for a later correction: locate and replace only the actual parsed URL source, including a bare reference definition ending at its node boundary; leave labels/code unchanged. Add regressions for both manifestations and preserve existing inline, angle/title, reference, escape, history and ordinary retry controls. No server permission relaxation or new endpoint is justified. No correction was made during this review.

## Whole scope checked

| Scope | Review coverage |
| --- | --- |
| ARCH-01 | Known domain errors, typed storage availability, unexpected writer faults, SQL/schema faults and caller mapping; unexpected failures propagate. |
| ARCH-03 | Forum writer, auth runtime and authorization pool cleanup; synchronous/rejected cleanup cannot replace determined result/error. Native signup/session and mutation controls pass. |
| POST-EDIT-AVAIL-01 | Protected resume loader ownership/permission gates, typed503/no-store, unexpected fault propagation and route boundary. |
| FORUM-READ-AVAIL-01 | All ten wrapped primary loaders; preserved404/redirect and optional presentation degradation. |
| SEC-01 | Router diagnostic allowlists, multiline message removal, cyclic causes, profile SQL/params/private-text controls, SSR logging. |
| XR-THROWN-ACTION-BUFFER | Three authoring client-action exports; controlled errors, thrown unexpected/transport faults, aborts, redirects and retained mounted forms. |
| EDITOR-PUB-01 | Conflict refresh, public baseline/ownership projection, latest-loader supersession, explicit revision acceptance and source/history retention; re-key defect above. |
| EDITOR-PUB-02 | Edit-specific feedback follows actual result/identity guard; unrelated topic409 keeps solution feedback; EN/RU/HE catalog/fingerprints checked. |

All bounded chains checked: modified completed-receipt replay versus identical replay; fresh versus ordinary stale operation identity; published/private dedup; explicit Remove intent; File retention and Retry/newasset; same-post Edit focus guard; terminal410 before Save, pending aborts/late ACK fences; subsequent stale rebase preserving the already fresh operation. Source review included the repository transaction order and attachment completion/receipt gates. No additional confirmed defect in the remaining assigned scope.

## Verification performed in this review

- Full application suite: **1065/1065 PASS**.
- Native PostgreSQL17 suite on a disposable local container: **300/300 PASS**.
- New mounted-editor/renderer probes: **2 expected-behavior assertions FAIL**, reproducing this finding; positive renderer controls passed first.
- Separate native action/PG probes: **2/2 PASS**, confirming successful persistence of the stale image destination with a NEW published attachment.
- TypeScript PASS; ESLint0 errors and one preexisting unused-disable warning at `app/forum/ui.test.tsx:174`.
- Application and UI Preview builds PASS; existing preview chunk-size warning remains.
- Migration history guard PASS,0 new migrations. First invocation lacked required CI environment; second was blocked by sandbox child-process EPERM; configured invocation with allowed execution permissions passed. Neither failure was a product defect.
- Local built Worker smoke PASS.
- Exact-head CI40243954305 confirmed SUCCESS, checks121321492211/database121321492371 both SUCCESS. Green CI does not include these new probes.

Probe harness corrections: the first native copy referenced a helper scoped inside another describe; the next comparison exposed normal multipart LF→CRLF serialization. Both harness issues were corrected outside the implementation tree; final native probes passed. The stale URL behavior was unchanged.

Evidence in `/workspace/work`: `pr239-final-review-app.json`, `pr239-final-review-db.json`, `pr239-final-review-typecheck.log`, `pr239-final-review-lint.log`, `pr239-final-review-build.log`, `pr239-final-review-preview.log`, `pr239-final-review-migrations3.log`, `pr239-final-review-smoke.log`, `pr239-final-review-probes3.log`, `pr239-final-review-native-probes3.log`; probe sources/configs are in `pr239-final-review-probes/` outside the implementation worktree.

Limits: the new UI recovery probes use controlled writer/upload responses and the real mounted component/action/renderer; native persistence probes use real local PG and writer/service/repository, controlled route permissions and verified-asset fixtures, not external byte storage. No new Chromium run or owner visual acceptance is claimed. No real Cloudflare, Neon, Hyperdrive, R2, OAuth, backup/restore, production or deployment action was performed. No merge or package4 work.

The full review is complete. Publication to the existing service PR uses the developer’s standing authorization for comments/publication. No preliminary finding was published before completion. Handoff to Мира for coordination only; correction is not started. Local Worker and disposable PostgreSQL container have been stopped/removed. STOP.


## PR239 — MIRA-PR239-998715-01 реализован; новый head (2026-10-26)

Назначение [6404447575](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6404447575). Проверена собственная causal chain на998715b; implementation изменён только по этому defect. Это авторская implementation verification, не whole-PR review нового head.

- [PR #239](https://github.com/iliya1947/vico-forum/pull/239), final exact head `a7d29546f334a59d42b30b10c67c32595ea98ec1`.
- Parent reviewed head `998715bbf0c531432673f027e5c260722e29b9ea`; base main `f59785c50e91fc1615b568b74a0a56909a92c871`.
- Tree `5caf7582cb6358ff377c5443b6e24718f6e5cae5` совпал с локальным commit `a37703469714f6f83d0acfc47bff99af85df366d`.
- New correction7 files/219 additions/12 deletions; whole PR43 files/1030 additions/65 deletions.

### Причина и выбранная граница

После commit/lost ACK операция закрыта, но mounted form её ещё использует. Новый upload получает настоящий410 gone; error-entry блокирует Save, поэтому прежний modified-replay409/rebase не достигается. Retry повторял terminal operation. Две новые UI regressions воспроизвели это на исходном998715b, остальные24 controls того run прошли.

Исправление только в uploader опубликованной правки:
- MarkdownEditor передаёт внутренний publishedEdit flag из фактического publicationIntent=editPost.
- Только точный server response HTTP410 + error=gone переводит uploader на fresh operation до следующего Retry. Это подтверждение terminal operation, не догадка из transport/503/прочих ошибок.
- Исходный File, выбранные строки, text/Undo/Redo остаются. Save по-прежнему блокируется незавершённым upload; обычный Retry теперь работает под fresh operation/asset ID.
- Другие pending uploads прерываются с сохранением File для Retry; старые ACK подавляются existing identity fence.
- Последующий Save со старой revision штатно получает stale409. Explicit rebase берёт current public baseline, сохраняет уже fresh operation, переносит committed asset в retained один раз. Непубличные uploads от старой operation сохраняются для Retry.
- Ordinary create/reply flows,409/503 и410 без точного gone не меняют retry identity. Ordinary stale revision, completed-receipt rebase,Remove и identical publication replay сохраняются.
- Новый recovery endpoint/preflight/auto-publication не добавлен. Server owner/context/permission/operation checks не менялись.

Source anchors: [rollover и обычный rebase](https://github.com/iliya1947/vico-forum/blob/a7d29546f334a59d42b30b10c67c32595ea98ec1/app/forum/editor-attachments.tsx#L181), [terminal upload boundary](https://github.com/iliya1947/vico-forum/blob/a7d29546f334a59d42b30b10c67c32595ea98ec1/app/forum/editor-attachments.tsx#L244), [edit-only wiring](https://github.com/iliya1947/vico-forum/blob/a7d29546f334a59d42b30b10c67c32595ea98ec1/app/forum/markdown-editor.tsx#L265).

### Проверки и limits

- Local full1065 application /300 native PostgreSQL tests PASS.
- New targeted UI suite31 PASS; включает full mounted editor chain, Undo/Redo, exact File preservation, ordinary retry identity controls, concurrent Files/late ACK и committed asset dedup при обычном rebase.
- Native PG tests используют настоящие edit/upload handlers и проверяют commit/lost ACK→upload410→fresh Retry201→stale409→rebase→Save success с прежним attachment и без него. История ровно3 revisions, итоговые refs без дублей.
- Typecheck,lint(одно прежнееwarning app/forum/ui.test.tsx:174),application/UI-preview builds,migration-history guard и local built Worker smoke PASS.
- Chromium прошёл ту же цепочку с prior.txt и new-file.txt, реальной потерей HTTP response после commit, Undo/Redo, fresh Retry,409/rebase и успешным Save. Итоговые PG refs — ровно два разных выбранных asset.
- Edit requests шли в actual built Worker/native PG. Upload requests мостом направлялись в настоящий Node upload handler/native PG; private bytes storage и upload-session fixture синтетические, real authorization gates сохранены. Это не external R2/provider acceptance и не полный Worker/R2 upload E2E.
- Server410 здесь корректен: исправлена недостижимость client recovery, а не ослаблен отказ terminal operation.
- Test Worker/Chromium/PG container остановлены. Schema,migrations,dependencies и public HTTP contracts unchanged; PROJECT_STATE и docs/EDITOR обновлены.
- Exact-head CI: **[CI #40243954305](https://github.com/iliya1947/vico-forum/actions/runs/40243954305) SUCCESS; checks121321492211/database121321492371 SUCCESS наa7d29546f334a59d42b30b10c67c32595ea98ec1.**.

Первоначальный automatic review отклонил публикацию большого PROJECT_STATE. Read-only checks установили: #236/#239 — один public repository; remote/base blob SHA совпадает; новый diff не содержит infrastructure secrets. После этих проверок повтор через тот же GitHub tool принят. Перенос в другой destination/обход отклонения не применялся; publication blocker отсутствует.

### Передача

Мире: организовать новый whole-PR review **всего8-group package3 scope, предыдущих correction chains и MIRA-PR239-998715-01** на `a7d29546f334a59d42b30b10c67c32595ea98ec1`. Старые PASS/FINDING относятся к прежним heads и не являются verdict по этому head. Технический контекст готов; владельцу не нужно его пересказывать. Автор не объявляет новый independent PASS или merge. Лёва STOP; пакет4+ не начинать.


## Предыдущие heads и handoffs — исторический контекст

Их verdicts/evidence относятся к указанным прежним heads; текущий handoff находится выше.

## PR239 — bounded correction двух review defects; новый stable head (2026-10-25)

Назначение [6402172083](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6402172083). Оба causal chains проверены самостоятельно и исправлены в том же PR239. Это реализация и проверки автора, не новый независимый whole-PR review.

- Exact head `998715bbf0c531432673f027e5c260722e29b9ea`; base main `f59785c50e91fc1615b568b74a0a56909a92c871`.
- Old reviewed head `18c849c92eb597ccd39871914290cf6164fc209b`; correction содержит два коммита (основная correction4cadbf8 + final mounted-editor guard998715b).
- Tree `2c43b9f682cdaa10e6808d4c59e6fff50ab5c862` совпал с локальным `f1b01fb05b25eb652420e1d31e13e0c004a5abff`.
- Correction diff:13 files/270 additions/31 deletions. Whole PR scope остаётся исходными8 группами пакета3; отдельная новая audit group не создаётся.

### 1. Modified replay после committed edit с потерянным response

Проверена реальная цепочка: successful edit записывает publication receipt и закрывает operation. Identical retry idempotent; modified fingerprint отклоняется до revision validation. Старая UI rebase меняла только revision, поэтому повторно использовала несовместимую operation. Red controls: native PostgreSQL/action tests с вложением и без него, плюс hook test fresh-operation/dedup; они воспроизвели исходный отказ/старый ID.

Исправление:
- publicationReceipt бросает ForumPublicationReplayConflictError — subtype прежнего ForumStateConflictError, без изменения schema/domain HTTP409 для других callers.
- edit action только для этого subtype добавляет completedOperationId к existing current-public-post conflict response.
- Explicit rebase заменяет именно совпавшую completed operation; ordinary stale-revision conflict сохраняет прежнюю незавершённую operation и её uploads.
- Новая public selection исключает asset из private selection: уже committed upload retained ровно один раз. Remove отслеживается и до promotion, чтобы file не появлялся обратно.
- Непопавшие в current public baseline uploads сохраняют исходный File в RAM для штатного Retry. Retry использует новый asset ID, поскольку existing server owner/context/operation gates запрещают присваивать old asset ID другой operation. Эти gates не ослаблены; нового endpoint/transfer API нет.
- Активные image destinations меняют opaque ID в current/past/future in-memory history без нового Undo шага; code, escaped literals, labels и прочий source не переписываются. UUID имеют одинаковую длину, selection offsets сохраняются. Bytes/File не сохраняются в text cache.
- Повторный Edit для той же mounted формы только фокусирует её, сохраняя pending recovery, expected revision и operation. При переходе к действительно новой форме completed expectation сбрасывается.

### 2. Wrong edit feedback для unrelated topic-level409

Red component test воспроизвёл реальный topicAction markSolved→ForumStateConflictError при открытом редакторе: прежний UI выбирал postEditConflict только по editingPostId.

Теперь copy выбирается по фактическому result.operation=postEdit либо edit-specific stale-identity guard context. Наличие открытой формы не определяет intent. Positive controls проверяют настоящий edit conflict и stale-account edit guard; unrelated markSolved409 сохраняет solution feedback и тот же buffer без ложного rebase.

### Новое evidence и проверки

- 4 initial red controls:2 UI/hook и2 native PG/action cases. После correction green; совпадение reviewer conclusions не использовано вместо проверки.
- Full local1058 application /298 native PostgreSQL tests PASS.
- Первый concurrent app run:1057 PASS,1 initial-form timeout до injection tested error. Изолированные11 editor cases PASS; fixture ждёт initial form до3s вместо1s, повторный full1058 PASS. Product logic этим timeout не менялась.
- После последнего same-mounted-editor guard:75 editor/public-read UI tests PASS; typecheck,lint(одно прежнее warning app/forum/ui.test.tsx:174) и обе сборки повторно PASS.
- Migration-history guard и local built Worker smoke PASS; schema/migrations/dependencies unchanged.
- Native PostgreSQL cases: committed edit→identical replay→modified409→fresh operation→successful second publication; variants with/without attachment, unique public refs и revision history.
- Chromium→actual built Worker→native PG17: (1) intercept настоящий HTTP response после successful commit, abort его доставку, изменить retained buffer, получить409, explicit rebase/new operation и Save success; (2) mounted editor + real stale markSolved409, верный solution feedback и сохранный buffer. Оба PASS.
- Hook File/ACK controls и source transformation controls синтетические. Новый full R2/provider upload E2E не заявляется. Внешние сервисы/production/owner visual acceptance не запускались; тестовые ресурсы остановлены.
- PROJECT_STATE и docs/EDITOR обновлены в основной correction; необязательная дополнительная заметка последнего guard не публиковалась после automatic review rejection её повторной полной загрузки. Rejected document не передавался другим способом. Final guard и его regression опубликованы только двумя source files; blocker для implementation отсутствует.
- Final exact-head CI: **[CI #40228496459](https://github.com/iliya1947/vico-forum/actions/runs/40228496459) SUCCESS; checks121274983746/database121274983601 SUCCESS на998715bbf0c531432673f027e5c260722e29b9ea.**.

### Handoff

Мире: новый whole-PR review **всего PR239 scope (8 групп) и обоих correction chains** на `998715bbf0c531432673f027e5c260722e29b9ea`. Прежние verdicts относятся к18c849c и не заменяют проверку финального head. Технический контекст готов; владельцу не нужно его пересказывать. Лёва STOP после публикации handoff, пакет4+ не начинать.


## Предыдущие implementation heads и handoffs — исторический контекст

Ниже сохранены прежние результаты; актуальный head и handoff находятся выше.

## PR239 — пакет 3 реализован; stable exact head и handoff (2026-10-25)

Назначение: [6400908779](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6400908779). Реализован только назначенный пакет3. Это работа автора реализации и его проверки; независимый whole-PR review ещё должен состояться.

- [PR #239](https://github.com/iliya1947/vico-forum/pull/239), branch `fix/failure-semantics-edit-recovery`.
- Exact head `18c849c92eb597ccd39871914290cf6164fc209b`; base main `f59785c50e91fc1615b568b74a0a56909a92c871`.
- Tree `315dae98367a489ad62771c4d9536f895b3ebde8` совпал с локальным commit `71f1f3ed0400729f54934845229b57e23610e0c5`.
- 37 files /563 additions /44 deletions. Schema, migrations, dependencies unchanged.

### Scope и причинные исправления

| Canonical group | Реализация и подтверждение |
|---|---|
| ARCH-01 | [runForumMutation](https://github.com/iliya1947/vico-forum/blob/18c849c92eb597ccd39871914290cf6164fc209b/app/forum/mutations.server.ts#L96) больше не превращает неизвестный writer fault в503. Обычный [PG writer](https://github.com/iliya1947/vico-forum/blob/18c849c92eb597ccd39871914290cf6164fc209b/db/hyperdrive-forum.ts#L124) классифицирует установленные connection/query-timeout failures как typed storage unavailable; domain results сохраняются, TypeError/42703 проходят дальше. Два новых action controls были red до изменения, green после. |
| ARCH-03 | Existing bestEffortDiscardClient применяется к writer/auth client и authorization pool. Cleanup не заменяет success/domain/availability/unexpected result. Native PG regressions подтверждают committed reply и404 после sync/async cleanup fault; реальные BetterAuth signup/session results сохраняются. Pool controls используют synthetic Pool/Client, без заявления native pool fault injection. |
| POST-EDIT-AVAIL-01 | [Protected edit loader](https://github.com/iliya1947/vico-forum/blob/18c849c92eb597ccd39871914290cf6164fc209b/app/routes/post-edit.ts#L8) отображает только typed storage/authz outage как503 и экспортирует ForumRouteError. Auth/ownership/permission checks сохранены. Loader controls + shared status-specific boundary tests; отдельный production outage не вызывался. |
| FORUM-READ-AVAIL-01 | [forumReadLoader](https://github.com/iliya1947/vico-forum/blob/18c849c92eb597ccd39871914290cf6164fc209b/app/forum/read-availability.server.ts#L5) применяется к10 primary routes (включая edit resume). Typed outage →503/no-store, TypeError/SQL schema fault остаются ошибками. Existing optional presence/read-state/authz degradation сохранена; explicit optional home control сохраняет200. |
| SEC-01 | [Router handleError](https://github.com/iliya1947/vico-forum/blob/18c849c92eb597ccd39871914290cf6164fc209b/app/entry.server.tsx#L48) вызывает [safe reporter](https://github.com/iliya1947/vico-forum/blob/18c849c92eb597ccd39871914290cf6164fc209b/app/server-logging.ts#L32). Только allowlisted error kind/SQLSTATE и безопасные file-line frames; никакого message/cause payload/SQL/params. Full multiline message удаляется до разбора stack, чтобы private text с fake frame не попал в журнал. Native Chromium→Worker→PG profile failure:500, unpublished bio отсутствует в HTML и Worker log. |
| XR-THROWN-ACTION-BUFFER | [client action](https://github.com/iliya1947/vico-forum/blob/18c849c92eb597ccd39871914290cf6164fc209b/app/forum/editor-action.ts#L5) трёх authoring routes сохраняет mounted форму при server/transport fault с отдельным unexpected result500. Server faults продолжают бросаться и диагностироваться серверным Router. Redirects/aborted navigation не поглощаются. Actual topic loader/action component tests сохраняют тот же form/textarea; browser проверяет реальный network abort и retry. |
| EDITOR-PUB-01 | [Edit conflict action](https://github.com/iliya1947/vico-forum/blob/18c849c92eb597ccd39871914290cf6164fc209b/app/forum/actions.server.ts#L500) после known conflict читает текущий public post baseline, без loader revalidation, которая могла бы снять форму при повторном read fault. [TopicView recovery](https://github.com/iliya1947/vico-forum/blob/18c849c92eb597ccd39871914290cf6164fc209b/app/forum/views.tsx#L2106) показывает current body/attachments и явный rebase; expected revision не меняется автоматически, text/Undo и local attachment intent остаются. Более новый loader snapshot supersedes старый409. Native PG stale revision и реальный browser r1→r2→rebase→save прошли. |
| EDITOR-PUB-02 | [Edit-specific feedback](https://github.com/iliya1947/vico-forum/blob/18c849c92eb597ccd39871914290cf6164fc209b/app/forum/views.tsx#L2581) использует новый postEditConflict вместо solution-selection copy. EN/RU/HE values + reviewed fingerprints добавлены; solution action semantics сохранены. |

Выбранные механизмы проверены по current source и actual error classes. Репозиторий editPublishedPost бросает ForumStateConflictError при stale revision; action работает с этим реальным классом. Новый server reply содержит только текущую публичную post revision, а не submitted buffer. При сбое conflict read форма остаётся открытой; более поздняя unsuccessful submission не откатывает уже refreshed baseline.

### Проверки

- Первые7 новых classification/cleanup controls воспроизвели исходные failures до реализации; существующие55 controls в том run прошли.
- Полные local suites:1051 application tests PASS /296 PostgreSQL tests PASS.
- После последней snapshot-refinement:22 targeted editor/profile/logging tests PASS; typecheck/lint/application/UI builds повторно PASS. Lint имеет только прежнее warning app/forum/ui.test.tsx:174.
- Migration-history guard:0 new migrations, accepted history unchanged. Local built Worker smoke PASS.
- Пять final Chromium cases через built Worker и отдельную native PG17 DB:409 refresh/rebase/save redirect; typed08006→503 + retained buffer/retry; unexpected42703→500 + retained buffer/retry; реальный transport abort + retained buffer/retry; unexpected profile SQL fault500 без private bio в HTML/log.
- В browser повторные успешные redirects закрывали editor и сохраняли отправленный buffer в PG. Новый server-side error reporter был реально вызван на SQL faults.
- PROJECT_STATE, docs/EDITOR.md и docs/auth/AUTHORIZATION.md обновлены только по относящемуся scope.
- CI exact head: **[CI #40219758202](https://github.com/iliya1947/vico-forum/actions/runs/40219758202) SUCCESS; checks121248559346 и database121248559564 SUCCESS на exact head18c849c92eb597ccd39871914290cf6164fc209b**.

### Границы и передача

Loader outage tests используют typed capability errors; Worker/browser faults injected только в отдельной disposable PG17 DB. Внешние Cloudflare/Neon/Hyperdrive/R2/OAuth/backup-restore сервисы и production не проверялись/не менялись. Browser checks технические, не owner visual acceptance. Новые SOT assertions не объявляют whole-PR review или merge выполненными. Local Worker/Chromium и тестовый PG container остановлены.

Мире: организовать whole-PR review **всего scope PR239** на exact head `18c849c92eb597ccd39871914290cf6164fc209b`; CI сам по себе не заменяет причинную проверку. Technical context опубликован здесь и в #236; пересказ владельцем не нужен. Лёва STOP после handoff. Пакет4+ не начинать.

## Исторические записи до пакета3

Статусы ниже относятся к указанным прежним heads/этапам; актуальный handoff находится выше.

## PR238 — bounded correction AUTH-LINK-STALE-IDENTITY-01 готова к новому review (2026-10-25)

Назначение: [6400105733](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6400105733). Исправлен только подтверждённый stale-visible/current identity boundary; пакет3 не начат.

- PR238 / branch `fix/auth-session-identity`.
- New stable exact head `3d6fe4d178d87e0697d531c962f784296f169d80`; parent reviewed head `8866bd8bfb6f8121a5e181c88a9e542741040b64`.
- Base main `ab4d29e8853b216d4aef6c22f1fc373fed8ebf0d`.
- Tree `a644f588a0a4f3fe0ec1a567a4227c8f83f31a25` совпадает с локальным commit `763cee69c0f80de8f6650c1890081bca7d606e26`.
- Correction:10files/192additions/16deletions. Schema/migrations/dependencies unchanged.

### Выбранная минимальная граница

Own-profile GoogleAccountLink передаёт именно profile.id (отображаемый аккаунт) как expectedUserId; auth-client посылает его в `x-vico-link-user` на том же linkSocial request. Это expectation, не authentication evidence.

В существующий BetterAuth before-hook добавлен branch по нормализованному endpoint `/link-social`. Через public exported `getAuthoritativeSessionFromCtx` BetterAuth1.7.7 читается authoritative DB session; guest401, missing/mismatched expectation409/VICO_LINK_IDENTITY_CHANGED до state/account creation. Endpoint sessionMiddleware использует ту же request-local session, а штатный signed OAuth state фиксирует её target. Отдельный endpoint/wrapper/preflight request или новая session/permission architecture не введены. Registration hook сохранён в том же before middleware; его имя уточнено как betterAuthRequestHooks.

Это закрывает разрыв между отдельной client preflight-проверкой и реальным link request. CallbackURL остаётся только адресом возврата. Existing same-email/provider-verification/origin gates не ослаблены. Client показывает прежний safe auth feedback и не подменяет expectation на currentB для автоматического retry.

### Регрессии

Новый tests/database/auth-link-identity.test.ts использует настоящий PostgreSQL17, Vico options, BetterAuth HTTP initiation, signed state и callback. Только внешний provider code-exchange/getUserInfo synthetic.8cases:

1. stale expectedA/currentB + verified GoogleB →409, verification/state rows0 и Google links0.
2. normal A/A + verified GoogleA → initiation200, callback302, persisted link.userIdA.
3. A/A + GoogleB email mismatch → callback error, no link.
4. A/A + unverified GoogleA → callback error, no link.
5. guest →401, no state/link.
6. missing expectation/currentB →409, no state/link.
7. initiationA/A, browser cookie меняется наB перед callback → signed state сохраняет targetA, B не подхватывается.
8. foreign Origin →403, no state/link.

В positive initiation spy подтверждает ровно один internal findSession, то есть handler не переопределяет checked identity второй выборкой. В test options явно включены origin/CSRF checks: BetterAuth по умолчанию отключает origin check в test mode. Production config ради теста не менялась.

До code correction исходные6cases дали4pass/2fail: stale и missing expectation возвращали200 вместо409. После correction весь targeted auth-native run11/11 (8новых+3legacy) и полный291/291 PG PASS. Существующие ID-token negative controls теперь передают правильную expectation для проверяемого пользователя и проверяют LINKING_DIFFERENT_EMAILS_NOT_ALLOWED/LINKING_NOT_ALLOWED; новый guard не маскирует эти проверки собственным409. SDK/component regressions проверяют передачу expected profile ID и отсутствие автоматического retry.

### Проверки / handoff

Полные997 application tests и291 PostgreSQL tests PASS. Typecheck, lint(одно прежнееwarning ui.test.tsx:174),app/UI-preview builds,migration-history guard и local built Worker smoke PASS. Во время разработки harness origin-control выявил test-mode skipOriginCheck; исправлена только конфигурация теста. Один TS optional-field index в новом тесте исправлен до финальных checks. Локальные Worker и disposable PG остановлены/удалены после проверок.

**[CI40213325914](https://github.com/iliya1947/vico-forum/actions/runs/40213325914) SUCCESS:** checks121229042957 и database121229043132 SUCCESS на новом exact head. Remote tree совпал с локально проверенным. PR description, PROJECT_STATE и auth SOT обновлены.

Предыдущие FINDING-verdicts относятся к8866bd8; новый stable head требует нового whole-PR review всего назначенного PR238 scope. Независимый review correction/merge не выполнены и не заявляются; исправление не считается принятым вmain. External Google/provider smoke, production rollout, visual acceptance и другие audit packages не запускались.

**Следующий шаг — Мира организует новый whole-PR review PR238 через #236. Лёва STOP после correction.** Разработчик только подключает Миру; контекст передан здесь.

---

## PR #238 — полный технический review автора: FINDING (2026-10-25)

Назначение: [6399879967](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6399879967).
Exact head: `8866bd8bfb6f8121a5e181c88a9e542741040b64`; base `ab4d29e8853b216d4aef6c22f1fc373fed8ebf0d`.
Локальный commit196d03a имеет то же дерево `d536c1656821643540e87966f200aab902a3b170`, что опубликованный head; PR head повторно проверен и не менялся. Просмотрен весь diff34files и относящиеся execution paths/SOT.

**Verdict: один подтверждённый current-Stage P2 defect; PASS/merge пока невозможны.** Это техническая самопроверка автора реализации, а не третий независимый аудит. Выводы Миры/Лиры были известны до проверки; их совпадение доказательством не использовалось.

### AUTH-LINK-STALE-IDENTITY-01 — подтверждён собственной проверкой

`PR238-LIRA-01` — alias того же finding, не второй дефект.

Исходная цепочка:
1. `app/routes/profile.tsx:24` вычисляет isOwner при sessionA; `app/forum/profile-view.tsx:32` оставляет ConnectGoogle на загруженном профилеA.
2. После смены browser session наB старая вкладка до очередного heartbeat/revalidation может сохранять профильA. Presence interval60000 и visibility event — последующая eventual revalidation, не guard нажатия.
3. `app/auth/google-account-link.tsx:19` вызывает link(callbackURL); `app/auth/auth-client.ts:6` передаёт provider+callbackURL+errorCallbackURL без expected visible actor. Auth API route направляет запрос напрямую в BetterAuth.
4. В установленном BetterAuth1.7.7 `api/routes/account.mjs` linkSocial использует c.context.session и сохраняет link.userId/session.user.id + link.email в OAuth state. В `oauth2/state.mjs` callbackURL сохраняется отдельно как адрес возврата.
5. `api/routes/callback.mjs` → linkOAuthAccount использует именно userId из state; profile ID из callbackURL не выбирает и не проверяет target identity.
6. Поэтому sessionB + подходящий verified GoogleB создаёт связь уB и возвращает браузер на профильA. GoogleA при той же sessionB отклоняется штатной same-email проверкой.

**Новая локальная проверка полного redirect/state/callback path:** настоящие BetterAuth1.7.7 HTTP handlers и production Vico options; только persistence заменён memory adapter, внешняя code-exchange/getUserInfo boundary — synthetic provider. Два controls выполнены, оба PASS как воспроизведение текущего поведения:

| Видимый профиль / current session | Provider | Результат |
|---|---|---|
| A / B | verified GoogleA | link initiation200; callback302 с error; Google-связей0 |
| A / B | verified GoogleB | link initiation200; callback302 на профильA; Google-связь записана с userIdB, неA |
| A / guest | любой | link-social401 до state/link |

В обоих provider cases guest401 проверяется отдельно. Синтетический провайдер возвращает уже подтверждённую identity; тест не отключает production verification policy и не утверждает реальную Google acceptance. Signed state, его cookie validation, настоящий callback handler, account email gates и target adapter write не заменялись. Native multi-tab/browser/Google/production E2E не выполнялся.

Локальные artifacts: `/workspace/work/pr238-review/link-boundary.test.ts`, `link-results.json`, `link-boundary-evidence.json`. Реализация PR не менялась; review harness находится вне worktree.

**Уточнение published finding:** это не захват аккаунта и не обход email/provider ownership. Отклонение GoogleA не опровергает defect: GoogleB соответствует текущей server identityB и проходит все штатные gates. CallbackURL профиляA, fresh sessionB и eventual heartbeat также не предотвращают операцию надB. Уже сформированный OAuth state фиксируетB; сам callback не переопределяет target через profile URL. Текущие PR integration tests проверяли B+GoogleA mismatch, но не этот B+GoogleB сценарий при stale UIA.

**Требуемое исправленное поведение:** stale visibleA/currentB не должен незаметно инициировать/выполнить linking дляB. Нужна проверяемая привязка операции к отображаемой identity либо её осознанное обновление до запуска; одна предварительная client getSession проверка не доказывает отсутствие гонки между check и link request. Существующие provider/email/authentication/origin gates сохранить. Конкретный механизм этим review не предписывается. После correction проверить staleA/B+GoogleB deny/no mutation, нормальный same-identity link success и guest/mismatched-provider negatives.

### Весь остальной назначенный scope

| Scope | Проверка / технический итог |
|---|---|
| AUTH-01 | Chronological Set-Cookie lookup→endpoint сохраняет cache headers и завершающий session result; проверены expired-session/login, sliding refresh, request composition. Дополнительных findings нет. |
| AUTH-02 | Role existence/key-share внутри существующей serialized authz management transaction; missing-role → typed404, assignment rollback; runtime role имеет необходимые SELECT/UPDATE. Lockout/effective permissions не ослаблены. Других findings нет. |
| AUTH-LINK-01 | Explicit own-profile link поддерживает unverified local email без снятия implicit-link gate; same-email/provider ownership contracts сохранены. Блокер описан выше. |
| AUTH-LOCALE-RETURN-01 | Только credential pages, старый sanitizer до remap + новый после; registered canonical target из navigation provider; query/hash сохраняются, unsafe/cross-locale destinations отвергаются. OwnerA соблюдён. Новых findings нет. |
| AUTH-SESSION-AVAIL-01 | Request-local adapter observer сохраняет query cause до BetterAuth cause-less APIError; narrow cause-chain classifier и safe503 до Router. Unexpected/schema/config failures не становятся guest/permission denial. Дополнительных current defects не установлено. |
| XR-CROSS-TAB-IDENTITY (editor) | Mounted editorActorId реально попадает в native FormData; четыре action paths сравнивают с request session до writer; expectation не authority. Heartbeat409 прекращает polling и revalidates. Других findings в назначенном editor path нет. |
| DOC-04 | docs/EDITOR и auth SOT согласованы с effective forum.post.history.read, default grants/custom roles/overrides; role-name checks не добавлены. Findings нет. |

Посмотрены также все сопутствующие изменения locale UI, manual values/fingerprints, preview auth-action suppression, PROJECT_STATE и тестов; новых несвязанных current defects не подтверждено. Известный исторический DOC01 не переоткрывался в этом PR.

### Verification / STOP

Свежий targeted run: **190 tests PASS** (auth, cookie/credential, editor/native submit, write actions, profile, presence, language UI, authorization route, Worker). Дополнительно2 local redirect/callback cases PASS. Полный995app/283PG прогон, сборки и guards — результаты предшествующей реализации на том же дереве, не новый review-run; native PostgreSQL suite в этом review не перезапускался. Exact-head [CI40202422836](https://github.com/iliya1947/vico-forum/actions/runs/40202422836) повторно проверен: SUCCESS. GreenCI не снимает найденный defect.

Implementation/main не изменялись; tracked diff чист. External/production/visual acceptance не запускались. **STOP после review.** Мира координирует bounded correction этого одного finding; исправление и новый exact-head review — отдельный следующий этап, мной автоматически не начаты.

---

## Пакет 2 — auth/session/identity: реализация готова к review (2026-10-25)

Поручение: [PR236 comment6398462662](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6398462662). В текущем чате владелец направил к PR236; выполнен только назначенный пакет2, без перехода к следующим.
Implementation: [PR #238](https://github.com/iliya1947/vico-forum/pull/238), ветка `fix/auth-session-identity`.
Stable exact head: `8866bd8bfb6f8121a5e181c88a9e542741040b64`.
Base main после owner merge #237: `ab4d29e8853b216d4aef6c22f1fc373fed8ebf0d`.
Tree: `d536c1656821643540e87966f200aab902a3b170`, совпал с локально проверенным commit `196d03a3cfb4151f600ad05152371ff6406ea941`.
34 файла, 412 additions/27 deletions. Схема, миграции и зависимости не изменены.

### Причины и исправления

- AUTH-01: preliminary getSession cleanup раньше добавлялся после нового endpoint cookie. Теперь chronological Set-Cookie order: lookup → final response. Настоящий Better Auth HTTP + PostgreSQL regression проходит expired-cookie → password login → subsequent authenticated session; на baseline main падает на потерянной сессии.
- AUTH-02: stale custom role ID доходил до FK failure. В существующей serialized authz management transaction проверяется существование role с key-share lock; отсутствующая роль даёт AuthorizationNotFoundError, route mapping404 уже существует. Assignment не меняется. Native PostgreSQL regression red на baseline, green с исправлением.
- AUTH-LOCALE-RETURN-01: LanguageSwitcher remap-ит nested returnTo только для credential pages и только после старого credentialReturnPath sanitizer. Query/hash и посторонние параметры сохранены; unsafe/cross-locale inputs остаются отвергнуты. Owner optionA соблюдён.
- AUTH-LINK-01: защитный requireLocalEmailVerified gate сохранён. Добавлен штатный authenticated linkSocial Google из собственного профиля и credential-page guidance сначала войти паролем. Real Better Auth/PostgreSQL tests с synthetic provider ownership проверяют: implicit same-email/unverified local login не выдаёт сессию/связь; guest link401; другая local identity не может link; unverified provider не может link; authenticated owner + verified same-email Google успешно связываются, subsequent Google login возвращает исходный user ID. Production Google/provider verification не подменялась: fake существует только внутри test options. Static preview блокирует и новую auth action, чтобы не вызывать реальный API.
- AUTH-SESSION-AVAIL-01: Better Auth1.7.7 getSession заменяет query failure cause-less APIError. Узкий request-local observer DB adapter сохраняет исходную ошибку только для session lookup; classifier обходит cause chain и принимает только известные transport/connection/query timeout failures. Worker возвращает safe no-store503 до Router; schema/programming/configuration failures остаются unexpected. Проверены actual Better Auth query failure, missing-schema negative и Worker boundary.
- XR-CROSS-TAB-IDENTITY: mounted MarkdownEditor передаёт editorActorId как expectation, не authority. Несовпадение с session отклоняет четыре publication/edit paths409 до writer. Heartbeat отправляет expectedUserId; mismatch409 останавливает polling и запускает loader revalidation. Current session/permissions остаются единственным authority. Positive native submit проверяет реальное поле; server negative regressions red на main, green с исправлением.
- DOC-04: docs/EDITOR.md согласован с effective forum.post.history.read; moderator/admin — default grants, custom grants/overrides не исключены. Новая permission architecture не вводилась.

### Проверки и ограничения

Pinned Node24.21.0/pnpm12.3.4. Полные 995 application и283 PostgreSQL tests PASS; финальный targeted editor/action/link run121 PASS. Typecheck, lint(одно прежнее warning ui.test.tsx:174), app/UI-preview builds, Drizzle metadata/generation parity, accepted-migration history, schema manifest47tables и local built Worker smoke PASS. Изолированные baseline controls: cookie1 failure, role1 failure, stale-editor4 failures ожидаемы; на implementation соответствующие проверки зелёные.

Первый full DB run имел5 CLI harness failures из-за PATH системного pnpm; после pinned PATH остался один cold CLI10s timeout, targeted повтор12/12 и полный повтор283/283 прошли. Продуктовый код ради этих setup failures не менялся. Повторный lint после сборки зацепил generated dist; собственный build artifact вынесен из source tree, полный source lint прошёл. Локальный PostgreSQL контейнер и Worker preview после проверок остановлены/удалены.

[CI #40202422836](https://github.com/iliya1947/vico-forum/actions/runs/40202422836): checks SUCCESS (job121196211898), database SUCCESS (job121196211728), exact head указан выше. Содержимое remote tree совпадает с локально проверенным. CI выполняет также privilege/provisioning/Worker gates.

Независимый whole-PR review и merge #238 не выполнены и не заявляются. Findings этого пакета не считать закрытыми в main до принятия/merge. External Stage6, реальные Cloudflare/Neon/Hyperdrive/R2/OAuth/backup-restore, production rollout и owner visual acceptance не выполнялись. Auth UI проверен component tests; новой real-browser visual acceptance не заявляется.

### Передача / STOP

Мира: организовать независимую whole-PR проверку PR238 на stable head8866bd8bfb6f8121a5e181c88a9e542741040b64 в порядке актуального AGENTS.md; этот handoff описывает реализацию и её проверки, не заменяет независимый review. Разработчику достаточно подключить Миру к PR236, технический контекст уже здесь. Лёва STOP после пакета2.

---

## AUTH-RATE-LIMIT-RACE-01 — первый implementation package (2026-10-25)

Поручение владельца: PR236 comment6397600154; публикация и CI дополнительно прямо разрешены владельцем в текущем чате после остановки auto-review. Реализацию первого пакета выполняет Лёва; остальные пакеты не начаты.

Implementation PR: https://github.com/iliya1947/vico-forum/pull/237
Stable code/test/doc head: `4a445b1c31b7465007bf3f9ddc55c0cd62eda03b`.
Baseline main: `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`.
Tree: `2071f624becacb49deeb1da9b8cd2b74f66b1f3f`, совпадает с локально проверенным деревом.

### Реализация

- Пять файлов: package.json, pnpm-lock.yaml, tests/database/auth-rate-limit-concurrency.test.ts, PROJECT_STATE.md, docs/auth/AUTHORIZATION.md.
- Better Auth и @better-auth/drizzle-adapter обновлены с1.7.4 до1.7.7, первого patched release GHSA-44jh-23m7-hpcf. Из lockfile обновлены связанные auth family/required fetch peer; unrelated resolver reordering удалён.
- PostgreSQL/Drizzle и database-backed limits сохранены. Production config/auth/session/effective-permission semantics не изменялись. Новая схема/migration, custom rate-limit wrapper, внешнее хранилище не введены.
- Native PostgreSQL17 regression использует actual Better Auth HTTP handler и production options с малым test-only rule: три admission UPDATE одновременно ждут блокировку одного row. После освобождения только оставшееся allowance получает200, остальные429. Проверены active window, expired-window reset, persisted count, positive retry metadata, JSON error content type и отдельный IP bucket.

### Доказательства

Контроль на baseline dependencies1.7.4: оба случая red — все3 concurrent requests прошли при allowance1/2. Тот же regression на1.7.7: оба green. Это bounded local concurrency test, не attack/stress production.

Локально pinned Node24.21.0/pnpm12.3.4:979 application tests,281 PostgreSQL tests; lint(одно прежнее warning),typecheck,app/preview builds,frozen-lockfile,migration/schema/parity/privilege/provisioning probes и local Workers smoke passed. Первоначальные setup/lint harness issues исправлены до публикации; final validations success.

CI: [GitHub Actions #40195292682](https://github.com/iliya1947/vico-forum/actions/runs/40195292682) — SUCCESS, checks и database SUCCESS на head4a445b1c31b7465007bf3f9ddc55c0cd62eda03b.

### Передача / STOP

Проверка относится только к указанному implementation head; независимый whole-PR review не выполнен и не заявляется. Merge не выполнялся. Реальные Cloudflare/Neon/Hyperdrive/R2/OAuth, production rollout,visual acceptance и следующие10 пакетов не запускались. Следующий шаг — Мира организует независимую whole-PR проверку PR237 по принятому процессу; технический контекст уже в служебном PR236. После отчёта Лёва останавливается на первом пакете.

---

## Архитектурная сверка fix-plan — Лёва / FPLAN-T2 (2026-10-25)

**Поручение:** [PR236 comment6397485409](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6397485409). Полностью сопоставлены три planning checkpoints Миры6396882503/6397022247/6397105809 и FPLAN-T1 Лиры6397337524 с двумя уже принятыми Мирой acceptance-уточнениями. Baseline planning/code: `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`.

### Вердикт

**ACCEPT — согласен с уточнённым планом из11 implementation PR.** Конкретных архитектурных расхождений, обязательного split/merge, пропусков или повторов finding IDs не обнаружил. Двух принятых уточнений Лиры достаточно; дополнительных обязательных изменений плана не предлагаю. Это архитектурное согласие с планированием, не разрешение начинать код/upgrade/deploy и не заявление, что дефекты исправлены.

После зафиксированных owner decisions итог61 technical +2 preview +4 docs, открытых нормативных вопросов для этой проверки нет. Прежний мой60-count предшествовал решению по AUTH-LOCALE-RETURN-01. DOC-04 остаётся документационным, effective-permission model принята; новый technical authz defect из него не создаётся.

### Механическая проверка покрытия Scope

Проверен именно Scope каждого execution PR, а не случайные упоминания ID в пояснениях. Все61 technical IDs уникальны и точно совпадают с принятым реестром;2 preview и4 primary documentation assignments покрыты. Повторная conditional проверка DOC-02/03/04 в PR11 не считается второй реализацией или лишним finding.

| PR | Technical | Preview | Основная documentation запись |
|---|---:|---:|---|
| 1 Dependency/rate-limit | 1 | 0 | — |
| 2 Auth/session/identity | 6 | 0 | DOC-04 |
| 3 Failure + edit recovery | 8 | 0 | — |
| 4 DB + notifications/read-state | 6 | 0 | DOC-02 |
| 5 Help + tags | 4 | 0 | DOC-03 |
| 6 Attachments | 6 | 0 | — |
| 7 Markdown semantics | 11 | 0 | — |
| 8 Localization runtime | 9 | 0 | — |
| 9 Search/discovery | 3 | 0 | — |
| 10 Interaction/UI + preview | 7 | 2 | — |
| 11 Documentation closeout | 0 | 0 | DOC-01; остаточная сверка sidecars |
| Итого | 61 | 2 | 4 уникальных |

### Causal/verification dependencies и порядок

1. **PR1 перед PR2:** dependency/config correction изолирует version/compatibility risk; auth behavior проверяется на уже принятой версии. Изменения upstream не следует компенсировать application workaround поверх заменяемой версии. Следующий task всё равно должен начинаться от actual accepted main и проверять оставшийся symptom — план не требует воспроизводить уже устранённую зависимостью ошибку как дополнительную реализацию.
2. **PR2 затем PR3:** auth identity/session contract становится принятым baseline для fault recovery. Pre-router auth startup failure относится к PR2, общий mutation/route classification и editor recovery — к PR3. Это разные места ответственности, а не два новых конкурирующих error frameworks. Требование сохранить authoritative identity не отменяется сохранением буфера в failed-action recovery.
3. **PR3 вместе с edit409:** catch/rethrow/classification, безопасная observability и mounted-editor failure state имеют общий integration regression. Разносить исправление unexpected faults и buffer recovery так, чтобы промежуточный PR снова терял текст, оснований нет. При этом восемь causal findings не объявлены одной причиной; EDITOR-PUB-01/02 остаются двумя записями.
4. **PR4:** DB-03 непосредственно нужен read-state paths; DB/schema/privilege и notifications/read-state проверяются в одном disposable PostgreSQL boundary. Migration/parity/constraint changes не смешаны с production ACL rollout. DB-01/DB-02 остаются самостоятельными regressions, даже если их можно проверить в том же пакете.
5. **PR5:** четыре ограниченных current public-write/domain corrections можно проверить одним пакетом без redesign Help. Tag validation касается обычной и Help publication; критерий bounded write — общий, отсутствие нового численного cap в плане не делает его неполным. Выбор конкретной границы — implementation design, а не дополнительный feature scope. Не требуется связывать tags и stale Help intent одним root cause.
6. **PR6 перед позднейшими editor изменениями:** attachment selection/lifecycle стабилизируется независимо от Markdown transformations. Orphan reconciliation, archive validation и HTTP methods имеют собственные regressions. Достаточных причин обязательного раздробления шести ограниченных findings не установлено; конкретный fix должен соблюдать запрет несвязанного redesign.
7. **PR7 перед PR8:** shared custom structural grammar закрывается в PR7 целиком, включая mention recipients и translation structure protection. PR8 не оставлен местом для второй competing grammar/компенсации первой. LOC-08 direction round-trip и durable translation generations остаются самостоятельными задачами PR8; это предотвращает повторную переделку одного структурного контракта.
8. **PR9 отдельно:** URL/search state и известные source lang/dir на discovery surfaces не требуют расширения durable translation jobs/provider scope. Наличие общих presentation файлов само по себе не требует merge с PR8.
9. **PR10 после semantic исправлений:** interaction/selection/disabled/layout проверяются на принятом editor baseline. Два preview defects — bounded fixture/router corrections в том же представительном tool surface; обязательной причины вынести их в отдельный PR нет. Кодовый regression и production/tooling classification остаются разными, preview не выдаётся за production acceptance.
10. **PR11 последний:** закрывает DOC-01 и проверяет остатки четырёх подтверждённых doc findings. Это не разрешение откладывать обязательные project-state/doc changes каждого implementation PR: handoff execution plan прямо требует их до whole-PR review. DOC-02 всегда относится к фактической authoritative migration chain после изменений, а не к захардкоженному старому0044. Будущее verified/merged состояние заранее не записывается.

План задаёт допустимую последовательность. Не все соседние PR являются жёсткой causal зависимостью, и это не нужно для его корректности. Важные version/structural/state boundaries учтены; зависимости по незамерженным branches не создаются. Факт пересечения views/editor/repository файлов не является самостоятельным основанием искусственного split/merge: каждый следующий PR строится от уже принятого main.

### Done criteria и два уточнения FPLAN-T1

**FPLAN-01 / PR2 / AUTH-LINK-01 — принимаю.** Позитивный same-email flow недостаточен: regression должен подтвердить владение/авторизацию связываемой local identity и запрет доступа/implicit linking лишь по совпадению unverified email. Этот отрицательный контроль не позволяет выдать ослабление protective gate за корректное исправление. Конкретный безопасный linking/verification mechanism не предписан; реальные Google credentials/provider smoke не требуются и не объявляются выполненными.

**FPLAN-02 / PR6 / ATTACH-04 — принимаю.** Проверка с несколькими pending/stored файлами и набранным текстом должна показать: Remove одного pending сохраняет текст и остальные выбранные файлы, late ACK не восстанавливает снятый файл. Это прямо проверяет отличие selective Remove от whole Cancel. Не требуется per-file DELETE/network abort.

Остальные критерии достаточно конкретны для назначения bounded implementation tasks: они называют broken invariant и наблюдаемый результат, не требуют новой архитектуры. В частности, PR3 различает typed/unexpected/cleanup cases и проверяет buffer/logging, PR4 задаёт concurrent/constraint/privilege cases, PR7 сохраняет обе custom-grammar подпроблемы, PR8 проверяет policy generations/bundle hit/direction, PR9 — URL/results/metadata, PR10 — функциональные interaction/layout/preview failures. Конкретные технические решения и безопасные размеры regression fixtures выбираются при реализации, а не подменяются обязательным переписыванием системы.

### Scope и owner decisions сохранены

- AUTH-LOCALE-RETURN-01: accepted option A, remap только безопасного внутреннего nested destination, sanitizer не ослабляется; query/hash не теряются.
- DOC-04: effective permission authoritative, moderator/admin — initial/default grants, custom roles/overrides сохраняются.
- DOC-03: moderator-only pending Disputed; не вводить новый public badge.
- M-M10/F06 — deferred contrast refinement; не подмешивать его в текущий PR10. ARCH-02, общий content max, raw UUID, generic pagination и прочие observations не возвращены в fix scope.
- Реальные Cloudflare/Neon/Hyperdrive/R2/OAuth/backup/restore, real provider/Queue/production rollout и owner visual acceptance не подразумеваются. Local/CI internal contract checks не выдаются за external acceptance.
- Текущая planning review не назначает Мишаню участником. Future whole-PR review следует актуальному AGENTS и более поздним owner instructions; состав planning reviewers не переопределяет молча будущие роли.
- `PROJECT_STATE.md`/implementation tasks относятся к реально проверенному exact head. Merge остаётся действием владельца. На этом шаге ничего не реализовано и не запущено из будущего плана.

### Передача результата

**Архитектурная проверка завершена: ACCEPT с двумя уже принятыми уточнениями Лиры, новых обязательных изменений нет.** Мира может свести командный fix-plan из checkpoints и FPLAN-T1/T2; дальнейший implementation task PR1 — отдельный шаг после принятия плана. Владелец не должен пересказывать scope/замечания между агентами: технический контекст и результат уже опубликованы в PR236.

Evidence этого review — полные planning comment inputs и механическая set/coverage сверка (`FIX-PLAN-ARCHITECTURE-REVIEW.json`). Новые product tests, CI, native/browser/PG acceptance, полный кодовый аудит, implementation/schema/dependency/main изменения не выполнялись. Чужие личные файлы и общий service-channel не менялись; публикация только в личный файл Лёвы и краткий PR comment.

---

## Финальное совещание — технический итог Лёвы / T5 (2026-10-25)

**Поручение:** [PR236 comment6392064227](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6392064227), после публикации T4 Лиры. Проверены консолидация Миры6391992192 / shared commit046365d0f458ea955687e4d1446a20ef96e48736, T4 Лиры6392203749 / file blob19ff8030c986ab8d74d9ff5f432cc2f57e91e1ba и поздние checkpoint verdicts, изменяющие мой прежний итог. Код baseline `d72b27ca762dd930f0e7ad614e5b00832a07ec0c` не изменился. Это финальная техническая сверка результатов, не новый аудит репозитория.

### Вердикт

**Рекомендую тот же реестр, что Мира и T4 Лиры: 60 уникальных текущих технических групп, отдельно2 preview/tooling и4 documentation/SOT; AUTH-LOCALE-RETURN-01 остаётся одним открытым продуктовым вопросом. Список технических отличий от консолидации Миры — пусто.**

Проверено точное множество60 ID, отсутствие повторов и соответствие собственным evidence/matrix. Это моё техническое согласие, не самовольное объявление общего consensus и не утверждение fix-plan. Следующее сведение consensus выполняет Мира. Реестр и severity сами по себе не разрешают implementation/dependency/schema changes.

**Эта запись уточняет прежний итог Лёвы «58 supported code groups +4 questions» и имеет над ним приоритет.** Предыдущие отчёты остаются историческими доказательствами; их технические наблюдения не объявляются несуществовавшими.

### Что изменилось относительно моего прежнего итога и почему

| Пункт | Новый вердикт | Основание и границы |
|---|---|---|
| AUTH-LINK-01 | Включить, +1 | Ранее я слишком широко применил исключение OAuth и исключил внутренний code/config contract. В package/installed Better Auth1.7.4 requireLocalEmailVerified по умолчанию true; signup оставляет local identity unverified, verification отложена, обычный offered social sign-in не является explicit link. Same-email local user без linked Google account попадает в account-not-linked. Это bounded conditional internal configuration defect, не утверждение, что любой Google вход сломан. Внешний OAuth/Google, credentials/redirect provisioning/smoke не проверялись; отключение security gate не предлагается. |
| AUTH-RATE-LIMIT-RACE-01 | Добавить новый применимый dependency/config finding, +1 | Официальный GHSA-44jh-23m7-hpcf: affected Better Auth/Drizzle adapter >=1.6.17,<1.7.7 при PostgreSQL database-backed limits. Здесь оба package pins1.7.4, provider pg, rateLimit enabled/database/model rateLimit. Условия совпадают. Не aggregate25 vulnerabilities; не native/production exploit, не bypass пароля. Dependency upgrade/compatibility review не выполнялись. |
| ATTACH-04 | Включить, +1 | Ранее я сформулировал открытый вопрос как обязательность abort pending request. Current docs/EDITOR.md182,194–199,364–367 требуют возможности исключить файл из mounted selection; Remove локален, late ACK не должен вернуть selection. Для этого не обязателен network abort/per-file server DELETE. Собственный component repro уже достаточен: pending row запрещает Remove, обычная whole Cancel имеет другую semantics и очищает всю операцию. Дефект выбора файла, а не штатного publication barrier или Cancel. Дополнительного решения владельца об API отмены для классификации не требуется. |
| TAG-CARDINALITY-01 | Включить, +1 | Для маленькой строки t000…t499 нормализатор допускает500 distinct tags; repository записывает500 global tags и500 links в одном permitted topic transaction; readTags выводит global catalogue. Перечитан действующий basic anti-spam contract public-write boundaries (ROADMAP42,210): cooldown ограничивает mutations, но не persistent/public fan-out одной. Это конкретная current write-boundary gap, а не просто отсутствие гипотетического max длинного body. Правильный численный cap — fix design, здесь не выбирается; latency/exhaustion/deployed DoS не доказаны. |
| M-M10/F06 | Deferred UI/accessibility, −1 из текущего technical count | Обе известные контрастные пары остаются истинными. Owner MVP-first decision docs/UI_UX_PASS17–24 и ROADMAP349–370 отделяют неблокирующий refinement от functional/security/data/authz дефектов. Не удалять из pre-release обязательств, не объявлять сайт WCAG compliant. RES-A11Y-01 с отсутствующим accessible name функционального input остаётся отдельным current finding. |
| EDITOR-09 + LOC-07 | Одна MARKDOWN-CUSTOM-STRUCTURE-DIVERGENCE-01, −1 net | Renderer использует segmentTechnicalMarkdown для собственных table/spoiler, recipient extraction — plain fromMarkdown, translation protection — generic parse/serialize без той же structural grammar. Общий root-cause family: вторичные semantic consumers не видят canonical custom structures. **Обязательно сохранить обе проверяемые подпроблемы** — recipient selection и translation structure protection. Это не навязывает один parser/fix. LOC-08 direction parse/serialize non-round-trip остаётся отдельным. |

Арифметика от моего прежнего code-total: **58 +1 link +1 rate +1 attachment +1 tags −1 contrast −1 merge =60**. Точный set-diff: added ATTACH-04, AUTH-LINK-01, AUTH-RATE-LIMIT-RACE-01, TAG-CARDINALITY-01, MARKDOWN-CUSTOM-STRUCTURE-DIVERGENCE-01; removed-as-separate EDITOR-09, LOC-07, M-M10. Это изменение классификации/гранулярности и один новый advisory, не60 новых найденных уязвимостей.

### Другие уточнения, не меняющие этот set-diff

- ARCH-02 окончательно снять как current leak, не оставлять обязательным owner/service вопросом. Официальный Worker/Hyperdrive lifecycle освобождает клиентское соединение после invocation; current loader request-scoped, не global. Мой native Pg idle-client proof моделировал standalone client без platform lifecycle. Нулевой endCalls остаётся локальным фактом, runtime leak из него не следует. Live service не тестировался.
- EDITOR-PUB-01/02 уже разделены в моём последнем реестре: revalidation/rebase409 и solution-oriented conflict copy — две причины. Не возвращать прежнее ошибочное объединение.
- HELP-01 содержит stale appeal и stale relationship removal subcases; HELP-MOD-01 относится к смене best-answer target и отдельно сохраняется. Transaction locks текущего объекта не привязывают старое UI intent к увиденной identity.
- ATTACH-02 classic65535 ZIP rejection не равен ATTACH-STRUCT-01 inconsistent ZIP metadata acceptance. CORE-01 deadlock не равен ARCH-01 exception→503 classification. LOC-08 не поглощён общей custom-table/spoiler family.
- DISCOVERY-01 и I18N-UGC-META-01 поддержаны собственными SQL/DOM проверками части5: internal service-section name/id в generic unanswered и Hebrew title без lang при dir=auto. Direct service-section read заблокирован; broad privacy bypass/all UGC failures не заявляются.
- DB-03 — внутренний exact ACL contract mismatch, не утверждение о production grants. POST-EDIT-AVAIL-01 Router500 подтверждён, но post-edit не имеет собственной ForumRouteError. Сохранить эти bounds в fix-plan.
- NOTIFY-BODY-01 остаётся order observation без установленного bypass/resource failure. CONTENT-SIZE-01 и ATTACH-SEC-01 не переходят в подтверждённые дефекты. Отсутствие обязательного raw UUID не превращать в вопрос, который владелец обязан решить для закрытия этого аудита.
- DOC-03/04 остаются документационными/SOT findings, не доказанными auth/privacy bypass. Runtime visibility/effective permissions не переписывались. Противоречивые тексты требуется согласовать в соответствующей работе; технический счёт от выбора wording не меняется. Никакого самостоятельного изменения требований не выполнено.

### Рекомендуемый canonical registry — 60

| Область | Canonical IDs |
|---|---|
| Auth/session/identity | `AUTH-01`, `AUTH-02`, `AUTH-LINK-01`, `AUTH-RATE-LIMIT-RACE-01`, `AUTH-SESSION-AVAIL-01`, `XR-CROSS-TAB-IDENTITY` |
| Error/runtime boundaries | `ARCH-01`, `ARCH-03`, `SEC-01`, `POST-EDIT-AVAIL-01`, `FORUM-READ-AVAIL-01` |
| Forum/read/discovery | `CORE-01`, `CORE-02`, `CORE-03`, `DISCOVERY-01` |
| Database/contracts | `DB-01`, `DB-02`, `DB-03` |
| Help & solutions | `HELP-01`, `HELP-02`, `HELP-MOD-01` |
| Attachments | `ATTACH-01`, `ATTACH-02`, `ATTACH-03`, `ATTACH-04`, `ATTACH-HTTP-405-01`, `ATTACH-STRUCT-01` |
| Editor / Markdown / UI | `EDITOR-01`, `EDITOR-02`, `EDITOR-03`, `EDITOR-04`, `EDITOR-05`, `EDITOR-06`, `EDITOR-07`, `EDITOR-08`, `EDITOR-10`, `EDITOR-11`, `EDITOR-PUB-01`, `EDITOR-PUB-02`, `LITERAL-TEXT-01`, `MARKDOWN-CUSTOM-STRUCTURE-DIVERGENCE-01`, `MARKDOWN-SPOILER-01`, `RES-EDITOR-02`, `RES-UI-01`, `RES-A11Y-01`, `CODE-HISTORY-01`, `CODE-SEARCH-01`, `M-M07`, `XR-THROWN-ACTION-BUFFER` |
| Localization / translation | `LOC-01`, `LOC-02`, `LOC-03`, `LOC-04`, `LOC-05`, `LOC-06`, `LOC-08`, `LOC-09`, `I18N-UI-POLICY-01`, `I18N-UGC-META-01` |
| Persistent public write amplification | `TAG-CARDINALITY-01` |

`MARKDOWN-CUSTOM-STRUCTURE-DIVERGENCE-01` — единственная causal dedup в остаточной очереди: прежние `EDITOR-09` + `LOC-07` являются двумя проявлениями одного structural mismatch. Остальные проверенные похожие families не были искусственно слиты.

### Preview / документация / один product decision

Preview: CODE-PREVIEW-01, CODE-PREVIEW-02. Документация/SOT: DOC-01, DOC-02, DOC-03, DOC-04. Они не включены в технические60 и не дублируют runtime.

Единственный открытый продуктовый вопрос перед окончательным technical count: **AUTH-LOCALE-RETURN-01**. Должен ли language switch безопасно remap locale вложенного returnTo и сохранять исходную страницу после credential flow, либо fallback на root новой локали допустим? Query сохраняется, old-locale nested path отвергается штатным sanitizer. Security bypass не установлен. Если owner требует remap — ещё один technical finding; если root fallback допустим — вопрос снимается. Я не выбираю ответ за владельца и не ослабляю redirect guard.

### Проверяемые источники и limits

- [Консолидация Миры](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6391992192), [поручение финального совещания](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6392064227), [T4 Лиры](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6392203749).
- [AUTH-LINK checkpoint](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6387984892), [tags](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6388113646), [attachment Remove](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6391178524), [Markdown family](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6390665639), [deferred contrast](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6388718904).
- [Официальный advisory GHSA-44jh-23m7-hpcf](https://github.com/better-auth/better-auth/security/advisories/GHSA-44jh-23m7-hpcf): проверена applicability, не выполнялся exploit. [Официальный lifecycle](https://developers.cloudflare.com/hyperdrive/concepts/connection-lifecycle/): проверен текст контракта, не реальная инфраструктура. Local installed dependency source Better Auth1.7.4 link-account.mjs подтверждает default/conditional return branch.
- Сверены только code/SOT цепочки, меняющие итоговую классификацию, и уже опубликованные матрица/evidence на том же baseline. Достаточные исторические native/browser/PG proofs не запускались заново. Их происхождение и ограничения остаются прежними. Новые tests/CI/browser/PG/adversarial/stress не выполнялись в T5; число новых тестов T5=0. Прежние28 локальных cross-review cases не выдаются за повторный прогон.
- Ни implementation, ни схема, зависимости, main, чужие agent files или общий service-channel в этом шаге не меняются. Результат опубликован в личном файле и PR comment, чтобы Мира выполнила следующее сведение consensus.

**T5 завершена. Конкретных technical disagreements с Мирой/T4 не осталось. Общий team consensus и fix-plan должен отдельно свести Мира; исправления до этого не начаты.**

---

## Итог моей общей сверки аудитов (2026-10-24)

**Предметная сверка опубликованных отчётов выполнена на baseline d72b27c.** Это мой итог сравнения и проверки, не коллективное утверждение команды, не новый независимый аудит и не разрешение исправлять/merge. Вопросы требований ниже сохранены открытыми; они не скрывают незавершённые проверки. Новая версия implementation требует отдельной проверки.

119 исходных утверждений сопоставлены. Итоговый инвентарь: **58 групп внутреннего кода с поддерживающими доказательствами, 2 preview и 4 документационных противоречия**; отдельно **4 технических вопроса применимости/требований**, OAuth исключён и notification parse-order оставлен наблюдением. Это не58 новых находок и не58 воспроизведённых production incidents. Условия и confidence различны: сохранённые native/browser proofs, source analysis, новые controlled tests. Severity и пакет исправлений не утверждены.

По сравнению с T3 Лиры: из64 технических кандидатов OAuth1 исключён по scope, notification order1 не признан доказанным defect; ARCH-02/ATTACH-04 переведены в вопросы, DISCOVERY/UGC дополнительно проверены до конкретного SQL/DOM и поддержаны в узком scope. Получается62 технических кандидата =58 supported +4 questions. Preview/documents считаются отдельно. Разделение EDITOR-PUB-01/02 исправляет моё прежнее чрезмерное объединение: разные причины, две записи. Post-edit и Home оставлены отдельными местами классификации failure, без искусственного слияния по одинаковому500.

28 новых различных локальных тестовых случаев passed за сверку; ещё6 исполнений — повторные/расширенные проверки старых случаев и не добавлены к28. Последняя часть13/13passed (10новых+3повторных). Initial harness failures частей1/3/4 сохранены и явно описаны; они не замаскированы под продуктовые дефекты. Полный CI, все исторические proof tests, native DB/browser/infrastructure acceptance заново не запускались. Проверяемый исходный код не менялся.

### Разделённые решения

- Поддержанные группы ниже сохраняют ограничения первичных доказательств. Условные failure/injected-session сценарии не повышены до реальных incidents; blind independence после чтения чужих результатов не восстановлена.
- DB-03 — внутренний ACL-контракт, не проверка реальных grants. ARCH-02 — endCalls0 локально, реальная runtime-утечка не установлена. Не поручать исключённый live Hyperdrive как обязательное завершение аудита.
- ATTACH-04 — отдельного abort pending file нет; whole Cancel работает. Обязательность per-file отмены во время ongoing upload требует решения владельца. До этого не включать безусловным P2.
- AUTH-LOCALE-RETURN-01 — query сохраняется; nested old-locale destination отвергается sanitizer. Требование remap остаётся открытым; нельзя ослаблять redirect guard на основании этого наблюдения.
- TAG-CARDINALITY-01 — max уникальных tags не согласован, count failure не доказан. CONTENT-SIZE-01 — отсутствие max не самостоятельный дефект. Это не отменяет отдельный static O(N²) spoiler finding.
- ATTACH-SEC-01 — нужно ли сохранять raw client UUID отдельно от contextual server ID не установлено. Это дополнительный вопрос корреляции, вне4 технических кандидатов, не доказанная потеря существующего asset.
- DOC-03 (Disputed visibility) и DOC-04 (history role vs effective permission) требуют выбора source of truth владельцем; требования не переписаны. Остальные doc/preview пункты отделены от runtime.

### Полный классифицированный инвентарь

S = поддержано в указанном scope; Q = требование/применимость, не confirmed count; O = наблюдение; X = исключено; P = preview; D = документация. Совпадение авторов не является доказательством. Детальное происхождение/контроли — предыдущий индивидуальный JSON, части1–5 и полная claim matrix ниже.

| ID | Статус | Суть |
|---|---|---|
| `ARCH-01` | S | Неожиданные ошибки записи маскируются под временную недоступность 503 |
| `ARCH-02` | Q | Загрузчик реестра локалей не завершает соединение после успешного чтения и части ошибок |
| `ARCH-03` | S | Ошибка завершения соединения подменяет успешный результат или исходную ошибку операции |
| `ATTACH-01` | S | Объект вложения без записи метаданных недоступен штатной очистке |
| `ATTACH-02` | S | Корректный обычный ZIP с 65535 записями ошибочно требует ZIP64 |
| `ATTACH-03` | S | Корректный пустой TAR отклоняется на распознавании сигнатуры |
| `ATTACH-04` | Q | Загружаемый файл нельзя удалить отдельно; до завершения загрузки публикация блокируется |
| `AUTH-01` | S | Удаляющий cookie старой сессии перезаписывает cookie успешного нового входа |
| `AUTH-02` | S | Назначение уже удалённой роли из старой формы завершается необработанной ошибкой 500 |
| `CORE-01` | S | Встречные одновременные ответы могут вызвать взаимную блокировку при записи уведомлений |
| `CORE-02` | S | Старое непрочитанное уведомление выпадает из последних 50 при сохранении общего счётчика |
| `CORE-03` | S | Отметка прочитанного может опередить фактически отданный снимок сообщений |
| `DB-01` | S | CHECK допускает неполные NULL-комбинации метаданных состояния allowance |
| `DB-02` | S | Верификатор схемы пропускает изменение предиката частичного индекса |
| `DB-03` | S | Контракт прав web runtime не включает используемую таблицу отметок прочитанного |
| `EDITOR-01` | S | Нормализация HTML-вставки схлопывает пустые строки внутри программного кода |
| `EDITOR-02` | S | Обычный текст ячеек таблицы превращается в Markdown-форматирование и ссылки |
| `EDITOR-03` | S | Очистка форматирования части жирного текста повреждает невыделенный суффикс |
| `EDITOR-04` | S | Отказ преобразования сложной таблицы молча заменяется обычным текстом |
| `EDITOR-05` | S | Find next не переносит выделение при уже открытом режиме записи |
| `EDITOR-06` | S | Enter внутри форматированного текста в Простом режиме повреждает разделители |
| `EDITOR-07` | S | Отступ захватывает исключённую конечную строку и может повредить закрывающий fence |
| `EDITOR-08` | S | Заблокированный редактор допускает изменение через Find/Replace или вставку |
| `EDITOR-09` | S | Выделение получателей упоминаний расходится с отображением таблиц и спойлеров |
| `EDITOR-10` | S | HTML-сущности в имени участника декодируются и меняют подпись упоминания |
| `EDITOR-11` | S | Публикация обрезает граничные пробелы Markdown и может превратить код в обычный текст |
| `HELP-01` | S | Старая форма решения апелляции может примениться к новой апелляции |
| `HELP-02` | S | Время начала транзакции может нарушить CHECK при снятии дубликата |
| `LOC-01` | S | Транспортная ошибка после COMMIT пропускает сверку результата записи локали |
| `LOC-02` | S | Неожиданная ошибка проверки compiled bundle может привести к удалению корректного bundle |
| `LOC-03` | S | Параметризованный i18next nesting проходит мимо проверки разрешённых токенов |
| `LOC-04` | S | При загрузке истории показывается сообщение о восстановлении вложений |
| `LOC-05` | S | Быстрое переключение политики A–B–A может потерять нужное поколение задачи |
| `LOC-06` | S | Запрос генерации для сообщения только с вложением завершается ошибкой 500 |
| `LOC-07` | S | Защита перевода не охватывает структуру собственных таблиц и спойлеров |
| `LOC-08` | S | Перевод теряет явное направление абзаца либо ошибочно отклоняет экранированный текст |
| `LOC-09` | S | Отклонённый перевод с завершённой задачей старой политики застревает в converging |
| `SEC-01` | S | Неожиданные ошибки профиля передают неопубликованный текст и SQL-параметры логгеру |
| `RES-EDITOR-02` | S | Backspace в начале второго обычного абзаца не соединяет абзацы в Простом режиме |
| `RES-UI-01` | S | Меню дополнительных инструментов редактора расширяет страницу на 320 px |
| `RES-A11Y-01` | S | Редактируемое текстовое поле Простого режима не имеет доступного имени |
| `CODE-SEARCH-01` | S | После возврата назад поле поиска не соответствует адресу и результатам |
| `CODE-HISTORY-01` | S | История правок расширяет узкую страницу вместо локального размещения текста |
| `M-M07` | S | Английская шапка менеджера переполняется при ширине 320 px |
| `M-M10` | S | У проверенного навигационного текста светлой темы недостаточный контраст |
| `AUTH-LINK-01` | X | Email signup without verification ↔ Google linking same email |
| `AUTH-SESSION-AVAIL-01` | S | Auth/session storage outage before normal Router boundary |
| `AUTH-LOCALE-RETURN-01` | Q | Locale-switch drops effective nested returnTo destination |
| `DISCOVERY-01` | S | Hidden Help service-section identity in discovery metadata |
| `HELP-MOD-01` | S | Stale solution moderation applies to newer best answer |
| `LITERAL-TEXT-01` | S | Plain visual content treated as Markdown syntax/entities |
| `EDITOR-PUB-01` | S | Failed 409 edit lacks normal loader refresh/rebase |
| `EDITOR-PUB-02` | S | Published edit conflict displays solution-specific error text |
| `MARKDOWN-SPOILER-01` | S | Repeated unmatched spoiler opening leads to quadratic scans |
| `ATTACH-STRUCT-01` | S | ZIP inconsistent local metadata/data descriptor accepted |
| `ATTACH-HTTP-405-01` | S | Attachment 405 response omits Allow header in route branch |
| `I18N-UI-POLICY-01` | S | Compiled UI bundle hit skips required generation policy validity |
| `I18N-UGC-META-01` | S | Secondary UGC presentation lacks source lang/dir in selected cases |
| `POST-EDIT-AVAIL-01` | S | Post-edit authorization/reader unavailable can reach generic 500 |
| `FORUM-READ-AVAIL-01` | S | Primary forum read availability fails to map into typed 503 |
| `NOTIFY-BODY-01` | O | Notification action reads form body before cheap auth/Origin rejection |
| `TAG-CARDINALITY-01` | Q | Unbounded unique tag count per publication expands persistent public catalog |
| `XR-THROWN-ACTION-BUFFER` | S | Unexpected action throw unmounts topic editor and in-memory content |
| `XR-CROSS-TAB-IDENTITY` | S | Cached A identity, server B reply author on topic |
| `DOC-01` | D | Текущие статусы и остаточные задачи в документации устарели |
| `DOC-02` | D | Документация отстаёт от фактического номера последней миграции |
| `DOC-03` | D | Документация противоречиво определяет видимость отметки Disputed |
| `DOC-04` | D | Доступ к истории описан через роль и через effective permission противоречиво |
| `CODE-PREVIEW-01` | P | Сценарий подтверждения лучшего ответа открывается решённым и не показывает подтверждение |
| `CODE-PREVIEW-02` | P | Вкладка Appeals (1) стенда показывает пустую очередь |

### Полная привязка 119 исходных строк

JSON ниже позволяет проверить, что исходная строка не потеряна, куда она отнесена, какие bounds сохранены и где исправлено grouping. Это матрица утверждений, а не119 дефектов. Локальные пути не выдаются за опубликованные raw proof artifacts: сами тесты/скриншоты остаются в workspace, опубликованы результаты, условия и ограничения.

<details><summary>Claim matrix (119 rows)</summary>

```json
{
  "status": "COMPARISON_COMPLETED_WITH_EXPLICIT_QUESTIONS_AND_LIMITS",
  "codeBaseline": "d72b27ca762dd930f0e7ad614e5b00832a07ec0c",
  "serviceSnapshot": "19f6a3ba78b2d2d57318ec2f4b35a40aa0a9dd25",
  "sourceReports": {
    "Мира": "27 claimed technical defects +1 SOT",
    "Лира": "6 classes +2 docs +2 conditional risks",
    "Мишаня": "30 historical statements, baseline21386887, not independent",
    "Лёва": "51 groups, with provenance/limits; not blind independent"
  },
  "countRule": "Never add 27+6+30+51. Current table is claim-to-cause/evidence mapping, not consensus or a final defect total.",
  "claimRows": 119,
  "rows": [
    {
      "auditor": "Лёва",
      "id": "ARCH-01",
      "mapsTo": "ARCH-01",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "ARCH-02",
      "mapsTo": "ARCH-02",
      "crossReviewStatus": "LOCAL_LIFECYCLE_FACT_RUNTIME_DEFECT_UNESTABLISHED",
      "decision": "Actual factory fake-client endCalls0 after success/unexpected error confirmed. Remove unconditional current-Stage defect status; excluded runtime lifecycle/leak not established.",
      "evidence": [
        "work/audit-cross-review/phase4-section.md"
      ]
    },
    {
      "auditor": "Лёва",
      "id": "ARCH-03",
      "mapsTo": "ARCH-03",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "ATTACH-01",
      "mapsTo": "ATTACH-01",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "ATTACH-02",
      "mapsTo": "ATTACH-02",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "ATTACH-03",
      "mapsTo": "ATTACH-03",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "ATTACH-04",
      "mapsTo": "ATTACH-04",
      "crossReviewStatus": "CONFIRMED_UI_LIMITATION_REQUIREMENT_CONFLICT_NOT_UNCONDITIONAL_P2",
      "decision": "Three prior component cases rerun passed. Pending per-file Remove absent; error Remove and whole Cancel work. Mandatory abort-during-upload unspecified; UX prompt broader than available controls.",
      "evidence": [
        "work/audit-cross-review/phase4-section.md"
      ]
    },
    {
      "auditor": "Лёва",
      "id": "AUTH-01",
      "mapsTo": "AUTH-01",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "AUTH-02",
      "mapsTo": "AUTH-02",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "CORE-01",
      "mapsTo": "CORE-01",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "CORE-02",
      "mapsTo": "CORE-02",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "CORE-03",
      "mapsTo": "CORE-03",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "DB-01",
      "mapsTo": "DB-01",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "DB-02",
      "mapsTo": "DB-02",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "DB-03",
      "mapsTo": "DB-03",
      "crossReviewStatus": "CONFIRMED_INTERNAL_CONTRACT_EXTERNAL_ACTIVATION_EXCLUDED",
      "decision": "Actual ACL assertion accepts missing read-state grants and rejects required extras. Stage6 external roles not checked; checked-in contract mismatch retained. Prior native proof not rerun.",
      "evidence": [
        "work/audit-cross-review/phase4-section.md"
      ]
    },
    {
      "auditor": "Лёва",
      "id": "DOC-01",
      "mapsTo": "DOC-01",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "DOC-02",
      "mapsTo": "DOC-02",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "DOC-03",
      "mapsTo": "DOC-03",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "DOC-04",
      "mapsTo": "DOC-04",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "EDITOR-01",
      "mapsTo": "EDITOR-01",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "EDITOR-02",
      "mapsTo": "EDITOR-02",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "EDITOR-03",
      "mapsTo": "EDITOR-03",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "EDITOR-04",
      "mapsTo": "EDITOR-04",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "EDITOR-05",
      "mapsTo": "EDITOR-05",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "EDITOR-06",
      "mapsTo": "EDITOR-06",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "EDITOR-07",
      "mapsTo": "EDITOR-07",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "EDITOR-08",
      "mapsTo": "EDITOR-08",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "EDITOR-09",
      "mapsTo": "EDITOR-09",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "EDITOR-10",
      "mapsTo": "EDITOR-10",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "EDITOR-11",
      "mapsTo": "EDITOR-11",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "HELP-01",
      "mapsTo": "HELP-01",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "HELP-02",
      "mapsTo": "HELP-02",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "LOC-01",
      "mapsTo": "LOC-01",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "LOC-02",
      "mapsTo": "LOC-02",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "LOC-03",
      "mapsTo": "LOC-03",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "LOC-04",
      "mapsTo": "LOC-04",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "LOC-05",
      "mapsTo": "LOC-05",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "LOC-06",
      "mapsTo": "LOC-06",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "LOC-07",
      "mapsTo": "LOC-07",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "LOC-08",
      "mapsTo": "LOC-08",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "LOC-09",
      "mapsTo": "LOC-09",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "SEC-01",
      "mapsTo": "SEC-01",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "RES-EDITOR-02",
      "mapsTo": "RES-EDITOR-02",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "RES-UI-01",
      "mapsTo": "RES-UI-01",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "RES-A11Y-01",
      "mapsTo": "RES-A11Y-01",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "CODE-PREVIEW-01",
      "mapsTo": "CODE-PREVIEW-01",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "CODE-PREVIEW-02",
      "mapsTo": "CODE-PREVIEW-02",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "CODE-SEARCH-01",
      "mapsTo": "CODE-SEARCH-01",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "CODE-HISTORY-01",
      "mapsTo": "CODE-HISTORY-01",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "M-M07",
      "mapsTo": "M-M07",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "M-M10",
      "mapsTo": "M-M10",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Мира",
      "id": "AUTHZ-01",
      "mapsTo": "AUTH-02",
      "crossReviewStatus": "PARTIAL_DUPLICATE",
      "decision": "Удалённая роль совпадает с AUTH-02; более широкий missing-user вариант не подтверждён этим воспроизведением.",
      "evidence": []
    },
    {
      "auditor": "Мира",
      "id": "AUTH-LINK-01",
      "mapsTo": null,
      "crossReviewStatus": "OUT_OF_SCOPE",
      "decision": "Google linking относится к исключённому OAuth; не включать в общий текущий список.",
      "evidence": []
    },
    {
      "auditor": "Мира",
      "id": "AUTH-SESSION-AVAIL-01",
      "mapsTo": "XR-AUTH-STARTUP",
      "crossReviewStatus": "REEXECUTED_WORKER_PREROUTER_FAILURE_WITH_FAKE_CAPABILITIES",
      "decision": "Actual Worker session rejection prevents Router dispatch/Response; ordinary session handler200 control. No actual platform status/body or external service check.",
      "evidence": [
        "work/audit-cross-review/phase5-section.md"
      ]
    },
    {
      "auditor": "Мира",
      "id": "AUTH-COOKIE-ORDER-01",
      "mapsTo": "AUTH-01",
      "crossReviewStatus": "DUPLICATE",
      "decision": "Та же последовательность clearing/new cookie; дополнительные локальные доказательства уже есть.",
      "evidence": []
    },
    {
      "auditor": "Мира",
      "id": "AUTH-LOCALE-RETURN-01",
      "mapsTo": "XR-AUTH-LOCALE",
      "crossReviewStatus": "REPRODUCED_DESTINATION_FALLBACK_REQUIREMENT_UNESTABLISHED",
      "decision": "Actual switcher preserves query/nested old-locale destination; safe guard returns new locale root. Remapping requirement remains unsettled.",
      "evidence": [
        "work/audit-cross-review/phase5-section.md"
      ]
    },
    {
      "auditor": "Мира",
      "id": "DISCOVERY-01",
      "mapsTo": "XR-HELP-DISCOVERY",
      "crossReviewStatus": "CONFIRMED_GENERATED_SQL_AND_PRESENTATION_SCOPE",
      "decision": "Actual query/mapper exposes service-section metadata in generic unanswered path; direct readSection remains blocked. docs UI_UX_PASS314–325 require hidden generic discovery; no privacy bypass.",
      "evidence": [
        "work/audit-cross-review/phase5-section.md"
      ]
    },
    {
      "auditor": "Мира",
      "id": "HELP-MOD-01",
      "mapsTo": "XR-STALE-SOLUTION",
      "crossReviewStatus": "CONFIRMED_TARGET_SELECTION_WITH_INJECTED_TRANSACTION",
      "decision": "Actual action/service/repository selects answer-B for old intent; no expected answer identity. Two SQL-capture cases; no native concurrency.",
      "evidence": [
        "work/audit-cross-review/phase3-stale.test.ts",
        "work/audit-cross-review/phase3-stale-evidence.json"
      ]
    },
    {
      "auditor": "Мира",
      "id": "HELP-DUP-01",
      "mapsTo": "HELP-01",
      "crossReviewStatus": "PARTIAL_DUPLICATE_PLUS_CONFIRMED_STALE_REMOVE_VARIANT",
      "decision": "Existing stale appeal overlap retained; remove variant targets current relationship-B and its appeals, actual action/service/repository with injected snapshots.",
      "evidence": [
        "work/audit-cross-review/phase3-stale.test.ts",
        "work/audit-cross-review/phase3-stale-evidence.json"
      ]
    },
    {
      "auditor": "Мира",
      "id": "LITERAL-TEXT",
      "mapsTo": "XR-LITERAL",
      "crossReviewStatus": "REPRODUCED_LOCAL_HELPER",
      "decision": "escapeVisualMarkdownText и реальный published parser: --- становится thematicBreak, ~~literal~~ — delete, &copy; — ©. Не дублировать EDITOR-02 (таблицы) или EDITOR-10 (подпись mention).",
      "evidence": []
    },
    {
      "auditor": "Мира",
      "id": "EDITOR-PUB-01",
      "mapsTo": "XR-EDIT-409",
      "crossReviewStatus": "REPRODUCED_ACTUAL_LOCAL_ROUTE",
      "decision": "Настоящие Topic route loader/view/action: после controlled409 загрузчик остаётся на одном вызове, fence r1, текст сохранён, rebase отсутствует; явная revalidation даёт второй вызов и кнопку.",
      "evidence": []
    },
    {
      "auditor": "Мира",
      "id": "EDITOR-PUB-02",
      "mapsTo": "XR-EDIT-CONFLICT-COPY",
      "crossReviewStatus": "CONFIRMED_SEPARATE_COPY_CAUSE_ACTUAL_ROUTE",
      "decision": "Correct earlier grouping: loader409/rebase and wrong conflict message key are independent causes. Actual edit409 repeats exact solution-oriented text; separate group.",
      "evidence": [
        "work/audit-cross-review/phase5-conflict-copy-evidence.json"
      ]
    },
    {
      "auditor": "Мира",
      "id": "CONTENT-SIZE-01",
      "mapsTo": "XR-CONTENT-BOUNDS",
      "crossReviewStatus": "POLICY_OBSERVATION_NOT_STANDALONE_CONFIRMED_DEFECT",
      "decision": "No domain max fact retained; no agreed threshold/current failure established. Separate from statically established spoiler complexity.",
      "evidence": [
        "work/audit-cross-review/phase5-section.md"
      ]
    },
    {
      "auditor": "Мира",
      "id": "MARKDOWN-SPOILER-01",
      "mapsTo": "XR-SPOILER-COMPLEXITY",
      "crossReviewStatus": "STATIC_ALGORITHM_CORROBORATED_NO_STRESS",
      "decision": "spoilerAt сканирует хвост и при отсутствии конца возвращает null; outer loop сдвигает i только на 1. Для N открывающих маркеров сумма проходов квадратична. Это отдельный статический вывод; остановленные ресурсные опыты не возобновлялись.",
      "evidence": []
    },
    {
      "auditor": "Мира",
      "id": "ATTACH-LIFECYCLE-01",
      "mapsTo": "ATTACH-01",
      "crossReviewStatus": "DUPLICATE",
      "decision": "Тот же orphan object без достижимой metadata row и последующего claim очистки.",
      "evidence": []
    },
    {
      "auditor": "Мира",
      "id": "ATTACH-STRUCT-01",
      "mapsTo": "XR-ZIP-METADATA",
      "crossReviewStatus": "REPRODUCED_BOUNDED_STRUCTURE_VALIDATION_GAP",
      "decision": "Два113-byte ZIP: local compressed size123 при central/actual5 и bit3 с отсутствующим descriptor принимаются actual validator и private finalization. Base control accepted, one-sided flags mismatch rejected. No deep content/AV/publication failure claim. PKWARE APPNOTE6.3.10 sections4.3.9.1/4.4.8-9 confirm format requirement.",
      "evidence": [],
      "phase2Evidence": "phase2-evidence.json"
    },
    {
      "auditor": "Мира",
      "id": "ATTACH-SEC-01",
      "mapsTo": "XR-SECURITY-ID",
      "crossReviewStatus": "DERIVED_ID_INTENT_CONFIRMED_SPECIFIC_UUID_REQUIREMENT_UNESTABLISHED",
      "decision": "Actual rejection route produces contextual stable attachment-v1 key; same retry same key, other inputId other key; no asset row. Filename/owner/context/draft/type/reason retained. Raw client UUID not separately retained. Tests confirm implementation intent, not specification sufficiency; no proven requirement to expose/persist raw UUID established.",
      "evidence": [],
      "phase2Evidence": "phase2-evidence.json"
    },
    {
      "auditor": "Мира",
      "id": "ATTACH-HTTP-405-01",
      "mapsTo": "XR-HTTP-ALLOW",
      "crossReviewStatus": "REPRODUCED_ROUTER_RESOURCE405_MISSING_ALLOW",
      "decision": "Actual static resource dispatch HEAD→loader and PATCH→action returns405 without Allow; scoped to attachment-upload resource, no deployed server/proxy claim. RFC9110 section15.5.6.",
      "evidence": [
        "work/audit-cross-review/phase4-section.md"
      ]
    },
    {
      "auditor": "Мира",
      "id": "I18N-UI-POLICY-01",
      "mapsTo": "XR-UI-POLICY",
      "crossReviewStatus": "REPRODUCED_LOCAL_POLICY_CONSISTENCY_GAP",
      "decision": "Bundle compiled/verified for v1 text accepted on hit, bypassing configured v2 raw source; miss drops v1 row. Spec requires current generation-policy checks. Runtime locale boundary currently also lacks required-policy parameter. No deployed policy-switch incident claimed.",
      "evidence": [],
      "phase2Evidence": "phase2-evidence.json"
    },
    {
      "auditor": "Мира",
      "id": "I18N-COPY-01",
      "mapsTo": "LOC-04",
      "crossReviewStatus": "DUPLICATE",
      "decision": "Тот же editorAttachmentRestoring в pending истории; не путать с CODE-HISTORY-01 overflow.",
      "evidence": []
    },
    {
      "auditor": "Мира",
      "id": "I18N-UGC-META-01",
      "mapsTo": "XR-UGC-META",
      "crossReviewStatus": "CONFIRMED_SECONDARY_TITLE_LANGUAGE_METADATA_GAP",
      "decision": "Actual unanswered SQL omits source_locale, route projection discards fixture metadata; DOM strong dir=auto, no lang, inherits English for Hebrew title. No blanket UGC/visual/screen-reader claim.",
      "evidence": [
        "work/audit-cross-review/phase5-section.md"
      ]
    },
    {
      "auditor": "Мира",
      "id": "DB-MANIFEST-01",
      "mapsTo": "DB-02",
      "crossReviewStatus": "DUPLICATE",
      "decision": "Тот же отсутствующий partial index predicate в parity manifest.",
      "evidence": []
    },
    {
      "auditor": "Мира",
      "id": "DB-ERROR-01",
      "mapsTo": "ARCH-01",
      "crossReviewStatus": "DUPLICATE",
      "decision": "Та же catch-all503 ошибка, что Лира F03 и Миша High. High не установлен; не все request errors становятся503.",
      "evidence": []
    },
    {
      "auditor": "Мира",
      "id": "POST-EDIT-AVAIL-01",
      "mapsTo": "XR-POST-EDIT-503",
      "crossReviewStatus": "REPRODUCED_ROUTER500_TYPED_UNAVAILABLE",
      "decision": "Actual post-edit reader/authz typed failures become Router500. Correct previous boundary attribution: post-edit has no own ForumRouteError export.",
      "evidence": [
        "work/audit-cross-review/phase5-section.md"
      ]
    },
    {
      "auditor": "Мира",
      "id": "FORUM-READ-AVAIL-01",
      "mapsTo": "XR-PUBLIC-503",
      "crossReviewStatus": "REPRODUCED_ROUTER500_WITH_OPTIONAL200_AND_NOTIFICATION503_CONTROLS",
      "decision": "Home primary unavailable yields Router500; optional presence unavailable retains200; notification typed unavailable maps503. No deployed response claimed.",
      "evidence": [
        "work/audit-cross-review/phase5-section.md"
      ]
    },
    {
      "auditor": "Мира",
      "id": "NOTIFY-BODY-01",
      "mapsTo": "XR-NOTIFY-GUARD",
      "crossReviewStatus": "OBSERVATION_NOT_ESTABLISHED_SECURITY_DEFECT",
      "decision": "Small actual-action guest cases parse first, then401 or parsing400; writer0. No auth bypass/exhaustion/invariant failure established.",
      "evidence": [
        "work/audit-cross-review/phase5-section.md"
      ]
    },
    {
      "auditor": "Мира",
      "id": "NOTIFY-PAGING-01",
      "mapsTo": "CORE-02",
      "crossReviewStatus": "DUPLICATE",
      "decision": "Тот же latest50 inbox/all unread badge; старый post остаётся доступен другими путями.",
      "evidence": []
    },
    {
      "auditor": "Мира",
      "id": "TAG-CARDINALITY-01",
      "mapsTo": "XR-TAG-BOUNDS",
      "crossReviewStatus": "REQUIREMENT_QUESTION_NOT_CONFIRMED_CURRENT_DEFECT",
      "decision": "Unique tag count is unbounded while individual names<=64 and deduplicated. No agreed count threshold or current failure established.",
      "evidence": [
        "work/audit-cross-review/phase5-section.md"
      ]
    },
    {
      "auditor": "Мира",
      "id": "MIGRATION-SOT-01",
      "mapsTo": "DOC-02",
      "crossReviewStatus": "DUPLICATE_DOCUMENTATION",
      "decision": "Та же разница0043/0044; отдельно от runtime дефектов.",
      "evidence": []
    },
    {
      "auditor": "Лира",
      "id": "F01",
      "mapsTo": "XR-EDIT-409",
      "crossReviewStatus": "REPRODUCED_ACTUAL_LOCAL_ROUTE",
      "decision": "F01 covers edit409 refresh plus separate wrong-copy cause; shared scenario does not merge distinct mechanisms.",
      "evidence": [],
      "alsoMapsTo": [
        "XR-EDIT-CONFLICT-COPY"
      ]
    },
    {
      "auditor": "Лира",
      "id": "F02",
      "mapsTo": "XR-THROWN-ACTION-BUFFER",
      "crossReviewStatus": "CONDITIONAL_BUFFER_LOSS_REPRODUCED_JSDOM",
      "decision": "Unexpected permission exception replaces actual TopicView via actual route boundary; typed unavailable control keeps buffer. No universal network failure or production incident claim.",
      "evidence": [
        "work/audit-cross-review/phase3-buffer.test.tsx",
        "work/audit-cross-review/phase3-buffer-evidence.json"
      ]
    },
    {
      "auditor": "Лира",
      "id": "F03",
      "mapsTo": "ARCH-01",
      "crossReviewStatus": "DUPLICATE",
      "decision": "Тот же writer catch-all503.",
      "evidence": []
    },
    {
      "auditor": "Лира",
      "id": "F04",
      "mapsTo": "XR-CROSS-TAB-IDENTITY",
      "crossReviewStatus": "IDENTITY_MISMATCH_REPRODUCED_INJECTED_SESSION",
      "decision": "Actual heartbeat204 on topic leaves cached A; actual reply passes body to permitted B. Denied-B control does not write. No real two-tab/cookie/DB persistence reproduction.",
      "evidence": [
        "work/audit-cross-review/phase3-identity.test.tsx",
        "work/audit-cross-review/phase3-identity-evidence.json"
      ]
    },
    {
      "auditor": "Лира",
      "id": "F05",
      "mapsTo": "HELP-01",
      "crossReviewStatus": "DUPLICATE",
      "decision": "Та же stale appeal identity; прежняя native race сильнее source-only доказательства.",
      "evidence": []
    },
    {
      "auditor": "Лира",
      "id": "F06",
      "mapsTo": "M-M10",
      "crossReviewStatus": "RELATED_SAME_PALETTE_FAMILY",
      "decision": "Белый текст submit на accent — дополнительное место; не тот же цветовой pair, что навигация. Не суммировать как новый класс без определения root cause.",
      "evidence": []
    },
    {
      "auditor": "Лира",
      "id": "D01",
      "mapsTo": "DOC-02",
      "crossReviewStatus": "DUPLICATE_DOCUMENTATION",
      "decision": "Migration0043/0044.",
      "evidence": []
    },
    {
      "auditor": "Лира",
      "id": "D02",
      "mapsTo": "DOC-04",
      "crossReviewStatus": "DUPLICATE_DOCUMENTATION",
      "decision": "History role-only vs effective permission.",
      "evidence": []
    },
    {
      "auditor": "Лира",
      "id": "R01",
      "mapsTo": "CORE-01",
      "crossReviewStatus": "PRIOR_NATIVE_PROOF_RESOLVES_CONDITIONAL",
      "decision": "У Лиры PG race не запускалась; прежнее native PG доказательство в реестре Лёвы найдено. Это не исполнение Лиры.",
      "evidence": []
    },
    {
      "auditor": "Лира",
      "id": "R02",
      "mapsTo": "SEC-01",
      "crossReviewStatus": "PARTIAL_OVERLAP",
      "decision": "Raw diagnostics риск шире; конкретный profile form/SQL leakage подтверждён прежним injected-DB-error доказательством. Не расширять на все handlers без проверки.",
      "evidence": []
    },
    {
      "auditor": "Мишаня",
      "id": "M-H01",
      "mapsTo": "ARCH-01",
      "crossReviewStatus": "HISTORICAL_STATEMENT_REUSE_WITH_CURRENT_BASELINE_VERIFICATION",
      "decision": "Original baseline21386887, independence disclaimed. Prior d72b27c verification: CONFIRMED; HIGH_NOT_ESTABLISHED. Statement is not automatically a new defect.",
      "evidence": [
        {
          "fact": "Actual sectionAction through React Router createStaticHandler maps injected unexpected writer TypeError and schema-like Error(code=42703) into status503 actionData unavailable with errors=null; each writer called once. Classified storage outage has the same status/body.",
          "controls": "Success redirects302; guest401/foreign-origin403 prevent write; domain errors400/403/404/409/429; source-locale correction wrapper preserves unexpected TypeError identity.",
          "newTestReport": "/workspace/work/audit/repo/work/misha-verification-part1/results.json",
          "bounds": [
            "Session, permission resolver and writer are fakes; no real database, schema failure or service accessed.",
            "No actual data loss, privilege impact or separate availability failure established. High priority is not justified by this reproduction alone.",
            "Targeted source-test search found explicit unexpected-error coverage for correction/authorization/generation; absence of all possible equivalent tests across repository was not exhaustively established."
          ],
          "baseline": "Mutation wrapper unchanged between Misha baseline21386887 and currentd72b27ca."
        }
      ]
    },
    {
      "auditor": "Мишаня",
      "id": "M-M01",
      "mapsTo": "DOC-04",
      "crossReviewStatus": "HISTORICAL_STATEMENT_REUSE_WITH_CURRENT_BASELINE_VERIFICATION",
      "decision": "Original baseline21386887, independence disclaimed. Prior d72b27c verification: CONFIRMED; DOCUMENTATION_CONFLICT_CONFIRMED_MEDIUM_NOT_ESTABLISHED. Statement is not automatically a new defect.",
      "evidence": [
        {
          "fact": "EDITOR.md285-286 restricts revision history to administrator/moderator roles and excludes ordinary users absolutely; AUTHORIZATION.md13-17,51 defines mutable grants/overrides and history.read as authoritative. Contradiction persists on current baseline.",
          "code": "topicAction readPostHistory branch checks forum.post.history.read, without role-name restriction. topic loader derives history visibility from same permission. edit loader and attachment guard require editOwn plus authoritative ownership, not history.read.",
          "testReport": "/workspace/work/audit/repo/work/misha-verification-part2/results.json",
          "bounds": [
            "Tests use actual post-edit loader and attachment authorization with fake session/reader/resolver: own+edit allowed, own+history only forbidden, foreign owner+edit forbidden; loader guest401 and missing404.",
            "Revision-history action behavior inspected in source, not separately executed in this part. No authorization bypass established.",
            "Do not silently rewrite requirements to resolve the two documents. This finding is a documentation conflict."
          ]
        }
      ]
    },
    {
      "auditor": "Мишаня",
      "id": "M-M02",
      "mapsTo": "M-M02",
      "crossReviewStatus": "HISTORICAL_STATEMENT_REUSE_WITH_CURRENT_BASELINE_VERIFICATION",
      "decision": "Original baseline21386887, independence disclaimed. Prior d72b27c verification: PARTIALLY_CONFIRMED; COUPLING_OBSERVATION_NOT_ESTABLISHED_DEFECT. Statement is not automatically a new defect.",
      "evidence": [
        {
          "fact": "App request contexts reference ForumReader from repository and ForumWriter from adapter; mutations use db-defined errors. Scoped AST graph has51 app->db module edges,10 explicitly type-only.",
          "method": "AST static graph and targeted import review; modular-monolith contract read.",
          "bounds": [
            "No explicit prohibition found in inspected contract passages, not full re-audit of all architecture docs.",
            "Imports/coupling alone do not prove functional defect, client bundle leak or necessity of refactor. Medium not established.",
            "Server-side auth ORM/schema composition is expected wiring and not automatically counted as a defect."
          ],
          "graph": "/workspace/work/audit/repo/work/misha-verification-part3/graph.json",
          "report": "/workspace/work/misha-verification/part3.md"
        }
      ]
    },
    {
      "auditor": "Мишаня",
      "id": "M-M03",
      "mapsTo": "XR-CONTENT-BOUNDS",
      "crossReviewStatus": "POLICY_OBSERVATION_NOT_STANDALONE_CONFIRMED_DEFECT",
      "decision": "No domain max fact retained; no agreed threshold/current failure established. Separate from statically established spoiler complexity.",
      "evidence": [
        "work/audit-cross-review/phase5-section.md"
      ]
    },
    {
      "auditor": "Мишаня",
      "id": "M-M04",
      "mapsTo": "M-M04",
      "crossReviewStatus": "HISTORICAL_STATEMENT_REUSE_WITH_CURRENT_BASELINE_VERIFICATION",
      "decision": "Original baseline21386887, independence disclaimed. Prior d72b27c verification: PARTIALLY_CONFIRMED; MEDIUM_NOT_ESTABLISHED. Statement is not automatically a new defect.",
      "evidence": [
        {
          "fact": "Prior own HTTP captures on identical current baseline show no Cache-Control or Vary on profile HTML/HEAD/single-fetch and authenticated notifications resource projection. Current entry, Worker wrapper and route source review show no global injection.",
          "reusedOwnEvidence": [
            "/workspace/work/audit/repo/work/audit-stage10-part5/http-evidence.json",
            "/workspace/work/audit-stage0/stage10-part5.json"
          ],
          "bounds": [
            "Prior captures reused, not counted as new test runs. Actual profile loader/component/root/SSR entry; manually assembled manifest includes synthetic root loader; locale parent absent.",
            "Notifications loader projected as resource route, not full actual notifications document. No enumeration of every personalized SSR page completed in this part.",
            "No cross-account cache disclosure established. Production cache/CDN/service behavior explicitly excluded.",
            "Local route-specific no-store policies exist, including attachments/mentions/presence and selected locale redirects. Vary alone is not a universal substitute for private/no-store."
          ]
        }
      ]
    },
    {
      "auditor": "Мишаня",
      "id": "M-M05",
      "mapsTo": "M-M05",
      "crossReviewStatus": "HISTORICAL_STATEMENT_REUSE_WITH_CURRENT_BASELINE_VERIFICATION",
      "decision": "Original baseline21386887, independence disclaimed. Prior d72b27c verification: PARTIALLY_CONFIRMED; MEDIUM_NOT_ESTABLISHED. Statement is not automatically a new defect.",
      "evidence": [
        {
          "fact": "Prior actual profile HTML response has only Content-Type:text/html; no X-Frame-Options or CSP frame-ancestors. Current entry/root/Worker/locale wrapper review and targeted production-source header search show no common application HTML anti-framing policy.",
          "reusedOwnEvidence": [
            "/workspace/work/audit/repo/work/audit-stage10-part5/http-evidence.json",
            "/workspace/work/audit-stage0/stage10-part5.json"
          ],
          "bounds": [
            "No browser framing/clickjacking flow tested in this verification part; no concrete dangerous framed action established.",
            "Deployed proxy/platform headers not inspected and outside scope. No global assessment of every HTML endpoint or every possible security header.",
            "Attachment responses have their own sandbox/nosniff policies; that does not establish a policy for HTML pages.",
            "Absence of a hardening header is recorded as absence, not automatically a demonstrated exploitable vulnerability."
          ]
        }
      ]
    },
    {
      "auditor": "Мишаня",
      "id": "M-M06",
      "mapsTo": "M-M06",
      "crossReviewStatus": "HISTORICAL_STATEMENT_REUSE_WITH_CURRENT_BASELINE_VERIFICATION",
      "decision": "Original baseline21386887, independence disclaimed. Prior d72b27c verification: CONFIRMED; TRIGGER_GAP_CONFIRMED_MEDIUM_NOT_ESTABLISHED. Statement is not automatically a new defect.",
      "evidence": [
        {
          "fact": "Primary ci.yml triggers only pull_request. Main push UI Preview workflow builds preview but does not repeat primary tests/database checks.",
          "bounds": [
            "Not equivalent to absence of every main check. PR merge-ref checks may test integration before merge.",
            "Branch protections, org-required checks, merge queue settings and actual execution history not queried."
          ],
          "evidence": "/workspace/work/audit/repo/work/misha-verification-part4/ci-evidence.json",
          "report": "/workspace/work/misha-verification/part4.md"
        }
      ]
    },
    {
      "auditor": "Мишаня",
      "id": "M-M07",
      "mapsTo": "M-M07",
      "crossReviewStatus": "HISTORICAL_STATEMENT_REUSE_WITH_CURRENT_BASELINE_VERIFICATION",
      "decision": "Original baseline21386887, independence disclaimed. Prior d72b27c verification: PARTIALLY_CONFIRMED; EN_OVERFLOW_CONFIRMED_ORIGINAL_METRICS_AND_HE_NOT_REPRODUCED. Statement is not automatically a new defect.",
      "evidence": [
        {
          "fact": "EN manager home fixture at320px documentWidth357; account content348/client302; screenshot shows clipped Sign out. HE320 has no reproduced overflow; at1280 neither document overflows.",
          "bounds": [
            "Original75pxEN/32pxHE not reproduced.",
            "Fresh built UI Preview fake identity/data; no production auth flow or exhaustive names/fonts/state matrix."
          ],
          "evidence": "/workspace/work/audit/repo/work/misha-verification-part7/browser-evidence.json",
          "report": "/workspace/work/misha-verification/part7.md"
        }
      ]
    },
    {
      "auditor": "Мишаня",
      "id": "M-M08",
      "mapsTo": "M-M08",
      "crossReviewStatus": "HISTORICAL_STATEMENT_REUSE_WITH_CURRENT_BASELINE_VERIFICATION",
      "decision": "Original baseline21386887, independence disclaimed. Prior d72b27c verification: CONFIRMED; PAGINATION_ABSENCE_CONFIRMED_MEDIUM_IMPACT_NOT_MEASURED. Statement is not automatically a new defect.",
      "evidence": [
        {
          "fact": "readSection2527 selects all topic rows in requested section, then tags. readTopicPage2574 selects all posts with revisions in requested topic, then metadata for their attachments. No page/cursor/limit/offset for these lists. Reader contracts accept ID only; actual loaders call these methods.",
          "method": "Targeted static source and route/view flow review; no SQL executed.",
          "bounds": [
            "Attachment metadata is read, not file bytes. Other repository methods have bounds; no claim all queries unpaginated.",
            "No latency, EXPLAIN, load or cost measurement. No severity Medium acceptance based on this inspection alone."
          ],
          "report": "/workspace/work/misha-verification/part3.md"
        }
      ]
    },
    {
      "auditor": "Мишаня",
      "id": "M-M09",
      "mapsTo": "M-M09",
      "crossReviewStatus": "HISTORICAL_STATEMENT_REUSE_WITH_CURRENT_BASELINE_VERIFICATION",
      "decision": "Original baseline21386887, independence disclaimed. Prior d72b27c verification: CONFIRMED; QUERY_SCOPE_CONFIRMED_MEDIUM_IMPACT_NOT_MEASURED. Statement is not automatically a new defect.",
      "evidence": [
        {
          "fact": "Section loader passes only userId to readUnreadForUser then constructs section-only states in app. Repository query joins forum topics/posts and has no section predicate or pagination; uses grouping and array_agg for all unread topics. Internal reader delegates directly to repository.",
          "testReport": "/workspace/work/audit/repo/work/misha-verification-part2/results.json",
          "tests": "Real section loader with fake reader requests exactly(actor), receives inside/outside topics, returns only section state including read fallback. Guest does not call unread reader.",
          "bounds": [
            "No SQL executed or query plan measured in this part; repository query inspected statically.",
            "No observed production latency, bill or service problem claimed. Actual cardinality/performance impact unmeasured.",
            "Section route unchanged between old and current baseline; this issue is not removed by draft deletion."
          ]
        }
      ]
    },
    {
      "auditor": "Мишаня",
      "id": "M-M10",
      "mapsTo": "M-M10",
      "crossReviewStatus": "HISTORICAL_STATEMENT_REUSE_WITH_CURRENT_BASELINE_VERIFICATION",
      "decision": "Original baseline21386887, independence disclaimed. Prior d72b27c verification: CONFIRMED; SELECTED_NORMAL_TEXT_WCAG_AA_CONTRAST_FAILURE. Statement is not automatically a new defect.",
      "evidence": [
        {
          "fact": "Rendered navigation label Unanswered and HE counterpart at1280 use253,109,41 text over248,246,243 background,13.12px. Contrast2.6322:1 below4.5:1.",
          "bounds": [
            "Light theme and selected text only; logo excluded; not universal AA audit of all controls.",
            "Shared components in fake preview, not full production runtime. Refinement-stage/merge policy not changed."
          ],
          "evidence": "/workspace/work/audit/repo/work/misha-verification-part7/contrast-evidence.json",
          "report": "/workspace/work/misha-verification/part7.md"
        }
      ]
    },
    {
      "auditor": "Мишаня",
      "id": "M-M11",
      "mapsTo": "M-M11",
      "crossReviewStatus": "HISTORICAL_STATEMENT_REUSE_WITH_CURRENT_BASELINE_VERIFICATION",
      "decision": "Original baseline21386887, independence disclaimed. Prior d72b27c verification: PARTIALLY_CONFIRMED; HISTORICAL_ADVISORY_COUNTS_AND_REPO_GATE_ABSENCE_CONFIRMED_APP_MEDIUM_NOT_ESTABLISHED. Statement is not automatically a new defect.",
      "evidence": [
        {
          "fact": "Retained raw report25 records,8High13Moderate4Low, same lock hash as current. No configured audit/update gate or repository dependabot/renovate config found.",
          "controls": "Exact dependency pins,frozen-lockfile,integrity present. Registry severity differs from application exploitability. Prior own stage10part4 condition review reused without rerunning probes.",
          "bounds": [
            "No fresh registry audit; no new dependency graph transmission or new auto-review rejection.",
            "No organization/server-side updater settings inspected. No blanket lack of governance or25 reachable forum vulnerabilities established."
          ],
          "rawAudit": "/workspace/work/audit/repo/work/audit-stage10-part1/audit-all.json",
          "rawAuditSha256": "47c4f1f881c661479764bc256bffbeda26e12dad2050f274d0e4456b6eba5fe1",
          "lockSha256": "1a8108bb9eaa6f46b3339fedb9bef8d598e5199e8a7a7d833a2a9445959cfef3",
          "priorOwnConditionAssessment": "/workspace/work/audit-stage0/stage10-part4-advisory-progress.json",
          "report": "/workspace/work/misha-verification/part8.md"
        }
      ]
    },
    {
      "auditor": "Мишаня",
      "id": "M-L01",
      "mapsTo": "M-L01",
      "crossReviewStatus": "HISTORICAL_STATEMENT_REUSE_WITH_CURRENT_BASELINE_VERIFICATION",
      "decision": "Original baseline21386887, independence disclaimed. Prior d72b27c verification: NOT_CONFIRMED_ON_CURRENT_BASELINE; BLANKET_DOCUMENTATION_CLAIM_NOT_ESTABLISHED. Statement is not automatically a new defect.",
      "evidence": [
        {
          "fact": "Current PROJECT_STATE23-61 explicitly separates current drafts removal from retained historical Editor snapshots; block added after source baseline. README links separate PROJECT_HISTORY.",
          "bounds": [
            "Targeted passages only, not whole-documentation clean bill.",
            "Original report gives no exact counterexamples; retained dated history not automatically current requirements."
          ],
          "report": "/workspace/work/misha-verification/part6.md"
        }
      ]
    },
    {
      "auditor": "Мишаня",
      "id": "M-L02",
      "mapsTo": "DOC-01",
      "crossReviewStatus": "HISTORICAL_STATEMENT_REUSE_WITH_CURRENT_BASELINE_VERIFICATION",
      "decision": "Original baseline21386887, independence disclaimed. Prior d72b27c verification: PARTIALLY_CONFIRMED; HISTORICAL_UI_WORDING_AMBIGUOUS_ACCEPTANCE_REFERENCES_UNVERIFIED. Statement is not automatically a new defect.",
      "evidence": [
        {
          "fact": "UI_UX_PASS568 calls attachments/WYSIWYG future relative to old editor slice;645-646 describes future signup and Under development. Current editor and credential signup already implemented.",
          "bounds": [
            "Accumulated older slice/history context; misleading if read as current product status.",
            "Exact obsolete acceptance/archive refs not identified or verified; old owner acceptance not declared invalid.",
            "Drafts genuinely future after current removal."
          ],
          "report": "/workspace/work/misha-verification/part6.md"
        }
      ]
    },
    {
      "auditor": "Мишаня",
      "id": "M-L03",
      "mapsTo": "M-L03",
      "crossReviewStatus": "HISTORICAL_STATEMENT_REUSE_WITH_CURRENT_BASELINE_VERIFICATION",
      "decision": "Original baseline21386887, independence disclaimed. Prior d72b27c verification: PARTIALLY_CONFIRMED; SOURCE_SIZE_OBSERVATION_NOT_ESTABLISHED_DEFECT. Statement is not automatically a new defect.",
      "evidence": [
        {
          "fact": "Measured files large, per graph fileSizes. Excessiveness criterion and concrete defect not established.",
          "sizes": [
            {
              "file": "db/forum-repository.ts",
              "lines": 3915,
              "bytes": 162943
            },
            {
              "file": "app/forum/views.tsx",
              "lines": 3079,
              "bytes": 129096
            },
            {
              "file": "app/styles.css",
              "lines": 9643,
              "bytes": 209186
            }
          ],
          "bounds": [
            "Source bytes, not compressed production bundle size.",
            "No full manual read of these three files in this part. No architectural changes or automatic split justified from line count alone."
          ],
          "evidence": "/workspace/work/audit/repo/work/misha-verification-part3/graph.json"
        }
      ]
    },
    {
      "auditor": "Мишаня",
      "id": "M-L04",
      "mapsTo": "M-L04",
      "crossReviewStatus": "HISTORICAL_STATEMENT_REUSE_WITH_CURRENT_BASELINE_VERIFICATION",
      "decision": "Original baseline21386887, independence disclaimed. Prior d72b27c verification: CONFIRMED; TYPE_DEPENDENCY_CYCLE_ONLY_RUNTIME_IMPACT_NOT_ESTABLISHED. Statement is not automatically a new defect.",
      "evidence": [
        {
          "fact": "profile-view.tsx5 imports type ProfileActionData from routes/profile.tsx; route imports ProfileView as value. Only nontrivial SCC in scoped static graph.",
          "method": "TypeScript AST SCC analysis plus transpileModule experiment with verbatimModuleSyntax; type import absent from emittedJS, component import retained.",
          "bounds": [
            "160 files; app/db/workers relative static imports/re-exports only; tests/declarations/ui-preview excluded. Dynamic imports, aliases, package imports and implicit uses not analyzed.",
            "Removing explicit type-only edges yields no cycles in this graph; not universal absence of runtime cycles.",
            "Compiler experiment not full typecheck/build or runtime execution. No initialization failure established."
          ],
          "graph": "/workspace/work/audit/repo/work/misha-verification-part3/graph.json",
          "compilerEvidence": "/workspace/work/audit/repo/work/misha-verification-part3/type-erasure.json"
        }
      ]
    },
    {
      "auditor": "Мишаня",
      "id": "M-L05",
      "mapsTo": "M-L05",
      "crossReviewStatus": "HISTORICAL_STATEMENT_REUSE_WITH_CURRENT_BASELINE_VERIFICATION",
      "decision": "Original baseline21386887, independence disclaimed. Prior d72b27c verification: PARTIALLY_CONFIRMED; UNCONSUMED_EXPORT_NOT_DEAD_FUNCTION. Statement is not automatically a new defect.",
      "evidence": [
        {
          "fact": "normalizeForumTags exported at forum-service364; tracked word search finds only definition and internal call379, no external consumer.",
          "bounds": [
            "Function needed internally; exported surface unused, not dead function.",
            "No exhaustive export inventory or bundle-size benefit established; no removal proposed."
          ],
          "report": "/workspace/work/misha-verification/part6.md"
        }
      ]
    },
    {
      "auditor": "Мишаня",
      "id": "M-L06",
      "mapsTo": "M-L06",
      "crossReviewStatus": "HISTORICAL_STATEMENT_REUSE_WITH_CURRENT_BASELINE_VERIFICATION",
      "decision": "Original baseline21386887, independence disclaimed. Prior d72b27c verification: PARTIALLY_CONFIRMED; SPECIFIC_APP_ONLY_RULES_CONFIRMED_DEFECT_NOT_ESTABLISHED. Statement is not automatically a new defect.",
      "evidence": [
        {
          "fact": "Tag normalized name max64 and slash exclusion enforced by normalizeForumTags but absent from forum_tags declared CHECK/migration0021. Concrete instances of app-only rules.",
          "controls": "Posts have same-topic parent FK and parent-not-self CHECK. Empty-body CHECK removal is explicitly intentional in0039 for attachment-only publication.",
          "bounds": [
            "Original report does not identify exact constraints; cannot claim exhaustive match.",
            "No demonstrated invalid write through user flow, no requirement all service rules must be DB-enforced.",
            "Declared metadata and SQL read, no database execution."
          ],
          "evidence": "/workspace/work/audit/repo/work/misha-verification-part5/evidence.json",
          "report": "/workspace/work/misha-verification/part5.md"
        }
      ]
    },
    {
      "auditor": "Мишаня",
      "id": "M-L07",
      "mapsTo": "M-L07",
      "crossReviewStatus": "HISTORICAL_STATEMENT_REUSE_WITH_CURRENT_BASELINE_VERIFICATION",
      "decision": "Original baseline21386887, independence disclaimed. Prior d72b27c verification: CONFIRMED; FK_ABSENCE_CONFIRMED_LIFECYCLE_DEFECT_NOT_ESTABLISHED. Statement is not automatically a new defect.",
      "evidence": [
        {
          "fact": "Receipt schema and migration0039 have owner FK only, no topic/post FK. No later migration reference adds such FKs.",
          "sourceFlow": "Writes receipt with fingerprint/IDs; replay validates fingerprint; topic/reply replay returns storedIDs before normal content checks.",
          "bounds": [
            "Deletion+replay not reproduced; no proven broken operation, orphan acceptance in liveDB or loss.",
            "Adding cascade FK without lifecycle/idempotency contract not justified.",
            "No actual PostgreSQL or external schema inspected."
          ],
          "evidence": "/workspace/work/audit/repo/work/misha-verification-part5/evidence.json",
          "report": "/workspace/work/misha-verification/part5.md"
        }
      ]
    },
    {
      "auditor": "Мишаня",
      "id": "M-L08",
      "mapsTo": "M-L08",
      "crossReviewStatus": "HISTORICAL_STATEMENT_REUSE_WITH_CURRENT_BASELINE_VERIFICATION",
      "decision": "Original baseline21386887, independence disclaimed. Prior d72b27c verification: PARTIALLY_CONFIRMED; DEPRECATED_QUEUE_USAGE_CONFIRMED_COUNT_THREE_NOT_REPRODUCED. Statement is not automatically a new defect.",
      "evidence": [
        {
          "fact": "Four direct Promise.all groups ofthree client.query on one client in two test files, four different test cases. Each is SELECT count assertions after tested operation.",
          "groups": [
            {
              "file": "tests/database/content-post-body-task-planning.test.ts",
              "line": 271,
              "queryCalls": 3,
              "testCall": "\"rechecks a serialized body translation before admission and rolls back planning metadata\"",
              "queries": [
                "\"select count(*)::int as count from content_translation_request_budget_counters\"",
                "\"select count(*)::int as count from translation_task_generation_heads where translation_kind = 'content-post-body'\"",
                "\"select count(*)::int as count from translation_tasks where translation_kind = 'content-post-body'\""
              ]
            },
            {
              "file": "tests/database/content-post-body-task-planning.test.ts",
              "line": 693,
              "queryCalls": 3,
              "testCall": "\"rolls back body budget counters when task metadata insertion fails\"",
              "queries": [
                "\"select count(*)::int as count from content_translation_request_budget_counters\"",
                "\"select count(*)::int as count from translation_tasks where translation_kind = 'content-post-body'\"",
                "\"select count(*)::int as count from translation_task_generation_heads where translation_kind = 'content-post-body'\""
              ]
            },
            {
              "file": "tests/database/content-topic-title-task-planning.test.ts",
              "line": 205,
              "queryCalls": 3,
              "testCall": "\"rechecks a serialized translation before admission and rolls back planning metadata\"",
              "queries": [
                "\"select count(*)::int as count from content_translation_request_budget_counters\"",
                "\"select count(*)::int as count from translation_task_generation_heads where translation_kind = 'content-topic-title'\"",
                "\"select count(*)::int as count from translation_tasks where translation_kind = 'content-topic-title'\""
              ]
            },
            {
              "file": "tests/database/content-topic-title-task-planning.test.ts",
              "line": 597,
              "queryCalls": 3,
              "testCall": "\"rolls back both budget counters when task metadata insertion fails\"",
              "queries": [
                "\"select count(*)::int as count from content_translation_request_budget_counters\"",
                "\"select count(*)::int as count from translation_tasks where translation_kind = 'content-topic-title'\"",
                "\"select count(*)::int as count from translation_task_generation_heads where translation_kind = 'content-topic-title'\""
              ]
            }
          ],
          "baseline": "All four blocks also present in21386887; numerical discrepancy is not current baseline change.",
          "driver": "Installed pg8.23.0 has non-pipeline query queue and deprecation notice for concurrent queued client.query usage, warning of removal inpg9. Driver source inspected, no protocol/database experiment.",
          "bounds": [
            "Original exactthree not identified, not verified. Narrow AST query is not exhaustive for aliases/callbacks/indirect calls.",
            "No claim current pinned driver misexecutes SELECTs or concurrency transaction tests universally invalid.",
            "Database tests not rerun; no new Vitest executions."
          ],
          "evidence": "/workspace/work/audit/repo/work/misha-verification-part5/evidence.json",
          "report": "/workspace/work/misha-verification/part5.md"
        }
      ]
    },
    {
      "auditor": "Мишаня",
      "id": "M-L09",
      "mapsTo": "M-L09",
      "crossReviewStatus": "HISTORICAL_STATEMENT_REUSE_WITH_CURRENT_BASELINE_VERIFICATION",
      "decision": "Original baseline21386887, independence disclaimed. Prior d72b27c verification: PARTIALLY_CONFIRMED; MANUAL_CLEANUP_CONFIRMED_RUNTIME_DEPENDENCE_OVERSTATED. Statement is not automatically a new defect.",
      "evidence": [
        {
          "fact": "Reconciliation script limited to localhost/127.0.0.1 disposable *_test DB; locked reverify/delete. Only production-source caller found is local script.",
          "controls": "Adapter integrity failure becomes miss; loader compiles fallback in memory; successful conditional machine publication atomically writes namespace bundle.",
          "bounds": [
            "Does not establish all translations require manual cleanup.",
            "Request path remains read-only; local-only cleanup explicitly accepted in current Stage5. No external automation assessed.",
            "Five loader tests use fake sources/stores; no invalid realDB row/database test."
          ],
          "testReport": "/workspace/work/audit/repo/work/misha-verification-part6/results.json",
          "report": "/workspace/work/misha-verification/part6.md"
        }
      ]
    },
    {
      "auditor": "Мишаня",
      "id": "M-L10",
      "mapsTo": "M-L10",
      "crossReviewStatus": "HISTORICAL_STATEMENT_REUSE_WITH_CURRENT_BASELINE_VERIFICATION",
      "decision": "Original baseline21386887, independence disclaimed. Prior d72b27c verification: CONFIRMED; COVERAGE_MEASUREMENT_ABSENCE_NOT_ESTABLISHED_FUNCTIONAL_DEFECT. Statement is not automatically a new defect.",
      "evidence": [
        {
          "fact": "Neither tracked Vitest configuration nor package scripts/primary workflow enables coverage reporting or threshold; no separate tracked coverage configuration found.",
          "bounds": [
            "No claim actual coverage low or existing tests inadequate from absence alone.",
            "External env/config not inspected; no arbitrary threshold required."
          ],
          "evidence": "/workspace/work/audit/repo/work/misha-verification-part4/ci-evidence.json",
          "report": "/workspace/work/misha-verification/part4.md"
        }
      ]
    },
    {
      "auditor": "Мишаня",
      "id": "M-L11",
      "mapsTo": "M-L11",
      "crossReviewStatus": "HISTORICAL_STATEMENT_REUSE_WITH_CURRENT_BASELINE_VERIFICATION",
      "decision": "Original baseline21386887, independence disclaimed. Prior d72b27c verification: CONFIRMED; TRACKED_LOADER_TEST_GAP_NO_AUTH_BYPASS_ESTABLISHED. Statement is not automatically a new defect.",
      "evidence": [
        {
          "fact": "Tracked test/spec reference search across137 files finds route registration and attachment-upload tests, not direct post-edit loader execution.",
          "bounds": [
            "Five own direct loader tests already executed in part2 remain untracked audit scratch, not shipped suite. No rerun/recount here.",
            "No claim missing auth guard; source checks session, existence, authoritative owner and editOwn.",
            "Reference search not full manual read of137 test files."
          ],
          "evidence": "/workspace/work/audit/repo/work/misha-verification-part4/ci-evidence.json",
          "ownPriorTestReport": "/workspace/work/audit/repo/work/misha-verification-part2/results.json",
          "report": "/workspace/work/misha-verification/part4.md"
        }
      ]
    },
    {
      "auditor": "Мишаня",
      "id": "M-L12",
      "mapsTo": "M-L12",
      "crossReviewStatus": "HISTORICAL_STATEMENT_REUSE_WITH_CURRENT_BASELINE_VERIFICATION",
      "decision": "Original baseline21386887, independence disclaimed. Prior d72b27c verification: PARTIALLY_CONFIRMED; ESLINT_BOUNDARY_GAP_CONFIRMED_FULL_TOOLCHAIN_NOT_TESTED. Statement is not automatically a new defect.",
      "evidence": [
        {
          "fact": "Merged browser/node/worker globals; effective ESLint config permits document/process/self in virtual app,db,workers TS paths with0 errors/warnings. Restricted globals/import rules absent.",
          "bounds": [
            "Partial scope: TypeScript configs read, but no dedicated TypeScript rejection/acceptance experiment or bundler test.",
            "No conclusion all framework/server-only protections absent; no client secret/DB bundle leak claimed.",
            "Probe text linted only; source not executed."
          ],
          "evidence": "/workspace/work/audit/repo/work/misha-verification-part4/lint-boundaries.json",
          "report": "/workspace/work/misha-verification/part4.md"
        }
      ]
    },
    {
      "auditor": "Мишаня",
      "id": "M-L13",
      "mapsTo": "M-L13",
      "crossReviewStatus": "HISTORICAL_STATEMENT_REUSE_WITH_CURRENT_BASELINE_VERIFICATION",
      "decision": "Original baseline21386887, independence disclaimed. Prior d72b27c verification: CONFIRMED; EXPLICIT_TIMEOUT_ABSENCE_NO_OBSERVED_HANG. Statement is not automatically a new defect.",
      "evidence": [
        {
          "fact": "Main checks/database jobs have no job timeout-minutes or step timeouts.",
          "bounds": [
            "Platform default limits still apply, not infinite execution.",
            "Actual runs, hangs, costs and suitable timeout duration not measured."
          ],
          "evidence": "/workspace/work/audit/repo/work/misha-verification-part4/ci-evidence.json",
          "report": "/workspace/work/misha-verification/part4.md"
        }
      ]
    },
    {
      "auditor": "Мишаня",
      "id": "M-L14",
      "mapsTo": "M-L14",
      "crossReviewStatus": "HISTORICAL_STATEMENT_REUSE_WITH_CURRENT_BASELINE_VERIFICATION",
      "decision": "Original baseline21386887, independence disclaimed. Prior d72b27c verification: CONFIRMED; HEADING_FACTS_CONFIRMED_NOT_AUTOMATIC_WCAG_VIOLATION. Statement is not automatically a new defect.",
      "evidence": [
        {
          "fact": "Home has0h1 in all4browser loads; renderer explicitly supports h1 from Markdown.",
          "bounds": [
            "Multiple h1 topic document not built in this part; static capability checked.",
            "No universal WCAG failure inferred from h1 count alone."
          ],
          "evidence": "/workspace/work/audit/repo/work/misha-verification-part7/browser-evidence.json",
          "report": "/workspace/work/misha-verification/part7.md"
        }
      ]
    },
    {
      "auditor": "Мишаня",
      "id": "M-L15",
      "mapsTo": "M-L15",
      "crossReviewStatus": "HISTORICAL_STATEMENT_REUSE_WITH_CURRENT_BASELINE_VERIFICATION",
      "decision": "Original baseline21386887, independence disclaimed. Prior d72b27c verification: CONFIRMED; UNIGNORED_BUILD_OUTPUT_HYGIENE. Statement is not automatically a new defect.",
      "evidence": [
        {
          "fact": "Fresh UI Preview build succeeds and creates dist/ui-preview per config; git check-ignore says not ignored, git status ??dist/.",
          "bounds": [
            "Dist existed untracked before this part and was rebuilt, not deleted. Not tracked artifacts or secret leak."
          ],
          "evidence": "/workspace/work/audit/repo/work/misha-verification-part7/repository-evidence.json",
          "report": "/workspace/work/misha-verification/part7.md"
        }
      ]
    },
    {
      "auditor": "Мишаня",
      "id": "M-L16",
      "mapsTo": "M-L16",
      "crossReviewStatus": "HISTORICAL_STATEMENT_REUSE_WITH_CURRENT_BASELINE_VERIFICATION",
      "decision": "Original baseline21386887, independence disclaimed. Prior d72b27c verification: CONFIRMED; WEB_ASSET_ABSENCE_NOT_ALL_MANDATORY_FEATURES. Statement is not automatically a new defect.",
      "evidence": [
        {
          "fact": "Tracked inventory and route/root review show no favicon,robots.txt,sitemap,web manifest.",
          "bounds": [
            "No external hosting/runtime content checked.",
            "Preview robots meta noindex exists; not production robots.txt. PWA manifest and sitemap are not universal requirements."
          ],
          "evidence": "/workspace/work/audit/repo/work/misha-verification-part7/repository-evidence.json",
          "report": "/workspace/work/misha-verification/part7.md"
        }
      ]
    },
    {
      "auditor": "Мишаня",
      "id": "M-L17",
      "mapsTo": "M-L17",
      "crossReviewStatus": "HISTORICAL_STATEMENT_REUSE_WITH_CURRENT_BASELINE_VERIFICATION",
      "decision": "Original baseline21386887, independence disclaimed. Prior d72b27c verification: CONFIRMED; SOURCE_METADATA_ABSENCE_NO_SEARCH_IMPACT_MEASURED. Statement is not automatically a new defect.",
      "evidence": [
        {
          "fact": "Category/section/topic lack meta exports; root has Meta outlet but no default title/description/canonical; selected route/locale files lack dynamic metadata.",
          "bounds": [
            "Static source review; actual selected route SSR not run in this part, no indexing/traffic impact measured."
          ],
          "evidence": "/workspace/work/audit/repo/work/misha-verification-part7/repository-evidence.json",
          "report": "/workspace/work/misha-verification/part7.md"
        }
      ]
    },
    {
      "auditor": "Мишаня",
      "id": "M-L18",
      "mapsTo": "M-L18",
      "crossReviewStatus": "HISTORICAL_STATEMENT_REUSE_WITH_CURRENT_BASELINE_VERIFICATION",
      "decision": "Original baseline21386887, independence disclaimed. Prior d72b27c verification: PARTIALLY_CONFIRMED; CURRENT_ASSET_SIZES_AND_NO_BLOCKING_GATE_CONFIRMED_USER_PERFORMANCE_NOT_MEASURED. Statement is not automatically a new defect.",
      "evidence": [
        {
          "fact": "Fresh production build plus previous part7 preview build. Home entry/root/locale/home static closure888944 bytes239706gzip; sharedviews272980/72539; previewJS941893/277241. No blocking bundle/performance gate in checked config/CI.",
          "bounds": [
            "Static closure excludes dynamic imports,manifestJS,HTML/hydration,images,headers/runtime requests. Not actual Network transfer.",
            "Independent per-file gzip9,not deployed encoding.",
            "Old Misha SSR/HE/hydration/initial measurements not reproduced or refuted on different baseline/method.",
            "Vite chunk warning exists but not blockinggate; large relative to no agreed budget not automatically functional defect. No LCP/INP/target-network measurement."
          ],
          "metrics": "/workspace/work/audit/repo/work/misha-verification-part8/payload.json",
          "report": "/workspace/work/misha-verification/part8.md"
        }
      ]
    }
  ],
  "newExecutedChecks": {
    "edit409": {
      "passed": true,
      "evidence": "edit-conflict-evidence.json",
      "scope": "Actual local route/loader/view/action, controlled repo error; no browser/DB"
    },
    "literal": {
      "passed": true,
      "evidence": "literal-evidence.json",
      "scope": "Actual escape helper/parser, tiny ordinary strings"
    }
  },
  "openVerification": "Runtime applicability/Stage classification, broader stale-state variants, UI bundle policy, ZIP metadata contract, upload ID semantics, source-only throw/cross-tab scenarios; no whole-repository restart.",
  "noImplementationChanges": true,
  "servicesExcluded": true,
  "phase2": {
    "status": "THREE_SELECTED_DISPUTES_REVIEWED_TWO_TECHNICAL_GAPS_ONE_SPEC_QUESTION",
    "testsPassed": 4,
    "testsFailed": 0,
    "realServicesUsed": false,
    "stressProbes": false,
    "officialZipReference": "https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT",
    "formatSections": [
      "4.3.9.1",
      "4.4.8",
      "4.4.9"
    ],
    "recordedAtUtc": "2026-10-24T18:27:34.237843+00:00"
  },
  "additionalCrossReviewInput": {
    "author": "Лира",
    "file": ".github/agents/chatgpt-6.md",
    "sha": "19792f3a450bbe52b219f17e962daf7bb8793853",
    "section": "T3",
    "changesHandled": [
      "separate edit copy cause",
      "scope/external limitations",
      "candidate vs defect counts"
    ]
  }
}
```
</details>

---

## Общая сверка — завершающие предметные проверки (2026-10-24)

Baseline `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`, implementation не изменён. Окончательные прогоны этой части: **13 passed, 0 failed** — 10 новых случаев (read/order7, UI2, discovery1) и 3 повторных/расширенных (Worker2 и edit409 copy1). По сверке 28 различных новых случаев; повторения не добавлены к этому числу. Native DB/live services/реальные browser tabs/stress tests не выполнялись.

### Availability и ошибки чтения

Actual React Router static document query с injected capabilities:

| Сценарий | Наблюдаемый Router status |
|---|---:|
| Home primary readHomepage → ForumStorageUnavailableError | 500 |
| Home optional presence → тот же тип ошибки | 200, onlinePresence=null |
| post-edit readPostLocation → ForumStorageUnavailableError | 500 |
| post-edit permission check → AuthorizationUnavailableError | 500 |
| notifications read → ForumStorageUnavailableError | 503 |

Эти 5 тестов подтверждают конкретные различия классификации. **Поправка к прежней цепочке:** post-edit.ts не экспортирует ErrorBoundary, locale/root также не назначают ForumRouteError. Его500 подтверждён Router query, но нельзя утверждать, что он отрисовывает именно ForumRouteError. Home имеет собственную ForumRouteError. Deployed body/status и всю платформенную response pipeline не проверяли.

Actual Worker fetch с fake factories повторно проверен в 2 случаях: нормальная session lookup допускает handler200; getSession rejection предотвращает Router handler и возвращение Response. Это conditional pre-router availability failure path; не заявляется конкретный Cloudflare HTTP500/503/body или реальный service incident. Actual auth runtime делает connect/getSession без локального availability response boundary; реальный OAuth не запускался.

### Notification body guard — факт порядка, не доказанный security defect

В actual action гость с малым синтетическим form body сначала проходит request.formData. Корректная форма затем получает401, ошибка parsing —400; writer ни разу не вызван. 2 теста passed. Это подтверждает порядок обработки, но не auth/Origin bypass, resource exhaustion или согласованный недостающий domain invariant. NOTIFY-BODY-01 переводится из списка безусловных defects в наблюдения; необходимость раннего cheap rejection не выдаётся за установленный пользовательский сбой.

### Help discovery — конкретное несоответствие внутреннего представления

Actual Drizzle readUnanswered SQL не исключает service section, выбирает его name/id и возвращает их в generic summary. Actual readSection(HELP_SOLUTIONS_SERVICE_SECTION_ID) возвращает undefined без запроса — контроль. Fake Pg rows позволяют проверить mapper, но не заменяют исполнение WHERE в настоящей БД. Source WHERE=unsolved/HAVING one post не содержит скрытого section exclusion.

Actual Unanswered route/view показывает Internal section в generic location. docs/UI_UX_PASS.md314–325 требует скрыть внутренний service section из generic discovery. Подтверждён именно metadata presentation gap; прямой generic section route не открыт, privacy/auth bypass не установлен.

### Secondary UGC language metadata

В actual unanswered SQL source_locale не выбирается; summary interface хранит title:string. Route projection отбрасывает даже дополнительный sourceLocale из reader fixture. Actual UnansweredRoute/View в jsdom для Hebrew title при English document создаёт strong dir=auto без lang, наследуется lang=en. DOM узел проверен, dir=auto не объявляется отсутствующим или небезопасным. docs/translation/LOCALES.md506–507 требует content-level lang/dir для mixed-language UGC; известная в revision source locale теряется до представления. Сохранить узкий дефект языковой метки этого secondary title path, без blanket вывода про все UGC, screen-reader behaviour или bidi visual failure.

### Locale returnTo, size и tags

Actual LanguageSwitcher при en→he сохраняет query целиком, включая returnTo=/en/topics/topic?editPost=p1#post-p1. Actual credentialReturnPath('he',...) намеренно отвергает путь другой локали и возвращает /he; same-locale контроль сохраняет весь исходный адрес. Тест passed. Потеря effective destination подтверждена, но необходимость remap вложенного пути требует product decision; нельзя отключать sanitizer или считать, что switcher удалил query.

Отсутствие domain max для title/body и count max для unique tags сохранено как факт источников. normalizeForumTags ограничивает каждый tag64 и dedup keys, не число. Из отсутствия max не следует согласованный threshold или воспроизведённый current failure; CONTENT-SIZE-01/M-M03 не самостоятельный подтверждённый дефект. TAG-CARDINALITY-01 остаётся requirement/policy question. Static O(N²) unmatched-spoiler mechanism — отдельный подтверждённый алгоритмический пункт; ресурсные эксперименты не возобновлялись.

### Актуальность внешних отчётов и независимость причин

Файлы Миры и Мишани не изменились относительно исходного snapshot19f6a3b. Файл Лиры изменился: прочитан новый T3 верхний раздел целиком до его конца; новый blob19792f3a450bbe52b219f17e962daf7bb8793853. Учтён как дополнительная cross-review input, не новый независимый аудит.

Согласен с аргументом T3 о разных причинах EDITOR-PUB-01 и EDITOR-PUB-02: loader/rebase409 и ошибочный forumWriteError_conflict copy исправляются независимо. Повторный actual Topic route/action409 сценарий дополнен assertion точного текста «That solution cannot be selected for this topic.» — passed. **Прежнее объединение двух причин в XR-EDIT-409 как одной записи исправлено:** теперь отдельный XR-EDIT-CONFLICT-COPY; общий сценарий теста не означает одну причину.

AUTH-LINK-01 в T3 назван internal OAuth-related config finding. В моём реестре он остаётся исключённым по пользовательскому ограничению OAuth; доказательства OAuth не проверялись, дефект не опровергается и не переносится в объём молча. ARCH-02, ATTACH-04 и NOTIFY-BODY-01 имеют более узкие статусы части4/5, чем C в T3. DISCOVERY/UGC получили дополнительные точные source/DOM проверки, которых не было в прежнем Q. Подсчёт кандидатов T3 не является коллективным verdict.

Доказательства: phase5-{read,ui,discovery,worker,conflict-copy} configs/results/evidence и соответствующие test files в work/audit-cross-review. Три Worker tests не выбраны фильтром и не засчитаны. Новых failed прогонов в части5 нет. Итоговая матрица публикуется отдельно ниже; чужие личные файлы не исправлены.

---

## Общая сверка — применимость lifecycle/ACL/upload и HTTP405 (2026-10-24)

Сверка продолжается на неизменном code baseline `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`. Эта запись уточняет и, где указано, сужает прежний индивидуальный список. Старые статусы OPEN_UNFIXED/P2 для ARCH-02 и ATTACH-04 нельзя использовать без оговорок ниже.

Окончательные локальные прогоны: **8 passed, 0 failed** — 5 новых тестов (ACL1, registry2, Router4052), плюс 3 повторно исполненных прежних attachment-теста. Четвёртый attachment-тест picker/drop/paste не выбран фильтром и не засчитан. По общей сверке теперь 18 различных новых тестовых случаев, не число дефектов; три повторения не добавлены к 18.

### DB-03 — подтверждённое несоответствие внутреннего ACL-контракта, не утверждение о production

`.github/scripts/runtime-privileges.mjs` не включает forum_topic_read_states в web.relations. Реализованные `readTopicReadState`, `readUnreadForUser`, `advanceTopicReadState` используют SELECT и INSERT/UPDATE для этой таблицы. Actual assertRuntimeCapabilityPrivilegeContract принимает synthetic exact snapshot без прав на неё, но отвергает тот же snapshot с добавленными SELECT/INSERT/UPDATE. Новый тест passed. Документ docs/database/HYPERDRIVE.md115–127 связывает этот общий контракт с disposable probes и derivation GRANT; это уже проверяемый repository contract, а не только будущая настройка.

ROADMAP.md318 относит создание реальных roles/grants к Stage6. Это ограничивает activation/production acceptance и не устраняет внутреннее несоответствие. Сохранить DB-03 как дефект checked-in contract. Не утверждать текущий production outage или состояние реальных grants. Прежнее native доказательство read-marker failures и восстановления дополнительными grants найдено в двух идентичных локальных evidence-файлах (SHA256 a535363bc616011087e1833f353f5743e682e25a718cdbaed04695bc37da1206); оно сохранено с прежней атрибуцией, в этой части native PG не запускалась.

### ARCH-02 — локальный факт подтверждён; runtime-дефект не установлен

Actual createHyperdriveRegistryLoader с fake Pg client: успешное чтение мемоизируется, endCalls=0; unexpected query failure также оставляет endCalls=0. Drizzle оборачивает query error, оригинальный TypeError находится в cause. Эти два теста passed. Первоначальный тест ошибочно ожидал identity исходного exception; сохранён initial-results, проверка harness исправлена на cause. Это не новый дефект обработки ошибки.

Прежние локальные idle Pg connections и отсутствие finally остаются фактом локальной фабрики. Однако они не доказывают leak/exhaustion в Worker/Hyperdrive runtime: его teardown/lifecycle не был проверен и исключён владельцем. В проверенных внутренних материалах не установлено универсальное обязательство явно завершать именно этот клиент, достаточное для прежнего безусловного current-Stage P2.

**Решение сверки:** убрать ARCH-02 из безусловно подтверждённых дефектов текущего Stage; хранить как локальное lifecycle-наблюдение с непроверенной runtime-применимостью. Это не признание реализации исправленной или заведомо корректной. Реальный Hyperdrive, платформенные настройки и сервисные проверки не выполнялись и не назначаются обязательным продолжением аудита.

### ATTACH-04 — факт UI подтверждён; требование per-file cancellation неоднозначно

Повторены actual MarkdownEditor тесты с controlled XHR: pending файл не имеет отдельной Remove и блокирует Publish; обычное завершение снимает блокировку, сохраняет текст и точные selected IDs; после ошибки Remove доступна, сохраняет текст и уже загруженный второй файл. Все 3 passed.

Whole-operation Cancel aborts pending XHR, очищает текст и весь набор вложений намеренно. Она работает; это не доказательство случайной потери текста или сломанной Cancel. docs/EDITOR.md182 разрешает удалить/заменить вложение перед публикацией, §4.1 явно требует Retry/Remove после неуспеха и блокировку незавершённых загрузок, но не задаёт однозначно individual abort во время успешного ongoing upload. UI message «Finish or remove attachment uploads before publishing» шире доступных действий в pending row.

**Решение сверки:** сохранить отсутствие per-file abort и несогласованность подсказки как узкое UX/requirement расхождение; не считать прежний ATTACH-04 безусловным P2 по всему Cancel flow. Обязательность удаления именно до завершения upload требует решения владельца. В этой части никаких исправлений/изменений требований не внесено.

### XR-HTTP-ALLOW / Мира ATTACH-HTTP-405-01 — omission подтверждён через Router dispatch

Не только прямой вызов export: actual React Router createStaticHandler.queryRoute dispatch для /api/attachments вызывает loader при HEAD и action при PATCH. Обе ветви возвращают explicit405, Allow отсутствует. 2 теста passed. Требование Allow для405 установлено [RFC9110 §15.5.6](https://www.rfc-editor.org/rfc/rfc9110.html#section-15.5.6).

Вывод ограничен upload/list resource app/routes/attachment-upload.ts128,144. В download route такого explicit405 нет, поэтому прежнее множественное «attachment routes» сужено. Это нарушение HTTP response contract, не установленный auth bypass/потеря файла. Deployed HTTP server/proxy и полный Worker response pipeline не проверялись. HEAD дополнительно отвергается GET-only guard; отдельную совместимость HEAD не включать автоматически вторым дефектом без самостоятельного verdict.

### Доказательства и следующий участок

`work/audit-cross-review/phase4-contract.{test,config}.ts`, phase4-contract-{results,evidence}.json; phase4-http.test.ts/config/results/evidence; phase4-attachments.config.ts/results и исходный work/audit-stage7-part3/client.test.tsx. Матрица обновлена. Implementation, зависимости и схема не менялись; личные файлы других авторов не редактировались.

Остаётся закрыть остальные source-only/requirement строки: secondary UGC language metadata, классификация read/auth startup failures, Help discovery, locale return destination и границы size/tag/body guard утверждений. Это сверка существующих утверждений, не новый полный проход репозитория. Общего окончательного счёта ещё нет; завершение сверки или согласие всей команды не заявляется.

---

## Общая сверка — устаревшие действия, буфер и идентичность (2026-10-24)

Сверка продолжается. Baseline кода: `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`. В этой части **7 локальных тестов passed, 0 failed в окончательных прогонах**: 2 buffer, 2 identity, 3 stale actions. Вместе с частями 1–2 — 13 тестов, не 13 дефектов. Реализация не менялась; реальные сервисы, production, native DB concurrency, браузерные вкладки/cookies не проверялись.

### XR-STALE-SOLUTION / Мира HELP-MOD-01 — выбор нового объекта старым действием подтверждён локально

В `app/forum/views.tsx:2515` формы markSolutionNeedsReview/markSolutionOutdated передают intent и, для outdated, причину, но не expected best-answer identity. `actions.server.ts:382–407` не требует identity; `ForumService.setHelpSolutionModeration` также не принимает её. В actual action → service → repository при текущем snapshot answer-B запрос старой формы, просмотренной при answer-A, создаёт UPDATE для answer-B и supersedes его pending signals. Причина, введённая для A, передаётся новому B без конфликта.

Два теста используют actual action, service, repository и компиляцию Drizzle SQL; транзакция подставляет подготовленный текущий snapshot. Это подтверждает выбор объекта и отсутствие защиты от старой формы, но не выдаётся за native race reproduction или исполнение UPDATE настоящей БД. Оба intent относятся к одной причине, а не к двум новым независимым дефектам.

### HELP-DUP-01 / HELP-01 — подтверждён дополнительный stale-remove вариант

`views.tsx:2463` removeHelpDuplicate отправляет только intent. `actions.server.ts:345–351`, `ForumService.removeHelpDuplicate` и repository не требуют expected relationship identity. При snapshot relationship-B actual chain формирует снятие именно B и принятие его pending appeals, хотя старая форма относилась к A. Третий SQL-capture тест passed. Это расширяет доказательства для варианта remove; прежнее отдельное доказательство stale appeal не подменяется этим тестом. Native concurrency в данной части не проверялась.

### XR-THROWN-ACTION-BUFFER / Лира F02 — условная потеря буфера воспроизведена

Actual TopicRoute + loader + action + штатная ForumRouteError boundary, jsdom: после введения Unsaved private text синтетический unexpected TypeError в permission capability проходит через requireForumPermission/rethrow. TopicView размонтируется, форма и текст исчезают; writer не вызывался. Контроль с AuthorizationUnavailableError возвращает controlled503 и сохраняет тот же текст в mounted editor. Внутренний authorization adapter классифицирует известные infrastructure failures, но неизвестные исключения может rethrow; не заявляется, что обычная недоступность БД даёт этот unexpected path.

`docs/EDITOR.md:271` обещает сохранение текста/вложений при сбое сервера/интернета. Подтверждён именно условный путь unexpected action exception и потеря текста в памяти. Не доказаны все сетевые ошибки, потеря вложений, конкретный production incident или частота возникновения. Обещание memory-only из §5 не отменяет проверку ошибки отправки: тест не выполняет пользовательскую навигацию/reload.

Первый прогон: один тест прошёл, контроль остановился из-за сохранённого Advanced mode между тестами. Исправлена только изоляция harness (localStorage.clear); initial-results сохранён. Окончательный прогон: 2/2 passed. Ошибка harness не записана дефектом приложения.

### XR-CROSS-TAB-IDENTITY / Лира F04 — рассогласование воспроизведено с подменой серверного контекста

Actual HeaderAuthProvider, OnlinePresenceHeartbeat, presence action и topic reply action в jsdom; родительский loader/provider воспроизводит передачу cached identity. Сначала header=A и текст набран при A; затем серверный auth context переключён на B. Heartbeat реально вызывает presence action: recordOnlinePresence(B), HTTP204. На topic это не revalidates родительский loader: header остаётся A, текст сохранён. Отправка actual reply action вызывает writer с authorId=B и текстом, набранным при A. После успешной отправки обычная revalidation обновляет header=B, но writer уже получил текст.

Контроль: если B не имеет forum.reply.create, writer не вызывается (403). Это **рассогласование отображаемой учётной записи и авторства отправляемого текста**, а не обход server authorization. Два теста passed. Реальная смена cookies в двух вкладках, полный locale loader, OAuth и сохранение записи настоящей БД не выполнялись; предпосылка смены server session задана в harness. Поэтому нельзя повышать доказательство до live two-tab reproduction.

### Доказательства и оставшаяся работа

Локальные файлы `work/audit-cross-review/phase3-{buffer,identity,stale}.test.*`, соответствующие config/results/evidence JSON и run logs. Они не загружены как implementation changes; опубликованы условия, наблюдения и ограничения. Матрица 119 исходных утверждений обновлена; финальное общее число уникальных дефектов ещё не объявляется. Чужие личные файлы не изменены; общего согласия авторов не заявляется.

Следующий участок сверки: применимость lifecycle/ACL и отмены upload к текущему Stage; затем оставшиеся source-only/requirement вопросы матрицы. Идентификатор отклонённой загрузки остаётся вопросом требуемой корреляции, не установленным нарушением. К исправлениям и merge не переходить.

---

## Общая сверка — ZIP, идентификаторы и generation policy (2026-10-24)

Общая сверка продолжается. В этой части выполнены **4 локальных теста: 4 passed, 0 failed**. Код проекта не менялся; реальные сервисы/БД, браузер и stress-inputs не использовались.

### XR-ZIP-METADATA / Мира ATTACH-STRUCT-01 — узкий дефект подтверждён

Базовый ZIP создан Python zipfile: один файл a.txt с пятью байтами hello; весь архив113байт. Контрпримеры меняют только header metadata:

- Local compressed size=123, central и фактические данные=5, bit3 выключен. Actual validateZipAttachmentStructure возвращает true, actual storePrivateAttachmentStream с memory bucket возвращает stored.
- В обоих headers выставлен bit3, local CRC/sizes=0; file data заканчивается непосредственно перед central directory, descriptor отсутствует. Тот же validator/finalizer принимает архив.
- Контроли: исходный корректный ZIP принимается; несовпадающие local/central flags отклоняются.

[PKWARE APPNOTE6.3.10](https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT), раздел4.3.9.1, требует descriptor при bit3;4.4.8/4.4.9 определяют size fields. В данном fixture нет central-directory encryption и соответствующего исключения. Проверка не распаковывает архив и не доказывает обход антивируса, выполнение содержимого или сбой пользовательского extractor. Доказана конкретная неполнота structural acceptance. Metadata persistence и публичная публикация этим тестом не проверялись. Это отдельная причина от ATTACH-02/classic65535 ZIP.

### XR-UI-POLICY / Мира I18N-UI-POLICY-01 — локальная несогласованность подтверждена

`DatabaseMachineTranslationSource(..., v2)` отвергает approved machine row policy v1 и помечает key stale. Но `compileNamespaceBundle` + настоящий `verifyPersistedCompiledBundle` принимают bundle с этим текстом без policy identity. Настоящий `TranslationResourceLoader` на hit возвращает v1-текст и не вызывает raw source; на miss policy-aware source отбрасывает его. Контроль выполнен для fr/common/heading без local override.

Требования: docs/translation/STORAGE_AND_VERSIONING.md81–96 и162–164 отделяют содержательное изменение generation policy и требуют current fingerprint/policy checks. Сама смена implementation detail не требует инвалидировать всё. В active locale-boundary raw source дополнительно создаётся без required-policy аргумента. Следовательно, проблема не ограничивается одним названием bundleVersion. Тест доказывает внутреннюю согласованность version/freshness boundary, а не реально выполненное переключение deployed policy или работу внешнего provider. Выбор реализации исправления в этой части не делался.

### XR-SECURITY-ID / Мира ATTACH-SEC-01 — как технический дефект пока не установлен

Server-derived attachment-v1 hash — намеренный идентификатор наблюдаемой подозрительной загрузки и dedup key. Настоящий rejection route: один input UUID и тот же контекст дают тот же ключ, другой UUID даёт другой ключ; asset row не создаётся; имя, owner, draft/context, типы, причина и размер сохраняются. Отдельное поле исходного client UUID отсутствует.

docs/EDITOR.md238 требует пригодные модератору сведения и идентификатор файла, но не определяет, обязан ли это быть именно присланный UUID вместо устойчивого server-derived identity. Существующие тесты явно ожидают замену UUID хешем; это доказывает намерение, но не отменяет продуктового требования. Поэтому факт различия ID подтверждён, а нарушение контракта требует уточнения конкретной нужной корреляции. Не записывать этот пункт в общий подтверждённый список как потерю существующего asset: для отклонённого файла такой row может не быть.

### Воспроизводимость и следующий шаг

Локально сохранены phase2.test.ts, phase2-evidence.json, phase2-results.json и113-byte fixtures в work/audit-cross-review. Артефакты не добавлены в implementation; условия и результаты опубликованы здесь. Два ZIP-варианта, ID-route и policy-hit/miss составляют четыре разных теста.

Матрица обновлена, окончательное общее число дефектов не пересчитано: остаются другие открытые расхождения. Далее — stale solution/duplicate actions и source-only сценарии thrown-action buffer/cross-tab identity, затем runtime/Stage applicability. Чужие личные отчёты не переписаны, согласие других авторов не заявляется.

---

## Общая сверка аудитов — первый проход (2026-10-24)

Владелец разрешил общую сверку и комментарии. Кодовый baseline d72b27ca762dd930f0e7ad614e5b00832a07ec0c; снимок четырёх личных файлов и service-channel — PR head19f6a3b. Это отдельный межаудиторский этап, не переписывание чужих индивидуальных заключений.

### Происхождение и подсчёт

Мира:27 технических +1 SOT; Лира:6 классов +2 документации; Мишаня:30 утверждений на21386887 с отозванной независимостью; Лёва:51 группа с унаследованными и собственными доказательствами, без заявления слепой независимости. Эти числа не складываются. Разные code-file counts также не сравниваются без одинаковых path-set правил (JSON/config/operational границы отличаются).

### Новые выполненные проверки этой сверки

1. **XR-EDIT-409 / Мира EDITOR-PUB-01/02 / Лира F01**: настоящий локальный Topic loader/view/action с заданным repository conflict. После409 loaderCalls1, fence r1, введённый текст сохранён, rebase отсутствует. Явная router.revalidate даёт loaderCalls2 и rebase. Один успешный тест. Первый запуск имел ошибку относительных imports в тестовом файле; это не ошибка приложения.
2. **XR-LITERAL / Мира literal-text**: настоящий escapeVisualMarkdownText и published parser. Обычные строки --- / ~~literal~~ / &copy; становятся thematicBreak / delete / ©. Один успешный тест. Это не таблицы EDITOR-02 и не mention-label EDITOR-10.

Оба результата дополняют индивидуальный отчёт Лёвы: их не было в прежнем реестре. Браузер, реальные БД/сервисы и stress inputs в этих двух проверках не использованы.

### Матрица утверждений Миры и Лиры

| Автор / ID | Соответствие | Статус сверки | Решение / границы |
|---|---|---|---|
| Мира AUTHZ-01 | AUTH-02 | PARTIAL_DUPLICATE | Удалённая роль совпадает с AUTH-02; более широкий missing-user вариант не подтверждён этим воспроизведением. |
| Мира AUTH-LINK-01 | — | OUT_OF_SCOPE | Google linking относится к исключённому OAuth; не включать в общий текущий список. |
| Мира AUTH-SESSION-AVAIL-01 | XR-AUTH-STARTUP | SOURCE_CHAIN_CORROBORATED | getSession/connect rejection перед Router handler подтверждены кодом workers/app.ts и auth runtime; реальный platform HTTP body/status не проверен. |
| Мира AUTH-COOKIE-ORDER-01 | AUTH-01 | DUPLICATE | Та же последовательность clearing/new cookie; дополнительные локальные доказательства уже есть. |
| Мира AUTH-LOCALE-RETURN-01 | XR-AUTH-LOCALE | BEHAVIOR_CONFIRMED_REQUIREMENT_TO_CLARIFY | Switcher сохраняет query, а credentialReturnPath отвергает вложенный путь старой локали и возвращает новый locale root. Это не исчезновение query; необходимость ремаппинга destination требует явного требования. |
| Мира DISCOVERY-01 | XR-HELP-DISCOVERY | PARTIAL_SOURCE_SUPPORT | readUnanswered включает Help topics и отдаёт section metadata; readSection самого service section явно возвращает undefined. Нельзя утверждать открытый generic service-section route. |
| Мира HELP-MOD-01 | XR-STALE-SOLUTION | SOURCE_CHAIN_CORROBORATED_NOT_RACE_TESTED | Topic forms/actions не передают expected best answer identity; изменение текущего решения и применение старой модерации — отдельный от appeal сценарий. |
| Мира HELP-DUP-01 | HELP-01 | PARTIAL_DUPLICATE | Старая апелляция совпадает с HELP-01; более общий stale relationship remove — отдельный вариант, пока без нового воспроизведения. |
| Мира LITERAL-TEXT | XR-LITERAL | REPRODUCED_LOCAL_HELPER | escapeVisualMarkdownText и реальный published parser: --- становится thematicBreak, ~~literal~~ — delete, &copy; — ©. Не дублировать EDITOR-02 (таблицы) или EDITOR-10 (подпись mention). |
| Мира EDITOR-PUB-01 | XR-EDIT-409 | REPRODUCED_ACTUAL_LOCAL_ROUTE | Настоящие Topic route loader/view/action: после controlled409 загрузчик остаётся на одном вызове, fence r1, текст сохранён, rebase отсутствует; явная revalidation даёт второй вызов и кнопку. |
| Мира EDITOR-PUB-02 | XR-EDIT-409 | RELATED_SYMPTOM_GROUPED | Неверный conflict feedback сохранить как подпроблему той же цепочки edit409; не прибавлять автоматически второй независимый класс. |
| Мира CONTENT-SIZE-01 | XR-CONTENT-BOUNDS | POLICY_GAP_NOT_AUTOMATIC_INCIDENT | Отсутствие max title/body подтверждено кодом, но не любой размер автоматически дефект. Связать с конкретным инвариантом/сложностью, не заявлять production timeout. |
| Мира MARKDOWN-SPOILER-01 | XR-SPOILER-COMPLEXITY | STATIC_ALGORITHM_CORROBORATED_NO_STRESS | spoilerAt сканирует хвост и при отсутствии конца возвращает null; outer loop сдвигает i только на 1. Для N открывающих маркеров сумма проходов квадратична. Это отдельный статический вывод; остановленные ресурсные опыты не возобновлялись. |
| Мира ATTACH-LIFECYCLE-01 | ATTACH-01 | DUPLICATE | Тот же orphan object без достижимой metadata row и последующего claim очистки. |
| Мира ATTACH-STRUCT-01 | XR-ZIP-METADATA | STRUCTURAL_CONTRACT_REVIEW_NEEDED | Local header сверяет name/flags/method/bounds, но не все size/CRC/descriptor поля. Это факт покрытия; полноту требуемой bounded structural проверки и контрпример ещё нужно сверить. Не смешивать с classic65535 ZIP. |
| Мира ATTACH-SEC-01 | XR-SECURITY-ID | IDENTIFIER_SEMANTICS_REVIEW_NEEDED | uploadId намеренно может иметь attachment-v1 hash; исходный attachmentId участвует в hash. Сверить нужную семантику корреляции и label, не объявлять потерю существующей asset-row: rejected upload может не иметь asset. |
| Мира ATTACH-HTTP-405-01 | XR-HTTP-ALLOW | SOURCE_ROUTE_OMISSION | В attachment routes есть явный405 без Allow. Границы фактического HTTP метода/Router dispatch проверить отдельно до общего final verdict. |
| Мира I18N-UI-POLICY-01 | XR-UI-POLICY | SOURCE_POLICY_IDENTITY_GAP | Bundle verification хеширует code inputs/resources, а отдельный machine source проверяет generationPolicyVersion. Требуется сверить contract invalidation текущего compiled bundle; policy change не равен автоматически невалидному тексту. |
| Мира I18N-COPY-01 | LOC-04 | DUPLICATE | Тот же editorAttachmentRestoring в pending истории; не путать с CODE-HISTORY-01 overflow. |
| Мира I18N-UGC-META-01 | XR-UGC-META | SOURCE_PRESENTATION_GAP_REPORTED | Secondary list/title metadata нужны отдельные точные примеры; dir=auto и известный lang/dir не эквивалентны. Не считать все UGC небезопасными. |
| Мира DB-MANIFEST-01 | DB-02 | DUPLICATE | Тот же отсутствующий partial index predicate в parity manifest. |
| Мира DB-ERROR-01 | ARCH-01 | DUPLICATE | Та же catch-all503 ошибка, что Лира F03 и Миша High. High не установлен; не все request errors становятся503. |
| Мира POST-EDIT-AVAIL-01 | XR-POST-EDIT-503 | SOURCE_CHAIN_CORROBORATED | post-edit loader не преобразует typed forum/authz unavailable; ForumRouteError считает произвольный Error статусом500. Отличать от actual deployed response. |
| Мира FORUM-READ-AVAIL-01 | XR-PUBLIC-503 | SOURCE_CHAIN_CORROBORATED | Primary readHomepage failure не пойман, тогда как optional presence и notifications typed unavailable обработаны. Это не тот же writer catch-all503. |
| Мира NOTIFY-BODY-01 | XR-NOTIFY-GUARD | SOURCE_ORDER_CONFIRMED | request.formData вызывается до runForumMutation guard. Сам обход auth/Origin не установлен; body parsing до guard — отдельный порядок обработки. |
| Мира NOTIFY-PAGING-01 | CORE-02 | DUPLICATE | Тот же latest50 inbox/all unread badge; старый post остаётся доступен другими путями. |
| Мира TAG-CARDINALITY-01 | XR-TAG-BOUNDS | CARDINALITY_POLICY_GAP | normalizeForumTags ограничивает длину каждого tag64, но не число unique tags; реальный scale failure или согласованный max не доказаны одним отсутствием лимита. |
| Мира MIGRATION-SOT-01 | DOC-02 | DUPLICATE_DOCUMENTATION | Та же разница0043/0044; отдельно от runtime дефектов. |
| Лира F01 | XR-EDIT-409 | REPRODUCED_ACTUAL_LOCAL_ROUTE | Совпадает с EDITOR-PUB-01/02; после409 не теряется текст, но нет актуальной revision/rebase. |
| Лира F02 | XR-THROWN-ACTION-BUFFER | SOURCE_CONDITIONAL_NOT_REPRODUCED | Thrown action заменяет TopicView error boundary и размонтирует memory buffer. Это не любая network failure; применимость обещания сохранения текста при unexpected throw отдельно сверить. |
| Лира F03 | ARCH-01 | DUPLICATE | Тот же writer catch-all503. |
| Лира F04 | XR-CROSS-TAB-IDENTITY | SOURCE_CONDITIONAL_NOT_REPRODUCED | Heartbeat401 обновляет root, но204 на topic не обновляет cached identity. A→B stale client/user attribution требует отдельной проверки; server authority не обходится. |
| Лира F05 | HELP-01 | DUPLICATE | Та же stale appeal identity; прежняя native race сильнее source-only доказательства. |
| Лира F06 | M-M10 | RELATED_SAME_PALETTE_FAMILY | Белый текст submit на accent — дополнительное место; не тот же цветовой pair, что навигация. Не суммировать как новый класс без определения root cause. |
| Лира D01 | DOC-02 | DUPLICATE_DOCUMENTATION | Migration0043/0044. |
| Лира D02 | DOC-04 | DUPLICATE_DOCUMENTATION | History role-only vs effective permission. |
| Лира R01 | CORE-01 | PRIOR_NATIVE_PROOF_RESOLVES_CONDITIONAL | У Лиры PG race не запускалась; прежнее native PG доказательство в реестре Лёвы найдено. Это не исполнение Лиры. |
| Лира R02 | SEC-01 | PARTIAL_OVERLAP | Raw diagnostics риск шире; конкретный profile form/SQL leakage подтверждён прежним injected-DB-error доказательством. Не расширять на все handlers без проверки. |

### Остальные реестры

51 группа Лёвы сохранена как отдельные доказательства, а не объявлена коллективным консенсусом. ARCH-02 требует разрешения применимости lifecycle, DB-03 — отделения внутреннего grant-контракта от Stage6 rollout, ATTACH-04 — уточнения требования индивидуальной отмены uploading.

30 утверждений Миши сопоставлены с уже выполненной d72b27c verification:15 confirmed /14partial /1not confirmed. Это классификация утверждений, не30 дефектов. Наличие type-only cycle, неиспользуемого export, отсутствия threshold/timeout/favicon само по себе не устанавливает current-Stage функциональный дефект. Generic pagination/unread-scope scalability не объединяется с реальной потерей доступа к старым notification через inbox.

### Статус

Первый проход общей сверки завершён, окончательная общая классификация открыта. Оставшиеся спорные пункты перечислены явно; никакого общего PASS и команды исправлять весь объединённый список нет. Не нужны повторное чтение всего дерева, реальные исключённые сервисы или возобновление остановленных ресурсных опытов. Следующий проход — точечное разрешение перечисленных расхождений. Личные отчёты других агентов не изменялись.

---

## Опубликованный итог AUD-20261022 — 2026-10-24

Публикация в личный файл выполнена по прямому разрешению владельца в текущем чате. Текущий итог имеет приоритет перед историческими незавершёнными статусами ниже. Реализация не изменена; общая межагентная сверка этим обновлением не выполняется.

# Итоговый аудит кода Vico Forum

Проверенный commit: `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`.

Проверка кода в согласованном объёме завершена. Исправления не выполнялись. Это не утверждение об отсутствии всех ошибок, полной безопасности или успешной эксплуатации сервиса.

## Объём и происхождение

Учтены 491 tracked-путь и 437 путей исторического IN-объёма. Из 357 файлов кода три операционных пути исключены по первоначальным ограничениям пользователя; применимый кодовый объём — 354. Для 353 есть записи полного чтения; forum-repository покрыт совокупностью диапазонов 1–3915 с сохранённым унаследованным происхождением. CSS проверен по полному выводу исполняемых правил и деклараций, а не только парсером.

Отчёт объединяет ранние сохранённые записи, собственные последующие проверки и перепроверенные утверждения Миши. Неустановленное авторство ранних выполнений не присвоено мне. После ознакомления с выводами Миши слепая независимость этого аудита не заявляется.

## Подсчёт

**45 групп проблем кода приложения**, отдельно **2 дефекта preview** и **4 документальных несоответствия**. Это 51 группа, а не 51 новое личное открытие. Ранние записи сохранены с их доказательствами и границами повторной проверки.

Из рабочего реестра 50 ID объединены EDITOR-08 и RES-EDITOR-01: замена и вставка изменяют заблокированный редактор через общий незащищённый путь. Добавлены два узко подтверждённых результата перепроверки Миши — M-M07 и M-M10. M-H01 — точный алиас ARCH-01, повторно не считается. Остальные 27 утверждений Миши сохранены отдельно: факты об устройстве, тестах и CI не превращены автоматически в дополнительные дефекты.

## Существенные результаты

- AUTH-01: успешный вход может потеряться из-за порядка Set-Cookie старой и новой сессии. В продолжении подтверждено настоящим BetterAuth email engine с локальным memory adapter и cookie jar.
- CORE-01: встречные ответы могут получить deadlock. Раннее native PostgreSQL-доказательство сохранено; текущий порядок блокировок проверен по коду.
- ARCH-03: ошибка cleanup может подменить исход операции; прежнее доказательство сохранённой записи в БД и новый auth-случай разделены.
- SEC-01: при неожиданной ошибке профиля логгер получает неопубликованный текст и SQL-параметры. Это вывод о коде логирования, а не проверка реального лог-хранилища.
- HELP-01: старая форма решения апелляции не привязана к ожидаемой апелляции и может примениться к заменившей её записи.
- CORE-03: отметка прочитанного может опередить отданные сообщения; позднейшая revalidation способна доставить пропущенный снимок. Постоянная невидимость сообщений не доказана.
- Новые конкретные UI-результаты: некорректное состояние поля поиска после Back; переполнение истории на 320 px до 789 px; безымянное Simple textbox; переполнение меню редактора и два сломанных сценария preview.

## Реестр

P2 — умеренный приоритет; P3 — низкий. Сохранённая оценка не означает измеренную частоту на production. Подробные условия, исходные отчёты и ограничения находятся в FINAL-FINDINGS.json.

### Код приложения

| ID | Приоритет | Проблема |
|---|---|---|
| ARCH-01 | P2 | Неожиданные ошибки записи маскируются под временную недоступность 503 |
| ARCH-02 | P2 | Загрузчик реестра локалей не завершает соединение после успешного чтения и части ошибок |
| ARCH-03 | P2 | Ошибка завершения соединения подменяет успешный результат или исходную ошибку операции |
| ATTACH-01 | P2 | Объект вложения без записи метаданных недоступен штатной очистке |
| ATTACH-02 | P3 | Корректный обычный ZIP с 65535 записями ошибочно требует ZIP64 |
| ATTACH-03 | P3 | Корректный пустой TAR отклоняется на распознавании сигнатуры |
| ATTACH-04 | P2 | Загружаемый файл нельзя удалить отдельно; до завершения загрузки публикация блокируется |
| AUTH-01 | P2 | Удаляющий cookie старой сессии перезаписывает cookie успешного нового входа |
| AUTH-02 | P2 | Назначение уже удалённой роли из старой формы завершается необработанной ошибкой 500 |
| CORE-01 | P2 | Встречные одновременные ответы могут вызвать взаимную блокировку при записи уведомлений |
| CORE-02 | P2 | Старое непрочитанное уведомление выпадает из последних 50 при сохранении общего счётчика |
| CORE-03 | P2 | Отметка прочитанного может опередить фактически отданный снимок сообщений |
| DB-01 | P3 | CHECK допускает неполные NULL-комбинации метаданных состояния allowance |
| DB-02 | P2 | Верификатор схемы пропускает изменение предиката частичного индекса |
| DB-03 | P2 | Контракт прав web runtime не включает используемую таблицу отметок прочитанного |
| EDITOR-01 | P2 | Нормализация HTML-вставки схлопывает пустые строки внутри программного кода |
| EDITOR-02 | P2 | Обычный текст ячеек таблицы превращается в Markdown-форматирование и ссылки |
| EDITOR-03 | P2 | Очистка форматирования части жирного текста повреждает невыделенный суффикс |
| EDITOR-04 | P3 | Отказ преобразования сложной таблицы молча заменяется обычным текстом |
| EDITOR-05 | P2 | Find next не переносит выделение при уже открытом режиме записи |
| EDITOR-06 | P2 | Enter внутри форматированного текста в Простом режиме повреждает разделители |
| EDITOR-07 | P2 | Отступ захватывает исключённую конечную строку и может повредить закрывающий fence |
| EDITOR-08, RES-EDITOR-01 | P3 | Заблокированный редактор допускает изменение через Find/Replace или вставку |
| EDITOR-09 | P2 | Выделение получателей упоминаний расходится с отображением таблиц и спойлеров |
| EDITOR-10 | P3 | HTML-сущности в имени участника декодируются и меняют подпись упоминания |
| EDITOR-11 | P2 | Публикация обрезает граничные пробелы Markdown и может превратить код в обычный текст |
| HELP-01 | P2 | Старая форма решения апелляции может примениться к новой апелляции |
| HELP-02 | P2 | Время начала транзакции может нарушить CHECK при снятии дубликата |
| LOC-01 | P2 | Транспортная ошибка после COMMIT пропускает сверку результата записи локали |
| LOC-02 | P2 | Неожиданная ошибка проверки compiled bundle может привести к удалению корректного bundle |
| LOC-03 | P2 | Параметризованный i18next nesting проходит мимо проверки разрешённых токенов |
| LOC-04 | P3 | При загрузке истории показывается сообщение о восстановлении вложений |
| LOC-05 | P2 | Быстрое переключение политики A–B–A может потерять нужное поколение задачи |
| LOC-06 | P3 | Запрос генерации для сообщения только с вложением завершается ошибкой 500 |
| LOC-07 | P2 | Защита перевода не охватывает структуру собственных таблиц и спойлеров |
| LOC-08 | P3 | Перевод теряет явное направление абзаца либо ошибочно отклоняет экранированный текст |
| LOC-09 | P2 | Отклонённый перевод с завершённой задачей старой политики застревает в converging |
| SEC-01 | P3 | Неожиданные ошибки профиля передают неопубликованный текст и SQL-параметры логгеру |
| RES-EDITOR-02 | P3 | Backspace в начале второго обычного абзаца не соединяет абзацы в Простом режиме |
| RES-UI-01 | P3 | Меню дополнительных инструментов редактора расширяет страницу на 320 px |
| RES-A11Y-01 | P2 | Редактируемое текстовое поле Простого режима не имеет доступного имени |
| CODE-SEARCH-01 | P3 | После возврата назад поле поиска не соответствует адресу и результатам |
| CODE-HISTORY-01 | P3 | История правок расширяет узкую страницу вместо локального размещения текста |
| M-M07 | P3 | Английская шапка менеджера переполняется при ширине 320 px |
| M-M10 | P2 | У проверенного навигационного текста светлой темы недостаточный контраст |

### Preview

| ID | Приоритет | Проблема |
|---|---|---|
| CODE-PREVIEW-01 | P3 | Сценарий подтверждения лучшего ответа открывается решённым и не показывает подтверждение |
| CODE-PREVIEW-02 | P3 | Вкладка Appeals (1) стенда показывает пустую очередь |

### Документация — отдельно от кода

| ID | Приоритет | Проблема |
|---|---|---|
| DOC-01 | DOCUMENTATION | Текущие статусы и остаточные задачи в документации устарели |
| DOC-02 | DOCUMENTATION | Документация отстаёт от фактического номера последней миграции |
| DOC-03 | DOCUMENTATION | Документация противоречиво определяет видимость отметки Disputed |
| DOC-04 | DOCUMENTATION | Доступ к истории описан через роль и через effective permission противоречиво |

## Проверки и ограничения

Прослежены цепочки session/cookie, server actor/permission/ownership, публикации и редактирования, revision fence/transaction/replay, уведомлений и отметок прочитанного, ошибок и логирования, локализации и перевода, вложений, shared UI и preview. Более поздние тесты и source-проверки сопоставлены со старыми pending-полями по семи предметным областям; старые таблицы не переписаны как blanket PASS.

Проверены 874 source/hash ссылок, несовпадений нет. Найдены все 42 исходных отчёта ранних находок и 37 явно названных файлов доказательств. В текущих ссылках два изменения вспомогательного индекса объяснены позднейшей сохранённой версией; исходные результаты воспроизведений не заменены.

Сохранены результаты локальных unit/route/native-DB проверок прежних частей, отдельных Chromium/AX и HTTP/SSR проверок. В продолжении добавлены локальные auth/cookie проверки, воспроизведение read-snapshot, preview, поиска и мобильной истории. Неизменённые наборы не запускались заново ради счётчика. Локальные синтетические компоненты, хранилища и ответы в доказательствах обозначены отдельно от реальной БД и браузера.

Cloudflare, Neon, Hyperdrive, R2, OAuth и backup/restore как реальные сервисы и операционные проверки исключены. Внутренние адаптеры проверялись локально с обозначенными подменами. Реальные deployment/CDN/cache/log sinks и hosted CI не сертифицированы.

Ресурсная гипотеза сложного рендеринга остаётся неподтверждённым наблюдением вне числа дефектов: влияние через публикацию и чтение не установлено; дальнейшие стресс-опыты остановлены. Свежий сетевой аудит зависимостей не выполнялся — использован сохранённый отчёт. Нет утверждения о полном WCAG, всех устройствах, браузерах, screen reader, OS IME или настоящем zoom. Версии локального Node/pnpm отличались от закреплённых в проекте.

## Следующий этап

Итог пригоден для общей сверки с результатами других проверяющих с учётом указанного происхождения. Исправления, новые PR, комментарии или публикации требуют отдельного задания; в ходе этого аудита их не было.


## Подробный реестр: происхождение, причины, доказательства и ограничения

Пути `/workspace/...` в реестре обозначают локальные артефакты выполненной проверки, а не файлы, опубликованные в GitHub. В этом личном файле опубликовано содержимое итогового отчёта и полного реестра; исходные тестовые артефакты и скриншоты отдельно не загружены. Условия и результаты воспроизведений, ссылки на исходники и границы подтверждения сохранены в записях ниже. Ранние исполнения не присвоены текущему агенту; поздние собственные проверки указаны отдельно.

<details>
<summary>Полный структурированный реестр аудита</summary>

```json
{
  "baseline": "d72b27ca762dd930f0e7ad614e5b00832a07ec0c",
  "status": "CODE_AUDIT_COMPLETED_WITH_SCOPE_AND_EVIDENCE_LIMITS",
  "recordedAtUtc": "2026-10-24T11:12:36.206791+00:00",
  "scope": "Application/internal code at fixed commit; user-excluded real services and backup/restore not audited.",
  "notAnIndependentBlindAudit": true,
  "groups": [
    {
      "id": "ARCH-01",
      "memberIds": [
        "ARCH-01"
      ],
      "kind": "application-code",
      "titleRu": "Неожиданные ошибки записи маскируются под временную недоступность 503",
      "priority": "P2",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "ARCH-01",
          "title": "catch-all unexpected writer errors become controlled 503",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage2-part3.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage2-part3.json"
          ],
          "sourceStatus": null,
          "sourcePriority": null,
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [
            "/workspace/work/misha-verification/part1.md",
            "/workspace/work/audit-resumed/part12.md"
          ],
          "currentStatus": "RECONFIRMED_WITH_EXPLICIT_BOUNDS",
          "originalRecord": {
            "id": "ARCH-01",
            "path": "app/forum/mutations.server.ts",
            "line": 110,
            "issue": "catch-all unexpected writer errors become controlled 503",
            "reproduction": "sectionAction -> createHyperdriveForumWriter with injected client.connect throwing TypeError -> DataWithResponseInit({error:unavailable},503); connects1 ends1; no network",
            "impact": "programming/configuration failures are misclassified as temporary dependency outages and fail to reach unexpected-error handling",
            "limits": "fault injection confirms error boundary behavior; no observed production incident claimed"
          },
          "registerLayer": "LEGACY_CODE_RECORD",
          "currentContinuationStatus": "CURRENT_SOURCE_CHAIN_CHECKED_PRIOR_HTTP_PROOF_RETAINED",
          "currentContinuationReports": [
            "/workspace/work/audit/repo/work/audit-code-continuation/publication/review.json",
            "/workspace/work/audit/repo/work/audit-code-continuation/permissions/review.json"
          ],
          "currentContinuationLimit": "Unknown mutation errors become 503 in wrapper; not every request, High not established."
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "ARCH-02",
      "memberIds": [
        "ARCH-02"
      ],
      "kind": "application-code",
      "titleRu": "Загрузчик реестра локалей не завершает соединение после успешного чтения и части ошибок",
      "priority": "P2",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "ARCH-02",
          "title": "request registry loader omits client cleanup on success and unexpected query failure",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage4-final.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage4-final.json",
            "/workspace/work/audit-stage0/stage4-part4.json",
            "/workspace/work/audit-stage0/stage8-part2.json"
          ],
          "sourceStatus": "CONFIRMED_LOCAL_NATIVE_UNFIXED",
          "sourcePriority": "P2",
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [
            "/workspace/work/audit-stage0/stage10-part8.json"
          ],
          "currentStatus": "RECONFIRMED_WITH_EXPLICIT_BOUNDS",
          "originalRecord": {
            "id": "ARCH-02",
            "priority": "P2",
            "status": "CONFIRMED_LOCAL_NATIVE_UNFIXED",
            "location": "db/hyperdrive-registry.ts:39-53",
            "issue": "request registry loader omits client cleanup on success and unexpected query failure",
            "cause": "Client constructed and connected per loader.readAll; only classified availability catch discards; no finally. readAll and request cache do not own cleanup; outer Worker has no cleanup hook",
            "evidence": {
              "successfulRequestLoaders": 2,
              "secondCallSameLoaderReusedSnapshot": true,
              "unexpectedReadErrorPropagated": true,
              "registryEndCallsBeforeManualCleanup": [
                0,
                0,
                0
              ],
              "idleNativeConnectionsBeforeManualCleanup": 3,
              "forumReaderControlEndCalls": 1,
              "limits": "local native Pg and actual application factories, no Hyperdrive service/Worker teardown behavior tested",
              "idleConnectionsAfterManualCleanup": 0
            },
            "control": "actual forum reader invokes end once; manual diagnostic cleanup reduces registry-tag idle connections3→0",
            "limits": "local nativePg factory behavior proven, actual Hyperdrive service/Worker teardown/production exhaustion not tested; all excluded service operations remain excluded",
            "crossStage": "architecture lifecycle finding discovered in stage4 assigned registry adapter; include stage8 followup"
          },
          "registerLayer": "LEGACY_CODE_RECORD",
          "currentContinuationStatus": "CARRIED_EVIDENCE_SAME_BASELINE_NOT_NEW_EXECUTION",
          "currentContinuationReports": []
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "ARCH-03",
      "memberIds": [
        "ARCH-03"
      ],
      "kind": "application-code",
      "titleRu": "Ошибка завершения соединения подменяет успешный результат или исходную ошибку операции",
      "priority": "P2",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "ARCH-03",
          "title": "await client.end in writer finally replaces success or original domain failure when shutdown rejects",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage4-final.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage4-final.json",
            "/workspace/work/audit-stage0/stage4-part5.json"
          ],
          "sourceStatus": "CONFIRMED_WITH_NATIVE_FAULT_INJECTION_UNFIXED",
          "sourcePriority": "P2",
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [
            "/workspace/work/audit-stage0/stage10-part8.json"
          ],
          "currentStatus": "RECONFIRMED_WITH_EXPLICIT_BOUNDS",
          "originalRecord": {
            "id": "ARCH-03",
            "priority": "P2",
            "status": "CONFIRMED_WITH_NATIVE_FAULT_INJECTION_UNFIXED",
            "location": "db/hyperdrive-forum.ts:130",
            "issue": "await client.end in writer finally replaces success or original domain failure when shutdown rejects",
            "evidence": {
              "successCase": {
                "actionStatus": 503,
                "persistedTopics": 1,
                "normalCleanupReplayStatus": 302,
                "readerCleanupFailureControl": "successful result preserved"
              },
              "limits": "actual action/service/Pg commit; injected rejection after actual client.end completes; no service shutdown failure or production incidence observed",
              "domainFailureCase": {
                "normalStatus": 403,
                "cleanupFailureStatus": 503,
                "unauthorizedMutationPersisted": false
              }
            },
            "cause": "finally awaited end throws after operation outcome, overriding it; generic action catch then reports503",
            "relationToARCH01": "distinct writer cleanup root cause; generic runForumMutation classification contributes to observed503; do not count catch-all itself twice",
            "limits": "shutdown failure deliberately injected after actual client.end and DB commit; production occurrence/frequency not established; no external service behavior tested"
          },
          "registerLayer": "LEGACY_CODE_RECORD",
          "currentContinuationStatus": "CURRENT_LOCAL_CLEANUP_OCCURRENCE_EXTENSION",
          "currentContinuationReports": [
            "/workspace/work/audit/repo/work/audit-code-continuation/auth/review.json",
            "/workspace/work/audit/repo/work/audit-code-continuation/publication/review.json"
          ],
          "currentContinuationLimit": "Auth cleanup occurrence tested with fake client; earlier native writer evidence retained separately."
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "ATTACH-01",
      "memberIds": [
        "ATTACH-01"
      ],
      "kind": "application-code",
      "titleRu": "Объект вложения без записи метаданных недоступен штатной очистке",
      "priority": "P2",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "ATTACH-01",
          "title": "Private objects without an asset row remain permanently invisible to the internal cleanup processor",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage7-final.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage7-final.json",
            "/workspace/work/audit-stage0/stage7-part1.json"
          ],
          "sourceStatus": "CONFIRMED_NATIVE_WITH_LOCAL_OBJECT_EMULATOR_UNFIXED",
          "sourcePriority": "P2",
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [],
          "currentStatus": "CARRIED_RECORD_NOT_NEWLY_REEXECUTED_IN_RESUMED_PARTS",
          "originalRecord": {
            "id": "ATTACH-01",
            "priority": "P2",
            "status": "CONFIRMED_NATIVE_WITH_LOCAL_OBJECT_EMULATOR_UNFIXED",
            "issue": "Private objects without an asset row remain permanently invisible to the internal cleanup processor",
            "location": [
              "app/routes/attachment-upload.ts:237-247",
              "db/forum-attachment-cleanup.ts:68-80"
            ],
            "cause": "Upload allocates and writes a fresh random private object before metadata persistence. On availability/ambiguous persistence failures it retains the object, but no durable pending object record is created. Subsequent retry allocates another object. Cleanup enumerates only forum_attachments rows, so the old key is not discoverable. Compensating deletion failures are also swallowed without a retry claim.",
            "reproductions": [
              {
                "case": "Actual local adapter connect() failure ECONNRESET before metadata transaction",
                "sequence": "upload503 -> zero DB asset rows and one stored object -> same-ID retry201 -> one DB row and two objects -> actual cleanup with clock+2days deletes recorded asset only -> zero rows, one orphan; next pass claims0"
              },
              {
                "case": "Terminal operation rejected after upload; injected object delete failure",
                "sequence": "upload410 -> no asset row and one object -> delete recovers -> actual cleanup claims0; object remains"
              }
            ],
            "controls": [
              "Actual PostgreSQL COMMIT succeeds then query acknowledgement throws ECONNRESET; response503; same-ID retry201 retains original recorded object and removes duplicate; subsequent actual cleanup removes it normally.",
              "Terminal operation rejection with functioning object delete leaves no object.",
              "Actual DB-backed download returns bytes for matching owner/context/operation; other owner, wrong context, wrong operation and cancelled operation yield404."
            ],
            "evidence": "stage7-part1-orphan-evidence.json",
            "limits": "No real R2/Neon/Hyperdrive service. Actual local PostgreSQL17 and actual route, local storage adapter, repository and cleanup with in-memory object emulation. Failure injection is bounded at connect, after real COMMIT and object delete. No production frequency/cost measured; no public data exposure established."
          },
          "registerLayer": "LEGACY_CODE_RECORD",
          "currentContinuationStatus": "CARRIED_EVIDENCE_SAME_BASELINE_NOT_NEW_EXECUTION",
          "currentContinuationReports": []
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "ATTACH-02",
      "memberIds": [
        "ATTACH-02"
      ],
      "kind": "application-code",
      "titleRu": "Корректный обычный ZIP с 65535 записями ошибочно требует ZIP64",
      "priority": "P3",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "ATTACH-02",
          "title": "Valid classic ZIP with exactly65535 entries is rejected because entry count0xffff unconditionally requires ZIP64",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage7-final.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage7-final.json",
            "/workspace/work/audit-stage0/stage7-part2.json"
          ],
          "sourceStatus": "CONFIRMED_LOCAL_ROUTE_UNFIXED",
          "sourcePriority": "P3",
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [],
          "currentStatus": "CARRIED_RECORD_NOT_NEWLY_REEXECUTED_IN_RESUMED_PARTS",
          "originalRecord": {
            "id": "ATTACH-02",
            "priority": "P3",
            "status": "CONFIRMED_LOCAL_ROUTE_UNFIXED",
            "issue": "Valid classic ZIP with exactly65535 entries is rejected because entry count0xffff unconditionally requires ZIP64",
            "location": "app/forum/attachment-zip-validation.ts:107-119",
            "repro": "Python3.12.14 zipfile creates count-65535.zip with65535 empty named entries, size6291382bytes, no ZIP64 locator. Python testzip succeeds and independent unzip -tqq exits0. Actual validator returnsfalse and actual upload action returns422 invalid-structure/suspicious=true, deletes uploaded private object and calls security-event store.",
            "controls": "Same standard producer yields valid classic65534-entry ZIP and valid ZIP64 65536-entry ZIP; actual structural validator accepts both. Empty and one-entry ZIP and stored/deflated/bzip2/lzma ZIP controls accepted.",
            "limits": "Direct real Request/action and real stream/structural helpers with memory bucket; metadata/event persistence stubbed for this binary boundary. No live HTTP/browser, native DB or external service. No malicious content or security bypass claim.",
            "evidence": [
              "stage7-part2-corpus.json",
              "stage7-part2-archive-results.json",
              "work/audit-stage7-part2/archives.test.ts"
            ]
          },
          "registerLayer": "LEGACY_CODE_RECORD",
          "currentContinuationStatus": "CARRIED_EVIDENCE_SAME_BASELINE_NOT_NEW_EXECUTION",
          "currentContinuationReports": []
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "ATTACH-03",
      "memberIds": [
        "ATTACH-03"
      ],
      "kind": "application-code",
      "titleRu": "Корректный пустой TAR отклоняется на распознавании сигнатуры",
      "priority": "P3",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "ATTACH-03",
          "title": "Valid empty TAR is rejected by signature sniff despite successful TAR structural validation",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage7-final.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage7-final.json",
            "/workspace/work/audit-stage0/stage7-part2.json"
          ],
          "sourceStatus": "CONFIRMED_LOCAL_ROUTE_UNFIXED",
          "sourcePriority": "P3",
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [],
          "currentStatus": "CARRIED_RECORD_NOT_NEWLY_REEXECUTED_IN_RESUMED_PARTS",
          "originalRecord": {
            "id": "ATTACH-03",
            "priority": "P3",
            "status": "CONFIRMED_LOCAL_ROUTE_UNFIXED",
            "issue": "Valid empty TAR is rejected by signature sniff despite successful TAR structural validation",
            "location": "app/forum/attachment-validation.ts:81-85",
            "repro": "Python tarfile creates standard empty USTAR archive of10240zero bytes; Python reads no entries and independent tar -tf exits0. validateTarStructure accepts its zero-block end marker, but detectAttachmentContent has no empty-TAR branch and calls it unknown. Actual upload route returns422 signature-mismatch/suspicious=true and calls security-event store before any object write.",
            "controls": "Nonempty USTAR/GNU/PAX TAR from same standard producer are accepted by structural validator and actual private stream storage with exact byte preservation.",
            "limits": "Zero-byte files remain intentionally rejected; this finding concerns a nonzero valid TAR container. No extension-only acceptance proposed. No real storage/DB/browser in this part.",
            "evidence": [
              "stage7-part2-corpus.json",
              "stage7-part2-archive-results.json",
              "work/audit-stage7-part2/archives.test.ts"
            ]
          },
          "registerLayer": "LEGACY_CODE_RECORD",
          "currentContinuationStatus": "CARRIED_EVIDENCE_SAME_BASELINE_NOT_NEW_EXECUTION",
          "currentContinuationReports": []
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "ATTACH-04",
      "memberIds": [
        "ATTACH-04"
      ],
      "kind": "application-code",
      "titleRu": "Загружаемый файл нельзя удалить отдельно; до завершения загрузки публикация блокируется",
      "priority": "P2",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "ATTACH-04",
          "title": "An actively uploading attachment cannot be removed individually and blocks publication until it settles",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage7-final.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage7-final.json",
            "/workspace/work/audit-stage0/stage7-part3.json"
          ],
          "sourceStatus": "CONFIRMED_COMPONENT_UNFIXED",
          "sourcePriority": "P2",
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [],
          "currentStatus": "CARRIED_RECORD_NOT_NEWLY_REEXECUTED_IN_RESUMED_PARTS",
          "originalRecord": {
            "id": "ATTACH-04",
            "priority": "P2",
            "status": "CONFIRMED_COMPONENT_UNFIXED",
            "issue": "An actively uploading attachment cannot be removed individually and blocks publication until it settles",
            "location": [
              "app/forum/editor-attachments.tsx:248-249",
              "app/forum/editor-attachments.tsx:312-316"
            ],
            "requirement": "docs/EDITOR.md §6: before publication an attachment can be removed or replaced; only uploads left in the selection should block publication. UI blocked message also says finish or remove uploads.",
            "repro": "Actual MarkdownEditor with nonempty typed text and one acknowledged file. Add a second pending file: Publish disabled, that file row has no action button; writing more text does not release barrier. The available whole-operation Cancel aborts the pending XHR but resets body to default and clears both selected files.",
            "controls": [
              "After an upload error, per-file Remove is available; it releases the publication barrier while preserving typed text and the other selected file.",
              "Normal acknowledgement releases the barrier and keeps exact selected IDs and text.",
              "Picker/drop/image paste share one operation and three distinct stable IDs with selected success preserved."
            ],
            "cause": "Remove button is omitted for uploading status and remove() returns early for uploading. No per-file abort control is exposed. Whole-operation cancel calls MarkdownEditor cancelEditing(), which intentionally resets body/history and all selections.",
            "limits": "Deterministic actual React components in jsdom with controlled XHR progress/completion, not a real browser/network stall. No duration or infinite-stall claim; affected period lasts while upload is pending. Whole Cancel behavior is deliberate, not an automatic text-loss claim. Existing test explicitly expects absent Remove during uploading; it does not resolve the broader contract inconsistency.",
            "evidence": [
              "work/audit-stage7-part3/client.test.tsx",
              "stage7-part3.json"
            ]
          },
          "registerLayer": "LEGACY_CODE_RECORD",
          "currentContinuationStatus": "CARRIED_EVIDENCE_SAME_BASELINE_NOT_NEW_EXECUTION",
          "currentContinuationReports": []
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "AUTH-01",
      "memberIds": [
        "AUTH-01"
      ],
      "kind": "application-code",
      "titleRu": "Удаляющий cookie старой сессии перезаписывает cookie успешного нового входа",
      "priority": "P2",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "AUTH-01",
          "title": "stale revoked session deletion cookie appended after successful email sign-in cookie loses newly issued login",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage3-final.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage3-final.json",
            "/workspace/work/audit-stage0/stage3-part1.json",
            "/workspace/work/audit-stage0/stage3-part2.json"
          ],
          "sourceStatus": "CONFIRMED_UNFIXED",
          "sourcePriority": null,
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [],
          "currentStatus": "CARRIED_RECORD_NOT_NEWLY_REEXECUTED_IN_RESUMED_PARTS",
          "originalRecord": {
            "id": "AUTH-01",
            "status": "CONFIRMED_UNFIXED",
            "effect": "stale revoked session deletion cookie appended after successful email sign-in cookie loses newly issued login",
            "location": "app/auth/session-context.ts:29",
            "evidence": [
              "stage3-part1-cookie-repro.json",
              "stage3-part2-pg-cookie-repro.json"
            ],
            "limits": "real BetterAuth/native Postgres and modeled cookie replacement, no live browser"
          },
          "registerLayer": "LEGACY_CODE_RECORD",
          "currentContinuationStatus": "CURRENT_LOCAL_ENGINE_AND_COOKIE_RECONFIRMATION",
          "currentContinuationReports": [
            "/workspace/work/audit/repo/work/audit-code-continuation/auth/review.json"
          ],
          "currentContinuationLimit": "Actual BetterAuth email engine with memory adapter and wrapper/cookie jar; not native browser or production."
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "AUTH-02",
      "memberIds": [
        "AUTH-02"
      ],
      "kind": "application-code",
      "titleRu": "Назначение уже удалённой роли из старой формы завершается необработанной ошибкой 500",
      "priority": "P2",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "AUTH-02",
          "title": "assign deleted role from stale management form yields raw FK23503 and HTTP500; transaction rolled back",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage3-final.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage3-final.json",
            "/workspace/work/audit-stage0/stage3-part3.json"
          ],
          "sourceStatus": "CONFIRMED_UNFIXED",
          "sourcePriority": null,
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [],
          "currentStatus": "CARRIED_RECORD_NOT_NEWLY_REEXECUTED_IN_RESUMED_PARTS",
          "originalRecord": {
            "id": "AUTH-02",
            "status": "CONFIRMED_UNFIXED",
            "effect": "assign deleted role from stale management form yields raw FK23503 and HTTP500; transaction rolled back",
            "location": "db/authorization-repository.ts:194; app/routes/authorization-admin.tsx:58",
            "evidence": [
              "stage3-part3-stale-role.json"
            ],
            "limits": "real capability/action/Postgres/ReactRouter static handler; no live browser"
          },
          "registerLayer": "LEGACY_CODE_RECORD",
          "currentContinuationStatus": "CARRIED_EVIDENCE_SAME_BASELINE_NOT_NEW_EXECUTION",
          "currentContinuationReports": []
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "CORE-01",
      "memberIds": [
        "CORE-01"
      ],
      "kind": "application-code",
      "titleRu": "Встречные одновременные ответы могут вызвать взаимную блокировку при записи уведомлений",
      "priority": "P2",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "CORE-01",
          "title": "crossed concurrent replies deadlock on per-author FOR UPDATE versus notification recipient FK FOR KEY SHARE",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage4-final.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage4-final.json",
            "/workspace/work/audit-stage0/stage4-part1.json"
          ],
          "sourceStatus": "CONFIRMED_UNFIXED",
          "sourcePriority": "P2",
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [],
          "currentStatus": "CARRIED_RECORD_NOT_NEWLY_REEXECUTED_IN_RESUMED_PARTS",
          "originalRecord": {
            "id": "CORE-01",
            "priority": "P2",
            "status": "CONFIRMED_UNFIXED",
            "issue": "crossed concurrent replies deadlock on per-author FOR UPDATE versus notification recipient FK FOR KEY SHARE",
            "locations": [
              "db/forum-repository.ts:3880",
              "db/forum-repository.ts:734",
              "app/forum/mutations.server.ts:110"
            ],
            "reproduction": {
              "serialControl": "both succeeded",
              "synchronizedAfterRealUserLocks": 2,
              "postgresCodes": [
                "40P01"
              ],
              "diagnostics": [
                {
                  "code": "40P01",
                  "statement": "insert into \"forum_reply_notifications\" (\"id\", \"recipient_user_id\", \"actor_user_id\", \"topic_id\", \"post_id\", \"kind\", \"created_at\", \"read_at\") values ($1, $2, $3, $4, $5, default, $6, default) on conflict (\"recipient_user_id\",\"post_id\") do nothing",
                  "where": "while locking tuple (0,2) in relation \"user\"\nSQL statement \"SELECT 1 FROM ONLY \"audit_core_write_test\".\"user\" x WHERE \"id\" OPERATOR(pg_catalog.=) $1 FOR KEY SHARE OF x\"",
                  "detail": "Process 115 waits for ShareLock on transaction 1086; blocked by process 114.\nProcess 114 waits for ShareLock on transaction 1085; blocked by process 115."
                }
              ],
              "diagnosticControl": {
                "clientOnlyQuerySubstitution": "user FOR UPDATE -> FOR NO KEY UPDATE",
                "statuses": [
                  302,
                  302
                ],
                "postgresCodes": [],
                "implementationChanged": false
              },
              "parallelPolicy": "unaltered default 5000ms cooldown; prior posts backdated one minute",
              "httpStatuses": [
                302,
                503
              ],
              "persistedParallelReplies": 1,
              "limits": "controlled interleaving of real queries; actual action/runtime/Postgres, fake auth session, no browser"
            },
            "effect": "one action returns503 and its reply rolled back, other302 and persisted; serial control both succeed",
            "causality": "actual PG40P01 context identifies notification INSERT acquiring user FK KEY SHARE; client-only FOR NO KEY UPDATE diagnostic control yields302/302, no code changes",
            "limits": "controlled feasible query scheduling, actual action/writer/Postgres, fake auth session, no live browser; production incidence/frequency not established"
          },
          "registerLayer": "LEGACY_CODE_RECORD",
          "currentContinuationStatus": "CURRENT_LOCK_MECHANISM_CHECKED_PRIOR_NATIVE_PROOF_RETAINED",
          "currentContinuationReports": [
            "/workspace/work/audit/repo/work/audit-code-continuation/publication/review.json"
          ],
          "currentContinuationLimit": "Current SQL lock order checked; no new native concurrency run."
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "CORE-02",
      "memberIds": [
        "CORE-02"
      ],
      "kind": "application-code",
      "titleRu": "Старое непрочитанное уведомление выпадает из последних 50 при сохранении общего счётчика",
      "priority": "P2",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "CORE-02",
          "title": "old unread notification stranded outside latest50 inbox while global unread count includes it",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage4-final.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage4-final.json",
            "/workspace/work/audit-stage0/stage4-part2.json"
          ],
          "sourceStatus": "CONFIRMED_UNFIXED",
          "sourcePriority": "P2",
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [],
          "currentStatus": "CARRIED_RECORD_NOT_NEWLY_REEXECUTED_IN_RESUMED_PARTS",
          "originalRecord": {
            "id": "CORE-02",
            "priority": "P2",
            "status": "CONFIRMED_UNFIXED",
            "locations": [
              "db/forum-repository.ts:1361",
              "db/forum-repository.ts:1389",
              "app/routes/notifications.tsx:23",
              "app/forum/views.tsx:357"
            ],
            "issue": "old unread notification stranded outside latest50 inbox while global unread count includes it",
            "evidence": {
              "createdNotifications": 51,
              "defaultInboxSize": 50,
              "allVisibleOpened": true,
              "visibleUnreadAfter": 0,
              "globalUnreadAfter": 1,
              "oldestVisible": false,
              "repositoryControlLimit100Size": 51,
              "limits": "actual loader/action/repository/Postgres; fake session, no browser; view inspected separately"
            },
            "cause": "inbox limited50 irrespective readAt, no cursor/page/unread-only UI; opening rows does not remove them from newest50; count uses all unread rows",
            "limits": "actual loader/action/Pg and source view; no live browser. Bounded inbox is documented; mismatch with all-time unread count produces inaccessible remainder. A bounded history limit alone is not being classified as defect."
          },
          "registerLayer": "LEGACY_CODE_RECORD",
          "currentContinuationStatus": "CURRENT_SOURCE_MECHANISM_RECONFIRMED",
          "currentContinuationReports": [
            "/workspace/work/audit/repo/work/audit-code-continuation/reads/review.json"
          ],
          "currentContinuationLimit": "Latest50 list vs all unread count confirmed in code; no claim old post is globally unfindable."
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "CORE-03",
      "memberIds": [
        "CORE-03"
      ],
      "kind": "application-code",
      "titleRu": "Отметка прочитанного может опередить фактически отданный снимок сообщений",
      "priority": "P2",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "CORE-03",
          "title": "mark-read target can include a concurrently committed post absent from delivered topic snapshot",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage4-final.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage4-final.json",
            "/workspace/work/audit-stage0/stage4-part2.json"
          ],
          "sourceStatus": "CONFIRMED_LOADER_MARK_READ_MISMATCH_BROWSER_FOLLOWUP",
          "sourcePriority": "P2",
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [],
          "currentStatus": "CARRIED_RECORD_NOT_NEWLY_REEXECUTED_IN_RESUMED_PARTS",
          "originalRecord": {
            "id": "CORE-03",
            "priority": "P2",
            "status": "CONFIRMED_LOADER_MARK_READ_MISMATCH_BROWSER_FOLLOWUP",
            "locations": [
              "app/routes/topic.tsx:35",
              "app/routes/topic.tsx:92",
              "app/forum/views.tsx:2282"
            ],
            "issue": "mark-read target can include a concurrently committed post absent from delivered topic snapshot",
            "evidence": {
              "deliveredPostIds": [
                "topic-a-initial"
              ],
              "returnedLatestReadTarget": "zz-new",
              "targetInDeliveredPosts": false,
              "actualStateAfterViewEquivalentMark": {
                "topicId": "topic-a",
                "state": "read",
                "lastReadPostId": "zz-new",
                "firstUnreadPostId": null,
                "latestPostId": "zz-new"
              },
              "controlUsingDeliveredLatest": {
                "topicId": "topic-a",
                "state": "unread",
                "lastReadPostId": "topic-a-initial",
                "firstUnreadPostId": "zz-new",
                "latestPostId": "zz-new"
              },
              "limits": "actual loader/action/repository/Pg; controlled concurrent insertion; view effect modeled from source, no hydration/browser or subsequent revalidation tested"
            },
            "requirement": "PROJECT_STATE.md1067-1081: reply after rendered snapshot remains unread; marker advances only to latest delivered post",
            "cause": "independent readTopicPage and readTopicReadState queries; hydration effect uses latter latestPostId instead of delivered posts",
            "limits": "native actual loader/action/Pg with controlled insertion; effect request modeled from inspected source; browser hydration/subsequent revalidation and persistent user-visible impact pending stage11, no claim of permanent content loss"
          },
          "registerLayer": "LEGACY_CODE_RECORD",
          "currentContinuationStatus": "CURRENT_ACTUAL_LOADER_VIEW_ACTION_REPRODUCTION",
          "currentContinuationReports": [
            "/workspace/work/audit/repo/work/audit-code-continuation/reads/review.json"
          ],
          "currentContinuationLimit": "Controlled reader interleaving and writer gate; subsequent revalidation can deliver post, not permanent invisibility."
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "DB-01",
      "memberIds": [
        "DB-01"
      ],
      "kind": "application-code",
      "titleRu": "CHECK допускает неполные NULL-комбинации метаданных состояния allowance",
      "priority": "P3",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "DB-01",
          "title": "Allowance shape CHECK accepts partial NULL occurrence/state metadata",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage9-final.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage9-final.json",
            "/workspace/work/audit-stage0/stage9-part2.json"
          ],
          "sourceStatus": null,
          "sourcePriority": "P3",
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [],
          "currentStatus": "CARRIED_RECORD_NOT_NEWLY_REEXECUTED_IN_RESUMED_PARTS",
          "originalRecord": {
            "id": "DB-01",
            "priority": "P3",
            "title": "Allowance shape CHECK accepts partial NULL occurrence/state metadata",
            "locations": [
              "db/schema.ts:288",
              "db/schema.ts:302",
              "drizzle/0019_content_provider_allowance_admission.sql:43"
            ],
            "cause": "Nullable allowance generation/attempt/state used in equality without explicit non-NULL guard; a nonempty allowance OR branch can evaluate UNKNOWN, accepted by PostgreSQL CHECK.",
            "observed": "12negative SQL variants durably accepted, though occurrence identity is incomplete; definite non-NULL mismatch rejected23514.",
            "impact": "Database integrity defense does not enforce declared all-empty-or-complete allowance envelope.",
            "bounds": "Current normal store writes complete envelope. Direct claim refuses malformed rows; allowance acquisition replaces malformed state with new valid leasing occurrence. No user-path corruption, quota bypass, provider execution, persistent outage or production incidence established.",
            "fixed": false
          },
          "registerLayer": "LEGACY_CODE_RECORD",
          "currentContinuationStatus": "CARRIED_EVIDENCE_SAME_BASELINE_NOT_NEW_EXECUTION",
          "currentContinuationReports": []
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "DB-02",
      "memberIds": [
        "DB-02"
      ],
      "kind": "application-code",
      "titleRu": "Верификатор схемы пропускает изменение предиката частичного индекса",
      "priority": "P2",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "DB-02",
          "title": "Schema manifest verifier omits partial index predicate and falsely accepts integrity-breaking index drift",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage9-final.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage9-final.json",
            "/workspace/work/audit-stage0/stage9-part3.json"
          ],
          "sourceStatus": null,
          "sourcePriority": "P2",
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [],
          "currentStatus": "CARRIED_RECORD_NOT_NEWLY_REEXECUTED_IN_RESUMED_PARTS",
          "originalRecord": {
            "id": "DB-02",
            "priority": "P2",
            "title": "Schema manifest verifier omits partial index predicate and falsely accepts integrity-breaking index drift",
            "locations": [
              ".github/scripts/production-schema-manifest.mjs:99",
              ".github/scripts/production-schema-manifest.mjs:218"
            ],
            "cause": "Index snapshot selects name,unique,method,key columns/order/nulls but omits pg_index.indpred. Expected JSON has same limited representation,so deepEqual cannot detect a changed WHERE predicate.",
            "observed": "In disposable DB replaced forum_help_duplicate_relationships_active_duplicate_idx WHERE removed_at IS NULL with WHERE false,keeping name/columns/uniqueness/method. Both exported reader/assertion and actual verify-production-schema-manifest.mjs CLI returned parity success(exit0). Two active relationships for the same duplicate topic with distinct originals then coexist; baseline index rejects second insert23505.",
            "controls": "Dropped index/changed uniqueness/key column detected; clean/restored schema passes.",
            "impact": "Repository schema verification can certify a schema that no longer enforces one active duplicate relationship per topic.",
            "bounds": "Current checked-in migration/snapshot index predicate is correct. No actual production drift/incidence,external service change or normal user ability to alter indexes established. This finding concerns the local verification tool,not a broken index on current clean schema.",
            "evidence": "stage9-part3-manifest-mutation-evidence.json",
            "fixed": false
          },
          "registerLayer": "LEGACY_CODE_RECORD",
          "currentContinuationStatus": "CARRIED_EVIDENCE_SAME_BASELINE_NOT_NEW_EXECUTION",
          "currentContinuationReports": []
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "DB-03",
      "memberIds": [
        "DB-03"
      ],
      "kind": "application-code",
      "titleRu": "Контракт прав web runtime не включает используемую таблицу отметок прочитанного",
      "priority": "P2",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "DB-03",
          "title": "Accepted web runtime capability omits forum_topic_read_states permissions required by current authenticated routes",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage9-final.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage9-final.json",
            "/workspace/work/audit-stage0/stage9-part4.json"
          ],
          "sourceStatus": null,
          "sourcePriority": "P2",
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [],
          "currentStatus": "CARRIED_RECORD_NOT_NEWLY_REEXECUTED_IN_RESUMED_PARTS",
          "originalRecord": {
            "id": "DB-03",
            "priority": "P2",
            "title": "Accepted web runtime capability omits forum_topic_read_states permissions required by current authenticated routes",
            "locations": [
              ".github/scripts/runtime-privileges.mjs:12",
              "db/forum-repository.ts:1200",
              "db/forum-repository.ts:1269",
              "db/forum-repository.ts:1325",
              "app/routes/topic.tsx:92",
              "app/routes/section.tsx:25",
              "app/routes/unread.tsx:21"
            ],
            "cause": "runtimeCapabilityContracts.web.relations has no forum_topic_read_states. Probe CLI grants/tests only listed relations,therefore accepts role missing SELECT/INSERT/UPDATE required by existing read-marker repository paths. Exact ACL assertion also rejects those necessary additional grants.",
            "observed": "Native role matching exact contract passesreader/assertion and builtCLI;three actual internal repository/capability read-marker operations fail42501. Actual ReactRouter authenticated topic/section/unread loaders500 and markTopicRead action503.",
            "control": "Guesttopic/section200;guestunread401. Grant SELECT/INSERT/UPDATEon forum_topic_read_states restores authenticated loaders200,mark-read action200,persistentmarker and subsequent state=read,while checker now rejects unexpected relation privileges. Otherpublic reads and new-topic publication under originalcontract succeed.",
            "impact": "Repository least-privilege contract is incompatible with implemented authenticated read/unread behavior;green ACL verification does not guarantee these normal flows work.",
            "bounds": "No production ACLs,service configuration,deployed routes,realcredentials or browser login inspected. Impact established for a localrole built exactly from checked-in contract. Authentication identity injected;normal forum reader/writer/route functions and PG grants real.",
            "fixed": false,
            "evidence": "stage9-part4-native-evidence.json"
          },
          "registerLayer": "LEGACY_CODE_RECORD",
          "currentContinuationStatus": "CARRIED_EVIDENCE_SAME_BASELINE_NOT_NEW_EXECUTION",
          "currentContinuationReports": []
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "DOC-01",
      "memberIds": [
        "DOC-01"
      ],
      "kind": "documentation",
      "titleRu": "Текущие статусы и остаточные задачи в документации устарели",
      "priority": "DOCUMENTATION",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "DOC-01",
          "title": "stale current status/remaining-work statements",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage1-part2.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage1-part2.json",
            "/workspace/work/audit-stage0/stage1-part3.json"
          ],
          "sourceStatus": null,
          "sourcePriority": null,
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [],
          "currentStatus": "CARRIED_RECORD_NOT_NEWLY_REEXECUTED_IN_RESUMED_PARTS",
          "originalRecord": {
            "id": "DOC-01",
            "kind": "documentation-current-state-staleness",
            "evidence": [
              "PROJECT_STATE.md:209",
              "#215 merged: c098912",
              "PROJECT_STATE.md:216",
              "#227 merged: 0fc92f9",
              "PROJECT_STATE.md:1516",
              "PROJECT_STATE.md:1063",
              "PROJECT_STATE.md:1360",
              "PROJECT_STATE.md:1923",
              "PROJECT_STATE.md:25"
            ],
            "impact": "current-status and next-step statements conflict with current baseline and same-file updates",
            "implementationDefect": false
          },
          "registerLayer": "LEGACY_DOCUMENTATION_RECORD",
          "currentContinuationStatus": "CARRIED_EVIDENCE_SAME_BASELINE_NOT_NEW_EXECUTION",
          "currentContinuationReports": []
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "DOC-02",
      "memberIds": [
        "DOC-02"
      ],
      "kind": "documentation",
      "titleRu": "Документация отстаёт от фактического номера последней миграции",
      "priority": "DOCUMENTATION",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "DOC-02",
          "title": "repository migration range 0043 vs 0044",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage1-part2.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage1-part2.json"
          ],
          "sourceStatus": null,
          "sourcePriority": null,
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [],
          "currentStatus": "CARRIED_RECORD_NOT_NEWLY_REEXECUTED_IN_RESUMED_PARTS",
          "originalRecord": {
            "id": "DOC-02",
            "kind": "documentation-migration-range",
            "evidence": [
              "PROJECT_STATE.md:1568",
              "drizzle/meta/_journal.json: last idx44 tag0044, total45",
              "drizzle/0044_attachment_draft_conflict_boundaries.sql"
            ],
            "impact": "repository migration range understates current baseline",
            "implementationDefect": false
          },
          "registerLayer": "LEGACY_DOCUMENTATION_RECORD",
          "currentContinuationStatus": "CARRIED_EVIDENCE_SAME_BASELINE_NOT_NEW_EXECUTION",
          "currentContinuationReports": []
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "DOC-03",
      "memberIds": [
        "DOC-03"
      ],
      "kind": "documentation",
      "titleRu": "Документация противоречиво определяет видимость отметки Disputed",
      "priority": "DOCUMENTATION",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "DOC-03",
          "title": "Disputed visibility contradictory guidance",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage1-part3.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage1-part3.json"
          ],
          "sourceStatus": "confirmed-documentation-inconsistency",
          "sourcePriority": null,
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [],
          "currentStatus": "CARRIED_RECORD_NOT_NEWLY_REEXECUTED_IN_RESUMED_PARTS",
          "originalRecord": {
            "id": "DOC-03",
            "status": "confirmed-documentation-inconsistency",
            "evidence": [
              "docs/UI_UX_PASS.md:439 public Disputed marker",
              "docs/UI_UX_PASS.md:442 moderator-only Disputed in both lists/topic",
              "PROJECT_STATE.md:1253 moderator-only Disputed"
            ],
            "impact": "conflicting visibility guidance can lead to incorrect future UI/privacy changes",
            "implementationDefect": false
          },
          "registerLayer": "LEGACY_DOCUMENTATION_RECORD",
          "currentContinuationStatus": "CARRIED_EVIDENCE_SAME_BASELINE_NOT_NEW_EXECUTION",
          "currentContinuationReports": []
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "DOC-04",
      "memberIds": [
        "DOC-04"
      ],
      "kind": "documentation",
      "titleRu": "Доступ к истории описан через роль и через effective permission противоречиво",
      "priority": "DOCUMENTATION",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "DOC-04",
          "title": "post history role-only vs effective-permission guidance",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage1-part4.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage1-part4.json"
          ],
          "sourceStatus": "confirmed-documentation-inconsistency",
          "sourcePriority": null,
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [],
          "currentStatus": "CARRIED_RECORD_NOT_NEWLY_REEXECUTED_IN_RESUMED_PARTS",
          "originalRecord": {
            "id": "DOC-04",
            "status": "confirmed-documentation-inconsistency",
            "evidence": [
              "docs/EDITOR.md:285-287",
              "docs/auth/AUTHORIZATION.md:51",
              "docs/auth/AUTHORIZATION.md:130-149"
            ],
            "impact": "role-based history restriction conflicts with dynamic effective-permission contract; grant/revoke acceptance differs",
            "implementationDefect": false
          },
          "registerLayer": "LEGACY_DOCUMENTATION_RECORD",
          "currentContinuationStatus": "CARRIED_EVIDENCE_SAME_BASELINE_NOT_NEW_EXECUTION",
          "currentContinuationReports": []
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "EDITOR-01",
      "memberIds": [
        "EDITOR-01"
      ],
      "kind": "application-code",
      "titleRu": "Нормализация HTML-вставки схлопывает пустые строки внутри программного кода",
      "priority": "P2",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "EDITOR-01",
          "title": "HTML clipboard normalization collapses code interior newlines",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage6-final.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage6-final.json",
            "/workspace/work/audit-stage0/stage6-part1-reproductions.json",
            "/workspace/work/audit-stage0/stage6-part1.json"
          ],
          "sourceStatus": "CONFIRMED_COMPONENT_REPRO_UNFIXED",
          "sourcePriority": "P2",
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [],
          "currentStatus": "CARRIED_RECORD_NOT_NEWLY_REEXECUTED_IN_RESUMED_PARTS",
          "originalRecord": {
            "status": "CONFIRMED_COMPONENT_REPRO_UNFIXED",
            "limits": "Actual React components/helpers/FormData/public renderer in jsdom with synthetic clipboard events. No browser/OS clipboard/IDE/Sheets integration or native publication request executed. Production occurrence not measured.",
            "id": "EDITOR-01",
            "priority": "P2",
            "location": "app/forum/clipboard-markdown.ts:98",
            "issue": "HTML clipboard normalization collapses code interior newlines",
            "requirement": "docs/EDITOR.md §§3.1,10: preserve exact code indentation/newlines on IDE/GitHub paste.",
            "reproduction": "Simple editor paste receives text/plain plus <pre><code>first();\\n\\n\\n\\nsecond();</code></pre>.",
            "observed": "Submitted source is ```\\nfirst();\\n\\nsecond();\\n```; parsed code lost2 newlines; no warning.",
            "cause": "Global newline-run replacement runs over the fully converted source, including fenced preformatted content.",
            "control": "Unconverted Markdown with the same code payload retains all4 interior newlines when parsed."
          },
          "registerLayer": "LEGACY_CODE_RECORD",
          "currentContinuationStatus": "CARRIED_EVIDENCE_SAME_BASELINE_NOT_NEW_EXECUTION",
          "currentContinuationReports": []
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "EDITOR-02",
      "memberIds": [
        "EDITOR-02"
      ],
      "kind": "application-code",
      "titleRu": "Обычный текст ячеек таблицы превращается в Markdown-форматирование и ссылки",
      "priority": "P2",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "EDITOR-02",
          "title": "Spreadsheet plain cell text becomes Markdown formatting and links",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage6-final.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage6-final.json",
            "/workspace/work/audit-stage0/stage6-part1-reproductions.json",
            "/workspace/work/audit-stage0/stage6-part1.json"
          ],
          "sourceStatus": "CONFIRMED_COMPONENT_REPRO_UNFIXED",
          "sourcePriority": "P2",
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [],
          "currentStatus": "CARRIED_RECORD_NOT_NEWLY_REEXECUTED_IN_RESUMED_PARTS",
          "originalRecord": {
            "status": "CONFIRMED_COMPONENT_REPRO_UNFIXED",
            "limits": "Actual React components/helpers/FormData/public renderer in jsdom with synthetic clipboard events. No browser/OS clipboard/IDE/Sheets integration or native publication request executed. Production occurrence not measured.",
            "id": "EDITOR-02",
            "priority": "P2",
            "location": "app/forum/technical-markdown.ts:208-216; app/forum/clipboard-markdown.ts:44-56",
            "issue": "Spreadsheet plain cell text becomes Markdown formatting and links",
            "requirement": "docs/EDITOR.md §§3.3,10: preserve spreadsheet rows/columns/cell text or use explicit safe fallback.",
            "reproduction": "TSV or HTML table cells contain literal **literal** and [shown](https://example.com).",
            "observed": "Actual Simple paste stores unescaped Markdown cell text. Public ForumMarkdown shows literal in strong and shown as a link; original cell punctuation no longer visible, no warning.",
            "cause": "Cell serializer escapes only backslashes/pipes/newlines; literal Markdown punctuation is then interpreted by table ReactMarkdown renderer.",
            "controls": "Existing ordinary numeric/simple text tables and escaped pipe tests pass. Both HTML helper and TSV helper reproduce; actual component path uses TSV when tabbed plain flavor present."
          },
          "registerLayer": "LEGACY_CODE_RECORD",
          "currentContinuationStatus": "CARRIED_EVIDENCE_SAME_BASELINE_NOT_NEW_EXECUTION",
          "currentContinuationReports": []
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "EDITOR-03",
      "memberIds": [
        "EDITOR-03"
      ],
      "kind": "application-code",
      "titleRu": "Очистка форматирования части жирного текста повреждает невыделенный суффикс",
      "priority": "P2",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "EDITOR-03",
          "title": "Partial clear formatting breaks unselected bold suffix at whitespace boundary",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage6-final.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage6-final.json",
            "/workspace/work/audit-stage0/stage6-part1-reproductions.json",
            "/workspace/work/audit-stage0/stage6-part1.json"
          ],
          "sourceStatus": "CONFIRMED_COMPONENT_REPRO_UNFIXED",
          "sourcePriority": "P2",
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [],
          "currentStatus": "CARRIED_RECORD_NOT_NEWLY_REEXECUTED_IN_RESUMED_PARTS",
          "originalRecord": {
            "status": "CONFIRMED_COMPONENT_REPRO_UNFIXED",
            "limits": "Actual React components/helpers/FormData/public renderer in jsdom with synthetic clipboard events. No browser/OS clipboard/IDE/Sheets integration or native publication request executed. Production occurrence not measured.",
            "id": "EDITOR-03",
            "priority": "P2",
            "location": "app/forum/editor-document.ts:432-437",
            "issue": "Partial clear formatting breaks unselected bold suffix at whitespace boundary",
            "requirement": "docs/EDITOR.md §3: clear formatting applies to selected content; source helper contract explicitly preserves unselected style.",
            "reproduction": "Advanced editor source **alpha beta**; select source[2:7] (alpha) and click Clear formatting.",
            "observed": "Actual submitted source alpha** beta**; public renderer shows literal delimiter characters, no strong node for unselected beta.",
            "cause": "Reopening ** inserted before leading whitespace of unselected suffix; delimiter fails CommonMark flanking rules.",
            "controls": "Whole-range and middle-of-word clear cases pass existing tests. Actual Undo restores exact **alpha beta** source."
          },
          "registerLayer": "LEGACY_CODE_RECORD",
          "currentContinuationStatus": "CARRIED_EVIDENCE_SAME_BASELINE_NOT_NEW_EXECUTION",
          "currentContinuationReports": []
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "EDITOR-04",
      "memberIds": [
        "EDITOR-04"
      ],
      "kind": "application-code",
      "titleRu": "Отказ преобразования сложной таблицы молча заменяется обычным текстом",
      "priority": "P3",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "EDITOR-04",
          "title": "Declined spreadsheet conversion silently falls back to plain text",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage6-final.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage6-final.json",
            "/workspace/work/audit-stage0/stage6-part1-reproductions.json",
            "/workspace/work/audit-stage0/stage6-part1.json"
          ],
          "sourceStatus": "CONFIRMED_COMPONENT_REPRO_UNFIXED",
          "sourcePriority": "P3",
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [],
          "currentStatus": "CARRIED_RECORD_NOT_NEWLY_REEXECUTED_IN_RESUMED_PARTS",
          "originalRecord": {
            "status": "CONFIRMED_COMPONENT_REPRO_UNFIXED",
            "limits": "Actual React components/helpers/FormData/public renderer in jsdom with synthetic clipboard events. No browser/OS clipboard/IDE/Sheets integration or native publication request executed. Production occurrence not measured.",
            "id": "EDITOR-04",
            "priority": "P3",
            "location": "app/forum/markdown-editor.tsx:523-528",
            "issue": "Declined spreadsheet conversion silently falls back to plain text",
            "requirement": "docs/EDITOR.md §3.3: safe fallback with explicit warning when table cannot be converted without loss.",
            "reproduction": "Simple editor pastes quoted/multiline-cell TSV A\\tB\\n\"line one\\nline two\"\\t3; spreadsheetToMarkdown returns null.",
            "observed": "All input text is preserved, but no alert appears and user is not told conversion was declined.",
            "cause": "pasteSpreadsheet null branch replaces with plain Markdown then returns without setPasteWarning.",
            "impact": "Missing required conversion warning; no text loss in tested fallback case."
          },
          "registerLayer": "LEGACY_CODE_RECORD",
          "currentContinuationStatus": "CARRIED_EVIDENCE_SAME_BASELINE_NOT_NEW_EXECUTION",
          "currentContinuationReports": []
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "EDITOR-05",
      "memberIds": [
        "EDITOR-05"
      ],
      "kind": "application-code",
      "titleRu": "Find next не переносит выделение при уже открытом режиме записи",
      "priority": "P2",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "EDITOR-05",
          "title": "Find next does not apply selection when editor is already in write mode",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage6-final.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage6-final.json",
            "/workspace/work/audit-stage0/stage6-part2-reproductions.json",
            "/workspace/work/audit-stage0/stage6-part2.json"
          ],
          "sourceStatus": "CONFIRMED_COMPONENT_UNFIXED",
          "sourcePriority": "P2",
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [],
          "currentStatus": "CARRIED_RECORD_NOT_NEWLY_REEXECUTED_IN_RESUMED_PARTS",
          "originalRecord": {
            "id": "EDITOR-05",
            "priority": "P2",
            "status": "CONFIRMED_COMPONENT_UNFIXED",
            "location": "app/forum/markdown-editor.tsx:630-641",
            "issue": "Find next does not apply selection when editor is already in write mode",
            "repro": "Advanced source before one after one; caret0; open Find and replace, Find=one, click Find next.",
            "observed": "Selection stays[0,0], textarea not focused; source unchanged. Preview→Find next selects[7,10] correctly, then subsequent Find next again stays[7,10] instead of next match.",
            "cause": "findNext updates pendingSelectionRef and sets mode to write, but selection layout effect depends only on mode/value/authoringMode. Same-mode no-content operation does not execute effect.",
            "control": "Preview-to-write transition applies the pending range and focus.",
            "limits": "Actual MarkdownEditor/ForumMarkdown components in jsdom with synthetic selection/key events and userEvent button clicks. No real browser/native IME/layout/mobile/HTTP publication or production frequency measured."
          },
          "registerLayer": "LEGACY_CODE_RECORD",
          "currentContinuationStatus": "CARRIED_EVIDENCE_SAME_BASELINE_NOT_NEW_EXECUTION",
          "currentContinuationReports": []
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "EDITOR-06",
      "memberIds": [
        "EDITOR-06"
      ],
      "kind": "application-code",
      "titleRu": "Enter внутри форматированного текста в Простом режиме повреждает разделители",
      "priority": "P2",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "EDITOR-06",
          "title": "Simple Enter inside formatted text breaks existing inline delimiters",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage6-final.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage6-final.json",
            "/workspace/work/audit-stage0/stage6-part2-reproductions.json",
            "/workspace/work/audit-stage0/stage6-part2.json"
          ],
          "sourceStatus": "CONFIRMED_COMPONENT_UNFIXED",
          "sourcePriority": "P2",
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [
            "/workspace/work/audit-resumed/part3.md"
          ],
          "currentStatus": "RECONFIRMED_WITH_EXPLICIT_BOUNDS",
          "originalRecord": {
            "id": "EDITOR-06",
            "priority": "P2",
            "status": "CONFIRMED_COMPONENT_UNFIXED",
            "location": "app/forum/markdown-editor.tsx:651-653; app/forum/visual-markdown-editor.tsx:354-367",
            "issue": "Simple Enter inside formatted text breaks existing inline delimiters",
            "repro": "Simple source **alpha beta**; native DOM caret after alpha, press Enter.",
            "observed": "FormData body becomes **alpha\\n\\n beta**. Public renderer has no strong node and exposes literal ** delimiters. Undo restores exact original.",
            "cause": "insertVisualParagraph inserts blank paragraph break directly into source without splitting/reopening enclosing inline formatting.",
            "relation": "Different action/root from EDITOR-03 partial clear formatting; same category of visible delimiter corruption, not duplicate reproduction.",
            "limits": "Actual MarkdownEditor/ForumMarkdown components in jsdom with synthetic selection/key events and userEvent button clicks. No real browser/native IME/layout/mobile/HTTP publication or production frequency measured."
          },
          "registerLayer": "LEGACY_CODE_RECORD",
          "currentContinuationStatus": "CARRIED_EVIDENCE_SAME_BASELINE_NOT_NEW_EXECUTION",
          "currentContinuationReports": []
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "EDITOR-07",
      "memberIds": [
        "EDITOR-07"
      ],
      "kind": "application-code",
      "titleRu": "Отступ захватывает исключённую конечную строку и может повредить закрывающий fence",
      "priority": "P2",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "EDITOR-07",
          "title": "Code indentation includes exclusive end line and can invalidate closing fence",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage6-final.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage6-final.json",
            "/workspace/work/audit-stage0/stage6-part2-reproductions.json",
            "/workspace/work/audit-stage0/stage6-part2.json"
          ],
          "sourceStatus": "CONFIRMED_COMPONENT_UNFIXED",
          "sourcePriority": "P2",
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [],
          "currentStatus": "CARRIED_RECORD_NOT_NEWLY_REEXECUTED_IN_RESUMED_PARTS",
          "originalRecord": {
            "id": "EDITOR-07",
            "priority": "P2",
            "status": "CONFIRMED_COMPONENT_UNFIXED",
            "location": "app/forum/markdown-editor.tsx:570-583",
            "issue": "Code indentation includes exclusive end line and can invalidate closing fence",
            "repro": [
              "Advanced fenced code with three indented lines; selection starts first line and ends at start of third. Tab/Shift+Tab also changes the unselected third line.",
              "Fenced block closes with3 leading spaces, followed by After paragraph. Select code through start of closing line and pressTab."
            ],
            "observed": [
              "Both indent and outdent alter third line outside selection; Undo restores exact original.",
              "Closing fence gains2 spaces, becomes5-spaced, no longer closes code; public parser now returns one code node containing trailing After instead of code+paragraph."
            ],
            "cause": "codeKey computes next newline from exclusive selection end without subtracting boundary newline; split includes final empty line and prefixes it, moving the unselected closing fence.",
            "controls": "Existing single-line code/prose restriction tests pass; original fixture parses as code+paragraph.",
            "limits": "Actual MarkdownEditor/ForumMarkdown components in jsdom with synthetic selection/key events and userEvent button clicks. No real browser/native IME/layout/mobile/HTTP publication or production frequency measured."
          },
          "registerLayer": "LEGACY_CODE_RECORD",
          "currentContinuationStatus": "CARRIED_EVIDENCE_SAME_BASELINE_NOT_NEW_EXECUTION",
          "currentContinuationReports": []
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "EDITOR-08",
      "memberIds": [
        "EDITOR-08",
        "RES-EDITOR-01"
      ],
      "kind": "application-code",
      "titleRu": "Заблокированный редактор допускает изменение через Find/Replace или вставку",
      "priority": "P3",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "EDITOR-08",
          "title": "Open find/replace controls can mutate a disabled editor buffer",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage6-final.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage6-final.json",
            "/workspace/work/audit-stage0/stage6-part2-reproductions.json",
            "/workspace/work/audit-stage0/stage6-part2.json"
          ],
          "sourceStatus": "CONFIRMED_COMPONENT_UNFIXED",
          "sourcePriority": "P3",
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [],
          "currentStatus": "CARRIED_RECORD_NOT_NEWLY_REEXECUTED_IN_RESUMED_PARTS",
          "originalRecord": {
            "id": "EDITOR-08",
            "priority": "P3",
            "status": "CONFIRMED_COMPONENT_UNFIXED",
            "location": "app/forum/markdown-editor.tsx:1045-1051; replaceAllMatches at644-647",
            "issue": "Open find/replace controls can mutate a disabled editor buffer",
            "repro": "Advanced source one two; open find panel, enter Find=one, replacement=changed; rerender component disabled=true; click enabled Replace all.",
            "observed": "Source textarea is disabled, but Replace all remains enabled and changes buffer to changed two.",
            "cause": "Find panel inputs/buttons do not honor disabled and replaceAllMatches has no disabled guard.",
            "limits": "Actual MarkdownEditor/ForumMarkdown components in jsdom with synthetic selection/key events and userEvent button clicks. No real browser/native IME/layout/mobile/HTTP publication or production frequency measured. Real HTTP submission/race-related text loss was not tested; do not claim a publication bypass or persisted unauthorized mutation."
          },
          "registerLayer": "LEGACY_CODE_RECORD",
          "currentContinuationStatus": "CARRIED_EVIDENCE_SAME_BASELINE_NOT_NEW_EXECUTION",
          "currentContinuationReports": []
        },
        {
          "id": "RES-EDITOR-01",
          "status": "CONFIRMED_COMPONENT_AND_ROUTER_SUBMITTING_UI_DEFECT",
          "title": "Simple editor clipboard paste mutates controlled Markdown while disabled+publicationPending true",
          "severity": "Functional disabled-state defect; no elevated security severity or persisted data loss established",
          "cases": [
            {
              "name": "disabled simple retains body",
              "afterPaste": "Alpha betaPASTED",
              "events": [
                {
                  "type": "paste",
                  "trusted": true,
                  "target": "SPAN",
                  "locked": "true",
                  "contentEditable": "false"
                }
              ]
            },
            {
              "name": "disabled simple blocks pasted HTML",
              "afterPaste": "Alpha beta**BOLD**",
              "events": [
                {
                  "type": "paste",
                  "trusted": true,
                  "target": "SPAN",
                  "locked": "true",
                  "contentEditable": "false"
                }
              ]
            }
          ],
          "cause": [
            "Visual editor paste handler lacks disabled check.",
            "Parent replaceSourceRange updates history/value without disabled check."
          ],
          "limits": [
            "Actual SectionView/MarkdownEditor/React Router submitting confirmed with a fake delayed action; no real backend, session, permission or DB.",
            "No successful publication/persisted data loss established; late input retained after tested429.",
            "Other loading/revalidation/success/browser transitions not fully verified."
          ],
          "report": "/workspace/work/audit-resumed/part2.md",
          "evidence": "/workspace/work/audit/repo/work/audit-resumed-part2/evidence.json",
          "initialVerificationLimits": [
            "Actual props toggled by audit harness, not actual React Router submitting/loading transition.",
            "No publication, database write, session or permissions bypass demonstrated."
          ],
          "routerFollowup": {
            "part": 6,
            "report": "/workspace/work/audit-resumed/part6.md",
            "evidence": "/workspace/work/audit/repo/work/audit-resumed-part6/submitting-paste-evidence.json",
            "requestCapturedBody": "Body kept",
            "uiBodyDuringSubmitting": "Body keptLATE",
            "after429": "Body keptLATE",
            "deduplication": "Same finding, stronger parent/router evidence; not new issue."
          },
          "registerLayer": "OWN_RESUMED_FINDING",
          "attribution": "Own recorded resumed execution; not a blind independent audit after exposure to prior findings."
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE",
      "deduplicationReason": "Both Replace all and Simple paste call replaceSourceRange without disabled guard. Preserve two trigger-specific proofs as one disabled-buffer mutation family, not two independent groups."
    },
    {
      "id": "EDITOR-09",
      "memberIds": [
        "EDITOR-09"
      ],
      "kind": "application-code",
      "titleRu": "Выделение получателей упоминаний расходится с отображением таблиц и спойлеров",
      "priority": "P2",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "EDITOR-09",
          "title": "Mention recipient parser disagrees with actual rendered spoiler/table semantics and persists false mention notifications",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage6-final.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage6-final.json",
            "/workspace/work/audit-stage0/stage6-part3-reproductions.json",
            "/workspace/work/audit-stage0/stage6-part3.json"
          ],
          "sourceStatus": "CONFIRMED_NATIVE_AND_COMPONENT_UNFIXED",
          "sourcePriority": "P2",
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [],
          "currentStatus": "CARRIED_RECORD_NOT_NEWLY_REEXECUTED_IN_RESUMED_PARTS",
          "originalRecord": {
            "id": "EDITOR-09",
            "priority": "P2",
            "status": "CONFIRMED_NATIVE_AND_COMPONENT_UNFIXED",
            "location": "app/forum/mentions.ts:25-28; app/forum/markdown.tsx:355-395; db/forum-repository.ts:762-783",
            "issue": "Mention recipient parser disagrees with actual rendered spoiler/table semantics and persists false mention notifications",
            "requirement": "docs/EDITOR.md §7: recipients are profile mentions; quoted/code mentions must not notify. Internal publishedMentionRecipients contract states rendered profile links, not bare tokens/names.",
            "cause": "Recipient extraction uses plain CommonMark fromMarkdown over the whole source, while ForumMarkdown segments spoilers/tables and separately parses their body/cells. Plain metadata can become a link in extraction; a quote inside a rendered table cell is an ordinary paragraph link in whole-source parse.",
            "cases": [
              {
                "source": ":::spoiler [Meta](/en/users/recipient)\nBody\n:::",
                "render": "summary shows literal [Meta](/en/users/recipient); no anchor exists",
                "database": "recipient receives kind=mention after actual createTopicWithInitialPost commit"
              },
              {
                "source": "| A | B |\n| --- | --- |\n| > [Quoted](/en/users/recipient) | value |",
                "render": "profile anchor is inside a table-cell blockquote",
                "database": "recipient receives kind=mention despite quote exclusion requirement"
              }
            ],
            "evidenceFile": "stage6-part3-mention-semantics.json",
            "controls": "Ordinary blockquote and fenced-code sources produce no mention row; genuine repeated member link produces one row, self excluded. Existing edit/re-add/failed-CAS tests also pass.",
            "limits": "Actual transaction and localPostgreSQL17 with45 migrations; same exact strings independently checked with real ForumMarkdown component in jsdom. No live HTTP publication/browser/production frequency measured."
          },
          "registerLayer": "LEGACY_CODE_RECORD",
          "currentContinuationStatus": "CARRIED_EVIDENCE_SAME_BASELINE_NOT_NEW_EXECUTION",
          "currentContinuationReports": []
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "EDITOR-10",
      "memberIds": [
        "EDITOR-10"
      ],
      "kind": "application-code",
      "titleRu": "HTML-сущности в имени участника декодируются и меняют подпись упоминания",
      "priority": "P3",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "EDITOR-10",
          "title": "Literal entity text in member display name is decoded in the mention label",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage6-final.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage6-final.json",
            "/workspace/work/audit-stage0/stage6-part3-reproductions.json",
            "/workspace/work/audit-stage0/stage6-part3.json"
          ],
          "sourceStatus": "CONFIRMED_COMPONENT_WITH_NATIVE_NAME_CONTROL_UNFIXED",
          "sourcePriority": "P3",
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [],
          "currentStatus": "CARRIED_RECORD_NOT_NEWLY_REEXECUTED_IN_RESUMED_PARTS",
          "originalRecord": {
            "id": "EDITOR-10",
            "priority": "P3",
            "status": "CONFIRMED_COMPONENT_WITH_NATIVE_NAME_CONTROL_UNFIXED",
            "location": "app/forum/mentions.ts:17-20",
            "issue": "Literal entity text in member display name is decoded in the mention label",
            "repro": "Persisted member name A &copy; B; native candidate lookup returns exact name. mentionProfileLink serializes [A &copy; B](/en/users/recipient).",
            "observed": "Actual public ForumMarkdown label becomes A © B; account URL remains correct. Attributed quote serialization preserves literal A &copy; B as a positive escaping control.",
            "cause": "Mention serializer escapes Markdown delimiters but leaves ampersands, so Markdown entity decoding changes label text.",
            "limits": "Native stored-name/candidate control plus actual serializer/public renderer. Autocomplete suggestion click not executed end-to-end in this part; unchanged component chooseMention delegation was reviewed part2. No wrong-recipient/auth bypass claim."
          },
          "registerLayer": "LEGACY_CODE_RECORD",
          "currentContinuationStatus": "CARRIED_EVIDENCE_SAME_BASELINE_NOT_NEW_EXECUTION",
          "currentContinuationReports": []
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "EDITOR-11",
      "memberIds": [
        "EDITOR-11"
      ],
      "kind": "application-code",
      "titleRu": "Публикация обрезает граничные пробелы Markdown и может превратить код в обычный текст",
      "priority": "P2",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "EDITOR-11",
          "title": "Initial publication trims Markdown boundary whitespace and changes indented code into prose",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage6-final.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage6-final.json",
            "/workspace/work/audit-stage0/stage6-part4.json"
          ],
          "sourceStatus": "CONFIRMED_NATIVE_ACTION_AND_RENDERER_UNFIXED",
          "sourcePriority": "P2",
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [],
          "currentStatus": "CARRIED_RECORD_NOT_NEWLY_REEXECUTED_IN_RESUMED_PARTS",
          "originalRecord": {
            "id": "EDITOR-11",
            "priority": "P2",
            "status": "CONFIRMED_NATIVE_ACTION_AND_RENDERER_UNFIXED",
            "location": "app/forum/actions.server.ts:161,503; shared helper app/forum/mutations.server.ts:70-72",
            "issue": "Initial publication trims Markdown boundary whitespace and changes indented code into prose",
            "source": "    const first = 1;\n    const second = 2;",
            "stored": "const first = 1;\r\n    const second = 2;",
            "cause": "sectionAction/topicAction read body through requiredFormText, whose returned value is trim(). Edit path reads raw form body instead. ForumService normalizeRevision validates without trimming.",
            "evidence": [
              "stage6-part4-publication-trim.json",
              "work/audit-stage6-part4/publication.test.ts",
              "work/audit-stage6-part4/render.test.tsx"
            ],
            "verified": "Actual editor FormData retains source; public renderer shows original as code and saved source as prose. Actual sectionAction/topicAction -> actual local adapter -> ForumService -> repository -> PostgreSQL persists altered source for topic and reply. Direct local writer control preserves source. Same-operation topic retry returns same Location.",
            "limits": "Help action line100 uses same helper but was not independently executed in this part. Multipart LF-to-CRLF normalization is separately expected transport behavior, not this defect. No live browser/production incidence measured."
          },
          "registerLayer": "LEGACY_CODE_RECORD",
          "currentContinuationStatus": "CARRIED_EVIDENCE_SAME_BASELINE_NOT_NEW_EXECUTION",
          "currentContinuationReports": []
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "HELP-01",
      "memberIds": [
        "HELP-01"
      ],
      "kind": "application-code",
      "titleRu": "Старая форма решения апелляции может примениться к новой апелляции",
      "priority": "P2",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "HELP-01",
          "title": "Stale topic appeal form resolves replacement pending appeal without expected appeal identity",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage5-final.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage5-final.json",
            "/workspace/work/audit-stage0/stage5-part1-stale-appeal.json",
            "/workspace/work/audit-stage0/stage5-part1.json"
          ],
          "sourceStatus": "CONFIRMED_NATIVE_UNFIXED",
          "sourcePriority": "P2",
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [],
          "currentStatus": "CARRIED_RECORD_NOT_NEWLY_REEXECUTED_IN_RESUMED_PARTS",
          "originalRecord": {
            "id": "HELP-01",
            "priority": "P2",
            "status": "CONFIRMED_NATIVE_UNFIXED",
            "location": "app/forum/actions.server.ts:362-370; app/forum/views.tsx:2471-2477",
            "issue": "Stale topic appeal form resolves replacement pending appeal without expected appeal identity",
            "scenario": [
              "Moderator sees pending appeal A and its explanation on topic page.",
              "A is rejected by another completed moderation operation. Author submits new appeal B with different explanation.",
              "Submitting the original topic-page accept form returns302, accepts B and removes active duplicate relation."
            ],
            "evidence": {
              "topicActionStatus": 302,
              "oldAppealFinalStatus": "rejected",
              "replacementAppealFinalStatus": "accepted",
              "activeRelationRemoved": true,
              "queueExactOldIdControlStatus": 409,
              "queueControlLeavesReplacementPending": true,
              "runtime": "actual topic/attention actions, ForumService writer adapter and disposable local PostgreSQL17; session/current permission resolver supplied by controlled context",
              "test": "work/audit-stage5-part1/attention.test.ts: stale topic appeal form test"
            },
            "cause": "TopicView forms send only intent. Topic action omits expectedAppealId. Repository optional guard therefore selects whichever pending appeal is current under locks. Queue route passes exact expectedAppealId and rejects stale identity.",
            "limits": "Browser was not run; request payload follows actual rendered source. Native state transitions and HTTP action outcomes established. No unauthorized actor bypass; authorized moderation applies to an unseen replacement case.",
            "relatedPendingCheck": "Lifecycle timestamp behavior under transaction waits remains unverified, separate from this finding."
          },
          "registerLayer": "LEGACY_CODE_RECORD",
          "currentContinuationStatus": "CURRENT_SOURCE_CHAIN_RECONFIRMED",
          "currentContinuationReports": [
            "/workspace/work/audit/repo/work/audit-code-continuation/permissions/review.json",
            "/workspace/work/audit/repo/work/audit-code-continuation/views/review.json"
          ],
          "currentContinuationLimit": "Topic forms omit expected appeal identity; queue forms have caseId. Earlier native race proof retained."
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "HELP-02",
      "memberIds": [
        "HELP-02"
      ],
      "kind": "application-code",
      "titleRu": "Время начала транзакции может нарушить CHECK при снятии дубликата",
      "priority": "P2",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "HELP-02",
          "title": "removeHelpDuplicate uses transaction-start now() for terminal timestamps, causing23514 and action503 when the selected active relationship or its pending appeal was created after this transaction began.",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage5-final.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage5-final.json",
            "/workspace/work/audit-stage0/stage5-part2-finding.json",
            "/workspace/work/audit-stage0/stage5-part2.json"
          ],
          "sourceStatus": "CONFIRMED_NATIVE_CONTROLLED_INTERLEAVING_UNFIXED",
          "sourcePriority": "P2",
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [],
          "currentStatus": "CARRIED_RECORD_NOT_NEWLY_REEXECUTED_IN_RESUMED_PARTS",
          "originalRecord": {
            "id": "HELP-02",
            "priority": "P2",
            "status": "CONFIRMED_NATIVE_CONTROLLED_INTERLEAVING_UNFIXED",
            "location": "db/forum-repository.ts:3384-3393",
            "issue": "removeHelpDuplicate uses transaction-start now() for terminal timestamps, causing23514 and action503 when the selected active relationship or its pending appeal was created after this transaction began.",
            "cause": "PostgreSQL now() stays at transaction start; READ COMMITTED later statements can observe committed records created afterwards. Removal/appeal lifecycle checks require terminal time >= creation/confirmation time.",
            "evidenceFile": "stage5-part2-timestamps.json",
            "reproduction": "Actual topic action, writer adapter, service/repository and PostgreSQL17. Pause delivery of completed BEGIN, then commit appeal creation or relationship confirmation in a different connection, resume removal. Actual DB timestamps; SQL confirms created_at/confirmed_at > transaction_timestamp.",
            "observed": {
              "laterAppeal": {
                "actionStatus": 503,
                "pgCode": "23514",
                "constraint": "forum_help_duplicate_appeals_lifecycle_check",
                "rollbackPreservesActiveRelationAndPendingAppeal": true
              },
              "laterRelationship": {
                "actionStatus": 503,
                "pgCode": "23514",
                "constraint": "forum_help_duplicate_relationships_removal_check",
                "rollbackPreservesActiveRelation": true
              }
            },
            "controls": {
              "normalFreshRetryStatus": 302,
              "sameInterleavingClientOnlyStatementClockStatus": 302
            },
            "limits": [
              "Schedule deliberately forced after BEGIN; no production frequency established.",
              "No real row-lock wait used in this timestamp reproduction; concurrency tests separately use real concurrent connections.",
              "Diagnostic query rewrite changes now() to statement_timestamp() only in one client, not application source; not a delivered fix.",
              "resolveHelpDuplicateAppeal has a similar now() site but was not separately reproduced as part of this finding.",
              "ARCH-01 generic catch contributes to503, not counted again."
            ],
            "impact": "Authorized removal returns spurious503 and must be retried; transaction rolls back, no partial removal or appeal resolution persisted."
          },
          "registerLayer": "LEGACY_CODE_RECORD",
          "currentContinuationStatus": "CURRENT_SOURCE_MECHANISM_CHECKED_PRIOR_NATIVE_PROOF_RETAINED",
          "currentContinuationReports": [
            "/workspace/work/audit/repo/work/audit-code-continuation/permissions/review.json"
          ],
          "currentContinuationLimit": "Transaction-start now race remains; no new native race run."
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "LOC-01",
      "memberIds": [
        "LOC-01"
      ],
      "kind": "application-code",
      "titleRu": "Транспортная ошибка после COMMIT пропускает сверку результата записи локали",
      "priority": "P2",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "LOC-01",
          "title": "Controlled locale writer skips reconciliation for transport failures after COMMIT",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage8-final.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage8-final.json",
            "/workspace/work/audit-stage0/stage8-part1.json"
          ],
          "sourceStatus": "CONFIRMED_LOCAL_PG_COMMIT_ACK_INJECTION_UNFIXED",
          "sourcePriority": "P2",
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [],
          "currentStatus": "CARRIED_RECORD_NOT_NEWLY_REEXECUTED_IN_RESUMED_PARTS",
          "originalRecord": {
            "id": "LOC-01",
            "priority": "P2",
            "status": "CONFIRMED_LOCAL_PG_COMMIT_ACK_INJECTION_UNFIXED",
            "issue": "Controlled locale writer skips reconciliation for transport failures after COMMIT",
            "location": "db/locale-repository.ts:153-156",
            "requirement": "docs/translation/LOCALES.md Controlled lifecycle writes: unknown COMMIT outcome must be reconciled using semantic pre-state, expected post-state and actual reloaded state; no blind retry.",
            "reproduction": "Actual local PostgreSQL COMMIT stores fr. A bounded query proxy then throws ECONNRESET, EPIPE or code-less Connection terminated unexpectedly. ControlledLocaleWriter propagates original error and never calls reconciliationRepository.readAll; independently read DB contains committed desired row. Exactly one transaction/COMMIT, no blind retry.",
            "cause": "isAmbiguousCommitError recognizes SQLSTATE08*/40003 and statement timeout, but omits transport failures already recognized by registry load classification.",
            "controls": [
              "Actual COMMIT followed by08007 performs reconciliation and resolves success for exact expected state, without retry.",
              "08007 with a subsequently committed third state yields AmbiguousCommitOutcomeError.",
              "Transport failure injected before COMMIT rolls back and leaves no row."
            ],
            "scope": "Existing controlled/test/admin registry writer. Runtime Worker registry capability is read-only; no current public locale-write endpoint or production frequency claim.",
            "evidence": [
              "stage8-part1-commit-evidence.json",
              "work/audit-stage8-part1/locale-writer.test.ts"
            ],
            "limits": "Actual disposable PostgreSQL17 with all45 SQL migrations; driver acknowledgement failure injected after real COMMIT, not a real network cut. No Neon/Hyperdrive service. No automatic duplicate writes or public mutation bypass established.",
            "originPart": 1
          },
          "registerLayer": "LEGACY_CODE_RECORD",
          "currentContinuationStatus": "CARRIED_EVIDENCE_SAME_BASELINE_NOT_NEW_EXECUTION",
          "currentContinuationReports": []
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "LOC-02",
      "memberIds": [
        "LOC-02"
      ],
      "kind": "application-code",
      "titleRu": "Неожиданная ошибка проверки compiled bundle может привести к удалению корректного bundle",
      "priority": "P2",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "LOC-02",
          "title": "Persisted bundle verifier converts unexpected runtime failures into integrity errors; reconciliation can delete a valid compiled bundle",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage8-final.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage8-final.json",
            "/workspace/work/audit-stage0/stage8-part2.json"
          ],
          "sourceStatus": "CONFIRMED_NATIVE_WITH_BOUNDED_HASH_FAILURE_UNFIXED",
          "sourcePriority": "P2",
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [],
          "currentStatus": "CARRIED_RECORD_NOT_NEWLY_REEXECUTED_IN_RESUMED_PARTS",
          "originalRecord": {
            "id": "LOC-02",
            "priority": "P2",
            "status": "CONFIRMED_NATIVE_WITH_BOUNDED_HASH_FAILURE_UNFIXED",
            "issue": "Persisted bundle verifier converts unexpected runtime failures into integrity errors; reconciliation can delete a valid compiled bundle",
            "location": "db/ui-translation-bundle-store.ts:149-176",
            "cause": "verifyPersistedCompiledBundle catches every exception, including TypeError from fingerprint/hash verification, and wraps PersistentBundleIntegrityError. Runtime store treats that as safe bundle miss; reconcilePersistedBundle treats it as proof to delete.",
            "reproductions": [
              "A valid French bundle is persisted and independently valid before fault injection. One crypto.subtle.digest rejection during actual reconciliation returns deleted and removes the compiled bundle row.",
              "One digest rejection after real DB connection and inside bundle verification is reported as invalid-bundle; actual resource-loader/runtime serves English heading while the valid French compiled bundle row remains."
            ],
            "controls": [
              "Healthy bundle returns current and serves French without raw-namespace read.",
              "Actual incompatible version is deleted as intended.",
              "Unknown SQL42501 query error remains visible and is not converted to deletion."
            ],
            "limits": "Local PostgreSQL17 and actual store/adapter/loader/runtime, hash error injected after successful connection. No production incidence claim, no raw translation deletion: affected persistent object is the compiled bundle.",
            "evidence": [
              "stage8-part2-bundle-evidence.json",
              "work/audit-stage8-part2/bundle-safety.test.ts"
            ],
            "originPart": 2
          },
          "registerLayer": "LEGACY_CODE_RECORD",
          "currentContinuationStatus": "CARRIED_EVIDENCE_SAME_BASELINE_NOT_NEW_EXECUTION",
          "currentContinuationReports": []
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "LOC-03",
      "memberIds": [
        "LOC-03"
      ],
      "kind": "application-code",
      "titleRu": "Параметризованный i18next nesting проходит мимо проверки разрешённых токенов",
      "priority": "P2",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "LOC-03",
          "title": "Unexpected parameterized i18next nesting bypasses controlled-token validation and is evaluated at render time",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage8-final.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage8-final.json",
            "/workspace/work/audit-stage0/stage8-part2.json",
            "/workspace/work/audit-stage0/stage8-part5.json"
          ],
          "sourceStatus": "CONFIRMED_VALIDATION_RAW_PG_COMPILED_RUNTIME_UNFIXED",
          "sourcePriority": "P2",
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [],
          "currentStatus": "CARRIED_RECORD_NOT_NEWLY_REEXECUTED_IN_RESUMED_PARTS",
          "originalRecord": {
            "id": "LOC-03",
            "priority": "P2",
            "status": "CONFIRMED_VALIDATION_RAW_PG_COMPILED_RUNTIME_UNFIXED",
            "issue": "Unexpected parameterized i18next nesting bypasses controlled-token validation and is evaluated at render time",
            "location": "app/localization/translation-validation.ts:134-140",
            "cause": "controlledTokens detects only $t(key) forms ending immediately after the key; valid i18next $t(key, JSON-options) syntax is omitted from token comparison.",
            "repro": "For canonical heading with no approved nesting, payload $t(common:stageSummary, {\"lng\":\"en\"}) passes validateProviderOutput. An approved machine fixture row in actual PostgreSQL is accepted by DatabaseMachineTranslationSource, compiled and persisted, then runtime heading becomes canonical English stageSummary text.",
            "controls": [
              "Simple foreign $t(common:stageSummary) is rejected with Controlled token mismatch.",
              "Ordinary French heading is preserved through bundle persistence."
            ],
            "limits": "Actual generation consumer/conditional publication path is not executed in this part; approved machine fixture is inserted directly. Actual shared validator, source, bundle compiler/store and i18next runtime executed. No XSS, code execution or private-data disclosure claim.",
            "evidence": [
              "stage8-part2-bundle-evidence.json",
              "work/audit-stage8-part2/bundle-safety.test.ts"
            ],
            "originPart": 2
          },
          "registerLayer": "LEGACY_CODE_RECORD",
          "currentContinuationStatus": "CARRIED_EVIDENCE_SAME_BASELINE_NOT_NEW_EXECUTION",
          "currentContinuationReports": []
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "LOC-04",
      "memberIds": [
        "LOC-04"
      ],
      "kind": "application-code",
      "titleRu": "При загрузке истории показывается сообщение о восстановлении вложений",
      "priority": "P3",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "LOC-04",
          "title": "Pending published-message history query displays attachment-restoration status in all three supported UI languages.",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage8-final.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage8-final.json",
            "/workspace/work/audit-stage0/stage8-part3.json"
          ],
          "sourceStatus": "CONFIRMED_COMPONENT_EN_RU_HE_UNFIXED",
          "sourcePriority": "P3",
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [],
          "currentStatus": "CARRIED_RECORD_NOT_NEWLY_REEXECUTED_IN_RESUMED_PARTS",
          "originalRecord": {
            "id": "LOC-04",
            "priority": "P3",
            "status": "CONFIRMED_COMPONENT_EN_RU_HE_UNFIXED",
            "location": "app/forum/views.tsx:2861",
            "issue": "Pending published-message history query displays attachment-restoration status in all three supported UI languages.",
            "cause": "historyFetcher pending branch reuses t(editorAttachmentRestoring), whose canonical/manual values describe restoring saved attachments.",
            "reproduction": "Actual TopicView in real memory data router, actual localized resource loader/i18next; clicking Edit history sends readPostHistory/postId. Deferred action exposes wrong status; releasing action with revision data replaces status with correct history.",
            "observed": {
              "en": "Restoring saved attachments…",
              "ru": "Восстанавливаем сохранённые вложения…",
              "he": "משחזר קבצים מצורפים שמורים…"
            },
            "limits": "jsdom component test with bounded deferred route action, no real browser/server latency measurement; history response rendering works. No history authorization or data-loss claim.",
            "evidence": "work/audit-stage8-part3/history-label.test.tsx",
            "originPart": 3
          },
          "registerLayer": "LEGACY_CODE_RECORD",
          "currentContinuationStatus": "CURRENT_SOURCE_COPY_RECONFIRMED",
          "currentContinuationReports": [
            "/workspace/work/audit/repo/work/audit-code-continuation/views/review.json"
          ],
          "currentContinuationLimit": "History loading uses attachment-restoration label; old locale/component test retained. New history overflow has separate cause."
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "LOC-05",
      "memberIds": [
        "LOC-05"
      ],
      "kind": "application-code",
      "titleRu": "Быстрое переключение политики A–B–A может потерять нужное поколение задачи",
      "priority": "P2",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "LOC-05",
          "title": "Fresh A-B-A UI generation policy planning can lose needed work when original A is still pending, because known non-stale task is returned with superseded generation.",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage8-final.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage8-final.json",
            "/workspace/work/audit-stage0/stage8-part10.json",
            "/workspace/work/audit-stage0/stage8-part4.json",
            "/workspace/work/audit-stage0/stage8-part6.json",
            "/workspace/work/audit-stage0/stage8-part7.json"
          ],
          "sourceStatus": "CONFIRMED_NATIVE_PLANNER_DISPATCH_CONSUMER_EXECUTOR_RECONCILIATION_UNFIXED",
          "sourcePriority": "P2",
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [],
          "currentStatus": "CARRIED_RECORD_NOT_NEWLY_REEXECUTED_IN_RESUMED_PARTS",
          "originalRecord": {
            "id": "LOC-05",
            "priority": "P2",
            "status": "CONFIRMED_NATIVE_PLANNER_DISPATCH_CONSUMER_EXECUTOR_RECONCILIATION_UNFIXED",
            "location": "db/translation-task-store.ts:464",
            "issue": "Fresh A-B-A UI generation policy planning can lose needed work when original A is still pending, because known non-stale task is returned with superseded generation.",
            "cause": "upsertPending returns an existing row immediately whenever status is not stale; it does not record returning fresh planning occurrence as a new generation when existing A is pending and head already belongs to B.",
            "reproduction": "Actual UiTranslationService.planAndDispatch with current registered inactive fr and real canonical heading, local fixture suppressing unrelated units, actual persistent dispatcher/Drizzle store/PostgreSQL: policy-a -> policy-b -> policy-a while first A pending returns generations1,2,1. Actual executor at current policy-a drains A/B/A as stale generation-superseded, stale policy-changed, terminal. Zero provider calls/translation rows; both tasks stale and no recovery candidates remain.",
            "controls": [
              "Same returning A plan after original A has already become stale receives generation3 and consumer is eligible.",
              "Another fresh A plan after failed lifecycle drain also reactivates same id with generation3.",
              "Duplicate live claim metadata preserved; delayed old processing and completed identities cannot regain current publication rights in existing native controls."
            ],
            "expectedContract": "PROVIDERS_AND_JOBS.md requires eligible returning fresh A-B-A plan to receive a newer authoritative ordering position, while old delivery alone cannot move head.",
            "limits": "Internal foundation path, actual local PostgreSQL17 and all45 migrations; no production incidence, real Queue/service or provider behavior claim. Demonstrated with generation policy returning A, not by editing source files. Recovery requires an additional later fresh plan once A has become stale; identity is not permanently forbidden. No stale result publication demonstrated.",
            "evidence": [
              "stage8-part4-lifecycle-evidence.json",
              "work/audit-stage8-part4/lifecycle.test.ts"
            ],
            "originPart": 4
          },
          "registerLayer": "LEGACY_CODE_RECORD",
          "currentContinuationStatus": "CARRIED_EVIDENCE_SAME_BASELINE_NOT_NEW_EXECUTION",
          "currentContinuationReports": []
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "LOC-06",
      "memberIds": [
        "LOC-06"
      ],
      "kind": "application-code",
      "titleRu": "Запрос генерации для сообщения только с вложением завершается ошибкой 500",
      "priority": "P3",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "LOC-06",
          "title": "Enabled generation POST for valid attachment-only current post throws and becomes HTTP500 instead of original-safe no-work outcome.",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage8-final.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage8-final.json",
            "/workspace/work/audit-stage0/stage8-part7.json"
          ],
          "sourceStatus": "CONFIRMED_NATIVE_FORUM_READ_ACTION_CAPABILITY_PLANNER_FRAMEWORK_HTTP500_UNFIXED",
          "sourcePriority": "P3",
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [],
          "currentStatus": "CARRIED_RECORD_NOT_NEWLY_REEXECUTED_IN_RESUMED_PARTS",
          "originalRecord": {
            "id": "LOC-06",
            "priority": "P3",
            "status": "CONFIRMED_NATIVE_FORUM_READ_ACTION_CAPABILITY_PLANNER_FRAMEWORK_HTTP500_UNFIXED",
            "location": "app/localization/content-post-body-planning.ts:137; app/forum/actions.server.ts:264",
            "issue": "Enabled generation POST for valid attachment-only current post throws and becomes HTTP500 instead of original-safe no-work outcome.",
            "cause": "Topic action permits existing attachment-only postId and passes empty authoritative body to automatic/explicit capability. Planner calls source resolver before any empty-unit guard. Resolver normalizeRevision rejects blank originalContent; action only catches planning-availability error, so React Router static handler returns500.",
            "reproduction": "All45 migrations; current native post body empty with linked type-checked attachment metadata. Actual DrizzleForumRepository.readTopicPage -> actual topicAction -> DefaultContentGenerationActionCapability -> real planner/resolver -> actual React Router createStaticHandler.query. Both generatePostBodyTranslation and generateExplicitPostBodyTranslation return static statusCode500 with original content must be a non-blank string. No task/budget mutation.",
            "controls": [
              "Same framework route with ordinary nonempty prose returns202 queued.",
              "Same framework route with nonempty fenced-code-only body returns200 no-op/no-translatable-content and no task/budget.",
              "Current message/revision unchanged by failed generation request."
            ],
            "limits": "Local enabled generation runtime with injected authorized actor capability; actual native forum read/action/planner/framework executed. Physical attachment object/service not accessed, metadata fixture sufficient for route. Default Worker generation is disabled and normal loader omits controls for attachment-only posts. No live server/production incidence, data loss, auth bypass or budget-loss claim.",
            "evidence": [
              "stage8-part7-body-planning-evidence.json",
              "work/audit-stage8-part7/body-planning.test.ts"
            ],
            "originPart": 7
          },
          "registerLayer": "LEGACY_CODE_RECORD",
          "currentContinuationStatus": "CARRIED_EVIDENCE_SAME_BASELINE_NOT_NEW_EXECUTION",
          "currentContinuationReports": []
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "LOC-07",
      "memberIds": [
        "LOC-07"
      ],
      "kind": "application-code",
      "titleRu": "Защита перевода не охватывает структуру собственных таблиц и спойлеров",
      "priority": "P2",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "LOC-07",
          "title": "Protected translation does not protect custom forum tables/spoilers: provider can remove or introduce structures and result is accepted as current translation.",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage8-final.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage8-final.json",
            "/workspace/work/audit-stage0/stage8-part8.json",
            "/workspace/work/audit-stage0/stage8-part9.json"
          ],
          "sourceStatus": "CONFIRMED_INTERNAL_EXECUTOR_PUBLICATION_READ_RENDER_UNFIXED",
          "sourcePriority": "P2",
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [],
          "currentStatus": "CARRIED_RECORD_NOT_NEWLY_REEXECUTED_IN_RESUMED_PARTS",
          "originalRecord": {
            "id": "LOC-07",
            "priority": "P2",
            "status": "CONFIRMED_INTERNAL_EXECUTOR_PUBLICATION_READ_RENDER_UNFIXED",
            "location": "app/localization/content-markdown-translation.ts:98,147,199; app/forum/markdown.tsx:378",
            "issue": "Protected translation does not protect custom forum tables/spoilers: provider can remove or introduce structures and result is accepted as current translation.",
            "cause": "Protection uses CommonMark+strikethrough AST, treating custom table/spoiler markup as text. Renderer independently segments custom structures before CommonMark. Structure signature erases translated text, thus cannot observe changes to custom markup.",
            "reproduction": "Ordinary prose provider output for valid source table/spoiler removes structures; plain source provider output containing valid table/spoiler creates structures. All4 cases consumer/executor/router/publisher returns published+ack, one fake publication, no failure, current ContentTranslationService selects translation, actual ForumMarkdown SSR changes table/details presence.",
            "controls": [
              "Both custom source structures survive identity restoration/rendering.",
              "Standard CommonMark block injection rejected and exact original preserved.",
              "No real provider/service, original revision unchanged."
            ],
            "limits": "Fake provider/task/persistence boundary, actual internal consumer/executor/publisher/read/SSR. No native DB publication in this part, browser layout or real-provider incidence. Spoiler is public presentation, no private-data disclosure or XSS claim. Default Worker generation disabled.",
            "evidence": [
              "stage8-part8-markdown-evidence.json",
              "work/audit-stage8-part8/pipeline.test.tsx"
            ],
            "originPart": 8
          },
          "registerLayer": "LEGACY_CODE_RECORD",
          "currentContinuationStatus": "CARRIED_EVIDENCE_SAME_BASELINE_NOT_NEW_EXECUTION",
          "currentContinuationReports": []
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "LOC-08",
      "memberIds": [
        "LOC-08"
      ],
      "kind": "application-code",
      "titleRu": "Перевод теряет явное направление абзаца либо ошибочно отклоняет экранированный текст",
      "priority": "P3",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "LOC-08",
          "title": "Translation restoration loses explicit paragraph/heading/list direction; escaped literal direction source can terminalize an intact valid translation.",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage8-final.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage8-final.json",
            "/workspace/work/audit-stage0/stage8-part8.json",
            "/workspace/work/audit-stage0/stage8-part9.json"
          ],
          "sourceStatus": "CONFIRMED_INTERNAL_EXECUTOR_PUBLICATION_READ_RENDER_UNFIXED",
          "sourcePriority": "P3",
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [],
          "currentStatus": "CARRIED_RECORD_NOT_NEWLY_REEXECUTED_IN_RESUMED_PARTS",
          "originalRecord": {
            "id": "LOC-08",
            "priority": "P3",
            "status": "CONFIRMED_INTERNAL_EXECUTOR_PUBLICATION_READ_RENDER_UNFIXED",
            "location": "app/localization/content-markdown-translation.ts:128,196; app/markdown-syntax.ts:94,100",
            "issue": "Translation restoration loses explicit paragraph/heading/list direction; escaped literal direction source can terminalize an intact valid translation.",
            "cause": "parseForumMarkdown consumes raw direction token into data.hProperties; generic serializer emits no token. Canonical protected tree is built after metadata already lost, so final structural equality accepts loss. For escaped literal source, generic serializer removes escape and reparsing recognizes direction, causing protected-structure mismatch.",
            "reproduction": "Identity restored paragraph/heading/list rtl source renders auto. Actual pipeline Russian ltr source -> Hebrew prose preserving tokens publishes and current reader selects translated block dir auto. Escaped literal source marker with intact semantic translation terminates provider-output-invalid, no publication, original selected.",
            "controls": [
              "Normal provider text adding active direction is rejected as structural mismatch.",
              "Original revision/content remains intact."
            ],
            "limits": "SSR attributes and internal fake-provider/stores verified, actual visual bidi/browser effects not tested. No live provider/production incidence. P3 formatting/availability effect.",
            "evidence": [
              "stage8-part8-markdown-evidence.json",
              "work/audit-stage8-part8/validation.test.tsx",
              "work/audit-stage8-part8/pipeline.test.tsx"
            ],
            "originPart": 8
          },
          "registerLayer": "LEGACY_CODE_RECORD",
          "currentContinuationStatus": "CARRIED_EVIDENCE_SAME_BASELINE_NOT_NEW_EXECUTION",
          "currentContinuationReports": []
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "LOC-09",
      "memberIds": [
        "LOC-09"
      ],
      "kind": "application-code",
      "titleRu": "Отклонённый перевод с завершённой задачей старой политики застревает в converging",
      "priority": "P2",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "LOC-09",
          "title": "Rejected same-revision legacy translation with completed old-policy task gets stuck in converging presentation, suppressing both automatic and explicit recovery.",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage8-final.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage8-final.json",
            "/workspace/work/audit-stage0/stage8-part11.json"
          ],
          "sourceStatus": "CONFIRMED_NATIVE_LOADER_PLANNER_REPAIR_AND_DOM_CONTROLS_UNFIXED",
          "sourcePriority": "P2",
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [],
          "currentStatus": "CARRIED_RECORD_NOT_NEWLY_REEXECUTED_IN_RESUMED_PARTS",
          "originalRecord": {
            "id": "LOC-09",
            "priority": "P2",
            "status": "CONFIRMED_NATIVE_LOADER_PLANNER_REPAIR_AND_DOM_CONTROLS_UNFIXED",
            "location": "app/localization/content-generation-view.ts:77; db/hyperdrive-content-generation-status.ts:185",
            "issue": "Rejected same-revision legacy translation with completed old-policy task gets stuck in converging presentation, suppressing both automatic and explicit recovery.",
            "cause": "Status reader maps current-generation completed task for matching revision irrespective of protected-policy version. View maps any completed+original pair to converging even when presentation fallbackReason invalid is persistent; automatic=false,explicitRequired=false. Manager only polls those units, so reads do not invoke repair planner.",
            "reproduction": "All45 migrations, immutable source quote Alice. Valid synthetic old-policy specification cnt04-commonmark-v1 inserted through actual planning store and marked completed; same-revision machine translation changing Alice->Mallory stored through actual translation store. Actual topic loader with native status/presentation and injected authorized actor selects original/invalid, unit converging/no-auto/no-explicit; repeat read unchanged. Current actual planner creates generation2 under cnt06-quote-attribution-v1; actual native executor repairs quote metadata and loader becomes translation/current.",
            "controls": [
              "Absent task/translation -> idle automatic=true.",
              "Valid stored translation with completed task ->current automatic=false.",
              "Current direct planner plus native execution repairs rejected legacy row.",
              "Actual DOM projection displays synchronization and no POST/button. Existing finite15poll control retained; no infinite request-loop claim."
            ],
            "limits": "Synthetic legacy rows built under current all45 schema/helpers and explicitly tagged old policy; not a byte-for-byte replay of historical provider runtime. Authorized actor/capability injected, current loader/native readers/planner/executor actual. Default Worker generation disabled. No production dataset/incidence or real provider/deployment checked. Browser controls bounded to queue fixture; full app browser still pending.",
            "evidence": [
              "stage8-part11-presentation-evidence.json",
              "work/audit-stage8-part11/presentation.test.tsx",
              "work/audit-stage8-part11/ui.test.tsx"
            ],
            "originPart": 11
          },
          "registerLayer": "LEGACY_CODE_RECORD",
          "currentContinuationStatus": "CARRIED_EVIDENCE_SAME_BASELINE_NOT_NEW_EXECUTION",
          "currentContinuationReports": []
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "SEC-01",
      "memberIds": [
        "SEC-01"
      ],
      "kind": "application-code",
      "titleRu": "Неожиданные ошибки профиля передают неопубликованный текст и SQL-параметры логгеру",
      "priority": "P3",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "SEC-01",
          "title": "Unexpected profile database errors send unpublished form text and SQL parameters to the default request logger",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage10-part2.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage10-part2.json"
          ],
          "sourceStatus": null,
          "sourcePriority": "P3",
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [],
          "currentStatus": "CARRIED_RECORD_NOT_NEWLY_REEXECUTED_IN_RESUMED_PARTS",
          "originalRecord": {
            "id": "SEC-01",
            "priority": "P3",
            "title": "Unexpected profile database errors send unpublished form text and SQL parameters to the default request logger",
            "locations": [
              "app/entry.server.tsx:1",
              "app/routes/profile.tsx:65",
              "workers/app.ts:23",
              "db/forum-repository.ts:520"
            ],
            "cause": "Entry module exports no request-level handleError. Current ReactRouter8.3.1 default handler console.error receives the raw error; DrizzleQueryError contains query/params. Profile action rethrows unexpected database errors,so its validated but uncommitted form fields reach that logger before SSR ErrorBoundary sanitation. reportSsrStreamError only covers after-shell stream errors.",
            "observed": "Real profile POST through production createRequestHandler,current profile module+root+SSR entry+ErrorBoundary and actual Drizzle/PostgreSQL45migrated DB. Injected temporary trigger raised23514 with fixed backend text containing no marker. Console.error received unpublished biography marker and SQL params. Stored biography stayed at prior baseline. Actual HTML500 ErrorBoundary rendered(data-status500),HTTPbody didnot contain marker.",
            "controls": [
              "Healthy save persisted then302 withno error log.",
              "Native150ms lock timeout mapped503 withoutdefaultrequestlogger call andwithout storedmutation.",
              "Validation400 andforeignOrigin403 producedno rawerrorlogs.",
              "Separate resource-route projection reproduced same logging independently from SSR."
            ],
            "impact": "Failure handling writes user-entered/unpublished form content into operational logs despite UI sanitation.",
            "bounds": "P3 privacy/logging exposure under unexpected DB failure,not public HTTP disclosure. No realcredentials/sessiontokens leaked/tested,no proof of access to logs by unauthorized people orproductionincident. Backend fault deliberately injected locally;sessionidentity injected,normal DB writer and actualdocument modules/SSR used. Handassembled server manifest,notdeployedWorker/full browser verification.",
            "fixed": false,
            "evidence": "stage10-part2-logging-evidence.json"
          },
          "registerLayer": "LEGACY_CODE_RECORD",
          "currentContinuationStatus": "CARRIED_EVIDENCE_SAME_BASELINE_NOT_NEW_EXECUTION",
          "currentContinuationReports": []
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "RES-EDITOR-02",
      "memberIds": [
        "RES-EDITOR-02"
      ],
      "kind": "application-code",
      "titleRu": "Backspace в начале второго обычного абзаца не соединяет абзацы в Простом режиме",
      "priority": "P3",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "RES-EDITOR-02",
          "status": "CONFIRMED_COMPONENT_UI_DEFECT",
          "title": "Simple Backspace at start of ordinary second paragraph cannot remove paragraph boundary",
          "severity": "Limited editing/UI defect; no persisted loss or security severity established",
          "evidence": "/workspace/work/audit/repo/work/audit-resumed-part3/boundary-evidence.json",
          "report": "/workspace/work/audit-resumed/part3.md",
          "controls": "Caret offset0 verified; within-leaf deletion works; same source boundary removable in Advanced.",
          "limits": [
            "Isolated actual component Chromium harness; no publication/session/database.",
            "Other blocks/browsers and cross-block selection not covered."
          ],
          "registerLayer": "OWN_RESUMED_FINDING",
          "attribution": "Own recorded resumed execution; not a blind independent audit after exposure to prior findings."
        }
      ],
      "attribution": "Own recorded resumed execution; not a blind independent audit after exposure to prior findings.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "RES-UI-01",
      "memberIds": [
        "RES-UI-01"
      ],
      "kind": "application-code",
      "titleRu": "Меню дополнительных инструментов редактора расширяет страницу на 320 px",
      "priority": "P3",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "RES-UI-01",
          "status": "CONFIRMED_COMPONENT_PREVIEW_LAYOUT_DEFECT",
          "title": "Opening editor More tools at 320px creates page-wide horizontal overflow in English and Hebrew",
          "severity": "Responsive UI defect; controls extend beyond viewport. Inability to reach via horizontal scroll or WCAG conformance failure not established.",
          "evidence": "/workspace/work/audit/repo/work/audit-resumed-part7/diagnostic-evidence.json",
          "report": "/workspace/work/audit-resumed/part7.md",
          "reproduction": [
            "Local shared SectionView preview, section-form-error/user, viewport320x900.",
            "Open first .markdown-editor-extra-menu summary by ordinary click.",
            "Document width changes320 to410 for both en and he; visible menu buttons cross viewport boundaries."
          ],
          "cause": "Absolute popup anchored at inline-start of toolbar summary; width min(18rem,75vw) does not account for remaining viewport space. CSS app/styles.css:9288,9303.",
          "limits": [
            "One fixture and viewport in Chromium; no mobile device or publication tested.",
            "Closed-details descendants were geometric false positives and excluded.",
            "Distinct from known manager account-header overflow."
          ],
          "registerLayer": "OWN_RESUMED_FINDING",
          "attribution": "Own recorded resumed execution; not a blind independent audit after exposure to prior findings."
        }
      ],
      "attribution": "Own recorded resumed execution; not a blind independent audit after exposure to prior findings.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "RES-A11Y-01",
      "memberIds": [
        "RES-A11Y-01"
      ],
      "kind": "application-code",
      "titleRu": "Редактируемое текстовое поле Простого режима не имеет доступного имени",
      "priority": "P2",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "RES-A11Y-01",
          "status": "CONFIRMED_CHROMIUM_ACCESSIBLE_NAME_DEFECT",
          "title": "Simple editable textbox is exposed without an accessible name, including when reached by native Tab",
          "severity": "Accessibility/usability defect; no security severity or universal screen-reader verdict assigned",
          "report": "/workspace/work/audit-resumed/part14.md",
          "evidence": "/workspace/work/audit/repo/work/audit-resumed-part14/name-diagnostic.json",
          "matrixEvidence": "/workspace/work/audit/repo/work/audit-resumed-part14/browser-evidence.json",
          "reproduction": [
            "Shared editor-create-topic preview, English1280.",
            "Native Tab35 steps focuses span[role=textbox][contenteditable=true].",
            "Chromium AX focused textbox name is empty.",
            "Switch Advanced, click actual textarea: focused textbox name First message."
          ],
          "cause": "Visual Markdown editable leaf declares role=textbox but lacks aria-label/aria-labelledby or associated label. Label on ancestor section does not provide a name to this child textbox in observed AX tree.",
          "source": "app/forum/visual-markdown-editor.tsx:324",
          "limits": [
            "Unnamed textbox observed on six EN/HE fixture states; focused diagnostic only English create topic.",
            "Actual screen reader speech, other browsers, nonempty multi-paragraph variants and full WCAG conformance not tested.",
            "Outer visual section has a label, but that does not remove observed unnamed leaf; Advanced is positive control."
          ],
          "registerLayer": "OWN_RESUMED_FINDING",
          "attribution": "Own recorded resumed execution; not a blind independent audit after exposure to prior findings."
        }
      ],
      "attribution": "Own recorded resumed execution; not a blind independent audit after exposure to prior findings.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "CODE-PREVIEW-01",
      "memberIds": [
        "CODE-PREVIEW-01"
      ],
      "kind": "preview",
      "titleRu": "Сценарий подтверждения лучшего ответа открывается решённым и не показывает подтверждение",
      "priority": "P3",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "CODE-PREVIEW-01",
          "status": "CONFIRMED_PREVIEW_SCENARIO_DEFECT",
          "title": "Dedicated best-answer confirmation scenario routes to solved topic without author controls",
          "scope": "UI preview catalog; no claim of broken production topic decision or permission bypass",
          "source": "app/ui-preview/preview-app.tsx:1547",
          "cause": "Specific /:locale/topics/:topicId route uses PreviewTopicRoute, whose solved calculation omits topic-best-answer-unsolved and whose topicData call does not pass solutionAuthor. Correct special-case in previewElement cannot serve this matching route.",
          "observed": {
            "urlHasSolutionPrompt": true,
            "topicIsSolved": true,
            "canManageSolution": false,
            "isTopicAuthor": false,
            "confirmationPresent": false,
            "sameComponentIntendedPropsControlConfirmationPresent": true
          },
          "report": "/workspace/work/audit/repo/work/audit-code-continuation/styles-preview/review.md",
          "evidence": "/workspace/work/audit/repo/work/audit-code-continuation/styles-preview/scenario-evidence.json",
          "priority": "Preview/tooling correctness; no security severity assigned",
          "limits": [
            "jsdom actual router/component, props observed through forwarding wrapper.",
            "Positive control changes test props only; implementation unchanged.",
            "Other preview states not exhaustively exercised."
          ],
          "registerLayer": "OWN_CURRENT_CONTINUATION_FINDING",
          "attribution": "Own recorded continuation execution; not a blind independent audit after exposure to prior findings."
        }
      ],
      "attribution": "Own recorded continuation execution; not a blind independent audit after exposure to prior findings.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "CODE-PREVIEW-02",
      "memberIds": [
        "CODE-PREVIEW-02"
      ],
      "kind": "preview",
      "titleRu": "Вкладка Appeals (1) стенда показывает пустую очередь",
      "priority": "P3",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "CODE-PREVIEW-02",
          "status": "CONFIRMED_PREVIEW_FILTER_DEFECT",
          "title": "Appeals preview group shows count one but empty queue",
          "scope": "UI preview only; production queue not implicated",
          "source": "app/ui-preview/preview-app.tsx:1189",
          "cause": "Selected group appeals is compared directly with fixture kind appeal; no plural-group mapping.",
          "observed": {
            "appealsLabel": "Appeals (1)",
            "appealsCaseCount": 0,
            "duplicateControlCaseCount": 1
          },
          "report": "/workspace/work/audit/repo/work/audit-code-continuation/styles-preview/part2.md",
          "evidence": "/workspace/work/audit/repo/work/audit-code-continuation/styles-preview/appeals-evidence.json",
          "priority": "Preview/tooling correctness; no security severity assigned",
          "limits": [
            "Actual component/router in jsdom; no production or native-browser test."
          ],
          "registerLayer": "OWN_CURRENT_CONTINUATION_FINDING",
          "attribution": "Own recorded continuation execution; not a blind independent audit after exposure to prior findings."
        }
      ],
      "attribution": "Own recorded continuation execution; not a blind independent audit after exposure to prior findings.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "CODE-SEARCH-01",
      "memberIds": [
        "CODE-SEARCH-01"
      ],
      "kind": "application-code",
      "titleRu": "После возврата назад поле поиска не соответствует адресу и результатам",
      "priority": "P3",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "CODE-SEARCH-01",
          "status": "CONFIRMED_LOCAL_ROUTE_COMPONENT_DEFECT",
          "title": "Search query input remains at later value after back navigation to earlier results",
          "scope": "Application search UI",
          "source": "app/forum/views.tsx:457",
          "cause": "Uncontrolled input defaultValue changes with loaded query, but current dirty input value stays unchanged on reused route.",
          "observed": {
            "scope": "Actual search route loader and component; memory router back navigation and form submission, jsdom; fake search repository only.",
            "queries": [
              "alpha",
              "beta",
              "alpha",
              "beta"
            ],
            "afterBack": {
              "url": "/en/search?q=alpha",
              "visibleInput": "beta",
              "defaultValue": "alpha",
              "renderedResults": "Results for “alpha”1 resultResult for alphaStarted by AuthorCategory / Section1Messages"
            },
            "resubmitWithoutEditing": {
              "url": "/en/search?q=beta",
              "query": "beta"
            }
          },
          "priority": "Low — search interface correctness",
          "report": "/workspace/work/audit/repo/work/audit-code-continuation/views/review.md",
          "evidence": "/workspace/work/audit/repo/work/audit-code-continuation/views/search-navigation-evidence.json",
          "limits": [
            "jsdom and memory router; actual route loader/component, fixed fake search repository. Native browser history not separately replayed."
          ],
          "registerLayer": "OWN_CURRENT_CONTINUATION_FINDING",
          "attribution": "Own recorded continuation execution; not a blind independent audit after exposure to prior findings."
        }
      ],
      "attribution": "Own recorded continuation execution; not a blind independent audit after exposure to prior findings.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "CODE-HISTORY-01",
      "memberIds": [
        "CODE-HISTORY-01"
      ],
      "kind": "application-code",
      "titleRu": "История правок расширяет узкую страницу вместо локального размещения текста",
      "priority": "P3",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "CODE-HISTORY-01",
          "status": "CONFIRMED_NATIVE_BROWSER_LAYOUT_DEFECT",
          "title": "Published revision history causes document overflow on narrow viewport",
          "scope": "Application post-history UI",
          "source": "app/forum/views.tsx:2872; app/styles.css:8081",
          "cause": "Raw revision pre retains white-space:pre and visible overflow; mobile display:contents/grid layout also leaves history at auto grid column.",
          "observed": [
            {
              "viewport": 320,
              "before": 320,
              "historyOpen": 789,
              "closedAgain": 320
            },
            {
              "viewport": 1280,
              "before": 1280,
              "historyOpen": 1280,
              "closedAgain": 1280
            }
          ],
          "priority": "Low — mobile history layout",
          "report": "/workspace/work/audit/repo/work/audit-code-continuation/styles/review.md",
          "evidence": "/workspace/work/audit/repo/work/audit-code-continuation/styles-preview/layout/evidence.json",
          "limits": [
            "Code review does not certify every possible viewport/content/theme/assistive technology combination.",
            "Native reproduction is EN/light with one ordinary 93-character source line, fixed local history response, no real history permission/database flow."
          ],
          "registerLayer": "OWN_CURRENT_CONTINUATION_FINDING",
          "attribution": "Own recorded continuation execution; not a blind independent audit after exposure to prior findings."
        }
      ],
      "attribution": "Own recorded continuation execution; not a blind independent audit after exposure to prior findings.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "M-M07",
      "memberIds": [
        "M-M07"
      ],
      "kind": "application-code",
      "titleRu": "Английская шапка менеджера переполняется при ширине 320 px",
      "priority": "P3",
      "currentStatus": "OPEN_UNFIXED_SELECTED_REPRODUCTION",
      "records": [
        {
          "id": "M-M07",
          "sourceSeverity": "Medium",
          "claim": "Manager-header переполняется на 320 px: около 75 px в English и 32 px в Hebrew.",
          "status": "PARTIALLY_CONFIRMED",
          "severityAssessment": "EN_OVERFLOW_CONFIRMED_ORIGINAL_METRICS_AND_HE_NOT_REPRODUCED",
          "verification": {
            "fact": "EN manager home fixture at320px documentWidth357; account content348/client302; screenshot shows clipped Sign out. HE320 has no reproduced overflow; at1280 neither document overflows.",
            "bounds": [
              "Original75pxEN/32pxHE not reproduced.",
              "Fresh built UI Preview fake identity/data; no production auth flow or exhaustive names/fonts/state matrix."
            ],
            "evidence": "/workspace/work/audit/repo/work/misha-verification-part7/browser-evidence.json",
            "report": "/workspace/work/misha-verification/part7.md"
          }
        }
      ],
      "attribution": "Own verification of Misha statement; not claimed as blind independent discovery.",
      "claimScope": "EN manager 320px document 357px only; original Hebrew and original measurements not reproduced."
    },
    {
      "id": "M-M10",
      "memberIds": [
        "M-M10"
      ],
      "kind": "application-code",
      "titleRu": "У проверенного навигационного текста светлой темы недостаточный контраст",
      "priority": "P2",
      "currentStatus": "OPEN_UNFIXED_SELECTED_REPRODUCTION",
      "records": [
        {
          "id": "M-M10",
          "sourceSeverity": "Medium",
          "claim": "Light accent palette не соответствует WCAG AA для ряда текстов и controls.",
          "status": "CONFIRMED",
          "severityAssessment": "SELECTED_NORMAL_TEXT_WCAG_AA_CONTRAST_FAILURE",
          "verification": {
            "fact": "Rendered navigation label Unanswered and HE counterpart at1280 use253,109,41 text over248,246,243 background,13.12px. Contrast2.6322:1 below4.5:1.",
            "bounds": [
              "Light theme and selected text only; logo excluded; not universal AA audit of all controls.",
              "Shared components in fake preview, not full production runtime. Refinement-stage/merge policy not changed."
            ],
            "evidence": "/workspace/work/audit/repo/work/misha-verification-part7/contrast-evidence.json",
            "report": "/workspace/work/misha-verification/part7.md"
          }
        }
      ],
      "attribution": "Own verification of Misha statement; not claimed as blind independent discovery.",
      "claimScope": "Selected 13.12px navigation text, light theme, 2.6322:1; not a universal palette verdict."
    }
  ],
  "counts": {
    "groups": 51,
    "application-code": 45,
    "preview": 2,
    "documentation": 4,
    "originalWorkingRecordIds": 50,
    "exactMishaAlias": "M-H01=ARCH-01",
    "disabledEditorFamily": "EDITOR-08 includes RES-EDITOR-01",
    "otherMishaStatementsKeptSeparate": 27
  },
  "otherMishaStatements": [
    {
      "id": "M-M01",
      "sourceSeverity": "Medium",
      "claim": "Документация противоречиво описывает permission model редактора и редактирования сообщений.",
      "status": "CONFIRMED",
      "severityAssessment": "DOCUMENTATION_CONFLICT_CONFIRMED_MEDIUM_NOT_ESTABLISHED",
      "verification": {
        "fact": "EDITOR.md285-286 restricts revision history to administrator/moderator roles and excludes ordinary users absolutely; AUTHORIZATION.md13-17,51 defines mutable grants/overrides and history.read as authoritative. Contradiction persists on current baseline.",
        "code": "topicAction readPostHistory branch checks forum.post.history.read, without role-name restriction. topic loader derives history visibility from same permission. edit loader and attachment guard require editOwn plus authoritative ownership, not history.read.",
        "testReport": "/workspace/work/audit/repo/work/misha-verification-part2/results.json",
        "bounds": [
          "Tests use actual post-edit loader and attachment authorization with fake session/reader/resolver: own+edit allowed, own+history only forbidden, foreign owner+edit forbidden; loader guest401 and missing404.",
          "Revision-history action behavior inspected in source, not separately executed in this part. No authorization bypass established.",
          "Do not silently rewrite requirements to resolve the two documents. This finding is a documentation conflict."
        ]
      }
    },
    {
      "id": "M-M02",
      "sourceSeverity": "Medium",
      "claim": "Граница `app ↔ db` размыта repository-specific типами и ошибками.",
      "status": "PARTIALLY_CONFIRMED",
      "severityAssessment": "COUPLING_OBSERVATION_NOT_ESTABLISHED_DEFECT",
      "verification": {
        "fact": "App request contexts reference ForumReader from repository and ForumWriter from adapter; mutations use db-defined errors. Scoped AST graph has51 app->db module edges,10 explicitly type-only.",
        "method": "AST static graph and targeted import review; modular-monolith contract read.",
        "bounds": [
          "No explicit prohibition found in inspected contract passages, not full re-audit of all architecture docs.",
          "Imports/coupling alone do not prove functional defect, client bundle leak or necessity of refactor. Medium not established.",
          "Server-side auth ORM/schema composition is expected wiring and not automatically counted as a defect."
        ],
        "graph": "/workspace/work/audit/repo/work/misha-verification-part3/graph.json",
        "report": "/workspace/work/misha-verification/part3.md"
      }
    },
    {
      "id": "M-M03",
      "sourceSeverity": "Medium",
      "claim": "Часть authoring/draft строк не имеет согласованных серверных ограничений размера.",
      "status": "PARTIALLY_CONFIRMED",
      "severityAssessment": "LIMIT_POLICY_GAP_CONFIRMED_IMPACT_NOT_ESTABLISHED",
      "verification": {
        "fact": "Current publishing actions read title/body without a length bound; ForumService normalizeRevision validates nonblank/locale but no maximum originalContent length; editPublishedPost checks body type without maximum. Revision schema uses text with no content-length check. Specific other fields do have limits; not all input is unbounded.",
        "testReport": "/workspace/work/audit/repo/work/misha-verification-part2/results.json",
        "tests": "Normal finite inputs only: title201 characters, body2090 characters pass unchanged through real service to fake repository; edit body likewise; blank title is rejected before repository.",
        "baselineCorrection": "Text draft/autosave runtime and repositories were removed in d72b27ca. Original draft portion cannot be carried forward as an active current defect. Historical draft_id field names still used for attachment operations do not imply text draft persistence.",
        "bounds": [
          "A title201 accepted does not prove a missing agreed200-character limit; 200 belongs to a different similar-question search path. No new product limit invented.",
          "No request-size stress, parser recursion probe, persistence test, actual database, production/service limit or DoS impact tested. Static code establishes lack of an explicit application maximum in selected paths; finite samples alone do not prove unbounded acceptance.",
          "Precise desired maximum and unit require a product policy before implementation; no arbitrary limit proposed here."
        ]
      }
    },
    {
      "id": "M-M04",
      "sourceSeverity": "Medium",
      "claim": "Персонализированные SSR pages не имеют явной общей `Cache-Control`/`Vary` policy.",
      "status": "PARTIALLY_CONFIRMED",
      "severityAssessment": "MEDIUM_NOT_ESTABLISHED",
      "verification": {
        "fact": "Prior own HTTP captures on identical current baseline show no Cache-Control or Vary on profile HTML/HEAD/single-fetch and authenticated notifications resource projection. Current entry, Worker wrapper and route source review show no global injection.",
        "reusedOwnEvidence": [
          "/workspace/work/audit/repo/work/audit-stage10-part5/http-evidence.json",
          "/workspace/work/audit-stage0/stage10-part5.json"
        ],
        "bounds": [
          "Prior captures reused, not counted as new test runs. Actual profile loader/component/root/SSR entry; manually assembled manifest includes synthetic root loader; locale parent absent.",
          "Notifications loader projected as resource route, not full actual notifications document. No enumeration of every personalized SSR page completed in this part.",
          "No cross-account cache disclosure established. Production cache/CDN/service behavior explicitly excluded.",
          "Local route-specific no-store policies exist, including attachments/mentions/presence and selected locale redirects. Vary alone is not a universal substitute for private/no-store."
        ]
      }
    },
    {
      "id": "M-M05",
      "sourceSeverity": "Medium",
      "claim": "Для HTML нет общей anti-framing/security-header policy.",
      "status": "PARTIALLY_CONFIRMED",
      "severityAssessment": "MEDIUM_NOT_ESTABLISHED",
      "verification": {
        "fact": "Prior actual profile HTML response has only Content-Type:text/html; no X-Frame-Options or CSP frame-ancestors. Current entry/root/Worker/locale wrapper review and targeted production-source header search show no common application HTML anti-framing policy.",
        "reusedOwnEvidence": [
          "/workspace/work/audit/repo/work/audit-stage10-part5/http-evidence.json",
          "/workspace/work/audit-stage0/stage10-part5.json"
        ],
        "bounds": [
          "No browser framing/clickjacking flow tested in this verification part; no concrete dangerous framed action established.",
          "Deployed proxy/platform headers not inspected and outside scope. No global assessment of every HTML endpoint or every possible security header.",
          "Attachment responses have their own sandbox/nosniff policies; that does not establish a policy for HTML pages.",
          "Absence of a hardening header is recorded as absence, not automatically a demonstrated exploitable vulnerability."
        ]
      }
    },
    {
      "id": "M-M06",
      "sourceSeverity": "Medium",
      "claim": "Основной CI запускается только на `pull_request`, без независимой проверки итогового `main`.",
      "status": "CONFIRMED",
      "severityAssessment": "TRIGGER_GAP_CONFIRMED_MEDIUM_NOT_ESTABLISHED",
      "verification": {
        "fact": "Primary ci.yml triggers only pull_request. Main push UI Preview workflow builds preview but does not repeat primary tests/database checks.",
        "bounds": [
          "Not equivalent to absence of every main check. PR merge-ref checks may test integration before merge.",
          "Branch protections, org-required checks, merge queue settings and actual execution history not queried."
        ],
        "evidence": "/workspace/work/audit/repo/work/misha-verification-part4/ci-evidence.json",
        "report": "/workspace/work/misha-verification/part4.md"
      }
    },
    {
      "id": "M-M08",
      "sourceSeverity": "Medium",
      "claim": "Section загружает все topics, а topic — все posts и attachments без pagination.",
      "status": "CONFIRMED",
      "severityAssessment": "PAGINATION_ABSENCE_CONFIRMED_MEDIUM_IMPACT_NOT_MEASURED",
      "verification": {
        "fact": "readSection2527 selects all topic rows in requested section, then tags. readTopicPage2574 selects all posts with revisions in requested topic, then metadata for their attachments. No page/cursor/limit/offset for these lists. Reader contracts accept ID only; actual loaders call these methods.",
        "method": "Targeted static source and route/view flow review; no SQL executed.",
        "bounds": [
          "Attachment metadata is read, not file bytes. Other repository methods have bounds; no claim all queries unpaginated.",
          "No latency, EXPLAIN, load or cost measurement. No severity Medium acceptance based on this inspection alone."
        ],
        "report": "/workspace/work/misha-verification/part3.md"
      }
    },
    {
      "id": "M-M09",
      "sourceSeverity": "Medium",
      "claim": "Section read-state получает forum-wide unread list и фильтрует его в приложении.",
      "status": "CONFIRMED",
      "severityAssessment": "QUERY_SCOPE_CONFIRMED_MEDIUM_IMPACT_NOT_MEASURED",
      "verification": {
        "fact": "Section loader passes only userId to readUnreadForUser then constructs section-only states in app. Repository query joins forum topics/posts and has no section predicate or pagination; uses grouping and array_agg for all unread topics. Internal reader delegates directly to repository.",
        "testReport": "/workspace/work/audit/repo/work/misha-verification-part2/results.json",
        "tests": "Real section loader with fake reader requests exactly(actor), receives inside/outside topics, returns only section state including read fallback. Guest does not call unread reader.",
        "bounds": [
          "No SQL executed or query plan measured in this part; repository query inspected statically.",
          "No observed production latency, bill or service problem claimed. Actual cardinality/performance impact unmeasured.",
          "Section route unchanged between old and current baseline; this issue is not removed by draft deletion."
        ]
      }
    },
    {
      "id": "M-M11",
      "sourceSeverity": "Medium",
      "claim": "Dependency governance не закрыт: advisory registry показал 8 high / 13 moderate / 4 low; audit/update gate в CI отсутствует.",
      "status": "PARTIALLY_CONFIRMED",
      "severityAssessment": "HISTORICAL_ADVISORY_COUNTS_AND_REPO_GATE_ABSENCE_CONFIRMED_APP_MEDIUM_NOT_ESTABLISHED",
      "verification": {
        "fact": "Retained raw report25 records,8High13Moderate4Low, same lock hash as current. No configured audit/update gate or repository dependabot/renovate config found.",
        "controls": "Exact dependency pins,frozen-lockfile,integrity present. Registry severity differs from application exploitability. Prior own stage10part4 condition review reused without rerunning probes.",
        "bounds": [
          "No fresh registry audit; no new dependency graph transmission or new auto-review rejection.",
          "No organization/server-side updater settings inspected. No blanket lack of governance or25 reachable forum vulnerabilities established."
        ],
        "rawAudit": "/workspace/work/audit/repo/work/audit-stage10-part1/audit-all.json",
        "rawAuditSha256": "47c4f1f881c661479764bc256bffbeda26e12dad2050f274d0e4456b6eba5fe1",
        "lockSha256": "1a8108bb9eaa6f46b3339fedb9bef8d598e5199e8a7a7d833a2a9445959cfef3",
        "priorOwnConditionAssessment": "/workspace/work/audit-stage0/stage10-part4-advisory-progress.json",
        "report": "/workspace/work/misha-verification/part8.md"
      }
    },
    {
      "id": "M-L01",
      "sourceSeverity": "Low",
      "claim": "Документация недостаточно отделяет текущее состояние от истории.",
      "status": "NOT_CONFIRMED_ON_CURRENT_BASELINE",
      "severityAssessment": "BLANKET_DOCUMENTATION_CLAIM_NOT_ESTABLISHED",
      "verification": {
        "fact": "Current PROJECT_STATE23-61 explicitly separates current drafts removal from retained historical Editor snapshots; block added after source baseline. README links separate PROJECT_HISTORY.",
        "bounds": [
          "Targeted passages only, not whole-documentation clean bill.",
          "Original report gives no exact counterexamples; retained dated history not automatically current requirements."
        ],
        "report": "/workspace/work/misha-verification/part6.md"
      }
    },
    {
      "id": "M-L02",
      "sourceSeverity": "Low",
      "claim": "Есть устаревшие UI/future claims и acceptance/archive references.",
      "status": "PARTIALLY_CONFIRMED",
      "severityAssessment": "HISTORICAL_UI_WORDING_AMBIGUOUS_ACCEPTANCE_REFERENCES_UNVERIFIED",
      "verification": {
        "fact": "UI_UX_PASS568 calls attachments/WYSIWYG future relative to old editor slice;645-646 describes future signup and Under development. Current editor and credential signup already implemented.",
        "bounds": [
          "Accumulated older slice/history context; misleading if read as current product status.",
          "Exact obsolete acceptance/archive refs not identified or verified; old owner acceptance not declared invalid.",
          "Drafts genuinely future after current removal."
        ],
        "report": "/workspace/work/misha-verification/part6.md"
      }
    },
    {
      "id": "M-L03",
      "sourceSeverity": "Low",
      "claim": "`db/forum-repository.ts`, `app/forum/views.tsx` и `app/styles.css` чрезмерно крупные.",
      "status": "PARTIALLY_CONFIRMED",
      "severityAssessment": "SOURCE_SIZE_OBSERVATION_NOT_ESTABLISHED_DEFECT",
      "verification": {
        "fact": "Measured files large, per graph fileSizes. Excessiveness criterion and concrete defect not established.",
        "sizes": [
          {
            "file": "db/forum-repository.ts",
            "lines": 3915,
            "bytes": 162943
          },
          {
            "file": "app/forum/views.tsx",
            "lines": 3079,
            "bytes": 129096
          },
          {
            "file": "app/styles.css",
            "lines": 9643,
            "bytes": 209186
          }
        ],
        "bounds": [
          "Source bytes, not compressed production bundle size.",
          "No full manual read of these three files in this part. No architectural changes or automatic split justified from line count alone."
        ],
        "evidence": "/workspace/work/audit/repo/work/misha-verification-part3/graph.json"
      }
    },
    {
      "id": "M-L04",
      "sourceSeverity": "Low",
      "claim": "Существует type-only dependency cycle.",
      "status": "CONFIRMED",
      "severityAssessment": "TYPE_DEPENDENCY_CYCLE_ONLY_RUNTIME_IMPACT_NOT_ESTABLISHED",
      "verification": {
        "fact": "profile-view.tsx5 imports type ProfileActionData from routes/profile.tsx; route imports ProfileView as value. Only nontrivial SCC in scoped static graph.",
        "method": "TypeScript AST SCC analysis plus transpileModule experiment with verbatimModuleSyntax; type import absent from emittedJS, component import retained.",
        "bounds": [
          "160 files; app/db/workers relative static imports/re-exports only; tests/declarations/ui-preview excluded. Dynamic imports, aliases, package imports and implicit uses not analyzed.",
          "Removing explicit type-only edges yields no cycles in this graph; not universal absence of runtime cycles.",
          "Compiler experiment not full typecheck/build or runtime execution. No initialization failure established."
        ],
        "graph": "/workspace/work/audit/repo/work/misha-verification-part3/graph.json",
        "compilerEvidence": "/workspace/work/audit/repo/work/misha-verification-part3/type-erasure.json"
      }
    },
    {
      "id": "M-L05",
      "sourceSeverity": "Low",
      "claim": "Есть неиспользуемые production exports.",
      "status": "PARTIALLY_CONFIRMED",
      "severityAssessment": "UNCONSUMED_EXPORT_NOT_DEAD_FUNCTION",
      "verification": {
        "fact": "normalizeForumTags exported at forum-service364; tracked word search finds only definition and internal call379, no external consumer.",
        "bounds": [
          "Function needed internally; exported surface unused, not dead function.",
          "No exhaustive export inventory or bundle-size benefit established; no removal proposed."
        ],
        "report": "/workspace/work/misha-verification/part6.md"
      }
    },
    {
      "id": "M-L06",
      "sourceSeverity": "Low",
      "claim": "Несколько domain constraints обеспечиваются только приложением.",
      "status": "PARTIALLY_CONFIRMED",
      "severityAssessment": "SPECIFIC_APP_ONLY_RULES_CONFIRMED_DEFECT_NOT_ESTABLISHED",
      "verification": {
        "fact": "Tag normalized name max64 and slash exclusion enforced by normalizeForumTags but absent from forum_tags declared CHECK/migration0021. Concrete instances of app-only rules.",
        "controls": "Posts have same-topic parent FK and parent-not-self CHECK. Empty-body CHECK removal is explicitly intentional in0039 for attachment-only publication.",
        "bounds": [
          "Original report does not identify exact constraints; cannot claim exhaustive match.",
          "No demonstrated invalid write through user flow, no requirement all service rules must be DB-enforced.",
          "Declared metadata and SQL read, no database execution."
        ],
        "evidence": "/workspace/work/audit/repo/work/misha-verification-part5/evidence.json",
        "report": "/workspace/work/misha-verification/part5.md"
      }
    },
    {
      "id": "M-L07",
      "sourceSeverity": "Low",
      "claim": "Publication receipts не имеют topic/post foreign keys.",
      "status": "CONFIRMED",
      "severityAssessment": "FK_ABSENCE_CONFIRMED_LIFECYCLE_DEFECT_NOT_ESTABLISHED",
      "verification": {
        "fact": "Receipt schema and migration0039 have owner FK only, no topic/post FK. No later migration reference adds such FKs.",
        "sourceFlow": "Writes receipt with fingerprint/IDs; replay validates fingerprint; topic/reply replay returns storedIDs before normal content checks.",
        "bounds": [
          "Deletion+replay not reproduced; no proven broken operation, orphan acceptance in liveDB or loss.",
          "Adding cascade FK without lifecycle/idempotency contract not justified.",
          "No actual PostgreSQL or external schema inspected."
        ],
        "evidence": "/workspace/work/audit/repo/work/misha-verification-part5/evidence.json",
        "report": "/workspace/work/misha-verification/part5.md"
      }
    },
    {
      "id": "M-L08",
      "sourceSeverity": "Low",
      "claim": "Три database tests параллельно используют один PostgreSQL client.",
      "status": "PARTIALLY_CONFIRMED",
      "severityAssessment": "DEPRECATED_QUEUE_USAGE_CONFIRMED_COUNT_THREE_NOT_REPRODUCED",
      "verification": {
        "fact": "Four direct Promise.all groups ofthree client.query on one client in two test files, four different test cases. Each is SELECT count assertions after tested operation.",
        "groups": [
          {
            "file": "tests/database/content-post-body-task-planning.test.ts",
            "line": 271,
            "queryCalls": 3,
            "testCall": "\"rechecks a serialized body translation before admission and rolls back planning metadata\"",
            "queries": [
              "\"select count(*)::int as count from content_translation_request_budget_counters\"",
              "\"select count(*)::int as count from translation_task_generation_heads where translation_kind = 'content-post-body'\"",
              "\"select count(*)::int as count from translation_tasks where translation_kind = 'content-post-body'\""
            ]
          },
          {
            "file": "tests/database/content-post-body-task-planning.test.ts",
            "line": 693,
            "queryCalls": 3,
            "testCall": "\"rolls back body budget counters when task metadata insertion fails\"",
            "queries": [
              "\"select count(*)::int as count from content_translation_request_budget_counters\"",
              "\"select count(*)::int as count from translation_tasks where translation_kind = 'content-post-body'\"",
              "\"select count(*)::int as count from translation_task_generation_heads where translation_kind = 'content-post-body'\""
            ]
          },
          {
            "file": "tests/database/content-topic-title-task-planning.test.ts",
            "line": 205,
            "queryCalls": 3,
            "testCall": "\"rechecks a serialized translation before admission and rolls back planning metadata\"",
            "queries": [
              "\"select count(*)::int as count from content_translation_request_budget_counters\"",
              "\"select count(*)::int as count from translation_task_generation_heads where translation_kind = 'content-topic-title'\"",
              "\"select count(*)::int as count from translation_tasks where translation_kind = 'content-topic-title'\""
            ]
          },
          {
            "file": "tests/database/content-topic-title-task-planning.test.ts",
            "line": 597,
            "queryCalls": 3,
            "testCall": "\"rolls back both budget counters when task metadata insertion fails\"",
            "queries": [
              "\"select count(*)::int as count from content_translation_request_budget_counters\"",
              "\"select count(*)::int as count from translation_tasks where translation_kind = 'content-topic-title'\"",
              "\"select count(*)::int as count from translation_task_generation_heads where translation_kind = 'content-topic-title'\""
            ]
          }
        ],
        "baseline": "All four blocks also present in21386887; numerical discrepancy is not current baseline change.",
        "driver": "Installed pg8.23.0 has non-pipeline query queue and deprecation notice for concurrent queued client.query usage, warning of removal inpg9. Driver source inspected, no protocol/database experiment.",
        "bounds": [
          "Original exactthree not identified, not verified. Narrow AST query is not exhaustive for aliases/callbacks/indirect calls.",
          "No claim current pinned driver misexecutes SELECTs or concurrency transaction tests universally invalid.",
          "Database tests not rerun; no new Vitest executions."
        ],
        "evidence": "/workspace/work/audit/repo/work/misha-verification-part5/evidence.json",
        "report": "/workspace/work/misha-verification/part5.md"
      }
    },
    {
      "id": "M-L09",
      "sourceSeverity": "Low",
      "claim": "Compiled UI bundle convergence зависит от ручной localhost reconciliation.",
      "status": "PARTIALLY_CONFIRMED",
      "severityAssessment": "MANUAL_CLEANUP_CONFIRMED_RUNTIME_DEPENDENCE_OVERSTATED",
      "verification": {
        "fact": "Reconciliation script limited to localhost/127.0.0.1 disposable *_test DB; locked reverify/delete. Only production-source caller found is local script.",
        "controls": "Adapter integrity failure becomes miss; loader compiles fallback in memory; successful conditional machine publication atomically writes namespace bundle.",
        "bounds": [
          "Does not establish all translations require manual cleanup.",
          "Request path remains read-only; local-only cleanup explicitly accepted in current Stage5. No external automation assessed.",
          "Five loader tests use fake sources/stores; no invalid realDB row/database test."
        ],
        "testReport": "/workspace/work/audit/repo/work/misha-verification-part6/results.json",
        "report": "/workspace/work/misha-verification/part6.md"
      }
    },
    {
      "id": "M-L10",
      "sourceSeverity": "Low",
      "claim": "Нет coverage report и threshold.",
      "status": "CONFIRMED",
      "severityAssessment": "COVERAGE_MEASUREMENT_ABSENCE_NOT_ESTABLISHED_FUNCTIONAL_DEFECT",
      "verification": {
        "fact": "Neither tracked Vitest configuration nor package scripts/primary workflow enables coverage reporting or threshold; no separate tracked coverage configuration found.",
        "bounds": [
          "No claim actual coverage low or existing tests inadequate from absence alone.",
          "External env/config not inspected; no arbitrary threshold required."
        ],
        "evidence": "/workspace/work/audit/repo/work/misha-verification-part4/ci-evidence.json",
        "report": "/workspace/work/misha-verification/part4.md"
      }
    },
    {
      "id": "M-L11",
      "sourceSeverity": "Low",
      "claim": "Protected post-edit loader не имеет отдельного route test.",
      "status": "CONFIRMED",
      "severityAssessment": "TRACKED_LOADER_TEST_GAP_NO_AUTH_BYPASS_ESTABLISHED",
      "verification": {
        "fact": "Tracked test/spec reference search across137 files finds route registration and attachment-upload tests, not direct post-edit loader execution.",
        "bounds": [
          "Five own direct loader tests already executed in part2 remain untracked audit scratch, not shipped suite. No rerun/recount here.",
          "No claim missing auth guard; source checks session, existence, authoritative owner and editOwn.",
          "Reference search not full manual read of137 test files."
        ],
        "evidence": "/workspace/work/audit/repo/work/misha-verification-part4/ci-evidence.json",
        "ownPriorTestReport": "/workspace/work/audit/repo/work/misha-verification-part2/results.json",
        "report": "/workspace/work/misha-verification/part4.md"
      }
    },
    {
      "id": "M-L12",
      "sourceSeverity": "Low",
      "claim": "ESLint/TypeScript не обеспечивают строгие browser/node/worker boundaries.",
      "status": "PARTIALLY_CONFIRMED",
      "severityAssessment": "ESLINT_BOUNDARY_GAP_CONFIRMED_FULL_TOOLCHAIN_NOT_TESTED",
      "verification": {
        "fact": "Merged browser/node/worker globals; effective ESLint config permits document/process/self in virtual app,db,workers TS paths with0 errors/warnings. Restricted globals/import rules absent.",
        "bounds": [
          "Partial scope: TypeScript configs read, but no dedicated TypeScript rejection/acceptance experiment or bundler test.",
          "No conclusion all framework/server-only protections absent; no client secret/DB bundle leak claimed.",
          "Probe text linted only; source not executed."
        ],
        "evidence": "/workspace/work/audit/repo/work/misha-verification-part4/lint-boundaries.json",
        "report": "/workspace/work/misha-verification/part4.md"
      }
    },
    {
      "id": "M-L13",
      "sourceSeverity": "Low",
      "claim": "У основных CI jobs нет timeouts.",
      "status": "CONFIRMED",
      "severityAssessment": "EXPLICIT_TIMEOUT_ABSENCE_NO_OBSERVED_HANG",
      "verification": {
        "fact": "Main checks/database jobs have no job timeout-minutes or step timeouts.",
        "bounds": [
          "Platform default limits still apply, not infinite execution.",
          "Actual runs, hangs, costs and suitable timeout duration not measured."
        ],
        "evidence": "/workspace/work/audit/repo/work/misha-verification-part4/ci-evidence.json",
        "report": "/workspace/work/misha-verification/part4.md"
      }
    },
    {
      "id": "M-L14",
      "sourceSeverity": "Low",
      "claim": "На homepage нет `h1`; UGC Markdown может добавлять дополнительные `h1` в topic.",
      "status": "CONFIRMED",
      "severityAssessment": "HEADING_FACTS_CONFIRMED_NOT_AUTOMATIC_WCAG_VIOLATION",
      "verification": {
        "fact": "Home has0h1 in all4browser loads; renderer explicitly supports h1 from Markdown.",
        "bounds": [
          "Multiple h1 topic document not built in this part; static capability checked.",
          "No universal WCAG failure inferred from h1 count alone."
        ],
        "evidence": "/workspace/work/audit/repo/work/misha-verification-part7/browser-evidence.json",
        "report": "/workspace/work/misha-verification/part7.md"
      }
    },
    {
      "id": "M-L15",
      "sourceSeverity": "Low",
      "claim": "`ui-preview:build` создаёт неигнорируемый `dist/`.",
      "status": "CONFIRMED",
      "severityAssessment": "UNIGNORED_BUILD_OUTPUT_HYGIENE",
      "verification": {
        "fact": "Fresh UI Preview build succeeds and creates dist/ui-preview per config; git check-ignore says not ignored, git status ??dist/.",
        "bounds": [
          "Dist existed untracked before this part and was rebuilt, not deleted. Not tracked artifacts or secret leak."
        ],
        "evidence": "/workspace/work/audit/repo/work/misha-verification-part7/repository-evidence.json",
        "report": "/workspace/work/misha-verification/part7.md"
      }
    },
    {
      "id": "M-L16",
      "sourceSeverity": "Low",
      "claim": "Нет favicon, `robots.txt`, sitemap и manifest.",
      "status": "CONFIRMED",
      "severityAssessment": "WEB_ASSET_ABSENCE_NOT_ALL_MANDATORY_FEATURES",
      "verification": {
        "fact": "Tracked inventory and route/root review show no favicon,robots.txt,sitemap,web manifest.",
        "bounds": [
          "No external hosting/runtime content checked.",
          "Preview robots meta noindex exists; not production robots.txt. PWA manifest and sitemap are not universal requirements."
        ],
        "evidence": "/workspace/work/audit/repo/work/misha-verification-part7/repository-evidence.json",
        "report": "/workspace/work/misha-verification/part7.md"
      }
    },
    {
      "id": "M-L17",
      "sourceSeverity": "Low",
      "claim": "Category/section/topic не формируют dynamic title, description и canonical metadata.",
      "status": "CONFIRMED",
      "severityAssessment": "SOURCE_METADATA_ABSENCE_NO_SEARCH_IMPACT_MEASURED",
      "verification": {
        "fact": "Category/section/topic lack meta exports; root has Meta outlet but no default title/description/canonical; selected route/locale files lack dynamic metadata.",
        "bounds": [
          "Static source review; actual selected route SSR not run in this part, no indexing/traffic impact measured."
        ],
        "evidence": "/workspace/work/audit/repo/work/misha-verification-part7/repository-evidence.json",
        "report": "/workspace/work/misha-verification/part7.md"
      }
    },
    {
      "id": "M-L18",
      "sourceSeverity": "Low",
      "claim": "Initial production/UI Preview payload крупный, performance/bundle budget gate отсутствует.",
      "status": "PARTIALLY_CONFIRMED",
      "severityAssessment": "CURRENT_ASSET_SIZES_AND_NO_BLOCKING_GATE_CONFIRMED_USER_PERFORMANCE_NOT_MEASURED",
      "verification": {
        "fact": "Fresh production build plus previous part7 preview build. Home entry/root/locale/home static closure888944 bytes239706gzip; sharedviews272980/72539; previewJS941893/277241. No blocking bundle/performance gate in checked config/CI.",
        "bounds": [
          "Static closure excludes dynamic imports,manifestJS,HTML/hydration,images,headers/runtime requests. Not actual Network transfer.",
          "Independent per-file gzip9,not deployed encoding.",
          "Old Misha SSR/HE/hydration/initial measurements not reproduced or refuted on different baseline/method.",
          "Vite chunk warning exists but not blockinggate; large relative to no agreed budget not automatically functional defect. No LCP/INP/target-network measurement."
        ],
        "metrics": "/workspace/work/audit/repo/work/misha-verification-part8/payload.json",
        "report": "/workspace/work/misha-verification/part8.md"
      }
    }
  ],
  "countMeaning": "45 application-code groups include earlier preserved evidence and selected later confirmations, not 45 newly executed independent discoveries. Two preview and four documentation groups are separate.",
  "evidencePolicy": "Preserve original source reports, resolved proof files, scoped later reproduction results and authorship limits. No synthetic test result treated as production acceptance.",
  "coverageReport": "/workspace/work/audit/repo/work/audit-code-continuation/reconciliation/coverage-review.json",
  "subjectResolution": "/workspace/work/audit/repo/work/audit-code-continuation/reconciliation/subject-resolution.json",
  "unconfirmedNotCounted": [
    "Isolated recursive/resource renderer observation: application reachability and deployed impact unestablished; further probes stopped.",
    "No fresh dependency registry audit or deployed exploitability verdict.",
    "Native details Escape behavior is observation, not automatic WCAG violation.",
    "No formal all-browser/screen-reader/OS IME/zoom acceptance."
  ],
  "fixes": 0,
  "remoteWrites": false,
  "realExcludedServicesUsed": false
}
```

</details>


---

## Предыдущее состояние личного файла

<details>
<summary>Сохранённая запись до публикации</summary>

# Лёва — Codex-6.1 Sol

Активной задачи нет.

Этот файл используется для собственных рабочих результатов, выводов и технического контекста Лёвы в рамках текущего служебного PR.

</details>

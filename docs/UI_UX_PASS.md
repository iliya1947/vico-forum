# Vico Forum UI/UX product pass

## Status and purpose

This document is the execution plan for the standalone UI/UX product pass started on
2026-09-29. Stage 6 external-integration orchestration is paused while this task is active.
The goal is to make Vico Forum look and behave like the approved target product rather than a
technical scaffold or a cosmetic layer over the current MVP. Existing domain, authorization,
localization, translation, security and persistence contracts remain authoritative.

The owner has explicitly approved target-product UI decisions that include functionality not yet
implemented in the current repository. The UI/UX pass may implement small self-contained frontend
behavior when it is cheap and naturally belongs to the presentation layer. Heavier missing
subsystems are represented in the target UI now but remain separate implementation tasks rather
than being silently expanded inside a visual slice.

## GitHub Pages visual progress preview

По решению владельца во время UI/UX pass используется отдельный лёгкий статический preview на
GitHub Pages с representative/mock data. Его назначение — позволять владельцу быстро смотреть
визуальный прогресс в обычном браузере без локального клона и полного backend/runtime.

Pages-preview не является параллельным продуктом и не заменяет real-runtime acceptance. Он не
служит доказательством SSR, authentication, database-backed flows, permissions или
translation/runtime behavior. Эти границы и финальная product acceptance проверяются отдельно на
настоящем Worker/runtime окружении.

Preview-механизм должен оставаться минимальным, обратимым и переиспользовать ту же presentation
реализацию, что и приложение. Он может показывать approved target UI states, но не должен
становиться отдельной реализацией продукта или подменять отсутствующую backend/domain logic.
Embedded iframe URL включает build-specific cache key, полученный из текущего hashed preview
bundle, чтобы GitHub Pages не мог после deploy отдать iframe устаревший HTML со ссылкой на уже
заменённый hashed asset.

## Source-of-truth boundaries

The pass must preserve these existing constraints:

- the information architecture remains `category → section → topic → messages`;
- public reading remains available to guests, while existing permissions continue to control
  topic creation, replies, solution management, source-locale correction, translation generation
  and authorization management;
- all protected operations retain server-side authorization, validation and origin protection;
- public routes remain locale-prefixed and internal navigation preserves the canonical locale;
- locale registry metadata, not language-specific conditions, controls document direction;
- layouts use logical CSS properties and must support arbitrary Unicode scripts and system font
  fallbacks without introducing a fixed locale list;
- canonical English remains the UI source of truth and every new user-facing string goes through
  the existing translation catalog;
- translated user content retains its own `lang`/`dir`, provenance and original-content fallback;
- approved target-product controls may be present before their heavier backend/domain subsystem is
  implemented; small self-contained frontend behavior may be completed in the UI/UX pass, while
  heavier missing functionality remains a separate bounded product task;
- during the owner-only pre-release period, unfinished approved functions remain visible and route
  to one shared localized `Under development` page instead of pretending to work; that page also
  lists the still-unfinished approved functions and is reduced as they are implemented;
- the `Under development` page is a temporary pre-release aid and is not part of the public
  release experience;
- there is no public launch before the approved target product is complete and accepted by the
  owner;
- GitHub Pages is only a static representative-data visual preview and never substitutes for
  real-runtime functional or final product acceptance;
- schema, dependencies, backend services and public contracts change only if a demonstrated UI
  requirement cannot be met through presentation code.

## Baseline findings

The initial repository review found a complete functional route set and a deliberately small
presentation layer:

- the shared shell contains a brand, tagline and auth/admin controls, but has no structured global
  navigation, mobile navigation treatment, footer or page-level action pattern;
- category and section discovery is readable but visually behaves as plain bordered lists, with
  limited hierarchy, metadata and interaction feedback;
- topic lists expose only title, author and message count; topic pages render the required solution,
  translation and source-locale controls, but controls compete visually with the discussion;
- create-topic, reply, locale-correction and authorization forms use browser-like controls with no
  shared field, help, action, validation-summary or destructive-action presentation system;
- empty and route error states are text panels without recovery actions or differentiated visual
  treatment;
- the authorization page is functionally complete but dense, with repeated inline forms and raw
  permission identifiers as the dominant hierarchy;
- responsive behavior currently consists mainly of a single narrow-screen breakpoint; it does not
  yet define intermediate widths, touch targets, long localized labels, overflow strategy or dense
  admin behavior;
- RTL foundations are correct at the document/content boundary and the CSS mostly uses logical
  properties, but the finished layouts and interaction states still require browser acceptance in
  both directions;
- route and component tests cover functional semantics, but there is no representative populated
  visual fixture or browser acceptance matrix for the finished product.

These findings define presentation work only. They do not reopen the completed forum, auth,
authorization or translation architecture.

## Design direction

The visual system should be calm, information-dense and recognizably forum-oriented rather than a
social feed. It should establish:

1. a coherent token layer for color, type, spacing, radii, elevation, focus and semantic states;
2. a responsive application shell with clear identity, current location, account state and
   privileged navigation without overwhelming guest readers;
3. reusable primitives for page headers, panels, list rows, metadata, badges, buttons, fields,
   notices, empty states and errors;
4. clear scan paths from categories to sections to topics, with counts and status treated as
   supporting metadata;
5. discussion presentation that gives authorship and message identity enough structure while
   keeping the message body primary, including Markdown/code and mixed-direction content;
6. progressive disclosure for secondary translation, source-language and solution controls;
7. a compact but understandable administration workspace that remains usable on narrow screens;
8. visible hover, active, focus, pending, success, warning, error and disabled states with no
   color-only meaning.

The implementation should prefer repository-native React and CSS. A new component or styling
dependency requires a concrete need, official-version verification and separate justification.

## Owner-approved target UI contract

### Visual foundation and theme

- Vico Orange is the primary brand accent over neutral technical surfaces.
- The homepage brand lockup is deliberately more prominent than the tagline and secondary header
  controls. It uses separate owner-provided Light/Dark Vico marks beside the wordmark and switches
  them with the active theme. The mark is intentionally large enough to be a primary header
  identity element; `Vico` stays Vico Orange and `Forum` uses the theme-appropriate neutral
  foreground.
- Orange action controls use a dark foreground in Light and a light foreground in Dark; non-action
  accent surfaces keep their own semantic foreground treatment.
- The interface stays information-dense and forum-oriented, using compact horizontal rows rather
  than oversized dashboard cards, with moderate radii and minimal shadow.
- Light and Dark use identical geometry, components and layout. Theme-sensitive colors, surfaces,
  borders, text, state colors, code treatment and shadow are centralized semantic tokens.
- On first use, `prefers-color-scheme` selects Light or Dark. There is no separate permanent
  “System” theme option. A manual Light/Dark choice is persisted and then wins.
- Desktop, tablet and mobile are the same product presentation rearranged responsively. RTL/LTR are
  the same design; code remains LTR inside RTL UI.

### Homepage contract

The next homepage implementation follows the owner-approved mockup rather than inventing a new
composition:

1. Preserve the two horizontal header zones: global search in the upper zone and compact primary
   navigation below it, followed by the forum blocks and the lower information zone.
2. Remove `Users`, `Rules`, `Help` and a global `Create topic` action from the main top
   navigation. Topic creation belongs inside a concrete forum section. Rules and Help move to the
   footer; About Vico, Feedback and Privacy are footer-level destinations. Final language-switcher
   placement remains open.
3. The brand already returns to the homepage, so the second header row does not duplicate a
   `Home` item. Its approved discovery navigation is `Unanswered · Tags · Popular`, plus
   `Unread` only for authenticated users. These entries use compact icon-led navigation without
   filled button chrome: Vico Orange labels and outline icons at rest; hover/focus/active deepens
   the accent and adds a short underline. `Popular` uses an unambiguous trending-up icon.
   Until the corresponding heavy subsystem exists, these approved entry points follow the shared
   `Under development` pre-release behavior.
4. `Popular` means topics with the highest activity inside a bounded period rather than an
   all-time ranking. Its approved destination presents three simultaneous period columns:
   `24 hours`, `7 days`, and `30 days`.
5. Keep global search as an approved target function. Authenticated UI keeps notifications and an
   account/avatar entry point; the notification badge is shown only for unread notifications.
6. The six approved primary forum destinations follow the owner’s labels and order:
   `Помощь и решения`, `Vibe Coding и AI-инструменты`, `Разработка`,
   `Deploy и инфраструктура`, `Проекты и разборы`, `Сообщество`.
   Implementation still routes user-facing strings through the canonical English/i18n catalog;
   these approved product labels do not change the authoritative domain hierarchy
   `category → section → topic → messages`.
7. The homepage forum area is a category map rather than a topic feed. Each category keeps a
   compact icon/name/description header, real aggregate section/topic/message counts and a direct
   locale-aware category link.
8. Each category exposes up to the first three real sections as compact rows. A row contains the
   section icon, name, short supporting description, real topic/message counts and the orange
   section-entry action, and navigates directly to the locale-aware section page.
9. When a category contains more than three sections, an in-place disclosure control reveals or
   hides the remaining sections without navigation. A category with no defined sections remains
   visible as a category destination and does not fabricate section rows or runtime data.
10. The previously approved rich four-part block is moved one hierarchy level down to the category
    page. Each category page presents its sections using section identity/description, `Pinned`,
    `Latest topics`, section statistics and the dedicated section-entry action.
11. Category-page `Latest topics` uses real per-section topic activity from the forum reader.
    The persisted-pinning slice adds bounded deterministic real pins through the same category
    reader boundary; a section with no pins shows a truthful non-link empty state rather than
    fake data or an `Under development` destination.
12. The rich category-page section card keeps the existing expand/disclosure behavior: desktop can
    reveal additional pinned/latest entries in place, while narrow mobile collapses the secondary
    `Pinned`, `Latest topics` and statistics group behind the same control. The discussion
    hierarchy remains category → section → topic → messages.
13. The lower homepage zone keeps `Who's online` and `Forum statistics`, using only useful real
    metrics such as topics, messages, registered users and online count when available.

### Topic, message and authoring target

- The original question remains first. When a best answer exists, it is visually promoted directly
  after the first message while retaining its real message anchor/number; the remaining discussion
  stays linear below it.
- Best-answer selection and solved state are independent. A topic author may select a best answer
  while the topic is still unsolved; immediately after that selection the UI asks whether the
  problem is solved. Confirming marks the topic solved through the existing protected solution
  mutation, while declining keeps the selected best answer and leaves the topic unsolved.
- Every message has a permanent anchor number and copy-link action. The target product supports
  reply/quote of a concrete message or selected text, while parent messages expose links to their
  direct replies without turning the discussion into a Reddit-style tree.
- Topic lists are designed for quickly scanning solved/unanswered/pinned state, technology tags,
  relative activity and reply counts; an unanswered filter is approved.
- Authoring evolves toward a full editor panel with inline code, fenced code/language selection,
  syntax highlighting, copy and optional wrapping; code remains LTR inside RTL UI.
- Approved authenticated-user targets include unread/new state and jump-to-first-unread,
  drafts/autosave, notifications, and persisted Light/Dark preference.
- User profiles remain forum profiles rather than a social network: avatar, name, short bio, role,
  join date, message count, best-answer count, and optional GitHub/site links are appropriate;
  friends/followers/stories/profile likes/personal social feed are not.

### Unfinished-function pre-release behavior

Pre-release is for the owner’s acceptance only. Approved target controls are not hidden merely
because their implementation is incomplete. Until a function exists:

- its real-app entry point routes to one shared localized `Under development` page;
- that page identifies the requested unfinished function, provides a safe return to the forum, and
  lists the approved functions still in development;
- when a function is implemented, its temporary destination is replaced with the real behavior and
  it is removed from the unfinished list;
- no extra feature-flag layer or duplicate preview-only presentation is introduced solely for this
  workflow.

## Delivery plan

### 1. Reproducible visual baseline — preview foundation merged

The first bounded baseline/preview slice is merged. It provides deterministic representative data,
the reversible GitHub Pages visual-progress preview, client-safe presentation boundaries, real
mobile-width previewing and representative LTR/RTL/identity/content states. The owner confirmed the
deployed preview renders after the server/client boundary defect was fixed. This does not mark the
full later browser acceptance matrix complete.

### 2. Foundations, shell and approved homepage frame — owner visual acceptance complete

The bounded implementation covers semantic tokens, persisted Light/Dark, the approved two-zone
shell/header/footer composition, homepage block geometry and the shared localized
`Under development` page/checklist. Repository CI and GitHub Pages checks pass, and the owner
accepted the corrected homepage visual result on 2026-10-01. This acceptance is for the homepage
slice only and does not replace the final real-runtime/browser acceptance matrix for the full pass.

- Real application homepage category/section structure and aggregate counts come from the forum
  reader. Per-section latest-topic data is consumed by category pages; PR #181 adds repository-backed
  per-section pinned topics to the same category-page presentation while online-presence remains
  unavailable and is not represented as fake runtime data.
- The Pages fixture carries representative target-only data, including the approved six-category
  order, homepage section rows and category-page pinned/latest presentation, so visual work can be
  reviewed without inventing production persistence.
- Search, notifications, unread state, drafts/autosave, profiles and other heavier missing
  subsystems are still separate bounded work. Their approved pre-release entry points route to
  `Under development` instead of pretending to work.
- `<html lang>`/`dir`, SSR/hydration, canonical locale-aware links and existing protected server
  boundaries remain unchanged.

### 3. Forum discovery beyond the homepage

Category-page implementation in PR #159 passed owner visual acceptance in GitHub Pages on
2026-10-01:

- it reuses the owner-accepted header/logo/discovery navigation without changing data contracts;
- the category heading exposes only derived section/topic/message totals;
- section destinations are compact full-card links with real topic/message counts and a dedicated
  orange entry rail;
- responsive, RTL and empty-category preview states are included.

The owner-approved hierarchy correction in PR #182 supersedes the earlier homepage/category card
composition without changing the forum hierarchy or schema:

- the homepage now exposes categories with direct real section rows and aggregate counts instead of
  rendering pinned/latest topic columns at category level;
- the richer section-card composition moves to category pages, where real per-section latest-topic
  activity is loaded through the forum reader; the follow-up persisted-pinning slice connects
  bounded real pins to that same section-card surface without restoring topic blocks on Home;
- `Help & solutions` is the first approved homepage category. Its persistence foundation uses a
  reserved category plus one internal service section hidden from generic section discovery and
  generic create-topic routing, preserving the classic storage hierarchy without presenting a
  fake user-facing subforum. The current bounded Q&A slice adds only the first real `All` mode:
  it lists service-section questions with author, tags, reply count, solved/best-answer state and
  latest activity, while question topics breadcrumb directly back to Help & solutions instead of
  exposing the hidden section. Additional modes, filters and question-authoring remain separate
  bounded product work;
- owner visual acceptance of the implementation was confirmed on 2026-10-05; exact-head
  automated verification remains a separate PR check.

Section-page implementation in PR #160 passed owner visual acceptance in GitHub Pages on
2026-10-01:

- it reuses the accepted homepage/category header and discovery navigation without changing data
  contracts;
- the section heading exposes only derived topic/message totals and keeps topic creation inside the
  concrete section through the existing write flow;
- topic destinations are compact full-card links with real author/message data and a dedicated
  orange entry rail;
- responsive, RTL and empty-section presentation states are included;
- full create-topic form/editor redesign remains part of the later Topics/messages/participation
  slice rather than expanding this discovery task.

Remaining discovery work:

- continue improving page headings and breadcrumbs where later slices expose edge cases;
- make remaining empty discovery states useful without implying unavailable product features;
- preserve the classic forum hierarchy and existing query/data contracts unless acceptance reveals
  a narrowly necessary presentation field.

### 4. Topics, messages and participation

Topic-reading/message presentation in PR #161 passed owner visual acceptance in GitHub Pages
on 2026-10-01:

- the accepted shell/header is reused without changing data contracts;
- the original question remains first, the selected best answer is promoted directly after it while
  retaining its original permanent message number/anchor, and the remaining discussion stays linear
  in repository order;
- message cards use existing author/content data and preserve safe Markdown/code rendering,
  translated-content provenance/original disclosure, generation status and protected solution/source-
  locale actions;
- representative solved LTR, unsolved LTR and translated RTL states were reviewed in Pages;
- responsive/RTL-safe geometry is included without adding unavailable reply/quote, profile, unread,
  draft or notification data.

Reply/Create-topic form presentation in PR #162 passed owner visual acceptance in GitHub
Pages on 2026-10-01:

- existing section/topic write actions and server authorization/validation contracts are unchanged;
- forms use accessible named regions, localized field guidance and required-field messaging;
- submit actions are touch-friendly and use React Router non-fetcher `Form` pending state to disable
  only the active authoring form while showing a localized progress label;
- responsive/RTL geometry and representative normal/error preview states were reviewed in Pages;
- this slice does not implement the future full editor, drafts/autosave, reply/quote relationships
  or new backend behavior.

Secondary translation/source-locale/solution control presentation in PR #163 passed owner
visual acceptance in GitHub Pages on 2026-10-01:

- translation-generation feedback remains visible but uses a compact secondary treatment;
- source-locale correction and solution-management mutations move behind native `details`
  progressive disclosure at topic/message level;
- `Go to solution` remains visible as a reading/navigation action;
- existing permissions, mutation intents, same-origin/validation boundaries, revision semantics and
  generation policy are unchanged;
- complete current Russian and Hebrew manual UI packs cover every canonical `common` key while
  canonical English remains the only source catalog and public locale identity remains generic and
  registry-owned;
- the accepted header includes the registry-driven language selector, locale-independent preview
  State control, full desktop tagline, lower-row account controls and LTR VicoForum brand isolation
  inside RTL UI.

Remaining participation work:

- continue verifying long titles, long localized strings, code overflow and mixed-direction content;
- permanent copy-link was implemented and owner-accepted through PR #172;
- the current Reply/Quote slice adds a persisted direct-parent relationship while keeping the
  discussion linear: concrete-message replies expose parent/direct-reply anchors, and Quote inserts
  only text the user actually selected as a Markdown blockquote; repository/Pages/owner acceptance
  for this slice is still pending;
- full editor behavior remains separate approved future work.

### 5. Auth, administration and system states

Authentication header presentation in PR #164 passed owner visual acceptance in GitHub Pages on
2026-10-01:

- guest sign-in, signed-in identity and sign-out use the accepted compact header language;
- pending and safe failed-auth presentation are explicit and accessible without exposing provider
  details;
- deterministic Pages states cover pending and failed authentication while existing Home guest/user
  states cover normal identity presentation;
- auth actions are intentionally blocked in the static Pages fixture, so this acceptance is visual
  only and does not claim real Google OAuth behavior;
- Better Auth client/session behavior, callback safety, locale/RTL handling, authorization and
  Stage 6 external OAuth configuration remain unchanged.

Authorization management presentation in PR #165 passed owner visual acceptance in GitHub Pages
on 2026-10-01:

- the existing protected route and every mutation intent/field contract are preserved;
- roles and users are grouped into compact management cards with clearer assignment, grant,
  override and effective-permission hierarchy;
- built-in/custom-role distinctions stay explicit and custom-role deletion is visually separated
  as a destructive action;
- representative Pages data includes a custom role/user plus saved/conflict feedback states;
- dynamic DB-backed authorization, same-origin checks and lockout safeguards remain unchanged;
- the owner noted that the underlying role/permission-management product workflow may warrant a
  separate later redesign; that future product work is not a defect or scope expansion of this
  accepted presentation slice.

System/error-state presentation in PR #166 passed owner visual acceptance in GitHub Pages on
2026-10-01:

- route-level `401`, `403`, `404`, controlled `503` and unexpected failures share one compact
  system-state presentation inside the accepted forum shell;
- protected authorization-route failures use the same route boundary as forum read failures;
- internal exception/response details are never shown; each state exposes localized safe copy plus
  one recovery action back to the forum;
- existing mutation-level `409`/rate-limit feedback remains in the already accepted form/admin
  surfaces rather than being converted into fake route errors;
- EN/RU/HE packs contain reviewed current copy for the accepted route states.

Remaining work:

- responsive/bidirectional/accessibility hardening and the final full browser acceptance matrix;
- keep lockout and existing mutation safeguards intact during closeout.

### 6. Responsive, bidirectional and accessibility hardening

Shared-shell hardening is isolated in PR #167 for owner review:

- keyboard users get a localized skip link before the repeated forum header, targeting a focusable
  content region;
- the language selector regains an explicit visible focus treatment and shared-header overflow no
  longer clips focus rings;
- shared header children get bounded min/max-width behavior for zoom/reflow pressure without
  changing the accepted shell composition;
- a representative `Home · manager` state exercises the densest account/header combination while
  existing logical properties and RTL arrow/brand behavior remain unchanged;
- owner mobile review first corrected sub-30rem ordering, then later superseded that layout with a
  more compact card contract: section identity stays visible, `Pinned` + `Latest topics` +
  statistics are collapsed by default behind the circular control, and the orange section-entry
  action moves from the card footer to the inline-end edge of the identity row; this latest card
  correction still requires owner visual acceptance;
- later owner mobile review found discovery-navigation overflow; narrow mobile now uses centered
  orange pill icon-only discovery controls with larger icons and localized accessible labels,
  while wider layouts retain the accepted icon-plus-text navigation; the owner visually accepted
  this mobile-nav correction on 2026-10-02;
- a subsequent owner review requested compact narrow-mobile theme/locale controls beside the brand:
  the theme control sits above the locale control and uses moon/sun target icons; the locale control
  exposes a short current-language code while preserving the existing select behavior; wider
  layouts remain unchanged;
- the next narrow-mobile review places the account/notification row on one compact line directly
  below the brand, moves search below that row, and keeps the centered discovery pills below search;
- guest auth copy is shortened to `Sign in`, with a neighboring `Sign up` entry point for the
  approved future registration system; until that system exists, `Sign up` follows the shared
  localized `Under development` behavior rather than pretending registration is implemented.

Remaining work:

- exercise content-heavy phone/tablet/desktop states, long labels, mixed-direction content and code
  overflow;
- verify reduced motion, target sizing, zoom/reflow and common contrast/focus states across the
  representative matrix;
- remove only confirmed physical-direction or overflow defects found by that exercise;
- run automated semantic/accessibility checks where repository tooling supports them, without
  treating automation as a replacement for browser review.

### 7. Product acceptance and closeout

- Run the complete automated repository checks.
- Perform and record the browser matrix below against representative populated data.
- Re-run the whole acceptance matrix after confirmed fixes, update `PROJECT_STATE.md` only with
  results actually obtained, and leave Stage 6 infrastructure gates paused until the owner resumes
  them explicitly.

## Required browser acceptance matrix

Product acceptance is blocking and must use a real browser rather than component markup alone.

| Dimension | Required coverage |
| --- | --- |
| Environment | GitHub Pages for progress viewing; actual Worker/runtime for functional and final acceptance |
| Viewports | Desktop, narrow mobile and at least one intermediate/tablet width |
| Direction | Full LTR UI, full RTL UI, and mixed-direction topic content |
| Identity | Guest, authenticated regular user and authorization manager |
| Discovery | Populated home/category/section plus empty category and empty section |
| Topics | Unsolved and solved topics, selected best answer, multiple messages, Markdown/code, long title/body |
| Participation | Create-topic and reply forms; validation, pending, success, forbidden and rate-limited feedback where reproducible |
| Translation | Original, translated, provenance, original disclosure, generation status and explicit long-message control |
| Administration | Roles, grants, user assignment, overrides, success/error feedback and narrow-screen behavior |
| System states | Route `404`, controlled unavailable/error state, auth failure and safe recovery path |
| Interaction | Keyboard traversal, focus visibility, target sizing, overflow, zoom/reflow and reduced motion |

For every acceptance run, record the revision, data/identity fixture, browser and viewport, locale
and direction, routes/states checked, screenshots, defects found and re-test result. A green CI run
without this evidence is insufficient.

## Definition of done

The task is complete only when:

- the scoped shell, discovery pages, topic/message views, forms, auth/admin presentation and
  empty/error states share a coherent finished visual language;
- desktop/mobile and LTR/RTL layouts pass the browser matrix without material clipping, overlap,
  inaccessible controls or direction errors;
- guest, user and manager experiences are visually and functionally accepted on representative
  populated data;
- existing forum, authorization, localization and translation behavior remains covered and the
  full required CI suite passes;
- browser evidence and remaining non-blocking limitations are recorded truthfully;
- the lightweight Pages preview exposes representative visual progress without being cited as
  evidence for SSR/auth/database/permission/translation-runtime acceptance;
- independent review reaches no outstanding confirmed defects within this task's scope;
- `PROJECT_STATE.md` reflects the actual accepted result rather than planned work.

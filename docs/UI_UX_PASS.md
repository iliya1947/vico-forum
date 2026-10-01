# Vico Forum UI/UX product pass

## Status and purpose

This document is the execution plan for the standalone UI/UX product pass started on
2026-09-29. Stage 6 external-integration orchestration is paused while this task is active.
Its service PRs `#121` and `#122` are frozen historical context and are not working channels
for this pass.

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
7. Every homepage forum block uses the same four-part structure: icon/name/description,
   `Pinned`, `Latest topics`, and section statistics, plus a dedicated entry action at the far
   edge of the card.
8. `Pinned` is mandatory in the target presentation, visually secondary to the section title but
   clearly discoverable, with compact topics and orange markers.
9. `Latest topics` shows topic title, author/avatar and relative activity time; the same area is
   designed to carry approved topic states such as solved, unanswered, unread and new.
10. Section statistics use real topic/message counts in the real application. Representative/mock
   identities and numbers are allowed only in the Pages visual fixture. On desktop this statistics
   area stays compact; a separate full-height orange action rail sits at the far card edge and uses
   a bold white arrow. Until the redesigned forum category/section discovery presentation is ready,
   that rail is an approved unfinished entry point and routes to the shared `Under development`
   page instead of exposing the old scaffold through this action.
11. The circular orange expand control expands more pinned/latest content in the same block; it does
   not navigate. On desktop its horizontal center aligns exactly with the divider between
   `Pinned` and `Latest topics`, and its vertical center sits on the card bottom boundary so it
   straddles the edge. The coordinate is consistent across all cards and independent of text
   height. Mobile adapts the control to the single-column structure instead of forcing the desktop
   coordinate.
12. The lower homepage zone keeps `Who's online` and `Forum statistics`, using only useful real
    metrics such as topics, messages, registered users and online count when available.
13. Mobile preserves the same substantive content in one column:
    description → pinned → latest topics → statistics.

### Topic, message and authoring target

- The original question remains first. When a best answer exists, it is visually promoted directly
  after the first message while retaining its real message anchor/number; the remaining discussion
  stays linear below it.
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

- Real application homepage counts and latest-topic data continue to come from the existing forum
  reader; unavailable pinning and online-presence capabilities are not represented as fake runtime
  data.
- The Pages fixture carries representative target-only data, including the approved six-destination
  order and pinned-topic presentation, so visual work can be reviewed without inventing production
  persistence.
- Search, notifications, unread state, drafts/autosave, profiles and other heavier missing
  subsystems are still separate bounded work. Their approved pre-release entry points route to
  `Under development` instead of pretending to work.
- `<html lang>`/`dir`, SSR/hydration, canonical locale-aware links and existing protected server
  boundaries remain unchanged.

### 3. Forum discovery beyond the homepage

- Redesign the home/category/section hierarchy for scanning, meaningful counts and clear click
  targets.
- Improve page headings and breadcrumbs, including wrapping and RTL order.
- Make empty sections/categories useful without implying unavailable product features.
- Preserve the classic forum hierarchy and existing query/data contracts unless acceptance reveals
  a narrowly necessary presentation field.

### 4. Topics, messages and participation

- Refine topic status/header, message cards, author metadata, anchors, best-answer treatment,
  Markdown/code blocks and mixed-direction content.
- Make create-topic and reply forms clear and responsive, with accessible labels, help/error/status
  placement, pending behavior and touch-friendly actions.
- Integrate translation status/original disclosure and source-locale correction without letting
  secondary controls dominate reading.
- Verify long titles, long localized strings, code overflow and content with different direction
  from the surrounding UI.

### 5. Auth, administration and system states

- Polish guest, signed-in, pending and failed auth presentation.
- Reorganize authorization management into comprehensible role/user groups while preserving every
  existing mutation and the dynamic permission model.
- Unify empty, `401`, `403`, `404`, `409`, `429`, `503` and unexpected-error presentation where the
  current route contracts expose them; include safe recovery/navigation actions only.
- Keep destructive actions visually distinct and preserve lockout safeguards.

### 6. Responsive, bidirectional and accessibility hardening

- Exercise phone, tablet and desktop widths, keyboard-only navigation, visible focus, zoom/reflow,
  reduced motion, long labels and common contrast states.
- Test full-page LTR and RTL, plus mixed-direction user content and LTR code inside RTL UI.
- Remove physical-direction assumptions and horizontal overflow introduced by the new layouts.
- Run automated semantic/accessibility checks where repository tooling supports them, but do not
  treat automation as a replacement for browser review.

### 7. Product acceptance and closeout

- Run the complete automated repository checks.
- Perform and record the browser matrix below against representative populated data.
- Review the complete pass independently through the new ChatGPT service channel using the project
  technical-consensus protocol.
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

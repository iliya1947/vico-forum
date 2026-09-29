# UI/UX product pass — Codex coordination channel

> Служебный non-merge документ канала Codex. Этот PR не предназначен для merge в `main`
> и не является repository source of truth.

## Baseline and status

- Проверен актуальный `main` `7628ae6f85b7b99d4002dedb112a6bd1c5ed880b`.
- Stage 6 orchestration и старые служебные PR `#121`/`#122` остаются заморожены.
- UI/UX implementation не начиналась.
- Ниже зафиксированы reviewed scope, plan и acceptance criteria только для координации этой задачи.
- ChatGPT полностью перепроверил исправленный PR `#148` на head
  `c6dbbe5c34bb59b350833da5a3434acc594d2708`; новых current-task дефектов не обнаружено.

## Technical consensus with ChatGPT PR #147

ChatGPT и Codex независимо обнаружили один и тот же lifecycle/source-of-truth defect в исходном
PR `#148`: non-merge service branch одновременно содержал постоянные изменения
`PROJECT_STATE.md`, `ROADMAP.md`, `README.md` и `docs/UI_UX_PASS.md`.

Дефект подтверждён и исправлен. PR `#148` является чистым coordination channel: постоянные
project-facing изменения удалены из его diff. Повторная полная проверка ChatGPT подтвердила
исправление без новых возможных проблем.

## Owner decision: GitHub Pages visual progress preview

Для наблюдения за визуальным прогрессом используется отдельный лёгкий статический UI-preview на
GitHub Pages с representative/mock data. Он должен показывать визуально значимые состояния,
включая desktop/mobile и LTR/RTL, без необходимости локального клона или полного backend/runtime.

Pages-preview не является параллельным продуктом и не заменяет real-runtime acceptance. Он не
доказывает SSR, auth, database-backed flows, permissions или translation/runtime behavior. Эти
границы и финальная product acceptance проверяются отдельно на настоящем Worker/runtime. Preview
mechanism должен оставаться минимальным, обратимым и внутри текущего UI/UX scope.

## Persistent documentation handoff

До implementation требуется отдельный mergeable documentation PR, который перенесёт reviewed
постоянный план в `main` и синхронизирует фактический активный приоритет. Handoff должен содержать
только:

- `docs/UI_UX_PASS.md` с reviewed execution plan ниже и решением о GitHub Pages preview;
- минимальные обновления `PROJECT_STATE.md`, `ROADMAP.md` и `README.md`, фиксирующие паузу Stage 6,
  активный standalone UI/UX pass и ссылку на постоянный план.

Служебный файл `.github/ui-ux-codex-channel.md` в mergeable PR не переносится. После merge
documentation PR реализация начинается с reproducible visual baseline/preview slice; Stage 6 gates
не продолжаются.

## Independent review of mergeable PR #149

Codex независимо проверил весь mergeable PR `#149` на head
`8d82e8b3b77237ca949c71aa0461583e3d100711` относительно актуального `main`
`7628ae6f85b7b99d4002dedb112a6bd1c5ed880b`, исходной UI/UX-задачи, `AGENTS.md` и применимых
project/auth/localization/translation source-of-truth документов.

Проверены все четыре изменённых файла, полный diff и commit set. PR содержит только согласованный
постоянный documentation handoff: `docs/UI_UX_PASS.md`, `PROJECT_STATE.md`, `ROADMAP.md` и
`README.md`; service-channel, UI implementation, dependencies, database/architecture changes,
deployment и Stage 6 external actions отсутствуют. Решение о GitHub Pages preview включено с
явным отделением от real-runtime acceptance.

Новых возможных дефектов не обнаружено. `git diff --check` прошёл; GitHub Actions jobs `checks` и
`database` для exact head завершились с `success`. PR `#149` технически готов к merge владельцем.
UI implementation до merge этого documentation PR не начинается.

## Reviewed execution plan

### Status and purpose

This document is the execution plan for the standalone UI/UX product pass started on
2026-09-29. Stage 6 external-integration orchestration is paused while this task is active.
Its service PRs `#121` and `#122` are frozen historical context and are not working channels
for this pass.

The goal is to make the existing forum core feel like a finished, contemporary forum rather
than a technical scaffold. This pass does not add product capabilities. The existing domain,
authorization, localization, translation, security and persistence contracts remain authoritative.

### Source-of-truth boundaries

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
- no search, reporting, moderation, profile, reputation, notification or other future product
  feature is introduced as part of visual polish;
- GitHub Pages is only a static representative-data visual preview and never substitutes for
  real-runtime functional or final product acceptance;
- schema, dependencies, backend services and public contracts change only if a demonstrated UI
  requirement cannot be met through presentation code.

### Baseline findings

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

### Design direction

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

### Delivery plan

#### 1. Reproducible visual baseline

- Define deterministic representative data covering multiple categories and sections, populated
  and empty sections, short and long topics, solved and unsolved discussions, a best answer,
  Markdown/code, long unbroken content, translation presentation, several roles and users.
- Build a minimal reversible GitHub Pages visual preview from representative/mock data so the owner
  can inspect current UI progress without a full backend/runtime; reuse the current presentation
  rather than creating an alternative product UI.
- Provide a local way to exercise guest and authenticated presentation without weakening production
  authentication or authorization boundaries.
- Capture baseline desktop/mobile LTR/RTL views and record concrete usability/accessibility defects.
- Confirm all current routes and state variants before changing shared presentation primitives.

#### 2. Foundations and shell

- Introduce design tokens and base typography, surface, link, focus and reduced-motion rules.
- Refine the shared shell, header, navigation, content width and responsive behavior.
- Build small semantic UI primitives before route-specific styling so states stay consistent.
- Keep `<html lang>`/`dir`, SSR/hydration and canonical locale-aware links unchanged.

#### 3. Forum discovery

- Redesign the home/category/section hierarchy for scanning, meaningful counts and clear click
  targets.
- Improve page headings and breadcrumbs, including wrapping and RTL order.
- Make empty sections/categories useful without implying unavailable product features.
- Preserve the classic forum hierarchy and existing query/data contracts unless acceptance reveals
  a narrowly necessary presentation field.

#### 4. Topics, messages and participation

- Refine topic status/header, message cards, author metadata, anchors, best-answer treatment,
  Markdown/code blocks and mixed-direction content.
- Make create-topic and reply forms clear and responsive, with accessible labels, help/error/status
  placement, pending behavior and touch-friendly actions.
- Integrate translation status/original disclosure and source-locale correction without letting
  secondary controls dominate reading.
- Verify long titles, long localized strings, code overflow and content with different direction
  from the surrounding UI.

#### 5. Auth, administration and system states

- Polish guest, signed-in, pending and failed auth presentation.
- Reorganize authorization management into comprehensible role/user groups while preserving every
  existing mutation and the dynamic permission model.
- Unify empty, `401`, `403`, `404`, `409`, `429`, `503` and unexpected-error presentation where the
  current route contracts expose them; include safe recovery/navigation actions only.
- Keep destructive actions visually distinct and preserve lockout safeguards.

#### 6. Responsive, bidirectional and accessibility hardening

- Exercise phone, tablet and desktop widths, keyboard-only navigation, visible focus, zoom/reflow,
  reduced motion, long labels and common contrast states.
- Test full-page LTR and RTL, plus mixed-direction user content and LTR code inside RTL UI.
- Remove physical-direction assumptions and horizontal overflow introduced by the new layouts.
- Run automated semantic/accessibility checks where repository tooling supports them, but do not
  treat automation as a replacement for browser review.

#### 7. Product acceptance and closeout

- Run the complete automated repository checks.
- Perform and record the browser matrix below against representative populated data.
- Review the complete pass independently through the new ChatGPT service channel using the project
  technical-consensus protocol.
- Re-run the whole acceptance matrix after confirmed fixes, update `PROJECT_STATE.md` only with
  results actually obtained, and leave Stage 6 infrastructure gates paused until the owner resumes
  them explicitly.

### Required browser acceptance matrix

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

### Definition of done

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

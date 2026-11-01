# Admin panel implementation plan

> Approved implementation plan for the Vico Forum admin-panel project. PR #251 is the authoritative service PR for this subsystem. Current confirmed state is kept in `COMMUNICATION.md`, operational assignments in `WORKFLOW.md`, and agent-specific context in the four personal files. Implementation is delivered through separate bounded implementation PRs merged sequentially into `main`.

## 1. Approved product model

The global **Admin panel** is a separate protected service area for managing the forum itself.

It is distinct from:

1. **Needs attention** — a separate notification/action queue for moderators and administrators.
2. **Contextual administration** — quick administrative actions on a category, section, topic, message, or user near the object itself.
3. **Future super-admin UI** — owner-only capabilities designed separately near the end of the project.

The admin panel uses the existing dynamic permission model. Visibility and available actions depend on the actor's effective code-backed permissions, not on a hard-coded role name.

Approved top-level structure:

1. **Overview**
2. **Forum**
3. **Users**
4. **Roles & permissions**
5. **History**
6. **Settings**

Approved unfinished sections may remain visible during owner-only pre-release and route to the shared localized **Under development** page.

## 2. Approved interaction model

### 2.1 Overview

The Overview is a real landing page for the admin panel and contains:

1. navigation to sections available to the current administrator;
2. concise real forum statistics;
3. recent significant administrative actions.

Needs attention is not embedded into the Overview.

### 2.2 Forum

The Forum section follows one hierarchy:

**category → section → topic → messages**

Separate administrative object pages are required for:

1. users;
2. categories;
3. sections;
4. topics.

Messages do not get a separate administrative page. They are administered through topic context and quick actions.

### 2.3 Users

The Users section uses:

1. a searchable/listable user index;
2. quick actions in the list;
3. a dedicated administrative user page for full work.

Available information and actions depend on the current administrator's effective permissions.

### 2.4 Quick actions

Use one shared **Quick actions** interaction concept.

It must be usable where applicable:

1. inside admin-panel lists/pages;
2. on a forum section page;
3. on a topic page;
4. next to each message;
5. for users where appropriate.

The action set is derived from:

1. object type;
2. current authoritative object state;
3. the current actor's effective permissions.

Quick actions must invoke the same authoritative backend operations as full administrative pages; do not create parallel admin-only mutation semantics.

### 2.5 Roles and permissions

Reuse the existing authorization foundation and protected authorization-management UI.

Do not create a second role/permission system.

Existing dynamic roles, code-backed permissions, per-user allow/deny/inherit overrides, next-request freshness, lockout protection and server-side PermissionResolver remain authoritative.

### 2.6 User blocking

Ordinary admin-panel scope includes temporary and permanent user blocking.

Temporary blocking supports:

1. common preset durations;
2. an arbitrary duration or end date;
3. automatic expiry after the configured end time.

An administrator may lift a block created by another administrator when they have the corresponding permission.

Account deletion is **not** part of the ordinary admin panel. It is reserved for the future owner-only super-admin UI.

The exact product effect of a blocked account must be decided before implementing the blocking package.

### 2.7 Administrative reasons

Whether a reason is mandatory is defined separately for each administrative action. Do not impose one global rule.

### 2.8 Administrative history

The ordinary admin panel records **significant administrative actions**.

A deeper, more complete owner-only audit surface belongs to the future super-admin UI and is out of this implementation scope.

## 3. Implementation sequence

The approved bounded delivery sequence follows the permanent contract in `docs/ADMIN_PANEL.md`:

1. **AP-01 — Contract:** permanent ordinary-admin-panel product and technical contract.
2. **AP-02 — Shell / Overview:** protected global shell, navigation and truthful Overview foundation.
3. **AP-03 — History:** significant-action History with authorization-management producer and protected recent actions.
4. **AP-04 — Roles & permissions:** compose the existing authorization-management UI into the shared AdminShell.
5. **AP-05 — Quick actions:** shared Quick actions over existing topic/Help operations and their History producers.
6. **AP-06 — Forum category/section browsing:** protected administrative browsing for categories and sections.
7. **AP-07 — Topic/message administration:** administrative topic page and message actions within topic context.
8. **AP-08 — Topic closure:** close/reopen behavior after the remaining closure decisions are settled.
9. **AP-09 — Users:** searchable/listable user administration reusing existing authorization foundations.
10. **AP-10 — Blocking:** temporary/permanent block and lift enforcement after the block-effect/reason matrix is approved.
11. **AP-11 — Integration/closeout:** factual integration verification and closeout of delivered scope.

Each dependent package starts only after its prerequisite implementation PR has completed the required review cycle and is merged into `main`. Do not pull later-package work forward merely as foundation.

## 4. Explicitly out of scope

1. Needs attention redesign or migration into the admin panel.
2. Complaint-system implementation merely because an admin panel exists.
3. A second authorization/RBAC system.
4. Infrastructure operations such as Cloudflare/Neon/deployment/secrets administration.
5. Account deletion in the ordinary admin panel.
6. The future owner-only super-admin UI and its deeper audit surface.
7. Empty speculative backend systems solely to populate future admin navigation.
8. Stage 6 external rollout unless separately authorized.

## 5. Open product decision before AP-10

Define the exact effect of a user block: which authenticated capabilities remain readable/usable and which write or participation actions are denied for temporary and permanent blocks.

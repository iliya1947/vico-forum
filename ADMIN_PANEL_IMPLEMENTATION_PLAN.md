# Admin panel implementation plan

> Umbrella plan and coordination record for the Vico Forum admin-panel project. For this task, PR #251 is the authoritative planning/coordination channel by direct developer instruction; do not duplicate admin-panel reports or status to PR #236 unless the developer explicitly asks. Implementation is delivered through separate bounded implementation PRs merged sequentially into `main`; this plan remains as the project-level record.

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

### Package 1 — admin-panel contract

1. Add a source-of-truth document for the ordinary admin panel.
2. Record the approved structure and boundaries above.
3. Define the shared Quick actions contract.
4. Define the boundary between the ordinary admin panel and the future super-admin UI.
5. Define new code-backed permissions only together with real implemented capabilities; do not pre-create speculative permissions.

### Package 2 — global admin shell

1. Add locale-aware protected route `/:locale/admin`.
2. Add shared admin navigation and layout.
3. Show the Admin panel entry point to an authenticated actor who has at least one applicable administrative capability.
4. Each admin section independently rechecks its own server-side permission boundary.
5. Implement the Overview foundation with real forum statistics and available destinations.
6. Do not fabricate recent administrative activity before Package 3 exists; Package 3 completes the Overview by adding the recent significant-action block from the real history store.
7. Keep approved-but-unimplemented destinations truthful through the existing Under development mechanism.
8. Do not move or duplicate Needs attention into the admin panel.

### Package 3 — significant administrative action history

Implement the ordinary administrative history before adding many new mutations so new actions can use it consistently.

Persist enough information to answer:

1. who acted;
2. what significant action occurred;
3. which object was affected;
4. when it happened;
5. the reason, when that action requires one;
6. the minimum useful change context.

Where practical, recording a significant action and applying that action should share the same transaction boundary.

Reading history must have its own code-backed permission.

After the real history store/read path exists, complete the Overview by showing recent significant administrative actions to actors allowed to read them.

This package is not the future full super-admin audit system.

### Package 4 — Roles & permissions integration

1. Integrate the existing authorization-management surface into the global admin shell as **Roles & permissions**.
2. Preserve the current authorization backend and lockout invariants.
3. Do not duplicate role assignment, grants, overrides or effective-permission resolution.
4. A user administrative page may expose authorization controls only when the current actor has `access.authorization.manage`.

### Package 5 — Forum section

Build the global Forum administration area incrementally over the existing hierarchy.

Bounded slices:

1. administrative browsing/search of forum objects;
2. category administrative pages;
3. section administrative pages;
4. topic administrative pages;
5. message administration through topic context and Quick actions;
6. real administrative mutations, each with its server contract, permission, state validation and tests.

Approved forum capabilities include the ability to close a topic to new replies. Other category/section/topic/message actions are permission-controlled and should be implemented only when their concrete behavior is defined for the current package.

### Package 6 — shared Quick actions

1. Introduce the shared Quick actions presentation/dispatch boundary without creating a second domain layer.
2. Gradually move existing contextual topic administration into this common interaction model.
3. Reuse existing authoritative operations such as pinning, solution moderation, duplicate handling and source-locale correction.
4. Add new operations only through their normal domain/server boundaries.
5. Apply object-state filtering and effective-permission filtering to presentation while retaining independent server-side authorization for every mutation.

### Package 7 — Users and blocking

1. Implement the user list/search.
2. Implement quick actions in the list.
3. Implement the dedicated administrative user page.
4. Show only information/actions allowed by the current actor's effective permissions.
5. Add temporary and permanent blocking with code-backed permissions.
6. Support preset and arbitrary temporary expiry.
7. Make temporary blocking cease automatically by authoritative time comparison; do not require a separate unlock job merely to make an expired block inactive.
8. Allow lifting another administrator's block when permission allows it.
9. Define per-action reason requirements.
10. Exclude account deletion and other owner-only super-admin capabilities.

Before implementation of blocking, explicitly decide what a block prevents in Vico Forum.

### Package 8 — integration and closeout

1. Verify direct-route and mutation permission boundaries.
2. Verify role grants and per-user overrides for all new capabilities.
3. Verify forbidden direct URL access and fail-closed authorization behavior.
4. Verify temporary/permanent blocks and unblock behavior.
5. Verify significant-action history and required-reason rules.
6. Verify Quick actions across supported object contexts.
7. Cover localization, RTL/LTR and responsive behavior with applicable automated checks.
8. Update `PROJECT_STATE.md` and permanent source-of-truth documentation only with factual implemented state.
9. Run the full repository CI and the required whole-PR review cycle on a stable implementation head.
10. Do not initiate owner visual acceptance unless the owner explicitly requests it.
11. Keep this umbrella plan in PR #251 as the project-level implementation record; individual implementation work is completed and merged through separate bounded PRs.

## 4. Explicitly out of scope

1. Needs attention redesign or migration into the admin panel.
2. Complaint-system implementation merely because an admin panel exists.
3. A second authorization/RBAC system.
4. Infrastructure operations such as Cloudflare/Neon/deployment/secrets administration.
5. Account deletion in the ordinary admin panel.
6. The future owner-only super-admin UI and its deeper audit surface.
7. Empty speculative backend systems solely to populate future admin navigation.
8. Stage 6 external rollout unless separately authorized.

## 5. Open product decision before Package 7

Define the exact effect of a user block: which authenticated capabilities remain readable/usable and which write or participation actions are denied for temporary and permanent blocks.

## 6. Current coordination status

AP-05 is active in implementation PR #268. On exact head `c6aef294e9cb04ab6d0aa565110ad48ef20333c0`, correction A/B passed CI and independent whole-PR review, but a later targeted diagnosis confirmed one remaining current-scope defect in the operation-scope/History boundary: an actor with only an Any capability can submit `operationScope=own` on an owned resource and avoid ordinary Admin History. The accepted correction requires explicit own semantics to require the corresponding current Own permission; explicit any continues to require Any and remains administrative. Own+Any real own-controls remain own; an opened own-form must fail after Own is revoked even if Any remains. First-party presentation must not offer an Any-only actor a usable own-control. No permission-catalog, endpoint, migration-prefix, Complaints or AP-06+ expansion is authorized.

Current next step: Leva applies the bounded correction in #268, runs applicable checks/CI, and publishes a new stable exact head. Any implementation change restarts the coordinator-first whole-PR review cycle.

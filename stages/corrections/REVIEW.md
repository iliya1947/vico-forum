# stages/corrections/REVIEW.md — coordinator review state for consolidated corrections #354

## Reviewed head

- PR: #354
- Base: `a645fbe21110e77429025c428e498194b9a92ca2`
- Exact head: `01cecb91090a2f29f90b7c6ae4a83db77a0f4910`
- Reviewer: Мира / ChatGPT-5.6 Sol
- Result: **HOLD**

## Confirmed sound on this head

1. WATCH-AUDIT-1: loader-authoritative Watch state; old success ACK cannot overwrite fresher loader snapshot; uncertain refresh/no replay and topic isolation preserved.
2. BOOKMARKS-AUDIT-1: equivalent loader-authoritative Bookmark control; transient/error/refresh and late-response isolation preserved.
3. BOOKMARKS-AUDIT-2: list presence derives from loader; stale Remove ACK cannot hide a re-added row after fresh loader state; existing pagination/account-switch semantics retained.
4. TITLE-AUDIT-1 normal path: Save/Cancel restoration moved post-DOM commit and works in component + connected Chromium; title data/write semantics unchanged.
5. Scope: exactly 9 changed files; no backend, DB, schema, RBAC, dependency or product-contract expansion.
6. Exact-head workflows: 7/7 SUCCESS including CI checks/database and dedicated Watch/Bookmarks/Title connected acceptance.

## Finding

### TITLE-AUDIT-1-R1 [P3] — stale deferred focus after permission loss

`restoreOpenerFocus.current` is set on Cancel/success. If the close transition ends with `canEdit=false`, the component remains mounted but returns `null`; opener ref is absent and the effect returns without clearing the request. A later same actor/topic revalidation restoring `canEdit=true` makes the opener reappear and the stale request focuses it unexpectedly.

This is a real current-scope focus lifecycle defect because permission loss for an open title draft is an existing supported path.

## Required correction

- Pending focus restoration must expire if immediate post-close restoration is impossible because opener is absent/hidden.
- Keep normal Save/Cancel post-commit focus restoration when opener is available.
- Add regression for permission loss → close/Cancel → later permission restoration without delayed focus steal.
- No title mutation/revision/CAS/rebase changes.

After correction: Lira self-check + applicable exact-head checks → Mira fresh whole-PR review on the new stable head. Leva only after Mira PASS.

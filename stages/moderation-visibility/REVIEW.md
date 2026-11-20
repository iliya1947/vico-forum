# Moderation visibility — bounded reviews

## B1 — schema/catalog/History foundation

### Final status

**PASS**

Final reviewed exact head: `704d5a46d59841538524424296ac28eaa39aa5e6`.

### Previous finding

`VIS-B1-MIRA-01` on `736da519e3f3fcae716ec5fb1b81886cdac63a6e`:
new `forum.content.visibility.manage` was missing from:
1. Admin Forum admission;
2. locale/header Admin projection;
3. shared AP-10 `admin.forum` family map.

### Correction verification

Correction commit changed exactly seven scoped files:
- added capability to `ADMIN_FORUM_PERMISSIONS`;
- added it to locale-boundary authorization resolution/Admin projection;
- added it to `USER_MEASURE_ADMIN_PERMISSION_FAMILIES["admin.forum"]`;
- added focused route/AP-10/raw-authority/real-PG regressions.

The existing DB restriction wrapper already contained the capability, so correction restores parity rather than introducing a new policy.

No B2 command, route-exposed Hide/Restore, schema, grant, dependency or unrelated change was added by the correction.

### Exact-head evidence

- CI run `44691969348`: `checks` SUCCESS; `database` SUCCESS.
- 13/13 associated workflows completed SUCCESS.
- PR remains Draft/unmerged.
- No confirmed current-B1 blocker remains.

### Next boundary

B2 may start only as a new stacked PR based on B1 head branch after explicit owner continuation. This PASS is an intermediate bounded checkpoint, not final whole-feature acceptance.


## B2 — transactional commands and writer admission

### Final status

**PASS**

Reviewed local stacked diff B1 `704d5a46d59841538524424296ac28eaa39aa5e6` → B2 `778568e83b89fd0ac14827cbeeaff3e2fd4dc5eb`.

### Verified

- desired-state topic/post Hide/Restore with version+revision CAS;
- nonblank reason only for real transition; stale/denied/no-op create no visibility History;
- active actor, AP-10 `admin.forum`, fresh direct `forum.content.visibility.manage` authority before admitted no-op;
- bound Owner effective authority without role-name proxy;
- visibility version overflow protection;
- one neutral ID-only History event per real transition, appended last in the transaction;
- forced History failure rolls back the visibility mutation;
- two-moderator CAS commits exactly one transition;
- topic→post→actor lock discipline and real actor-deactivation ordering;
- hidden topic/post/direct-parent gates for B2 content writers, with committed receipt replay kept inert;
- retained state: Hide/Restore does not rewrite close/pin/solution/duplicate/appeal state;
- protected Complaint and duplicate-appeal flows preserve their own authority instead of becoming ordinary hidden-content edits;
- deterministic real PostgreSQL barriers for both Hide/Restore orders against planning/reply/direct reply/edit/Complaint;
- accepted translation tasks may complete privately after Hide and stored results remain reusable after Restore.

### Exact-head evidence

Final CI run `44753654036` on exact `778568e83b89fd0ac14827cbeeaff3e2fd4dc5eb`: 22/22 checks and 18/18 workflows SUCCESS; 2758/2758 unit, 1578/1578 PostgreSQL17.

### Scope note

Translation planning/accepted-task coverage overlaps part of planned B4. This is future-stage overlap, not a confirmed B2 defect; do not roll it back solely to restore stage purity. B4 must inspect the current stack and implement/verify only its remaining boundary.

### Next boundary

B3 may start only as the next stacked PR based on `feature/moderation-visibility-b2-commands`, after explicit owner continuation. B1/B2 remain Draft/unmerged.

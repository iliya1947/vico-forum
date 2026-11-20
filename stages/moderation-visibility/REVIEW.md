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

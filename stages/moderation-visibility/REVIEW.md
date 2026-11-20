# Moderation visibility — B1 review

## Status

**HOLD** — one confirmed current-scope blocker on Draft PR #355.

Reviewed exact head: `736da519e3f3fcae716ec5fb1b81886cdac63a6e`.

## Evidence checked

- full B1 changed-file set (24 paths);
- migration 0071, Drizzle schema/manifest, permission catalog/default grants;
- Admin History actions/constraints/labels/Owner monitor classification;
- AP-10 `admin.forum` enforcement/projection seams;
- existing Admin Forum admission and locale/header projection seams;
- exact-head workflow state: 13/13 SUCCESS; CI unit 2752/2752, PG17 1483/1483.

## VIS-B1-MIRA-01 — incomplete visibility permission integration

The new `forum.content.visibility.manage` capability is present in catalog/schema/default moderator+admin grants and in `db/user-measure-admin-forum.ts`, but B1 missed three existing maps that must remain in parity:

1. `app/admin/access.ts::ADMIN_FORUM_PERMISSIONS` does not contain the capability. A user whose only Admin Forum capability is visibility management is therefore rejected by `requireAdminForumAccess`.
2. `app/routes/locale-boundary.tsx` manually resolves/builds Admin permissions and omits the capability, so the header/Admin destination projection remains hidden for that same valid actor.
3. `app/admin/user-measure-restrictions.ts::USER_MEASURE_ADMIN_PERMISSION_FAMILIES["admin.forum"]` omits the capability although the DB authorization wrapper includes it. Consumers such as raw AP-10 authority/floor logic therefore classify visibility-only administrative authority inconsistently.

This is a B1 defect, not future B2+: the accepted B1 contract includes Admin Forum admission/workspace hints and AP-10 `admin.forum` mapping.

## Required correction boundary

Restore parity in the existing maps/projections and add focused regressions for visibility-only Admin admission/projection and AP-10 family behavior. Do not expose Hide/Restore routes and do not begin B2.

After a fresh author self-check/checks, Mira repeats the bounded B1 checkpoint on the new exact head.

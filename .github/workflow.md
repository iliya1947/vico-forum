# Admin panel — current workflow

- Служебный PR: #251; общий план: `ADMIN_PANEL_IMPLEMENTATION_PLAN.md`
- Current `main`: `8301087f9322b34bdd325ed9298fdf3fddd84561`, migrations 0000–0059
- Ordinary Admin Panel AP-01–AP-11: closed
- Owner/authorization redesign Stage 1: fully closed
- Current stage: **owner/authorization redesign — target owner authority product model**
- Fixed model:
  - Owner = separate server-controlled top authority, not a role
  - every authority below Owner stays in existing role constructor + per-user overrides
  - no Senior/Head Admin built-in role or second RBAC/hierarchy layer
  - AP-10 elevated authority = existing `admin.users.blocks.managePrivileged` permission
- Technical planner: not assigned
- Implementer: not assigned
- Open owner decision: should grant/revoke of `admin.users.blocks.managePrivileged` remain bound-Owner-only, or be ordinary `access.authorization.manage` permission administration?
- Settings remains after owner/authorization redesign
- Марк не назначен
- Следующий шаг: owner answers the one elevated-permission grant/revoke question; then Мира completes target owner model and hands technical planning to Лёва

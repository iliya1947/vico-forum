# Admin panel — current workflow

- Служебный PR: #251; общий план: `ADMIN_PANEL_IMPLEMENTATION_PLAN.md`
- Current `main`: `8301087f9322b34bdd325ed9298fdf3fddd84561`, migrations 0000–0059
- Ordinary Admin Panel AP-01–AP-11: closed
- Owner/authorization redesign Stage 1: fully closed
- Current stage: **owner/authorization redesign — Stage 2 technical plan correction**
- Technical planner: **Лёва**
- Stage2 plan #6702391114: **coordinator CHANGES REQUIRED**
- Required corrections:
  - Owner automatic authority = exact administrative capabilities only, not whole `PERMISSION_CATALOG`
  - explicitly cover AP-10 authoritative `admin.users.blocks.manage` raw-check path for Owner while preserving non-Owner raw hierarchy
- Implementer: not assigned
- No implementation until corrected plan receives coordinator PASS
- Settings/super-admin/Stage6 remain out of scope
- Марк не назначен
- Следующий шаг: Лёва revises the two bounded plan points in #251 and stops

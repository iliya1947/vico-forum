# Admin panel — current workflow

- Служебный PR: #251; общий план: `ADMIN_PANEL_IMPLEMENTATION_PLAN.md`
- Current `main`: `bcf02193f82aa0d448444c6943d6ebdcf09f7896`, migrations 0000–0058
- Ordinary Admin Panel AP-01–AP-11: fully closed
- Текущий этап: **owner/authorization redesign — Stage 1 last-manager removal planning**
- Technical planner: **Лёва**
- Implementer: не назначен
- Fixed scope: remove `AuthorizationLockoutError`, `managers_ever_existed`, `countManagers()` and dedicated last-manager checks/tests
- Preserve: `authz_mutation_lock` as current shared authorization/AP-10 transaction mutex
- Out of scope: owner authority implementation, mutex redesign/removal, Settings, super-admin UI, Stage 6/production
- Марк не назначен
- Следующий шаг: Лёва готовит минимальный technical plan Stage 1 в #251 и останавливается

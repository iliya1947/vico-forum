# Admin panel — current workflow

- Служебный PR: #251; общий план: `ADMIN_PANEL_IMPLEMENTATION_PLAN.md`
- Current `main`: `bcf02193f82aa0d448444c6943d6ebdcf09f7896`, migrations 0000–0058
- Ordinary Admin Panel AP-01–AP-11: fully closed
- Текущий этап: **owner/authorization redesign — Stage 1 last-manager removal implementation**
- Technical plan: Лёва #6700603167 — **coordinator approved**
- Implementer: **Лира**
- Fixed implementation scope: remove `AuthorizationLockoutError`, `managers_ever_existed`, `countManagers()` and dedicated last-manager behavior/tests; forward migration 0059
- Preserve: `authz_mutation_lock` singleton mutex, FOR UPDATE synchronization, SELECT/UPDATE runtime capability, fresh authz, AP-10 authority and atomic History
- Out of scope: owner authority, mutex redesign/removal, Settings, super-admin UI, Stage 6/production
- Reviewer order after stable implementation: Мира → Лёва
- Марк не назначен
- Следующий шаг: Лира реализует approved plan in a separate implementation PR, records stable exact head/evidence in #251 and stops

# Admin panel — current workflow

- Служебный PR: #251; общий план: `ADMIN_PANEL_IMPLEMENTATION_PLAN.md`
- Current `main`: `8301087f9322b34bdd325ed9298fdf3fddd84561`, migrations 0000–0059
- Ordinary Admin Panel AP-01–AP-11: closed
- Owner/authorization redesign Stage 1 (remove obsolete last-manager): **fully closed**
- Current stage: **owner/authorization redesign — target owner authority product model**
- Technical planner: not assigned
- Implementer: not assigned
- Current requirement: owner approves target owner/administrative hierarchy semantics before technical planning
- Current runtime boundary: no last-manager veto; `authz_mutation_lock` retained as shared transaction mutex
- Settings: deferred until owner/authorization redesign is complete
- Out of scope now: implementation, mutex redesign/removal unless required by target model, Settings, super-admin UI, Stage 6/production
- Марк не назначен
- Следующий шаг: Мира формулирует минимальную target owner model for owner decision; после approval → Лёва technical planning

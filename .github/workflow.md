# Admin panel — current workflow

- Служебный PR: #251; общий план: `ADMIN_PANEL_IMPLEMENTATION_PLAN.md`
- Current main: `8301087f9322b34bdd325ed9298fdf3fddd84561`, migrations 0000–0059
- Ordinary Admin Panel AP-01–AP-11: closed
- Owner/authorization redesign Stage1: fully closed (#294 + #295 merged)
- Current stage: **Stage2 owner authority — technical plan ready for coordinator review**
- Technical planner: **Лёва**, planning completed; no implementation started
- Plan: [#6702391114](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6702391114); полный текст — личный файл Лёвы
- Target: separate server-controlled Owner authority; ordinary roles/overrides below it; Owner-independent forum control and immunity; only Owner grants/revokes `admin.users.blocks.managePrivileged`
- Proposed scope: common Owner-aware effective projection + fresh transaction checks, measure admission/request wiring, complete elevated gate including role deletion, minimal truthful management UI
- Existing mutex retained; no manager-preservation rule, new RBAC/role, schema/migration, infrastructure/binding editor, Settings or super-admin UI
- Implementer: **not assigned**
- Implementation PR/head: **none**
- Coordinator reviewer: **Мира — review technical plan next**
- Independent implementation reviewer: not active; standard route Лёва after coordinator PASS on stable exact head
- Марк не назначен
- Stage2 tests/browser/CI not run; future results not claimed
- Следующий шаг: Мира проверяет план и синхронизирует master plan; после approval назначает исполнителя. Лёва остановился на planning handoff
- Settings after owner/authorization redesign; Stage6/production out of scope

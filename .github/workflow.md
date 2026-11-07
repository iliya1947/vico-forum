# Admin panel — current workflow

- Служебный PR: #251; общий план: `ADMIN_PANEL_IMPLEMENTATION_PLAN.md`
- Current main: `8301087f9322b34bdd325ed9298fdf3fddd84561`, migrations 0000–0059
- Ordinary Admin Panel AP-01–AP-11: closed; redesign Stage1 fully closed
- Current stage: **Stage2 revised technical plan — awaiting coordinator review**
- Technical planner: **Лёва**, remaining AP-10 plan correction completed
- Plan: [#6702391114](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6702391114) + [revision #6702520494](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6702520494); полный исправленный текст в личном файле Лёвы
- Owner decision: all current/future real code-backed catalog permissions, independent of ordinary role/grants/overrides; no unknown capabilities, new role or second RBAC; Owner-only elevated grant/revoke gate retained
- Correction: explicit bound Owner admission at authoritative AP-10 raw-manage gate, including pending-appeal queue precheck; raw actor/target RBAC kept separate from Owner projection; non-Owner hierarchy/issuer-floor and all domain/transaction guards preserved
- Coordinator reviewer: **Мира — revised plan review next**, PASS not yet recorded
- Implementer: **not assigned**
- Implementation PR/head: **none**; no implementation until coordinator PASS
- Stage2 tests/browser/CI not run
- Shared mutex retained; Settings/super-admin/Stage6/infrastructure out of scope
- Марк не назначен
- Следующий шаг: Мира проверяет revision, синхронизирует superseded master-plan clause и при PASS назначает исполнителя. Лёва остановился на planning handoff

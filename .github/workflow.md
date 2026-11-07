# Admin panel — current workflow

- Служебный PR: #251; общий план: `ADMIN_PANEL_IMPLEMENTATION_PLAN.md`
- Current `main`: `8301087f9322b34bdd325ed9298fdf3fddd84561`, migrations 0000–0059
- Ordinary Admin Panel AP-01–AP-11: closed
- Owner/authorization redesign Stage 1: fully closed
- Current stage: **owner/authorization redesign — Stage 2 implementation**
- Technical plan: **coordinator PASS**
- Approved plan: Лёва #6702391114 + AP-10 revision #6702520494 + Owner all-catalog clarification
- Implementer: **Лира**
- Implementation PR/head: pending
- Coordinator reviewer after stable head/checks: Мира
- Independent technical reviewer after Mira PASS: Лёва
- Required boundaries: all-catalog Owner authority; AP-10 Owner-aware authoritative path; Owner-only elevated grant/revoke including role deletion; no schema/migration/Settings/super-admin/infra/mutex redesign by default
- Permanent documentation: separate closeout PR after implementation merge
- Марк не назначен
- Следующий шаг: Лира implements Stage2 in a separate PR, records stable exact head + checks in #251, then stops for Mira review

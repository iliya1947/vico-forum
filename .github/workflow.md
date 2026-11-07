# Admin panel — current workflow

- Служебный PR: #251; общий план: `ADMIN_PANEL_IMPLEMENTATION_PLAN.md`
- Current `main`: `8301087f9322b34bdd325ed9298fdf3fddd84561`, migrations 0000–0059
- Ordinary Admin Panel AP-01–AP-11: closed
- Owner/authorization redesign Stage 1: fully closed
- Current stage: **owner/authorization redesign — Stage 2 correction after coordinator review**
- Technical plan: **coordinator PASS**
- Approved plan: Лёва #6702391114 + AP-10 revision #6702520494 + Owner all-catalog clarification
- Implementer: **Лира**
- Implementation PR/head: **Draft PR #296**, `04865401cd5c2a69941cb458d0df1fc7424a37f7` (author implementation complete; frozen exact head)
- Coordinator reviewer after stable head/checks: Мира
- Independent technical reviewer after Mira PASS: Лёва
- Required boundaries: all-catalog Owner authority; AP-10 Owner-aware authoritative path; Owner-only elevated grant/revoke including role deletion; no schema/migration/Settings/super-admin/infra/mutex redesign by default
- Permanent documentation: separate closeout PR after implementation merge
- Марк не назначен
- Coordinator whole-PR review of exact head `04865401cd5c2a69941cb458d0df1fc7424a37f7`: **CHANGES REQUIRED**, exactly 1 confirmed current-scope finding: `STAGE2-MIRA-01` (mandatory elevated grant/revoke acceptance incomplete); no confirmed runtime bypass found
- Следующий шаг: **Лира — close `STAGE2-MIRA-01` in PR #296**, complete the missing required Owner-success acceptance, run applicable exact-head checks/browser, publish a new stable exact head in #251, then stop for a fresh Mira coordinator review
- Авторские проверки exact head: CI #42345404967 SUCCESS (1974 app / 570 PG tests); Chromium #42345404812 SUCCESS on attempt 2 (AP-10/AP-11 + Admin History); first Chromium attempt had unroot-caused transient AP-11 Users detail HTTP 503, unchanged head passed rerun

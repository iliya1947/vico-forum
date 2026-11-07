# Admin panel — current workflow

- Служебный PR: #251; общий план: `ADMIN_PANEL_IMPLEMENTATION_PLAN.md`
- Current `main`: `8301087f9322b34bdd325ed9298fdf3fddd84561`, migrations 0000–0059
- Ordinary Admin Panel AP-01–AP-11: closed
- Owner/authorization redesign Stage 1: fully closed
- Current stage: **owner/authorization redesign — Stage 2 coordinator review**
- Technical plan: **coordinator PASS**
- Approved plan: Лёва #6702391114 + AP-10 revision #6702520494 + Owner all-catalog clarification
- Implementer: **Лира**
- Implementation PR/head: **Draft PR #296**, `04865401cd5c2a69941cb458d0df1fc7424a37f7` (author implementation complete; frozen exact head)
- Coordinator reviewer after stable head/checks: Мира
- Independent technical reviewer after Mira PASS: Лёва
- Required boundaries: all-catalog Owner authority; AP-10 Owner-aware authoritative path; Owner-only elevated grant/revoke including role deletion; no schema/migration/Settings/super-admin/infra/mutex redesign by default
- Permanent documentation: separate closeout PR after implementation merge
- Марк не назначен
- Следующий шаг: **Мира — coordinator review block 2/4: AP-10 authority/immunity/direct admission wiring** on unchanged exact head `04865401cd5c2a69941cb458d0df1fc7424a37f7`; whole-PR PASS ещё не заявлен
- Авторские проверки exact head: CI #42345404967 SUCCESS (1974 app / 570 PG tests); Chromium #42345404812 SUCCESS on attempt 2 (AP-10/AP-11 + Admin History); first Chromium attempt had unroot-caused transient AP-11 Users detail HTTP 503, unchanged head passed rerun

# Admin panel — current workflow

- Служебный PR: #251; общий план: `ADMIN_PANEL_IMPLEMENTATION_PLAN.md`
- Current `main`: `bcf02193f82aa0d448444c6943d6ebdcf09f7896`, migrations 0000–0058
- Текущий этап: **owner/authorization redesign — Stage 1 independent technical review**
- Implementation PR: **#294**
- Stable exact head: `e3604222ae8cecb4b1f2f94cdd5d7e9f76c15e61`
- Technical plan: Лёва #6700603167
- Implementer: Лира
- Coordinator whole-PR review: **PASS**
- Exact-head CI #42328843126: SUCCESS
- Exact-head browser #42328843151: SUCCESS
- Independent reviewer: **Лёва**
- Implementation frozen; any head change restarts coordinator-first review
- Preserve: `authz_mutation_lock` mutex/FOR UPDATE/runtime privilege, fresh authz, AP-10 authority, atomic History
- Out of scope: owner authority, mutex redesign/removal, Settings, super-admin UI, Stage 6/production
- Марк не назначен
- Следующий шаг: Лёва independently reviews exact head #294 and records PASS/findings in #251

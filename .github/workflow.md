# Complaints — current workflow

- Служебный PR: #254
- План: `COMPLAINTS_IMPLEMENTATION_PLAN.md`
- Этап: Package 5 — bounded correction после independent technical review
- Координатор: Мира — ChatGPT-5.6 Sol
- Technical reviewer: Лёва — Codex-6.1 Sol
- Исполнитель: Лира — ChatGPT-6
- Current main: `1ad8a6402111928c0f08e6f15aba624ba18a4426`
- Implementation PR: #277 (`chatgpt/complaints-package-5`), Draft
- Reviewed exact head: `1af1c6272bf7b46009145488b52a42f89bfd0b2f`
- Exact-head CI #41501045924: **SUCCESS** — 1736/1736 application tests, 455/455 PostgreSQL tests, lint/typecheck/builds/migrations/schema/Worker smoke PASS
- Coordinator whole-PR review прежнего exact head: **PASS**.
- Independent technical review Лёвы: **CHANGES REQUIRED — 2 P2 / 2 P3**.
- Мира независимо перепроверила findings: **4/4 CONFIRMED current-scope**.
- Correction scope:
  1. исправить positive-page parsing timeline History;
  2. исправить desktop layout complaint-decision notification без фиктивного avatar;
  3. локализовать persisted Appeal outcome `upheld | overturned` в readonly History;
  4. реализовать утверждённую strict notifications POST boundary: bounded URL-encoded input, duplicate/unknown/id validation, сохранив session/same-origin/ownership/result-membership semantics.
- Package 6+, schema/domain/API/permissions и несвязанный refactor не входят в correction без нового подтверждённого дефекта.
- Следующий шаг: Лира исправляет четыре подтверждённых дефекта в PR #277, получает новый stable exact head и применимые checks. После её handoff — новый coordinator whole-PR cycle Миры; после PASS — independent technical review Лёвы того же head.

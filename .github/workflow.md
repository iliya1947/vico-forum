# Complaints — current workflow

- Служебный PR: #254
- План: `COMPLAINTS_IMPLEMENTATION_PLAN.md`
- Этап: Package 5 — correction пяти подтверждённых current-scope findings завершена; следующий coordinator whole-PR review
- Координатор/следующий reviewer: Мира — ChatGPT-5.6 Sol
- Technical reviewer только после coordinator PASS: Лёва — Codex-6.1 Sol
- Исполнитель correction: Лира — ChatGPT-6 (handoff завершён)
- Current main: `1ad8a6402111928c0f08e6f15aba624ba18a4426`
- Implementation PR: #277 (`chatgpt/complaints-package-5`), Draft; **stable exact head** `1af1c6272bf7b46009145488b52a42f89bfd0b2f`
- Старый review head: `5ad59262ea6ef1c2cc5b917f4d03c94564112460` — coordinator CHANGES REQUIRED (5 confirmed findings)
- Correction: bounded SQL History excerpt; strict normalized P5 URL/query; legacy-vs-generic notification count/header; resolved History total; readonly Appeal side/ordinal; targeted regressions
- [Exact-head CI #41501045924](https://github.com/iliya1947/vico-forum/actions/runs/41501045924) **SUCCESS**: 1736/1736 application tests (123 files); 455/455 PostgreSQL tests (36 files); lint/typecheck/builds/migrations/schema/Worker smoke PASS
- Targeted interactive Chromium→Worker→PG и owner visual acceptance не заявляются; пользовательский Browser Лира не использует
- Следующий шаг: Мира начинает новый coordinator whole-PR review PR #277 на `1af1c6272bf7b46009145488b52a42f89bfd0b2f`; после её PASS — independent technical review Лёвы на том же exact head. Package 6+, production и merge вне текущего назначения.

# Complaints — current workflow

- Служебный PR: #254
- План: `COMPLAINTS_IMPLEMENTATION_PLAN.md`
- Текущий этап: Package 5 — implementation готова на Draft exact head; остаются documentation/acceptance/handoff
- Координатор: Мира — ChatGPT-5.6 Sol
- Технический планировщик/reviewer: Лёва — Codex-6.1 Sol
- Исполнитель: Лира — ChatGPT-6
- Current main: `1ad8a6402111928c0f08e6f15aba624ba18a4426`
- Technical plan Package 5: утверждён Мирой; хранится в `.github/agents/codex-6.1-sol.md`
- Implementation PR: #277 (`chatgpt/complaints-package-5`), Draft; head `a97ef20fdde64b8e4c76160e16fb011f1024935a`
- Scope: resolved Complaints History + complaint lifecycle + initial Decision result notifications через общую notifications surface + participant result
- Forward migration и минимальный `review-started` event подтверждены как current-scope необходимость
- Package 6 appeal workflow, новые sanctions/admin actions, Signals/Security и Stage 6 вне scope
- Exact-head CI: #41493212948 SUCCESS — 1728 application tests, 454 PostgreSQL tests, builds/metadata/schema/Worker smoke PASS.
- Следующий шаг: Лира завершает documentation, remaining acceptance/verification и author handoff в #254. До завершения этого этапа coordinator whole-PR review не начинается.

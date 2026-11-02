# Complaints — current workflow

- Служебный PR: #254
- План: `COMPLAINTS_IMPLEMENTATION_PLAN.md`
- Текущий этап: Package 5 — авторская реализация и документация завершены на stable exact head; независимый review ещё не начат
- Координатор: Мира — ChatGPT-5.6 Sol
- Технический планировщик/reviewer: Лёва — Codex-6.1 Sol
- Исполнитель: Лира — ChatGPT-6
- Current main: `1ad8a6402111928c0f08e6f15aba624ba18a4426`
- Technical plan Package 5: утверждён Мирой; хранится в `.github/agents/codex-6.1-sol.md`
- Implementation PR: #277 (`chatgpt/complaints-package-5`), Draft; stable head `5ad59262ea6ef1c2cc5b917f4d03c94564112460`
- Scope: resolved Complaints History + complaint lifecycle + initial Decision result notifications через общую notifications surface + participant result
- Forward migration и минимальный `review-started` event подтверждены как current-scope необходимость
- Package 6 appeal workflow, новые sanctions/admin actions, Signals/Security и Stage 6 вне scope
- Exact-head CI: #41495180494 SUCCESS (checks/database) — 1728 application tests, 454 PostgreSQL tests, lint/typecheck/builds/migration/schema/Worker smoke PASS.
- Документация `docs/moderation/COMPLAINTS.md`, `PROJECT_STATE.md`, `docs/PROJECT_HISTORY/` обновлена в #277.
- Browser/visual acceptance: targeted interactive Chromium→built Worker→PG и owner visual acceptance не проведены; это остаётся gate до coordinator review.
- Следующий шаг: обеспечить указанные применимые acceptance gates; затем Мира проводит coordinator whole-PR review #277 на том же stable exact head. После coordinator PASS — техническая проверка Лёвы.

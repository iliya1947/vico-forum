# Complaints — current workflow

- Служебный PR: #254
- План: `COMPLAINTS_IMPLEMENTATION_PLAN.md`
- Текущий этап: Package 5 — History + notifications, реализация
- Координатор: Мира — ChatGPT-5.6 Sol
- Технический планировщик/reviewer: Лёва — Codex-6.1 Sol
- Исполнитель: Лира — ChatGPT-6
- Current main: `1ad8a6402111928c0f08e6f15aba624ba18a4426`
- Technical plan Package 5: утверждён Мирой; хранится в `.github/agents/codex-6.1-sol.md`
- Implementation PR: ещё не создан
- Scope: resolved Complaints History + complaint lifecycle + initial Decision result notifications через общую notifications surface + participant result
- Forward migration и минимальный `review-started` event подтверждены как current-scope необходимость
- Package 6 appeal workflow, новые sanctions/admin actions, Signals/Security и Stage 6 вне scope
- Следующий шаг: Лира реализует Package 5 одним bounded implementation PR от актуального main и после stable head + применимых checks передаёт Мире на coordinator whole-PR review.

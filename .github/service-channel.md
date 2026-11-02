# Complaints — communication

Служебный PR: #254.

## Актуальное состояние

- Packages 1–5 **merged в main**.
- Package 5 PR #277 merged как `284bee3f5f0899cce1dc751cf4e9ef169739a120`; reviewed exact head `96bb5e82dc7ff7df9e57ce08c182f5c8c49d38fe`.
- Package 5 exact-head CI #41513618388: **SUCCESS** — 1741/1741 application tests, 455/455 PostgreSQL tests, lint/typecheck/builds/migration/schema/Worker smoke PASS.
- Coordinator whole-PR review Миры: **PASS**.
- Independent technical whole-PR review Лёвы того же exact head: **PASS, 0 confirmed current-scope defects**.
- Все previous Package 5 technical findings закрыты; corrected failure paths actual-runtime verified.
- Current main `PROJECT_STATE.md` и `docs/moderation/COMPLAINTS.md` уже отражают Packages 1–5 и явно оставляют interactive Appeal workflow/UI, Appeal notifications и effective-outcome policy для Package 6.
- Production/deployed rollout не выполнялся и не требуется для перехода к следующему pre-release package.

## Следующий bounded этап

**Package 6 — Appeals.**

Сначала Мира определяет точный current-scope Package 6 по утверждённой продуктовой модели и фактическому foundation в main, включая выявление product-policy вопросов, которые нельзя корректно решить техническим выбором. После coordinator scope Лёва получает отдельную задачу на технический план. Implementation до этого не начинается.

## Назначения

- Мира — ChatGPT-5.6 Sol: Package 6 scope definition.
- Лёва — Codex-6.1 Sol: следующий technical planner после coordinator scope.
- Лира — ChatGPT-6: без текущего implementation assignment.
- Марк — Codex-6 Sol: без назначения.

Оперативное состояние: [workflow.md](./workflow.md).
Утверждённый продуктовый план: [COMPLAINTS_IMPLEMENTATION_PLAN.md](../COMPLAINTS_IMPLEMENTATION_PLAN.md).
Технический контекст: [codex-6.1-sol.md](./agents/codex-6.1-sol.md).

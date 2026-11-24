# WORKFLOW.md — текущее оперативное состояние, назначения, блокеры и следующий переход

## Текущее состояние

1. Service PR **#320**, branch `service/authentication-lifecycle`; не merge в main.
2. Planning baseline main `9f4c9c8d5e18f42db9b12cf23bc07322ef8f6432`; product-scope revalidation Лены **PASS**.
3. Полный технический план AUTH-01–AUTH-07 подготовлен Лёвой и после correction pass принят Мирой: **COORDINATOR PASS**.
4. Delivery mode: **stacked AUTH-01 → AUTH-02a → AUTH-02b → AUTH-03 → AUTH-04 → AUTH-05 → AUTH-06**. AUTH-07 — финальный security/review gate на собранном stable exact head.
5. Активный bounded-этап: **AUTH-01 — Mail foundation**.
6. По прямому назначению владельца текущий исполнитель: **Лёва / Codex-6.1 Sol**.
7. Первый implementation PR создаётся от текущего `main`; implementation PR/head пока отсутствует.
8. После author self-check и применимых checks AUTH-01 Мира проводит coordinator checkpoint. Следующая stacked-ступень не начинается до PASS.
9. Поскольку Лёва участвует в implementation, он не может быть независимым final reviewer собственной реализации; независимый reviewer финальной сборки будет определён отдельно по `AGENTS.md`.
10. Реальные mail/anti-bot/Google production resources и Stage-6 external activation запрещены до explicit owner resume.
11. Действующий scope — `PLAN.md` и `stages/AUTH-01/PLAN.md`.

## Следующий переход

Лёва реализует только AUTH-01 в первом stacked implementation PR: provider-neutral auth-mail boundary, Resend/Brevo transport adapters через injected transport, local/CI fake transport, templates/URL/config/runtime seams и acceptance из stage plan. Signup/session/verification behavior на этой ступени не менять. После stable head и self-check/checks зафиксировать PR/head/evidence в #320 и остановиться для coordinator checkpoint Миры.

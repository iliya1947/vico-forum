# WORKFLOW.md — текущее оперативное состояние, назначения, блокеры и следующий переход

## Текущее состояние

1. Service PR **#320**, branch `service/authentication-lifecycle`; не merge в main.
2. Planning baseline main `9f4c9c8d5e18f42db9b12cf23bc07322ef8f6432`; product-scope revalidation Лены **PASS**.
3. Полный технический план AUTH-01–AUTH-07 подготовлен. Лёва выполнил назначенный Мирой correction pass: убраны legacy/grandfathering ветви и ложный owner blocker, AUTH-05 стал provider-neutral без обязательного Turnstile adapter.
4. Текущая фаза: **coordinator correction review pending**. Прежний HOLD не объявлен самостоятельно пройденным; Мира проверяет выполненные corrections.
5. Mandatory verification — единый target contract; local/CI fixtures корректируются в implementation. Дополнительное решение владельца по гипотетическим старым аккаунтам не требуется.
6. Implementation исполнитель/PR/head не назначены. CI/acceptance/external activation на correction pass не выполнялись.
7. Stage 6 отдельно **BLOCKED** до explicit owner resume; фактический external state проверяется только в разрешённой operational фазе.

## Следующий переход

Мира проверяет только два назначенных исправления в PLAN.md: единый mandatory-verification target без legacy-политики и provider-neutral AUTH-05. После принятия определяет delivery mode и следующее конкретное назначение по AGENTS.md. Остальная архитектура не переработана; recommendation AUTH-01 independent / AUTH-02–06 stack / AUTH-07 final gate не является назначением implementation.

Контекст: PLAN.md, COMMUNICATION.md, agents/leva.md; exact-version research — research/better-auth-1.7.7.md. Лёва других агентов не запускает.

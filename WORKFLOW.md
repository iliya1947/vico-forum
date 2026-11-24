# WORKFLOW.md — текущее оперативное состояние, назначения, PR/head, блокеры и следующий переход

## Текущее состояние

1. Service PR: **#320**.
2. Service branch: `service/authentication-lifecycle`.
3. Revalidation baseline: main `9f4c9c8d5e18f42db9b12cf23bc07322ef8f6432`.
4. Независимая revalidation Лены / GPT-6.2: **PASS — product scope**. AUTH-01–AUTH-07 сохранены. Результат и актуальные зависимости: COMMUNICATION.md; статус PLAN.md обновлён.
5. Следующая фаза: **полный технический план всей authentication lifecycle задачи**.
6. Следующий назначенный агент: Лёва / Codex-6.1 Sol; ожидает подключения владельцем.
7. Мира: после полного плана определяет delivery mode и координирует дальнейший implementation cycle по AGENTS.md.
8. Реализатор не назначен; implementation PR/head отсутствует.
9. Старый AUTH-01 technical plan superseded. Implementation/security acceptance не проводилась.
10. Blocker: нет нового полного технического плана и определённого delivery mode. Stage 6 external activation остаётся отдельно заблокированной.

## Следующий переход

Лёва после подключения читает TASK.md, WORKFLOW.md, PLAN.md, DECISIONS.md и COMMUNICATION.md согласно RULES.md; проверяет актуальность baseline и составляет полный технический PLAN.md для AUTH-01–AUTH-07. Требования к результату — TASK.md и PLAN.md. Implementation не начинать. После готовности плана передать его Мире для следующего coordinator шага.

Назначение Лены завершено; на этой границе она останавливается.

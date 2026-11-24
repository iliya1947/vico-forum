# WORKFLOW.md — текущее оперативное состояние, назначения, блокеры и следующий переход

## Текущее состояние

1. Service PR **#320**, branch `service/authentication-lifecycle`; не merge в main.
2. Planning baseline main `9f4c9c8d5e18f42db9b12cf23bc07322ef8f6432`.
3. Revalidation Лены: **PASS — product scope**; не technical/security acceptance.
4. Лёва подготовил **полный технический план AUTH-01–AUTH-07** в PLAN.md. Исследование exact Better Auth 1.7.7/current seams — research/better-auth-1.7.7.md. Статус плана: **prepared, coordinator review pending**.
5. Активная фаза: передача результата технического планирования Мире для проверки полноты/зависимостей и выбора delivery mode.
6. Implementation исполнитель/PR/head не назначены. CI/acceptance на planning назначении не запускались.
7. Q-01 owner decision pending: обязательное подтверждение для ранее созданных unverified credential accounts и их прежних sessions. Рекомендован secure cutover; обе ветви в PLAN §4. Вопрос задан владельцу; ответ не получен. Блокирует выбор/реализацию AUTH-02 cutover, не review остальных частей.
8. Stage 6 external activation отдельно **BLOCKED** до explicit owner resume.

## Следующий переход

Мира принимает результат планирования, проверяет модель/зависимости и определяет independent/stacked delivery mode по AGENTS.md. Техническая рекомендация: AUTH-01 может быть independent, AUTH-02–06 образуют одну vertical stack с coordinator checkpoints, AUTH-07 — final exact-head gate. Назначение implementation выполняет Мира после принятия плана; этот handoff сам реализацию не разрешает.

До AUTH-02 получить и записать owner Q-01 в DECISIONS.md, конкретизировать выбранный legacy cutover в PLAN. Актуальный подробный контекст — PLAN.md, research/better-auth-1.7.7.md, DECISIONS.md и COMMUNICATION.md. Лёва других агентов не запускает; разработчик подключает Миру.

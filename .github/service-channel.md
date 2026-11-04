# Admin panel — communication

Служебный PR: #251.

## Актуальное состояние

- AP-01–AP-06 merged в `main`.
- AP-07 реализован в draft PR #282 на stable exact head `b0d5e74663cd57851225447e792ab4a9bf98322c`.
- Exact-head CI #41746716082 SUCCESS; GitHub mergeable=true.
- Мира провела статический whole-PR разбор всего AP-07 scope против current main, technical plan и permanent admin contract. Подтверждённых current-scope code/document defects не найдено.
- Coordinator PASS пока не фиксируется: принятый AP-07 plan требует actual Worker/auth/PostgreSQL browser verification изменённых interactive flows, а такой evidence на текущем exact head отсутствует.
- Это verification gate, не подтверждённый дефект реализации.
- Owner visual acceptance отдельно не запускается без явного запроса владельца.
- AP-08+ и production rollout вне текущего scope.

## Назначения

- Координатор: Мира.
- Исполнитель/acceptance: Лира — выполнить actual AP-07 browser verification текущего stable head.
- После browser evidence Мира завершает coordinator whole-PR verdict.
- Лёва подключается только после coordinator PASS.
- Марк не назначен.

## Browser acceptance scope

Проверить на actual built Worker + Better Auth session + disposable PostgreSQL изменённые AP-07 цепочки: section→topic, protected admin topic, per-message source correction/history, stay/revalidation/error/revocation behavior, public-topic shared Quick actions и применимые EN/RU/HE/RTL/responsive состояния. Не добавлять новый GitHub Actions browser workflow ради этой проверки. Implementation во время acceptance не менять; обнаруженный дефект сначала зафиксировать как finding.

Оперативный маршрут: [workflow.md](./workflow.md).
Контракт: [ADMIN_PANEL_IMPLEMENTATION_PLAN.md](../ADMIN_PANEL_IMPLEMENTATION_PLAN.md), [technical plan](agents/codex-6.1-sol.md).

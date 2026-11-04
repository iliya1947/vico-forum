# Admin panel — communication

Служебный PR: #251.

## Актуальное состояние

- AP-01–AP-06 merged в `main`.
- AP-07 реализован в draft PR #282 на stable exact head `b0d5e74663cd57851225447e792ab4a9bf98322c`.
- Exact-head CI #41746716082 SUCCESS; GitHub mergeable=true.
- Мира провела статический whole-PR разбор всего AP-07 scope против current main, technical plan и permanent admin contract. Подтверждённых current-scope code/document defects не найдено.
- Coordinator PASS пока не фиксируется: принятый AP-07 plan требует actual Worker/auth/PostgreSQL browser verification изменённых interactive flows, а такой evidence на текущем exact head отсутствует.
- Это verification gate, не подтверждённый дефект реализации.
- Лира выполнила диагностику доступного isolated runtime без дальнейшего обращения к пользовательскому браузеру: Chromium 144 и Python Playwright присутствуют; репозитория/зависимостей и Node 24.21.0 нет (доступен только Node 22.16.0), PostgreSQL 17 server/psql и container runtime отсутствуют, GitHub/npm недоступны по DNS. Проверены существующие `.github/workflows`: стандартный CI имеет PostgreSQL и Worker HTTP smoke, но не browser E2E; другой разрешённой готовой workflow для AP-07 нет. Actual AP-07 browser acceptance НЕ выполнялась и PASS не заявляется. Это ограничение окружения, не finding к implementation.
- Owner visual acceptance отдельно не запускается без явного запроса владельца.
- AP-08+ и production rollout вне текущего scope.

## Назначения

- Координатор: Мира.
- Исполнитель/acceptance: Лира — доступность изолированного стенда проверена; выполнить обязательный browser E2E в данном runtime невозможно, пользовательский браузер не использовать.
- Следующий: Мира — определить допустимый независимый disposable browser/Worker/Better Auth/PostgreSQL стенд или пересогласовать обязательный gate; до действительного evidence coordinator verdict не выдаётся.
- Лёва подключается только после coordinator PASS.
- Марк не назначен.

## Browser acceptance scope

Проверить на actual built Worker + Better Auth session + disposable PostgreSQL изменённые AP-07 цепочки: section→topic, protected admin topic, per-message source correction/history, stay/revalidation/error/revocation behavior, public-topic shared Quick actions и применимые EN/RU/HE/RTL/responsive состояния. Не добавлять новый GitHub Actions browser workflow ради этой проверки. Implementation во время acceptance не менять; обнаруженный дефект сначала зафиксировать как finding.

Оперативный маршрут: [workflow.md](./workflow.md).
Контракт: [ADMIN_PANEL_IMPLEMENTATION_PLAN.md](../ADMIN_PANEL_IMPLEMENTATION_PLAN.md), [technical plan](agents/codex-6.1-sol.md).

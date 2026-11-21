# WORKFLOW.md — текущее оперативное состояние задачи.

## Current state

- Задача: переосмысление архитектуры UI progress preview.
- Service workspace создан от main `9cff976a9621d9fe5dfef28ea5367e390ff435b1`; перед подэтапом 2 подтверждено, что `main` остаётся на этом exact head.
- Активный этап: **концептуальное проектирование до технического плана**.
- Исполнитель: **Мира-3 (GPT-5.6 Sol)**.
- Реализация: **не авторизована**.
- Изменения старых implementation PR: **не входят в текущую задачу**.
- Подэтап 1 завершён: установлена production dependency/runtime boundary для static preview.
- Подэтап 2 завершён: установлен минимальный способ разорвать browser graph без массового production refactor.
- Результат: `research/concept.md`, разделы 1–8.
- Вывод подэтапа 2: настоящие production routes/loaders/actions и application `.server` helpers сохраняются; preview-only module-resolution boundary должна подменять только genuinely server infrastructure modules (`db/hyperdrive-*`, `db/postgres-deadlines` и будущие эквивалентные infrastructure imports).
- Прямые Hyperdrive runtime imports в 37 non-test route-модулях используются для availability error classes, а не для PostgreSQL factories.
- Production `app/routes/auth-api.ts` уже работает через `authRuntimeContext`, поэтому сам auth resource route не требует второй preview-реализации Better Auth endpoints.
- Реализация этого вывода не начиналась.

## Next transition

STOP по правилу декомпозиции. После команды разработчика следующий подэтап — определить, как сохранить **один источник истины для production route table**: получить Data Router preview из `app/routes.ts` или его производного без вручную продублированного списка маршрутов, затем определить связь этого же router с local transport для прямых application `fetch()`.

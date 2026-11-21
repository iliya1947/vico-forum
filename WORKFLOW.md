# WORKFLOW.md — текущее оперативное состояние задачи.

## Current state

- Задача: переосмысление архитектуры UI progress preview.
- Service workspace создан от main `9cff976a9621d9fe5dfef28ea5367e390ff435b1`; перед подэтапом 3 подтверждено, что `main` остаётся на этом exact head.
- Активный этап: **концептуальное проектирование до технического плана**.
- Исполнитель: **Мира-3 (GPT-5.6 Sol)**.
- Реализация: **не авторизована**.
- Изменения старых implementation PR: **не входят в текущую задачу**.
- Подэтап 1 завершён: установлена production dependency/runtime boundary для static preview.
- Подэтап 2 завершён: установлен минимальный способ разорвать browser graph без массового production refactor.
- Подэтап 3 завершён: установлен единый source of truth для preview routing без ручной копии URL hierarchy.
- Результат: `research/concept.md`, разделы 1–10.
- Route source of truth остаётся production `app/routes.ts` (77 entries).
- Preview должен получать resolved plain route config на build-time и generic-адаптером связывать `RouteConfigEntry.file` с настоящими production route modules через общий Vite module registry.
- Текущий manual `createMemoryRouter` route list из `app/ui-preview/preview-app.tsx` в целевой модели не сохраняется.
- Route-module adapter сохраняет production `loader/action/Component/ErrorBoundary/shouldRevalidate`, locale `middleware` и три editor `clientAction`; отдельные route implementations не создаются.
- Реализация этого вывода не начиналась.

## Next transition

STOP по правилу декомпозиции. После команды разработчика следующий подэтап — определить **local application transport**: как направить прямые browser `fetch()` к тому же production Data Router/resource routes локально, без endpoint dispatcher-дубликата и без запросов к GitHub Pages backend.

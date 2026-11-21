# WORKFLOW.md — текущее оперативное состояние задачи.

## Current state

- Задача: переосмысление архитектуры UI progress preview.
- Service workspace создан от main `9cff976a9621d9fe5dfef28ea5367e390ff435b1`; перед подэтапом 4 подтверждено, что `main` остаётся на этом exact head.
- Активный этап: **концептуальное проектирование до технического плана**.
- Исполнитель: **Мира-3 (GPT-5.6 Sol)**.
- Реализация: **не авторизована**.
- Изменения старых implementation PR: **не входят в текущую задачу**.
- Подэтап 1 завершён: установлена production dependency/runtime boundary для static preview.
- Подэтап 2 завершён: установлен минимальный способ разорвать browser graph без массового production refactor.
- Подэтап 3 завершён: установлен единый source of truth для preview routing без ручной копии URL hierarchy.
- В подэтапе 4 исправлена пропущенная деталь подэтапа 3: Data Router adapter обязан воспроизводить Framework route IDs (`entry.id ?? file-without-extension`), иначе текущие `meta()` consumers `routes/locale-boundary` разойдутся с production.
- Подэтап 4 завершён: установлен local application transport для всех текущих программируемых browser HTTP requests.
- Результат: `research/concept.md`, разделы 1–13.
- Один generic `dispatchLocalRequest(Request)` строится на публичном React Router 8.3.1 `createStaticHandler(...).queryRoute()` и том же production route config/module registry.
- Same-origin production-route-aware `fetch` wrapper покрывает текущие direct fetch calls и Better Auth, если устанавливается до lazy evaluation `auth-client.ts`.
- Attachment upload через current `XMLHttpRequest` требует только узкого preview XHR adapter поверх того же dispatcher; production editor переписывать не нужно.
- Service Worker не выбран: он усложняет единое in-memory состояние и scope/lifecycle ради static Pages.
- Единственная оставшаяся transport/presentation граница: native attachment byte delivery через `<img>/<a>` на `/api/attachments/file/*`, который page-level fetch/XHR interception не перехватывает.
- Реализация этих выводов не начиналась.

## Next transition

STOP по правилу декомпозиции. После команды разработчика следующий подэтап — решить **native attachment byte delivery** для Pages: оставить честным ограничением static preview либо обосновать минимальную preview URL boundary для raster/open/download без Service Worker и без второго backend.

# WORKFLOW.md — текущее оперативное состояние задачи.

## Current state

- Задача: переосмысление архитектуры UI progress preview.
- Service workspace создан от main `9cff976a9621d9fe5dfef28ea5367e390ff435b1`; перед подэтапом 5 подтверждено, что `main` остаётся на этом exact head.
- Активный этап: **концептуальное проектирование до технического плана**.
- Исполнитель: **Мира-3 (GPT-5.6 Sol)**.
- Реализация: **не авторизована**.
- Изменения старых implementation PR: **не входят в текущую задачу**.
- Подэтап 1 завершён: установлена production dependency/runtime boundary для static preview.
- Подэтап 2 завершён: установлен минимальный способ разорвать browser graph без массового production refactor.
- Подэтап 3 завершён: установлен единый source of truth для preview routing без ручной копии URL hierarchy.
- В подэтапе 4 исправлена существенная пропущенная деталь подэтапа 3: Data Router adapter обязан воспроизводить Framework route IDs (`entry.id ?? file-without-extension`), иначе текущие `meta()` consumers `routes/locale-boundary` разойдутся с production.
- Подэтап 4 завершён: установлен local application transport для всех текущих программируемых browser HTTP requests.
- Подэтап 5 завершён: закрыта native attachment byte boundary для `<img>/<a>` без Service Worker и второго backend.
- Результат: `research/concept.md`, разделы 1–15.
- Native attachment bytes в Pages должны идти через одну общую presentation resource boundary: production возвращает текущие controlled `/api/attachments/file/*` URLs, preview — `blob:` URLs из in-memory fake bucket.
- Это сохраняет production attachment routes/actions/state, но Pages не заявляет R2/download authorization/HTTP acceptance.
- Transport/R2 concept теперь закрыт: fetch/Better Auth -> local dispatcher; XHR upload -> узкий adapter; native attachment display/download -> presentation URL resolver.
- Реализация этих выводов не начиналась.

## Next transition

STOP по правилу декомпозиции. После команды разработчика следующий conceptual block — определить **единый deterministic test state и preview controls**: users/roles/forum/settings/complaints/notifications/personal state/Admin/Owner/empty/error fixtures и переключение identity/locale/viewport/scenario без переписывания ownership или второй product logic.

# TASK.md — цель, границы и критерий завершения аудита stale/legacy хвостов Vico Forum.

## Цель

Провести системный аудит актуального `main` и найти все случаи, где фактическая реализованная capability уже изменилась, а другая часть репозитория продолжает обслуживать, описывать или тестировать прежнее состояние.

Это отдельная диагностическая задача. Она не относится к moderation visibility `#342`, UI progress preview `#322` или безопасности `#315`.

## Исходный сигнал

Обнаружен конкретный конфликт вокруг Settings:

- реальные маршруты `/:locale/settings`, `/settings/forum`, `/settings/user`, `/settings/account`, `/settings/privacy`, `/settings/administrator` уже существуют;
- одновременно сохранился `/:locale/under-development?feature=admin-settings`;
- `app/routes/admin-forum-legacy.test.ts` требует сохранять Settings-placeholder.

Этот пример является сигналом возможного более широкого класса устаревших хвостов, а не единственным заранее заданным finding.

## Что требуется от Миры-2

Построить аудит **от текущего продукта**, а не от grep по словам `legacy`, `placeholder`, `future`, `under-development`.

1. Сначала построить каноническую карту реально реализованных пользовательских и административных capabilities текущего `main`.
2. Для каждой capability найти все связанные представления:
   - routes / redirects;
   - navigation / links;
   - feature/status registries;
   - unit/integration/browser tests;
   - UI preview / fixtures;
   - localization catalog/manual values/fingerprints;
   - активные docs/status documents;
   - compatibility aliases;
   - helper/API seams и scaffold branches.
3. Найти противоречия между текущей capability и оставшимся старым состоянием.
4. Для каждого кандидата проверить всю связанную цепочку и классифицировать:
   - **A — confirmed stale tail**;
   - **B — intentional compatibility boundary**;
   - **C — genuinely unfinished current-stage item**;
   - **D — historical text only**;
   - **E — not established**.
5. Первый finding аудит не завершает.
6. Во время аудита **ничего не исправлять**.
7. Итог первого этапа — один системный реестр, а не серия случайных находок.

## Критерий завершения первого этапа

Аудит завершён только когда:
- построена карта текущих реализованных capabilities;
- каждая заявленная область репозитория сопоставлена с этой картой;
- кандидаты классифицированы на основании проверенных цепочек;
- сформирован единый реестр подтверждённых stale tails с фактическим эффектом и рекомендуемым типом дальнейшего действия: удалить / redirect / обновить / оставить;
- отдельно перечислены намеренные compatibility boundaries и действительно unfinished элементы, чтобы cleanup их не затронул;
- никаких исправлений реализации ещё нет.

После этого STOP и возврат разработчику.

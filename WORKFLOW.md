# WORKFLOW.md — текущее оперативное состояние задачи.

## Current state

- Задача: переосмысление архитектуры UI progress preview.
- Service workspace создан от main `9cff976a9621d9fe5dfef28ea5367e390ff435b1`.
- Активный этап: **концептуальное проектирование до технического плана**.
- Исполнитель: **Мира-3 (GPT-5.6 Sol)**.
- Реализация: **не авторизована**.
- Изменения старых implementation PR: **не входят в текущую задачу**.
- Подэтап 1 завершён: установлена production dependency/runtime boundary для static preview.
- Результат: `research/concept.md`, разделы 1–6.
- Ключевой открытый вопрос: минимальная browser-safe boundary для настоящих production route modules без втягивания `node-postgres`/Worker-only dependencies.

## Next transition

STOP по правилу декомпозиции. После команды разработчика следующий подэтап — исследовать и выбрать минимальный способ сделать production route module graph browser-safe, не создавая вторую реализацию routes/loaders/actions.

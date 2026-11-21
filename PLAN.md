# PLAN.md — актуальный план диагностического аудита; реализация исправлений пока не планируется.

## Метод

### Этап 1 — canonical capability map
Получить фактический current-product map из актуального `main`: маршруты, доступные поверхности, реальные handlers/readers/writers и текущие source-of-truth статусы.

### Этап 2 — cross-repository projection
Для каждой capability найти все её представления в code/tests/preview/localization/docs/aliases/helpers.

### Этап 3 — contradiction analysis
Проверять не наличие слов-маркеров, а несогласованность текущего и старого состояния. Для каждого кандидата установить реальный путь исполнения/использования и фактический эффект.

### Этап 4 — classification
Классифицировать только после проверки связанной цепочки: stale / compatibility / unfinished / historical / unknown.

### Этап 5 — registry
Собрать единый реестр. Никаких исправлений до отдельного решения разработчика.

## Ограничения

- Не использовать предыдущие findings как установленную истину.
- Не смешивать эту задачу с `#342`, `#322`, `#315`.
- Не создавать implementation PR.
- Не менять runtime/product/docs/localization/tests в рамках аудита.

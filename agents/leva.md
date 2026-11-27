Этот файл хранит персональную рабочую память Лёвы по данной задаче.

# Лёва

## Текущее назначение

Исправить полный технический план по единственному блокирующему finding Миры.

## Контекст

1. Действующий product scope: `research/product-scope-v1.md`.
2. Текущий план: `PLAN.md`.
3. Проверка Миры: `research/plan-review-mira.md` — **HOLD, F-01**.

## Требуемый результат

Скорректировать transport/plugin boundary так, чтобы основной ChatGPT→GitHub путь:

1. сохранял private GitHub как transport;
2. не зависел от model-driven вызова отдельного GitHub plugin/connector для завершения public tool;
3. соответствовал актуальным правилам независимости/exposure model-callable plugin tools;
4. сохранял intent/confirmation, replay, untrusted-content, Worker-primary / Actions-additional, $0 и Stage-6 границы;
5. обновлял этапы/зависимости/acceptance там, где изменение архитектуры этого требует.

Не расширять продуктовый scope и не начинать реализацию.

После исправления передать обновлённый `PLAN.md` Мире на повторную проверку.

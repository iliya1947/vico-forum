Этот файл хранит персональную рабочую память Лёвы по данной задаче.

# Лёва

## Назначение

Подготовить **полный технический план всей задачи управления Vico Forum из обычного ChatGPT** до начала реализации.

## Область

Исходить из действующего продуктового scope и проверенной capability inventory:

1. `TASK.md`.
2. `research/product-scope-v1.md`.
3. `research/capability-inventory.md`.
4. `research/scope-review.md` — финальная проверка scope: PASS.

Не расширять продуктовый scope и не начинать реализацию.

## Требуемый результат

Полный технический план должен определить:

1. архитектурную границу и поток read/write команд;
2. способ переиспользования существующих authoritative server capabilities без второго backend;
3. identity/authentication/confirmation/replay/untrusted-content boundaries;
4. обработку committed / denied / conflict-stale / unavailable / outcome-unknown;
5. минимальный command/result protocol и необходимое хранение состояния;
6. роль Worker и GitHub Actions в установленной $0-модели;
7. bounded этапы реализации, их зависимости и критерии готовности;
8. repository/local-CI acceptance, достаточный для проверки product criteria v1;
9. что остаётся Stage 6 и не должно активироваться в рамках реализации.

## Готовность

План готов, когда он покрывает весь scope v1 без неразрешённых технических пробелов, не требует отсутствующих domain capabilities и позволяет Мире выбрать корректный delivery mode до начала реализации в `#399`.

Implementation PR: `#399`.
Служебный PR: `#400`.

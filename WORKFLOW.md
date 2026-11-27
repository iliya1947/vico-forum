# WORKFLOW.md — текущее состояние и следующий переход

1. Собранный PR #388 открыт, stable candidate `5d8bdaad117e59326f5eae61ea13613b0d45df7c`, tree `59901b92ce2753fb69adaa9c43ff09bbbcd70dba`, base/main `9f4c9c8d5e18f42db9b12cf23bc07322ef8f6432`.
2. Предыдущий final technical review Лёвы — HOLD на `5b29469fe51e716b483d4e610dd90705f5409029`; оба finding F-B2-03/F-B2-04 подтверждены Мирой. Technical plan unchanged.
3. **AUTH-07-CORRECTION-2 — AUTHOR SOURCE SELF-CHECK PASS / Лена STOP.** Оба исправления реализованы, содержательная проверка correction scope завершена. Результат и ограничения: `stages/AUTH-07-CORRECTION-2/RESULT.md`. Новые runtime/automated results не проверены. Лена тесты не запускает по прямой команде владельца; automated PASS не присвоен.
4. **Лёва — повторный owner-assigned final technical reviewer** нового exact head. Проверить реализацию и относящийся final gate, включая необходимые exact-head evidence; соблюсти установленное владельцем разделение ответственности за тесты (не Лена). Не считать source self-check финальным PASS. Марк и Лира не подключаются.
5. Merge, docs closeout и Stage-6 остаются заблокированы.

## Следующий переход

Лёва принимает stable candidate `5d8bdaad117e59326f5eae61ea13613b0d45df7c` и выполняет повторный final technical review. При дефекте текущей задачи вернуть findings; при PASS с выполненными обязательными gates зафиксировать фактический результат. Implementation во время review не менять. Решение о merge остаётся владельцу.

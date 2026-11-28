Этот файл фиксирует финальную внутреннюю проверку продуктового scope v1 перед передачей на техническое планирование.

# Scope review — 27.11.2026

## Проверено

1. Соответствие цели задачи и установленным ограничениям `TASK.md`.
2. Соответствие фактически существующим canonical capabilities из `research/capability-inventory.md`.
3. Отсутствие скрытого расширения продукта до отсутствующих domain operations.
4. Owner/authorization/resource/CAS/History boundaries.
5. Градация риска routine/sensitive.
6. Confirmation model.
7. Untrusted-content и transport boundary.
8. Replay/stale/outcome-unknown semantics.
9. Privacy/minimal projection.
10. Stage-6 и $0/обычный ChatGPT ограничения.

## Найденные и исправленные проблемы

1. **F-01 — Restore hidden content был ошибочно routine.**
   Restore снова делает ранее скрытый материал публично доступным и имеет не меньший содержательный риск, чем Hide. Исправлено: Hide и Restore требуют preview + explicit confirmation.

2. **F-02 — Section reparent был ошибочно routine.**
   Хотя операция обратима, она перемещает целый раздел вместе со всеми темами и имеет широкий публичный эффект. Исправлено: reparent section требует preview + explicit confirmation. Rename/reorder остаются routine.

3. **F-03 — untrusted boundary была сформулирована только для forum content.**
   Транспорт использует приватный GitHub, поэтому plain issue/comment/file/webhook content также нельзя считать authority. Исправлено: mutation intent требует отдельной аутентифицированной command boundary; transport/GitHub text не может сам создать command.

## Проверенные потенциальные противоречия, которые не являются проблемой

1. Owner-only канал не конфликтует с dynamic RBAC: exact bound Owner уже получает catalog-wide effective permissions, а resource/hierarchy/CAS/lifecycle проверки сохраняются.
2. Routine writes без второго confirmation допустимы только при однозначной явной команде Owner; discussion/hypothesis/quoted content не является intent.
3. Создание category/section остаётся sensitive, потому что текущий продукт не имеет canonical delete для этих контейнеров.
4. Account deactivation остаётся sensitive и не расширяется до reactivation/hard delete.
5. Super-admin Infrastructure не расширяется: в v1 только реальные существующие monitor reads, live infrastructure control исключён.
6. Complaints не получают второй writer: notes/decisions/appeals/priorities должны идти через существующий Complaints service.
7. Bulk automation не допускается как скрытый цикл поверх единичных mutations.

## Итог

**PASS после F-01–F-03 corrections.**

Scope v1 после исправлений непротиворечив целям текущей задачи и фактическим capabilities `main`. Существенных продуктовых вопросов, которые нужно передавать владельцу до технического планирования, не осталось.

Следующий шаг по регламенту — передача Лёве на полный технический план. Реализация `#399` до принятого полного плана не начинается.

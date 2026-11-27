# WORKFLOW.md — текущее оперативное состояние, назначения, блокеры и следующий переход

## Текущее состояние

1. Service PR #320; assembled implementation PR #388 open/unmerged, stable head `5b29469fe51e716b483d4e610dd90705f5409029`, base/main `9f4c9c8d5e18f42db9b12cf23bc07322ef8f6432`, tree `d0a50336d407a92229966bf1956ee38f6ea10f4f`.
2. Предыдущий AUTH-07 first review HOLD на `71cdb70d9a5a8b0d0efc3df724d62b736dff7601`: три confirmed current-scope findings. Мира подтвердила все три, technical-plan correction не требуется.
3. Лена / GPT-6.2 реализовала bounded correction (C1+C2) и завершила substantive author source self-check (C3): все три findings проверены по цепочкам actual source, новых confirmed blockers в correction scope нет. Результат: `stages/AUTH-07-CORRECTION/RESULT.md`. Лена STOP.
4. **Прямая новая команда владельца:** Лена не запускает тесты; запуск и проверка CI/acceptance принадлежат Мире. Тесты не подменяют самостоятельную проверку. Это изменение workflow, не technical plan. Не ждать завершения старых запусков для handoff. Предыдущие запуски и их последний зафиксированный статус сохранены в RESULT как historical execution evidence, не как основание substantive PASS.
5. **Мира — следующий whole-feature coordinator reviewer** corrected head, с ответственностью за применимые exact-head тесты. Проверить весь scope против TASK/root PLAN/current Stage и актуальных source-of-truth документов; не ограничиваться correction delta и не выводить correctness из green CI.
6. K5 correction accepted, не менять без нового подтверждённого основания. Лена не проводит независимый review собственной correction. Лира STOP. Марк не активирован.
7. Independent gate, main merge, docs closeout и Stage-6 activation заблокированы.

## Следующий переход

Мира принимает #388 exact `5b29469fe51e716b483d4e610dd90705f5409029` → substantive whole-feature review → применимые exact-head CI/acceptance (Мира отвечает за запуск/проверку) → coordinator verdict. При подтверждённом дефекте вернуть correction исполнителю. Только после PASS Миры на stable exact head отдельным переходом назначить Марка / Codex-6 Sol как independent final technical reviewer. До того merge и внешняя активация запрещены.

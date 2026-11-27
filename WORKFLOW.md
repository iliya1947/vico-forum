# WORKFLOW.md — текущее оперативное состояние, назначения, блокеры и следующий переход

## Текущее состояние

1. Service PR **#320**; implementation PR #388 к unchanged main `9f4c9c8d5e18f42db9b12cf23bc07322ef8f6432`.
2. Accepted AUTH-01–AUTH-06 assembled state восстановлен на exact `615d93598daf78945a86fbdc4255bc778ae3403f`, tree `9cd50834cd1d86aae2a1192bd8ff9fd27aebebbd`. Intermediate PRs superseded. Final substantive AUTHOR PASS, CI PASS и 19/20 connected acceptance; K5 #45912884312 дважды FAIL до upload.
3. K5-CORRECTION candidate `bb19d5c238dec436a57dc174b9c422a98b4ae4f1` **откачен по прямой команде владельца**. Рабочая ветка восстановлена на непосредственного родителя correction через force-with-lease с expected SHA; branch/tree и PR head проверены. Только собственная correction удалена из head, accepted product state неизменён. На candidate не было runs. Новые CI/acceptance не запускались.
4. K5 automated gate остаётся HOLD; product defect не установлен. Ранее подтверждённый synchronization defect и предложенный test-only correction сохранены как историческая диагностика, не текущая реализация. Connector не предоставляет targeted workflow_dispatch; это ограничение инструмента, не задача разработчика по ручному запуску.
5. **По прямой команде владельца: Ада STOP, Мира принимает задачу обратно.** Вход: stages/K5-CORRECTION/RESULT.md и stages/FINAL-ASSEMBLY/RESULT.md. Мира определяет дальнейшее назначение и маршрут закрытия K5 gate.
6. #388 open/unmerged. AUTH-07, independent review, main merge и external/Stage-6 activation остаются заблокированы.

## Следующий переход

Мира принимает текущий HOLD на восстановленном exact head `615d93598daf78945a86fbdc4255bc778ae3403f`. Не считать rolled-back candidate действующей correction. Ада не выполняет новые исправления и не запускает проверки до нового назначения. Developer только подключает Миру; manual dispatch владельцу не назначен.

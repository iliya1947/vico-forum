# Workflow — пользовательские действия перед #320

## Общий канал

- Service PR: #342.
- #342 остаётся открытым рабочим каналом; после завершения одного этапа здесь переключается текущий этап.

## Реализация

- Edit own topic title: завершён.
- Watch: implementation Лиры в Draft PR #345; **CI-stable technical head** `76c1c456557c614171a3b472758498795a668b9a`, base main `7cc23edede57994cdedab49c1556ddb55034dd29`, 17/17 exact-head GitHub checks PASS, включая database и connected watch_browser; GitHub mergeable, no changes since browser PASS.
- Watch independent technical review: **Лёва PASS** всего принятого scope на том же exact head `76c1c456557c614171a3b472758498795a668b9a` против main `7cc23edede57994cdedab49c1556ddb55034dd29`; подтверждённых current-scope findings нет. Выполнено по прямому назначению владельца в комментарии #342 `6983159716`, которое заменило прежний следующий шаг. Код не изменён; Лёва STOP, результат возвращён Мире в service-channel и личном файле.
- Review status boundary: этот technical PASS не означает owner visual acceptance, coordinator PASS, завершённый docs closeout или разрешение merge/deploy. #345 остаётся Draft; оставшийся процесс ведёт Мира.
- Bookmarks: план принят, реализация ждёт очереди.
- Mute/block: план принят, реализация ждёт очереди.

## Опережающий planning-track

- Watch / Bookmarks / Mute-block: спланированы.
- Последний завершённый planning-slice Лёвы: **модерация видимости опубликованного контента** из общей карты #300.
- Полный план: **готов**, V1–V9 в `USER_ACTIONS_SERVICE_PLAN.md`; ожидает whole-plan scope/fit Миры по V-P1/V-P2/V-P3, V-T1/V-T2 и связанным resource/cache contracts.
- Лёва: **STOP** после завершённого плана; implementation не активирован.
- Следующий planning-slice после отдельной команды владельца: **управление структурой форума / перенос тем**.

## Следующий шаг

Мира принимает результат независимого технического review Watch #345 на `76c1c456557c614171a3b472758498795a668b9a` и фиксирует дальнейший coordinator/acceptance/docs маршрут; служебный #342 не merge. Лёва STOP. Новые planning-slice, включая структуру форума/перенос тем, не начаты и требуют отдельной команды владельца. Visibility plan остаётся готовым к scope/fit Миры; metadata #346/#342 требуют прежней синхронизации. Implementation-order не меняется.

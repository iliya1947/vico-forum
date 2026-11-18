# Workflow — пользовательские действия перед #320

## Общий канал

- Service PR: #342.
- #342 остаётся открытым рабочим каналом; после завершения одного этапа здесь переключается текущий этап.

## Реализация

- Edit own topic title: завершён.
- Watch: implementation Лиры в Draft PR #345; **CI-stable technical head** `76c1c456557c614171a3b472758498795a668b9a`, base main `7cc23edede57994cdedab49c1556ddb55034dd29`, 17/17 exact-head GitHub checks PASS, включая database и connected watch_browser; GitHub mergeable, no changes since browser PASS.
- Watch formal review gate: owner visual acceptance не зафиксирована (исключение для #343 не переносится); PR Draft, stable *review* head ещё не объявлен. Следующий шаг — визуальное решение владельца Watch, затем по отдельной команде Мира coordinator whole-PR review exact head → после PASS Лёва independent review. Лира STOP.
- Bookmarks: план принят, реализация ждёт очереди.
- Mute/block: план принят, реализация ждёт очереди.

## Опережающий planning-track

- Watch / Bookmarks / Mute-block: спланированы.
- Текущий planning-slice Лёвы: **модерация видимости опубликованного контента** из общей карты #300.
- Полный план: **готов**, V1–V9 в `USER_ACTIONS_SERVICE_PLAN.md`; ожидает whole-plan scope/fit Миры по V-P1/V-P2/V-P3, V-T1/V-T2 и связанным resource/cache contracts.
- Лёва: **STOP** после завершённого плана; implementation не активирован.
- Следующий planning-slice после отдельной команды владельца: **управление структурой форума / перенос тем**.

## Следующий шаг

Мира проверяет полный visibility plan, фиксирует scope/fit решения и необходимые продуктовые развилки владельца. Синхронизирует metadata дублирующего #346 и устаревшее описание #342 с единым рабочим каналом. Лёва STOP; структура форума/перенос тем — только по следующей отдельной команде владельца. Implementation-order не меняется, Watch остаётся текущей реализацией Лиры.

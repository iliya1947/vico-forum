# Workflow — пользовательские действия перед #320

## Общий канал

- Service PR: #342.
- #342 остаётся открытым рабочим каналом; после завершения одного этапа здесь переключается текущий этап.

## Реализация

- Edit own topic title: завершён.
- Watch: текущая активная реализация Лиры в #345.
- #345 interim head `76c1c456557c614171a3b472758498795a668b9a`: `watch_browser` job `134873103841` **PASS** (real Chromium/Worker/Better Auth/PG17, ordinary+Help topic, inbox/permalink/RTL). Previous 429 due 5s publication cooldown in test; only browser test changed. STOP; next explicit owner command: whole-CI exact-head gate + coordinator handoff, not yet stable review head.
- Лира: PostgreSQL concurrency/lifecycle slice **STOP/PASS**; interim head `2b84f5eb91d161ac4aba2311335195d46f07693b`, +2 real PG lifecycle tests; initial `database` job unhandled rejection in existing Complaints test (all Watch tests PASS); same-exact-head rerun database job `134868877271` **PASS**. Следующая самостоятельная подзадача — connected Chromium/Worker Watch acceptance (`watch_browser` FAIL), только по команде разработчика.
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

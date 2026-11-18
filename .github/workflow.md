# Workflow — пользовательские действия перед #320

## Общий канал

- Service PR: #342.
- #342 остаётся открытым рабочим каналом; после завершения одного этапа здесь переключается текущий этап.

## Реализация

- Edit own topic title: завершён.
- Watch: implementation Лиры в Draft PR #345; **CI-stable technical head** `76c1c456557c614171a3b472758498795a668b9a`, base main `7cc23edede57994cdedab49c1556ddb55034dd29`, 17/17 exact-head GitHub checks PASS, включая database и connected watch_browser; GitHub mergeable, no changes since browser PASS.
- Watch coordinator whole-PR review: **Мира PASS** на exact head `76c1c456557c614171a3b472758498795a668b9a`; подтверждённых current-scope findings нет.
- Watch independent technical review: **Лёва PASS** всего принятого scope на том же exact head `76c1c456557c614171a3b472758498795a668b9a` против main `7cc23edede57994cdedab49c1556ddb55034dd29`; подтверждённых current-scope findings нет. Код не изменён; Лёва STOP.
- Review synthesis: оба review совпали на неизменном exact head, расхождений и подтверждённых current-scope defects нет. По действующему owner decision из `docs/UI_UX_PASS.md` функциональные bounded-срезы не задерживаются из-за косметики; финальная owner visual/product acceptance остаётся отдельным UI/UX pass перед публичным запуском. Поэтому отдельный Watch visual gate сейчас merge не блокирует.
- Watch implementation review cycle завершён; #345 готов к merge владельцем. Permanent/current-state docs closeout выполняется отдельным PR только после фактического merge.
- Bookmarks: план принят, реализация ждёт очереди.
- Mute/block: план принят, реализация ждёт очереди.

## Опережающий planning-track

- Watch / Bookmarks / Mute-block: спланированы.
- Последний завершённый planning-slice Лёвы: **модерация видимости опубликованного контента** из общей карты #300.
- Полный план: **готов**, V1–V9 в `USER_ACTIONS_SERVICE_PLAN.md`; ожидает whole-plan scope/fit Миры по V-P1/V-P2/V-P3, V-T1/V-T2 и связанным resource/cache contracts.
- Лёва: **STOP** после завершённого плана; implementation не активирован.
- Следующий planning-slice после отдельной команды владельца: **управление структурой форума / перенос тем**.

## Следующий шаг

Владелец merge Watch implementation PR #345 на reviewed exact head `76c1c456557c614171a3b472758498795a668b9a`. После фактического merge — отдельный docs closeout PR, затем переход implementation-order к Bookmarks. Служебный #342 не merge. Лёва STOP. Visibility plan остаётся отдельным опережающим планом; структура форума/перенос тем не начинается без отдельной команды владельца.

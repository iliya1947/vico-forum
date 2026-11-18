# Workflow — пользовательские действия перед #320

## Общий канал

- Service PR: #342.
- #342 остаётся открытым рабочим каналом; после завершения одного этапа здесь переключается текущий этап.
- По прямому правилу владельца Мира не использует #300 как рабочий канал или источник текущих назначений. Заглянуть в #300 можно только после завершения всех задач #342, чтобы сверить следующий общий шаг, либо по прямой команде владельца обратиться к Ари/#300.

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
- Watch / Bookmarks / Mute-block и модерация видимости опубликованного контента уже имеют технические планы.
- По уточнению владельца planning-track относится **только к шести задачам, которые стоят перед #320**; это не назначение на остальной pre-release backlog из #300.
- Из этих шести Watch / Bookmarks / Mute-block и модерация видимости уже спланированы; редактирование заголовка завершено.
- Единственный ещё не спланированный slice из этих шести: **управление структурой форума / перенос тем** — категории, разделы, изменение структуры и перенос тем.
- После полного плана этого slice Лёва записывает результат в план/свой файл и **STOP** для scope/fit Миры. Email-auth, UI/UX, Stage 6, release и прочий backlog сейчас не планировать.

## Следующий шаг

Параллельно с ожидающим owner merge Watch #345 Лёва планирует **последний ещё не спланированный блок из шести задач перед #320**: управление структурой форума / перенос тем. Реализацию не начинать и implementation-order не менять. После полного плана — STOP и возврат Мире. Никакого дальнейшего pre-release planning вне этих шести задач этим назначением не открывается. Служебный #342 не merge.

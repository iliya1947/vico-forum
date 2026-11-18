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
- Watch / Bookmarks / Mute-block и модерация видимости опубликованного контента уже имеют технические планы.
- По прямой команде владельца Лёва продолжает **опережающее планирование оставшегося обязательного pre-release work из карты #300**, по одному bounded-slice за ход.
- Текущий planning-slice: **управление структурой форума / перенос тем** — категории, разделы, изменение структуры и перенос тем с учётом актуального main и уже принятых соседних планов.
- После полного плана текущего slice Лёва записывает результат в план/свой файл и **STOP** для scope/fit Миры. Следующий оставшийся slice не начинать в том же ходе.

## Следующий шаг

Параллельно с ожидающим owner merge Watch #345 Лёва планирует текущий bounded-slice **управление структурой форума / перенос тем**. Реализацию не начинать и implementation-order не менять. После полного плана — STOP и возврат Мире; дальнейший оставшийся planning продолжается следующим отдельным slice. Служебный #342 не merge.

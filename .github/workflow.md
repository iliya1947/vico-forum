# Workflow — пользовательские действия перед #320

## Общий канал

- Service PR: #342.
- #342 остаётся открытым рабочим каналом; после завершения одного этапа здесь переключается текущий этап.
- По прямому правилу владельца Мира не использует #300 как рабочий канал или источник текущих назначений. Заглянуть в #300 можно только после завершения всех задач #342, чтобы сверить следующий общий шаг, либо по прямой команде владельца обратиться к Ари/#300.

## Реализация

- Edit own topic title: завершён.
- Watch: **implementation #345 merged** в main `9c4639d23ca075c8bb92fbb909b96593d7bee127`; дерево совпадает с проверенным technical head `76c1c456557c614171a3b472758498795a668b9a` (review base `7cc23edede57994cdedab49c1556ddb55034dd29`, 17/17 exact-head checks PASS, включая database и connected watch_browser).
- Watch coordinator whole-PR review: **Мира PASS** на exact head `76c1c456557c614171a3b472758498795a668b9a`; подтверждённых current-scope findings нет.
- Watch independent technical review: **Лёва PASS** всего принятого scope на том же exact head `76c1c456557c614171a3b472758498795a668b9a` против main `7cc23edede57994cdedab49c1556ddb55034dd29`; подтверждённых current-scope findings нет. Код не изменён; Лёва STOP.
- Review synthesis: оба review совпали на неизменном exact head, расхождений и подтверждённых current-scope defects нет. По действующему owner decision из `docs/UI_UX_PASS.md` функциональные bounded-срезы не задерживаются из-за косметики; финальная owner visual/product acceptance остаётся отдельным UI/UX pass перед публичным запуском. Поэтому отдельный Watch visual gate сейчас merge не блокирует.
- Watch implementation review cycle завершён, #345 merged. Permanent/current-state docs closeout остаётся отдельным PR после implementation merge; это planning-задание не заменяет его.
- Bookmarks: implementation Лиры в Draft PR #346, stable exact head **`a3e6c0e63c99078ece89303592e1f24b2fe440fb`**, актуальный main `808c2b782952e13254cab8e2129dca07ca945e6f`.
- Bookmarks coordinator whole-PR review Миры и independent technical whole-PR review Лёвы на stable exact head **`a3e6c0e63c99078ece89303592e1f24b2fe440fb`**: **оба PASS; confirmed current-scope defects = 0**. B5-R1 закрыт; B4 cursor semantics сохранены; B6 остаётся подтверждённым. Exact-head GitHub 18/18 jobs success; connected Bookmarks 11/11 checkpoints. Лёва дополнительно повторил исходный B5 diagnostic и selected tests — PASS. Код в independent review не менялся.
- Review synthesis Миры завершён: оба независимых результата согласуются, head не изменился. #346 переведён из Draft в Ready for review и **готов к merge владельцем**. После фактического merge — отдельный docs closeout; permanent/current-state docs до merge не обновлять.
- Mute/block: план принят, реализация ждёт очереди.

## Опережающий planning-track

- Watch / Bookmarks / Mute-block: спланированы.
- Watch / Bookmarks / Mute-block и модерация видимости опубликованного контента уже имеют технические планы.
- По уточнению владельца planning-track относится **только к шести задачам, которые стоят перед #320**; это не назначение на остальной pre-release backlog из #300.
- Из этих шести Watch / Bookmarks / Mute-block и модерация видимости уже спланированы; редактирование заголовка завершено.
- Управление структурой форума / перенос тем: **план S0–S10 принят Мирой после whole-plan scope/fit; PASS, current-scope defects = 0.** S-P1–S-P4 и S-T1/S-T2 приняты; код не активирован.
- Все шесть задач перед #320 теперь имеют завершённую реализацию первого блока либо **принятые технические планы** остальных. **Лёва STOP** после завершённого planning; email-auth, UI/UX, Stage 6, release и прочий backlog этим назначением не открыты.

## Следующий шаг

**Следующее действие — владелец merge Bookmarks implementation PR #346** на exact
head `a3e6c0e63c99078ece89303592e1f24b2fe440fb`. Review cycle завершён:
Мира PASS + Лёва independent PASS, confirmed current-scope defects = 0,
18/18 exact-head jobs success. PR Ready for review, mergeable=true.

После фактического merge следующий bounded этап здесь — отдельный docs closeout
Bookmarks/current-state; только затем implementation-order продолжается дальше.
#342 служебный и не merge. #300 не использовать.

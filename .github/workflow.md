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
- Bookmarks #346 **merged** в main `34ddf42985f6dc348e77d0dcc90e0aecc37fd15e` 2026-11-18 21:43:51 UTC. Reviewed exact head `a3e6c0e63c99078ece89303592e1f24b2fe440fb`; Мира coordinator PASS + Лёва independent PASS; confirmed current-scope defects = 0; exact-head 18/18 jobs success.
- Docs closeout: Watch #349 **merged** в main `405ab97116c5be750fb9c1d447431988802bdbb5`; Bookmarks #346 остаётся единственным текущим docs debt этого участка.
- Следующий docs этап: отдельный Bookmarks docs closeout. Нужны permanent SOT + factual PROJECT_STATE + отдельный PROJECT_HISTORY snapshot/index; без RBAC/Admin, Stage 6 external evidence или owner visual claims.
- Docs closeout выполняет **Лира / ChatGPT-6** как штатный следующий исполнитель; отдельное owner-назначение для автора docs PR не требуется. Мира docs diff не пишет.
- Watch docs closeout: **PR #349 merged** в main `405ab97116c5be750fb9c1d447431988802bdbb5`; reviewed docs head `aa6584c6d600d807ebed9171adbde365b918b290`, Мира coordinator PASS + Лёва independent PASS, defects = 0. Permanent/current/history Watch docs теперь в main.
- Bookmarks docs closeout: **Draft PR #350** от main `405ab97116c5be750fb9c1d447431988802bdbb5`, stable exact head `446e4cc893160efc30392bfa43f03f5882823021`; **4 docs files**, latest applicable CI **2/2 PASS**. Лира завершила docs implementation и STOP; current coordinator review за Мирой.
- Mute/block: план принят, реализация ждёт закрытия накопленного docs debt либо прямого owner override.

## Опережающий planning-track

- Watch / Bookmarks / Mute-block: спланированы.
- Watch / Bookmarks / Mute-block и модерация видимости опубликованного контента уже имеют технические планы.
- По уточнению владельца planning-track относится **только к шести задачам, которые стоят перед #320**; это не назначение на остальной pre-release backlog из #300.
- Из этих шести Watch / Bookmarks / Mute-block и модерация видимости уже спланированы; редактирование заголовка завершено.
- Управление структурой форума / перенос тем: **план S0–S10 принят Мирой после whole-plan scope/fit; PASS, current-scope defects = 0.** S-P1–S-P4 и S-T1/S-T2 приняты; код не активирован.
- Все шесть задач перед #320 теперь имеют завершённую реализацию первого блока либо **принятые технические планы** остальных. **Лёва STOP** после завершённого planning; email-auth, UI/UX, Stage 6, release и прочий backlog этим назначением не открыты.

## Следующий шаг

**Лира STOP. Следующий исполнитель — Мира / ChatGPT-5.6 Sol.**
Coordinator whole-PR docs review **Bookmarks Draft #350** на stable exact head
`446e4cc893160efc30392bfa43f03f5882823021` против `main` `405ab97116c5be750fb9c1d447431988802bdbb5`.
Применимые exact-head **2/2 CI PASS** (`checks`, `database`,
[run 44482643570](https://github.com/iliya1947/vico-forum/actions/runs/44482643570)).

Diff — только `PROJECT.md` (постоянный Bookmarks contract),
`PROJECT_STATE.md` (короткий фактический статус), новый
`docs/PROJECT_HISTORY/PROJECT_HISTORY_31.md` (implementation/review/CI/merge)
и index `docs/PROJECT_HISTORY/PROJECT_HISTORY.md`. Миграции repo через `0069`,
external evidence через `0020`; code/schema/RBAC/production/visual не менялись.

Мира проверяет полный docs scope и factual согласованность с merged #346 и
принятым B1–B7, формулирует PASS либо один пакет confirmed current-doc findings
Лире. **Только после coordinator PASS** — независимый docs review того же head,
затем merge владельцем. Mute/block не активировать до фактического merge #350.
Служебный #342 не merge; #300 не использовать.

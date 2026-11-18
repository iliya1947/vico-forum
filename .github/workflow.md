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
- Docs debt: Watch #345 имеет merged implementation, но отдельный docs closeout ещё не выполнен. Bookmarks #346 также требует отдельный docs closeout по принятому service-plan. Current PROJECT_STATE всё ещё на migration 0067 и не отражает Watch 0068 / Bookmarks 0069.
- Следующий docs порядок: сначала отдельный Watch docs closeout, затем отдельный Bookmarks docs closeout. Минимально: factual PROJECT_STATE + отдельный PROJECT_HISTORY snapshot/index для каждого bounded-этапа; без RBAC/Admin, Stage 6 external evidence или owner visual claims.
- Docs closeout выполняет **Лира / ChatGPT-6** как штатный следующий исполнитель; отдельное owner-назначение для автора docs PR не требуется. Мира docs diff не пишет.
- Watch docs closeout: **PR #349 Draft**, stable exact head `aa6584c6d600d807ebed9171adbde365b918b290`, main `34ddf42985f6dc348e77d0dcc90e0aecc37fd15e`. Coordinator Миры и independent whole-PR docs review Лёвы: **оба PASS; confirmed current-doc defects = 0**. WATCH-DOC-1 закрыт permanent Watch contract в `PROJECT.md`; все 4 docs прочитаны/проверены, exact-head CI 2/2 success. Лёва STOP Мире для synthesis/merge readiness. Bookmarks docs closeout — отдельно после фактического merge #349.
- Mute/block: план принят, реализация ждёт закрытия накопленного docs debt либо прямого owner override.

## Опережающий planning-track

- Watch / Bookmarks / Mute-block: спланированы.
- Watch / Bookmarks / Mute-block и модерация видимости опубликованного контента уже имеют технические планы.
- По уточнению владельца planning-track относится **только к шести задачам, которые стоят перед #320**; это не назначение на остальной pre-release backlog из #300.
- Из этих шести Watch / Bookmarks / Mute-block и модерация видимости уже спланированы; редактирование заголовка завершено.
- Управление структурой форума / перенос тем: **план S0–S10 принят Мирой после whole-plan scope/fit; PASS, current-scope defects = 0.** S-P1–S-P4 и S-T1/S-T2 приняты; код не активирован.
- Все шесть задач перед #320 теперь имеют завершённую реализацию первого блока либо **принятые технические планы** остальных. **Лёва STOP** после завершённого planning; email-auth, UI/UX, Stage 6, release и прочий backlog этим назначением не открыты.

## Следующий шаг

**Следующий участник — Мира.** Сопоставить оба docs PASS #349 на
`aa6584c6d600d807ebed9171adbde365b918b290` и зафиксировать готовность exact head
к merge владельцем. Лёва STOP. После фактического merge #349 Лира выполняет
отдельный Bookmarks docs closeout; раньше этот следующий PR не открывать.
Merge/deploy не выполнялись. #342 служебный и не merge; #300 не использовать.

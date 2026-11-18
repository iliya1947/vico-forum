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
- Bookmarks: **реализация активирована владельцем**. Лира / ChatGPT-6 реализует принятый Bookmarks scope прямо в Draft PR #346 от актуального `main` после merged Watch. Лёва завершил planning всех шести задач перед #320 и к реализации Bookmarks не назначен; после coordinator PASS Миры он выполняет независимый technical review.
- Bookmarks #346 current interim head `4c846036e2b3ad1b91d5ad6d035943ad9babd0e7`: schema 0069, backend own-state, strict canonical topic action, authenticated private `/:locale/bookmarks` loader/query and optional topic state. `checks` job `135010384846` **PASS**, `database` job `135010384260` **PASS**; 15/17 GitHub jobs PASS at checkpoint (browser, sa08_browser pending). Bounded route+loader slice **STOP**. Next *separate* slice only on owner command: isolated Bookmark UI/navigation/EN-RU-HE, then connected browser feature acceptance. #346 Draft; no whole-PR review yet.
- Mute/block: план принят, реализация ждёт очереди.

## Опережающий planning-track

- Watch / Bookmarks / Mute-block: спланированы.
- Watch / Bookmarks / Mute-block и модерация видимости опубликованного контента уже имеют технические планы.
- По уточнению владельца planning-track относится **только к шести задачам, которые стоят перед #320**; это не назначение на остальной pre-release backlog из #300.
- Из этих шести Watch / Bookmarks / Mute-block и модерация видимости уже спланированы; редактирование заголовка завершено.
- Управление структурой форума / перенос тем: **план S0–S10 принят Мирой после whole-plan scope/fit; PASS, current-scope defects = 0.** S-P1–S-P4 и S-T1/S-T2 приняты; код не активирован.
- Все шесть задач перед #320 теперь имеют завершённую реализацию первого блока либо **принятые технические планы** остальных. **Лёва STOP** после завершённого planning; email-auth, UI/UX, Stage 6, release и прочий backlog этим назначением не открыты.

## Следующий шаг

Лира реализует **Bookmarks** в PR #346 по уже принятому плану Bookmarks из `USER_ACTIONS_SERVICE_PLAN.md`, сверив его с актуальным `main` после merged Watch. После полной реализации, применимых проверок и stable exact head — **STOP и возврат Мире** на coordinator whole-PR review. После PASS Миры независимый technical review того же stable exact head выполняет Лёва / Codex-6.1 Sol. План структуры форума S0–S10 уже завершён Лёвой и **принят Мирой**; его реализация сейчас не активирована. Служебный #342 не merge.

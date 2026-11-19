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
- Bookmarks docs closeout: **PR #350 merged** в main `9eae385571bf99e073df46f8541f7514c9626a29`; reviewed docs head `446e4cc893160efc30392bfa43f03f5882823021`, Мира docs PASS, defects = 0. Permanent/current/history Bookmarks docs теперь в main.
- Mute/block: **Draft implementation PR #351 part 3/4 завершена**, stable exact head `a2b077fd2059d9e6c189b35d008d81d23ed6d4ba` (base `9eae385571bf99e073df46f8541f7514c9626a29`). Parts 1/4, 2/4 ранее выполнены. Part 3 разбита постфактум на проверяемые blocks: **3a** M6 SQL private list readers (actor-scoped, 50+lookahead) и canonical topic/profile personal POST branches; **3b** actor-scoped controls в TopicView/public profile; **3c** private `/:locale/filters` с tabs/keyset/undo/navigation и EN/RU/HE; **3d** scoped route/component/unit regressions и исправление CI regressions (strict form mocks, route catalogue, profile privileged reader mocks, отдельно изолированные Watch CSS selectors); **3e** final exact-head CI. Подтверждены **15/15 GitHub workflows SUCCESS** на `a2b077fd2059d9e6c189b35d008d81d23ed6d4ba`, включая `checks`/`database`, PostgreSQL 17/Worker smokes и все существующие connected Chromium suites. Dedicated Mute/block connected browser acceptance **не выполнялась** (part 4). #351 Draft / not review-ready.

## Опережающий planning-track

- Watch / Bookmarks / Mute-block: спланированы.
- Watch / Bookmarks / Mute-block и модерация видимости опубликованного контента уже имеют технические планы.
- По уточнению владельца planning-track относится **только к шести задачам, которые стоят перед #320**; это не назначение на остальной pre-release backlog из #300.
- Из этих шести Watch / Bookmarks / Mute-block и модерация видимости уже спланированы; редактирование заголовка завершено.
- Управление структурой форума / перенос тем: **план S0–S10 принят Мирой после whole-plan scope/fit; PASS, current-scope defects = 0.** S-P1–S-P4 и S-T1/S-T2 приняты; код не активирован.
- Все шесть задач перед #320 теперь имеют завершённую реализацию первого блока либо **принятые технические планы** остальных. **Лёва STOP** после завершённого planning; email-auth, UI/UX, Stage 6, release и прочий backlog этим назначением не открыты.

## Следующий шаг

**Лира: subtask 4a НЕ завершена, STOP по требованию владельца о более мелкой декомпозиции.** Draft implementation #351, exact current head `83b32eb364d74a2fd85377dbc907f7723254edf4`; no merge/review. В 4a менялись только PG tests и один существующий Watch test для early promise rejection handler; production/schema/UI не менялись.

**4a — микроэтапы; после КАЖДОГО отдельный checkpoint и STOP до следующего `...`:**
1. **4a.1 — real PG test harness и управляемые SQL barriers** — код добавлен.
2. **4a.2 — snapshot order для initial/reply/edit и Mute/Block** — код добавлен.
3. **4a.3 — actor ON/OFF, reciprocal Block, AccountState/deactivation races** — код добавлен.
4. **4a.4 — suppression, no-backfill, reply→mention и replay** — код добавлен.
5. **4a.5 — rollback initial/reply/edit/attachment/publication receipts** — код добавлен.
6. **4a.6 — точечная регрессия Watch unhandled Promise rejection** — исправлен только test timing в `tests/database/topic-watch.test.ts`, commit `83b32eb364d74a2fd85377dbc907f7723254edf4`; production не менялся.
7. **4a.7 — ПЕРВЫЙ следующий микрошаг:** подтвердить full `database` job на `83b32eb364d74a2fd85377dbc907f7723254edf4` с 27 новыми тестами, native PG17, no unhandled errors; при ошибке исправить только подтверждённую причину, повторить PG job; checkpoint и STOP.
8. **4a.8 — после нового `...`:** подтвердить `checks` и действующие regression workflows на ТОЧНОМ финальном head; checkpoint и STOP.
9. **4a.9 — после нового `...`:** завершить 4a evidence в service files/#342, передать следующий маршрут 4b; STOP. Не запускать connected Mute/block 4b или финальный 4c автоматически.

**Факты о предшествующем head `247e928bd845286e1946c77d51bbd162a08a4cb2`:** 1476/1476 PG test assertions PASS, но `database` job FAIL из-за unhandled rejection в существующем Watch race test; поэтому CI этого head НЕ считается PASS. На `83b32eb364d74a2fd85377dbc907f7723254edf4` CI на момент записи ещё выполнялся; результат не утверждать заранее.

**После явной команды после 4a.9:** part 4b dedicated Worker/Better Auth/PG17/Chromium Mute/block acceptance, также разделить на узкие slices с STOP; затем 4c final closeout отдельно. Мира/Лёва reviews только после 4c. #342 service-only/no merge; #351 Draft/no merge.

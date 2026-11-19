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

**4a полностью закрыт.** Exact implementation head:
`83b32eb364d74a2fd85377dbc907f7723254edf4`.

Подтверждённое 4a evidence:
- PostgreSQL 17 full suite: 109/109 files, 1476/1476 tests PASS;
- targeted personal-filters concurrency/lifecycle: 27/27 PASS;
- Watch early-rejection timing regression устранён только в test harness;
- SA07 transient failure независимо диагностирован Мирой и не признан current-scope regression;
- тот же SA07 на том же exact head повторно SUCCESS без code changes;
- текущий exact-head workflow set: **19/19 SUCCESS**.

**Следующий bounded implementation/acceptance этап — 4b, исполнитель Лира / ChatGPT-6.**
Выполнить dedicated connected Worker + Better Auth + PostgreSQL 17 + Chromium acceptance
для personal Mute/block на существующем #351 без изменения принятого product scope.

4b должен доказать через реальный connected path как минимум:
- authenticated topic Mute ON/OFF и prospective notification suppression без backfill;
- directional Block A→B suppression ordinary notifications;
- viewer-only collapse/reveal постов B для A и отсутствие publication/read ban;
- private `/:locale/filters` own-state и account isolation;
- lifecycle/account-switch/private-cache boundaries;
- независимость Watch/Bookmarks/read-state и отсутствие нового RBAC.

Если connected acceptance выявит подтверждённый implementation defect — исправить локально в #351,
добавить regression evidence и завершить новый stable exact head. Если defect не подтверждён —
production код не трогать.

После завершения 4b — отдельный checkpoint и **STOP**. Финальный 4c exact-head CI/ACL/manifest/
handoff выполняется только после следующей команды владельца.

#351 Draft/no merge; #342 service-only/no merge; #300 не использовать.

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

**Лира STOP после part 3/4.** Следующая команда `...` запускает **только bounded subtask 4a: focused real PostgreSQL 17 concurrency/lifecycle/rollback acceptance** для Mute/block, по M7 (transaction snapshots, old-suppression no-backfill, topic-create/reply/edit, inactive actor & receipt atomicity), в том же Draft PR #351 на `a2b077fd2059d9e6c189b35d008d81d23ed6d4ba`. После 4a — STOP с checkpoint в #342.

После нового явного продолжения: **4b** отдельная connected real Worker + Better Auth + PostgreSQL 17 + Chromium Mute/block acceptance (не старые regressions), включая actor privacy, Mute/Block notices/reveal/undo, narrow RTL; затем STOP. После ещё одного продолжения **4c** final exact-head CI/manifest/ACL/contract closeout, self-check, служебный checkpoint; затем STOP и передача Мире whole-PR review. Каждый bounded subtask завершать отдельным STOP, без автоматического перехода. Мира coordinator → после PASS Лёва independent review → owner merge. #351 Draft / no merge, #342 служебный / no merge; no Stage6/visibility moderation/whole UI/UX.
# Workflow — пользовательские действия перед #320

## Общий канал

- Service PR: #342.
- #342 остаётся открытым рабочим каналом; после завершения одного этапа здесь переключается текущий этап.
- По прямому правилу владельца Мира не использует #300 как рабочий канал или источник текущих назначений. Заглянуть в #300 можно только после завершения всех задач #342, чтобы сверить следующий общий шаг, либо по прямой команде владельца обратиться к Ари/#300.

## Реализация

- Edit own topic title: завершён.
- Watch: **implementation #345 merged** в main `9c4639d23ca075c8bb92fbb909b96593d7bee127`; дерево совпадает с проверенным technical head `76c1c456557c614171a3b472758498795a668b9a` (review base `7cc23edede57994cdedab49c1556ddb55034dd29`, 17/17 exact-head checks PASS, включая database и connected watch_browser).
- Watch coordinator whole-PR review: **Мира PASS** на exact head `76c1c456557c614171a3b472758498795a668b9a`; подтверждённых current-scope findings нет.
- Watch первоначальный independent technical review: **Лёва PASS** на exact head `76c1c456557c614171a3b472758498795a668b9a` против main `7cc23edede57994cdedab49c1556ddb55034dd29`. Позднейший отдельный owner audit выявил **открытый WATCH-AUDIT-1 [P2]**; актуальные evidence/маршрут — в отдельном разделе ниже. Production в аудите не менялся.
- Review synthesis: оба review совпали на неизменном exact head, расхождений и подтверждённых current-scope defects нет. По действующему owner decision из `docs/UI_UX_PASS.md` функциональные bounded-срезы не задерживаются из-за косметики; финальная owner visual/product acceptance остаётся отдельным UI/UX pass перед публичным запуском. Поэтому отдельный Watch visual gate сейчас merge не блокирует.
- Watch implementation review cycle завершён, #345 merged. Permanent/current-state docs closeout остаётся отдельным PR после implementation merge; это planning-задание не заменяет его.
- Bookmarks #346 **merged** в main `34ddf42985f6dc348e77d0dcc90e0aecc37fd15e` 2026-11-18 21:43:51 UTC. Reviewed exact head `a3e6c0e63c99078ece89303592e1f24b2fe440fb`; первоначальные Мира coordinator PASS + Лёва independent PASS; тогда confirmed current-scope defects = 0; exact-head 18/18 jobs success. Позднейший owner audit подтвердил открытые **BOOKMARKS-AUDIT-1/2 [P2]**; актуальные результаты ниже, исправления отложены владельцем.
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

**Mute/block: 4a.1–4a.9 завершены, 4b.1 PASS; Лира STOP после 4b.1.** Implementation Draft PR #351: exact head `e93e64a55095b1d56eb65aa9c11ffd314f4b07e9` (base `9eae385571bf99e073df46f8541f7514c9626a29`). Service PR #342 — рабочий канал, не merge.

**Verified 4a:** real PostgreSQL 17 **27/27 targeted concurrency/atomicity tests** и full **1476/1476 tests, 109/109 files PASS**. `CI` jobs `database` и `checks` SUCCESS (run `44522424656`). **15/15 workflow SUCCESS после отдельного повторного SA07 job `135564876373` на том же head**, без code changes. Первый SA07 job `135554174007` FAIL: `/en/super-admin/monitoring/integrations.data` ответил 503 вместо 200. Точная первопричина **не установлена**; не подтверждена Mute/block regression. В 4a изменены только `tests/database/personal-filters-concurrency.test.ts` и `tests/database/topic-watch.test.ts` (timing rejection assertion), production/schema/UI без изменений.

**4b.1 VERIFIED / STOP:** новый `.github/workflows/personal-filters-browser.yml` и `tests/browser/personal-filters/{pg.mjs,check.py}` на exact `e93e64a55095b1d56eb65aa9c11ffd314f4b07e9`. Job `personal_filters_browser` id `135579549049`, run `44529730188`, **SUCCESS**: настоящий Worker + Better Auth sign-up, isolated PostgreSQL 17, Chromium, private `.data`/document, Mute/Block controls initially OFF, guest public read/own actor isolation and zero implicit rows. Это only harness smoke, без Mute/Block mutations/fanout. **Следующая команда `...` запускает исключительно 4b.2 — Topic Mute/Unmute connected notification acceptance**, checkpoint и STOP; не переходить к 4b.3.

**4b разбита на отдельные микрошаги. Каждый начинается только по отдельной явной команде и заканчивается собственным checkpoint + STOP:**
1. **4b.1 — PASS** — dedicated connected harness и изолированный smoke, run `44529730188`.
2. **4b.2** — Topic Mute/Unmute: Watch/author/parent/mention notification paths.
3. **4b.3** — directional Block A→B: ordinary notifications от B, независимость B→A, разрешённые события C.
4. **4b.4** — Block TopicView: collapsed bodies/attachments, reveal, anchors/root/parent/best answer.
5. **4b.5** — prospective suppression: initial-topic/edit mentions, old receipt/no-backfill, replay/new posts.
6. **4b.6** — private `/:locale/filters`: own lists, pagination, undo/reload, topic/profile controls.
7. **4b.7** — privacy/errors: guest, actor switch, no reverse graph, no-store, 503, late responses.
8. **4b.8** — independence: complaints/Owner/evidence, Watch/Bookmarks/read markers, public profile/search.
9. **4b.9** — EN/RU/HE, keyboard и narrow RTL Chromium.
10. **4b.10** — отдельный full dedicated Mute/block connected acceptance и исправления только подтверждённых current-scope defects.
11. **4b.11** — отдельный exact-head CI/regressions, evidence/4b closeout, STOP.

Ранние existing Chromium regressions **не заменяют** dedicated Mute/block acceptance. **4c** final exact-head CI/ACL/manifest/self-check и handoff выполняется только после завершения 4b и новой команды; review Мира → Лёва только после 4c. Не начинать 4b в текущем 4a.9. No merge, Stage6, moderation visibility, overall UI/UX или #300.

## Отдельная проверка владельца — Watch, одна реализация

По прямой команде «проверь … только по одному» Лёва проверил **только merged
Watch #345** на необходимость механизмов/обходные решения в main `9eae385`.
**Выявлен один P2 WATCH-AUDIT-1:** локальное зеркало Watch-state перекрывает
более свежий loader старым ACK. Воспроизведены оба направления с real PG17;
более простой isolated prototype без зеркала прошёл 7/7 targeted checks.
Подробности/границы — в channel и файле Лёвы. Production не менялся, Лёва STOP.
**Новое прямое решение владельца:** сначала закончить проверки остальных реализаций,
только потом выбирать исправления. WATCH-AUDIT-1 открыт, correction сейчас не
активировать. Отдельный аудит Bookmarks завершён ниже; production не менялся.
Текущее назначение Лиры #351 этим аудитом не выполнялось и не переназначалось.

## Отдельная проверка владельца — Bookmarks, одна реализация

По уточнению «сначала проверь остальное, а потом уже будем исправлять» Лёва
проверил только merged Bookmarks #346 в main `9eae385`. Подтверждены два P2:
**BOOKMARKS-AUDIT-1** — локальный confirmed в topic control перекрывает свежий
loader старым ACK; **BOOKMARKS-AUDIT-2** — removed latch скрывает заново сохранённую
строку вопреки свежему списку. Real PG17 + production React/Router: обе стороны
control и Remove→Add list race воспроизведены; повторная revalidation не помогает.
Изолированный prototype без этих зеркал: 5 real-PG/UI + 10 UI regressions PASS.

Tab actor marker в sessionStorage обоснован credential-route remount: current
вариант 3/3, memory-only comparison 2/3, теряет actor history при remount. Остальные
проверенные Bookmarks механизмы обоснованы текущим контрактом; подробности в channel
и личном файле Лёвы. Production/schema/tests не менялись; corrective PR не открыт.
**WATCH-AUDIT-1 и BOOKMARKS-AUDIT-1/2 остаются открытыми и отложенными: сначала
проверки, потом исправления. Лёва STOP после одного Bookmarks.** Дальнейший аудит
оставшихся реализаций — отдельно, по одной; #351/4b.2 этим аудитом не выполнялся.

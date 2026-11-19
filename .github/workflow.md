# Workflow — пользовательские действия перед #320

## Общий канал

- Service PR: #342.
- #342 остаётся открытым рабочим каналом; после завершения одного этапа здесь переключается текущий этап.
- По прямому правилу владельца Мира не использует #300 как рабочий канал или источник текущих назначений. Заглянуть в #300 можно только после завершения всех задач #342, чтобы сверить следующий общий шаг, либо по прямой команде владельца обратиться к Ари/#300.

## Реализация

- Edit own topic title: завершён (#343/#344). Отдельный owner audit текущего main не выявил необоснованных feature mechanisms; открыт minor **TITLE-AUDIT-1 [P3]** (возврат фокуса после Save/Cancel), детали ниже. Production не менялся.
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
- Mute/block: **Draft implementation PR #351 part 3/4 завершена; part 4/4 идёт по микрошагам (4b.3 PASS)**, stable exact head `a2b077fd2059d9e6c189b35d008d81d23ed6d4ba` (base `9eae385571bf99e073df46f8541f7514c9626a29`). Parts 1/4, 2/4 ранее выполнены. Part 3 разбита постфактум на проверяемые blocks: **3a** M6 SQL private list readers (actor-scoped, 50+lookahead) и canonical topic/profile personal POST branches; **3b** actor-scoped controls в TopicView/public profile; **3c** private `/:locale/filters` с tabs/keyset/undo/navigation и EN/RU/HE; **3d** scoped route/component/unit regressions и исправление CI regressions (strict form mocks, route catalogue, profile privileged reader mocks, отдельно изолированные Watch CSS selectors); **3e** final exact-head CI. Подтверждены **15/15 GitHub workflows SUCCESS** на `a2b077fd2059d9e6c189b35d008d81d23ed6d4ba`, включая `checks`/`database`, PostgreSQL 17/Worker smokes и все существующие connected Chromium suites. Dedicated Mute/block connected browser acceptance выполняется по микрошагам 4b.1–4b.11: 4b.1–4b.3 PASS, 4b.4–4b.11 pending. #351 Draft / not review-ready.

## Опережающий planning-track

- Watch / Bookmarks / Mute-block: спланированы.
- Watch / Bookmarks / Mute-block и модерация видимости опубликованного контента уже имеют технические планы.
- По уточнению владельца planning-track относится **только к шести задачам, которые стоят перед #320**; это не назначение на остальной pre-release backlog из #300.
- Из этих шести Watch / Bookmarks / Mute-block и модерация видимости уже спланированы; редактирование заголовка завершено.
- Управление структурой форума / перенос тем: **план S0–S10 принят Мирой после whole-plan scope/fit; PASS, current-scope defects = 0.** S-P1–S-P4 и S-T1/S-T2 приняты; код не активирован.
- Все шесть задач перед #320 теперь имеют завершённую реализацию первого блока либо **принятые технические планы** остальных. **Лёва STOP** после завершённого planning; email-auth, UI/UX, Stage 6, release и прочий backlog этим назначением не открыты.

## Следующий шаг

**Mute/block: 4a завершена, 4b.1–4b.9 PASS; Лира STOP после 4b.9.** Implementation Draft PR #351: exact head `0fd73ffb86303e3c13887a3054b3b8b2b265568a` (base `9eae385571bf99e073df46f8541f7514c9626a29`). Service PR #342 — рабочий канал, не merge.

**Verified 4a:** real PostgreSQL 17 **27/27 targeted concurrency/atomicity tests** и full **1476/1476 tests, 109/109 files PASS**. `CI` jobs `database` и `checks` SUCCESS (run `44522424656`). **15/15 workflow SUCCESS после отдельного повторного SA07 job `135564876373` на том же head**, без code changes. Первый SA07 job `135554174007` FAIL: `/en/super-admin/monitoring/integrations.data` ответил 503 вместо 200. Точная первопричина **не установлена**; не подтверждена Mute/block regression. В 4a изменены только `tests/database/personal-filters-concurrency.test.ts` и `tests/database/topic-watch.test.ts` (timing rejection assertion), production/schema/UI без изменений.

**4b.1 VERIFIED / STOP:** новый `.github/workflows/personal-filters-browser.yml` и `tests/browser/personal-filters/{pg.mjs,check.py}` на exact `e93e64a55095b1d56eb65aa9c11ffd314f4b07e9`. Job `personal_filters_browser` id `135579549049`, run `44529730188`, **SUCCESS**: настоящий Worker + Better Auth sign-up, isolated PostgreSQL 17, Chromium, private `.data`/document, Mute/Block controls initially OFF, guest public read/own actor isolation and zero implicit rows. Это only harness smoke, без Mute/Block mutations/fanout. **4b.2 VERIFIED / STOP:** same connected Worker/Better Auth/PG17/Chromium harness on exact `a6dadd175ff58bbe24f7edb60e99f1dc2e1aab52`, run `44531763113`, job `135586618085` **SUCCESS**. All 8 `FILTERS_CONNECTED` markers passed: 4 smoke + author/parent/Watch/mention baseline, Chromium ON for Watch viewer and four SQL pairs, suppression receipts for all 4 while muted, independent notifications in other topic, OFF restores only new fanout without backfill, Watch unchanged. Changed only `tests/browser/personal-filters/{pg.mjs,check.py}`, no production/schema changes. Existing full exact-head workflows not part of this bounded 4b.2 gate. **4b.3 VERIFIED / STOP:** same Worker/Better Auth/PG17/Chromium path on exact `15e6d82efd6523292af75c520db2f8b6acb761a9`, run `44535910727`, job `135601125254` **SUCCESS**, 12/12 `FILTERS_CONNECTED` markers (8 earlier + 4 new). A uses Chromium profile Block B: own A→B pair persisted, reverse B→A remains OFF; A's reply still notifies B; B's reply plus @A yields no visible A notice and exactly one A suppression receipt; C's reply inside B topic still notifies A and B; Watch preserved. Only `tests/browser/personal-filters/check.py` changed, no production/schema/UI. Full exact-head workflows not a 4b.3 gate; do not claim them complete. **4b.4 VERIFIED / STOP:** real Worker/Better Auth/PG17/Chromium on exact `691749a575b8d41ddc508644e31768c9162a860d`, run `44538241728`, job `135609317404` **SUCCESS**, 17/17 `FILTERS_CONNECTED` markers (12 previous + five 4b.4). Blocked B root and B-authored best answer collapsed for A; attachment link metadata unavailable until per-post Reveal, A/C posts visible; original/best/parent/child anchors, solution link, direct replies preserved; guest still sees B body and attachment links; Reveal is post-local and transient, reload re-collapses, Block remains persisted. Two attached metadata fixtures in disposable PG, no R2 object/read acceptance claim. Only `tests/browser/personal-filters/check.py` modified, no production/schema/UI. Other current-head workflows are not asserted all complete. **4b.5 VERIFIED / STOP:** dedicated real Worker/Better Auth/PG17/Chromium on exact `929d839439298c6870bef6a29a924784ed38e7de`, run `44540202818`, job `135616158626` **SUCCESS**, 25/25 `FILTERS_CONNECTED` markers (17 previous + eight 4b.5). Block suppresses actual new topic's initial @A with PG receipt; exact create replay doesn't duplicate topic/post/notice; Unblock followed by same old initial mention edit/remove/re-add cannot backfill; Mute suppression survives Unmute and unrelated edit; previously unselected recipient on old post can receive a new @; matching published-edit replay adds no revision/notice/receipt; fresh posts after Unmute/Unblock notify appropriately, old delivered rows unchanged. Two test-only commits (`087456dc6f8e18c5f8e7f209e405d4ab03e81076`, `929d839439298c6870bef6a29a924784ed38e7de`) in `tests/browser/personal-filters/check.py`; first dedicated run `44539874421` failed only due to harness incorrectly parsing a valid ordinary profile POST as JSON, corrected to assert SQL persisted Block pair; final run PASS. No production/schema/locale changes. Full exact-head workflows not all claimed complete. **4b.6 VERIFIED / STOP:** real Worker/Better Auth/PG17/Chromium on exact `cf9b166c27c72b3f3ed44d172cfe08678fdf9707`, run `44541827642`, job `135621886569` **SUCCESS**, 31/31 `FILTERS_CONNECTED` markers (25 previous + six 4b.6). Chromium controls in topic/profile perform own POST Mute/Block and populate separate private `/:locale/filters` tabs; Undo from each list removes persisted pair, survives reload and updates source controls; 50 SQL-only fixture pairs + one real control pair per tab validate 50+1 keyset Older/Newest with no duplicates/gaps, tab retained; another authenticated account sees no A pairs. Changed only `tests/browser/personal-filters/{pg.mjs,check.py}` (fixture creation and connected assertions), no production/schema/UI. Other exact-head workflow statuses are not declared fully complete. **4b.7 VERIFIED / STOP:** real Worker/Better Auth/PG17/Chromium on exact `04514f993b63c8eba9dc5e1439c9df5f238f408a`: dedicated run `44545030002`, job `135633196353` **SUCCESS**, 35/35 `FILTERS_CONNECTED` markers (31 prior + four new). Guest list and canonical POST 401/no writes, public topic/profile accessible; private document/.data no-store; malformed/foreign query 400, stale actor POST 409; B sees no reverse Block graph; same-context real Better Auth A→B switch resets old cursor, no leaked rows. Typed 503 and late cross-actor ACK checked in unit tests (not actual PostgreSQL outage injection). Exact-head `CI` run `44545029770` **SUCCESS**: database job `135633192599`, checks job `135633192066` (lint/typecheck/tests/build). Changed only `tests/browser/personal-filters/{check.py,pg.mjs}` and `app/forum/personal-filter-control.test.tsx`; existing PG fixture `URL`/`console` lint corrected; two earlier connected failures were incorrect test expectations about single-fetch array and intended cursor reset. No production/schema changes; other workflow suite not claimed complete. **4b.8 VERIFIED / STOP:** exact head `d02d79c11c0bcde4e1afdf1a73723f0319756988`, real Worker/Better Auth/PG17/Chromium dedicated run `44549801360`, job `135650161363` **SUCCESS**, 42/42 `FILTERS_CONNECTED` markers (35 prior + seven 4b.8). A fresh viewer with Mute+Block keeps Watch and Bookmark and no implicit read marker; private Bookmark/unread lists and public Search/profile continue to include muted/blocked topic/author; only authenticated topic view advances latest read marker, per-post Reveal does not; actual complaint from B's collapsed root succeeds with immutable revision receipt, separate reviewer with Mute+Block and permission grant still reads Complaint revision and protected context; reviewer grant unchanged and non-Owner Super-admin access remains 403. No positive bound-Owner lifecycle acceptance or actual R2 download claimed. Dedicated first run `44549323905` failed due to test incorrectly expecting private/no-store on unrelated Unread GET, fixed with one test-only change; current dedicated gate PASS. Exact-head CI run `44549801846` **SUCCESS**: `database` job `135650164194`, `checks` job `135650164392` (lint/typecheck/tests/build). Changed only `tests/browser/personal-filters/check.py` in #351; no production/schema/locale changes. Other PR workflow statuses are not claimed fully verified. **4b.9 VERIFIED / STOP:** exact head `0fd73ffb86303e3c13887a3054b3b8b2b265568a`, real Worker/Better Auth/PG17/Chromium dedicated run `44554597322`, job `135667126908` **SUCCESS**, 48/48 `FILTERS_CONNECTED` markers (42 prior + six new 4b.9). EN Mute Enter, ARIA pressed/current and private tab; RU Block Space, translated controls/tabs; HE 360px `dir=rtl` no horizontal document overflow, focused links/buttons stay on-screen, Tab and focus-visible, keyboard Enter navigation across tabs, collapsed B original revealed via Enter without Unblock, keyboard Undo Block/Mute persists and EN/RU controls show OFF after reload. Only `tests/browser/personal-filters/check.py` changed, no production/schema/locale/CSS changes. Early runs `44553087081` and `44553677254` failed due to incorrect test hitbox ≥24px assumption for text tab link (19px) and in-post Reveal button (21px), not a proven current-scope product defect; test now verifies actual visibility/on-screen geometry/keyboard operation, retains ≥24px minimum for own filter action buttons. Exact-head `CI` run `44554597626` **SUCCESS**: `checks` job `135667127646` (lint/typecheck/tests/build), `database` job `135667128461`. Other PR workflow suite not declared fully verified. **Next explicit `...` = ONLY 4b.10: full dedicated Mute/block connected acceptance and fixes only for confirmed current-scope defects**; checkpoint + STOP before 4b.11.

**4b разбита на отдельные микрошаги. Каждый начинается только по отдельной явной команде и заканчивается собственным checkpoint + STOP:**
1. **4b.1 — PASS** — dedicated connected harness и изолированный smoke, run `44529730188`.
2. **4b.2 — PASS** — Topic Mute/Unmute: Watch/author/parent/mention notification paths; run `44531763113`.
3. **4b.3 — PASS** — directional Block A→B: ordinary notifications от B, независимость B→A, разрешённые события C; run `44535910727`.
4. **4b.4 — PASS** — Block TopicView collapse/reveal, attachment metadata visibility, root/best/parent/child anchors, guest unaffected; run `44538241728`.
5. **4b.5 — PASS** — initial-topic/edit mentions, suppression receipts, no-backfill/remove-readd, fresh recipients, create/edit replay and new publications; run `44540202818`.
6. **4b.6 — PASS** — private Mute/Block list tabs, topic/profile controls, persisted Undo/Reload, distinct 50+1 keyset pagination, actor isolation; run `44541827642`.
7. **4b.7 — PASS** — guest/no-store/query/stale actor/reverse graph/real account switch, typed 503/late response unit; dedicated run `44545030002`, CI run `44545029770`.
8. **4b.8 — PASS** — Watch/Bookmarks/read markers, public Search/Profile, complaint submit/protected review/evidence, reviewer grants/non-Owner 403; dedicated run `44549801360`, CI run `44549801846`.
9. **4b.9 — PASS** — EN/RU/HE keyboard Mute/Block, translated list/reveal, 360px RTL focus/Tab/navigation/undo, no horizontal overflow; dedicated run `44554597322`, CI run `44554597626`.
10. **4b.10** — отдельный full dedicated Mute/block connected acceptance и исправления только подтверждённых current-scope defects.
11. **4b.11** — отдельный exact-head CI/regressions, evidence/4b closeout, STOP.

Ранние existing Chromium regressions **не заменяют** dedicated Mute/block acceptance. **4c** final exact-head CI/ACL/manifest/self-check и handoff выполняется только после завершения 4b и новой команды; review Мира → Лёва только после 4c. 4b.10 активировать только следующей отдельной командой после 4b.9 STOP. No merge, Stage6, moderation visibility, overall UI/UX или #300.

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

## Отдельная проверка владельца — заголовок; аудит завершённых функций закончен

По отдельной `...` Лёва проверил только edit-own-title #343 в current main
`9eae385`. Это аудит собственной прежней реализации по прямому запросу владельца,
не независимый whole-PR review. Unnecessary runtime layers не подтверждены:
draft text/frozen revision, explicit rebase, own command/permission/admission и
immutable revision/CAS сохраняют принятые контракты. **35/35 focused functional
checks PASS**: 7 existing PG17, 4 новых PG+UI, 3 existing component, 21 route.

**TITLE-AUDIT-1 [P3]:** Save/Cancel вызывает focus() до применения setDraft(null),
когда opener ещё hidden. Настоящий Chromium на production component: в обоих
случаях activeElement=BODY после закрытия; manual focus после DOM commit работает.
Изолированный post-commit focus prototype проходит оба случая и 7/7 PG/UI checks.
Это minor keyboard/focus defect, не ошибка записи и не новая recovery subsystem.

Аудит трёх завершённых реализаций #342 закончен: **WATCH-AUDIT-1 [P2],
BOOKMARKS-AUDIT-1/2 [P2], TITLE-AUDIT-1 [P3]** открыты. Только service records
изменены, исправления/PR не начаты. Дальнейший маршрут — отдельные bounded
corrections по одному: сначала Watch, затем Bookmarks; minor title focus отдельно
или в applicable UI pass. Контекст следующего coordinator handoff Мире готов в
channel; текущий audit сам corrections не запускает. **Лёва STOP.** Текущее отдельное
назначение Лиры #351/4b.4 сохраняется; его код этим аудитом не проверялся.


## 2026-11-19 — owner decision: corrections only after current Mute/block task

Владелец подтвердил порядок: **Лира сначала полностью завершает текущую задачу
Mute/block в Draft PR #351. Только после её завершения активируется отдельный
corrective-блок по findings аудита завершённых функций.**

После #351:
1. исправить **WATCH-AUDIT-1 [P2]**;
2. исправить **BOOKMARKS-AUDIT-1 [P2]**;
3. исправить **BOOKMARKS-AUDIT-2 [P2]**.

До завершения #351 эти corrections не активировать и не смешивать с Mute/block.
**TITLE-AUDIT-1 [P3]** в этот corrective-блок не входит; оставить отдельно для
применимого UI/UX этапа, если владелец не изменит решение.

Текущий маршрут Лиры по #351 не меняется.

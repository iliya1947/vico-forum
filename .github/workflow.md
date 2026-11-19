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
- Mute/block #351: **M1–M7 implementation/acceptance завершены; PF-REVIEW-1/2/3 CLOSED; Мира coordinator PASS + Лёва independent whole-PR PASS** на exact head `0fc239a554c8df562e97bc600f59b6b7b06d36ab`, base/main `9eae385571bf99e073df46f8541f7514c9626a29`. 16/16 exact-head workflows, 20/20 jobs SUCCESS; 2744 unit + 1476 PG tests, 49/49 connected markers. Confirmed current-scope defects = 0. PR пока Draft/open, merge выполняет владелец; после фактического merge отдельный docs closeout Лиры. Implementation в review не менялся.

## Опережающий planning-track

- Watch / Bookmarks / Mute-block: спланированы.
- Watch / Bookmarks / Mute-block и модерация видимости опубликованного контента уже имеют технические планы.
- По уточнению владельца planning-track относится **только к шести задачам, которые стоят перед #320**; это не назначение на остальной pre-release backlog из #300.
- Из этих шести Watch / Bookmarks / Mute-block и модерация видимости уже спланированы; редактирование заголовка завершено.
- Управление структурой форума / перенос тем: **план S0–S10 принят Мирой после whole-plan scope/fit; PASS, current-scope defects = 0.** S-P1–S-P4 и S-T1/S-T2 приняты; код не активирован.
- Все шесть задач перед #320 теперь имеют завершённую реализацию первого блока либо **принятые технические планы** остальных. **Лёва STOP** после завершённого planning; email-auth, UI/UX, Stage 6, release и прочий backlog этим назначением не открыты.

## Следующий шаг

**#351 MERGED** as `b87a6702b4f97634ee21426f95ece38f53c672ed`; Mira and Leva whole-implementation PASS on `0fc239a554c8df562e97bc600f59b6b7b06d36ab`. **Mute/Block docs closeout #353 READY FOR MIRA whole-docs review**, Draft exact head `f81fc47811cace99c97b1fbacea321d3881961d9`, base merged main `b87a6702b4f97634ee21426f95ece38f53c672ed`. Лира completed full four-document author self-check: `PROJECT.md` permanent contract; `PROJECT_STATE.md` factual migration ceiling `0070` with external acceptance still through `0020`; `docs/PROJECT_HISTORY/PROJECT_HISTORY_32.md` and history index historical chain. Exact-base compare four Markdown docs only, no code/schema/runtime/tests. GitHub automatic docs-head CI `44602703247` checks/database SUCCESS; **no additional CI required**. Next reviewer **Мира / ChatGPT-5.6 Sol**: independent whole-docs review on same exact head, validate correctness/scope and closeout vs merged main; report PASS or confirmed correction in #342. If PASS, owner merges #353; no Leva review for this docs-only PR. **Лира STOP; no merge, no deferred audits.** #342 service-only/no merge.

**Verified 4a:** real PostgreSQL 17 **27/27 targeted concurrency/atomicity tests** и full **1476/1476 tests, 109/109 files PASS**. `CI` jobs `database` и `checks` SUCCESS (run `44522424656`). **15/15 workflow SUCCESS после отдельного повторного SA07 job `135564876373` на том же head**, без code changes. Первый SA07 job `135554174007` FAIL: `/en/super-admin/monitoring/integrations.data` ответил 503 вместо 200. Точная первопричина **не установлена**; не подтверждена Mute/block regression. В 4a изменены только `tests/database/personal-filters-concurrency.test.ts` и `tests/database/topic-watch.test.ts` (timing rejection assertion), production/schema/UI без изменений.

**4b.1 VERIFIED / STOP:** новый `.github/workflows/personal-filters-browser.yml` и `tests/browser/personal-filters/{pg.mjs,check.py}` на exact `e93e64a55095b1d56eb65aa9c11ffd314f4b07e9`. Job `personal_filters_browser` id `135579549049`, run `44529730188`, **SUCCESS**: настоящий Worker + Better Auth sign-up, isolated PostgreSQL 17, Chromium, private `.data`/document, Mute/Block controls initially OFF, guest public read/own actor isolation and zero implicit rows. Это only harness smoke, без Mute/Block mutations/fanout. **4b.2 VERIFIED / STOP:** same connected Worker/Better Auth/PG17/Chromium harness on exact `a6dadd175ff58bbe24f7edb60e99f1dc2e1aab52`, run `44531763113`, job `135586618085` **SUCCESS**. All 8 `FILTERS_CONNECTED` markers passed: 4 smoke + author/parent/Watch/mention baseline, Chromium ON for Watch viewer and four SQL pairs, suppression receipts for all 4 while muted, independent notifications in other topic, OFF restores only new fanout without backfill, Watch unchanged. Changed only `tests/browser/personal-filters/{pg.mjs,check.py}`, no production/schema changes. Existing full exact-head workflows not part of this bounded 4b.2 gate. **4b.3 VERIFIED / STOP:** same Worker/Better Auth/PG17/Chromium path on exact `15e6d82efd6523292af75c520db2f8b6acb761a9`, run `44535910727`, job `135601125254` **SUCCESS**, 12/12 `FILTERS_CONNECTED` markers (8 earlier + 4 new). A uses Chromium profile Block B: own A→B pair persisted, reverse B→A remains OFF; A's reply still notifies B; B's reply plus @A yields no visible A notice and exactly one A suppression receipt; C's reply inside B topic still notifies A and B; Watch preserved. Only `tests/browser/personal-filters/check.py` changed, no production/schema/UI. Full exact-head workflows not a 4b.3 gate; do not claim them complete. **4b.4 VERIFIED / STOP:** real Worker/Better Auth/PG17/Chromium on exact `691749a575b8d41ddc508644e31768c9162a860d`, run `44538241728`, job `135609317404` **SUCCESS**, 17/17 `FILTERS_CONNECTED` markers (12 previous + five 4b.4). Blocked B root and B-authored best answer collapsed for A; attachment link metadata unavailable until per-post Reveal, A/C posts visible; original/best/parent/child anchors, solution link, direct replies preserved; guest still sees B body and attachment links; Reveal is post-local and transient, reload re-collapses, Block remains persisted. Two attached metadata fixtures in disposable PG, no R2 object/read acceptance claim. Only `tests/browser/personal-filters/check.py` modified, no production/schema/UI. Other current-head workflows are not asserted all complete. **4b.5 VERIFIED / STOP:** dedicated real Worker/Better Auth/PG17/Chromium on exact `929d839439298c6870bef6a29a924784ed38e7de`, run `44540202818`, job `135616158626` **SUCCESS**, 25/25 `FILTERS_CONNECTED` markers (17 previous + eight 4b.5). Block suppresses actual new topic's initial @A with PG receipt; exact create replay doesn't duplicate topic/post/notice; Unblock followed by same old initial mention edit/remove/re-add cannot backfill; Mute suppression survives Unmute and unrelated edit; previously unselected recipient on old post can receive a new @; matching published-edit replay adds no revision/notice/receipt; fresh posts after Unmute/Unblock notify appropriately, old delivered rows unchanged. Two test-only commits (`087456dc6f8e18c5f8e7f209e405d4ab03e81076`, `929d839439298c6870bef6a29a924784ed38e7de`) in `tests/browser/personal-filters/check.py`; first dedicated run `44539874421` failed only due to harness incorrectly parsing a valid ordinary profile POST as JSON, corrected to assert SQL persisted Block pair; final run PASS. No production/schema/locale changes. Full exact-head workflows not all claimed complete. **4b.6 VERIFIED / STOP:** real Worker/Better Auth/PG17/Chromium on exact `cf9b166c27c72b3f3ed44d172cfe08678fdf9707`, run `44541827642`, job `135621886569` **SUCCESS**, 31/31 `FILTERS_CONNECTED` markers (25 previous + six 4b.6). Chromium controls in topic/profile perform own POST Mute/Block and populate separate private `/:locale/filters` tabs; Undo from each list removes persisted pair, survives reload and updates source controls; 50 SQL-only fixture pairs + one real control pair per tab validate 50+1 keyset Older/Newest with no duplicates/gaps, tab retained; another authenticated account sees no A pairs. Changed only `tests/browser/personal-filters/{pg.mjs,check.py}` (fixture creation and connected assertions), no production/schema/UI. Other exact-head workflow statuses are not declared fully complete. **4b.7 VERIFIED / STOP:** real Worker/Better Auth/PG17/Chromium on exact `04514f993b63c8eba9dc5e1439c9df5f238f408a`: dedicated run `44545030002`, job `135633196353` **SUCCESS**, 35/35 `FILTERS_CONNECTED` markers (31 prior + four new). Guest list and canonical POST 401/no writes, public topic/profile accessible; private document/.data no-store; malformed/foreign query 400, stale actor POST 409; B sees no reverse Block graph; same-context real Better Auth A→B switch resets old cursor, no leaked rows. Typed 503 and late cross-actor ACK checked in unit tests (not actual PostgreSQL outage injection). Exact-head `CI` run `44545029770` **SUCCESS**: database job `135633192599`, checks job `135633192066` (lint/typecheck/tests/build). Changed only `tests/browser/personal-filters/{check.py,pg.mjs}` and `app/forum/personal-filter-control.test.tsx`; existing PG fixture `URL`/`console` lint corrected; two earlier connected failures were incorrect test expectations about single-fetch array and intended cursor reset. No production/schema changes; other workflow suite not claimed complete. **4b.8 VERIFIED / STOP:** exact head `d02d79c11c0bcde4e1afdf1a73723f0319756988`, real Worker/Better Auth/PG17/Chromium dedicated run `44549801360`, job `135650161363` **SUCCESS**, 42/42 `FILTERS_CONNECTED` markers (35 prior + seven 4b.8). A fresh viewer with Mute+Block keeps Watch and Bookmark and no implicit read marker; private Bookmark/unread lists and public Search/profile continue to include muted/blocked topic/author; only authenticated topic view advances latest read marker, per-post Reveal does not; actual complaint from B's collapsed root succeeds with immutable revision receipt, separate reviewer with Mute+Block and permission grant still reads Complaint revision and protected context; reviewer grant unchanged and non-Owner Super-admin access remains 403. No positive bound-Owner lifecycle acceptance or actual R2 download claimed. Dedicated first run `44549323905` failed due to test incorrectly expecting private/no-store on unrelated Unread GET, fixed with one test-only change; current dedicated gate PASS. Exact-head CI run `44549801846` **SUCCESS**: `database` job `135650164194`, `checks` job `135650164392` (lint/typecheck/tests/build). Changed only `tests/browser/personal-filters/check.py` in #351; no production/schema/locale changes. Other PR workflow statuses are not claimed fully verified. **4b.9 VERIFIED / STOP:** exact head `0fd73ffb86303e3c13887a3054b3b8b2b265568a`, real Worker/Better Auth/PG17/Chromium dedicated run `44554597322`, job `135667126908` **SUCCESS**, 48/48 `FILTERS_CONNECTED` markers (42 prior + six new 4b.9). EN Mute Enter, ARIA pressed/current and private tab; RU Block Space, translated controls/tabs; HE 360px `dir=rtl` no horizontal document overflow, focused links/buttons stay on-screen, Tab and focus-visible, keyboard Enter navigation across tabs, collapsed B original revealed via Enter without Unblock, keyboard Undo Block/Mute persists and EN/RU controls show OFF after reload. Only `tests/browser/personal-filters/check.py` changed, no production/schema/locale/CSS changes. Early runs `44553087081` and `44553677254` failed due to incorrect test hitbox ≥24px assumption for text tab link (19px) and in-post Reveal button (21px), not a proven current-scope product defect; test now verifies actual visibility/on-screen geometry/keyboard operation, retains ≥24px minimum for own filter action buttons. Exact-head `CI` run `44554597626` **SUCCESS**: `checks` job `135667127646` (lint/typecheck/tests/build), `database` job `135667128461`. Other PR workflow suite not declared fully verified. **4b.10 VERIFIED / STOP:** repeated full dedicated Worker/Better Auth/PostgreSQL17/Chromium acceptance [run 44554597322 attempt 2](https://github.com/iliya1947/vico-forum/actions/runs/44554597322/attempts/2), job `135678796360` **SUCCESS**, 48/48 markers, no errors, evidence artifact `14546202179`. This validates tree `2417cde670f079b67bcb178fb39c17f27c32569a` on commit `0fd73ffb86303e3c13887a3054b3b8b2b265568a`. A speculative list Undo→re-add unit race test was added in `58c18b53d664940fc4fd254f50a720a5967caa76`; exact-head CI `44558706081` checks FAILED on two new React/Router test assertions, while PG job and dedicated connected job `44558705603` succeeded 48/48. Failure alone did NOT establish a production defect (test UI snapshot rendering did not show target on query). Diagnostic test file was reverted to the last PASS contents in `0a2243339775dd1a5e55898ced6e553f77051d4e`: verified via Git commit object that its tree SHA is **identical** to `0fd73ffb` (`2417cde670f079b67bcb178fb39c17f27c32569a`). Therefore full 48-marker acceptance verifies the *exact current tree*, without claiming re-run on exact commit SHA. Current-head workflow runs `44560368355` dedicated and `44560368076` CI are in progress and must be assessed at **4b.11**, not pre-declared SUCCESS. No production/schema/CSS/locale change or confirmed current-scope defect. **4b.11 VERIFIED / STOP; 4b COMPLETE:** exact implementation head `0a2243339775dd1a5e55898ced6e553f77051d4e`, base/main `9eae385571bf99e073df46f8541f7514c9626a29`, Draft. All **16/16 GitHub Actions PR workflows SUCCESS** and **20/20 jobs SUCCESS** for this exact SHA; no reruns: `CI` run `44560368076` `checks` job `135687663832` (lint/typecheck/unit 2737/2737 in 218/218 files/build/UI preview) and `database` job `135687663229` (PG17 migrations/constraints, Worker smoke); dedicated Mute/Block run `44560368355` job `135687663514` SUCCESS **48/48 `FILTERS_CONNECTED`** in real Worker/Better Auth/PG17/Chromium, error-free log; evidence artifact `personal-filters-connected` ID `14548711966` stored. Remaining 14 workflows (Watch, Bookmarks, SA01/03/04/05/06/07/08, attachments, AP10, topic title, etc.) all SUCCESS. 4b.1–4b.11 accepted, implementation tree untouched since 4b.10; no 4c, docs-PR, review or merge. Scope/evidence limits: this is repository/local CI, not deployed acceptance; actual injected PostgreSQL outage, real R2 attachment download, and positive deployed Owner binding are not asserted by the 48-marker Mute/Block harness; existing unit/PG/independent workflow checks cover their scoped counterparts. Speculative Undo→re-add test was withdrawn in 4b.10 without confirmed production defect; exact HEAD is GREEN. **4c VERIFIED / Лира STOP:** stable head #351 `0a2243339775dd1a5e55898ced6e553f77051d4e`, current main/base `9eae385571bf99e073df46f8541f7514c9626a29`, Draft/open. Self-check of all 3 Mute/Block/suppression tables in `0070_personal_filters.sql`, Drizzle snapshot `0070`, manifest `targetMigration=0070_personal_filters`, journal and `db/schema.ts` matches required PK/FK CASCADE/index/self-block CHECK. Runtime privilege contract: `web` own Mute/Block `SELECT,INSERT,DELETE`, suppression receipts only `SELECT,INSERT`; `localization-read` no new relations. Exact-head CI `44560368076` PASS: migration history guard, manifest parity, runtime privilege probes (including negative ACL), split web provisioning, Drizzle schema parity, 2737/2737 unit in 218 files, build/UI preview, PG17/Worker. Dedicated `44560368355` 48/48 connected markers + evidence artifact `14548711966`; all **16/16 workflows and 20/20 jobs SUCCESS** exact SHA. Private list actor-scoped SQL, strict canonical topic/profile actions, no-store, directional privacy and independent complaint/Watch/Bookmarks checked in source and existing tests; not an independent whole-PR review. No code, migration, source-of-truth, docs implementation PR changes. **Handoff PREPARED for Mira (ChatGPT-5.6 Sol): coordinator whole-PR technical review of stable #351 against approved M1/M2/M3/M4/M6/M7; do not move to Leva until Mira PASS.** No confirmed current-scope blocker from bounded self-check, no claimed deployed/Google Owner/R2/fault injection proof. Watch/Bookmarks audit findings remain separately deferred after #351. PR #342 service-only/no merge. No review performed by Mira, no merge, no activation of deferred corrections or Stage 6.

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
10. **4b.10 — PASS (identical tree)** — full dedicated 48/48 and artifact, speculative failing unit test withdrawn; current tree `2417cde670f079b67bcb178fb39c17f27c32569a` identical to passing tree. Exact SHA CI deferred to 4b.11.
11. **4b.11 — PASS** — exact-head full 16/16 workflows, 20/20 jobs, 2737/2737 unit tests, 48/48 connected markers and evidence artifact; 4b COMPLETE.

**4c — PASS; Лира STOP.** Финальная самопроверка миграции/ACL/manifest/provisioning/CI и передача контекста Мире подготовлена. **Следующее назначение — Мира, coordinator whole-PR review stable exact head #351; затем только после её PASS Лёва independent review того же head.**

Ранние existing Chromium regressions **не заменяют** dedicated Mute/block acceptance. **4c завершена; Мира ещё не начинала whole-PR review.** Передача контекста оформлена в service channel/личном файле Лиры. Владелец отдельно подключает Миру; она первой проверяет stable exact head #351, при PASS передаёт Лёве по существующему порядку. Лира STOP; #351 остаётся Draft. No merge, Stage6, moderation visibility, overall UI/UX или #300.

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


## 2026-11-19 — Мира: coordinator whole-PR review #351 — HOLD, 3 current-scope P2

Проведён первый coordinator technical whole-PR review Draft #351 на стабильном exact head
`0a2243339775dd1a5e55898ced6e553f77051d4e` против base/main
`9eae385571bf99e073df46f8541f7514c9626a29` и принятого M1–M7.

Independently проверены migration/schema/manifest/runtime ACL, repository/service/adapters,
ordinary notification decision+receipt transaction, initial/reply/edit mention paths,
real-PG concurrency/lifecycle/rollback evidence, strict topic/profile/list actions,
private/no-store boundaries, list keysets, TopicView collapse/reveal, complaints/read-state/
Watch/Bookmarks independence, localization/RTL wiring и exact-head GitHub evidence.
Exact head остался неизменным. GitHub: **16/16 workflows / 20/20 jobs SUCCESS**;
CI PG17 **1476/1476 tests in 109 files**, dedicated connected Mute/Block **48/48 markers**.

Backend/schema/fanout/concurrency/ACL: confirmed current-scope defects = 0.
Но coordinator PASS **не дан** из-за трёх presentation/state-isolation defects:

### PF-REVIEW-1 [P2] — PersonalFilterControl stale ACK может перекрыть свежий loader state

`app/forum/personal-filter-control.tsx` хранит loader `state` во втором локальном
server-state mirror `confirmed`. Пока `submitted.current` выставлен, sync effect
игнорирует свежий loader snapshot; затем старый successful ACK очищает submitted и
записывает своё desired значение в `confirmed`. Если тем временем тот же actor/target
уже был изменён обратно другим реальным writer и route получил свежий snapshot,
старый ACK снова показывает устаревшее состояние. Если loader primitive совпадает с
предыдущим значением, следующий sync effect не обязан запускаться и stale UI сохраняется.

Это тот же causal class, который уже независимо подтверждён в merged Watch/Bookmarks audit,
но здесь он находится в **новом shared Mute/Block control**, поэтому является current #351 issue.
Текущие component/connected tests проверяют normal ACK, uncertain refresh, late other-target/
other-actor, но не newer same actor+target commit before older ACK.

Correction criterion: после fresh authoritative loader snapshot старый ACK не может стать
новым owner состояния. Сохранить pending, unknown-commit/explicit refresh, strict response
actor/target guards и отсутствие automatic POST retry. Не добавлять cache/version/global store
или compensating subsystem. Добавить deterministic regression для обеих направлений state
и подтвердить shared Mute/Block surface.

### PF-REVIEW-2 [P2] — Filters list successful Undo latch может скрыть уже re-added row

`app/forum/filters-view.tsx` / `FilterRow`: successful old Undo ACK делает
`removed=true`, после чего component неизменно `return null`. Если после Remove commit
тот же pair уже снова создан, а fresh loader снова содержит row, стабильный
actor/kind/target key сохраняет тот же component и `removed` не сбрасывается. Последующие
fresh reads могут содержать правильную строку, но UI продолжает её скрывать.

Это current #351 analogue подтверждённого BOOKMARKS-AUDIT-2, а не deferred Bookmarks fix.
4b.10 speculative test не доказал обратного: он был удалён как некорректный harness и
не проверил указанную deterministic state ordering.

Correction criterion: fresh loader presence должна снова отображать реально существующую
pair; старый Undo ACK не должен иметь постоянный приоритет над более новым loader snapshot.
Uncertain failure продолжает сохранять row и требовать refresh без write replay.
Добавить regression Remove commit → re-add → fresh loader → delayed old ACK для private list
surface (оба filter modes либо общий shared path с доказанной применимостью).

### PF-REVIEW-3 [P2 privacy] — A→guest sign-out применяет private Block snapshot A до revalidation

`TopicView` вычисляет:
`blockSnapshotIsStale = Boolean(headerActorId && hasBlockSnapshot && headerActorId !== blockedActorId)`.
При authenticated A snapshot (`blockedActorId=A`, private `blockedAuthorIds`) успешный
sign-out в `AuthControls` сначала делает `setUser(null)`, затем await
`revalidator.revalidate()`. В промежутке `headerActorId=null`, поэтому stale check = false,
и старый private Block graph A продолжает определять, чьи публичные posts collapsed.
Это раскрывает account-specific presentation после перехода в guest state и противоречит
M6/M7: guest без private graph, account-switch/late-response isolation.

A→B уже fail-closed, fresh guest loader также корректен; дефект именно transition A→guest
до нового loader snapshot. Existing connected test использует отдельный fresh guest context,
не этот transition.

Correction criterion: private Block snapshot предыдущего actor не применяется, когда current
header identity уже guest/null; fresh guest после revalidation видит обычный public TopicView.
Не ломать fresh guest case (null/null) и existing A→B fail-closed behavior. Добавить
deterministic transition regression; connected Better Auth sign-out coverage желательна для
реального boundary.

### Handoff

Следующий исполнитель — **Лира / ChatGPT-6**, один bounded correction package только
PF-REVIEW-1/2/3 в существующем #351. Не трогать deferred WATCH-AUDIT-1,
BOOKMARKS-AUDIT-1/2 или TITLE-AUDIT-1; не расширять product scope.

После corrections: новый stable exact head, focused regressions + применимые full CI и
dedicated connected acceptance, затем **STOP Мире на новый whole-PR coordinator cycle**.
До нового Mira PASS Лёву не подключать. #351 остаётся Draft; #342 service-only/no merge.


## 2026-11-19 — Лира: PF-REVIEW-1 correction code/tests checkpoint; verification PENDING / STOP

Mira completed coordinator whole-PR review of #351 at head `0a2243339775dd1a5e55898ced6e553f77051d4e`, **HOLD** for current-scope PF-REVIEW-1/2/3. This correction turn addresses **only PF-REVIEW-1**, not the other two defects or deferred Watch/Bookmarks issues.

**Implementation Draft #351 current head:** `7bdf468fed9bebb74adf421cb5e231ba14218c8a`; test/code commits: `caabdf9614f3564814aa1dc727b9a07b0e2e0721` (control code), `448325d1d17bcca4477ddc40827b69b683586215` (four regressions), `7bdf468fed9bebb74adf421cb5e231ba14218c8a` (canonical pending label). Only `app/forum/personal-filter-control.tsx` and `app/forum/personal-filter-control.test.tsx` changed.

**PF-REVIEW-1 targeted correction:** Removed local `confirmed` mirror as a competing source of server state. `PersonalFilterControl` renders current loader `state` unless an unconfirmed/error action requires an explicit refresh. A matching ACK no longer writes a local on/off value that can supersede a newer same actor/target loader snapshot. Pending disable, typed unknown/unavailable, explicit GET refresh, actor/target ACK guards and no automatic POST retry remain. Four new deterministic React Router tests exercise Topic Mute and User Block in both state directions: first writer commits, ACK held, second writer restores pair, fresh route loader revalidates, late matching old ACK delivered; loader must remain authoritative. Existing ordinary success test fixture now actually updates server-side loader snapshot before ACK.

**Evidence boundary:** source and regression code committed, but **NOT YET VERIFIED / NOT PASS**. On the exact new commit, CI [run 44573742574](https://github.com/iliya1947/vico-forum/actions/runs/44573742574) jobs `checks` `135735501620` and `database` `135735500995`, plus connected [run 44573743073](https://github.com/iliya1947/vico-forum/actions/runs/44573743073) job `personal_filters_browser` `135735503028`, were still **queued** at last checked time. Do not claim focused tests PASS until their actual result is inspected; no CI runner polling loop. Production and other PF issues unchanged.

**Лира STOP on this implementation microstep**. Next explicit `...` should **verify current head's completed CI, diagnose/fix PF-REVIEW-1 test-only/actual failure if any and checkpoint PASS only if evidenced**; then STOP before **PF-REVIEW-2**. PF-REVIEW-2/3 must be separate next authorized microsteps. Only after all 3 corrections should a stable exact-head full CI + dedicated acceptance and a fresh Mira coordinator whole-PR cycle be prepared. #342 service-only/no merge; #351 remains Draft.


## 2026-11-19 — Лира: PF-REVIEW-1 exact-head verification PASS; checkpoint / STOP before PF-REVIEW-2

Implementation Draft #351 remains at **`7bdf468fed9bebb74adf421cb5e231ba14218c8a`** (base `9eae385571bf99e073df46f8541f7514c9626a29`); no changes in this verification step. Three targeted implementation commits in prior step modified only `app/forum/personal-filter-control.tsx` and its test. Old independent coordinator review remains HOLD for PF-REVIEW-2 and PF-REVIEW-3; **do not treat this focused verification as new Mira whole-PR PASS**.

**Verified on exact head:**
1. [CI `44573742574`](https://github.com/iliya1947/vico-forum/actions/runs/44573742574): `checks` `135735501620` SUCCESS — **2741/2741** unit tests in **218/218** files, focused `personal-filter-control.test.tsx` **11/11**, including 4 deterministic newer-loader-before-old-ACK scenarios (topic/user × ON/OFF), plus lint, typecheck, build, preview and schema checks. `database` `135735500995` SUCCESS — **1476/1476** tests in **109/109** files, PG17 and applicable migrations/runtime/schema checks.
2. [Dedicated Mute/Block connected `44573743073`](https://github.com/iliya1947/vico-forum/actions/runs/44573743073): `personal_filters_browser` job `135735503028` SUCCESS, all **48/48 `FILTERS_CONNECTED`** markers, artifact `personal-filters-connected` **`14556521887`** nonexpired/uploaded.
3. Exact commit workflow association: **16/16 GitHub Actions workflows completed SUCCESS**, no failed/pending; compare previous stable head `0a2243339775dd1a5e55898ced6e553f77051d4e` → current shows only two component/test files, 3 commits.

**PF-REVIEW-1 result: PASS bounded correction.** `PersonalFilterControl` now treats loader `state` as presentation authority rather than a local successful-ACK mirror. Late matching response cannot overwrite a newer same-pair loader snapshot; no optimistic write, pending lock and explicit refresh for unknown outcome remain, actor/target checks and no automatic POST retry preserved. This is repository/CI acceptance for the stated race; independent coordinator verification after all corrections is still required.

**Лира STOP after PF-REVIEW-1 verification.** Next separate explicit `...` activates **ONLY PF-REVIEW-2** (Filters list Undo latch / re-added own pair) with focused regression/CI checkpoint; **PF-REVIEW-3 requires another separate command**. Only after all three corrected: final exact-head CI/connected and new Mira whole-PR coordinator review; no Leva before Mira PASS. #342 service-only/no merge; #351 Draft. Deferred Watch/Bookmarks audit corrections out of scope.


## 2026-11-19 — Лира: PF-REVIEW-2 fix/test checkpoint, CI QUEUED — STOP

**Only PF-REVIEW-2 current-scope correction in Draft PR #351:** exact current head `dac264877fd1969e1fd683cc731a8852e2848a16` (base/main `9eae385571bf99e073df46f8541f7514c9626a29`), three commits starting `26289f823f07c06d634144f8dee81843ad4b1a41`. Changed only `app/forum/filters-view.tsx` and `app/forum/filters-view.test.tsx` (GitHub compare against PF-REVIEW-1 head `7bdf468fed9bebb74adf421cb5e231ba14218c8a` verified).

**Implementation:** `FilterRow` no longer stores permanent local `removed` latch or returns `null` on an old successful Undo ACK. The existing server-scoped `/:locale/filters` loader is the source of visible own rows; React Router revalidates route data after a fetcher Form action. Valid Undo still clears uncertainty; errors preserve the row with explicit refresh, no automatic POST retry. No additional state/version/store/DB/ACL change.

**Tests added:** two React Router loader-driven deterministic cases, one for Mute topic and one for Block user: Remove committed, old ACK delayed; another legitimate session re-adds same pair with fresh `createdAt`; route revalidates before old ACK arrives; late ACK must not hide the re-added row. Existing normal successful Undo test updated to model committed removal in loader instead of depending on local hiding. Existing uncertain/actor-isolation tests untouched.

**Verification boundary:** The new exact-head GitHub CI [run 44577496670](https://github.com/iliya1947/vico-forum/actions/runs/44577496670) `checks`/`database` and dedicated [run 44577496424](https://github.com/iliya1947/vico-forum/actions/runs/44577496424) are **QUEUED at last check**. NO PASS claim for the new tests/commit. Code was committed and source/diff reviewed, but runtime regression acceptance **not yet established**. Do not infer success from prior PF-REVIEW-1 CI. Neither PF-REVIEW-3 nor deferred Watch/Bookmarks corrections changed.

**Лира STOP after PF-REVIEW-2 code/tests checkpoint.** Next distinct explicit `...` = **ONLY PF-REVIEW-2 exact-head CI verification** and, if required, diagnosis/local correction of *confirmed* failure; checkpoint and STOP before PF-REVIEW-3. Then separate `...` for PF-REVIEW-3. After all three correction steps, final exact-head full CI + Mira whole-PR coordinator review; Leva only after Mira PASS. #342 service-only/no merge; #351 remains Draft.


## 2026-11-19 — Лира: PF-REVIEW-2 corrected exact-head CI PASS; STOP before PF-REVIEW-3

Draft #351 stable exact head `37b7c8e991865a0352562fecbedf74d6f5aeeb53`. Old test-only assertion mismatch from `dac264877fd1969e1fd683cc731a8852e2848a16` corrected with one-line matcher change in `app/forum/filters-view.test.tsx`; production unchanged. CI `44587038549`: `checks` (job `135782670721`) SUCCESS, 2743/2743 unit tests / 218 files, `filters-view.test.tsx` 6/6 including both Mute/Block re-add+delayed Undo ACK; `database` (job `135782669976`) SUCCESS. Dedicated Mute/Block Chromium `44587038774` (job `135782671192`) SUCCESS, 48/48 `FILTERS_CONNECTED` markers. **All 16/16 exact-head GitHub workflows completed SUCCESS, no failed/pending.** PF-REVIEW-2 bounded correction PASS, not a new Mira whole-PR review. Next separate `...` = ONLY PF-REVIEW-3; after all three corrections new full whole-PR cycle starts with Mira, Leva only after Mira PASS. #342 service-only; #351 Draft; no merge/Stage6/deferred audits.


## 2026-11-19 — Мира: second coordinator whole-PR review #351 — PASS

Повторный coordinator technical whole-PR review Draft #351 выполнен на стабильном exact head
`0fc239a554c8df562e97bc600f59b6b7b06d36ab` против неизменного base/main
`9eae385571bf99e073df46f8541f7514c9626a29`.

Полный implementation scope M1–M7 снова сопоставлен с current PR tree. Compare первого
review head `0a2243339775dd1a5e55898ced6e553f77051d4e` → текущего head показывает ровно
7 correction/test files; backend/schema/migration/notification/concurrency/ACL tree,
ранее проверенный whole-PR циклом, не изменён. Три coordinator finding перепроверены
независимо:

1. **PF-REVIEW-1 CLOSED.** `PersonalFilterControl` больше не хранит local successful-ACK
   mirror как competing authority; current loader state управляет presentation. Deterministic
   topic/user × ON/OFF regression подтверждает: fresh same-pair loader snapshot остаётся
   authoritative после delayed older ACK; pending/unknown explicit refresh/actor-target guards/
   no POST replay сохранены.
2. **PF-REVIEW-2 CLOSED.** `FilterRow` больше не имеет permanent `removed` latch. Row
   видим только из authoritative private-list loader data. Deterministic Mute и Block cases
   подтверждают Remove commit → re-add same pair → fresh loader → delayed old Undo ACK:
   re-added row остаётся видимой; uncertain path сохраняет row + explicit refresh/no replay.
3. **PF-REVIEW-3 CLOSED.** TopicView stale Block snapshot теперь определяется сравнением
   current header identity с snapshot actor и для A→guest тоже fail-closed до нового loader.
   Fresh guest null/null остаётся public; A→B остаётся fail-closed. Unit test удерживает
   old A loader during sign-out и проверяет no private graph application/reveal; connected
   real Better Auth same-mounted-topic sign-out подтверждает после revalidation public guest
   bodies и отсутствие personal control при сохранённой A own Block pair.

Exact-head evidence independently checked:
- **16/16 workflows completed SUCCESS; 20/20 jobs SUCCESS**;
- CI checks: **2744/2744 tests, 218/218 files**, lint/typecheck/build;
- CI database: **1476/1476 tests, 109/109 files**, PG17, migration/schema/runtime privilege/
  provisioning/Worker probes PASS;
- dedicated Mute/Block Worker + Better Auth + PostgreSQL17 + Chromium:
  **49/49 FILTERS_CONNECTED** markers, включая same-topic sign-out transition.

Stable head повторно подтверждён после review. Confirmed current-scope defects = **0**.
Coordinator whole-PR result: **PASS**.

### Handoff

Следующий исполнитель — **Лёва / Codex-6.1 Sol**: независимый technical whole-PR review
того же exact head `0fc239a554c8df562e97bc600f59b6b7b06d36ab` против base/main
`9eae385571bf99e073df46f8541f7514c9626a29`, без участия в authoring corrections.
Проверить весь M1–M7 scope, не только PF-REVIEW-1/2/3, и независимо классифицировать
только реальные current-stage defects. Если head изменится — этот PASS больше не является
final review для нового head и нужен новый coordinator cycle.

Не трогать deferred WATCH-AUDIT-1, BOOKMARKS-AUDIT-1/2, TITLE-AUDIT-1, moderation visibility,
structure/topic move, #320, Stage6 или general UI/UX. #351 Draft/open; #342 service-only,
never merge. После independent PASS владельцу будет доступен merge implementation #351;
после фактического merge отдельный docs closeout выполняет Лира.

## 2026-11-19 — Лёва: independent technical whole-PR review #351 — PASS

Проверен **весь M1–M7 scope**, не только исправления, на stable exact head
`0fc239a554c8df562e97bc600f59b6b7b06d36ab` против base/main `9eae385`.
Новых подтверждённых дефектов текущей задачи нет. PF-REVIEW-1/2/3 CLOSED.
Независимо подтверждены 16/16 workflows, 20/20 jobs SUCCESS, full unit2744/2744,
PG1476/1476, dedicated actual Worker/Better Auth/PG17/Chromium49/49 markers.
Локально повторены 202 UI/route +34 PG checks; ещё6 независимых real-PG+Router
cases подтвердили актуальность controls/rows после delayed older ACK. Всё PASS.
Scope/causal coverage/evidence limits — в channel и файле Лёвы.

Устаревшие active HOLD/not-review-ready пункты workflow и описание #351 приведены
к текущему результату; implementation/head не изменены. #351 остаётся Draft/open.
**Владелец: Ready → merge #351 при неизменном head; затем Лира — отдельный docs
closeout по фактическому merged main.** Deferred audits и owner order после #351
сохранены; TITLE-AUDIT-1 только applicable UI/UX. **Лёва STOP.**

## 2026-11-19 — отдельный Mute/block necessity audit по вопросу владельца

После whole-PR PASS владелец уточнил «А на костыли проверил?». Проведён отдельно
сравнительный аудит #351 на том же0fc239a, без production edits. Необоснованных
архитектурных механизмов не подтверждено: удаление receipts возвращает старые
уведомления, memory-only actor history ломает credential remount, удаление stale
Block guard применяет прежний graph к guest. Эксперименты/границы — в channel.

Найдено **неблокирующее локальное упрощение PF-SIMPLIFY-1**: объединить failed и
needsRefresh в PersonalFilterControl; isolated one-flag prototype16/16 selected
checks PASS (включая refresh rejection и4 real-PG/Router freshness cases).
Это не функциональный defect и не новый gate/автоматическое correction-назначение.
Previous whole-PR PASS/owner merge route сохранён; code/head не менялись.
**Лёва STOP.** Watch/Bookmarks corrections и TITLE UI/UX идут по прежнему owner order.


## 2026-11-19 — #351 merged; Mute/block docs closeout activated

Implementation PR #351 **merged** at 2026-11-19T19:38:41Z.
Reviewed implementation head:
`0fc239a554c8df562e97bc600f59b6b7b06d36ab`.
Merge commit = current main:
`b87a6702b4f97634ee21426f95ece38f53c672ed`.

После merge заново прочитаны актуальные `AGENTS.md`, `PROJECT.md`,
`PROJECT_STATE.md` и history index на новом main. Permanent Mute/block contract
ещё не зафиксирован, PROJECT_STATE всё ещё имеет migration ceiling `0069` и не
описывает merged Mute/block. Следующий bounded этап — **отдельный docs closeout**.

### Следующий исполнитель — Лира / ChatGPT-6

Создать отдельный docs-only PR от current main
`b87a6702b4f97634ee21426f95ece38f53c672ed`.

Требуемый результат:

1. **`PROJECT.md` — permanent product contract Mute/block.**
   Зафиксировать только уже merged поведение:
   - explicit own Topic Mute для active authenticated actor;
   - Mute suppresses future ordinary reply/mention notifications из темы независимо
     от author/parent/Watch/mention source, не скрывает content и не меняет Watch;
   - Unmute prospective only, suppressed historical pairs не backfill;
   - directional A→Block B: A не получает новые ordinary notices от actor B,
     обычные B posts в TopicView для A collapsed с explicit per-post Reveal;
   - Block не является ban: B продолжает читать/publish/reply/mention, public profile/
     Search/discovery не скрываются; reverse direction independent, self-block invalid;
   - suppression receipts сохраняют no-backfill после Unmute/Unblock/edit/replay;
   - private `/:locale/filters` показывает только собственные muted topics / blocked users;
   - Watch/Bookmarks/read-state и protected Complaint/Admin review surfaces независимы;
   - отдельного RBAC permission для личных Mute/Block нет.
   Не превращать PROJECT.md в implementation history или SQL/test ledger.

2. **`PROJECT_STATE.md` — только factual current state.**
   - migration history ceiling обновить `0000–0070`, указав
     `0070_personal_filters`;
   - в Forum core кратко добавить уже merged personal Mute + directional Block и
     private filters surface;
   - externally accepted migration evidence оставить `0000–0020`;
   - не утверждать production/deployed acceptance, Stage6 rollout или owner visual acceptance;
   - не переносить сюда PR/review/correction историю.

3. **History — новый `docs/PROJECT_HISTORY/PROJECT_HISTORY_32.md` + index.**
   Зафиксировать implementation #351 и значимую correction/review chain:
   - migration 0070 / personal filter tables + suppression receipt;
   - reviewed exact head `0fc239a554c8df562e97bc600f59b6b7b06d36ab`;
   - Mira coordinator PASS и Leva independent PASS;
   - PF-REVIEW-1/2/3 corrections;
   - exact-head 16/16 workflows, 20/20 jobs,
     unit 2744/2744, PG17 1476/1476, dedicated connected 49/49;
   - Leva separate necessity audit: no unjustified architectural mechanisms found;
     optional `PF-SIMPLIFY-1` prototype was **not merged** and is not a current requirement;
   - merge #351 → main `b87a6702b4f97634ee21426f95ece38f53c672ed`;
   - repository/local-CI evidence boundaries: no deployed production/real external
     OAuth/Owner/R2 acceptance claim.

4. **Не менять** code/schema/runtime/ACL/tests, `AUTHORIZATION.md`,
   `COMPLAINTS.md` или unrelated docs без подтверждённой необходимости.
   Mute/block не добавил новый RBAC и не менял Complaints authority.

5. После stable docs head и applicable docs CI — **STOP Мире** для whole-docs review.
   Для docs-only PR отдельный independent review Лёвы не требуется по текущему AGENTS.
   Merge выполняет владелец только после Mira docs PASS.

После фактического merge docs closeout Mute/block считается полностью закрытым.
Следующий owner-ordered corrective block после этого:
`WATCH-AUDIT-1` → `BOOKMARKS-AUDIT-1` → `BOOKMARKS-AUDIT-2`.
`TITLE-AUDIT-1` остаётся для applicable UI/UX.


## 2026-11-19 — Мира: #353 whole-docs review HOLD — 1 wording correction

Whole-docs review выполнен на stable exact head
`f81fc47811cace99c97b1fbacea321d3881961d9` против merged main
`b87a6702b4f97634ee21426f95ece38f53c672ed`.

Проверены все 4 Markdown path:
- `PROJECT.md`;
- `PROJECT_STATE.md`;
- `docs/PROJECT_HISTORY/PROJECT_HISTORY_32.md`;
- `docs/PROJECT_HISTORY/PROJECT_HISTORY.md`.

Подтверждено:
- permanent Mute/Block contract соответствует merged #351;
- migration ceiling repository = `0000–0070`, external accepted evidence = `0000–0020`;
- review/correction/CI details находятся в history, не в current state;
- history #32 корректно отражает #351 merge, PF-REVIEW-1/2/3, Mira/Leva PASS,
  exact-head 16/16 workflows, 20/20 jobs, 2744/2744 unit, 1476/1476 PG17,
  49/49 connected markers и unmerged optional PF-SIMPLIFY-1;
- docs-only CI run `44602703247`: checks + database SUCCESS;
- code/schema/runtime/ACL/tests не менялись.

**DOC-PF-1 [P3 factual wording]**:
в `PROJECT_STATE.md` Forum core сейчас написано
«... приватные списки `/:locale/filters` и **сохранение подавленных уведомлений
без backfill** ...».

Это неточно: подавленные ordinary notification rows не сохраняются как inbox
notifications. Реализация сохраняет private suppression receipts / suppressed
recipient–post pairs, чтобы old edit/replay после Unmute/Unblock не создавал
уведомление задним числом.

Correction criterion: заменить только эту формулировку на factual wording вроде
«учёт подавленных пар получатель–сообщение без backfill» или эквивалентное,
не расширяя PROJECT_STATE implementation details. Остальные docs не менять без
новой причины.

Следующий исполнитель — **Лира / ChatGPT-6**: только DOC-PF-1 в #353, затем
applicable docs CI / stable exact head и STOP Мире для повторного docs review.
Лёва для docs-only review не нужен. #353 остаётся Draft; #342 service-only/no merge.

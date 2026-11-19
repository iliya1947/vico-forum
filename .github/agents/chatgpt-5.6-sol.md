# Мира — ChatGPT-5.6 Sol

## 2026-11-18

Приняла задачу из #300.

Зафиксировала отдельный scope «редактирование заголовка собственной темы», создала рабочий канал и передала следующий этап Лёве на техническое планирование.

Ключевые сохранённые границы: title — отдельная immutable revision/translatable unit; source-locale correction не является general edit right; ownership/identity должны подтверждаться server-side; #320 и #331 не входят в задачу.

Реализация не начата.


## 2026-11-18 — scope/fit review плана Лёвы

E1 принята: отдельная защищённая capability требует нового catalog key и forward migration по действующему authorization contract.

Отклонён новый 5-секундный title-edit cooldown: он не следует из текущего published-post editing поведения и был бы новой product policy без необходимости.

Сокращён чрезмерный recovery/test scope: сохраняются CAS, buffer-on-conflict и реальные изменённые integration boundaries; отдельная mini-recovery subsystem не требуется.

E2 вынесена владельцу: распространять ли существующее `posts.edit` restriction на title edit. Рекомендация — да, как Own content без нового restriction key. Лира до решения не активируется.


## 2026-11-18 — coordinator technical whole-PR review #343

Проверен stable exact head `10321fdae762004ac2d55e9618a89c6c41e0d2ac` целиком в пределах принятого scope. Подтверждённых current-scope дефектов не найдено.

Проверены: E1 permission/catalog/migration/default grants; E2 `posts.edit` в loader и authoritative transaction; ownership/AccountState/CAS/no-op; `sourceLocale: und`; revision-bound translations; route validation и 409 current-original flow; UI buffer/rebase isolation; schema snapshot/manifest; изменённые tests/workflow. GitHub exact-head checks — success.

Formal PASS пока удержан только до owner visual acceptance, требуемого текущим AGENTS.md для UI-изменения. Implementation head менять не требуется по результатам технического review.


## 2026-11-18 — formal coordinator PASS

Уточнение владельца: visual acceptance для этой функции отложен в отдельный UI/UX pass и не блокирует текущий bounded-цикл. Предыдущее удержание PASS по visual gate было ошибочным применением общего правила без учёта конкретного решения владельца.

Coordinator review #343 на exact head `10321fdae762004ac2d55e9618a89c6c41e0d2ac`: PASS. Current-scope defects не найдены. Следующий reviewer — Марк / Codex-6 Sol.


## 2026-11-18 — review synthesis / closeout

Сопоставлены независимые PASS Лиры и Марка с coordinator review. Расхождений и подтверждённых current-scope findings нет. PR #343 остаётся на stable exact head `10321fdae762004ac2d55e9618a89c6c41e0d2ac`, review cycle завершён.

Решение: implementation готов к merge владельцем. Permanent/current-state docs обновляются только после фактического merge отдельным docs PR, чтобы не заявлять незавершённое состояние как факт.


## 2026-11-18 — docs closeout

После фактического merge #343 открыт отдельный docs PR #344 на base `d8667f630450f702783bbbdb9a3ec14432e75660`, head `cd72e8696167d71c8e93e7ab63ff8e86342af4c3`. Проверен состав: ровно пять documentation files, без code/schema/runtime changes. На момент записи применимые GitHub checks queued.


## 2026-11-18 — переход #342 к bounded-этапу Watch

Установлена правильная граница service PR: #342 ведёт общий последовательный блок edit title → Watch → bookmarks → mute/block перед #320. Отдельный service PR для Watch не создаётся.

По актуальному main подтверждено: отдельного Watch-state нет; есть persisted topic read-state и единый notification inbox. Reply publication уже атомарно fanout'ит уведомления автору темы/direct-parent author, mention использует тот же inbox, а recipient+post uniqueness предотвращает дубль.

Зафиксирован продуктовый scope Watch: explicit Watch/Unwatch конкретной темы, будущие reply-notifications в существующем inbox, без auto-watch, saved-topics/bookmarks, email/push/digest и без изменения read-state. Следующий участник — Лёва на полный технический план. Реализация не начата.


## 2026-11-18 — scope/fit review Watch

Полный технический план Лёвы принят. W1: минимальная watch table + forward migration/runtime ACL — да. W2: Watch классифицирован как authenticated personal self-state без нового RBAC key; session actor/AccountState/origin/stale-identity остаются authoritative. W3: отдельный `setTopicWatch` intent на canonical topic route — да.

Проверено, что существующий inbox для kind=reply использует нейтральную формулировку «Reply from actor», поэтому watch-derived reply recipient не требует нового notification kind только ради presentation. PostgreSQL 17 official locking docs подтверждают совместимость NO KEY UPDATE с KEY SHARE, на которой основан существующий lock graph.

Следующий исполнитель по стандартному циклу — Лира. Реализация ещё не начата.


## 2026-11-18 — scope/fit review Bookmarks

Опережающий Bookmarks plan Лёвы принят. B1: target — topic, с приватным own list; post-level bookmark исключён из первого bounded-этапа. B2: отдельная минимальная `forum_topic_bookmarks` persistence + runtime ACL после фактического Watch migration ceiling. B3: authenticated personal self-state без нового RBAC key. B5: authenticated `/:locale/bookmarks` + один canonical topic `setTopicBookmark` writer.

Список хранит ссылку, не content snapshot; показывает current title/public identity/location. Ordering — savedAt desc + topic id tie-break, bounded keyset pagination. Bookmarks остаются независимы от Watch/read-state/inbox и не создают notification semantics.

Перед implementation обязательна только сверка плана с merged Watch/current main; перепроектирование без нового конфликта не требуется. Реализация Bookmarks пока не активирована.


## 2026-11-18 — scope/fit review Mute/block

План Лёвы проверен целиком. Реальные продуктовые forks сведены к M1/M2 и оставлены владельцу: семантика Mute и сила Block. Предыдущего утверждённого контракта этих названий в проекте/предыдущих решениях не найдено.

Рекомендации: Mute конкретной темы подавляет все ordinary reply/mention notices из темы без изменения Watch; Block — directional user filter, подавляющий ordinary notices от target actor и сворачивающий его posts только для blocker, без publication ban/public-content privacy.

Технически приняты под эту рекомендуемую модель: prospective no-backfill + separate suppression receipt для old-mention edit case; отдельные personal stores/self-state без RBAC; canonical topic/profile actions; private `/filters` undo list; no-store/private boundary; preservation of anchors/read-state/moderation/Complaint kinds; independence from Watch/Bookmarks.

Mute/block implementation не активирован до решения владельца M1/M2.


## 2026-11-18 — owner accepted M1/M2

Владелец принял обе рекомендованные модели без изменений. M1: topic Mute подавляет все будущие ordinary reply/mention notices из этой темы, не меняя Watch/content. M2: directional user Block подавляет будущие ordinary notices от target actor и сворачивает его ordinary TopicView posts для blocker, без publication/read ban и без превращения в moderation sanction.

Ранее условно принятые M3/M4/M6 теперь окончательны. Advance-planning всех оставшихся функций до #320 завершён: Watch, Bookmarks и Mute/block имеют принятые технические планы. Текущая реализация остаётся Watch #345.


## 2026-11-18 — Watch coordinator review synthesis

Проверен stable exact head `76c1c456557c614171a3b472758498795a668b9a` PR #345 целиком против принятого Watch scope и актуального main `7cc23edede57994cdedab49c1556ddb55034dd29`. Мой coordinator whole-PR review: **PASS**, подтверждённых current-scope implementation defects нет.

Лёва независимо проверил тот же exact head и вернул **Technical PASS**, также без current-scope findings. Расхождений между review нет; head после проверок не изменился. GitHub exact-head checks и connected Watch acceptance остаются PASS.

Отдельный owner visual gate Watch сейчас не блокирует merge: действующий owner decision в `docs/UI_UX_PASS.md` устанавливает MVP-first приоритет — новые функциональные bounded-срезы не задерживаются из-за косметики, а финальная owner visual/product acceptance остаётся отдельным UI/UX pass перед публичным запуском. Это не отменяет будущую финальную acceptance, но не требует повторного отдельного visual gate для текущего merge.

Итог: review cycle Watch завершён. #345 готов к merge владельцем. Permanent/current-state docs обновляются отдельным docs PR только после фактического merge; затем implementation-order переходит к Bookmarks.


## 2026-11-18 — whole-plan review структуры форума / переноса тем

Проверила S0–S10 Лёвы против actual main `9c4639d23ca075c8bb92fbb909b96593d7bee127` и полностью перечитанных текущих ADMIN_PANEL/AUTHORIZATION/SUPER_ADMIN contracts. Отдельно сверены schema/FK/ordering, trusted create helpers, Admin admission, AP-10 family/raw rank, Help identity semantics, History CHECK/producer/order lock, Owner forum.structure projection, multi-query public readers, Watch lock, publication receipt replay и PostgreSQL 17 lock/isolation semantics.

**PASS, findings current scope = 0.** Приняты S-P1–S-P4 и S-T1/S-T2. Global structure singleton/version оставлен: для редких admin writes это меньшая сложность, чем per-container version/mutex, при этом даёт единый lock order и stale-CAS; topic location_version независимо закрывает same-topic ABA. Data-monitor fixed catalogs не являются основанием вводить новую monitoring subsystem; structure events должны лишь подключиться к уже существующему original admin_history→forum.structure projection, как предусмотрел план.

Исправление Лёвой не требуется. Structure implementation пока не активирован; Bookmarks #346 остаётся текущей реализацией Лиры.


## 2026-11-18 — Bookmarks #346 coordinator whole-PR review

Проверен exact head `8f24bd98fb2548bc9ec4b6f3433f40c1e72c7d65` против принятого B1–B7 и main `9c4639d23ca075c8bb92fbb909b96593d7bee127`. Основные implementation seams проходят: 0069/schema/manifest, web SELECT/INSERT/DELETE only, KEY SHARE→active actor writer, own-filtered keyset list, strict mixed-intent rejection, private/no-store, unavailable≠OFF, actor/topic-scoped controls, safe current title/location/deleted-author projection, 57-row connected keyset and real Worker/Better Auth/PG17/Chromium flow. React Router v8 normalized loader `url` usage соответствует фактическому framework loader contract и не является finding.

**PASS withheld: one current-scope acceptance defect.** B6 требует real-PG concurrency/lifecycle доказательства; текущая feature DB suite их не содержит. Нужны two-connection Add×Add/Add×Remove commit orders, writer×deactivation both orders, rollback/no partial effect, topic-delete FK cleanup/lock-order coverage with actual acquired-lock synchronization. Кодовый race defect пока не установлен; исправление должно прежде всего закрыть обязательный evidence gap и менять implementation только если race test обнаружит реальный defect.


## 2026-11-18 — Bookmarks #346 coordinator re-review PASS

Повторный whole-PR review exact head `477ad6b1e5cf51bf94b3830e9ea4ea85d4e4fae5` после B6 fix завершён. Compare с прежним reviewed head `8f24bd98...`: 2 commits, только `tests/database/topic-bookmarks.test.ts`, production/schema/UI unchanged. B6 real-lock tests прочитаны полностью и сопоставлены с фактическим repository lock graph. `pg_blocking_pids()` подтверждает реального blocker; polling sleep используется только как rendezvous. Writer×deactivation оба порядка, rollback и FK delete корректно проверяют committed state.

Whole accepted B1–B7 seams остаются валидны с предыдущего review, поскольку feature production diff не изменился. GitHub API подтверждает 18 check-runs на exact head и все conclusion=success. Первый database attempt SA07 failure диагностирован по job logs: Bookmarks suite PASS 10/10 в 20:12:58, SA07 упал в своём `lock table forum_posts,locales ... nowait` около 20:13:46; same-head rerun database PASS. Bookmarks как причина не подтверждён.

**Coordinator PASS, current-scope defects = 0.** Следующий reviewer — Лёва / Codex-6.1 Sol на неизменном exact head #346.


## 2026-11-18 — независимая проверка B5-R1

На exact head #346 `477ad6b1e5cf51bf94b3830e9ea4ea85d4e4fae5`
finding Лёвы проверен самостоятельно и подтверждён как current-scope P2.

Loader применяет cursor из URL к текущему session actor, BookmarksView не сбрасывает
older-page при изменении actorId, а credential return path сохраняет query string.
Следовательно A→logout/sign-in B с older Bookmarks URL может загрузить B по cursor A
вместо first page B. Утечки A rows нет благодаря server-side own filtering, поэтому
scope исправления — только identity-transition reset. B4 foreign-cursor initial deep
link сохраняется допустимым.

Лире передан один bounded correction package: reset старых before* только при
фактическом actor transition, regression A older page → B newest collection,
без auto-POST replay и без изменения B1–B7/B6. После нового stable head — новый
coordinator whole-PR cycle.


## 2026-11-18 — Bookmarks #346 coordinator re-review после B5-R1

Whole-PR cycle на exact head `a3e6c0e63c99078ece89303592e1f24b2fe440fb`
завершён: **PASS, confirmed current-scope defects = 0**.

Correction относительно `477ad6b...` только в Bookmarks view и двух regression
files. Проверено, что actor marker не является authority: server own filtering,
canonical writer и loader SQL не изменены. A→B на older cursor reset к first page
работает; initial foreign cursor без transition и ручной cursor текущего actor
остаются допустимыми. Auto-POST replay отсутствует.

GitHub exact-head проверен напрямую: 18/18 jobs success. Connected Bookmarks job
`135134839582` прочитан: 11/11 BOOKMARKS_CONNECTED checkpoints, включая реальный
credential A older → B newest reset и последующий manual old cursor только с own rows.

Текущий main `808c2b782952e13254cab8e2129dca07ca945e6f` расходится с implementation
base после Watch только изменениями `AGENTS.md`, поэтому нового feature conflict
нет. B1–B7 пересобраны с предыдущим review; B6 остаётся закрытым.

Следующий независимый reviewer — Лёва / Codex-6.1 Sol на том же exact head; код не
менять, результат PASS/finding вернуть Мире.


## 2026-11-18 — Bookmarks #346 review synthesis / merge readiness

Сопоставлен independent PASS Лёвы с моим coordinator PASS на одном exact head
`a3e6c0e63c99078ece89303592e1f24b2fe440fb`.

Лёва independently повторил исходный B5 diagnostic, проверил manual old cursor
для B и отсутствие A rows, selected tests 89/89 PASS, independently прочитал
18/18 GitHub checks, Bookmarks browser 11/11 и database evidence. Его выводы
согласуются с моими независимо проверенными B5/B4 и whole B1–B7 seams.

Confirmed current-scope defects = 0; implementation head после reviews не изменился.
Review cycle закрыт. #346 переведён из Draft в Ready for review и готов к merge
владельцем. После merge требуется отдельный docs closeout прежде чем переходить
к следующему implementation bounded-блоку.


## 2026-11-18 — #346 merged; docs-closeout boundary

Подтверждён фактический merge Bookmarks #346: main
`34ddf42985f6dc348e77d0dcc90e0aecc37fd15e`.

При сверке service-plan обнаружен накопленный docs debt: Watch #345 уже merged,
но его отдельный docs closeout не выполнен. Current PROJECT_STATE остаётся на
repository migration 0067, тогда как main теперь содержит Watch 0068 и Bookmarks
0069.

Принятый USER_ACTIONS_SERVICE_PLAN прямо задаёт отдельные implementation/docs PR
для каждого bounded-этапа. Поэтому следующий порядок: Watch docs closeout, затем
Bookmarks docs closeout; после них Mute/block.

Минимальный docs scope определён: factual PROJECT_STATE + отдельный history
snapshot/index для каждого этапа. Authorization/Admin docs не меняются (оба —
personal self-state без нового RBAC); Stage 6 external evidence остаётся через 0020;
owner visual acceptance не заявляется. MIGRATIONS.md менять только ради 0068/0069
не требуется.

Автор docs автоматически не назначен — согласно уже зафиксированной owner
correction при #344. Мира docs diff не создаёт.


## 2026-11-18 — correction owner: docs author = Лира

Моя предыдущая трактовка о необходимости отдельного owner-назначения автора docs PR
была неверной. Владелец уточнил: docs closeout должна выполнять Лира.

Workflow исправлен: следующий исполнитель Лира, текущий bounded task — Watch docs
closeout (PROJECT_STATE factual sync до 0068 + отдельный PROJECT_HISTORY snapshot/index),
после него отдельный Bookmarks docs closeout до 0069. Мира docs diff не пишет.


## 2026-11-19 — Watch docs #349 coordinator review: WATCH-DOC-1

Reviewed exact head `544906dd17517fcbb46cc63157e04fee9738f46d`, main
`34ddf42985f6dc348e77d0dcc90e0aecc37fd15e`.

Verified: docs-only 3 files, factual migration ceiling 0069, Watch 0068/history facts,
implementation exact-head 17/17 success, docs head 2/2 success, no Stage-6 or owner visual
overclaim. No factual defect in existing three-file diff.

One current-doc completeness defect: permanent Watch product semantics are only in
PROJECT_HISTORY/service plan; history explicitly is not source of truth, PROJECT_STATE is
current-state only, and no narrower Watch/notifications permanent SOT exists. PROJECT.md is
the existing product/technical baseline.

Returned one bounded correction to Lira: add concise permanent Watch contract to PROJECT.md
(product semantics only; no implementation/CI/PR details). New head requires new coordinator
docs cycle before independent review.


## 2026-11-19 — Watch docs #349 re-review after WATCH-DOC-1: PASS

Exact head `aa6584c6d600d807ebed9171adbde365b918b290`, main
`34ddf42985f6dc348e77d0dcc90e0aecc37fd15e`.

Confirmed correction diff from prior reviewed head is only PROJECT.md (+17/-0).
Permanent Watch contract accurately reflects accepted/implemented semantics and contains
no SQL/CI/history details. Whole docs PR re-reviewed: PROJECT_STATE current facts/0069 ceiling,
history snapshot/index, Stage6 evidence through 0020 and deferred owner visual boundaries all
remain correct.

Exact docs CI 2/2 success; main unchanged. Coordinator PASS, current-doc defects 0.
Next independent reviewer: Lev on same exact head; no changes allowed before his result.


## 2026-11-19 — Watch docs #349 synthesis / merge readiness

Сопоставлен independent PASS Лёвы с моим coordinator PASS на одном exact head
`aa6584c6d600d807ebed9171adbde365b918b290`.

Лёва independently полностью прочитал все 4 changed docs, сверил code-backed Watch facts,
migration 0068/0069 ceiling, #345 merge metadata, 17/17 implementation checks, exact docs
CI 2/2, links/whitespace и Stage6/visual boundaries. Его выводы совпадают с моими
независимыми проверками.

Confirmed current-doc defects = 0; review cycle завершён. #349 переведён из Draft в
Ready for review и готов к merge владельцем. После фактического merge следующий
bounded docs этап — Bookmarks closeout Лиры.


## 2026-11-19 — #349 merged; Bookmarks docs activated

Verified #349 merged=true at 2026-11-19T07:43:44Z. Reviewed head aa6584c6... merged
as current main `405ab97116c5be750fb9c1d447431988802bdbb5`.

Fully re-read current main AGENTS.md, PROJECT.md and PROJECT_STATE.md. Watch docs closeout
is now factual main state. PROJECT_STATE has migration ceiling 0069 and Watch feature, but
does not yet describe Bookmarks functionality; PROJECT.md has Watch permanent contract but
no Bookmarks permanent contract.

Per accepted #342 sequence, next bounded task is Lira-authored Bookmarks docs closeout.
Required layering: permanent semantics in permanent SOT, concise factual current state in
PROJECT_STATE, implementation/review/CI snapshot in PROJECT_HISTORY + index. No code/schema/
runtime/RBAC/Admin/Stage6 external/visual claims. After stable docs head, coordinator review by Mira.


## 2026-11-19 — Bookmarks docs #350 coordinator review: PASS

Reviewed stable exact head `446e4cc893160efc30392bfa43f03f5882823021` against main
`405ab97116c5be750fb9c1d447431988802bdbb5`.

Whole docs scope = 4 Markdown files. Permanent Bookmarks semantics in PROJECT.md,
concise factual status in PROJECT_STATE, historical #346 evidence/corrections in
PROJECT_HISTORY_31 + index. Independently matched writer/list/action/view with docs:
own actor, active admission, idempotent Add, private/no-store list, keyset 50+1 ordering,
current projection, account-switch correction and Watch/read/inbox independence.

Verified #346 final reviewed head/merge metadata, 18/18 implementation jobs success;
#350 exact docs CI 2/2 success. No Stage6/deployed/owner visual overclaim.
PROJECT_STATE date line not classified as defect because documented state dates to 2026-11-18
and no project contract binds it to docs PR calendar date.

Coordinator PASS, current-doc defects 0. Next: Lev independent docs review same exact head.


## 2026-11-19 — correction: no Lev review for docs #350

Owner corrected my workflow extension: Lev is not needed for docs review.
I had mechanically extended implementation PR review rules to a docs-only PR.

Current AGENTS.md review section explicitly scopes coordinator → independent review to
implementation PRs. #350 is docs-only, authored by Lira; my completed whole-PR docs review
PASS + applicable CI is sufficient for merge readiness. Previous “Next: Lev independent docs
review” line is superseded.


## 2026-11-19 — #350 merged; Mute/block implementation activated

Verified #350 merged=true at 2026-11-19T08:01:56Z. Current main is
`9eae385571bf99e073df46f8541f7514c9626a29`.

Re-read current PROJECT.md, PROJECT_STATE.md, AUTHORIZATION.md and COMPLAINTS.md and
rechecked accepted Mute/block plan. No open Mute/block implementation PR exists.

Owner already accepted M1/M2 exactly as recommended; M3/M4/M6 are therefore final.
No new product decision is needed before implementation. Lira is the standard implementer.
Handoff requires one separate implementation PR from current main, full accepted M1–M7 scope,
real-PG/connected-browser evidence and stable exact head, then coordinator review by Mira.


## 2026-11-19 — 4a.8 SA07 diagnosis

Investigated failed SA07 on #351 exact `83b32eb364d74a2fd85377dbc907f7723254edf4`.

Failure was a private Integrations .data request returning classified 503 after ~8.25s
at sa07/check.py:380. No Mute/block production code changed since the prior fully-green
`a2b077fd...`; only new PG concurrency tests plus Watch test rejection timing changed.

Same SA07 workflow/job path reran on the same exact implementation head and passed without
code changes (new job 135564876373). Current exact-head workflows are 19/19 success.

Conclusion: transient SA07/PostgreSQL availability timeout, not a confirmed current-scope
product defect. No production or test workaround warranted. 4a.8 complete.


## 2026-11-19 — 4a.9 closed immediately

Corrected my own routing mistake: 4a.9 was service evidence/handoff, not a developer-gated
implementation step. Closed it myself after SA07 diagnosis.

4a complete on implementation head 83b32eb... with PG17 1476/1476, targeted 27/27,
same-head SA07 success, and total current workflows 19/19 success. No confirmed current-scope
regression remains from 4a.

Next: Lira runs only 4b dedicated connected Mute/block acceptance in #351, then STOP.

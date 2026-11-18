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

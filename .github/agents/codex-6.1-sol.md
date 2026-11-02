# Лёва — Codex-6.1 Sol

## Роль

Главный архитектор и технический руководитель Complaints: планирует техническую реализацию bounded-этапов и после coordinator PASS проверяет реализацию. Сам реализует только при технической эскалации.

## Важный подтверждённый контекст

- Лёва реализовал Packages 1–3 и интеграцию Package 3 с AP-05.
- Принятая migration chain после интеграции: AP-05 `0051_forum_admin_history`, Complaints `0052_complaints_queue` и `0053_complaint_priority_settings`.
- Package 3 сохраняет Queue/triage, configurable reason priorities, manual override и non-exclusive expiring reviewer activity.
- Packages 4–5 merged; shared Admin Quick actions и complaint Decisions остаются отдельными доменами.
- Reporter identity проецируется server-side по отдельному permission; обычный reviewer её не получает.
- Packages 1–5 merged; текущий bounded scope — технический план Package 6 (Appeals), без реализации.

## Текущий этап

Технический план Package 6 подготовлен против main `284bee3f5f0899cce1dc751cf4e9ef169739a120` по назначению Миры #6589373781. Полный план ниже в разделе «Технический план Package 6 — Appeals». Следующий шаг — Мира проверяет соответствие scope и назначает Лире отдельную реализацию. Implementation PR отсутствует; application/schema/production не менялись.

Package 5 завершён: PR #277 merged в указанный main после coordinator и independent technical PASS. Результаты предыдущих этапов ниже сохраняются как история.


## Технический план Package 4 — Case review, notes, initial Decision

Дата: 2026-11-02. Планировщик: Лёва. Основание: назначение [#6576268950](https://github.com/iliya1947/vico-forum/pull/254#issuecomment-6576268950), утверждённый COMPLAINTS_IMPLEMENTATION_PLAN.md и актуальный main `ddffcb97b3864aea3e70f327627441682efd4f1d`.

Это план последующей реализации Лирой. Код и implementation PR на этом этапе не создаются. Старая локальная работа Лёвы не опубликована и не является baseline или результатом Package 4.

### 1. Проверенный baseline и scope

В main реализованы Packages 1–3, AP-05 shared topic Quick actions, domain-команды addNote/decide и immutable evidence retention. PROJECT_STATE.md прямо оставляет full review/notes/Decision UI незавершёнными. Сравнение main с P3 merge `90dfa11`: четыре последующих коммита меняют регламент/документацию, application/schema code не меняют. Следовательно, повторная интеграция старой схемы после AP-05 не нужна: repository chain уже 0000–0053.

Scope: самодостаточный защищённый Case с исходной reported revision, текущим контентом, topic context, всеми Complaints через pagination, приватными заметками, одним initial Decision и доступными shared Quick actions. History list/timeline, participant result UI, уведомления, appeals workflow, новые административные операции и Stage 6 исключены. Показ сохранённого initial Decision непосредственно в Case нужен для завершения review и не вводит Package 5 History.

Новых таблиц, migration или permissions по установленным требованиям не требуется. Если реализация выявит конкретную нехватку, сначала подтвердить её, затем согласовать изменение технического плана; не переписывать accepted migrations.

### 2. Модули и границы

| Граница | Изменение |
| --- | --- |
| app/complaints/review-contract.ts, review-context.ts (новые) | Узкие типизированные DTO и Worker capability: full review, bounded context expansion, private evidence metadata, addNote, decide. Не расширять submission capability до общего доступа. |
| db/complaints-service.ts | Fresh authorization для каждой операции; review/identity и необходимые shared presentation permissions из одного consistent effective-permission snapshot. Доверенный actor только из session. Существующие addNote/decide остаются авторитетными. |
| db/complaints-repository.ts + выделенный complaint-review-read.ts | Отдельная read-only repeatable-read projection; использовать existing schema/locks/commands. Не отдавать foundation readCase целиком: он также читает events/appeals и внутренние поля. |
| db/hyperdrive-complaint-review.ts (новый) | Переиспользовать lifecycle/error-classification P3: fresh web client на операцию, discard в finally, fail closed на известном transport/deadline. Без второй authorization модели. |
| app/complaints/review.server.ts, review presentation/view | Session/origin/form-size/status handling, DTO serialization, локализованная protected presentation. |
| app/routes.ts и protected review/context/evidence routes | Full Case loader/action, только принадлежащий Case context, evidence download. Queue entry и protected predecessor link открывают full review. |
| workers/app.ts | Request-scoped capability wiring для local/Hyperdrive, существующий private bucket access. |
| app/admin/quick-actions.tsx и app/forum/actions.server.ts | Минимальная общая адаптация shared presentation и inline response для канонических операций; никаких complaint admin mutations. |
| tests, localization, docs | Соответствующие native/route/browser проверки; EN/RU/HE; профильные контракты и фактический PROJECT_STATE в implementation PR. |

Предлагаемый URL full review: `/:locale/attention/complaints/:caseId/review`. Существующий open-only triage `.../:caseId` можно сохранить с переходом в full review; Queue должна открывать полный review без обязательного промежуточного шага. Новый route не конфликтует с `settings`. Full review доступен и после resolution для просмотра результата/notes и перехода по previousCaseId; это не новый список History.

Подресурсы: `.../:caseId/context/:postId` (защищённое разворачивание полного source сообщения внутри Case) и `.../:caseId/evidence/:attachmentId` (защищённое скачивание). Названия файлов допускают адаптацию к conventions проекта; границы и гарантии обязательны.

### 3. Authorization и приватность

- Каждый full/context/evidence GET и Case POST самостоятельно требует session + текущий `forum.complaint.review`. Header/navigation/скрытые поля не authority. `create`, `priority.manage`, `appeal.review`, Signals/Security/admin permissions по отдельности не открывают этот review surface.
- `forum.complaint.reporterIdentity.read` — только дополнительная projection при уже разрешённом review; identity-only actor не получает Case.
- Review и identity deriving выполняются из одной authorization resolution. Обычная SQL-ветка вообще не выбирает reporter user id/name/email и не JOIN reporter account. Elevated ветка отдаёт только согласованные id/name, без email. Проверять HTML, loader/data и вложенные resource responses, а не только видимость UI.
- Автор контента и автор заметки не являются конфиденциальным reporter projection. Note содержит author id/display name и DB time; не нужен email. Причины/пояснения сохраняются как пользовательский текст, включая добровольно указанное в них имя.
- Admin Quick actions требуют собственных текущих permissions и состояния объекта. Review permission не открывает admin shell и не даёт права выполнять admin операции.
- Приватный pending Help-duplicate appeal id можно читать/передавать только при отдельном `forum.helpDuplicate.manage`, проверенном в том же consistent authorization snapshot, что остальные review permissions. SQL для обычного reviewer не читает эти private appeal fields. Relationship и pending appeal должны быть согласованы в одном content read snapshot. Это интеграция существующего Help action, не Complaints Appeals.
- Все document/data/action/context/evidence ответы, включая ошибки, `private, no-store`. Не передавать storage object keys, operation fingerprints, внутренние event actor/operation IDs, сырые DB errors. Не загружать Complaints данные через публичный topic loader.
- Сохранить разные 400/401/403/404/409/503; известные availability failures не превращать в пустой Case или запрет. Unexpected errors сохраняют штатный error path.

### 4. Read model, evidence и topic context

Один bounded read-only repeatable-read transaction возвращает:
1. Case id, state/version, kind, topic/post identity, previousCaseId; priority summary из текущих P3 settings/override.
2. Reported immutable revision id, полный original source, source locale и доступное время revision; отдельно current revision id/full original source/source locale и текущее состояние цели/темы. Evidence выбирается по сохранённым target revision FKs, никогда по UI locale, переводу или current pointer. Post и topic-title, включая первый post, остаются разными целями.
3. Reports: id/reason/explanation/time и только разрешённую reporter projection. Порядок createdAt,id. Отдельная pagination 50 + lookahead; независимый total по всем reports/reporter count, а не длина страницы. Все жалобы должны быть достижимы, не только первые 50.
4. Notes: id/body/author/time, стабильный createdAt,id, независимая pagination 50 + lookahead и total. Initial Decision: id/outcome/reasoning/time, если сохранён. Не сериализовать events/appeals foundation DTO ради отсутствующего History UI.
5. Evidence attachment metadata: безопасное имя, размер, тип, opaque asset id; bounded page 50 + lookahead, все страницы достижимы. Retained refs берутся по Case target, независимо от текущих public post refs.
6. Topic context: текущий заголовок и состояние темы, авторы/время/реальные permanent post numbers и bounded окно сообщений вокруг целевого post; для title — начало темы. Предлагаемый page size 25, excerpt до 1000 Unicode code points, явное усечение и доступ к полному тексту внутри Case. Дать переходы к остальным context pages. Нельзя подменять необходимый context ссылкой на публичную тему.

DTO отделяет reported evidence, current source и current surrounding context. Последний не выдаётся за исторический snapshot окружения. Page/query input валидировать и ограничить аналогично P3 (0–10000); empty/out-of-range pages сохраняют корректный total. Между requests возможны сдвиги из-за новых notes/reports, cross-request snapshot не обещать.

Context resource сначала проверяет review и принадлежность post именно теме целевого Case; подстановка чужого post/topic не даёт чтение. Source expansion происходит в protected Case UI. Original source можно показывать инертным текстом; не исполнять HTML и не инициировать remote media/third-party requests из evidence/notes/explanations. Source lang/dir берутся из LocaleRegistry с существующим fallback unknown/und → auto, независимо от языка UI.

Evidence download: после fresh review check проверить реальную сохранённую membership Case target + attachment. Только затем обращаться к существующему private bucket. Object key остаётся server-side. Чужой asset — 404; известная недоступность bucket — 503. Отдавать как attachment, безопасное Content-Disposition, octet-stream, nosniff, sandbox и private/no-store. Не встраивать активные HTML/SVG и не открывать публичный retained-only asset route. Публичные attachment access/cleanup semantics остаются прежними.

### 5. Notes и initial Decision

Case POST принимает строго один из двух intents и URL-encoded body с stream limit, достаточным для 10000 Unicode code points после percent-encoding (например 256 KiB); остальные форматы/поля валидировать. Same-origin защита такая же, как в P3. Case/actor не брать из доверяемых browser fields.

Note command: caseId из path, operationId, body. Автор и время назначаются сервером/БД. Existing addNote сохраняет append-only запись, увеличивает Case version и атомарно пишет lifecycle event. Сохранить существующую возможность заметки на resolved Case; не вводить молча open-only политику. UI не добавляет редактирование, удаление, chat/presence сообщений.

Decision command: caseId, operationId, expectedVersion, outcome `confirmed | not-confirmed`, обязательное reasoning. Оба текстовых поля используют existing service validation: trim, NUL reject, максимум 10000 Unicode code points; нельзя ограничить допустимый supplementary Unicode через JS UTF-16 maxLength. Reasoning явно обозначить как объяснение решения, отдельное от приватной заметки; participant delivery в этом пакете отсутствует.

Сохранять existing actor mutex → Case row lock, exact replay до stale/state check, fingerprint, atomic insert Decision + resolve Case + version/event. Same operation/same normalized payload возвращает прежний результат; changed payload conflicts. Concurrent Decisions: один успех, второй 409; new report/note/priority change инвалидирует reviewed version. Нет автоматических санкций, admin History events или notifications.

UI хранит operation nonce устойчиво через rerender/revalidation и ambiguous failures; повтор команды использует тот же nonce. После подтверждённого успеха разрешён новый nonce для нового действия. Не генерировать nonce заново на каждую retry и не хранить его только в DOM defaultValue. Note draft очищается только после matching successful acknowledgement.

Decision draft сохраняет reviewed expectedVersion до явного подтверждения пользователем обновлённого Case. При 409 показать конфликт, сохранить reasoning, дать перечитать изменения и явно принять новую reviewed version. Автоматическое обновление hidden expectedVersion после revalidation недопустимо: иначе решение о старом evidence/context может незаметно примениться к изменённому Case. После resolution показать сохранённый outcome/reasoning; повторное решение недоступно. Case уходит из open Queue, но защищённый review URL остаётся рабочим.

### 6. Shared Quick actions

Переиспользовать TopicQuickActions/descriptors и канонический `/:locale/topics/:topicId` handler. Доступны только реально реализованные AP-05 actions в подходящем объектном контексте. Hide/delete/block/topic closure не добавлять и не имитировать.

Текущий shared input требует ForumTopicPage и выводит номер ответа из позиции в полном массиве. Для bounded Case context выделить минимальный общий presentation input + явные кандидаты {id, permanentNumber}; отсутствие сообщения в текущем окне не должно менять его номер. Текущий best answer/state должны быть доступны независимо от того, попал ли post в окно. Не загружать весь topic неограниченно ради кнопок и не строить фиктивный ForumTopicPage.

Inline интеграция должна оставлять reviewer в Case. Разрешается минимальный общий opt-in transport в том же canonical topic action: для shared fetcher.Form вернуть private success data после успешной операции вместо redirect; обычные topic consumers сохраняют штатный redirect. Failed responses/status, same-origin checks, current authority, resource ownership/CAS и admin History остаются прежними. Не создавать Case proxy, альтернативные mutation functions или универсальное преобразование любых redirect/error в success.

Явный `operationScope=any` для admin действий сохранить. Any permission не заменяет отсутствующий Own в собственнических controls. После действия revalidate current state/context/shared controls внутри Case. Administrative action не подтверждает complaint и не закрывает Case; Decision не запускает action. Shared Help pending appeal доступен только по независимому permission из §3.

### 7. P1–3 и соседние домены

Сохранить revision grouping/previous links, lifetime duplicates, report budgets 10/10min и 50/day, immutable evidence и retained attachment cleanup fences. Full review predecessor link не изменяет и не reopen старый Case.

Сохранить priority weights/settings permission, override CAS/replay, актуальный max(reason weights), независимые totals и ordering Queue. Reuse activity heartbeat 30s/TTL 90s DB time; full review может продлевать тот же lease, без assignment, ownership lock или изменения Case version. Ошибка supplemental activity не блокирует чтение и review command.

Signals/Security, обычная admin navigation и History producers не получают новых полномочий/изменений. Appeals/History groups остаются placeholders. Existing future-domain storage/commands не выставлять новыми routes.

### 8. Проверки реализации

Это требования к будущей реализации, не сообщение о выполненных tests.

- Native PostgreSQL 17: обе target kinds/первый post, reported revision после edits/source-locale correction, current/context correctness, linked old/new Cases; >50 reports/notes/evidence и >25 context posts, totals/empty pages, стабильные номера, membership-negative context/evidence.
- Authorization: review-only, identity-only, review+identity, custom role и per-user allow/deny/inherit; grant/revoke между requests; ordinary SQL и payload без reporter identity. Отдельно review без Help-manage и последующий Help-manage grant/revoke: private pending appeal отсутствует/появляется строго по permission.
- Commands: обе Decision outcomes, append-only note author/time, resolved notes, unicode 10000/10001 и NUL; exact retry/changed retry, concurrent notes/Decisions, stale reviewed version после report/note/priority; event failure rollback, ambiguous commit retry. Нет sanctions/notifications/лишних History rows.
- Web/Hyperdrive: same-origin/session/current permissions для каждого resource и POST; invalid pages/body overflow/UTF-8 input; 401/403/404/409/503, classified timeout/transport и recovery с освобождением клиента. Проверить no-store для HTML/data/download и всех ошибок.
- Evidence: native retained membership после edit/public unlink, чужой asset отказ, bytes/headers через injected bucket, недоступный binding 503; прежний public route не получает retained-only access. Не утверждать real R2 acceptance без реальной проверки.
- Shared actions: общие descriptors/canonical handler, own/any разделение, actual current permissions/state/CAS, pending Help appeal privacy; admin operation пишет только свой существующий History и не решает Case; Case Decision не запускает admin mutation; обычные topic consumers сохраняют redirect.
- Real browser на работающем local Worker/DB: Queue → Case; длинные source/reports/notes, context pagination и inline expansion, оба outcomes, конфликт с сохранённым draft, retry nonce, shared action без ухода из Case, activity нескольких reviewers; privacy по network payload и отсутствие внешних media requests.
- EN/RU/HE, LTR/RTL, mobile 320px + desktop, keyboard/focus/labels/status/errors; проверять review-only и reviewer с admin controls. Применимые Pages/browser review и owner visual acceptance до whole-PR review.
- Repository checks: установленный CI (lint, typecheck, unit/route/native integration, production/preview/Worker builds, migration history/metadata/manifest/runtime ACL guards и local Hyperdrive smoke). Новые маршруты включить в route-shape tests; backend-imported app contracts — в соответствующий node typecheck scope. Если schema/ACL не меняются, проверками подтвердить это; внешние migration/GRANT не выполнять.
- Профильные docs описывают реализованный review/privacy/transport контракт; PROJECT_STATE фиксирует только завершённый фактический статус. Завершённые checkpoints при необходимости — в docs/PROJECT_HISTORY, без преждевременного PASS.

### 9. Порядок, готовность и handoff

Лире: начать отдельную ветку от актуального main, проверить delta относительно указанного SHA. Последовательность одного bounded implementation PR: DTO/read + permission boundary → protected routes/evidence/context → notes/Decision UI → shared Quick actions integration → regression/browser/checks/docs. Держать изменения внутри Package 4.

Готовность: reviewer полностью изучает Case внутри protected surface, достигает всех Complaints/evidence/context страниц, видит notes author/time, сохраняет один корректный initial Decision и остаётся в Case при shared admin actions; все negative privacy/auth/retry/concurrency checks проходят; P1–3/AP-05 сохранены; future packages не реализованы. Затем stable exact head + применимые CI/browser/visual evidence → handoff Мире в #254 для coordinator whole-PR review; только после coordinator PASS — technical review того же head по workflow. Лира не проводит независимую проверку собственной реализации.

**Подтверждённых product blockers для Package 4 по проверенному main нет.** Shared Quick actions dependency уже реализована. Отсутствующие hide/block и последующая appeal policy не блокируют этот пакет. Stage 6 paused: создание/оплата bucket и production rollout не входят в реализацию. Реальные неизвестные external acceptance не выдавать за выполненные проверки.

Ранее неопубликованный локальный кандидат Лёвы не использовать как main baseline или доказательство проверок новой реализации. Если решено переносить его implementation-код, это участие Лёвы в реализации нужно явно отразить и перед technical review согласовать с Мирой независимого reviewer.

**Следующий шаг: Лира реализует Package 4 по этому техническому плану; координация и eventual review — через #254.**



## Technical review PR #276 — 2026-11-02

- Exact head: `0de025e73fce521adc90d284980dc158c511c3d9`; main/base: `6b653e3ec202e649c3ed48ba442d9a5bf5c64d1f`.
- Вердикт: CHANGES REQUIRED. Один P2: после конкурентного resolution Decision POST получает 409, Router не перечитывает loader, кнопка acknowledge зависит от новой loader version, а activity получает 404 и прекращает обновления. UI остаётся открытым до полной перезагрузки, теряющей draft.
- Причинная цепочка, ограниченное исправление и regression criteria: [полный опубликованный результат](https://github.com/iliya1947/vico-forum/pull/254#issuecomment-6580997474).
- Самостоятельно повторены: 1722 application / 120 files, 452 PostgreSQL / 36 files, production Worker/client build — PASS. Дополнительный Router diagnostic и точечный actual Chromium/Worker/PG прогон подтверждают finding; owner visual acceptance/deployed R2 не заявляются.
- Implementation не менял; свои временные preview/DB/config остановлены/удалены. Локальные evidence сохранены в `/workspace/work/review276-evidence/`.
- Следующий шаг — Мира координирует bounded correction Лиры и новый coordinator review на новом stable head; затем technical review по workflow.


## Corrected-head technical review — 2026-11-02

- Head `12d94f308e25f579310b1cf18663697230c10354`, main `6b653e3ec202e649c3ed48ba442d9a5bf5c64d1f`: CHANGES REQUIRED, один current-scope P2.
- shouldRevalidate срабатывает; Framework targeted reread добавляет `_routes=routes/complaint-review`. Strict reviewPages отвергает служебный query и возвращает 400. Case заменяется error boundary, draft form исчезает. Воспроизведено для новой note и concurrent resolution; контроль без `_routes` даёт 200.
- Полный результат/исправление/handoff: https://github.com/iliya1947/vico-forum/pull/254#issuecomment-6581694833 .
- Diff относительно прежнего review head — только два заявленных файла; остальные 28 идентичны. Локальные focused tests 51/51 / 10 files и build PASS; current-head CI и tree parity независимо проверены API. Полный suite в этом pass не повторялся.
- Targeted actual Chromium/Worker/PG evidence: `/workspace/work/review276-corrected-evidence/`. Реализация не менялась; новый coordinator correction cycle через Миру.


## Final corrected-head technical review — 2026-11-02

- Head `7d64933d47c257267d1fa4c6aec63685e9d27344`, main `6b653e3ec202e649c3ed48ba442d9a5bf5c64d1f`: PASS, findings 0.
- Подтверждены actual targeted GET с `_routes` → 200 после Decision 409, draft/outcome/frozen version до explicit acknowledgement, новый nonce и успешный Decision; concurrent resolution сразу показывает сохранённый Decision без старой формы, reload и heartbeat wait.
- Локальные focused tests 113/113 (11 files), client/Worker build и diff check PASS; GitHub API подтверждает exact-head CI/jobs SUCCESS и tree parity. Полные suites в этом pass не повторялись; прошлые результаты не приписаны новому head.
- 27 других файлов идентичны fully-reviewed initial head; authorization/domain/SQL/shared action/schema/package boundaries не расширены. Implementation не менял, свои временные ресурсы остановил/удалил.
- Полный результат: https://github.com/iliya1947/vico-forum/pull/254#issuecomment-6582586583 ; evidence `/workspace/work/review276-final-evidence/`.
- Следующий шаг — Мира фиксирует coordinator closeout того же unchanged head; PR остаётся Draft, merge/production/Package 5 не выполняются этим verdict.


## Технический план Package 5 — History + notifications

Дата: 2026-11-02. Планировщик: Лёва. Основание: [назначение #6582883012](https://github.com/iliya1947/vico-forum/pull/254#issuecomment-6582883012), COMPLAINTS_IMPLEMENTATION_PLAN.md (§13 Package 5), AGENTS.md и актуальные профильные контракты. Проверенный main: **`1ad8a6402111928c0f08e6f15aba624ba18a4426`**, Package 4 merged через #276.

**Результат этапа — технический план для согласования Мирой и последующей реализации Лирой. Код, migration и implementation PR здесь не создаются.**

### 1. Установленный baseline

- Complaints P1–4 работают через ComplaintsService/DrizzleComplaintsRepository, private read DTO и request-scoped Hyperdrive capability. Initial Decision immutable, Case resolved, exact replay/CAS и событие сохраняются одной transaction.
- `forum_complaint_events` уже содержит submitted/noted/decided/appealed/appeal-resolved/priority-changed, typed entity FKs, private actor/operation/fingerprint, DB timestamps и index (case_id,created_at,id). Notes/reports/initial Decision immutable; Appeal argument immutable, один resolved result immutable. Это штатный источник complaint lifecycle, новая параллельная audit table не нужна.
- Priority event хранит выбранный override, включая null=Automatic. Исторические automatic weights/priority не сохраняются; текущий settings singleton не является историей.
- Review activity сейчас — только mutable lease (case,reviewer,expires_at), heartbeat 30s/TTL 90s. Исторические посещения и точные длительности не сохранены.
- Общая notifications surface — `/:locale/notifications`, NotificationsView, header unread badge. Штатная таблица `forum_reply_notifications` уже хранит reply/mention, recipient/read_at; producers находятся в forum transaction. Читать/открыть можно только свою строку. List ограничен 50, unread-first, count отдельный.
- Таблица сейчас требует actor/topic/post NOT NULL и unique(recipient,post), а kind CHECK разрешает только reply/mention. Complaint title result нельзя корректно записать туда без расширения schema; dummy post/actor недопустимы.
- `readOwnResult` уже проверяет affected_author или реального reporter по конкретному Case и возвращает только Case/Decision/outcome/public reasoning. User-facing result route ещё отсутствует.
- Admin History — отдельные admin_history/appendForumHistory, собственные permissions/transactions/order. Pin/Help/source-locale actions не являются complaint Decision или доказательством применённой санкции.
- Repository migrations 0000–0053; Stage 6 paused. Наличие local/CI возможностей не разрешает production rollout.

Основные источники кода: db/complaints-{service,repository}.ts, db/complaint-review-read.ts, db/schema.ts, db/forum-repository.ts (notification producers/read/count/mark), db/forum-history.ts, app/routes/{attention,notifications,locale-boundary}.tsx, app/forum/views.tsx, drizzle/{0047,0052} и .github/scripts/runtime-privileges.mjs.

### 2. Минимальный текущий scope

1. Complaints History group3 в Attention показывает resolved Cases и ссылки на их protected full Case/history.
2. Bounded readonly timeline показывает фактически сохранённый complaint lifecycle, включая уже persisted Appeal records, без нового appeal workflow.
3. Initial Decision создаёт уведомление всем своим реальным reporters и affected content author через существующий общий inbox, badge и read/open mechanism.
4. Participant открывает свой минимальный private result, не reviewer Case. История и participant result — разные server projections.
5. Shared administrative operations продолжают писать только существующий admin History; никакого копирования sanctions/actions в complaint timeline.

Исключены: Package 6 transitions/forms/appeal queue/appeal notifications, effective-outcome policy, external email/push, новый complaint inbox, общая event bus/outbox/Queue, Signals/Security changes, новые admin actions, production/Stage 6.

### 3. Матрица authority и DTO

| Surface | Authority | Разрешённая projection |
| --- | --- | --- |
| Resolved History list / Case timeline | Session + fresh forum.complaint.review | Case summary, complaint-domain lifecycle; только moderation data |
| Reporter/appellant identity в History | Review + отдельный forum.complaint.reporterIdentity.read из одного effective-permission snapshot | Дополнительные id/name; без email, session/account fields |
| Own notification list/count/open | Session recipient_user_id | Только уведомления этого recipient; browser userId/kind/redirect не authority |
| Participant result | Session + реальное affected_author/reporter membership конкретного Case | Initial outcome, public reasoning, decision time, только свои audience flags |
| Shared admin History/actions | Собственные существующие permissions и resource/state checks | Прежняя admin projection; complaint review её не открывает |

History SQL для обычного reviewer не JOIN reporter/appellant accounts и не выбирает скрытый actor submitted/appealed event как «автора события». Для noted/decided/priority-changed/review-started автор является moderator, и author/time можно показывать. Не раскрывать reporter через generic event.actor, data attributes, cursor, debug JSON или avatar.

Identity-only, priority-manager-only, appeal-review-only, Signals/Security/admin permissions не открывают reviewer History. Participant membership не требует сохранения complaint.create/review permission: пользователь должен иметь возможность прочитать уже относящийся к нему результат. Reviewer, не являющийся участником, использует protected Case, а не обход participant membership.

Participant DTO: caseId, decisionId, initial outcome, public reasoning, decidedAt; own reporter/affectedAuthor flags и честная availability апелляции. Не возвращать чужие reports/reasons/explanations, reporter list/count, notes, reviewer identity, event actor/operation/fingerprint, sanctions/admin events или evidence keys. При одновременном авторстве контента и собственной жалобе показываются только собственные роли; это не раскрывает других участников.

Все личные document/data/resource/action ответы и контролируемые ошибки — private, no-store. Session/permission/membership проверяются на каждом новом request, не по role-name или UI flag. Known availability errors → 503, не пустой inbox/History и не ложный 403; unexpected errors не маскировать.

### 4. History read model и UI

- `/:locale/attention?mode=complaints&group=group3`: только c.state=resolved, sort resolved_at DESC,id DESC; page 25 + lookahead, independent total по всем eligible resolved Cases. Reuse P3 pagination bounds/presentation patterns; Queue group1 не переписывать.
- Строка: Case id/kind, bounded immutable target/context excerpt с source locale, resolution time, initial outcome, independent reporter count и ссылка на existing full review. Не выдавать current reason weights за приоритет в прошлом.
- Отдельный protected `/:locale/attention/complaints/:caseId/history` либо эквивалентная bounded секция существующего Case view: timeline 50 + lookahead, own total и стабильный created_at,id. Membership событий — по Case; route требует resolved Case для данного History surface. Existing full review остаётся доступен open/resolved.
- Один read-only repeatable-read snapshot для Case header/count/page и условных identity joins. Все страницы достижимы; total на empty/out-of-range page не становится длиной страницы. Между requests snapshot не обещать.
- Timeline projection задаётся discriminated union, а не сериализацией raw event row:
  - submitted → report reason/explanation/time, reporter только при elevated projection;
  - priority-changed → сохранённый manual override или «Automatic restored», moderator/time;
  - noted → note body/author/time;
  - decided → immutable initial Decision/outcome/public reasoning/moderator/time;
  - review-started → зафиксированное начало activity lease, moderator/time;
  - appealed → сохранённые argument/ordinal/side/time, appellant только при elevated projection;
  - appeal-resolved → только фактически сохранённые result/reasoning/review time; не effective outcome.
- Submitted/appealed event не должен раскрывать private actor через общий author field. При join текущего Appeal не приписывать поздний result моменту appeal submission; это отдельный тип события.
- Reuse P4 text-only source rendering/registry direction/notes/details, full Case/evidence authorization. Не создавать второй mutation backend заметок или решений. Resolved notes по-прежнему разрешены и появляются в timeline; resolution time/index ordering от новых notes не меняются.
- Честно обозначить, что прежние automatic-priority values и activity до начала recording неизвестны. Никаких fabricated audit rows или «reviewed» по факту GET.
- Новые loader/query boundaries используют normalized React Router 8.3.1 `url.href`, а не raw Request.url с `_routes`/.data. Сохранить обе P4 conflict corrections и actual Framework regression coverage.

### 5. Минимальное сохранение review activity

Для requirement «сохранять/показывать review activity» одной текущей lease-строки недостаточно.

Предлагается **один новый kind review-started в существующем forum_complaint_events**:
- producer — только существующий authorized same-origin activity POST;
- append только при переходе inactive/expired → active; повторные heartbeat внутри действующего lease не создают событий;
- existing TTL renewal и append первого события выполняются одной DB transaction с атомарной сериализацией (case,reviewer) lease row/upsert; конкурирующие вкладки не создают два start event одного перехода;
- server-generated UUID operation key и fingerprint, не browser-selected event actor/kind; event сохраняет только Case/reviewer/start DB time, все entity FK/priority поля для этого kind null;
- это не assignment/lock, не «закончил проверку», не доказательство активной работы каждую секунду. Не выводить точную duration или end time по TTL; GET ничего не пишет;
- activity не увеличивает Case version; не нарушить actor→Case lock order остальных команд. Если добавляется actor mutex, он берётся до Case; никаких новых mutex после Case. Исторический event insert не должен вводить global admin-history lock;
- resolved Case отвергает renewal как прежде. Supplemental activity failure не блокирует разрешённый Case read/note/Decision.
- Старые lease rows **не backfill** в исторические события. UI сообщает начало coverage, а не реконструирует прошлое. Старые persisted notes/Decisions сами являются достоверными действиями.

Изменить event shape CHECK, typed kind/helper и tests только для нового kind, сохранив все прежние варианты/replay/immutability constraints.

### 6. Один общий inbox: persistence и штатные механизмы

Расширить существующую таблицу `forum_reply_notifications` новым typed kind `complaint-decision`, без второй notification table/inbox. Существующее имя таблицы можно оставить как legacy technical name; её переименование не требуется.

Минимальная forward schema:
- новый nullable complaint_decision_id FK → immutable forum_complaint_decisions.id (Case выводится по Decision, не дублируется неподтверждённым browser caseId);
- actor_user_id/topic_id/post_id допускают null для complaint-decision;
- строгий kind-specific CHECK:
  - reply/mention: actor/topic/post NOT NULL, complaint_decision_id NULL;
  - complaint-decision: complaint_decision_id NOT NULL, actor/topic/post NULL;
- существующие recipient FK, reply post/topic FK, unique(recipient,post), created/read indexes сохраняются;
- unique(recipient_user_id,complaint_decision_id) гарантирует одну result notification на initial Decision и recipient, включая dual-role recipient.
- Никаких dummy actor/post для title, serialized notes/reporters/sanctions в payload или null-unsafe actorName.trim() в общей presentation.

Выделить минимальный общий db/forum-notifications.ts helper/read contract, работающий с переданным tx; ForumRepository и ComplaintsRepository используют его без отдельной connection/COMMIT. Общая typed projection — reply | mention | complaint-decision. Existing reply/mention producers, arbitration/dedup/self-notification policy и read_at semantics сохраняются.

В existing Forum reader/writer + Hyperdrive adapter добавить generic readNotifications/countUnreadNotifications/openNotification; общий notifications route, view и header переходят на них. Legacy reply-named methods при сохранении должны фильтровать reply/mention **в SQL до LIMIT/count/update**, а не случайно возвращать complaint null-target rows или фильтровать уже обрезанную смешанную страницу.

Shared NotificationsView отображает complaint result системной карточкой без обязательного actor avatar/name. Общие list/header/open/read-state принадлежат одной поверхности. Допускается небольшое выделение union renderer из большого views.tsx, без общего UI rewrite.

Pagination общей ленты: сохранить unread-first, затем created_at DESC,id DESC; bounded page 50 + lookahead с independent matching total/unread count, page bounds как в P3. Обеспечить достижимость страниц read history и всех >50 unread, а не вырезать по 50 каждого kind и склеивать. После open/read строки могут менять позиции; cross-request стабильность не обещать.

### 7. Producer, recipients и transactional delivery

В existing decide transaction после проверки replay/open expectedVersion:
1. insert immutable Decision;
2. close Case + existing decided event;
3. insert result notification rows через тот же tx;
4. commit всего набора.

Recipients = UNION DISTINCT всех реальных reporters конкретного Case и target.affected_author_id. Не followers/все reviewers, не автор текущей revision вместо affected author. Пользователь одновременно author/reporter получает одну строку. Не применять reply-self suppression: даже reviewer, являющийся участником, сохраняет право на свой результат.

Fanout выполняется set-based INSERT SELECT с DB unique key, не отдельной connection/сетевым вызовом на каждого recipient. Не брать recipient actor mutex после Case lock. Ошибка event/notification persistence откатывает Decision/Case; exact retry возвращает записанный результат и не создаёт дублей/не сбрасывает read_at. Ambiguous commit retry использует тот же command nonce.

Никаких after-commit promises, фонового provider/Queue/outbox только ради in-app delivery: persisted строка в общем inbox уже является durable delivery для этого пакета.

Forward migration выполняет идемпотентный backfill notification rows для уже persisted initial Decisions P1–4, тем же правилом recipients/dedup. created_at соответствует реальному decision time; existing rows/read state не перезаписывать. Это не создание новых Decisions или повторная санкция. GET не делает backfill. При будущей реальной deployment/migration integration учесть старые producers в rollout window; external acceptance остаётся отдельным Stage 6, не выполняется этим PR.

### 8. Open/read-state и participant result

- Existing `POST /:locale/notifications`, intent=open, notificationId: session + same-origin, bounded URL-encoded input и duplicate/id validation. Kind, recipient и redirect target определяются по принадлежащей actor DB row; не принимать browser targetURL/kind/userId как authority.
- read_at устанавливается idempotently coalesce(read_at,DB time), только для своей строки. Чужая/несуществующая строка → 404, без раскрытия чужого kind/Case.
- reply/mention возвращают прежний topic#post redirect.
- complaint-decision открывает `/:locale/complaints/:caseId/result` (session-only membership route, не attention/reviewer shell). Membership результата recheck при open и при самом GET.
- Новый route переиспользует/узко расширяет readOwnResult: persisted initial Decision + own reporter/affected-author membership в одном consistent read, safe minimal DTO из §3. Ни presence в inbox, ни угадываемый caseId сами по себе не дают доступ.
- Participant result показывает initial confirmed/not-confirmed, public reasoning и время; безопасный plain text без remote media. Самим форме Decision в P4 добавить ясную подсказку, что reasoning виден обеим относящимся к делу сторонам, private note остаётся отдельно.
- Header unread count охватывает все видимые своему recipient kinds и не зависит от LIMIT текущей страницы. Известный outage на странице → 503; optional header сохраняет штатное unavailable/undefined поведение, не выдумывает 0.

### 9. Appeals и административные меры: граница текущего пакета

**Readonly Appeal history сейчас:** уже persisted foundation records/events отображаются в reviewer timeline с прежней identity projection. Initial Decision не изменяется; stored upheld/overturned показывается как отдельный результат конкретного Appeal, не как рассчитанное effective outcome. Для чтения reviewer Case history используется forum.complaint.review; это не право разрешать Appeal. Никаких новых appeal submit/resolve POST routes, queue/group2, ordinal transition rules, reviewer reassignment или quota-reset policy.

**Participant appeal entry сейчас:** result DTO/страница явно сообщает, что подача апелляций пока недоступна до Package 6. Можно показать направление, предусмотренное initial Decision (affected author для confirmed; own reporter для not-confirmed), но это не promise реальной eligibility после уже существующих appeals и не active submit control. Не вычислять remaining attempts/effective outcome и не давать фальшивый рабочий URL. Общую доступную поверхность submit/appeal notifications подключает Package 6. Это scoped трактовка «доступного пути апелляции» для согласования Мирой: пока working path отсутствует, UI честно отражает отсутствие доступности.

**Notifications сейчас:** только initial Decision result. Existing appeal storage остаётся пригодным для readonly History; notification producers для последующих Appeal transitions/их policy принадлежат Package 6. Сохранённые appeal records не удаляются и не переинтерпретируются.

**Общее сообщение о мерах:** не выводить «меры приняты» из confirmed, количества жалоб, pin/Help action или похожего admin_history по времени/topic. В main нет authoritative Case→санкция relationship и самих hide/block операций. В минимальном Package 5 такое необоснованное сообщение отсутствует; также не утверждать «мер не было». Administrative detail/History не проецируются participant. Когда появится реально применимая утверждённая операция и достоверный факт связи, общий текст должен исходить из её домена; создавать boolean/manual sanction backend здесь не нужно.

Таким образом future-only appeal policy/новые санкции не становятся blocker P5. Эти две staged presentation границы должны быть явно приняты координатором перед назначением реализации; если требуется уже сейчас рабочая подача Appeal или утверждение о конкретной мере, это явное изменение Package 5 scope, а не скрытая реализация.

### 10. Модули и migration

| Модуль | Работа |
| --- | --- |
| app/complaints/history-contract/context + db/complaint-history-read.ts | Resolved list/timeline DTO, bounded read snapshot, identity-scoped joins |
| db/complaints-service/repository.ts | Fresh History authority, participant result, atomic result producer, review-start event producer |
| db/forum-notifications.ts, db/forum-repository.ts | Минимальная shared notification projection/producer/open/count, прежние reply/mention contracts |
| db/hyperdrive-complaint-history/result + hyperdrive-forum.ts | Existing fresh-client/deadline/classified-error/discard lifecycle, request-scoped wiring |
| app/routes/attention.tsx + AttentionCenterView | Реальный Complaints group3, independent page totals; group1/Signals/Security без rewrite |
| protected Case History route/view; participant result route | Разные read authority/DTO; P4 components reuse, normalized URL handling |
| app/routes/notifications.tsx, NotificationsView, locale-boundary/header | Одна typed общая лента, общий open/read/unread, безопасные system cards |
| workers/app.ts, app/routes.ts, tsconfig.node.json | Capability/routes/typecheck admission, без новых permissions |
| db/schema.ts, forward drizzle migration, metadata/snapshot/manifest/probes | Extension notification kinds/FK/checks, event review-started, resolved history index/backfill |
| localization + профильные docs/PROJECT_STATE | EN/RU/HE/RTL, фактический P5 после реализации |

Migration **реально необходима** из-за notification shape и отсутствующего durable review activity event kind. Ожидается одна forward migration после 0053 (номер проверить от actual main при старте реализации): новые columns/checks/indexes, notification backfill. Для resolved list добавить индекс по resolved_at/id с resolved predicate, если существующий state/created index не покрывает выбранный access path. Event case/time index уже есть.

Новые таблицы и permission keys не нужны. Runtime SELECT/INSERT/UPDATE для notifications и INSERT/SELECT для complaint events уже есть; не расширять web role до owner/DELETE/DDL. Обновить структурный manifest/Drizzle journal+snapshot и regression/provisioning probes для новой формы; accepted 0000–0053 не менять. Внешние migrations/GRANT не выполнять.

### 11. Проверки и критерии готовности

Это требования будущей реализации, а не утверждение о запущенных tests.

- PG17 migration: clean 0000→new и upgrade с заполненным P1–4 state; старые reply/mention данные/read_at/FKs/uniques сохранены; новые shape CHECK/FK/dedup, идемпотентный backfill и dual-role recipient.
- Decision concurrency/replay/rollback: одновременно два resolutions, same/changed nonce, ambiguous success retry, fanout failure rollback, сохранённый read_at после retry; все recipients конкретного Case и только они, title/первый post/affected author vs revision editor.
- Notification regressions: reply/mention generation и arbitration без изменений, >50 mixed unread/read, total/badge не усечён, все pages достижимы, чужой notification ID 404, idempotent own-open и корректный kind redirect.
- Result privacy: guest/outsider/identity-only/reviewer nonparticipant не обходят membership; участник после отзыва create/review всё ещё читает свой initial result; никакой reporter list/count/notes/admin details в HTML, loader/data, badge или redirect.
- History privacy: review revoke/custom role/allow-deny-inherit; ordinary vs elevated identity SQL и payload, submitted/appealed actor leak отрицательные проверки; forged event/Case/Appeal membership; appeals readonly, initial outcome не переписан.
- History bounds: >25 resolved Cases, >50 events каждого применимого рода, empty/out-of-range totals, deterministic order, notes после resolution, previousCase links; current settings не выдаются за историческую automatic priority.
- Activity: первый active lease → один event, concurrent duplicate heartbeat → не два, renew → без event, expire/release → следующий start, no Case version bump, DB time/TTL и non-exclusive behavior сохранены, event failure rollback; прошлые leases не превращены в fabricated history.
- Web/Framework: actual normalized URL (включая .data?_routes=...), unknown/duplicate pagination 400, private/no-store на success/errors, same-origin/form limits, 401/403/404/409/503/transport deadline recovery, освобождение client.
- Targeted built Worker + Chromium/PG verification конкретно новой цепочки: report → Decision → mixed notifications/badge → open/read → own result; unrelated denied; History timeline; обе P4 Decision 409 branches продолжают работать. Не ограничиваться memory-router mock loader. Owner visual acceptance — только по отдельному запросу.
- EN/RU/HE/LTR/RTL, 320px/desktop, keyboard/focus/labels/unread status, inert free text/no unsolicited external media; не заявлять real email/provider/production/R2 acceptance.
- Обычный repository CI: lint/typecheck/unit/route/native DB/build/UI preview/Worker smoke; migration history/metadata/schema parity/full manifest/runtime privilege/provisioning checks. Профильные contracts обновляются с реализацией; PROJECT_STATE — только фактически завершённое состояние, история checkpoints — в docs/PROJECT_HISTORY.

Готово, когда reviewer достигает всех resolved Cases и их фактического lifecycle, reporters/affected author получают deduplicated private initial results в единой общей ленте, own-open/read/count и privacy работают, P1–4 и reply/mention не регрессировали, appeals не превратились в Package 6, applicable exact-head checks и coordinator/independent review завершены.

### 12. Handoff и вопросы

Подтверждённых технических/product blockers для bounded Package 5 не обнаружено. Реальные отсутствующие элементы main (shared notification shape для Decision и durable review-start event) закрываются описанной forward schema extension, а не отдельным inbox/audit subsystem. Нет зависимости от production/provider provisioning.

**Мире:** согласовать план, включая staged отсутствие active Appeal entry и неподтверждённого сообщения о мерах (§9), затем назначить Лире реализацию одним bounded implementation PR от актуального main. Лире перед стартом проверить delta/номер migration; выполнение: schema/shared notifications + atomic producer → History/result projections → shared UI/routes → native/HTTP/browser regressions/docs/checks → stable head handoff Мире. После coordinator PASS — независимый technical review того же exact head.

До согласования плана Лёва реализацию не начинает; Package 6+ и Stage 6 не выполняются.



## Package 5 technical whole-PR review — 2026-11-02

- Exact head `1af1c6272bf7b46009145488b52a42f89bfd0b2f`, main `1ad8a6402111928c0f08e6f15aba624ba18a4426`: CHANGES REQUIRED.
- P2: positive timeline pages отвергаются regexp в complaint-history route; actual Next page=1 даёт 400 при 58 events, native page1 содержит 8 records.
- P2: avatar-less Decision card на desktop оставляет copy в 52px avatar column; видимый label «C…». Browser-only explicit-column control восстанавливает ширину >1032px.
- P3: persisted Appeal outcome выводится raw upheld/overturned вместо localized labels.
- P3: согласованная P5 strict POST boundary не выполнена: duplicates/unknown fields и >65KiB body принимаются. Ownership сохраняется, auth bypass не заявляется; tolerant parser существовал раньше, scope — согласованное требование P5.
- Native upgrade/backfill/dual-role dedup/idempotence, concurrent activity и fanout failure rollback PASS; actual participant/identity grant/revoke boundaries PASS.
- Full local suites: 1735+1 timeout / 454+1 timeout, соответствующие isolated files 14/14 и 12/12 PASS; причины initial timing failures окончательно не установлены. Build/diff PASS, exact-head CI/jobs/tree parity независимо проверены. Implementation чист; свои временные ресурсы остановлены/удалены.
- Полный опубликованный результат: https://github.com/iliya1947/vico-forum/pull/254#issuecomment-6586050672 ; evidence `/workspace/work/review277-evidence/`.


## Package 5 corrected-head technical review — 2026-11-02

- Head `96bb5e82dc7ff7df9e57ce08c182f5c8c49d38fe`, current main `fb35519fec2520617e0db5c81837782a740e7613`: PASS, findings 0. Main delta от исходного base — только AGENTS, новый регламент применён.
- Actual Worker/Chromium/PG: Next page1 после 50 events → 200/последние 8, desktop label/copy широкие и читаемые, mixed legacy/system layout+redirect, оба readonly Appeal outcomes EN/RU/HE, строгий invalid POST → 400/private-no-store без изменения read state, valid own open →302. Identity grant/revoke и participant boundaries сохранены.
- Локальные tests 124/124 (15 files), build/diff PASS; exact-head CI/jobs независимо проверены API. DB/migration/fanout/activity код идентичен прежнему fully-reviewed head; native/full suites в этом correction pass повторно не запускались и не заявляются.
- Полный результат: https://github.com/iliya1947/vico-forum/pull/254#issuecomment-6587539354 ; evidence `/workspace/work/review277-corrected-evidence/`.
- Implementation чист; свои temporary preview/PG/symlink остановлены/удалены. Следующий шаг — Мира фиксирует coordinator closeout того же unchanged head и дальнейший маршрут владельцу.

## Технический план Package 6 — Appeals

Основание: [назначение Миры #6589373781](https://github.com/iliya1947/vico-forum/pull/254#issuecomment-6589373781) и утверждённый Appeals scope служебного плана. Проверенный main: 284bee3f5f0899cce1dc751cf4e9ef169739a120, Packages 1–5 merged, migrations 0000–0054. Автор: Лёва.

Это план для отдельного implementation assignment Лире после проверки Мирой. Application/schema не изменены, implementation PR не создан; execution/CI нового поведения не заявляются. Проверены текущие repository/service/schema, P4 read model, Attention/header, P5 notification/result surfaces и профильные контракты.

### 1. Scope и foundation

Package 6 завершает participant submission/result, pending Appeals queue (Complaints group2), reviewer workflow, текущий effective outcome и уведомления о результате каждой Appeal. Initial Decision остаётся immutable, resolved Case не переоткрывается.

Уже существуют Appeal persistence, argument/side/ordinal1..3, pending→resolved с upheld/overturned и reasoning, composite Case/Decision FK, UNIQUE Decision+ordinal, events/fingerprint replay, actor→Case locks, participant-direction check первой Appeal, отдельное forum.complaint.appeal.review, conditional identity и readonly Appeal History. Новые таблицы или permissions не нужны.

Конкретные пробелы main:
- repository.appeal после первой записи выбрасывает ComplaintPolicyRequiredError и смотрит только initial outcome;
- нет unique-pending ограничения, effective-outcome projection и Appeal-result fanout;
- resolveAppeal уже имеет pending-status CAS, но не уведомляет участников;
- group2 placeholder; Attention/header не допускают appeal-only reviewer;
- P4 context/evidence routes требуют complaint.review, participant result показывает только initial Decision;
- общий inbox знает reply/mention/complaint-decision; recipient+Decision unique не годится для каждого отдельного Appeal result.

Не входят Package7 closeout, новая anti-abuse/quota policy, withdrawal/edit Appeal, автоматические санкции/их отмена, новый assignment/presence, Admin/Signals/Security features и production actions. Shared Quick actions остаются самостоятельными каноническими операциями.

### 2. Единая policy и текущий итог

Добавить небольшой domain reducer, например db/complaint-appeal-policy.ts. Вход — initial binary outcome и максимум три Appeal по ordinal. Не хранить вторую mutable effective_outcome колонку.

| Текущий итог | Appeal result | Новый итог | Следующая eligible side при свободном слоте |
| --- | --- | --- | --- |
| confirmed | upheld | confirmed | author |
| confirmed | overturned | not-confirmed | reporter |
| not-confirmed | upheld | not-confirmed | reporter |
| not-confirmed | overturned | confirmed | author |

Начать с initial outcome, последовательно применить только resolved результаты; pending итог не меняет. Вторая/третья overturned переворачивает предшествующий текущий итог, а не всегда original Decision. UI однозначно называет upheld «сохранить текущий итог», overturned «изменить текущий итог».

Used = все принятые Appeal этого initial Decision, включая pending; remaining=3−used. Новая подача разрешена только при resolved Case, отсутствии pending, used<3 и actual membership проигравшей стороны: confirmed→affected author, not-confirmed→любой реальный reporter именно этого Case. Повтор того же reporter разрешён. Для dual-role actor side выводится из текущего итога. Browser не определяет side, ordinal, outcome или identity.

Существующий readOwnResult.outcome сохраняет значение initial outcome. Добавить явно effectiveOutcome, used/remaining, pending summary и собственную eligibility/reason. Если History/review показывают текущий итог, подписывать его отдельно от initial outcome; initial labels не менять молча. Общий bounded reducer использовать в read/command paths; эквивалентную SQL queue projection проверить против него на всех цепочках ≤3.

### 3. Транзакции, replay и concurrency

Сохранить payload и канонический порядок нормализованных fingerprint fields существующих команд:
- appeal: caseId, decisionId, operationId, argument;
- resolveAppeal: caseId, appealId, operationId, outcome, reasoning.

Не добавлять side/ordinal/permissions из браузера. Existing successful replay должен оставаться валидным после upgrade.

Submission:
1. actor FOR NO KEY UPDATE → Case FOR UPDATE, как foundation.
2. Exact replay до quota/state/eligibility проверок: прежний ID даже после изменения eligible side; тот же nonce с другим payload — conflict.
3. Проверить resolved Case и его initialDecisionId=input.decisionId; прочитать initial Decision, affected author и ≤3 Appeal этого Decision в той же transaction. Все mutations сериализуются тем же Case lock.
4. Server membership/policy из п.2. Pending/quota/stale Decision→409, неверное участие/направление→403, без disclosure чужой истории в ошибках.
5. Ordinal=max+1, insert с DB time + appealed event атомарно. Replay/rejected command не тратят слот и не создают event.

Resolution:
1. Fresh appeal.review, actor→Case lock, exact replay до state check.
2. Проверить Appeal↔Case↔immutable initial Decision ownership. Только конкретная pending запись может стать resolved.
3. Pending-status CAS сохраняет result/reasoning/reviewer/DB resolved_at.
4. Append appeal-resolved event + все result notifications в той же transaction. Любой сбой откатывает result/event/fanout целиком.

Новый expectedVersion или изменение Case.version для Appeal-команд не нужны: argument, initial Decision и предыдущие results immutable; единственная pending запись + explicit Appeal ID/status под Case lock дают необходимый CAS. Notes не меняют eligibility. Existing P4 Decision expectedVersion остаётся прежним. Старая форма не может resolve следующую Appeal: другой ID. После409 сохранить draft, перечитать состояние, не переносить решение автоматически на новую pending запись.

Один Case lock сериализует submissions разных reporters, submit/resolve race и concurrent resolves; partial unique/ordinal — последняя DB-защита. Сохранить lock order actor→Case, не добавлять обратный порядок. Unknown commit failure повторяется с тем же nonce/payload, новый nonce только для подтверждённо нового действия.

### 4. Forward migration и upgrade

Новая migration после0054 (0055, если main не изменился), синхронно schema/journal/snapshot/manifest:
- partial UNIQUE на forum_complaint_appeals(decision_id) WHERE status='pending';
- nullable complaint_appeal_id в существующей forum_reply_notifications, RESTRICT FK к Appeal;
- kind complaint-appeal-result;
- UNIQUE(recipient_user_id,complaint_appeal_id);
- строгий shape CHECK: reply/mention имеют actor/topic/post и оба complaint FK NULL; complaint-decision — только Decision FK; complaint-appeal-result — только Appeal FK. Без фиктивных actor/topic/post и заполнения обоих complaint FK;
- idempotent backfill уже resolved foundation Appeals всем фактическим участникам, created_at=original resolved_at; ON CONFLICT DO NOTHING сохраняет read_at.

Сохранить ordinal CHECK1..3, UNIQUE Decision+ordinal и ownership FK. Existing pending(status,created_at,id) index пригоден для queue; дополнительные индексы только под подтверждённую потребность запроса. Accepted migrations не переписывать. Обновить runtime privilege/manifest contracts по фактическому SQL, без DDL для web role и external GRANTs.

Upgrade fixtures: no Appeal, first pending, first resolved upheld/overturned. До unique index проверить отсутствие двух pending; policy-read не принимает повреждённую последовательность (ordinal gap, pending не последний, result после pending). Main application последующие Appeal запрещал. Нельзя миграцией удалять/перенумеровывать/автоматически resolve записи. Если действительно найдена несовместимость данных — конкретный blocker передать Лёве; гипотетическая legacy-аномалия не требует prod действий.

### 5. Permissions и privacy

- Participant result/submission: session + actual Case membership/direction; complaint.create/review/appeal.review не требуются, как в foundation.
- appeal.review независимо открывает group2, Appeal view/context/evidence и resolve.
- complaint.review открывает group1/group3, P4 review/notes/initial Decision; само не разрешает resolve Appeal.
- reporterIdentity.read только добавляет structured identity к уже разрешённому review.
- priority.manage-only открывает settings, без Cases/Appeals.
- Shared Admin/Help actions и private pending Help fields сохраняют собственные permissions; admin admission не расширяется.

Каждый endpoint самостоятельно проверяет session/current authority. Review key, identity и shared presentation flags выводятся из одного consistent effective-permission snapshot; новый request видит overrides/revocation. Loader flags не authority для POST.

Обычная reviewer SQL не выбирает reporter/appellant account fields; elevated branch добавляет только id/name, без email. Participant DTO не содержит других reporters/их количества, private notes, evidence keys, event actor/operation/fingerprint, reviewer identity или admin history. Он содержит initial public reasoning, current outcome и максимум три public result summary: Appeal id/ordinal/side/status, result/reasoning/resolvedAt. Чужие Appeal arguments участникам не отдавать; собственный аргумент допустим только own-only projection. Reviewer видит аргументы по protected authority с прежней identity границей.

Все document/data/action/resource success/error responses private,no-store. Membership-only result постороннему404; protected errors различают401/403/404/409/503. Только известная typed dependency unavailability→503; unexpected schema/programming failures идут в обычный error path.

### 6. Read models, routes и reuse P4

Предлагаемые routes, имена файлов по conventions:
- existing /:locale/complaints/:caseId/result: participant GET + Appeal POST;
- /:locale/attention?mode=complaints&group=group2;
- /:locale/attention/complaints/:caseId/appeals/:appealId: protected GET + resolve POST;
- его appeal-scoped context/:postId и evidence/:attachmentId.

Добавить узкие appeal contract/context/server presentation capability, local/Hyperdrive wiring по existing lifecycle: fresh operation client, finally discard, typed availability. Foundation readCase целиком браузеру не отдавать; submission capability не расширять до arbitrary private reads.

Appeal view показывает original Decision/reasoning, current effective outcome, текущую Appeal/argument/ordinal, всю bounded историю предыдущих Appeals/results. Для reported immutable revision/current source/reports/readonly notes/retained evidence/context минимально выделить общие read/render helpers P4. Required capability выбирается server method (Case или Appeal review), а не browser flag. Appeal↔Case↔Decision проверить до выдачи/resources и внутри согласованного read snapshot.

Сохранить P4 bounds: reports/notes/evidence50+lookahead+independent totals, context25, SQL-bounded excerpts, protected full expansion, реальные permanent numbers/source locale. Read-only repeatable-read projection объединяет Appeal state и content, не смешивает независимые противоречивые reads. Context post должен принадлежать теме Case; asset — retained target Case до bucket fetch. Object keys server-only; attachment/octet-stream/nosniff/sandbox прежние.

Appeal-only reviewer не отправляется на P4 resource, требующий complaint.review; старый Case route не ослаблять. Previous-Case/History links показывать при отдельной authority. Notes в Appeal view readonly: appeal.review не даёт addNote. Shared Quick actions при reuse идут в canonical topic handler со своими fresh checks.

CaseActivity рассчитан на open Case и complaint.review. Не монтировать его на resolved Appeal Case; новая Appeal-presence/claim инфраструктура для этого scope не нужна.

### 7. Attention, queue и reviewer preference

Добавить appeal.review в header Attention admission и default mode/group. Проверять выбранную группу до DB read: group1/group3→review, group2→appeal.review. Appeal-only default group2; review-only group1; только priority.manage→settings. Review+appeal.review сохраняет default group1. Явно запрошенная недоступная группа не отдаёт данные другой группы. Недоступные tabs/links и protected counts не запрашиваются/не отображаются.

Group2: одна строка на pending Appeal, bounded25+lookahead, независимый total всех pending, корректный на empty/out-of-range pages. Поля: ordinal/3, pending time, target kind, bounded immutable excerpt/source locale, effective outcome. Никаких reporter identities в queue даже elevated actor. Resolved Appeal исчезает из queue, остаётся доступной по protected URL и History.

Soft preference: server boolean «это ваше исходное Decision»; чужие initial Decisions сортируются раньше собственных, внутри created_at,id. На собственной записи рекомендация другого reviewer, но resolve разрешён при appeal.review. Не требовать доказать отсутствие иных moderators, не искать/назначать «свободного» reviewer, не вводить hard self-review ban, availability lock или зависимость от presence.

Новые paged loaders используют strictPageQuery: page0..10000, unknown/duplicate application keys400. React Router8 передаёт нормализованный loader url: raw request.url сохраняет .data/_routes и уже приводил к runtime400 в P4. Проверить actual single-fetch navigation/resources. Signals/Security paths не рефакторить.

### 8. Формы и participant result

Result показывает immutable initial result/reasoning/time отдельно от current effective outcome, used/remaining, pending/results и причину отсутствия формы (pending, лимит, другая сторона). Убрать «Appeals unavailable» вместе с работающим workflow. Не раскрывать число/идентичности reporters и не утверждать наличие/отсутствие санкций без Case→action fact.

Participant POST: session+same-origin, URLencoded stream32768 bytes, whitelist intent/decisionId/operationId/argument; caseId из path, actor из session. Repository проверяет Decision ownership. Required argument trim/NUL/2000 Unicode code points; UTF-16 maxLength не должен запрещать допустимый supplementary Unicode.

Reviewer POST: session+same-origin+fresh appeal.review, URLencoded stream256KiB, whitelist intent/operationId/outcome/reasoning; path caseId+appealId; reasoning required trim/NUL/10000 Unicode code points. Duplicate/unknown fields, неверные encoding/intent/outcome/ID отвергаются до mutation. No GET writes.

Nonce, target Appeal ID и draft устойчивы через rerender/revalidation/ambiguous failures; draft очищается лишь по matching successful acknowledgement. При409 refresh + сохранение текста, без автоматической замены target или нового nonce. EN canonical + RU/HE, generic LocaleRegistry/lang/dir, mobile/RTL/accessibility. Evidence/arguments/reasoning отображаются инертно.

### 9. Appeal-result notifications

Добавить insertComplaintAppealResultNotifications(tx,caseId,appealId), по P5 pattern. Recipients=affected author UNION все actual Case reporters, dedup account, включая author=reporter. Не ограничивать appellant и не применять reply self-suppression. Pending submission отдельное уведомление не создаёт — такого требования нет.

Kind complaint-appeal-result, отдельный Appeal FK и original resolved_at; fanout атомарен result/event. Recipient+Appeal unique даёт replay/backfill dedup без reset read_at. Case/Decision выводятся из authoritative Appeal ownership.

Расширить mixed DTO/query, generic unread count, exhaustive mark/open target, action redirect, system rendering. Destination: /:locale/complaints/:caseId/result#appeal-<appealId>, устойчивый id на public result summary. Старое уведомление ведёт к своему immutable result после следующих Appeals. Mark/open rechecks recipient+participant membership и idempotent read_at; destination проверяет membership повторно. Никаких client-controlled redirects.

Единственный inbox /notifications и P5 strict open POST4096 bytes сохраняются. Reply/mention producers/targets/constraints прежние. Legacy read/count/mark исключают оба complaint kinds в SQL до limit/update; общий header count включает все kinds. Appeal rows используют is-system layout без fake avatar/actor и узкой reply-grid колонки. Notification text без identities/private arguments/admin measures.

### 10. Реализация и документация

Порядок одного bounded implementation PR:
1. Reducer/policy, repository/service, forward schema/migration/metadata/manifest, atomic notification helper.
2. Participant/queue/reviewer projections и узкие Worker/local/Hyperdrive contracts, минимальный P4 reuse.
3. Participant result/form, group2/header, reviewer/resources, EN/RU/HE.
4. Mixed inbox read/open/render и History compatibility; native/route/browser evidence.
5. docs/moderation/COMPLAINTS.md и применимые auth/database contracts отражают реальный P6; PROJECT_STATE только фактическое состояние. Заменить superseded deferred statements, не объявлять Package7/project complete.

Лира начинает из актуального main; если baseline изменился, сначала проверяет delta и адаптирует затронутые boundaries. Старые локальные dirty changes Лёвы не входят в пакет.

### 11. Acceptance и доказательства

Native PostgreSQL17:
- оба initial outcomes, все result chains≤3, pending не меняет итог, shared third slot/fourth rejected;
- one pending блокирует все стороны, разные/повторные reporters, dual-role, foreign Case/reporter/Decision;
- concurrent submits разных actors→один slot/event; concurrent resolves→один result/fanout; submit/resolve race; replay после eligibility flip; changed replay conflicts; rejected/rollback не тратят слот;
- initial Decision/arguments/old results immutable; result/event/fanout rollback; actor→Case lock order;
- каждый participant получает один notification на каждый result, outsider ноль, author=reporter dedup; retries/backfill сохраняют read_at;
- clean migration + upgrade0054 с first pending/resolved fixtures, backfill timestamps/dedup, реальные unique/check/FK enforcement, manifest/runtime ACL parity.

Permission/privacy/routes:
- appeal-only header/group2/review/resolve/context/evidence без complaint.review; review-only не resolve; identity/priority-only и outsider не читают Appeal;
- allow/deny/revocation next request, consistent snapshot; ordinary SQL/HTML/data/resources без structured reporter/appellant identity; participant DTO без чужих private arguments/notes/reporters;
- Case↔Appeal↔Decision, Case↔context post и retained asset ownership; foreign substitution404 до bucket;
- private/no-store на errors; malformed/duplicate/oversize/cross-origin requests без mutation;
- queue25 и mixed inbox50+ independent totals/out-of-range, unread/order, legacy read/count/mark исключают system kinds;
- nonce/draft/target сохраняются при409/revalidation/ambiguous failure, Unicode supplementary limits.

Actual local Worker + PostgreSQL + Chromium:
- participant→Appeal→group2→appeal-only reviewer→result→notification open/read→следующая eligible сторона→third result/лимит;
- self-initial-reviewer preference без deadlock, old notification anchor после нескольких results;
- real React Router single-fetch navigation/pagination/resources, не только memory-router mocks;
- retained evidence permitted/forbidden substitutions, EN/RU/HE/mobile/RTL, mixed inbox system layout без P5 regression; relevant P1–5 regressions.

Выполнить repository-required lint/typecheck/application/database/migrations/schema/runtime privilege/build/Worker/Hyperdrive smoke. Evidence с exact head и фактическими командами/результатами; green CI не заменяет runtime verification. Preview/owner visual acceptance по текущему repository cycle, без production bindings/rollout.

Готовность к review: весь текущий scope завершён на stable exact head, applicable checks/visual acceptance зафиксированы, docs соответствуют реализации. Мира первой проводит coordinator whole-PR review; после PASS Лёва независимо проверяет тот же head. Implementation change требует нового цикла.

### 12. Handoff

Product policy уже принята, новых owner questions для старта нет. Техплан подготовлен; следующий шаг Миры — проверить bounded scope и дать Лире отдельное implementation assignment с этим планом. Лира пока не назначена, implementation PR отсутствует. Лёва не реализует пакет без технической эскалации.

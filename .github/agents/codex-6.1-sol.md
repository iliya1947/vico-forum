# Лёва — Codex-6.1 Sol

## Роль

Главный архитектор и технический руководитель Complaints: планирует техническую реализацию bounded-этапов и после coordinator PASS проверяет реализацию. Сам реализует только при технической эскалации.

## Важный подтверждённый контекст

- Лёва реализовал Packages 1–3 и интеграцию Package 3 с AP-05.
- Принятая migration chain после интеграции: AP-05 `0051_forum_admin_history`, Complaints `0052_complaints_queue` и `0053_complaint_priority_settings`.
- Package 3 сохраняет Queue/triage, configurable reason priorities, manual override и non-exclusive expiring reviewer activity.
- Package 4 должен строиться поверх shared Admin Quick actions; complaint decision `confirmed | not-confirmed` остаётся отдельным от административных действий.
- Reporter identity проецируется server-side по отдельному permission; обычный reviewer её не получает.
- Package 5+ — History UI, result notifications и appeals — вне текущего scope.

## Текущий этап

Package 4 merged через #276 в main `1ad8a6402111928c0f08e6f15aba624ba18a4426`. Технический план Package 5 — History + notifications подготовлен и приведён в конце файла. Следующий шаг — согласование Мирой и затем назначение Лире. Код/migration/implementation PR Package 5 не создавались. Ранее завершённые P4 checkpoints ниже сохранены как контекст.


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


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

Independent technical whole-PR review PR #276 завершён на exact head `7d64933d47c257267d1fa4c6aec63685e9d27344`: **PASS, 0 подтверждённых current-scope дефектов**. Оба предыдущих P2 Decision recovery закрыты фактическим Chromium/Worker/PG прогоном. [Результат и handoff Мире](https://github.com/iliya1947/vico-forum/pull/254#issuecomment-6582586583). Implementation не менялся. Следующий шаг — coordinator closeout Миры; merge/production не выполнялись.


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

# Лёва — AP-10 repeated independent review: PASS

Актуальный результат: PR #290, exact head `ef313919f6613c54db6ddb50765c968744101306`, independent PASS. AP10-LEV-01 закрыт. [Полный отчёт](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6685133377). Проверка завершена; реализацию не менял. Следующий шаг — Мира: readiness и отдельный documentation closeout #291; merge выполняет владелец.

Лёва — повторный independent technical review PR #290: **PASS**.

Review exact head: `ef313919f6613c54db6ddb50765c968744101306`; base/main `5cf80f38cbc06ed733a0618e706eb80c5a7b3c7b`. Реализацию не изменял, других агентов не вызывал. Вердикт относится только к этому head.

**AP10-LEV-01 закрыт по исходной причине.** Проверены обе независимые границы: canonical create action применяет bounded target-ID validator; direct service create отдельно отклоняет NUL и >2048 UTF-8 bytes до fingerprint/repository/SQL. Ошибки PostgreSQL не маскируются общим catch. Собственный прежний HTTP reproducer на новом built Worker получил **400 private/no-store** для NUL вместо прежнего 500; valid missing target сохранил **404**, measure/History counts не изменились. Дополнительный собственный direct-service probe: NUL, 2049 ASCII bytes и 513 emoji → typed InvalidUserMeasureInputError и **0 repository calls**; допустимые 2048 bytes проходят validation.

Проверка охватывает весь AP-10 scope, включая authority/raw RBAC/issuer floor/owner boundary, explicit-grant-only capabilities, restriction enforcement всех child actions и administrative families, privacy/subject allowlist, terminal/CAS/replay, sequential appeals/accepted change or lift, atomic History, attachments cleanup, route errors/revalidation и retained Editor state. Полная исходная собственная проверка зафиксирована в #6684522908; при повторной проверке установлена точная 5-file delta (50 additions/3 deletions), повторно оценены затронутые связи и заново выполнены основные cross-domain tests/browser flows. Остальные implementation файлы, schema/migrations/manifest/ACL, permissions, enforcement и UI boundaries побайтово совпадают с ранее проверенными; прежний coordinator verdict не использован как доказательство.

**Собственное evidence на новом exact head:**
- Node 24.21.0 / pnpm 12.3.4; отдельная disposable loopback PostgreSQL 17, полные migrations 0000–0058.
- **289/289 application/domain/route/UI/Worker tests**, 19 files.
- **78/78 native PostgreSQL tests**, 5 AP-10 files: transitions, hierarchy, reader/privacy, forum/attachments/Complaints/translation enforcement и schema constraints.
- Собственная build — PASS.
- Actual Chromium → built Worker → Better Auth → PostgreSQL: **19 case groups PASS**, включая malformed-target 400/missing-target 404/no writes; EN/RU/HE × 320/768/1280; 0 layout failures, 0 page errors и 0 external browser requests. Repository acceptance script заново исполнен с environment-only adapter вне implementation tree.
- Первый browser attempt остановился на штатном signup 429: параллельный собственный input probe добавил регистрацию к трём browser fixture accounts. После завершения probe/reset rate_limit только одноразовой test DB browser исполнен отдельно успешно; application limiter не менялся.
- Дополнительные самостоятельно написанные HTTP/domain probes отдельно от штатных regressions подтвердили закрытие finding.
- GitHub exact-head CI **#42218475676 SUCCESS** и isolated browser **#42218475943 SUCCESS** перепроверены отдельно; это CI автора, не замена собственным reruns.

Evidence: `/workspace/work/ap10-review2-evidence/` — application.log, database.log, build.log, browser.log/results.json/screenshots, input-boundary-probe.json, domain-validation.json; исходный reproducer — `/workspace/work/ap10-review-evidence/input-boundary-probe.py`. Первый rate-limit attempt сохранён отдельно.

Подтверждённых current-scope defects на review head не осталось. Last-manager принцип не применялся и не распространялся; его существующая реализация не изменялась. Documentation PR #291 не получает approval этим implementation verdict. Merge, owner visual acceptance и production/deployed acceptance не выполнялись.

**Следующий шаг — Мира:** принять independent PASS и завершить readiness/отдельный documentation closeout #291 по рабочему процессу; merge выполняет владелец. Implementation head остаётся frozen; любое его изменение требует coordinator-first review cycle. Лёва назначенную проверку завершил и останавливается.

Локальный Worker остановлен, disposable DB удалена, synthetic .dev.vars и dependency symlink удалены; tracked checkout чист.


---

## Предыдущие рабочие записи и утверждённый план

Статусы предыдущей проверки на 9fecd925 ниже исторические; актуальный implementation verdict — PASS на ef313919, записанный выше.

# Лёва — AP-10 independent technical review PR #290

Текущее назначение выполнено. **NOT PASS:** AP10-LEV-01 [P3], malformed create targetId с NUL → PostgreSQL 22021 / HTTP 500 вместо typed 400. Полный [отчёт](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6684522908). Реализацию не менял; следующий шаг — Мира принимает bounded correction finding и передаёт Лире.

Лёва — independent technical review AP-10 / PR #290 завершён.

**Exact head:** `9fecd925a256062e9892235f4ba02ed3147de1e3`; base/main `5cf80f38cbc06ed733a0618e706eb80c5a7b3c7b`. Head повторно проверен перед публикацией и не менялся. Реализацию не изменял. Review выполнен самостоятельно, без вызова других агентов; coordinator verdict/старые findings не использованы как доказательство.

**Verdict: NOT PASS — один подтверждённый current-scope defect низкого приоритета (P3).** Нарушения authority/privacy или потери данных не подтверждены; finding касается контролируемой валидации нового AP-10 write input.

### AP10-LEV-01 [P3] — NUL в create targetId проходит в PostgreSQL и даёт HTTP 500

Точки: [admin-measures.tsx:57](https://github.com/iliya1947/vico-forum/blob/9fecd925a256062e9892235f4ba02ed3147de1e3/app/routes/admin-measures.tsx#L57), [user-measures.ts:89](https://github.com/iliya1947/vico-forum/blob/9fecd925a256062e9892235f4ba02ed3147de1e3/db/user-measures.ts#L89), [identity():558](https://github.com/iliya1947/vico-forum/blob/9fecd925a256062e9892235f4ba02ed3147de1e3/db/user-measures.ts#L558).

Подтверждённая цепочка:
1. Actual Better Auth session с explicit `admin.users.blocks.manage`, same-origin POST `/en/admin/measures`, valid create UUID/reason/restriction и `targetId=invalid%00target` (urlencoded).
2. Action читает target только через `measureFormText`. Service `identity()` проверяет string/nonempty/trim, но пропускает NUL.
3. `lockTarget` отправляет значение в parameterized PostgreSQL query. PG отклоняет text parameter: **SQLSTATE 22021**, `invalid byte sequence for encoding "UTF8": 0x00`.
4. Это не typed input error и не availability failure; response — **500**, а не controlled **400 invalid**. Отдельный direct service→PG probe подтвердил тот же code/message.
5. Контрольный такой же запрос с корректно сформированным несуществующим ID дал ожидаемый **404**. В обоих случаях 0 новых measure и 0 History events, response `private, no-store`.

Существующая `measureTargetId()` уже запрещает NUL и >2048 UTF-8 bytes для target lookup, но mutation этот validator не использует. Ошибка принадлежит текущему AP-10: bounded/runtime input validation и controlled 400 являются частью approved HTTP/service boundary. Это не privilege escalation и не причина расширять authorization architecture.

Минимальное исправление: согласовать проверку target ID на create HTTP и domain boundary с существующим bounded target-ID contract; NUL должен стать typed InvalidUserMeasureInputError до DB. Не маскировать произвольные SQL errors как 400/503. Добавить focused regression malformed create target → 400 и отсутствие domain/History changes; корректный missing target остаётся 404. Новых permissions/schema/owner rules не требуется.

### Независимая проверка всего AP-10 scope

- Schema/forward 0058, closed child catalog, zero initial grants, raw hierarchy/owner identity, issuer floor и elevated-grant guards.
- Create/change/lift terminal/CAS/no-op/replay, separate overlapping measures и EXISTS admission, reasons и atomic History; appeal exact identity/3 sequential slots/one pending, accepted change/lift, expiry/moot и concurrent operations.
- Все ordinary child actions и four administrative families: canonical/direct writes, filtered resolver/private child reads, active-session freshness. Own vs Any, public reads/login/notifications/appeal rights сохранены.
- Publication/Complaint receipts, attachment preflight + post-R2 metadata admission, durable cleanup/Cancel и ambiguous-commit safety.
- Own allowlist serialization без actor/reviewer identity; authorized internal History; private/no-store statuses, route revalidation без POST replay; scope of pending controls и mounted Editor retention.
- EN/RU/HE strings/fingerprints, duration controls, scope of forms, keyboard/RTL/responsive behavior; migration/manifest/runtime ACL и isolated browser workflow boundaries.
- Новый last-manager veto/count/recovery mechanism не добавлен. Legacy authorization counts и post-admin redesign не переоценивались как требования AP-10.

Других подтверждённых current-scope defects после общего sweep нет.

### Фактически выполненное собственное evidence

В отдельном detached checkout exact head, pinned Node **24.21.0** / pnpm **12.3.4**, одноразовый loopback PostgreSQL **17**:
- **78/78 native PostgreSQL tests**, 5 AP-10 database files, реальные migrations 0000–0058.
- **288/288 application/domain/route/UI/Worker tests**, 19 files (139 + 149), включая issuer-floor read-only controls, forged mutation denial, retained Editor и private route adapters.
- 3 metadata/runtime-privilege/migration-history test scripts — PASS; собственная production build — PASS.
- **Actual Chromium → built Worker → Better Auth → PostgreSQL:** заново исполнен repository acceptance script, только environment adapter указывает local checkout и установленный Chromium. **18 case groups PASS**, EN/RU/HE × 320/768/1280; 0 layout failures, 0 page errors, 0 external browser requests. Domain flows включают независимые меры, own appeals, queue discovery, active-session denial, accepted lift, overlap/restoration и stale 409 без replay.
- Дополнительные independently written HTTP/domain probes выявили AP10-LEV-01; green штатных тестов не выдан за доказательство отсутствия этого дефекта.
- На GitHub отдельно подтверждены exact-head **CI #42213405436 SUCCESS** и **isolated browser #42213405385 SUCCESS**; это CI автора, отдельно от собственных reruns.

Local evidence: `/workspace/work/ap10-review-evidence/` (application.log, adapters-routes.log, database.log, metadata.log, build.log, browser/results.json/screenshots, input-boundary-probe.py/.json, input-domain-cause.json). Browser runner адаптирован только вне implementation tree. Tracked implementation diff остаётся пустым.

Documentation PR #291 не является target этого implementation review и не получает approval данным verdict. Owner visual acceptance/deployed production acceptance не заявляются. AP-11/Settings, production/Stage 6 и owner-role/last-manager cleanup не затронуты.

**Следующий шаг — Мира:** принять единый bounded finding AP10-LEV-01 и передать Лире локальную correction PR #290. После нового stable exact head/applicable checks — новый coordinator cycle, затем technical review того же head. Реализацию во время review не исправлял; review завершён.


---

## Справочный утверждённый технический план

Ниже сохранён planning context. Все AP10-PLAN-MIRA-01..06 закрыты, plan approval #6671217104; прежние статусы ожидания plan review относятся к planning history и не являются текущим назначением.

# Лёва — AP-10: технический план мер, restrictions и block appeals

Planning baseline: `main` `5cf80f38cbc06ed733a0618e706eb80c5a7b3c7b`; migrations 0000–0057, Admin Panel AP-01–09 merged.
Назначение: [#6667343744](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6667343744).
Статус: план для coordinator review; **код/implementation PR не создавались**. Revision AP10-PLAN-MIRA-01..04 принята Мирой #6670166694; AP10-PLAN-MIRA-05..06 исправлены по owner correction #6670294050 и ожидают повторного coordinator review. Прежний §9 закрыт, новых owner product blockers нет.

## 1. Применимые решения владельца

Мера содержит выбранные restrictions; временный/постоянный срок независим от выбора. Group checkbox — shortcut над дочерними пунктами, не отдельная policy. Expiry/lift прекращают эффект меры, не меняя roles/grants/overrides.

Reason обязателен при создании, ручном изменении restrictions/срока и explicit lift. Первоначальное объяснение не затирается later reasons; сам наказанный видит reason и последующие объяснения, другие обычные пользователи — нет. Complaint Case/Decision не требуется и не применяется автоматически.

Self-target запрещён для create/change/lift. Для privileged target нужна повышенная authority, действующая на всём lifecycle, с учётом target/issuer hierarchy. Owner — верхняя authority и не target subordinate actor. Role names не являются runtime authority.

Block appeal — отдельный domain по exact measure, не Complaint/Complaint Appeal. До 3 последовательных submissions на одну меру, одновременно только одна pending appeal; право не отключается restrictions. Изменение меры не меняет identity/quota/pending appeal. Expiry/lift делают pending appeal утратившей предмет. Own status/reasons/appeal surface всегда достижима.

**Решение владельца об отменённом last-manager принципе имеет приоритет над старым текстом ADMIN_PANEL.** В AP-10 нет требования сохранить хоть одного доступного управляющего, новых manager counts, veto последнего администратора или recovery/lockout subsystem. Existing `AuthorizationLockoutError` / `managers_ever_existed` пока не переделываются и не используются как основание запретить меру. Очистка кода/схемы/тестов/контрактов и owner-role redesign — отдельная задача после админ-панели.

## 2. Restriction catalog и реальные authoritative entry points

Один typed product catalog, отдельно от PermissionKey. Предлагаемые стабильные IDs:

| Группа / ID | Запрещаемое действие | Точки enforcement текущего main |
| --- | --- | --- |
| Publication: `topics.create` | Новые обычные темы и Help questions | topic/Help actions → `ForumWriter.createTopic` → `ForumService.createTopicWithInitialPost` → repository transaction |
| Publication: `replies.create` | Новые ответы, включая Reply/Quote | canonical topic action → `createReply` → repository `createPost` |
| Publication: `attachments.upload` | Новые файлы | POST `/api/attachments` перед R2 stream + authoritative `createDraftAttachment` при фиксации asset/ref |
| Own content: `posts.edit` | Правка опубликованного собственного body/attachments | `editPost`/post-edit paths → `editPublishedPost` transaction |
| Own content: `profile.edit` | Правка публичных bio/URLs | profile action → `updateProfile`; не account/session operations Better Auth |
| Submissions: `complaints.submit` | Новые Complaint reports | `ComplaintsService.submit` и repository `submit` после existing replay lookup |
| Submissions: `helpSignals.submit` | Новые Help signals | `createHelpSignal` domain path; withdrawal/appeals не считать новым submission |
| Resources: `translations.generate` | Новые generation requests/jobs/budget admission | topic generation intents → existing planning/request-budget/job admission; runtime generation остаётся disabled там, где уже disabled |
| Administrative: `admin.forum` | Forum/Help moderation и её private reads | protected Forum loaders, contextual Any/admin actions, Help review/attention, post-revision history |
| Administrative: `admin.complaints` | Case/Appeal review, private context/evidence, priority/identity access и mutations | existing Complaint reviewer capability/service paths, включая child context/evidence endpoints |
| Administrative: `admin.security` | Private attachment-security review | permission-scoped Attention security reader |
| Administrative: `admin.usersAccess` | Users management, roles/permissions, ordinary private admin History и AP-10 management | Users/authz/History routes и canonical writers; own status/appeal routes исключены |

Последние 4 child restrictions доступны только при достаточной authority над privileged target. Они подавляют и private reads, и administrative writes своей области; hidden button не считается enforcement.

Catalog **не включает** login/session, public read/download опубликованных файлов, notifications/read state, own status/reasons, Complaint/Help/block appeal submissions, own solved/best-answer и source-locale correction как отдельные punitive возможности. Source correction в **Any/admin** scope остаётся administrative operation соответствующей семьи; Own scope сохраняет исходные permission/ownership правила. Изменение restrictions никогда не выдаёт capability, которой у actor не было.

Точный administrative mapping:

- `admin.forum`: `forum.topic.pin`, `forum.topic.close`, `forum.solution.manageAny`, `forum.helpNeedsDetails.manage`, `forum.helpDuplicate.manage`, `forum.sourceLocale.correctAny`, `forum.post.history.read`;
- `admin.complaints`: `forum.complaint.review`, `forum.complaint.appeal.review`, `forum.complaint.priority.manage`, `forum.complaint.reporterIdentity.read`;
- `admin.security`: `forum.attachmentSecurity.read`;
- `admin.usersAccess`: `admin.users.read`, `access.authorization.manage`, `admin.history.read` и новые AP-10 administrative capabilities.

UI отображает понятные действия, не эти internal keys. Parent checkbox имеет checked/indeterminate; сервер принимает только unique nonempty child ID set и отклоняет неизвестные IDs. Future capabilities не добавлять заранее.

## 3. Authority без нового owner/super-admin subsystem

Техническое предложение:

- обычная capability **`admin.users.blocks.manage`**: minimal target/measure lookup, create/change/lift и review block appeals; initial grants отсутствуют у всех built-in roles, включая admin/moderator; доступ только explicit grant через dynamic authorization;
- повышенная **`admin.users.blocks.managePrivileged`**: дополнение к manage, не отдельная mutation/read authority; initial grants **никому автоматически**. Обе новые capabilities явно исключить из `INITIAL_ROLE_GRANTS.admin` «все catalog keys» seed и всех остальных initial grants; не добавлять migration backfill. Owner binding сам по себе не выдаёт эти права;
- один server-owned binding **`VICO_OWNER_USER_ID`** к существующему Better Auth user ID для необходимой owner target immunity/rank. Не брать owner из email, role name, form/session role claim или нового client input. Это узкая identity boundary AP-10, не owner role, bootstrap endpoint или emergency UI. Реальную production configuration не выполнять; local/CI fixtures задают synthetic owner. Без необходимого binding новые административные переходы fail closed как configuration-unavailable, не разрешают таргетировать неизвестного owner.

Raw effective grants/overrides определяют privileged target, **до** suspension filtering: union существующих implemented administrative/Attention capabilities плюс новые block capabilities. User с временно подавленным admin access не превращается в обычного target. Простые participation permissions и имя built-in/custom роли не задают protected rank.

Уровни для этой операции: ordinary target → privileged moderator/admin target → elevated/head target → bound owner. Actor должен иметь manage и достаточную более высокую authority над target; для изменения/снятия дополнительно не быть ниже уровня issuer меры. Owner выше elevated, не target ни peer, ни subordinate; self-target всегда запрещён. Elevation не следует из обычного manage.

Чтобы новый elevated key не стал checkbox self-escalation обычного authz manager, изменения **этого конкретного key** через roleGrants/user override и assignment роли с ним требуют bound owner. Проверка в existing authorization transaction под её lock; UI делает соответствующие варианты read-only, server остаётся authoritative. Не перепроектировать остальные grants/roles/demotion/recovery. Это необходимая граница нового elevated authority, а не распространение last-manager правила.

Measure хранит issuer authority level при создании; change/lift checks используют current raw target/actor authority и сохранённый issuer floor. Нельзя понизить floor простым редактированием меры; действие более высокой authority может повысить floor, чтобы нижестоящий actor не отменил её решение. Это предложение на coordinator review как минимальная реализация уже утверждённой issuer hierarchy.

Новые measure transitions сериализовать с authorization changes через существующий `authz_mutation_lock` **только для свежего authority snapshot/иерархии**, без вызова countManagers/lockout-validation. Lock order: authz lock → target identity/current measure → appeal при необходимости → existing History order lock последним. Authz writers сохраняют свою прежнюю реализацию; новый guard protected elevated key и actor service restriction добавляются без новой manager-count логики.

## 4. Persistence и service boundary

Один AP-10 domain/service/repository, например `UserMeasuresService` / `PostgresUserMeasuresRepository`; один restriction reader/policy используется другими domain entry points. Два разных нарушения создают разные меры, в том числе одновременно активные. Минимальная схема:

1. **`user_measures`**: opaque UUID id; target/issuer user IDs; issuer authority floor; createdAt; initial user-visible reason; nullable expiresAt (null = permanent); version integer >=1; current/latest change reason/context; nullable explicit liftedAt/liftedBy/liftReason; create-operation fingerprint для одинакового retry. Original reason не перезаписывать.
2. **`user_measure_restrictions`**: measure ID + catalog child key, composite unique/PK; FK и closed catalog CHECK.
3. **`user_measure_appeals`**: UUID id, exact measure ID, submitting subject ID, ordinal 1..3, bounded body/createdAt; reviewer resolution/actor/time/explanation. Unique `(measure_id, ordinal)` и immutable identity. Не ссылаться на Complaint Decision/Case как required identity.

Новые timestamps — явные `timestamptz` с millisecond precision. Существующие Better Auth `timestamp without time zone` columns не менять и не моделировать другим типом в tests. End instant приходит с offset/UTC, invalid/ambiguous local dates отвергаются. Temporary presets — UI duration shortcuts, custom instant — тот же server validation; expiresAt должен быть future при create/change. Permanent не требует выдуманной далёкой даты.

Active вычисляется по authoritative DB time: explicit lift отсутствует и `(expiresAt IS NULL OR expiresAt > now)`. Expiry не требует cron, public GET write или synthetic admin event. UI и policy читают effective expired status; pending appeal при истёкшей мере возвращается как moot, даже если stored row не переписан фоновым процессом. При explicit lift pending rows закрываются атомарно; при edits активной меры остаются привязаны к той же measure. Expired/lifted мера terminal: любые change/restrictions/end-time/reason/remedy отклоняются; повторное наказание — новая measure. Fresh terminal check после measure lock, committed retry не возобновляет меру. Не создавать WHERE-index с `now()`.

Create/change/lift — один writer contract с exact target/measure ID и expected version, session actor, reason/restrictions/end-time. CAS до mutation; stale edit/lift не затрагивает новую/заменённую меру. Equal desired state — no-op, версия/event не меняются; exhausted version fail closed. Create retry с тем же opaque id/fingerprint возвращает existing result, changed payload — conflict. Одновременно активные меры допустимы; fresh restriction assertion — EXISTS по активным мерам target и child key (§9). Не добавлять UNIQUE active target/current-head или отдельный aggregation subsystem.

Reason/body limits — существующий bounded text validation style; предлагаемый reason max 2000 Unicode code points, appeal body max 2000, непустой текст без NUL. Не копировать private Complaint/reporter notes. Публичный user directory/profile DTO reasons/меры не получает.

Forward migrations после 0057, согласованные Drizzle snapshots/journal/catalog/manifest и existing runtime probes. Не переписывать accepted history. New runtime tables: нужные SELECT/INSERT/UPDATE, без произвольного DELETE; History остаётся SELECT/INSERT. Не расширять localization DB capability; новый adapter использует WEB_HYPERDRIVE. Production migration/evidence/deployment не выполняются.

## 5. Enforcement и replay: расположение проверок

Raw PermissionResolver/RBAC сохраняются; restriction — дополнительная action policy, а не новая роль/массовые deny overrides. Policy snapshot request-local, без long-lived cache; новое committed restriction видно следующему request. Privileged actor access view соединяет raw permissions и current administrative-family restrictions; all private loaders/services/child endpoints используют его, включая `.resolve().effectivePermissions` consumers в Complaints, а не только `.has()` callers. Для target hierarchy использовать **raw** snapshot, не эту filtered presentation/action view.

Regular publication/edit restrictions нельзя безусловно вычитать из permissions в HTTP guard до writer: это потеряет committed publication replay. Их authoritative assertion ставится внутри existing transaction **после** existing receipt/idempotent-result lookup и **до** новых domain effects. Raw permission/session/origin/resource guards остаются обязательными. Presentation отдельно скрывает/блокирует новые действия по current restriction snapshot.

| Path | Минимальная integration |
| --- | --- |
| createTopic/createPost/editPublishedPost | Existing receipt lookup сохраняется первым; затем current restriction check до cooldown/new revisions/posts/refs/notifications. Same fingerprint возвращает прежний committed результат; другое содержимое не становится replay |
| updateProfile | Existing owner check, небольшой transaction + policy check перед profile write; не блокировать own read/status или Better Auth session |
| Complaint submit | Existing repository replay остаётся допустим; fresh report запрещается до нового Case/report/event/evidence effects |
| Help signals | Guard перед новым signal/cooldown; существующие appeal/withdraw flows остаются в своих contracts |
| attachments | POST проверяет именно `attachments.upload`, независимо от выбранного editor context; GET selection/download и Cancel не блокируются restriction. После R2 upload новый asset/ref commit снова проверяет policy; identical committed asset/operation result не теряется |
| generation | Guard перед новой planning/budget/job admission, без provider calls или включения disabled runtime; не отменять прежние accepted jobs/не переписывать Queue lifecycle |
| admin families | Fresh policy check перед private data read и перед authoritative administrative mutation. Common helpers plus repository guards закрывают direct API/context/evidence paths; Any/Own scope distinctions сохраняются |

Attachment cleanup: если новый metadata/ref commit отвергнут, уже записанные private bytes идут существующим безопасным reservation/cleanup путём. Не удалять shared/published refs и не делать blind delete после ambiguous commit. Не держать PG transaction/row lock на время stream/R2 call. Не запрещать Cancel/cleanup из-за publication/upload restriction. Existing temporary refs не становятся автоматически публичными.

Семантика enforcement — свежая server-side admission, не retroactive rollback уже committed действий и не новый механизм принудительной отмены in-flight HTTP/R2/Queue work. Для DB writes policy читается на authoritative transaction boundary перед новыми эффектами; no partial domain changes при denial. Проверить controlled race «restriction committed до admission → denial» и «receipt уже committed → replay», не обещать глобальную отмену по времени старта/окончания HTTP.

Не связывать block transactions со счётчиком access managers. В частности, мера, подавляющая Users/access у последнего raw access manager, не должна получать новый veto из AP-10. Actor restrictions не переписывают сами grants/overrides; expiry/lift открывают только то, что всё ещё разрешено current RBAC и прочими resource rules.

## 6. Routes, приватность и appeals

Административный consumer — Users area + small measures workspace, например `/:locale/admin/measures` и `/:locale/admin/measures/:measureId`. Это место exact target lookup/мер/очереди block appeals. `blocks.manage` независимо допускает minimal target/measure lookup и Users destination, но не весь general directory/authorization management snapshot; `admin.users.read` отдельно остаётся gate directory. Existing admin user detail показывает ссылку/применимые controls только при measure authority. Никакого edit-any/account-delete API.

Own surface — private `/:locale/account/measures` с exact-measure detail/appeal. На собственной account/profile surface показывается заметный вход; measure status/reason и appeal action находятся рядом на private own page/panel. Public profile не сериализует reasons и appeal bodies для чужого viewer или public cache. Проверять session subject до reads, а не `userId` из form. Эта surface и appeal submission не требуют administrative capabilities и не зависят от выбранных restrictions.

Administrative create/change/lift/review используют один service: same-origin, session actor, bounded unique input, fresh authority, exact IDs/CAS и private no-store responses. Markers/новый generic inline protocol не нужны только ради fetcher; reuse обычных typed intents/structured result. Controlled 400/401/403/404/409/503, typed storage/authorization outage fail closed; unexpected errors не скрывать. Pending/actor/target/version lifetime и safe refresh без automatic write replay.

Appeal submit: session subject == measure target, exact measure eligible по activity/status, число committed submissions <3. Measure lock сериализует quota; caller-generated appeal id позволяет identical retry без расхода ещё одной попытки. Одновременно на measure не более одной pending appeal: measure lock и partial UNIQUE по measure_id WHERE status = 'pending'. После завершения предыдущей следующая допустима только при active measure и оставшемся quota. Expired/lifted мера terminal; её продление и возобновление запрещены, pending effective moot. Изменение measure не обнуляет ordinal/quota и не превращает старый appeal в appeal новой версии.

Reviewer outcome: reject, accept + full lift либо accept + изменение restrictions/срока той же measure. Exact appeal ID + measure ID/current expected version; pending переживает intervening edits, stale reviewer refresh. Remedy, reason, accepted resolution и History выполняются одной transaction через shared change/lift primitive с fresh authority/CAS. Accept + change требует реального изменения и сохраняет ID/quota; accept + lift сохраняет accepted outcome этой appeal, не превращая его в moot. Обычный отдельный edit оставляет pending открытой. Reject сохраняет меру и записывает explanation. Остальные меры не затрагиваются; Complaint machinery не копировать. Подробности revision ниже.

При expiry/lift pending appeals effective moot; concurrent resolution не может применить lift к replacement ID. На точном CAS и row locks transition либо успешно committed, либо conflict с refresh. Решение по одной appeal не выдаёт authority на другие меры/Cases. Own status/history и result доступны subject; административный read — только authorized measures reviewer. Не добавлять inbox notifications/attachments/internal notes/private evidence subsystem, которых AP-10 не требует.

## 7. History

Добавить bounded typed events для реальных measure create/change/lift и reviewer resolution, например `measure.created/changed/lifted/appealResolved`, target type `user-measure`, stable measure ID. Context: target ID, выбранные restrictions, configured expiry, bounded before/after/version, relevant appeal ID/outcome и **reason конкретного committed изменения**. Original reason хранится отдельно и остаётся доступен subject. Не переносить role snapshots, email, sessions или private Complaint text.

Append в той же transaction после domain locks/writes, shared `ADMIN_HISTORY_ORDER_LOCK_SQL` последним. Existing `appendForumHistory` напрямую не подходит: он ищет topic title; нужен небольшой user-measure producer с тем же order/labels/immutable History boundary, не второй log transaction/event bus. History failure откатывает меру/appeal outcome. Expiry без ручного решения, no-op/stale/denied/failed/replay не создают admin events; ordinary user appeal submission сохраняется самой appeal row и не выдаётся за действие администратора.

Own measure timeline — отдельная subject projection reason/status/restrictions/timing/необходимого before-after/appeal result, независимо от `admin.history.read`. Actor/issuer/reviewer IDs/names/labels, issuer rank, avatar/profile links и raw private History context исключены из всех own serialized loaders/actions/.data/fetcher/errors. Не возвращать Admin History DTO и не скрывать identity только в JSX. Identity сохраняется internally и читается только через authorized internal History, не через одно blocks.manage. Общая admin History сохраняет свой отдельный gate. Остальные users не получают reasons через public profile, directory, notifications или общий forum DTO.

## 8. Минимальные implementation steps и проверки

После повторного coordinator approval revised plan: один связанный AP-10 scope, при необходимости логически разбитый на reviewable части без публикации working sanctions до mandatory own appeal path. Порядок работ:

1. Concrete policy/authority catalog + schemas/migration + one service/reader; минимальные native tests transitions/CAS/expiry/authority/quota/History.
2. Реальные create/change/lift и own-status/appeal/review consumers, shared Users Quick actions. No empty foundation-only capability, которой нельзя безопасно воспользоваться.
3. Подключить все catalog enforcement paths по §2/5, direct endpoints/child reads/active sessions; replay/cleanup/old permissions сохранить.
4. Canonical EN/RU/HE catalog/fingerprints, logical CSS, keyboard/group checkbox/indeterminate, long reason/restriction lists, UTC end instant, responsive/RTL. Preview переиспользует actual components; не новый workflow и не user browser.
5. Stable exact head, CI и author handoff → coordinator whole-PR → independent technical review → owner merge. Lasting docs/PROJECT_STATE отдельно после принятой реализации. Post-admin count-based recovery cleanup не подмешивать в AP-10.

Acceptance matrix:

- **Native PostgreSQL actual schema:** full forward migrations/parity/manifest/runtime privileges; exact accepted/new timestamp types; temporary/permanent/end boundary; invalid times/restrictions/reasons; no-op/CAS/replay; atomic rollback on History failure.
- **Authority:** custom roles/overrides, ordinary manager vs privileged target, elevated vs owner, self-target на create/change/lift, issuer floor и fresh concurrent role/grant change. Attempts обычного authz manager выдать новый elevated key через grants/assignment/override отвергаются; owner fixture может provision его. Не добавлять last-manager veto tests как новую requirement.
- **Enforcement:** каждый catalog action через UI/canonical/direct domain entry; fresh active-session request после меры denied, unrelated actions разрешены; все family private reads и writes закрыты; raw rights не меняются; expiry/lift не возвращают уже отозванные grants.
- **Replay/resources:** create/reply/edit committed receipts, Complaint identical replay и attachment retry не теряют result и не создают второй effect; new writes denied; Cancel/cleanup/shared refs, attachment-only/text-only, admission vs restriction timing, typed outages vs unexpected failures.
- **Appeals/privacy:** exact own measure, 3 successful submissions максимум при concurrency, retries quota не расходуют; no cross-user/measure access; pending survives edit, effective moot at expiry/lift; resolution race с lift/change; no Complaint mutation. Every restriction set сохраняет собственный status/appeal доступ; reason отсутствует в public/user-read-only DTO.
- **UI/HTTP:** capability-scoped forms, parent/child checkboxes, pending/double submit, explicit stale refresh/no replay, actor/target isolation, readable reasons/UTC dates, final document/.data/fetcher private/no-store; EN/RU/HE/RTL и narrow/tablet behavior применимо изменённым views.
- Полный existing exact-head CI: app/lint/typecheck/build/UI preview/db metadata + PostgreSQL/manifest/runtime probes/Worker smoke. Не выдавать unit/preview/SQL за actual authenticated browser/deployed acceptance. Отдельный browser/owner visual gate сейчас не назначать по аналогии; конкретно необходимая дополнительная runtime проверка согласуется по evidence, production/OAuth/providers не нужны.

## 9. Revision: решения владельца и изменения §4/6/7/8

Лёва — AP-10, локальная revision по coordinator review #6667923255 и последующим owner decisions #6669655343 / #6669734702.

Ниже только изменённые части плана #6667784146. Остальные catalog/authority/enforcement/replay/cleanup/History boundaries не расширяются. Код, БД и implementation PR не менялись. Current main по compare остаётся planning baseline `5cf80f38cbc06ed733a0618e706eb80c5a7b3c7b`.

### AP10-PLAN-MIRA-01 — §9 закрыт решением владельца; минимальный active lookup

Owner явно решил: **два разных нарушения → две разные меры**. Поэтому предложенная Мирой для первичной проверки модель «новое решение всегда change единственной active measure» теперь противоречит прямому решению: она объединила бы отдельные identity/reasons/lifecycles и appeal quotas. Старый вопрос §9 больше не blocker и повторно владельцу не передаётся.

- Новое санкционное решение по другому нарушению создаёт новую measure UUID с отдельными reason, restrictions, expiresAt/lift, version, issuer floor, history и appeal slots. Change существующей меры требует её exact ID/version и сохраняет identity/quota. Не вводить автоматическое распознавание/дедупликацию «одинаковых нарушений», Complaint Case FK или новую violation taxonomy.
- На target допускаются одновременно действующие меры. Для action `r` достаточно одного authoritative `EXISTS` по target + restriction key: мера не снята и `expiresAt IS NULL OR expiresAt > DB now`. Это минимальный способ исполнить каждую меру; отдельного aggregation store, precedence/conflict engine, merged expiry или synthetic «общей блокировки» нет.
- Пересекающийся restriction остаётся действующим, пока хотя бы одна активная мера его содержит. Изменение, lift или expiry A не снимает restriction B. Проверка hierarchy/issuer и CAS делается для конкретной изменяемой меры, не для произвольно выбранной «текущей».
- В §4 убрать ожидание выбора multiplicity; добавить обычный target lookup index и FK/join index `(measure_id, restriction_key)` с существующим PK. Ни UNIQUE active target, ни current-head pointer, ни partial index с `now()` не нужны. Существующей тройки tables достаточно.
- Admin и own поверхности показывают отдельные карточки мер с их собственными сроками и appeal state. Если A исчерпала 3 appeals, это не расходует slots B; edit A не даёт новый quota.

### AP10-PLAN-MIRA-02 — §4/6: до 3 последовательных appeals

Формулировка старого §6 «не вводить запрет одной pending» отменяется.

- На одной мере одновременно не более **одной pending appeal**; до 3 committed submissions за весь lifecycle identity. После завершения предыдущей можно подать следующую, если мера ещё действует и quota не исчерпана. Разные меры имеют независимые очереди.
- Submit: subject/session check → existing appeal-ID/fingerprint replay → exact measure lock → eligibility/expiry, отсутствие pending и committed count <3 → новый ordinal. Same retry не расходует slot; другой concurrent submit при pending возвращает typed conflict. Сохраняются unique `(measure_id, ordinal)`, CHECK ordinal 1..3; добавить partial UNIQUE `(measure_id) WHERE status = 'pending'`. В predicate только stored status, без clock.
- Pending при natural expiry effective moot, новые appeals по истёкшей мере недопустимы. Expired/lifted мера terminal; продление/возобновление не поддерживаются. Повторное наказание создаёт новую меру с отдельной identity/quota. Explicit lift закрывает pending атомарно.
- Edit действующей меры сам по себе не закрывает pending и не обнуляет quota. Resolve использует тот же measure→appeal lock order; CAS/повторное чтение предотвращают двойное решение и гонки submit/review/lift.

### AP10-PLAN-MIRA-03 — §6/7: удовлетворение с полным снятием или изменением

Старое ограничение accepted → только full lift отменяется.

- Reviewer выбирает reject, accept + full lift либо accept + изменение restrictions/срока **той же measure**. Для accept + change требовать действительное изменение, проходящее обычную валидацию срока/набора и reason; одинаковое desired state не выдавать за применённое смягчение.
- Resolve передаёт exact appeal ID, measure ID, expected current measure version и remedy payload. Pending appeal привязана к measure, а не к submit-time version: intervening edits не делают её недействительной. Reviewer оценивает актуальную версию; stale form получает conflict/refresh.
- Fresh actor authority/self-target/target+issuer hierarchy и административные restrictions применяются как к обычному change/lift. Shared **transaction-level change/lift primitive**, а не второй независимый writer: measure update, mandatory user-visible reason, appeal accepted resolution и History append в одной transaction. Reviewer explanation можно использовать как reason изменения/снятия; второй одинаковый текст не нужен.
- При accept + lift сначала зафиксировать accepted outcome этой appeal; общий lift cleanup не превращает её в moot. При accept + change эта appeal завершена, мера сохраняет ID и оставшиеся slots; другие меры не меняются. Обычный отдельный change по-прежнему оставляет pending открытой.
- Reject сохраняет меру и записывает результат/reviewer explanation. History фиксирует фактический change/lift и appealResolved в той же transaction под общим последним order lock; нет второй транзакции, двойного применения remedy или новых Complaint outcomes. Если любой append/commit неуспешен, откатываются оба результата.

### AP10-PLAN-MIRA-04 — §6/7: отдельная subject projection без личности администратора

- User-facing measure/detail/appeal/timeline DTO строится отдельной allowlist projection: measure ID, status, reasons, restrictions, даты/сроки, необходимое before/after пользовательского состояния, appeal ordinal/body/result/explanation/timestamps.
- **Не сериализовать** actor/issuer/reviewer IDs, names/labels, profile/avatar URLs, issuer rank, internal History context или raw administrative events. Это относится ко всем own loaders/actions/document/.data/fetcher responses, errors и preview props; скрыть имя только в JSX недостаточно.
- Subject timeline не возвращает общий Admin History DTO. Достаточно специализированного reader/projection существующих measure/appeal data и allowlisted change events; новый журнал не нужен. Administrative records сохраняют actor identity internally; доступ к ней только через owner/authorized internal History gate. `blocks.manage` и владение собственным аккаунтом сами по себе не дают actor-identity read.
- Не включать личность администратора даже в free-form автоматически сформированные labels/reason/result. Тексты, вводимые человеком, не дополнять служебной подписью; система не добавляет identity в пользовательский ответ. Public profile по-прежнему не получает reasons/appeals.

### Изменения acceptance matrix (§8)

Дополнительно к прежним проверкам:
1. A/B с разными и одинаковыми restrictions/сроками: new violation создаёт B, изменение/lift/expiry A не затрагивает B; overlap запрещён до прекращения последней применимой меры; quotas независимы.
2. Concurrent submit даёт одну pending и один израсходованный ordinal; identical retry возвращает прежний результат; reject/accept разрешает следующий slot только при active measure; после третьего нового submission нет. Pending A не блокирует appeal B.
3. Accept + full lift и accept + change атомарны с History и outcome, сохраняют ID/quota и не меняют другую меру. Pending переживает обычный edit; stale reviewer refresh; expiry/lift race и rollback failure. Terminal expired/lifted measure отклоняет edit/remedy; повторное наказание имеет новую identity/quota. Проверить expiry-vs-edit/review race и отсутствие History при отказе.
4. Проверить raw serialized own document/.data/action/fetcher/timeline/error DTOs на отсутствие всех actor/reviewer identity fields и nested History context; authorized internal History identity сохраняет. User reason/status/result/before-after доступны.

**Итог:** AP10-PLAN-MIRA-01..04 исправлены; прежний §9 заменён конкретной persistence/action semantics по owner decision. Новых owner вопросов нет. Last-manager правило не применяется и не переделывается; owner-role redesign остаётся после админ-панели. **Мира:** повторный coordinator review этой delta и актуального личного плана; implementation не начинать до approval.


Исходный planning handoff: https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6667784146

Принятая revision AP10-PLAN-MIRA-01..04: https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6670064497

## 10. Локальная revision AP10-PLAN-MIRA-05..06

Лёва — AP-10, только delta AP10-PLAN-MIRA-05..06 по review #6670166694 и owner correction #6670294050. Остальная принятая revision #6670064497 не расширяется.

**AP10-PLAN-MIRA-05 — terminal lifecycle (§4/6/8).**
- Natural expiry и explicit lift окончательно завершают exact measure. Change restrictions/end-time/reason и accepted-appeal remedy допустимы только пока мера active. Продлить или возобновить expired/lifted measure нельзя.
- Проверка terminal state по authoritative DB time после получения measure lock обязательна в общем transition primitive вместе с version/authority checks. Форма, открытая до expiry/lift, получает typed conflict/refresh без изменения measure, appeal outcome или History. Identical replay уже committed операции возвращает прежний результат, не возобновляя меру.
- Новое санкционное решение после завершения — новая UUID/reason/lifecycle и собственный лимит appeals. Старые measure/History/quota сохраняются; pending appeal завершённой меры effective moot. Для natural expiry остаётся read-derived status без cron/public-GET write/synthetic admin event.
- Удалены expired→future edit, materialize-moot-before-extension и соответствующие acceptance tests. Вместо них: terminal change/restriction/end-time/reason/remedy rejection для expired и lifted мер, expiry-vs-edit/review race, отсутствие новых events при отказе и новая independent identity/quota при повторном наказании.

**AP10-PLAN-MIRA-06 — explicit-grant-only (§3/8).**
- Ни `admin.users.blocks.manage`, ни `admin.users.blocks.managePrivileged` не получают initial grants **ни у одной built-in role**, включая admin/moderator.
- Обе capability явно исключаются из существующего `INITIAL_ROLE_GRANTS.admin` catalog-all seed; проверить отсутствие в остальных initial role grants. Migration не добавляет их существующим ролям/пользователям автоматически.
- Create/change/lift/review block appeals требуют explicit `blocks.manage` через существующие dynamic role grants/overrides; privileged-target capability остаётся дополнительной. Owner identity binding сам по себе не выдаёт эти capabilities и не обходит grant requirement. Принятая owner-only граница выдачи elevated key сохраняется; нового provisioning UI/bootstrap не добавляется.
- Acceptance: initial matrix всех built-in ролей, в том числе admin/moderator, не содержит обеих capabilities; прямые actions без grant denied; явный grant даёт только предусмотренные полномочия, revoke убирает их со следующего request. Фикстуры явно выдают права нужным actors, а не полагаются на built-in role name.

**Мира:** повторно проверить только AP10-PLAN-MIRA-05..06. Implementation не начат; code/DB/production не менялись. Last-manager и post-admin owner-role redesign не затронуты.


Последняя delta для повторного coordinator review: https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6670909257

# Лёва — AP-10: технический план мер, restrictions и block appeals

Planning baseline: `main` `5cf80f38cbc06ed733a0618e706eb80c5a7b3c7b`; migrations 0000–0057, Admin Panel AP-01–09 merged.
Назначение: [#6667343744](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6667343744).
Статус: план для coordinator review; **код/implementation PR не создавались**. Revision AP10-PLAN-MIRA-01..04 выполнена по решениям владельца #6669655343/#6669734702; требуется повторный coordinator review. Прежний §9 закрыт, новых owner product blockers нет.

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

- обычная capability **`admin.users.blocks.manage`**: minimal target/measure lookup, create/change/lift и review block appeals; initial moderator/admin grants;
- повышенная **`admin.users.blocks.managePrivileged`**: дополнение к manage, не отдельная mutation/read authority; initial grants **никому автоматически**. В `INITIAL_ROLE_GRANTS.admin` её явно исключить из нынешнего «все catalog keys» seed;
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

Active вычисляется по authoritative DB time: explicit lift отсутствует и `(expiresAt IS NULL OR expiresAt > now)`. Expiry не требует cron, public GET write или synthetic admin event. UI и policy читают effective expired status; pending appeal при истёкшей мере возвращается как moot, даже если stored row не переписан фоновым процессом. При explicit lift pending rows закрываются атомарно; при edits остаются привязаны к той же measure. Не создавать WHERE-index с `now()`.

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

Appeal submit: session subject == measure target, exact measure eligible по activity/status, число committed submissions <3. Measure lock сериализует quota; caller-generated appeal id позволяет identical retry без расхода ещё одной попытки. Одновременно на measure не более одной pending appeal: measure lock и partial UNIQUE по measure_id WHERE status = 'pending'. После завершения предыдущей следующая допустима только при active measure и оставшемся quota. Expired pending при продлении не возобновляется: перед продлением материализуется moot под measure lock. Изменение measure не обнуляет ordinal/quota и не превращает старый appeal в appeal новой версии.

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
- Pending при natural expiry effective moot, новые appeals по истёкшей мере недопустимы. Если срок expired меры меняют на будущий, ранее утратившая предмет appeal не «оживает»: до продления под measure lock материализовать её moot status без synthetic admin event; её ordinal остаётся израсходованным. Это уточнение уже принятого expiry lifecycle, не дополнительный workflow. Explicit lift закрывает pending атомарно.
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
3. Accept + full lift и accept + change атомарны с History и outcome, сохраняют ID/quota и не меняют другую меру. Pending переживает обычный edit; stale reviewer refresh; expiry/lift race и rollback failure. Expired→future edit не воскрешает moot appeal.
4. Проверить raw serialized own document/.data/action/fetcher/timeline/error DTOs на отсутствие всех actor/reviewer identity fields и nested History context; authorized internal History identity сохраняет. User reason/status/result/before-after доступны.

**Итог:** AP10-PLAN-MIRA-01..04 исправлены; прежний §9 заменён конкретной persistence/action semantics по owner decision. Новых owner вопросов нет. Last-manager правило не применяется и не переделывается; owner-role redesign остаётся после админ-панели. **Мира:** повторный coordinator review этой delta и актуального личного плана; implementation не начинать до approval.


Исходный planning handoff: https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6667784146

Последняя revision delta для повторного coordinator review: https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6670064497

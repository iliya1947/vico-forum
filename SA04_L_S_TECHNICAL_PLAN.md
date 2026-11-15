# SA04-L–S — полный технический план оставшейся цепочки

Лёва · 2026-11-15 · **планирование, не реализация**. Передача Мире для scope/fit review; ни один implementation slice этим текстом не активирован.

**До принятия всего плана Мирой, включая явное уточнение R transaction boundary, L implementation не назначать.**

Baseline: **`main=6652c898067d05a7c1476377e95f50cd73937410`**, подтверждённый merge #332; reviewed K head `a610ea89447744f4f3946dfc6e59b4b01d9ad65a`. A–K доставлены. Принятый SA04 master [#6806249892](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6806249892) сохраняет продуктовую модель. Этот план конкретизирует **все L, M, N, O, P, Q, R и S вместе**, а не только ближайший L. Рабочий канал #331; #251 — архив/источник принятых anchors.

## 1. Результат, неподвижные контракты и зависимости

После L–R fixture-deactivated/missing actor не получает новый authoritative command commit, receipt/replay success, private mutation result или новый generation plan через доверенный direct/service/HTTP writer. Active actor сохраняет прежние права и domain semantics. S соединяет это с уже доставленными I/J/K и neutral projections A–H на одном принятом состоянии.

AccountState — **дополнительный predicate актора**, не замена Owner binding, raw RBAC, AP10, resource membership, CAS, quota, input/Origin или History. Shared `db/account-state.ts` и полный tuple validator переиспользуются; новый lifecycle flag, actor field в браузерной форме или policy framework не нужен. У Owner нет lifecycle exemption. Правило последнего администратора/manager count/recovery не вводится. Target inactive не запрещает сам по себе разрешённую операцию другого active actor; новые target-lifecycle veto не добавляются.

SA04 не содержит deactivate endpoint/control/event, reactivation, hard delete/purge, forced logout, credential/provider changes, production migration/deploy или новых Monitoring областей. SA05 остаётся заблокирован. Existing state/retention schema и auth session semantics не переписываются. Новых schema/migrations/dependencies/grants/permission keys для L–S по проверенному inventory не требуется.

| Пакет | Реальные зависимости и общий seam |
|---|---|
| L | A/shared state + I/request identity; один native `authz_mutation_lock`, общий с M |
| M | A/I + сохранённая L/authz serialization; AP10 target/issuer authority и History |
| N | A/I + J content/notification locks и K retained evidence/cleanup |
| O | A/I + current healthy LocaleRegistry; тот же user row, что auth/profile/Privacy |
| P | A/I + F/J heartbeat и существующий Privacy subject lock |
| Q | A/I + exact Owner + registration singleton/CAS/History; L writer остаётся отдельным |
| R | A/I + J/N content dependencies + existing translation head/task/budget protocol; foreground actor отличается от background task identity |
| S | Все A–R; единая direct/native/HTTP/browser acceptance, затем whole-PR gates и отдельный documentation closeout |

Порядок поставки: **L → M → N → O → P → Q → R → S**. Независимость части Settings не превращает это в разрешение параллельной реализации. Cross-package contracts ниже фиксируются сейчас; при последующем refresh main обновляются locator/fixtures, а не придумывается новая архитектура.

## 2. Полный authoritative inventory и callers

AST/body/caller inspection дал **24 authoritative writer entrypoints L–R**: 6 + 5 + 8 + 1 + 1 + 1 + 2. У R дополнительно три action-capability входа и два planner входа; они перечислены отдельно, не считаются двумя дополнительными persistent writers. Read-only/system helpers не маскируются под пропущенные пользовательские writers.

| Пакет / authoritative source на baseline | Полный набор входов | Доверенный путь вызова |
|---|---|---|
| L — `db/authorization-repository.ts:181–302`, общий `mutate:355` | `createCustomRole`, `renameCustomRole`, `replaceRoleGrants`, `deleteCustomRole`, `assignUserRole`, `setUserOverride` | Settings Forum & roles, Roles, canonical-profile controls → единственный `app/routes/authorization-admin.tsx` action → `AuthorizationService` → `createHyperdriveAuthorization` → native repository |
| M — `db/user-measures.ts:164–335,449` | `create`, `change`, `lift`, `submitAppeal`, `resolveAppeal`; change/lift используют `transition` | `admin-measures.tsx` create; `admin-measure.tsx` change/lift/review; `account-measure.tsx` own appeal → `UserMeasureCapability` / Hyperdrive → `UserMeasuresService` → native repository |
| N — `db/complaints-repository.ts:109–335` | `savePrioritySettings`, `changePriority`, `activity` (start/renew/end), `submit`, `addNote`, `decide`, `appeal`, `resolveAppeal` | complaint-submit / priority-settings / triage / activity / review / result / appeal-review routes → четыре existing submission/queue/review/appeal capabilities → `ComplaintsService` → один Drizzle repository |
| O — `db/hyperdrive-user-locale.ts:20` | `UserLocaleWriter.save(actorId, locale)` | `settings-user.tsx` action → userLocaleWriterContext → native atomic UPDATE |
| P — `db/user-privacy.ts:38` | `DrizzleUserPrivacyRepository.save(actorId, showOnline)` | `settings-privacy.tsx` action → userPrivacyContext / Hyperdrive → Drizzle repository |
| Q — `db/registration-settings.ts:61` | `PostgresRegistrationSettingsRepository.update(actorId, ownerBinding, input)` | `settings-forum.tsx` registration action → registrationSettingsContext / Hyperdrive → native repository |
| R — `db/content-topic-title-task-store.ts:87`, `db/content-post-body-task-store.ts:87` | оба `upsertPending` — fresh/duplicate/current-processing/stale-reactivation/head-generation/budget ветви | topic action generation intents → `DefaultContentGenerationActionCapability.generateTopicTitle / generateAutomaticPostBody / generateExplicitPostBody` → title/body `planAndDispatch` → соответствующий store → commit → enqueuer |

Для N отдельно сохраняются permissions: create/review/appeal-review/priority-manage и независимый identity read. Participant `appeal` намеренно не требует create/review permission и не получает новый AP10 veto. `activity(false)` — такой же user command, как renewal, а не system cleanup.

Вне новых gates: read-only role/user/measure/Complaint/settings readers под существующим request admission; server-owned notification fanout в уже допущенной domain transaction; append helpers и immutable retained evidence; UI translation self-healing/internal jobs; content translation consumers/publication/reconciliation/expired-counter cleanup; attachment cleanup/public files. Не ставить guard внутрь общих History, budget или low-level task-consumer helpers. Не делать inactive recipient/affected author запретом активному reviewer/manager.

## 3. Общий transaction, errors и replay контракт

1. Native pg вызывает `assertActiveAccountForMutation(client, actorId)`, Drizzle — `assertActiveAccountForDrizzleMutation(tx, actorId)`. Это **тот же connection/transaction**, что защищённые writes; никакого pool-level SELECT вместо tx и никакого второго connection для authoritative check.
2. Новый actor lock — сразу **FOR NO KEY UPDATE** до COMMIT/ROLLBACK. Existing более сильный Privacy FOR UPDATE сохраняется и переиспользуется на том же tx; не вводить SHARE→UPDATE или NKU→UPDATE upgrade для обычных actors. FK KEY SHARE других пользователей должен оставаться совместимым с actor NKU.
3. State-first commit до admission → typed denial и отсутствие новых durable effects. Writer-first actor lock → короткая допущенная transaction может commit раньше state change; следующий command/replay откажет. На network, browser, hashing, provider или enqueue actor lock не держится.
4. Known inactive/missing на writer boundary → безопасный **401**. Submitted stale-account expectation остаётся **409**; validation/resource/domain conflict/permission statuses сохраняются. В Settings writer-missing — lifecycle denial; existing read-only missing-account handling не переписывается. Owner/non-Owner и malformed input могут fail closed раньше lifecycle guard; запрещён именно успешный обход guard.
5. Lifecycle проходит **до успешного replay/no-op/private result**. Existing active replay сохраняет свою прежнюю precedence перед AP10 fresh-write checks/CAS там, где она уже существует. Не превращать повтор в новую operation, не добавлять History/notifications/quota/timestamp refresh.
6. Typed `AccountStateUnavailableError`, включая bare typed error и cause chain, классифицируется как existing domain unavailable/503. В existing L/M/N/P/Q/R availability classifiers добавить recognition typed state failure и bounded cause traversal; O аналогично сохраняет native transport/query-timeout classification. Unknown schema/programming/tuple/invariant errors остаются generic500, не false guest/401/403/503.
7. Existing HTTP mappers: authorization action; `app/measures/routes.server.ts`; Complaint submission и `app/complaints/queue.server.ts` command/read helpers; O/P/Q Settings actions; generation branch `app/forum/actions.server.ts`. Known lifecycle401 использует existing private unauthenticated Response/error-boundary path, либо уже существующий typed `unauthenticated` result (M/Complaint submission). Не вводить новый success/error vocabulary ради внутреннего guard. Не расширять UI catalog без реальной нужды.
8. Protected response/error document + data/no-store, status/cookies/Origin сохранены. K Worker fallback уже защищает unexpected failed writes; его URL matching не расширяется на весь форум. Реальные unexpected500 каждого нового writer path проверяются; headers export сам по себе не считается proof. No raw lifecycle tuple/actor inputs/SQL/token/private case data в responses.
9. Existing user-visible operations/nonce сохраняются после отказа; никакого автоматического POST retry. Session/permission recovery использует текущие bounded GET/revalidation paths. Локальные device preferences не становятся server commands и не получают новый DB lifecycle writer.

## 4. L — authorization mutations

В `PostgresAuthorizationRepository.mutate`: BEGIN → existing `authz_mutation_lock FOR UPDATE` и проверка его наличия → **actor shared guard** → fresh effective `access.authorization.manage` + `canMutateAuthorization` + existing AP10 `admin.usersAccess` → dispatch одной из шести операций → optional final History append → COMMIT.

Shared mutex остаётся первым. Guard стоит перед dispatch и всеми operation no-ops: identical rename/grants/explicit assignment/override не являются обходом lifecycle. History role/user KEY SHARE остаётся после actor: он совместим с NKU, а competing L/M domain writes уже сериализованы shared mutex. Не менять built-in/custom rules, elevated-key checks, raw deny/allow/inherit, роль Owner, assignment semantics и deleted-role history labels. Active Owner по-прежнему может сохранить raw deny самому себе и продолжать работать; fixture-inactive Owner не может выполнять mutation даже с catalog-wide effective permissions.

Adapter/service не подменяют repository guard. Canonical action возвращает late lifecycle401 без `ok`, unavailable503, unexpected500; Settings/profile не получают второй writer. No-op/history/revoke/recovery tests остаются содержательными.

**Acceptance L:** все6 direct writer families active/inactive/missing; no-op branches и replay-equivalent повтор; фактические raw tables + History before/after; missing/invalid binding/non-Owner/elevated checks; state-first/writer-first/rollback; actual waiting `authz` mutex с deactivation до release; L↔M shared mutex, L↔auth/profile/locale/Privacy actor row; genuine Owner HTTP из Settings и profile assignment/override + no auto POST recovery.

## 5. M — AP10 measures и точные appeals

В существующий `withLockedTransaction` передаётся **обязательный trusted actorId** для всех5 методов. BEGIN → `authz_mutation_lock FOR UPDATE` → **actor shared guard** → существующая operation. Guard нельзя поставить только в `withAuthorityTransaction`: own `submitAppeal` идёт через `withLockedTransaction` и должен работать без Owner binding для active subject.

Дальнейший прежний порядок сохраняется: target user KEY SHARE → exact measure FOR UPDATE → соответствующий appeal row/History receipt → existing authority, terminal/version/quota checks → effects → final History. Новый actor NKU перед target KEY SHARE совместим с ним; self-subject appeal переиспользует собственную строку без lock upgrade. Все measure writers используют один authz mutex; не добавлять actor-guard после History advisory lock.

- `create`: activity нужна до committed create replay, в том числе уже expired/lifted measure. Fresh create сохраняет authority/floor/restriction/expiry и один History event.
- `change/lift`: guard до `committedOperation` success; matching replay сохраняет прежний результат, active no-change change не пишет History. Strict CAS, exhausted version, DB-clock expiry, issuer floor, explicit lift/moot остаются прежними.
- `submitAppeal`: active subject + exact ownership; guard до matching appeal-ID result. Три sequential slots/один pending, body/ID conflict и отсутствие punitive appeal restriction сохраняются.
- `resolveAppeal`: guard до History operation replay и любого accepted/rejected status write. Accepted status/remedy/shared transition/moot handling/History остаются одной transaction; failure откатывает всё.

Не запрещать управление inactive target из-за его lifecycle, не менять самозапрет/Owner-target запрет, strict raw rank, Owner measure immunity, сохранённые старые measures или permission catalog. Не путать existing `assertActive(client,current)` **меры** с новым AccountState check **актора**.

**Acceptance M:** все5 входов и active no-op/replay после termination, mismatched operation conflict; inactive/missing сохраняют measure/restrictions/appeals/History целиком; обе state orders, COMMIT/ROLLBACK и authz-lock wait; create/change/lift/review interleavings и quota; subject=actor lock reuse; Owner lifecycle vs measure immunity; native L grant/override↔M authority serialization; HTTP create/change/lift/own appeal/review на genuine sessions, protected no-store401/503/500.

## 6. N — Complaints: восемь commands и конкретная content dependency

Заменить реализацию existing `actorMutex` на unconditional shared Drizzle guard **в той же transaction**; не добавлять второй mutex/connection. Он уже вызывается семью commands. В восьмой — `savePrioritySettings` — вызвать его до `measureAdmission` и full-map CAS UPDATE. Readers остаются под нынешними service/request guards.

| N path | Порядок и ветви, которые обязан закрыть guard |
|---|---|
| `submit(topic-title)` | topic FOR UPDATE → actor → exact-operation replay / current-revision / target / lifetime duplicate → fresh measure/quota → Case/ref/report/event |
| `submit(post)` | **topic KEY SHARE → post FOR UPDATE → actor** → те же ветви; подробнее dependency proof ниже |
| `changePriority` | actor → Case FOR UPDATE → replay → existing measure/state/version → override/version/event |
| `activity(true/false)` | actor → measure → Case FOR SHARE → activity row → lease; event только на реальном review-start transition |
| `addNote/decide` | actor → Case FOR UPDATE → replay → existing checks → atomic note или Decision/Case/event/notification writes |
| `appeal/resolveAppeal` | actor → Case FOR UPDATE → replay → participant/policy или reviewer checks → exact Appeal/event/notification writes |
| `savePrioritySettings` | actor → existing measure check → full-map singleton CAS UPDATE; прежний version increment, без придуманного no-op/History |

**Подтверждённая planning dependency N-DEP-01, baseline native PG17:** два реальных `DrizzleComplaintsRepository.submit` одного active actor о post и title одной темы. Post transaction удерживает actor NKU, title transaction удерживает topic FOR UPDATE и ждёт actor, затем post target INSERT требует topic FK KEY SHARE. Воспроизведён **40P01**; в той же диагностике добавление topic KEY SHARE внутри post transaction до остальных dependencies даёт два COMMIT. Source не патчился; control — диагностический same-transaction запрос. Это существующий post-K путь N, не новый finding в принятом K.

Поэтому N1 включает **локальный existing topic dependency перед post/actor**, как уже принято для fresh J edit. Не проверять closure как запрет Complaint, не менять target/revision/evidence semantics и не лечить это generic retries/global serialization. Документированное content→actor правило сохраняется: topic FK входит в content dependencies. Baseline/control/physical-blocking evidence сохранены в `complaint-content-lock-probe.{mts,json,log}`. Implementation regression обязана вызвать реальные post/title Complaint commands и J edit/title/source-locale paths в обеих очередностях; diagnostic control не является implementation PASS.

Все successful duplicate/replay branches закрываются actor gate, но active matching retry по-прежнему возвращает исходное после edit/new AP10 restriction и не расходует report budget. Participant appeal остаётся без нового measure veto, eligibility/side/quota сохраняются. Resolved Case допускает notes как раньше. Lease end от inactive отказывает; local page stop не обещает remote commit, existing 90s expiry обеспечивает eventual disappearance без нового cleanup-on-deactivate.

Decision/Appeal notifications создаются для настоящих retained recipients даже если кто-то inactive; это side effect active command, не действие inactive recipient. FK KEY SHARE recipients совместим с actor NKU. Immutable evidence, operation fingerprint/event identity, Case version, independent totals, identity permission и separate Quick actions/J writer не меняются. Complaint events не становятся Admin/Owner audit copies.

**Acceptance N:** все8 direct входов, start/renew/end activity, existing exact/lifetime duplicates, no-op-like replay, note после resolution, initial Decision, eligible participant Appeal и reviewer resolve; state-first/writer-first для каждой authoritative boundary; no new target/Case/evidence/report/event/lease/notification/quota effects при denial; save-priority CAS rollback. Native N-DEP-01 closure, N↔J content edits/locale correction, Case contention/reviewer fanout с тем же/разными actors, K evidence/cleanup claim fence. HTTP routes и mounted genuine session report/triage/review/result/appeal controls сохраняют nonce/input, не обещают success и не auto-retry; privacy401/503/unexpected500.

## 7. O, P, Q — три distinct Settings writers

### O — own locale atomic write

В `createHyperdriveUserLocale.save` сохранить **один atomic UPDATE** и добавить shared active SQL predicate: `WHERE id=$actor AND deactivated_at IS NULL RETURNING id`. Actor приходит только из session; valid canonical active locale/healthy registry проверяются прежней route. Native SQL строится из shared predicate через существующий Drizzle SQL/PgDialect path с bind-параметрами; второй самостоятельный lifecycle predicate не изобретается. Никакой UPDATE, выбранный по `expectedUserId`, не появляется.

UPDATE сам сериализуется с state mutation на user row. Если state-first, PostgreSQL после ожидания проверяет committed row predicate и не обновляет locale/updatedAt; если locale-first — он может commit до deactivation. Для zero RETURNING выполнить shared read на том же client и классифицировать inactive/missing; невозможное active+zero result — unexpected invariant, не fabricated success. Этот read не авторизует запись и не заменяет predicate. CHECK уже обеспечивает persisted full-tuple validity; отдельный новый lifecycle parser не нужен.

Late lifecycle401 не даёт303/localeSaved. Клиентский mismatch по `expectedUserId` остаётся409 до writer; invalid/degraded registry остаются400/503 без save. Theme/editor/device preferences не синхронизируются сервером. Actual same-locale update сохраняет прежнюю timestamp policy, но не получает lifecycle bypass.

**Acceptance O:** native active/inactive/missing, same-locale attempt, обе blocking state orders на user row; locale и updatedAt facts неизменны на denial; outage/unexpected distinction; route healthy canonical/alias/inactive/degraded registry и stale identity; mounted Save после fixture deactivation, отсутствие false redirect/автоповтора, subsequent locale negotiation у unrelated active account.

### P — Privacy under existing subject lock

Сохранить `lockPrivacySubject` и его **FOR UPDATE**: он уже общий для Privacy и F/J heartbeat. В `DrizzleUserPrivacyRepository.save` после его acquisition вызвать shared Drizzle guard на том же tx; stronger existing lock уже удерживается, upgrade/второго connection нет. Не помещать новый throw-policy глобально в shared low-level helper. Writer-specific missing-account handling переводится в lifecycle denial; read-only прежняя missing-account semantics не расширяется.

Guard предшествует preference UPSERT и presence DELETE, включая repeated ON/OFF. Inactive попытка не стирает preference или presence под видом cleanup. Active OFF атомарно сохраняет настройку и удаляет собственную presence, repeated OFF тоже очищает stale row; ON не создаёт activity. Default missing preference=ON, 45s throttle/5min online window и отсутствие personal History сохраняются. Public SQL уже исключает inactive/hidden до COUNT/LIMIT; не переписывать F/J.

**Acceptance P:** native ON/OFF/repeat, missing/inactive no-op-like save без changes; both state orders, FOR UPDATE reuse без нового lock upgrade; OFF↔heartbeat и ON↔heartbeat в обеих очередностях, privacy↔auth/profile/locale того же actor, unrelated actors; real Settings/private document/data + late401/503/500, local account-switch isolation; retained preference и отсутствие fabricated online.

### Q — active Owner registration update

Existing exact `isBoundOwner` check/validation → BEGIN → **shared native actor guard вместо нынешнего unlocked existence SELECT** → singleton FOR UPDATE → expectedVersion → current-value no-op или increment/flags → final same-tx `settings.registrationChanged` History → COMMIT.

Guard до no-op/CAS success, actor lock до singleton согласуется с собственными Settings/auth paths. Два flags независимы, оба false допустимы, invalid/missing singleton не fallback. Missing/invalid binding/non-Owner denied, даже если есть raw role grants. New registration policy admission/read/current auth callbacks не превращаются в user commands и не получают guard для несуществующего нового пользователя. Existing account sign-in/link не отключаются flags. No new registration/lifecycle event type.

**Acceptance Q:** active changed/no-op/stale/exhausted-version; inactive/missing exact Owner с unchanged flags/version/History; state-first/writer-first и singleton wait с preflight-прошедшим request; History-failure rollback; concurrent settings CAS; runtime signup/Google-create policy controls и existing signin/link не регрессируют; genuine Owner HTTP late401/503/500, no automatic POST replay.

## 8. R — foreground generation admission и сохранённый background protocol

### R1. Trusted actor без persistent identity changes

Передать **обязательный server actorId** по трём action capability → двум `planAndDispatch` → двум `upsertPending` через отдельный server-only аргумент/typed invocation context. Не класть его в persisted task specification, task identity/fingerprint, generation head key, budget subjectKey, enqueue message, log или DTO. Optional/default Owner/noop admission для production store запрещены. Все callers, test doubles и исторические fixtures обновляются явно.

HMAC requester pseudonymizer и `ContentTranslationRequestBudgetAdmission` остаются прежними. Actor нельзя восстанавливать из pseudonym. Plain infrastructure `consume*Budget`, task consumers и UI `TranslationTaskStore.upsertPending` не получают пользовательский lifecycle parameter.

### R2. Точное место authoritative guard

В каждом content `upsertPending` сохранить existing единый lock protocol:

`generation head → stable task → current topic/post → immutable current revision → current translation → actor NKU → global budget → requester budget → task/head generation effects → COMMIT`.

Guard ставится после существующих dependencies, до budget consumption, accepted existing-task return, stale/reactivation/task metadata INSERT и head-generation UPDATE. Current revision mismatch может fail closed раньше guard; ни enqueue, ни durable effect из такого no-work rollback не возникает. Current translation/task-completed success/no-op decisions на этом authoritative path не должны обходить guard.

**Существенное implementation-уточнение общего master:** текущий store материализует отсутствующий generation head через `INSERT ... ON CONFLICT DO NOTHING` **внутри ещё незавершённой transaction**, чтобы получить её existing mutex. Этот provisional lock-initialization INSERT может предшествовать actor; при lifecycle denial он обязан полностью откатиться вместе со всем plan. Он не является отдельно committed/admitted head. Установка actor перед head/content ради буквального порядка statements создаёт обратный порядок с J/N content→actor и не допускается. Нельзя ради этого создавать второй committed head-init tx или новый global/advisory protocol. Master-гарантия «до generation mutation» здесь означает отсутствие **допущенного durable generation effect без actor admission**, а не автономность mutex scaffolding. Это явное техническое уточнение данного complete-chain plan для Mira acceptance, не разрешение автору самостоятельно менять lock architecture позже.

Нативный **диагностический** control на current title store + shared native guard на том же connection после content dependencies подтвердил: state-first откатывает provisional head, tasks и budget counters **0/0/0 → 0/0/0**; writer-first удерживает actor до COMMIT, fixture state UPDATE получает physical lock timeout, после release plan commit даёт **1 head /1 task /2 counters** и state change проходит. Existing source store не патчился; guard вводился только diagnostic query seam. Первый diagnostic matcher ошибочно ожидал unwrapped lifecycle exception; после учёта `DrizzleQueryError.cause` контроль прошёл. **Это проверка направления/atomicity, не реализация R и не runtime acceptance body store.** Author tests обязаны подтвердить оба production stores и native/cross-writer races без diagnostic substitution.

Completed/pending/processing/stale identities, A→B→A generation order, source-locale revision CAS, manual-result precedence, task claim/lease/allowance и existing per-attempt budget policy сохраняются. Inactive duplicate не получает queued/task result или budget cost. Failed guard/unknown COMMIT не выводят отсутствие accepted job из transport failure. Final guard outside prepared-query wrapper сохраняет typed lifecycle errors; existing cause-aware availability mapping не теряется.

### R3. Preflight, pure no-job branches и dispatch

`createHyperdriveContentGenerationAdmission.assertAllowed` получает короткий same-tx lifecycle guard вместе с прежним AP10 preflight. Canonical topic action сохраняет effective `forum.translation.generate`, runtime-enabled, Origin/input/resource и admission checks. Для трёх direct `DefaultContentGenerationActionCapability` методов обязательная existing-style admission dependency выполняется также перед ранним `explicit-required`; нет permissive default. При production Worker runtime остаётся **disabled**.

Planner input содержит trusted actor даже для no-work ветви. Pure invalid/ineligible/source-unresolved/same-locale/no-translatable-content/translation-current checks вне persistent planning не создают job/head/budget и не выдаются за admitted generation. В action/direct capability они предварены lifecycle preflight; успешный persistent upsert всё равно требует своего unconditional guard. Не держать DB lock на HMAC, detector/Markdown/specification hashing, provider capability lookup или queue.

Existing `translations.generate` restriction остаётся своим preflight policy с Owner measure immunity; R не вводит незаявленную новую transaction-time AP10 rule для всех task consumers. Lifecycle race закрывается дополнительно в store. После **admitted task COMMIT** enqueue может произойти уже после state change: это доставка принятой работы, не новый user plan. Accepted task consumers/reconciliation/provider publication продолжаются по нынешним source/policy/claim fences, без actor lookup. Не отменять их из-за deactivation, не добавлять actor column или cleanup-on-deactivate.

**Acceptance R:** оба stores active/inactive/missing, fresh/pending duplicate/processing claim/stale A→B→A/completed/manual-current/no-work, unchanged task/head/counter/claim/allowance facts на denial; true state-first после preflight/dependency waits и writer-first through COMMIT/ROLLBACK, including first-head rollback; same actor/different units и different actors/same unit; R↔J edit/title/locale correction, R↔N content locks, R↔conditional consumer publication/reconciliation и budget competition. Canonical три intents + direct capability/preflight401/503/unexpected500/private; body auto-threshold3000 сохраняется. Commit-before-enqueue/lost ACK/failing enqueue/late admitted delivery доказаны. Уже принятая task продолжает работу после fixture state change. Исторические tests current writer получают current active tuple/migration0065 в fixture, без переписывания accepted migrations или обхода guard.

## 9. Общая lock/race карта и ограничения будущего state writer

| Path | Lock order до final History/COMMIT |
|---|---|
| L | authz singleton → actor NKU → role/target KEY SHARE / authz writes → **History ordering lock last** |
| M all5 | authz singleton → actor NKU → target KEY SHARE → measure UPDATE → relevant appeal → effects → **History last** |
| N post submit | topic KEY SHARE → post UPDATE → actor NKU → target/Case/asset refs → event |
| N title submit | topic UPDATE → actor NKU → target/Case → event |
| N reviewer/participant commands | actor NKU → Case (UPDATE/SHARE) → appeal/activity/effects → event/recipient FK KEY SHARE |
| N priority settings | actor NKU → settings CAS UPDATE |
| O | atomic active-predicate user UPDATE; zero-row classification read даёт только отказ |
| P / existing heartbeat | user FOR UPDATE → preference → own presence; P shared validator reuses held user lock |
| Q | actor NKU → registration singleton UPDATE → History ordering lock last |
| R | head/task/content/revision/translation dependencies → actor NKU → budgets → generation effects |
| J/K dependencies | existing draft/content/journal dependencies → actor; новое L–R не требует обратного acquisition |

History global ordering advisory lock всегда final: после него не брать actor/domain lock. Existing FK locks на чужие user rows — KEY SHARE, не новые FOR UPDATE для target/recipient. Не ставить lifecycle gate на append/notification side effects и не вводить глобальную сериализацию всех пользователей.

Cross-tests обязательны по фактическим edges, не только generic exceptions: L↔M grant/authority; N↔J post/title/revision и notification fanout; P↔F/J heartbeat/auth/locale; R↔J/N/consumer; shared same-actor и independent-actor controls. Native `pg_blocking_pids`, after-lock/before-COMMIT barriers и persisted facts подтверждают causal order; sleep/poll readiness не доказательство transaction ordering.

Future SA05 state writer в этих tests — только fixture UPDATE target tuple в короткой transaction. Она не получает обратных authz/head/content/case locks; не создаёт новый endpoint/event/control. Его полноценный Owner command/event/presence/retention план остаётся будущей совместной SA05–SA08 работой. Нынешний план фиксирует seam, не реализует SA05.

## 10. S — полная связанная acceptance A–R

S не добавляет новые permissions/schema/политику. Его matrix строится по manifests всех authoritative входов, а не по последнему изменённому файлу.

1. **Direct/native coverage:** все24 L–R writers, обе R action families, все I auth target-writes/session paths, J forum writers и семь K entrypoints; active, inactive, missing, replay/no-op/CAS, state-first/writer-first/rollback. У каждого denial проверяются реальные domain tables/History/events/notifications/presence/budgets/heads/tasks/refs, не только exception. Owner lifecycle отдельно от RBAC/measure immunity.
2. **Genuine sessions:** built Worker → Better Auth → full disposable PG17 → Chromium, два старых session/browser contexts + unrelated active account. Mount protected forms до fixture deactivation; новые requests I отказывают, already-passed preflight requests отказывают на actual writer boundary. Проверить signout exception, email sign-in/session create/direct auth API, controlled unavailable503/recovery и unexpected500; bearer/session fields не сериализуются.
3. **L–Q connected matrix:** canonical Owner authz from Settings/profile, AP10 manager create/change/lift/appeal/review, все Complaint surfaces including activity/priority/participants, own locale/Privacy, Owner registration flags/CAS/no-op. Настоящие HTTP calls/services/DB, nonce и actual persisted outcomes; запрет auto POST retry и account switch isolation. Active controls работают по прежним permissions/hierarchy.
4. **R connected matrix:** production runtime disabled503 сохраняется. В **test-only local composition** разрешён тот же real action/planner/PostgreSQL store с deterministic supported local provider/enqueuer seam, чтобы проверить три generation intents и transaction race; не заменять store mock и не подключать real Queue/provider credentials. Guard/commit/enqueue/accepted consumer continuation проверяются отдельно. Fixture injection не объявляется Stage6 activation.
5. **Public/retained composition A–H/K:** distinct secret-marker name/image/bio/links, guest HTML **и .data** profile/content/discovery/directory/notifications/history не получают старую public identity; mentions/online исключают inactive до LIMIT/count; опубликованные content/attachment bytes и Complaint evidence refs сохраняются. Authorized Owner/private audit data остаётся retained под своими guards; не переписывать Markdown/free text/filenames.
6. **Mounted editor/Settings:** existing J/K late401, File/text/history/selection/Remove/Cancel/stable retry сохраняются; stale forms не дают saved/queued/publication claims и не отправляются автоматически. Existing SA03 viewer-change/private-DOM regressions и EN/RU/HE/RTL/responsive затронутых surfaces входят в connected sweep, а не owner visual/deployed acceptance.
7. **Fault/cache:** real route-owned401/503 и unexpected500 для каждого доменного writer/canonical path; no raw SQL/state/keys/private details, private/no-store документ/data/action. Source fault не становится auth denial, lifecycle denial не становится500, session outage не становится guest success. K alias regression остаётся в общей матрице.
8. **Stable acceptance state:** full applicable native/application suites + lint/typecheck/build/UI build, migration history/check/production manifest/runtime privilege checks и existing AP10/SA01/SA03/J12/K5 regressions на одном exact implementation state. Публикуются только реально выполненные counts/results. New tests не требуют real production R2/OAuth/provider resources.

**Известная CI оговорка:** Drizzle0.31.10 generate сейчас печатает BigInt TypeError/exit0 и Actions schema-parity step false-green на идентичных main/K inputs. Нельзя называть его substantive parity PASS. L–S не меняют schema/migrations/dependencies; clean PG/manifest/constraints проверяются реально, оговорка переносится в evidence. Если реализация неожиданно требует schema/public-contract change или gate gap делает нужное новое schema evidence недоказуемым — technical escalation до расширения scope, а не generated-drift workaround в этой цепочке.

S AUTHOR STOP → Mira whole-PR coordinator review → independent Lev same-head technical review → Owner merge. Permanent/factual documentation, PROJECT_STATE и history обновляются **отдельным PR в closeout**, а не в implementation PR или заранее в этом planning turn. Только после полного SA04 acceptance/closeout возможен следующий approved маршрут: совместный полный технический план **SA05–SA08 до SA05 implementation**.

## 11. Исполнимая bounded decomposition и handoff gates

L/M/N/O/P/Q/R/S — bounded-срезы **одного верхнеуровневого пакета SA04**, а не самостоятельные merge-units. Author checkpoints ниже сохраняются и могут проходить bounded-проверку на стабильном head, но между L/M/N/O/P/Q/R **нет Owner merge и refresh-main gate**. Один cumulative Draft implementation PR должен накапливать пакет до S; только после S AUTHOR STOP выполняются финальные Mira whole-SA04 review → Lev independent same-head review → Owner merge.

Историческое исключение уже произошло: L был отдельно merged в #333 до исправления этой delivery-boundary. Его не откатываем только ради процессной ошибки; он становится частью текущего main-базиса. Для оставшегося SA04 создаётся один cumulative Draft **M→N→O→P→Q→R→S**, который не merge до полного S closure. Это исправляет только delivery/merge boundary и не меняет принятые L–S технические контракты.

| Slice | Один проверяемый результат / обязательное evidence |
|---|---|
| **L** | Один shared native tx gate закрывает все6 authz families + canonical late errors; no-op/raw Owner/History/mutex/race и genuine HTTP controls. STOP для whole-L review. |
| **M1** | Mandatory actor в existing locked transaction и gates всех5 measure/appeal paths; full native facts/replay/authority/quota/state-order matrix. |
| **M2** | HTTP/mapper/connected AP10 integration и whole-M closure; без нового target policy. STOP. |
| **N1** | Submission exact/lifetime replay/quota/lifecycle + подтверждённая topic FK dependency и actual post/title/J cross-race regression; retained evidence unchanged. |
| **N2** | Note/Decision/priority/activity/settings active gates и atomic effects/fanout/native races. |
| **N3** | Participant/reviewer Appeal gates и full canonical connected whole-N closure, privacy/errors/nonce. STOP. |
| **O** | Atomic own-locale active predicate + zero-row/error mapping и native/Settings proof. STOP whole-O. |
| **P** | Privacy same-held-lock gate + existing heartbeat/prefs/presence composition, native и Settings proof. STOP whole-P. |
| **Q** | Active exact Owner registration transaction до CAS/no-op/History; native and canonical Settings/auth policy controls. STOP whole-Q. |
| **R1** | Mandatory transient actor по всему action/planner/store call graph + оба authoritative tx gates в зафиксированном порядке; native rollback/duplicate/reactivation/claim/budget/state-race proof. |
| **R2** | Existing preflight/direct capabilities/no-job/error boundaries; production disabled; task identity/HMAC/consumer contracts unchanged. |
| **R3** | Connected real-store lifecycle + enqueue/consumer/J/N integration и whole-R closure. STOP. |
| **S1** | Complete direct/cross-writer A–R inventory coverage и retained projection/privacy regression closure на принятом cumulative state. |
| **S2** | Real Worker/BA/PG/local-R2/Chromium connected matrix, all applicable exact-head gates, factual evidence packet. AUTHOR STOP → reviews/Owner; отдельный docs closeout далее. |

После каждого slice только Mira решает следующий уже принятый шаг. Автор не меняет cross-package contract по мере работы. Внутри одного SA04 cumulative PR следующий slice продолжает тот же implementation head lineage без merge в main. Если main изменился внешне между slices, выполняется сверка inventory/locks/callers; обнаруженная новая зависимость возвращается Лёве до расширения. При изменении нескольких TSX components применяется соответствующий React quality checklist; UI refactor не назначен.

## 12. Проверенность, ограничения и передача

Подтверждены GitHub merge #332 и current main, актуальные #331 assignment/master/service files. Прочитаны current source contracts PROJECT/PROJECT_STATE/ROADMAP, AUTHORIZATION/ADMIN_PANEL/SETTINGS/COMPLAINTS/SUPER_ADMIN и relevant translation contracts; interim A–K factual-doc lag разрешён принятой отдельной SA04 docs-closeout границей, он не трактуется как отсутствие merged кода. Проверены все перечисленные writers, adapters, canonical callers, History/notification/Privacy/translation dependency helpers и существующие native/route test seams.

Отдельно проверены [official PostgreSQL17 row-lock semantics](https://www.postgresql.org/docs/17/explicit-locking.html) и установленный Drizzle0.45.2 transaction/query behavior. План не использует новый внешний API. #315 повторно проверен на head `fc32f0ba36120b89a27831993519a00f2a40b953` и остаётся отдельным security service; его findings/изоляция/upgrade не объявляются решёнными этой цепочкой. Два native probes — **planning diagnostics только**: один подтверждает N dependency на baseline и достаточность локального направления, второй проверяет R rollback/actor-lock направление. Никакой implementation/tests PASS L–S из них не следует.

Локальные planning artifacts: `/workspace/work/sa04-l-s-plan-evidence/SA04_L_S_TECHNICAL_PLAN.md`, AST `method-inventory.json`, authoritative writer inventory/source manifest и два native diagnostic scripts/results/logs. Source checkout implementation не менялся; собственный disposable PG container и dependency links удалены до финального handoff; все65 source hashes сверены, checkout чист. Нет implementation branch/PR, migration, permanent-doc change, production resource или публикации в архив #251.

**Мира:** проверить complete L–S scope/fit, особенно N topic-FK dependency, R provisional-head rollback/admission ordering и весь S evidence contract. После принятия полного плана можно назначить **только первый bounded L**, с его native/HTTP acceptance. Сейчас Lira/Mark inactive; Lev planning complete / STOP. SA05–SA08 не планируются и не реализуются этим назначением.

**Действие разработчика: подключить Миру; полный L–S plan и контекст переданы через #331.**

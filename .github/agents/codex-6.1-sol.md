# Лёва — актуально: #315 cross-plan foundation correction delivered

**2026-11-10.** Main `e16d75dc7e2988eb06923c2d97ab5ae389bbfbac`. **[Delta #6761588752](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6761588752)** overrides future-contract/acceptance parts of base plan#6761206804 after Mira#6761433938. Awaiting Mira re-review; Lev stopped; Lira/Mark unassigned.

**Missed context acknowledged:** cross-plan notice#6761087988 (06:53UTC) already existed before my corrected plan#6761206804 (07:01UTC); I checked earlier review/files but failed to refresh discussion and read#315. Initial plan#6759936344 was before#315 creation, but the later correction should have included it. Before this publication refreshed #251 comments and read #315 full master plan/workflow/communication. Do not rely on workflow files alone when a fresh assigned cross-plan comment changes the target.

Reference only: **security PR#315**, checked head `5329ef027c7f477067154218349077d75b763c8a`, plan blob `0b4fee79a10dcf6f532f3758305d0896f88a7d88`. It is the general security channel; relevant BlockA target: ordinary Admin stays in **Public Forum Worker**, Super-admin moves to separate **Owner Worker/control plane**; after activation Public Worker no longer registers Super-admin. Do not describe current shared app/routes.ts + Worker as final combined Stage6 ingress.

Current foundation remains address-only. AdministrativeRouting may have one interface but two distinct typed families (e.g.routing.admin/routing.superAdmin); no permanent shared base/origin/Worker assumption. Future trusted resolver can supply different Owner origin/base; callers must preserve selected destination instead of forcing current origin. Current defaults remain literal same-origin public local URLs. Minimal acceptance adds controlled independent public fixture origins for Admin/Owner destinations across UI/server outputs, no live external transport/topology.

Current app/routes.ts/Worker remain unchanged; no registration helper/extraction/recomposition. FOUNDATION-PLAN-MIRA-01 closed by Mira. MIRA02 addressed in proposed delta, coordinator acceptance not claimed. Real Worker separation, Access, isolated Owner auth/session/Passkey, DB capability/Hyperdrive and deploy isolation/secrets are #315 work, not imported into#251. #315 service files not changed and no security implementation assigned.

Evidence /workspace/work/admin-routing-plan-evidence/FOUNDATION_CROSS_PLAN_DELTA.md + SECURITY_REFERENCE_315.md. No implementation/code/tests/build/runtime acceptance for this plan-only correction. SA02-PLAN-MIRA-01/source-attribution requirement#6759312425 remains open and separate; preserve useful authoritative user/network-source identity/first/last/count with bounded/coalesced persistence. Stage6 activation paused.

Ниже полный прежний контекст; неверная предпосылка о final shared ingress/origin superseded указанной delta.

---

# Лёва — актуально: corrected foundation plan delivered, Mira re-review pending

**2026-11-10.** Same main `e16d75dc7e2988eb06923c2d97ab5ae389bbfbac`. [Corrected complete plan #6761206804](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6761206804), following Mira [#6760232469](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6760232469), replaces initial foundation plan#6759936344.

**FOUNDATION-PLAN-MIRA-01 reduction delivered:** removed section2D route-registration extraction/recomposition/build helper and all matching current-scope/acceptance requirements. Current app/routes.ts already registers11Admin+6Super-admin routes in one place; Worker already has one requestHandler ingress. **Both files remain unchanged** and are only future Stage6 ingress touchpoints. No second route registry/composition layer, new router or dynamic matching.

Accepted remainder pending coordinator re-review: centralize outgoing administrative addresses through typed AdministrativeRouting resolver/accessors/provider and existing path helpers/links/forms/redirects. Static public defaults preserve exact current URLs/module IDs/auth/Router8.3.1/initial/local-CI behavior. Real concealment/secrets/external activation/operational policy remain Stage6. No implementation/code/tests/build/runtime acceptance performed during this correction; source31 hashes unchanged, source checkout clean.

Evidence `/workspace/work/admin-routing-plan-evidence/FOUNDATION_PLAN_REVISED.md`; original plan/official references/source snapshot preserved. The finding is addressed in the proposed plan; **Mira has not yet accepted this revision**. Lev stops after publishing; Mira re-review next; Lira/Mark unassigned. No implementer assigned by planner.

SA02 is next product package after bounded foundation decision, not gated by production protection itself. SA02-PLAN-MIRA-01 and Owner source-attribution clarification#6759312425 remain open: useful authoritative user/network-source identity + first/last/count with bounded/coalesced persistence. Neither per-request permanent rows nor count-only anonymous collapse is accepted. No SA02 telemetry redesign or implementation in this correction.

Ниже полностью сохранён прошлый контекст; прежнее предложение менять composition route registrations superseded исправленной редакцией выше.

---

# Лёва — актуальная задача: Admin/Super-admin foundation plan delivered

**2026-11-10.** Main `e16d75dc7e2988eb06923c2d97ab5ae389bbfbac`; latest assignment / Owner scope [#6759703177](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6759703177). **[Minimal foundation plan #6759936344](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6759936344) published to Mira; Lev stops for review.** Lira/Mark unassigned, no implementation assigned by planner.

Owner deferred real concealment/security activation to Stage6, superseding prior immediate hardening request#6759368876. Proposed current package only centralizes semantic administrative addressing for both Admin and Super-admin: pure public catalog/default resolver, thin replaceable UI/server accessors, existing path helpers/links/forms/redirects, build-only composition of same17 route mappings. Current literal URLs, routeIDs, guards, .data, local/CI, canonical mutations and preferences logical IDs remain unchanged. No secrets/tokens/dynamic hidden routing/anti-enumeration/gateway/bindings/logging/IP-telemetry policy or second Router.

Verified11Admin+6Super-admin registrations; existing scattered constructions in admin path helpers/shell/Overview/History/Users authorization form, header fallback, Settings paths/workspace/preferences, measures paths and server redirects. Current Worker dispatch, language switcher and auth return-path helper already centralized: future adapter touchpoints, not current broad rewrite. New resolver injection substitutes producer later without passing module-global mutable state or rebuilding every form/link. Public test fixture proves UI/server consumers honor seam, not real hidden routing.

Router config pins8.3.1/initial. Official discovery docs + changelog + upstream#15395/#15489 checked: fixes in8.4.0; latest checked release8.5.1. Foundation keeps dependency/mode unchanged; actual compatible upgrade and discovery/metadata/ingress/hydration/transport protection acceptance belong to separate Stage6 package. Does not claim concealment from centralizing paths or enabling lazy.

Full plan defines minimal files/boundaries, unchanged-path/authority checks, meaningful resolver-substitution test, existing local Worker/PG/Chromium flows; no new schema/migration/grants or production gate. Source planning only; no implementation/build/runtime acceptance performed. Evidence `/workspace/work/admin-routing-plan-evidence/`: FOUNDATION_PLAN.md, official docs HTML/text, upstream PR snapshots, source-evidence.json (31 source hashes,17-route inventory); checkout `/workspace/work/admin-routing-plan` clean. No current-scope foundation blocker/conflict established.

**SA02 is next product package after foundation decision, not blocked by production protection. Its earlier plan is NOT Ready.** SA02-PLAN-MIRA-01 remains open; Owner/Mira correction#6759312425 requires bounded/coalesced retained attempts with useful authoritative user and trusted network-source attribution/first/last/count, no per-request permanent row and no single count-only anonymous bucket. Earlier SA02 blanket IP/UA exclusion is superseded where it conflicts with that decision. Current foundation does not design/implement this separate correction. SA03+/lifecycle/visual polish remain outside scope; Stage6 external activation paused; no last-manager/count/recovery rule.

Ниже полностью сохранён прежний planning/review context; его оперативные назначения superseded последней foundation task выше.

---

# Лёва — актуальная задача: SA-02 bounded plan delivered

**2026-11-10.** Current main `e16d75dc7e2988eb06923c2d97ab5ae389bbfbac`. SA01 implementation#313 + factual docs#314 merged/closed. Mira assignment [#6758525820](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6758525820) — planning only. **[Bounded SA02 plan #6758838112](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6758838112) published; returned to Mira for scope/fit review.** Lev stops; Lira/Mark unassigned. No implementation assignment by planner.

SA02 proposes7 stable global monitors: accounts.users/methods/sessions/registration, security.auth/access/attachments. Sources: current user/account/session/registration singleton, retained sanitized auth/access facts, native registration Admin History and existing attachment-security evidence. Each has adjacent History/Refresh and only real applicable canonical links. Counts are actual SQL aggregates, no page-size totals, no fabricated account lifecycle/old audit/full-security claims.

Reuse owner_events/owner_monitor_observations with bounded typed sources/kinds/payloads, sampling/dedup, shared source-aware timeline and native projection rather than event copies. Forward migration expected0063 only for needed time/id indexes + metadata/manifest; current runtime privileges suffice, no new table/sequence or broader writes. Preserve existing System and all ordinary Admin History position/lock contracts. Native attachment created_at may have microseconds/text ID: shared cursor must retain exact SQL timestamp and source identity with compatible valid legacy SA01 cursors and strict calendar validation.

Source-checked Better Auth1.7.7: HTTP and direct api share dispatch hooks, but before exceptions/raw Response/redirects and HTTP-router rate-limit early429 bypass expected after coverage. Current adapter config does not enable transaction option: do not promise rollback of an entire auth request or infer no committed entity from later failure. change-password uses updateAccount on credential; OAuth token refresh is not password change. session revoke200 can be a no-op; signout may clear cookie despite deletion failure. Plan uses request-local sanitized bounded collector + entity after-hooks + narrow operation completion, isolated from existing auth client/errors and response semantics. Facts have stable source/occurrence dedup; actor/target only authoritative; no copied raw password/token/OAuth/IP/UA/email/request/evidence data.

Preserve SET02 registration closures vs existing login/link, wrapped availability vs schema failures, SET05 stale identity/session freshness, shared HTTP password bucket3/10s/Retry-After in both directions, other/current session isolation, Set-Cookie ordering and existing native Security authority. Passive event writer cannot veto auth; known gaps best-effort, no guaranteed complete audit. security.access covers only actual Super-admin guard401/403, explicitly limited surface.

Acceptance defined for nativePG real hooks/HTTP/direct operations, all current readers/source mappings, exact source identity/dedup/µs pagination, grants/manifest/error isolation and built Worker/Better Auth/PG17/Chromium EN/RU/HE/RTL/mobile/keyboard. Extend existing Super-admin browser workflow, not one new workflow per package. **No SA02 tests/build/runtime acceptance or implementation performed in planning.**

Evidence `/workspace/work/sa02-plan-evidence/`: complete SA02_PLAN.md, official hooks/database HTML+text snapshots, source-evidence.json with exact repository/installed-module hashes. Clean source checkout `/workspace/work/sa02-plan`. Genuine current-scope blocker/conflict not found. Canonical profile/deactivation/enforcement/SA03+, Stage6/live providers/Google/real Owner binding and visual polish remain out of scope. No last-manager/count/recovery rule.

Ниже сохранён прежний review/planning context полностью; оперативным является SA02 planning delivery выше. Последний SA01 independent PASS #6757929335, implementation/docs subsequently merged.

---

# Лёва — актуальный результат SA-01: independent whole-PR PASS

**2026-11-10.** [PR #313](https://github.com/iliya1947/vico-forum/pull/313), stable exact head `d9c4268437e76eec9d01f19c7fe1b85d456128c1`, unchanged main/base `787cf6deae38138de2ffe867368ae794349f471f`: **PASS —0 confirmed current-scope defects**. [Полный отчёт Мире #6757929335](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6757929335). Назначение: Mira fresh coordinator PASS / next review #6757801001.

**SA01-LEV-01 закрыт** на этом exact head. Calendar/canonical round-trip отклоняет invalid даты до SQL; мои6 invalid cases дают0 queries,4 valid boundary/leap/year cursors принимаются реальным PG. На built Worker global/scoped document/data собственная матрица24 invalid400 +8 valid200,8 Guest401/non-Owner403 до parser; unexpected schema500 и recovery200 сохранены. SA01-MIRA-01 remains closed.

Whole-PR scope оценён заново: сопоставлены38 changed files,34 побайтно unchanged с предыдущей независимой проверки; изменены только parser и route/PG/browser regressions. Exact binding/оба entry, current System/Overview, append-only history/real web grants, earliest Coverage, shared timeline/source identity, best-effort safe telemetry, Infrastructure placeholder и EN/RU/HE/RTL/responsive/keyboard перепроверены. Независимая mixed-source same-ms pagination36 facts/9 pages; browser global70/5 pages,scoped35/2 pages; actual web-role INSERT/dedup/read, UPDATE/DELETE42501,sequence USAGEfalse.

Мои локальные проверки: production build; app56/56 (4 files); nativePG/migrations68/68 (3 files); schema/grant/provisioning contract files3/3; actual manifest67 tables; checked-in connected Chromium16/16; own DB8/8, own HTTP/DOM11/11; actual web-role proof PASS. Exact-head CI #42692723600,SA01 Chromium #42692723871,existing Chromium #42692723602 повторно подтверждены SUCCESS. Evidence `/workspace/work/sa01-repeat-evidence/`, source-comparison.json/results/logs/screenshots/SHA256SUMS. Checkout `/workspace/work/sa01-repeat` clean; implementation не менял; preview/disposablePG остановлены, vars/symlink удалены.

**Результат возвращён Мире для координаторского решения о дальнейшем маршруте.** Лёва остановлен; Лира остановлена; Марк не назначен. Не назначаю исполнителя/merge/следующий пакет. Owner alone merges; permanent docs separate after merge. SA02+ inactive; production/Stage6/live Google/external Owner binding не активированы. Owner visual polish gate не применяется; no last-manager/count/recovery rule.

Ниже полностью сохранены предыдущие review/planning snapshots. Их прежние findings/назначения superseded текущим результатом выше.

---

# Лёва — актуальное состояние SA-01

**2026-11-09.** Независимая whole-PR проверка [PR #313](https://github.com/iliya1947/vico-forum/pull/313), exact head `6d7f50f979a8aba220b4439646304717c3d8b7c4`, unchanged main `787cf6deae38138de2ffe867368ae794349f471f`: **CHANGES REQUIRED — SA01-LEV-01 [P3]**. [Полный отчёт Мире #6750292313](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6750292313).

Невозможная дата `2026-02-31` проходит Date.parse-finiteness validation, затем исходная строка даёт PG22008 / HTTP500 вместо400 в global/scoped History. Реальные Owner HTTP и прямой PG reader подтвердили цепочку; February28→200, malformed string→400. Только повреждённый/изменённый Owner cursor; штатная пагинация работает. Техническая рекомендация направлена Мире для координаторского решения. Самостоятельное назначение Лире исправления отозвано: reviewer возвращает findings координатору, а Мира определяет реакцию, исполнителя и маршрут. Лира остаётся остановлена до назначения Миры; Лёва остановлен после отчёта; Марк не назначен. Новый gate или обязательный correction cycle reviewer не устанавливает.

Остальной SA01 scope проверен: exact binding/оба entry, append-only events/observations, measured System и earliest retained Coverage (SA01-MIRA-01 closed), общая/scoped source identity и keyset pagination, безопасная best-effort telemetry, private/no-store/401/403/400/404/503, EN/RU/HE/RTL/responsive/keyboard и Infrastructure Stage6 placeholder. Три смешанных источника с одинаковым timestamp:36 записей/9 страниц; реальный браузер global70 контрольных facts/5 страниц и scoped35/2 страницы без пропусков/дубликатов. Фактическая web-role INSERT/dedup/read работает, UPDATE/DELETE обеих relations42501, sequence USAGE false.

Мои проверки: build PASS; app55/55 (4 files), nativePG/migration68/68 (3 files), manifest67 public tables, runtime grants и split-authority provisioning, checked-in connected Chromium15/15 плюс независимые DB/HTTP/DOM/web-role probes. CI #42684010768 и browser #42684011022/#42684011268 повторно подтверждены SUCCESS на reviewed head. Это не закрывает найденный дефект. Evidence `/workspace/work/sa01-review-evidence/`, включая results/logs/screenshots/SHA256SUMS.json. Checkout clean; preview и disposable PostgreSQL остановлены, vars/symlink удалены. Implementation не менял.

Только SA01 активен. Owner visual gate не применяется; visual polish отдельно. Owner alone merges; permanent docs после merge отдельно. SA02+, production/Stage6/live Google/external Owner binding не активировать. No last-manager/count/recovery rule.

Ниже полностью сохранён прежний план и закрытый контекст; его старые статусы назначений superseded актуальным состоянием выше.

---

# Лёва — Super-admin technical plan delivered

[Current technical plan #6745289141](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6745289141). Exact main `787cf6deae38138de2ffe867368ae794349f471f`. Source planning complete;implementation not started. Mira scope/fit review next;Lira unassigned;Lev stopped.

Лёва — **Super-admin: технический план и bounded decomposition**.

**Проверенный main:** `787cf6deae38138de2ffe867368ae794349f471f`. AP01–11, Owner redesign1–2 и SET01–06 закрыты; Super-admin ещё не реализован. План следует **последним** решениям владельца в #251; прежние Accounts tab/отдельная user card/обязательная reason/reactivation/forced logout superseded. **Ни код, ни миграции, ни implementation PR на этом шаге не создаются.**

## 1. Зафиксированный результат

- Одна exact-Owner-only поверхность **Overview / Monitoring & Event log / Infrastructure**.
- Monitoring: все13 утверждённых областей. Каждый реальный monitor = current state + непосредственно соседняя History + применимые реальные действия. Read-only monitor допустим.
- Global Event log и scoped History — разные представления одних фактов, не две независимые истории.
- Overview — краткая сводка текущего состояния/существенных проблем с переходами, не копия Monitoring.
- Один user-detail: **`/:locale/users/:userId`**, public + permission-scoped Admin + exact-Owner section.
- Deactivate: публично Deleted user, опубликованное сохраняется, исходные account data сохраняются минимум год, активное использование прекращается. Причина не требуется. Без reactivation/hard delete/provider unlink/Owner password controls/отдельного принудительного logout.
- SA6: Owner history бессрочно до нового решения; ordinary UI deletion нет.
- SA7: оба Owner entry points открывают одну поверхность.
- Infrastructure — только честный Under development до отдельно возобновлённого Stage6. Никаких live Cloudflare/Neon/secrets/deployment collectors или dormant infrastructure writers сейчас.

## 2. Что действительно есть в main

- Exact Owner: `app/authorization/owner.ts`, server binding `VICO_OWNER_USER_ID`; все code-backed permissions уже проецируются Owner. Новая роль/permission «super-admin» не нужна.
- Public `profile.tsx` и отдельный `admin-user.tsx` сейчас дублируют detail. `admin-users` directory ищет только public name/ID. `AuthorizationUserControls` уже отправляет assignRole/override в canonical `admin/authorization`; non-Owner read-only.
- AP10 `UserMeasureCapability.adminTarget/adminDetail` уже проверяет `admin.users.blocks.manage` и иерархию. `adminTarget` даёт summary measures без generic user History. Полная measure timeline остаётся в существующей dedicated domain surface.
- `AuthRuntime` request-local, Better Auth**1.7.7**, pg/Drizzle**0.45.2**. Own Account & security нельзя переиспользовать для чужих sessions: `listSessions` привязан к вызывающему пользователю.
- В `user` нет deactivated state. User/session/account/profile/preferences сохраняются отдельно; публичные SQL читают исходные `user.name/image` в множестве forum/discovery/profile/notification projections.
- Уже есть durable `admin_history`, `forum_complaint_events`, `forum_attachment_security_events`, immutable revisions и текущие domain rows. **Общего Owner Event log и полной долговременной истории auth/session lifecycle нет**. `rate_limit` — изменяемый admission counter, не auth audit.
- Translation foundation уже имеет `DrizzleTranslationTaskStore.observeTranslationTasks()`: counts, pending age, processing leases, failure groups, allowance/deferred reasons. Есть UI/title/body tasks, content budget/allowance, reconciliation/consumer modules. Но current `workers/app.ts` подключает **DISABLED_CONTENT_GENERATION_ACTION_RUNTIME**; live Queues/providers остаются Stage6.
- R2 adapter/attachment cleanup и security evidence есть в коде; actual bucket — optional binding. DB metadata/локальные harnesses не доказывают live storage health.
- Worker сейчас имеет fetch boundary и Cloudflare observability config, но не прикладной retained request-monitor history. Получение platform logs/CPU/billing/uptime через API не подключено.
- Main migrations0000–0061; web/localization grants и full-schema manifest уже проверяются существующим CI.

## 3. Маршруты и authority

Предлагаемый canonical набор:
- `/:locale/super-admin` — Overview;
- `/:locale/super-admin/monitoring` и `/monitoring/:area`;
- `/:locale/super-admin/monitoring/:area/:monitor/history` — history реального code-backed monitor, с allowlisted resource scope;
- `/:locale/super-admin/events` — глобальный журнал;
- `/:locale/super-admin/infrastructure` — Stage6 placeholder.

Любой loader/action/resource/data endpoint самостоятельно требует **текущую active authenticated session + exact isBoundOwner** до private read/query validation. Parent/layout/header не заменяет guard. Guest401, non-Owner403, classified storage503, unexpected schema/programming errors не маскируются; private,no-store на document/data/success/controlled failures. Никаких секретов в query string/redirect/DTO.

В `locale-boundary` добавить только серверную presentation boolean `canViewSuperAdmin`, полученную exact binding check. Использовать её в AdminShell и Owner account/profile navigation; прямые route checks независимы. Не менять ordinary Admin destination defaults, RBAC grants и Owner effective projection. Отдельный SuperAdminShell внутри общего ForumShell; оба entry ведут на один путь.

## 4. Один профиль, три серверные проекции

`profile.tsx` становится composition route, но не новым универсальным user API:
1. Public projection — только текущие публичные поля/контент.
2. Admin projection — отдельные защищённые readers, вызываемые только при применимых текущих permissions.
3. Owner projection — отдельная allowlist capability с exact Owner guard, не включается в обычные management DTO.

Ответы canonical profile/private actions — private,no-store; роли/private email/sessions не загружаются заранее и не скрываются только JSX. Public чтение остаётся доступным при отсутствии private capability; classified outage соответствующей privileged части показывается как unavailable, не как нулевая/пустая «успешная» сводка. Unexpected error остаётся заметной ошибкой.

**Admin section:**
- measures/violation information только через текущий AP10 target reader и его authority; имеющаяся мера — authoritative факт. Pending complaint, неподтверждённый Signal или отдельное security evidence не объявлять «нарушением пользователя»;
- role/grants/overrides только при `access.authorization.manage`; exact Owner получает существующие write controls, non-Owner — существующий read-only snapshot;
- directory permission `admin.users.read` не выдаёт authorization/measure data. Напротив, target-specific measure/authorization holder не должен получать broad Users directory для чтения разрешённой части public profile;
- **не добавлять user-related History ordinary admin**, фильтр Admin History на профиле или копии Needs attention queues. Ссылки на существующие measure/Case workspace сохраняют их независимые guards.

**Owner section:**
- private email, исходная retained identity, internal ID, credential-present boolean и allowlisted sign-in method labels;
- собственный bounded Owner reader для **target user's** session columns: ID, created/expiry, sanitized user-agent/device label, имеющийся network-address field при безопасной валидации. Это записанная metadata, не доказанная физическая идентичность устройства и не geolocation/fingerprint service;
- без token/password hash/access/refresh/ID token/provider payload. Read-only: не добавлять кнопку чужого revoke/force logout;
- per-user full summary: known actor/subject-related domain, account/auth/security events с точными источниками; violations + retained state. Не выдумывать прошлые входы из текущих sessions;
- active/deactivated state, deactivatedAt и minimum-retention boundary; confirmed deactivation action появится только после enforcement package.

Из `admin/users/:userId` сделать **guarded compatibility redirect** в canonical profile (нужный section anchor допустим). Самостоятельного второго detail UI больше нет. Users directory сохраняется и ведёт на canonical profile; отдельный Super-admin Accounts tab не нужен. Старый authz inline fetcher/recovery переиспользовать в новом section, не вводить второй writer. Profile prop `isOwner` сейчас означает self: при composition назвать его `isSelf`, не смешивать с exact bound Owner.

## 5. Деактивация: хранение и запись

Минимальный server-owned account state удобно добавить в **существующую user row**, чтобы все её публичные SQL joins могли использовать один predicate/projection без десятков дополнительных joins:
- `deactivated_at timestamptz nullable`;
- `deactivated_by_user_id text nullable`;
- `retain_at_least_until timestamptz nullable`;
- согласованный CHECK: active → все null; deactivated → timestamp/actor/minimum boundary заданы, minimum не раньше deactivatedAt +1 year.

Новые поля не открывать как Better Auth client input/additional-field write. Оригинальные name/email/image/provider accounts/password hash/profile/preferences/grants не переписывать ради публичной маски. Minimum boundary фиксирует нижнюю границу, **не** запускает purge на следующий день после года. Hard delete/retention cleanup/reactivation API нет.

Отдельный Owner-only POST, например `/users/:userId/owner/deactivate`, с independent guard, Origin, точным intent/actor expectation/target/operation ID и подтверждением целевого аккаунта в UI. Без reason field и без нового OTP/реаутентификационного протокола. Target exact bound Owner запрещён по явному решению SA3; другие admin/manager accounts не получают дополнительных исключений.

Одна transaction:
1. свежая trusted Owner authority, existing target user row lock;
2. active→deactivated, server DB clock, minimum boundary +1 year;
3. удалить public presence target;
4. append **один** Owner lifecycle event с actor/target/operation ID/time;
5. commit.

Повтор уже выполненного operation/деактивации возвращает текущее состояние без второго события. Event-write failure до commit откатывает state/presence. Raw session/account rows не удалять как часть операции; нельзя потерять retained account data из-за FK cascade. Никакого нового «снять все права»/подмены роли или массовых denies.

## 6. Active-account enforcement — прежде доступной кнопки

Это отдельный обязательный срез, не только UI hide:
- единый server `AccountState` reader/`assertActiveAccount`, различающий absent/deactivated/unavailable/unexpected;
- `AuthRuntime.getSession` после authoritative Better Auth resolution не даёт active request identity для deactivated user; fresh DB check, не долгоживущий cookie/session role claim;
- Better Auth `databaseHooks.session.create.before` проверяет active user до выдачи новой session — email sign-in, existing Google callback и все остальные current session-creation paths. Current pinned1.7.7 реально проводит `createSession` через `createWithHooks(...,"session")`;
- global request hook/authoritative-session check закрывает прямые authenticated `/api/auth/*` и server API calls: get-session, link-social, update-user, change-password и session operations не обходят account state. Обычный собственный sign-out может очищать cookie; новой операторской forced-logout функции нет;
- сохранить Google verified linking, closed-registration policy, password3/10s canonical limiter, freshness, cause preservation и pre-routing Set-Cookie ordering. Lookup outage не превращать в «аккаунт активен» либо ordinary inactive denial;
- существующие request guards и authoritative writer admission используют тот же account-state predicate перед изменениями. Закрыть реальные цепочки forum post/edit/profile, uploads/final attachment publication, measures/authz/Complaints/Signals, translation requests, Settings/Privacy/locale, inbox/read-state и heartbeat. Не размазывать разные трактовки inactive по handlers и не превращать AP10 measure immunity в обход account lifecycle;
- при существующем transaction-local actor/user lock проверять active state внутри этой границы; для простого own UPDATE применять active predicate. Порядок locks согласовать с текущими user/authorization/measure locks. **Глобальная блокировка всех auth/forum requests не нужна**;
- новый запрос после deactivation commit с любой старой cookie не получает active account capability. Уже принятые in-flight операции проверять на существующей authoritative mutation/finalization границе; не обещать отмену уже committed публикации или внешнего PUT;
- ранее созданные background jobs не отменять автоматически: это не новое действие пользователя после деактивации. Сохранить существующие domain lifecycle/cleanup policies.

Session/device live tables сохраняют обычную Better Auth expiry semantics; историю доступа хранит отдельный safe event stream, а не принудительное годовое хранение bearer tokens. Этот план сохраняет retained account records и не вводит последующую hard-delete процедуру.

## 7. Deleted user — серверная публичная проекция

Одна переиспользуемая public-identity projection/helper: deactivated → localized Deleted user marker + neutral name/avatar, без исходных profile bio/external links/старого имени в public DTO. Локализацию делает existing catalog, но исходное имя уже должно быть исключено **до** сериализации HTML/data.

Проверенные места аудита/замены: `db/forum-repository.ts` (profile, topics/posts, category/section/latest/pins, Popular/Unanswered/Tags/Search, read states/notifications, public post-history actor projections, mention suggestions и online), `db/admin-users.ts` public-identity directory, соответствующие views/avatar/mention/notification presenters и публичные attachment-author projections. Не ограничиваться страницей профиля.

Inactive исключается из online readers и heartbeat независимо от showOnline и физической stale presence row; не менять сохранённый Privacy preference. Mention discovery не предлагает inactive account. Для public search/name filtering использовать neutral projection, чтобы исходное имя не возвращалось через filter/count.

Published titles/bodies/revisions/attachments и ссылки на сохранённый user ID остаются. Не переписывать пользовательский текст/цитаты/исторические доказательства ради удаления произвольных упоминаний имени. Private Owner/evidence projections сохраняют настоящие retained data под собственными guards. Это presentation account lifecycle, не обещание полной анонимизации содержимого форума.

## 8. Одна модель Monitoring/History/Event log

Code-backed server catalog: area, stable monitorKey, supported resource scope, typed current reader, current-state schema/version, history filter, existing action descriptors, coverage/freshness. Не arbitrary SQL/URL/plugin-defined metrics из browser input.

**Два вида фактов:**
1. Domain/auth/security events — конкретное действие/переход, occurredAt и immutable event identity.
2. Monitor observations — измеренное состояние, observedAt/source/freshness/quality. Разница двух снимков не выдаётся за точное время неизвестного доменного события.

Existing durable events читаются через normalized **OwnerHistoryReader** из `admin_history`, `forum_complaint_events`, `forum_attachment_security_events` и относящихся immutable records. Их existing domain writers/ordinary permission readers не заменяются. New **`owner_events`** нужны для отсутствующих account/auth/lifecycle/операционных событий; **`owner_monitor_observations`** — для retained state samples. Не копировать existing native event в ещё один «успех операции из Monitoring».

Новые relation contracts:
- Owner event: immutable UUID/source key, occurred/recorded times, code-backed kind, actor/target-user IDs где реально известны, entity ref, correlation/operation ref, bounded typed payload; unique occurrence key обеспечивает dedup;
- observation: monitorKey/resource scope, observedAt, source/schema version, quality, bounded value/fingerprint; snapshot только при изменении meaningful value и по определённому интервалу для измерений;
- web INSERT/SELECT; UPDATE/DELETE журнала не выдавать. Новые indexes — время/ID, kind/monitor/entity, actor/target, scope; bounded keyset pagination и filters. При использованной identity sequence проверить grants штатными PG probes.

Scoped History рядом с каждым monitor и global journal используют **один** normalized reader и event IDs; global view объединяет области, не создаёт события заново. Один domain event может быть связан с несколькими monitors и per-user summary; это ссылки/проекции того же факта. Время действия и время наблюдения показывать отдельно. Существующее событие/его source provenance нельзя потерять при mapping.

SA6 применяется к retained Owner history и используемым immutable source histories: без TTL/delete controls. Existing source rows нельзя позже незаметно purge под видом operational cleanup. Operational session/job counters могут меняться — их будущие важные переходы сохраняются в Owner stream. Ранее не записанную историю нельзя «восстановить» из текущей строки; UI указывает coverageFrom и реальные доступные источники.

**Сбор:** snapshots при Owner current-state reads/явном Refresh и фактические события в существующих работающих server producers; passive request measurements — на Worker boundary, bounded server-side aggregation, без request bodies/query strings. Owner read может записать наблюдение, но не вызывает доменную мутацию/проверку внешнего сервиса. GET/prefetch не должен создавать по дубликату sample на каждый рендер; server time-gate/dedup обязателен.

Не вводить внешний poller/новую Queue/cron/deployment только ради первого Monitoring. Quiet period означает отсутствие нового sample, а не доказательство непрерывного uptime. Если позже понадобится непрерывная platform collection — это отдельная Stage6 integration, не скрытая текущая зависимость.

Новое account deactivation событие атомарно со state. Existing transactional histories сохраняют свою атомарность. Passive telemetry не становится новым глобальным veto для обычного просмотра/входа; failure collection отображается как unavailable/gap/stale, не как green/zero. DB outage не позволяет гарантировать запись каждого failure в той же недоступной DB — такую гарантию не заявлять.

## 9. Техническая coverage/action map — все13 областей

Ниже обязательный начальный catalog по **существующим** источникам. В реализации каждый перечисленный monitor получает stable ID, typed DTO, adjacent History и freshness; read-only остаётся полноценным monitor.

| Область | Current state / источники | History producers и реальные действия |
|---|---|---|
| **1 System** | Build/runtime/library/schema expectation, время/доступность собственных app dependency reads; измеренные request outcomes/latency, последние classified failures. `workers/app.ts`, package/build metadata, existing availability wrappers. Не host CPU/RAM/billing. | Observations + новые safe request/failure counters/events с момента включения. Refresh read-only; не придумывать restart/deploy. |
| **2 Accounts & authentication** | Active/deactivated/new accounts, linked methods/credential presence, active/expired session aggregates, registration flags; `user/account/session`, registration singleton. Target detail — только canonical profile. | User/session/account database hooks + actual auth endpoint outcomes, registration `admin_history`, lifecycle events. Link Users directory/canonical profile, existing Settings registration; deactivation только approved Owner action. No чужой revoke/password/unlink. |
| **3 Security** | Существующие attachment security evidence, measured auth denial/rate-limit outcomes, применимые access failures; `forum_attachment_security_events`, typed auth/guard outcomes. `rate_limit` только текущее admission state. | Existing security events + новые sanitized auth/security events; links в canonical Needs attention Security/profile. Нет invented quarantine/ban/resend command. |
| **4 Forum** | Counts/activity/current topic closed/pinned/solved/best answer/duplicate/source revisions, online visibility aggregates; forum readers/tables. Counts не из truncated list. | Existing significant-action History + publication/revision immutable facts и новые lifecycle events там, где нет native event. Reuse Forum/Admin/topic Quick actions и existing create/edit при их собственных ресурсных правах. Не structural CRUD/bulk-delete. |
| **5 Localization & translations** | Runtime LocaleRegistry health/active locales, manual/UI bundle coverage/stale/missing, UI/title/body task states, allowance/budget failure groups; `observeTranslationTasks`, locale/bundle/translation/task stores. | Observations и добавленные transitions в текущие planning/consumer/reconciliation stores. Existing `forum.translation.generate` только через canonical topic/action при реально enabled runtime. Не expose internal reconciler как новую Owner кнопку только потому, что class существует. |
| **6 Notifications** | Persisted reply/mention/complaint-result inbox aggregates, unread/read/referenced target validity; `forum_reply_notifications`, `db/forum-notifications.ts`, readers. | Фактическое создание/mark-read из текущих producers, snapshots. Monitor read-only; личный inbox — существующий own route. Не resend/delete/mark-another-user-read. |
| **7 Files & attachments** | Logical attachment/upload/publication refs, byte/type/status aggregates, unattached/cleanup claims/failed attempts/security outcomes; attachment repositories, cleanup `runOnce`, sweep metadata. DB-known state отдельно от actual bucket availability. | Existing security evidence + safe upload/publication/cleanup outcome producers и observations. Links к разрешённому content/security context. Не новая произвольная R2 browse/delete API; не запускать cleanup как Owner action без отдельного approval. |
| **8 Administration** | Current roles/grants/overrides, measures/authority, registration policy и existing admin configuration; authorization/measure/settings readers. | Existing `admin_history` без второго producer. Canonical Roles/target authorization controls, measures, Settings. |
| **9 Moderation** | Signals/duplicate appeals/Complaints current counts/status/outcomes, priorities/current reviewer activity; существующие queue/domain readers. | Existing complaint events/decisions/appeals, accepted signal/admin events; scoped links в Needs attention и уже разрешённые review/decision/appeal actions. Не копия очередей или новый violations store. |
| **10 Background processes** | Known pending/processing/live/expired leases/attempts/terminal failures/reconciliation state, attachment sweep claims; task/sweep stores. Различать «producer/consumer code exists» и runtime binding enabled. | Новые persisted lifecycle/attempt/reconciliation outcome events на реальном execution path + samples; без synthetic completed jobs. Read-only, пока нет approved operator action; new retry/cancel/claim-steal не добавлять. |
| **11 Data** | Собственные application row/count/relationship/schema-compatibility facts, state/history coverage и последние DB availability failures. Catalog queries только с current runtime grants. Compiled expected migration не выдавать за applied external version. | State observations + migration/build provenance, реально доступное в runtime. Read-only; не SQL console/DB repair/export/backup tool. Не выдавать web superuser/широкий pg statistics доступ ради карточки. |
| **12 Integrations** | Реально подключённые adapters/bindings и их observed outcomes: Google parameters presence/actual local auth results, Hyperdrive routing/dependency outcomes, optional R2, translation disabled/enabled state. Secret presence не равна provider health. | Safe config-state observations и реальные вызовы current application adapters. Existing Settings registration link не управляет credentials. Никаких новых live health probes/platform API/secrets editors. |
| **13 Infrastructure** | Тот же Stage6 Under development destination. Это placeholder области, не фиктивный «здоровый monitor». | Не создавать infrastructure histories/probes/writers заранее. У реальных monitors остальных областей History обязательна; placeholder не притворяется измерением. |

Один source может питать несколько областей: например translation lease в Localization и Background. Назначить **один canonical monitor/event identity** и cross-link, не дублировать таблицы/события ради13 tabs.

Невозможно наблюдать server-side browser-local theme/Editor/Admin preference values без нового client collection; такую collection не добавлять. Отсутствующая measurement source показывается явно как not connected/not instrumented, а не как0/healthy. Остальные работающие sources должны иметь настоящие данные; нельзя завершить программу13 пустыми заглушками.

## 10. Новые producers и история аккаунта

Better Auth1.7.7 поддерживает database hooks user/session/account create/update/delete и request before/after hooks. Использовать их как server seam, различая:
- реальное создание/изменение persisted entity;
- successful/denied auth outcome;
- текущий session/device snapshot.

Регистрация, email/Google login, password-change success/failure/rate-limit, explicit link success/failure, own session revoke/sign-out и deactivation должны давать safe known events. Коррелировать request/operation, чтобы одно создание session + successful sign-in не превратилось в две одинаковые «login success» записи. Direct server calls и HTTP paths покрываются согласно реальному dispatch; одних HTTP onResponse hooks недостаточно.

Actor/subject ставится только когда библиотека/authoritative domain действительно установила identity. Не привязывать failed unknown-email login к пользователю по произвольному browser claim. Не реконструировать прежние входы из session.createdAt как полноценный auth audit.

Payload allowlists: IDs/коды/outcome/timestamps/безопасные counts. Не сохранять сырой Request/FormData, пароль/hash, bearer/session cookie/token, OAuth state/code/access/refresh/ID token, secret config, provider response или PostgreSQL error.query/params. Owner session metadata читается отдельной allowlist проекцией. Full user summary не означает выгрузку всех сырых данных/логов.

## 11. Contextual actions и Overview

Action descriptor содержит ссылку/intent к **существующему** domain surface. Reuse текущих Forms/fetchers/Quick actions:
- simple existing operation — та же форма/canonical action;
- требующее Case/topic/revision контекста — переход на canonical workspace;
- Owner-only deactivation — одна новая операция из пункта5.

Сервер повторно проверяет current actor/resource/state/Origin/CAS; descriptor/presentation не выдаёт capability. Нет universal action proxy, произвольного returnTo, raw SQL или второго mutation backend. Domain событие создаёт canonical writer, Monitoring ничего повторно не append.

Overview использует те же current readers/catalog: короткие сводки по13 областям, поднимает реальные failed/expired/unavailable/degraded states и ведёт к monitor+History/action. Не придумывать business alarm thresholds; использовать существующие lease expiry/retry budget/typed outage и чётко обозначенные измеренные значения. Не считать отсутствие samples доказательством здоровья.

## 12. Последовательность implementation packages

Каждый пакет — отдельный bounded implementation PR от actual main, stable exact head, coordinator-first review → независимая проверка → Owner merge → отдельный factual docs closeout. Номера новых migrations берутся от actual main; первая ожидаемо0062. Не резервировать сразу цепочку номеров и не переписывать0000–0061.

| Пакет | Конкретный законченный срез | Основные seams / acceptance |
|---|---|---|
| **SA-01** | Exact-Owner shell/оба entry, System monitor, adjacent History/global Event log foundation, Infrastructure placeholder; минимальный реальный Overview. | `app/super-admin/*`, routes/owner guard/context/Worker wiring, два retained history tables, manifest/grants; schema-independent versions + настоящий observed dependency sample. Native retention/idempotency/pagination/Owner gate; browser Guest/Admin/Owner, оба entry, реальные History/журнал. Остальные области не объявлять delivered. |
| **SA-02** | Accounts/auth/Security producers и current monitors; пассивные request outcomes для System. | Better Auth hooks/runtime, safe auth events/coverage, current security evidence; preserve SET02/05 and cause/cookie/rate-limit. Native real Google seam/email/session lifecycle + redaction, actual app outcomes, no effect от telemetry failure на обычный read/sign-in. |
| **SA-03** | Canonical profile public/Admin/Owner composition, supported target sessions/methods/private identity, user summary из доступной истории; legacy detail redirect. | Existing profile/AdminUsers/AuthorizationUserControls/AP10 readers, narrow Owner user reader. Permission matrix/HTML+data redaction, target-only snapshot, grant revoke/account switch и existing action recovery. Deactivate control пока не включать. |
| **SA-04** | Account-state schema, active-account enforcement и единая neutral public projection; без доступного Owner deactivate POST. | User columns/helper, AuthRuntime/session-create/request hooks, authoritative current mutation/finalization guards, public SQL/presenters/online/search. Fixture-deactivated users проверяют старые cookies/direct API/сохранённый контент/retained data. Большой срез не активируется частично: если не укладывается, дробить только на independently safe подготовку и замкнутый enforcement, без кнопки до конца. |
| **SA-05** | Единственная deactivate операция + Owner profile control + lifecycle event/retention view. | User lock/atomic event/presence cleanup/idempotency/exact Owner target restriction; real stale-session/deactivation chains, concurrent own operations, event failure rollback, repeated operation once. Нет forced logout/reactivation/reason. |
| **SA-06** | Forum + Administration + Moderation + Notifications monitors, history mapping и canonical contextual links/actions. | Existing domain readers/histories/immutable records; новые недостающие persisted transitions. Проверить list/count полноту и один authoritative event при запуске действия из Monitoring. Никакого profile user-history для ordinary admin. |
| **SA-07** | Localization/Translations + Files/Attachments + Background + Data + Integrations monitors по source map. | Typed observability readers/current store lifecycle instrumentation, честные disabled/unbound states, samples/history. Не включать production providers/Queue/cleanup controls; разделять большие domain groups на последовательные sub-PR, сохраняя те же consumers и без нового scope. |
| **SA-08** | Полный Overview, cross-area filters/History/actions, сквозная integration/closeout. | Все13 областей учтены,каждый реальный monitor имеет history/provenance; profile active/deactivated/privacy/authz boundaries и журнал проверены совместно. Отдельный итоговый factual docs update, без объявления Stage6/production завершёнными. |

**Ближайший пакет после принятия плана — только SA-01.** SA02–08 сейчас не назначаются. Предложенная детализация не означает разрешения исполнителю сразу менять все эти области в одном PR. На границе больших groups SA06/07 coordinator назначает один domain sub-slice; архитектурные seams и конечный scope остаются этим планом, а не новым generic framework.

## 13. Проверки и delivery gates

- Каждый новый route/endpoint: direct Guest/non-Owner/Owner, неверный binding/подмена role/user, Origin/method/allowlist, controlled failures, actual document/data/cache/Set-Cookie, pending/stale forms и Owner→non-Owner mounted account switch.
- Profiles: ordinary Users-read не получает authz; authz-read non-Owner read-only; measure-only не получает directory/general History; exact Owner видит private target fields; non-Owner HTML/data не содержит email/session/device/Owner journal payload.
- Auth/deactivation: real Better Auth/PG two old sessions и новый email/Google sign-in, direct get-session/update-user/password/link/revoke paths; stale editor/profile/Settings/heartbeat/upload/publish не действуют от inactive user; unrelated users не блокируются.
- Public neutral identity: homepage/category/section/topic/message, search/tags/popular/unanswered/pins, profile/mentions/notifications/history links; original identity не спрятана лишь CSS. Content/revisions/published attachments сохраняются.
- Retention: исходные records сохранены; minimum boundary≥1 year, clock advance за год ничего не удаляет/не реактивирует; Owner event history не TTL; no UI DELETE; lifecycle failure rollback/idempotency.
- History: source/event ID dedup, actor vs target mapping, adjacent history=тот же filtered global reader, pagination/filter validation/indexes, unknown history coverage без invented backfill, samples не выдаются за точные прошлые mutations, safe failure payloads.
- NativePG для real hooks/wrapped availability/schema errors, transactions/locks/row counts/history source/provisioned web privileges и полного migration/manifest parity. Existing AP10/SET02/SET05/SET06 regressions обязательны при затронутых seams.
- Built Worker + Better Auth + disposable PG17 + Chromium; EN/RU/HE, RTL/mobile/tablet/desktop/keyboard; synthetic Owner binding/Google seam. Встраивать в существующий подход CI/browser, не клонировать новый workflow на каждый пакет.
- Applicable lint/typecheck/unit/build/schema/history guards/runtime grants/provisioning на exact head. Handoff публиковать с фактическим CI status без ожидания ради самого ожидания; pending не PASS. Не подменять independent review авторским прогоном.
- Постоянные contracts/source-of-truth: новый bounded `docs/SUPER_ADMIN.md` и затронутые ADMIN_PANEL/AUTHORIZATION/SETTINGS/PROJECT_STATE/ROADMAP/History обновляются отдельным docs closeout по реально merged package. Сейчас permanent docs не изменять и не объявлять будущие части delivered.

## 14. Граница проверки и handoff

Source-level planning выполнен по current main и последним frozen Owner decisions в #251; проверены actual profile/auth/history/measure/notification/task/attachment/runtime-grant seams. Официальные Better Auth [database hooks](https://www.better-auth.com/docs/concepts/database#database-hooks) и [request hooks](https://www.better-auth.com/docs/concepts/hooks) сверены с **реальным installed1.7.7 source** (`internal-adapter`, `with-hooks`, `getAuthoritativeSessionFromCtx`, endpoint dispatch), а не только общей рекомендацией docs.

Evidence: `/workspace/work/super-admin-plan-evidence/`; checkout `/workspace/work/super-admin-plan` clean. **Реализация/новые migration/CI/runtime acceptance не выполнялись**, capability hooks source-checked, но их будущая интеграция должна пройти указанные реальные тесты.

**Мира:** проверить технический план на frozen scope/fit; после принятия назначить Лире **только SA-01**. Техническая карта не переоткрывает решённые продуктовые вопросы и не расширяет approved actions. Лёва планирование завершает и останавливается. Лира до принятия не назначена; Марк не назначен. Production/Stage6 не возобновлять.

## Closed context

AP01–11,Owner redesign1–2 and SET01–06 complete in repository/local-CI. Last independent SET06 review [#6724949328](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6724949328), evidence /workspace/work/set06-review-evidence/;implementation#311/docs#312 merged. Earlier SET06 plan [#6722989280](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6722989280). No last-manager/count/recovery rule applies;Owner-target exclusion in Super-admin comes only from explicit SA3.

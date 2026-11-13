# Лёва — актуальный checkpoint: SA04-I independent whole-PR PASS (2026-11-13)

Full report [#6857634901](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6857634901). Exact #329 `74c6f43ae2d67526e2ad17aa50392aebf41abbca`, main/base `13456a17f23c1385bef8ab11c735f43d201edd02`. Coordinator whole-I and independent technical PASS cover the same head. Previously planned I5, did not implement #329. Lev completed/STOP; Mira coordinator follow-up next.

## Лёва — независимая техническая whole-PR проверка SA04-I: PASS

Проверен **весь cumulative PR [#329](https://github.com/iliya1947/vico-forum/pull/329), восемь файлов**, exact head `74c6f43ae2d67526e2ad17aa50392aebf41abbca`, base/current main `13456a17f23c1385bef8ab11c735f43d201edd02`. Scope — I1–I5, включая принятое операционное разбиение I5a–e и связную композицию текущего настроенного Better Auth1.7.7.

**PASS — 0 подтверждённых current-scope дефектов.** Это тот же stable head, на котором Мира дала cumulative whole-I coordinator PASS. В реализации #329 не участвовал; ранее готовил технический план I5. Во время review реализацию и авторские assertions не менял.

### Проверенная композиция

- I1 не передаёт retained inactive user в request identity; late losing refresh остаётся guest/null. I2 проверяет текущие HTTP/direct authenticated paths и pathless setPassword, не продлевая inactive due session при предварительном lookup. I3 session-create gate сохраняется независимо от telemetry.
- I4 покрывает реальные current configured session/user/account persistence shapes: persisted target, тот же request-native Client, A2 `FOR NO KEY UPDATE`, original Better Auth write и COMMIT. Transaction callback adapter повторно обёрнут; concurrent revoke-other deletes на одном Client сериализованы. Не требуется новый transaction/lock на весь provider network flow.
- Исключение inactive own-signout ограничено signed current cookie token и одним cleanup; bulk revoke и чужие session targets его не наследуют. Lifecycle unavailable/unexpected различаются и восстанавливаются после Better Auth error wrapping.
- Active SET-05 password/freshness/own-session protections, shared canonical limiter, registration/linking policy, endpoint-last cookies и success-only SA02 facts сохранены. Дополнения I5 связывают эти границы; runtime source после принятого I4 head не менялся.
- Публичные/state fields не расширены; schema/migrations/dependencies/permanent docs в cumulative diff не менялись. Предыдущее A1/A2–H acceptance не выдаётся за новую проверку этого PR.

### Независимо выполненные проверки

- **4/4 затронутых native suites, 69/69 tests PASS** на собственной disposable PostgreSQL17: auth-runtime, session-atomic, account-security и OAuth/rollback. Реальные persisted-state races, обе очередности final admission/write, I5 retained cookies/SET-05/pending callback и observer/failure cases.
- **9/9 релевантных application files, 65/65 tests PASS**: auth configuration/client/context/controls/linking/credentials, auth passthrough и Settings Account.
- Свежий Worker build, clean migrations 0000–0065 и **69-table manifest parity PASS**.
- Полный checked-in Settings Account/I5 Chromium harness повторён на собственном build/DB: **17/17 records PASS**, exact implementation SHA; **pageErrors=[], externalRequests=[]**. Активные SET-05 forms/limiter/freshness, EN/RU/HE/RTL/mobile, две retained cookies после fixture-deactivation, private document/.data401 без protected mutation, реальная stale password form и настоящая Sign out кнопка. Копия harness адаптирована только к локальным repo path и Chromium executable; assertions сохранены.
- **Собственный дополнительный original native probe PASS:** unsigned/tampered cookies не удаляют sessions; inactive actor не отзывает чужую; подставленные token/userId в sign-out body не выбирают cleanup target. Удаляется ровно текущая подписанная session, появляется один реальный deletion fact, другая inactive session и unrelated account сохраняются.
- В том же original probe A2 lifecycle fault внутри sign-out, который Better Auth ловит локально, восстановлен runtime как safe no-store503; unexpected failure пропагируется; physical session остаётся и ложного deletion fact нет.
- Через GitHub API повторно проверены SUCCESS на том же exact head: [CI #43439236882](https://github.com/iliya1947/vico-forum/actions/runs/43439236882), [AP10 #43439236624](https://github.com/iliya1947/vico-forum/actions/runs/43439236624), [SA01 #43439236742](https://github.com/iliya1947/vico-forum/actions/runs/43439236742), [SA03 #43439236903](https://github.com/iliya1947/vico-forum/actions/runs/43439236903). Полные remote 2269 app/765 native не объявляются локально повторёнными: собственные runs — 65 app/69 native.

### Границы результата

Google callback/link проверяется genuine Better Auth handler/state/adapter/PG17 с synthetic provider seam в native suite. Это отдельно от built Worker/browser email/Settings acceptance и от runtime error-composition proof; **live Google/deployed OAuth acceptance не заявляется**.

#315 учтён на `fc32f0ba36120b89a27831993519a00f2a40b953` по current workflow и Block B. Existing AUTH-LINK/SESSION/CACHE и другие audit findings не объявлены закрытыми этим lifecycle PASS. В частности, восстановленный typed lifecycle fault не означает общей remediation всех canonical adapter-delete failures.

Это PASS **SA04-I**, не всего SA04: J–R authoritative application writers, S full-package connected closure, SA05 deactivate action/UI/event, physical user deletion/reactivation, unconfigured secondary storage, docs closeout, merge, #315 remediation и Stage6/production не выполнялись и не назначаются этим результатом.

Все восемь source hashes совпадают с reviewed exact head. Worktree чист; свой Worker остановлен, synthetic vars/dependency link и disposable PostgreSQL-контейнер удалены.

**Следующий получатель — Мира:** принять независимый whole-I PASS и определить coordinator closeout/следующий bounded шаг для уже проверенного stable #329 по текущему workflow. Не расширять готовый проверенный PR ради повторения того же review. Лира/Марк и J+ этим сообщением не назначаются; merge — полномочие владельца. Лёва завершил назначение и STOP.

**Действие разработчика: подключить Миру.**

Local evidence /workspace/work/sa04-i-review-evidence/: SOURCE_MANIFEST.json (all8 hashes), application.log (65/9), native.log (69/4), build.log, schema-manifest.log, checked-in-browser.py and browser/results.json (17 exact-head records; errors=[], external=[]), probe.mts/probe.json/probe.log (original independent cookie forgery/cleanup/failure/facts). Harness copy changes only repo path + Chromium executable; assertions intact. Source hashes confirmed; runtime code matches prior I4 checkpoint, schema/dependencies/docs unchanged. Synthetic vars/link/Worker/container cleaned; worktree clean. No local full2269/765 or live Google claim. #315 atfc32f0ba36120b89a27831993519a00f2a40b953 consulted; no broad remediation. Master plan preserved; standing publication approval throughoutSA04 retained.

---

# Лёва — актуальный checkpoint: SA04-I5 technical plan published (2026-11-13)

**Planning COMPLETE/STOP; Mira plan scope/fit review next.** Full plan [#6851946924](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6851946924), exact #329 `85104942e75071a67b4a4b37212ce5bca7361fe4`, main/base `13456a17f23c1385bef8ab11c735f43d201edd02`. I1–I4 coordinator checkpoints PASS; I5/whole-I not accepted.

- Source-based I5 plan: one bounded connected Better Auth lifecycle closure on current configured subsystem, preserving I1–I4 and SET05.
- No source-confirmed mandatory runtime rewrite; prefer targeted connected native tests + extension of existing Settings Account browser harness + read-only disposable PR CI. Runtime corrections only for reproduced current-scope gaps, with smallest fix/regression.
- Required composition evidence: two old cookies, inactive pre-routing/HTTP/direct/SET05 denial, pending Google link/callback with existing native provider seam, final persistence ordering, active/expired/sliding cookie ordering, telemetry on/off, classified failure restoration, signed one-session own-signout exception.
- Current I4 family proofs are reused rather than multiplied across every endpoint. No entire-OAuth transaction/lock and no invented global rollback of earlier committed work. J–R, SA05, #315 remediation and external activation stay separate.
- Planning only: no implementation edits or local tests/build/browser executed; not an I5 or whole-I PASS. Next Mira plan scope/fit/granularity review; Lira/Mark unassigned.

Inspected actual six-file cumulative #329, auth.server/session-write-guard, Worker/context/cookie composition, SET05 route/runtime and current native/OAuth/browser coverage. Official tag1.7.7 direct/common dispatch, hooks, internal adapter, OAuth and session sources fetched; installed core transaction fallback + signout sources verified. No mandatory code fix was confirmed by source diagnosis; no implementation tests run, no runtime test environment created. This is not independent whole-PR review.

I5 remains one result: current configured subsystem composition, native+actual built Worker/browser evidence, preserving SET05 and lifecycle write ordering. Do not invent push revocation, global OAuth rollback, unconfigured secondary storage, raw direct active token cleanup, upgraded freshness or session-revoke-link security remediation. Known #315 AUTH-LINK-01/AUTH-SESSION-01/02/03 boundaries explicitly separated at fc32f0ba36120b89a27831993519a00f2a40b953.

Reproducible planning: /workspace/work/sa04-i5-plan-evidence/I5_TECHNICAL_PLAN.md and SOURCE_MANIFEST.json. Worktree /workspace/work/sa04-i5-plan clean on exact head; no test/build/vars/dependency installation or source mutation. Standing developer publication permission covers all SA04. Master plan unchanged.

---

# Лёва — актуальный checkpoint: SA04-A2–H independent whole-PR PASS (2026-11-12)

Published report [#6835789162](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6835789162). User authorization for review-report/service publication persists throughout SA04.

## Лёва — независимая whole-PR проверка SA04-A2–H: PASS

Проверен **весь cumulative diff Draft [#328](https://github.com/iliya1947/vico-forum/pull/328), 49 файлов**, exact head `0a917b6f4f55f991bea6e6031b43a0c4f0dc2f85`, против merged A1 main/base `593a03964b8407b249f7c9f5eb117ddb8b07736d`, принятого SA04 technical plan и bounded назначений A2–H. В реализации/исправлениях этого PR не участвовал; код при проверке не менял.

**Вердикт: PASS — 0 подтверждённых current-scope A2–H дефектов.** Coordinator whole-PR PASS и независимая проверка относятся к одному stable head. A1 уже проверен и merged; повторным отдельным A1 gate этот отчёт не является.

### Подтверждённый scope

- A2/A3: параметризованный active predicate, различимые active/deactivated/missing и unavailable/unexpected результаты, сохранение cause; mutation primitive использует caller-owned transaction и `FOR NO KEY UPDATE`. Ограничение autocommit явно обозначено; runtime auth/writer integrations здесь не объявлены.
- A4: строгий allowlist публичной identity, соответствие user ID/state, нейтральные поля inactive и canonical UTC calendar-year retention, включая leap-day clamp. **SA04-A4-MIRA-01 CLOSED**; sub-year/точная граница перепроверены в выполненном suite.
- B–H: canonical profile; topic/current posts; category latest/pinned и section; Popular/Unanswered/Tag/Search/Unread; Help shared modes и For-me; Users directory; mentions; online/heartbeat; оба notification readers и post revision history. Identity и lifecycle читаются из одной joined user row; private state не переносится в публичный DTO.
- Public identity скрывается до возврата reader/сериализации; UI использует generic localized Deleted user. Stable IDs/profile relationships, опубликованный текст/revisions, counts/ranking/order, inbox membership/read lifecycle и существующие permissions сохранены. Owner/private evidence остаётся под собственным admission. Directory name matching/count использует neutral name; mention/online filtering выполняется до count/order/LIMIT.
- Schema/migrations/manifest/dependencies не менялись; только необходимые historical test fixtures дополнены существующей 0065. Никаких новых last-manager/count/recovery правил.

### Независимо выполненная проверка

- **184/184 application files, 2269/2269 tests PASS.**
- **11/11 затронутых native files, 106/106 tests PASS** на собственной disposable PostgreSQL 17: включая row-lock/KEY SHARE, обе очередности deactivation/heartbeat, directory paging/count, все public reader families, mixed inbox и append-only revision history.
- Свежий build Worker **PASS**; clean disposable migrations 0000–0065 **PASS**; фактическая **69-table manifest parity PASS**, `drizzle-kit check` **PASS**. Генератор повторно не запускался: новых schema изменений нет; ранее установленное ограничение BigInt generation не объявляется исправленным.
- **Оригинальный probe**, отдельно от авторских tests: сняты direct DTO до fixture-deactivation, затем сравнены 11 reader families. ID/content/statistics/order и прочие проверенные non-identity данные сохранились; retained identity отсутствует. Old-name directory count стал 0, stable-ID lookup остался; mention candidate исчез; inactive heartbeat отказал; исходные name/image физически сохранены в БД.
- **Оригинальный Chromium → built Worker → настоящий Better Auth → disposable PG17:** 36 records основного probe + 5 дополнительных focused records. Проверены fresh HTML и .data публичных surfaces в EN/RU/HE, нейтральный avatar и mixed active/deleted authors, mounted profile после реального GET revalidation, member Unread/inbox, permission-protected history HTTP + общий Quick actions DOM и guest401. Дополнительный probe использует настоящий **`q`** Users search: old-name total0, neutral-name/ID total1. Owner видит допустимую private account section рядом с neutral public profile; Guest не получает email/private sections.
- В основном Chromium probe **pageErrors=[]**. Внешние browser requests блокировались; единственный перехваченный avatar request относится к намеренно открытому **active baseline до деактивации**, не к neutralized identity. Production/provider/OAuth/R2 обращения не выполнялись.
- Через GitHub API повторно подтверждены **SUCCESS на этом exact head**: [CI #43296996996](https://github.com/iliya1947/vico-forum/actions/runs/43296996996), [SA01 #43296997261](https://github.com/iliya1947/vico-forum/actions/runs/43296997261), [SA03 #43296997015](https://github.com/iliya1947/vico-forum/actions/runs/43296997015), [AP10 #43296997445](https://github.com/iliya1947/vico-forum/actions/runs/43296997445). Полные 717 native из CI локально повторно не заявляются: собственный native run — 106.

### Граница результата и передача

#315 учтён на head `fc32f0ba36120b89a27831993519a00f2a40b953`: current security workflow и Block E, включая известный PUBLIC-PROJECTION-01 о moderation metadata. Его remediation/cache/availability/Stage6 задачи не превращены в findings этого identity slice и не объявлены закрытыми.

**Это PASS только A2–H, не завершение всего SA04.** I+ auth/session closure, J–R writer gates, S connected enforcement closure, SA05/deactivate control, docs closeout, merge и production не выполнялись и не назначаются этим отчётом. Fixture deactivation не является продуктовой командой.

Source hashes всех 49 файлов совпадают с reviewed head; worktree чист. Собственный Worker остановлен, synthetic vars/dependency symlink удалены, disposable PostgreSQL-контейнер удалён.

**Следующий получатель — Мира:** принять независимый PASS и выполнить следующий coordinator шаг для уже проверенного stable slice по текущему workflow; последующее enforcement назначать отдельно. Лёва завершил назначение и STOP. Лира/Марк и I+ этим отчётом не назначаются.

**Действие разработчика: подключить Миру.**

Reproducible local evidence: /workspace/work/sa04-a2-h-review-evidence/ — SOURCE_MANIFEST.json (49 exact-head hashes), application.log, native.log, build.log, schema-manifest.log, db-check.log, seed.mts/native-baseline.json, native-after.mts/native-after.json, browser.py/browser.json and EN/RU/HE topic screenshots, directory-owner.py/directory-owner.json. Initial probe GitHub URL fixture violated existing profile validation; corrected fixture only before successful run. The three main probe URLs with unused “search” parameter prove safe unfiltered responses only; actual directory q matching/count proved separately by directory-owner.py. Only pre-deactivation active-baseline avatar URL was intercepted; no outgoing browser request allowed. Clean worktree; owned vars/link/Worker/container removed.

---

# Лёва — актуальный checkpoint: SA04-A1 independent review PASS (2026-11-11)

Published report: [#6808027706](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6808027706). Developer explicitly authorized publication of review reports and service-state updates for the entire SA-04 ("Разрешаю на протяжение всего SA-04"). This authorization persists across SA-04 handoffs.

Лёва — независимая техническая проверка SA04-A1: **PASS, 0 подтверждённых current-scope дефектов**.

Результат назначения [#6807714452](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6807714452). Проверен весь cumulative diff Draft #327, 10 файлов, exact head `3d6c7c06ac1442a5a4b3ff7f8fbe77454ca8479c`, base/main `ce62e783e71433a00c2fe4874ee26dfc54614628`. В реализации не участвовал; код при review не менял.

- Schema/0065/snapshot/journal/manifest согласованы: только три nullable-поля и CHECK существующей user; история миграций сохранена. Три auth fixtures только применяют 0065, runtime scope не расширен.
- Независимо: **84/84 native-теста PASS**, обновление заполненной БД сохраняет прежние данные; **75 CHECK-вариантов в пяти часовых поясах** дали ожидаемый результат. Реальный Better Auth не принимает клиентские state-изменения и не раскрывает поля через signup/session, включая non-NULL состояние.
- PostgreSQL 17.11: **69-table manifest parity PASS**, фактический CHECK hash совпадает с manifest; **SA04-A1-MIRA-01 CLOSED**. `drizzle-kit check` PASS. Четыре опубликованных exact-head CI/browser runs повторно проверены — SUCCESS.
- Ограничение: дополнительный локальный `drizzle-kit generate` падает на сериализации BigInt и ошибочно возвращает exit 0; **тот же сбой воспроизведён на базовом main** с теми же зависимостями. Генерация не засчитана как PASS; это не подтверждённая A1-регрессия. Snapshot/journal и фактическая SQL/manifest parity проверены отдельно.

PASS относится только к A1 foundation. Runtime enforcement, projections, A2+, SA05+, production и remediation #315 не проверяются как завершённая реализация этим результатом.

**Следующий получатель — Мира:** coordinator closeout уже проверенного bounded #327 на том же head; готовый PR не расширять ради повторного review. Merge — владелец. Лёва STOP; новых назначений Лире/Марку нет.

---

# Лёва — актуальный checkpoint: SA-04 technical plan published (2026-11-11)

**Planning COMPLETE; next Mira scope/fit review.** Full plan [#6806249892](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6806249892), actual main `ce62e783e71433a00c2fe4874ee26dfc54614628`. Accepted full plan #6745289141. SA-03 implementation #324 and docs #326 merged/closed.

Inspected actual schema, AuthRuntime/session-context/Worker/auth-api, pinned Better Auth1.7.7 dispatch/db-hooks/adapter/session/schema source, public readers/projections, direct repository mutations/finalization/replay/locks and generation pseudonymized admission. Official tag source links are in published plan.

Plan defines:
- existing-user three-field state + UTC calendar-year CHECK; next forward migration currently0065, schema/meta/manifest parity, no new tables/deps/grants;
- shared typed active predicate and per-actor transaction admission; unconditional session-create and HTTP/direct auth guard, narrow canonical adapter target-write boundary where hooks lack target context; preserve facts/cause/cookie/freshness/limiter/link semantics;
- whole domain coverage including receipt/replay early returns, uploads/final publication, authz/AP10/Complaints, user settings/inbox/read-state/presence and new user generation plans without modifying task identity or cancelling accepted background jobs;
- one neutral public identity contract with SQL/data masking, directory name-filter/count safety, inactive mentions/online exclusion; published text/IDs/attachments retained and private evidence not globally masked;
- sequential bounded checkpoints A–S with STOP, only one result assigned by Mira at a time; one Draft cumulative package and no partial deactivate activation; native/HTTP/direct/concurrency/browser acceptance.

No product contradiction/blocker requiring Owner choice found. Planning only: no project source/schema/migration/permanent-doc edits, no runtime/test setup and no implementation test PASS claimed. #315 checked at dac4b314836e5797f0bd0558f3ea1e37fba14795; security upgrades/remediation/Stage6 separate. Deactivate command/control, lifecycle event and retention UI remain SA-05.

Publication initially blocked by automatic review; developer then explicitly approved the exact ready local plan ("Разрешаю"). Approved file published unchanged in #251 as comment6806249892. Local plan /workspace/work/sa04-plan-evidence/SA04_TECHNICAL_PLAN.md SHA25658009b942924764adaed086bd0158be5403d30a88b43e797035a1f7393426566; publication block resolved. Checkout /workspace/work/sa04-plan clean at main.

**Next Mira:** review published package plan scope/fit/granularity before implementation handoff. Lev completed/stopped; Lira/Mark remain unassigned. Do not implement or launch SA-05+, production/security activation or storage controls. Approved master plan unchanged; common/workflow synchronized.

---

# Лёва — active assignment: SA-04 package-specific technical plan

Current main: `ce62e783e71433a00c2fe4874ee26dfc54614628`.
Accepted full Super-admin plan: #6745289141.

Prepare the **SA-04 technical plan only** against the actual current post-SA-03 repository.

Required result:
1. Reconcile the accepted SA-04 target with current code/schema after SA-03.
2. Identify the concrete implementation seams, migration/state changes, active-account enforcement boundaries, neutral public identity projection boundaries, and applicable acceptance.
3. If SA-04 is too large to implement safely as one slice, decompose it into independently safe bounded implementation subtasks without activating the SA-05 deactivate operation/control.
4. Publish the plan in #251 and **STOP**.

No implementation, SA-05+, Stage6/production, #315 activation or deferred journal-storage work in this assignment.

# Лёва — актуальный checkpoint: SA-03 independent PASS (2026-11-11)

**PASS — 0 confirmed open current-scope defects. MIRA-01, LEV-01, LEV-02 CLOSED.** [Full result #6804234730](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6804234730). PR #324 exact `4ad17beae65da338f5efcb2a1596e7fafc3b67c5`, base/main `538084fd472c65459ad55ab30a0f96fbfdd68e56`; assigned after Mira coordinator PASS on same head.

Complete cumulative 43-file scope re-evaluated. Three correction files fully read (ProfileView / its tests / connected harness); 40 source hashes unchanged from previous independent review; authority/project source docs unchanged. State now tracks unmatched fresh versus previously matched snapshot; parent HeaderAuth effect lag no longer poisons fresh authorized DTO, while known signout invalidates previously shown snapshot until a new authorized read. Target/self feedback uses same lifecycle.

Original probes unchanged except paths/ports, reverse-equality asserted:
- LEV-01 identity-boundary.py: real signout200/HeaderAuth guest/held profile GET, zero Owner sections, zero authz forms, private email absent, fresh guest.data redacted.
- LEV-02 account-switch.py: actual synthetic session actor switch + existing header SPA Link; correct target/locale/profile viewer, router idle; four sections visible with first fresh authorized DTO, no additional refresh needed. No page errors.
- MIRA-01 retained own/Admin connected destinations remain correct.

Fresh app 10 files /82 tests PASS; native 2 files /9 tests PASS; build, clean PG17 migrations0000–0064 and actual schema manifest69 PASS. Own built Worker/Better Auth/PG17/Chromium checked-in acceptance26/26 PASS, exact head, no page errors/external requests. Copy changes only local paths and Chromium executable; assertions verified identical. Remote exact-head CI #43075154722 / SA03 #43075154724 / SA01 #43075154613 / AP10 #43075154611 SUCCESS verified API. #315 head e9f6433c971eefc652bca408455deb70339795c1, relevant plan/A/E blobs unchanged; security activation/remediation separate.

Evidence /workspace/work/sa03-final-review-evidence: SOURCE_MANIFEST.json; closure-verification.json; unchanged original probes + JSON/logs/screenshots; checked-in browser copy + browser/results.json26/screenshots; app/native/build/schema logs. /workspace/work/sa03-final-review clean exact head. Own vite4206 / vico-sa03-lev-final stopped/removed; vars/dependency link removed. No source/schema/permanent docs implementation edits or production actions.

**Next Mira:** coordinator closeout / Owner merge route for current exact head. PR324 remains open/Draft/unmerged; merge Owner-only, docs closeout later separate assignment/PR. Lev completed/stopped; Lira/Mark unassigned by Lev. No SA04+/Deactivate/future security/storage work. Master approved plan unchanged.

---

# Лёва — актуальный checkpoint: SA-03 repeat independent CHANGES REQUIRED (2026-11-11)

**Active: SA03-IMPL-LEV-02 · P2 OPEN; LEV-01 and MIRA-01 CLOSED.** [Full result #6803187864](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6803187864). PR324 exact `d7a526ac00ef56ebd8c8bd4035cc84fb9731ad49`, main/base `538084fd472c65459ad55ab30a0f96fbfdd68e56`. Assigned after Mira coordinator PASS on same head. Complete43-file scope re-evaluated; six correction files fully read,37 source hashes unchanged.

Original identity-boundary.py unchanged except paths/port independently confirms LEV-01 closure: UI signout200, HeaderAuth guest, held revalidation GET, zero old private sections/forms/email before response. MIRA-01 own/Admin routes remain correct.

LEV-02: in ProfileView lines39–50 new privileged reference resets latchfalse, but old currentSessionUser immediately sets ittrue while HeaderAuthProvider effect has not yet copied new initialUser. Header effect catches up next render, same fresh privileged reference leaves latchtrue. Actual original Chromium→built Worker→real Better Auth→disposablePG17 reproducer account-switch.py: member tab on profile; move actual synthetic session to boundOwner (same local seam as accepted harness); click existing .auth-user SPA Link; correct target, HeaderAuth Owner, router idle, actual profile.privileged.viewerId and locale.authUser.id both Owner, loaded measures/authz/Owner sections, but0 private DOM. Fresh .data200 contains target email; extra unchanged router.revalidate restores4 sections. No browser error. Need bounded restore-fresh-versus-clear-stale correction and no-reload SPA regression. Current checked-in recovery reloads document, misses synchronization phase.

Independent local fresh build/native9/migrations0000–0064/schema69 PASS. App related10files81PASS; initial unchanged Editor combined waitFor timeout, isolated14/14PASS (logs preserved, no clean combined PASS claimed). Checked-in connected Chromium25/25PASS, original assertions verified identical after local path/Chromium adaptation. Original signout closure JSON and new account-switch loaded-state proof retained. Remote exacthead CI #43068315572 / SA03 #43068315602 / SA01 #43068315460 / AP10 #43068315564 allSUCCESS verified API.

#315 refreshed head1771190c5e0afee82b065a5f309917a7aa50799d, A/E blobs unchanged; separate security audit/remediation/Stage6 excluded. No source/schema/permanent docs edits, no active own resources. /workspace/work/sa03-repeat clean exacthead, evidence /workspace/work/sa03-repeat-evidence: SOURCE_MANIFEST, identity-boundary.py/json/log, account-switch.py/json/log/fresh-owner-hidden.png, original checked-in browser copy + browser/results25, app/editor repeat/native/build/schema logs. Own vite4205 + vico-sa03-lev-repeat removed; vars/node_modules link removed.

**Next Mira:** verify the single new correction packet and determine assignment. Lev completed/stopped; Lira/Mark unassigned by Lev. Corrected head needs coordinator then independent cycle; current head not merge-ready; master plan unchanged.

---

# Лёва — актуальный checkpoint: SA-03 independent CHANGES REQUIRED (2026-11-11)

**Active result:1 confirmed current-scope finding, SA03-IMPL-LEV-01 · P2 OPEN.** [Full result #6802006091](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6802006091). PR324 exact `4bfdfdd14a70534bd95c308de9d1c8c2df672c76`, main/base `538084fd472c65459ad55ab30a0f96fbfdd68e56`; Mira repeat coordinator PASS preceded review. Reviewed all43 cumulative files against accepted plan #6796912006; no review-time implementation edits.

LEV-01: actual header Sign out200→HeaderAuth guest, but ProfileView renders old privileged loader DTO until revalidation returns. Current actor is never compared with DTO viewer for display; viewer/target React key stays old. Original real Chromium/built Worker/Better Auth/disposable PG17 probe held only next.data GET, observed2 Owner sections/private target email/26 authz forms under guest header. Independent fresh guest.data200 correctly redacted, released refresh removes sections. Bounded expected fix: invalidate stale privileged sections/controls/feedback on known current viewer/target change while preserving public profile/server authority; regression uses UI signout without reload and delayed refresh. Existing24-checkpoint browser signout reloads and misses it. Not server admission bypass.

MIRA-01 verified CLOSED; other current-scope defects not confirmed. Target-scoped allowlists/SQL source predicates/typed measure join/cursors/private cache/authority/legacy/source identities reviewed. No Deactivate, generic audit/new writers; own Settings unchanged.

Local independent app11files/93tests PASS; native2files/9tests PASS; build PASS; cleanPG17 migrations0000–0064 PASS;69-table actual manifest parity PASS; snapshot comparison exactly six new indexes. Checked-in Chromium harness rerun24/24 PASS on own build/DB, exact head, no page errors/external requests; adaptation only local repo/Chromium paths, original assertions intact. Original identity-boundary probe separately confirmed LEV-01. Remote exacthead CI43059203099/SA0343059202894/SA0143059202975/AP1043059203239 all SUCCESS verified API. #315 refreshed a27dd964139c445086911ac4a245475ab53fe6f5; no future security activation/remediation imported.

Evidence /workspace/work/sa03-review-evidence: SOURCE_MANIFEST.json; application.log/database.log/build.log/schema-manifest.log; checked-in-browser.py and browser/results.json/screenshots; original identity-boundary.py/.json/.log and known-guest-stale-owner.png. /workspace/work/sa03-review clean exacthead. Own vite4204 and Docker vico-sa03-lev-review removed; .dev.vars/node_modules link removed. First sandbox native DB attempt failed due blocked loopback, escalated same tests PASS. No unresolved environment blocker.

**Next recipient Mira:** bounded correction packet published in #251; determine assignment. Lev completed/stopped; Lira/Mark not appointed by Lev. New corrected head requires coordinator then independent review; current head not merge-ready. Master plan unchanged.

---

# Лёва — актуальный checkpoint: SA-03 technical planning complete (2026-11-11)

**Next: Mira scope/fit review.** Full plan [#6796912006](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6796912006); main `538084fd472c65459ad55ab30a0f96fbfdd68e56`. SA-02 implementation #319 and docs #323 merged/closed. SA-03 implementation is not started/assigned.

Inspected current profile/public repository, legacy Admin detail/directory, AP-09 targeted authz component/action, AP-10 readers/authority, self-only Settings account runtime, session/account schema, SA-02 current/history source projections and Worker/Hyperdrive wiring. Owner source records remain authoritative; no copied journal/new event producers. Exact Owner target read cannot reuse/loosen self-only AccountSecurityRuntime. Current profile `isOwner` means self; proposed rename `isSelf`.

Plan defines independent section gates, target-only safe identity/method/session DTO, fixed per-user SQL source predicates/typed measure join, bounded source-aware pagination/cursors, private/no-store on all profile responses, canonical links/guarded legacy redirect, extraction/reuse of inline authorization with bounded recovery and actor/target feedback isolation. One forward index-only migration (six actor/subject timeline indexes), no tables/dependencies/grants/new mutation. Deactivate/account lifecycle/SA04+ excluded.

#315 checked at `eb1bd8dbd3038f409766f0f5b884b8a3cc883df8`: isolation remains separate, profile cache/privacy obligations included. Source-backed plan finds no new product contradiction/blocker. Native/browser/privacy/permission/target-switch acceptance enumerated; no implementation tests were run or claimed. Local planning checkout `/workspace/work/sa03-plan` remains clean at main, no server/container started.

Planning assignment complete; no project implementation/permanent docs/master-plan edits. Mira reviews next; Lira/Mark unassigned. Service workflow/common synchronized below published plan. Owner merge policy unchanged.

---

# Лёва — актуальный checkpoint: full SA02 repeat independent PASS (2026-11-11)

**Active result: PASS — 0 confirmed open current-scope defects for cumulative SA02 A/B/C/D. All LEV-01/-02/-03/-04/-05 CLOSED.** [Full result #6794797870](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6794797870). PR319 reviewed exact head `3f217c98dd9dcbd51518eda82b51506fbede936c`, base `e279cb6c032a489a9044ca1191407df887c364b4`, current main `f6fd4b2c031b2132b04eace18704a59aed1dfec8` (only AGENTS.md service rule). Mira coordinator PASS/assignment #6794574095 after Lira correction #6794365343.

- Whole71-file cumulative scope against accepted full/D plans #6768069279/#6789135043 re-evaluated. Delta since full review0a45909b is4commits/3files;68 exact source hashes unchanged. Three files reviewed fully: HistoryEntry, History route tests, existing browser harness. No Lev implementation edits.
- LEV-04 CLOSED: source-aware observation monitor determines total/version labels (attachments/users, registration/database). Original independent migrated-PG→actual readers→React probe PASS: Retained evidence events1, Policy version7; correct Users/System control labels covered by native route-component tests EN/RU/HE.
- LEV-05 CLOSED: numeric formatting allowlisted semantic count fields; exact `00012345678901234567890` retained across DB/.data/Target user ID DOM/Entity ID DOM. Unknown/null, escaping/bdi preserved; true large counts remain BigInt-safe. Original Worker/Chromium browser reproducer3 assertions PASS without weakening.
- Original diagnostic sources copied from sa02-full-review-evidence with only checkout paths/port4202→4203 changed; reverse substitution equality asserted. Old failing probes/screenshots preserved, new ones PASS. Old LEV-01/-02/-03 occurrence/current/refs probes also PASS on new head.
- Fresh local26 app files/176 tests PASS. Build,clean disposable PG17 migrations0000–0063,69-table manifest parity PASS. Expanded existing real Chromium→built Worker→Better Auth→PG17 acceptance27 checkpoint groups PASS, results exact implementationHead, pageErrors=[], externalRequests=[].
- Browser harness delta only waits boundedly for existing async waitUntil503 persistence; event code/monitor/payload assertions unchanged. No runtime changes. Protected documents/.data, secret redaction, source coalescing/facts, outages/degraded recording/recovery, fresh Owner identity, EN/RU/HE/RTL320/768/1280/keyboard still pass.
- Full native126 tests/runtime privilege probes were NOT locally rerun on this presentation-only delta: all backend/schema/grants/native tests byte-identical to previous tested head. Prior evidence retained; new head checked through real PG probes/migrations/connected path and independently verified full database CI. No local full-suite claim.
- Exact-head remote CI#43009722614 SUCCESS checks+database; SA01#43009722439 SUCCESS; AP10#43009722575 SUCCESS all4 jobs independently verified.
- #315 refreshed at head `3199f07a17c16ae7f987cdd1a5e0424470085a1e`; general plan/index blob `0d79a0a7d1876ac0999396328f4814bd929e899d` and relevant BlockA blob `4d5ef9b8db30e351a4e626924c7aab228d2c80b4` unchanged. New E3/E4/E8 audit context separate; no security implementation/activation.
- Evidence `/workspace/work/sa02-final-rereview-evidence/`: SOURCE_MANIFEST(68 unchanged/3 corrected/all71 hashes), PROTECTED_SCOPE, copied original probes and logs; history-display-probe3 PASS; history-display-browser3 PASS/.data↔DOM JSON and3screenshots; original closed ABC probe PASS; build/app/schema logs; browser/results.json27cases/6 EN-RU-HE screenshots. Visually inspected corrected attachment History screenshot.
- Clean detached checkout `/workspace/work/sa02-final-rereview`. Owned Worker4203 stopped, container sa02-lev-final-rereview / port55513 disposable DBs removed, synthetic .dev.vars/build copy and dependency links removed.
- **Next recipient Mira:** coordinator closeout of full SA02 after independent PASS and determination of remaining applicable gates/further route. Lev finished/stopped; Lira/Mark not assigned. PR319 remainsDraft; no self-issued Ready/merge/docs/future-stage work. Technical PASS does not claim Owner visual approval/deployed acceptance/permanent docs. No SA03+/Stage6/separate security foundation/production/deferred journal work. Owner alone merges; no last-admin/manager-count/recovery rule.

Prior negative-review checkpoint, full original reproducer sources and earlier plan/review history retained verbatim below. Their former open findings and next actions belong to historical heads.

---

# Лёва — актуальный checkpoint: full SA02 independent review completed, 2 findings (2026-11-11)

**Result: CHANGES REQUIRED — SA02-IMPL-LEV-04/P2 and LEV-05/P3 OPEN.** [Full packet #6793653705](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6793653705). PR319 reviewed exact head `0a45909bfb3a403af63a4693455d519f8a0e9ea6`, PR base `e279cb6c032a489a9044ca1191407df887c364b4`, current main `f6fd4b2c031b2132b04eace18704a59aed1dfec8` (AGENTS-only rule change to minimum7 service files). Mira whole-PR PASS preceded assignment in workflow; author final#6793188515; accepted plans#6768069279/#6789135043.

- **LEV-04/P2:** app/super-admin/history-entry.tsx fields dictionary64–65 keyed solely by name. Real security.attachments observation total is labelled Persisted users; real accounts.registration observation version labelled Database version. Actual reader output/DB correct. Real PG/React probe shows evidence1→users1 and policy7→DBversion7; actual built Worker/Chromium ordinary samples show evidence0→users0 and policy1→DBversion1. Scope-aware labels required, preserving actual Users/System labels; no backend/schema changes.
- **LEV-05/P3:** Value103–104 BigInt/Intl formats every digit-only string regardless field. Valid text user ID `00012345678901234567890` stored/serialized unchanged, shown as `12,345,678,901,234,567,890` in Target user ID/Entity ID. Confirmed actual PostgresAuthFactWriter/History and protected Worker .data vs Chromium DOM. Format only real numeric fields; opaque refs verbatim including leading zeros. No auth bypass/storage loss claimed.
- Whole71-file cumulative scope reviewed. D adds/modifies30 files since accepted25ac415;41 of42 accepted A/B/C files byte-identical (only Worker capability wiring changed), prior snapshot still ancestor. Old LEV-01/-02/-03 probes PASS, remain CLOSED. No additional confirmed current-scope defect.
- Fresh local checks:26 app files/168 tests,11 native PG17 files/126 tests PASS. Build,0000–0063 migrations,69-table manifest, positive/negative runtime privileges PASS. Expanded existing Chromium harness27 checkpoint groups PASS, no JS errors/external requests, exact-head metadata; separate presentation semantic probes intentionally FAIL on reviewed head.
- Remote exact-head jobs CI#42999991624 SUCCESS checks/database; SA01#42999991412 SUCCESS; AP10#42999992082 SUCCESS all4jobs independently verified. Local full-CI suite not rerun.
- #315 refreshed current head `4e4477755490c31e87377ab527e853d54da3af65`: source plan was split. General map blob `0d79a0a7d1876ac0999396328f4814bd929e899d`, BlockA `4d5ef9b8db30e351a4e626924c7aab228d2c80b4` read fully. BlockA foundation vs later activation remains a separate package. Current auth/privacy/public-cache audit findings not reclassified as introduced SA02 defects.
- Evidence `/workspace/work/sa02-full-review-evidence/`: SOURCE_MANIFEST/PROTECTED_SCOPE, app/database/build/schema/privilege logs, original A/B/C probe PASS logs, history-display-probe.mts/log, history-display-browser.py/log/json, history-browser-seed.mts/json, three wrong-label/ID screenshots, expanded browser/results.json27cases and6 EN/RU/HE screenshots. Visual inspection included attachment History wrong label and HE320 Overview.
- Own disposable PG container sa02-lev-full-review (55512, native+Worker DBs) removed; preview4202 stopped; .dev.vars/build copy/node_modules links removed; detached implementation checkout `/workspace/work/sa02-full-review` clean. No implementation or docs edits, no agent launch/appointments/merge/production.
- **Next recipient Mira:** assess the combined packet and continue coordinator cycle. Lev completed/stopped; Lira/Mark not appointed by Lev. PR319 remains Draft, no independent fullSA02PASS/merge readiness. SA03+/Stage6/production/deferred journal occupancy/archive/clear excluded; no last-manager/admin-count/recovery rule.

## Independent diagnostic sources for LEV-04/-05

External evidence only. First script requires exact-head checkout/dependencies, Node24/tsx with **--tsconfig /workspace/work/sa02-full-review/tsconfig.cloudflare.json** (automatic JSX runtime), and disposable loopback PG17 DATABASE_URL ending _test. It migrates/drop-cleans a unique isolated schema and compares real reader/sample output to real React SSR. Its three assertions fail on this head for two root causes. A preliminary harness launch without project JSX config produced React-not-defined; corrected harness uses actual config, and that setup error is not a product finding.

Browser reproducer runs after unchanged checked-in expanded SA01 harness has created its own synthetic email Owner + bound Owner fixture in an independently migrated disposable Worker DB; built head served only on4202 with synthetic Owner binding. Seed script creates one legal synthetic numeric text user and a real allowlisted auth fact. Browser script signs in through actual Better Auth and temporarily maps that disposable session to bound Owner, as existing harness does, restores/signs out in finally; no real account/production involved. Source values/.data stay correct while screenshots/DOM expose the errors.

### Real PG → current/sample → History → React probe

```typescript
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import pg from 'pg';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createInstance} from 'i18next';
import {I18nextProvider} from 'react-i18next';
import {HistoryEntry} from '../sa02-full-review/app/super-admin/history-entry';
import {canonicalEnglishCatalog} from '../sa02-full-review/app/localization/catalog';
import {PostgresOwnerSa02Current} from '../sa02-full-review/db/owner-sa02-current';
import {PostgresOwnerSa02History} from '../sa02-full-review/db/owner-sa02-history';
import {PostgresAuthFactWriter} from '../sa02-full-review/db/owner-auth-facts';

const url=process.env.DATABASE_URL!;assert.equal(new URL(url).hostname,'127.0.0.1');assert.ok(new URL(url).pathname.endsWith('_test'));
const schema='lev_display_'+crypto.randomUUID().replaceAll('-','');
const client=new pg.Client({connectionString:url,options:'-c search_path='+schema});
const pool=new pg.Pool({connectionString:url,options:'-c search_path='+schema});
const numericId='12345678901234567890';
const i18n=createInstance();
await i18n.init({lng:'en',initAsync:false,defaultNS:'common',resources:{en:{common:Object.fromEntries(Object.entries(canonicalEnglishCatalog.common).map(([k,v])=>[k,v.source]))}}});
const render=(entry:any)=>renderToStaticMarkup(React.createElement(I18nextProvider,{i18n},React.createElement(HistoryEntry,{entry,locale:'en'})));
const pairs=(html:string)=>Array.from(html.matchAll(/<dt>(.*?)<\/dt>\s*<dd>(.*?)<\/dd>/gs),m=>[m[1].replace(/<[^>]*>/g,''),m[2].replace(/<[^>]*>/g,'')]);
await client.connect();
try{
 await client.query('create schema '+schema);
 for(const name of (await readdir('/workspace/work/sa02-full-review/drizzle')).filter(x=>/^\d{4}_.+\.sql$/.test(x)).sort())
  await client.query((await readFile('/workspace/work/sa02-full-review/drizzle/'+name,'utf8')).replaceAll('"public".','"'+schema+'".'));
 await client.query('insert into "user"(id,name,email) values($1,$2,$3)',[numericId,'Synthetic numeric ID','numeric@test.invalid']);
 await client.query("insert into forum_attachment_security_events(id,upload_id,uploaded_by_user_id,context_key,draft_id,file_name,declared_mime,detected_type,reason,declared_byte_size) values ('display-evidence','display-upload',$1,'synthetic','synthetic','synthetic.txt','text/plain','unknown','invalid',10)",[numericId]);
 await client.query('update forum_registration_settings set version=7 where id=1');
 const fact=await new PostgresAuthFactWriter(pool).append({kind:'account.created',userId:numericId});
 await new PostgresOwnerSa02Current(pool).readCurrent();
 const reader=new PostgresOwnerSa02History(pool);
 const attachments=await reader.readTimeline({area:'security',monitorKey:'security.attachments'});
 const registration=await reader.readTimeline({area:'accounts',monitorKey:'accounts.registration'});
 const users=await reader.readTimeline({area:'accounts',monitorKey:'accounts.users'});
 const evidenceSample=attachments.entries.find(e=>e.origin==='system-observation')!;
 const registrationSample=registration.entries.find(e=>e.origin==='system-observation')!;
 const userFact=users.entries.find(e=>e.id===fact.id)!;
 const checks=[
  {case:'attachment sample total labelled as evidence',pass:pairs(render(evidenceSample)).some(([label,value])=>label===i18n.t('superAdminSa02TotalEvidence')&&value==='1'),source:evidenceSample,rendered:pairs(render(evidenceSample))},
  {case:'registration policy version labelled as policy',pass:pairs(render(registrationSample)).some(([label,value])=>label===i18n.t('superAdminSa02PolicyVersion')&&value==='7'),source:registrationSample,rendered:pairs(render(registrationSample))},
  {case:'opaque numeric user ID preserved byte-for-byte',pass:[i18n.t('superAdminHistoryTargetUser'),i18n.t('superAdminHistoryEntityId')].every(label=>pairs(render(userFact)).some(([key,value])=>key===label&&value===numericId)),source:userFact,rendered:pairs(render(userFact))},
 ];
 console.log(JSON.stringify(checks,null,2));
 assert.equal(checks.filter(x=>!x.pass).length,0,'independent real-PG History presentation semantics');
}finally{await pool.end();await client.query('drop schema if exists '+schema+' cascade');await client.end();}
```

### Browser synthetic source seed

```typescript
import assert from 'node:assert/strict';
import pg from 'pg';
import {PostgresAuthFactWriter} from '../sa02-full-review/db/owner-auth-facts';
const url=process.env.DATABASE_URL!;assert.equal(new URL(url).hostname,'127.0.0.1');assert.ok(new URL(url).pathname.endsWith('_test'));
const numericId='00012345678901234567890';
const pool=new pg.Pool({connectionString:url});
try{
 await pool.query('insert into "user"(id,name,email) values($1,$2,$3)',[numericId,'Numeric reference fixture','numeric-browser@test.invalid']);
 const saved=await new PostgresAuthFactWriter(pool).append({kind:'account.created',userId:numericId});
 console.log(JSON.stringify({numericId,eventId:saved.id}));
}finally{await pool.end();}
```

### Real Worker/Chromium History probe

```python
import json,os,shutil,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright

repo=Path('/workspace/work/sa02-full-review')
out=Path('/workspace/work/sa02-full-review-evidence')
base='http://127.0.0.1:4202'
assert os.environ['DATABASE_URL'].endswith('_test')
def sql(statement,params=None):
    js="""import pg from 'pg';const v=JSON.parse(await new Promise(r=>{let s='';process.stdin.on('data',x=>s+=x);process.stdin.on('end',()=>r(s))}));const c=new pg.Client({connectionString:process.env.DATABASE_URL});await c.connect();try{console.log(JSON.stringify((await c.query(v.sql,v.params)).rows))}finally{await c.end()}"""
    r=subprocess.run([shutil.which('node'),'--input-type=module','-e',js],cwd=repo,input=json.dumps({'sql':statement,'params':params or []}),text=True,capture_output=True,check=True)
    return json.loads(r.stdout)

seed=json.loads((out/'history-browser-seed.json').read_text())
email=sql("select email from \"user\" where email like 'sa01-%-owner@test.invalid'")
assert len(email)==1
results=[]
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    ctx=browser.new_context(extra_http_headers={'cf-connecting-ip':'203.0.113.77'},viewport={'width':1280,'height':900},service_workers='block')
    response=ctx.request.post(base+'/api/auth/sign-in/email',headers={'Origin':base},data={'email':email[0]['email'],'password':'synthetic-browser-password-123456'})
    assert response.status==200,response.status
    original_id=response.json()['user']['id']
    moved=sql('update "session" set user_id=$1 where user_id=$2 returning id',['sa01-synthetic-owner',original_id]);assert len(moved)==1
    page=ctx.new_page()
    try:
        for monitor,area in [('security.attachments','security'),('accounts.registration','accounts')]:
            path=f'/en/super-admin/monitoring/{area}/{monitor}/history'
            response=page.goto(base+path,wait_until='networkidle');assert response.status==200
            item=page.locator('li[data-history-origin="system-observation"]').first
            pairs=item.locator('dl > div').evaluate_all('(rows)=>rows.map(row=>[row.querySelector("dt").textContent,row.querySelector("dd").textContent])')
            data=ctx.request.get(base+path+'.data');assert data.status==200
            results.append({'monitor':monitor,'rendered':pairs,'status':response.status,'private':response.headers.get('cache-control')})
            page.screenshot(path=str(out/(monitor+'-wrong-label.png')),full_page=True)
        path='/en/super-admin/monitoring/accounts/accounts.users/history'
        response=page.goto(base+path,wait_until='networkidle');assert response.status==200
        item=page.locator('li[data-history-origin="auth-event"]').filter(has=page.locator('bdi',has_text=seed['eventId']))
        assert item.count()==1
        pairs=item.locator('dl > div').evaluate_all('(rows)=>rows.map(row=>[row.querySelector("dt").textContent,row.querySelector("dd").textContent])')
        data=ctx.request.get(base+path+'.data').text();assert seed['numericId'] in data
        results.append({'case':'numeric opaque ID','storedAndSerialized':seed['numericId'],'rendered':pairs})
        page.screenshot(path=str(out/'numeric-id-formatted.png'),full_page=True)
    finally:
        sql('update "session" set user_id=$1 where id=$2',[original_id,moved[0]['id']])
        ctx.request.post(base+'/api/auth/sign-out',headers={'Origin':base},data={})
        ctx.close();browser.close()
(out/'history-display-browser.json').write_text(json.dumps(results,indent=2))
print(json.dumps(results,indent=2))
attachment=next(r for r in results if r.get('monitor')=='security.attachments')
registration=next(r for r in results if r.get('monitor')=='accounts.registration')
numeric=results[-1]
checks={
 'attachments_not_users':not any(label=='Persisted users' for label,value in attachment['rendered']),
 'policy_not_database':not any(label=='Database version' for label,value in registration['rendered']),
 'opaque_id_unchanged':all(any(label==key and value==seed['numericId'] for label,value in numeric['rendered']) for key in ['Entity ID','Target user ID']),
}
print(json.dumps(checks))
assert all(checks.values()),checks
```

Previous plans/review checkpoints retained verbatim below; their former active states are historical.

---

# Лёва — актуальный checkpoint: SA02-D technical handoff delivered (2026-11-11)

**Active result:** executable SA02-D plan/PR strategy [#6789135043](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6789135043) for Mira coordination. Assignment #6789052062; accepted full plan #6768069279 §§9/11/12 unchanged. **Lev completed/stopped; D implementer/reviewers not assigned.**

- Main `e279cb6c032a489a9044ca1191407df887c364b4`, Draft implementation #319 `25ac41573847f9fbce79897b2e019fd246b400cc`, branch chatgpt/sa02-accounts-security verified current. A/B/C review cycle CLOSED (#6788764135), Mira PASS #6788548049 + independent Lev PASS #6788696141, all findings CLOSED.
- Proposed D delivery in same unfinished SA02 PR #319 as normal descendants of accepted backend head; no intermediate backend merge/extra stacked chain. Preserve old exact-head review/ancestry; new D head needs fresh cumulative A/B/C/D coordinator then independent whole-PR review. Same-PR strategy remains a proposal to Mira, not a unilateral implementation assignment.
- Sequence: existing facade/Worker/request-context reader wiring + exact-Owner routes/cursors; typed Accounts/Security/history destinations +4/3 cards/context links; shared source-aware History +two Overview summaries +locale/RTL; expanded existing SA01 connected harness/path filters +stable-head final handoff.
- Reuse PostgresOwnerSa02Current/History and native sources, not copied SQL/events; retain System reads/5xx writer. Strict area/monitor/query/v1/legacy scope validation AFTER exactOwner; classified503, no unexpected error misclassification. Canonical links use actual Admin/Settings/Attention helpers/guards.
- Existing System URL and outgoing routing seam preserved; actual new route components must pass independent Admin/Owner-origin substitution. Cumulative recorded attempts, shared recording-hour budgets, overflow/unknown/gaps; no fabricated24h/continuous coverage or all-forum audit. Safe source/actor/target/entity/IP display, no secret/raw payloads/external lookups.
- #315 head `dcd65ec1666c1b0f881737825f55c27c27e7db13`, plan blob `df2d500ccb2750d43422bf5d30f5b0c5370401ff` unchanged. No Stage6 activation, SA03+, production or deferred journal management. No last-admin/manager-count/recovery rule.
- Planning only. Read actual current factory/context/Worker, route inventory/loaders/views, AdministrativeRouting/helpers/substitution regression, localization and existing SA01 browser workflow; docs/SUPER_ADMIN.md read fully. No implementation edits/new tests/build/browser/provisioning. Clean source checkout /workspace/work/sa02-abc-rereview retained from prior review.
- **Next recipient Mira:** scope/plan review of D proposal and implementation handoff coordination. Do not start implementation or assign Lira/Mark before coordinator continuation.

## Full D handoff text

## Лёва — SA02-D: исполнимый технический handoff для проверки Мирой

Назначение [#6789052062](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6789052062). Это детализация принятого [плана#6768069279, §§9/11/12](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6768069279), **не перепланирование A/B/C и не implementation PASS**. Сверены main `e279cb6c032a489a9044ca1191407df887c364b4`, Draft#319 head `25ac41573847f9fbce79897b2e019fd246b400cc`, actual routes/readers/routing/locale/browser seams и docs/SUPER_ADMIN.md.

### 1. PR/base и review boundary

**Предлагаю продолжить D в существующем Draft implementation PR#319**, branch `chatgpt/sa02-accounts-security`, base `main`. Начать обычными последующими commits от проверенного `25ac415...`, сохранив его ancestry и ссылки на A/B/C review#6788548049/#6788696141 и closeout#6788764135. Это тот же незавершённый SA02 implementation из принятого плана; отдельного merge A/B/C ради базы для D или дополнительной stacked-PR цепочки не требуется.

A/B/C-контракты и закрытые findings не пересматриваются; D меняет только необходимое подключение/read facade, routes/views/routing/localization/acceptance. Если обнаружится дефект самого принятого backend, отдельная доказанная эскалация в#251, без скрытой переделки. **После первого D commit прежний PASS остаётся доказательством только `25ac415...`, а не нового head.** После завершения D: freeze новый head → весь cumulative A/B/C/D PR против актуального main проверяет Мира → после coordinator PASS независимая whole-PR проверка Лёвы того же head. Ready/merge readiness — только после применимых финальных gates; merge выполняет владелец. Permanent docs/state — отдельный последующий docs PR.

### 2. Исполнение D — четыре последовательных checkpoint в этом PR

**D1 · Подключить accepted readers и маршруты.**
- В [existing Hyperdrive facade](https://github.com/iliya1947/vico-forum/blob/25ac41573847f9fbce79897b2e019fd246b400cc/db/hyperdrive-owner-system.ts), request context и Worker composition подключить `PostgresOwnerSa02Current`/`PostgresOwnerSa02History`. Сохранить System reads и 5xx recorder; новые current/scoped/global reads делегировать A/B/C классам, не копировать SQL/журнал и не создавать второй producer.
- Добавить explicit current pages `/:locale/super-admin/monitoring/accounts` и `.../security`. Existing System URL сохранить. Одну existing monitor-History registration/loader расширить до `.../monitoring/:area/:monitorKey/history` с fixed membership system/accounts/security; System spelling останется прежним. Existing `.../events` и Overview recent events переключить на общую source-aware projection.
- **Каждый loader/resource сначала requireSuperAdmin**, затем allowlisted area/key/query/cursor: guest401/non-Owner403; unknown/mismatch404; malformed/duplicate/unknown query400. Использовать scope-aware `parseOwnerHistoryCursor`, сохранив допустимые legacy System/global cursors; старый parser не должен отклонять новые v1 cursors. Private/no-store для documents/.data/errors. Только classified availability→503; schema/programming error не превращать в400/503. Best-effort observation failure остаётся degraded recording по принятому контракту.

**D2 · Typed navigation и current UI.**
- Дополнить [SuperAdminAddressFamily](https://github.com/iliya1947/vico-forum/blob/25ac41573847f9fbce79897b2e019fd246b400cc/app/administrative-routing/addresses.ts) destinations accounts/security и typed area+monitor History; сохранить existing System wrapper. Новые cards, back/paging/refresh/Overview links используют active UI provider/request accessor и existing path wrappers; без ручных Owner bases, новых origins/route hiding.
- Две current pages используют один accepted SA02 current read и area projection: **4 Accounts +3 Security monitors**, их реальные read-time/coverage/recording states; соседние History и Refresh. Monitoring index делает две области live, остальные placeholders сохраняет.
- Показывать recorded cumulative attempts, текущий recording-hour/shared256+256 pools, overflow/unknown/gaps и неполноту; не выдавать их за точные event-time24h/полный security audit. Bigint totals без потери через Number. Нулевые записи не означают «атак нет».
- Только существующие contextual links: users→Admin Users; methods/sessions→собственный Settings Account & security; registration→Owner Forum & roles; attachments→Attention/security/attachments. Переиспользовать их canonical helpers/authority. Никакого target-user управления credentials/sessions или нового POST proxy.

**D3 · History/Overview/localization.**
- Адаптировать existing Timeline к `OwnerHistoryPage`: различать exact/native facts, measured samples, recording-hour coalesced groups и state gaps/overflow. Показывать safe source identity, occurred/recorded semantics, actor/target/entity refs, source-quality/IP, first/last/count и epoch; неизвестного actor не угадывать. Native registration/evidence не копировать; original (origin,id) глобально один раз, scoped показывает тот же source.
- Overview получает **две краткие Accounts/Security summaries из того же reader** + ссылки в детали; семь cards второй раз не рендерить. Existing System summary сохраняется, recent events идут через общую History.
- Catalog + EN/RU/HE manual values/fingerprints, labels kinds/fields/states, generic locale/RTL/responsive/keyboard. IP/opaque IDs — escaped plain text/bdi, без внешнего lookup URL; никаких tokens/raw auth/evidence context.

**D4 · Финальная connected acceptance и stable-head handoff.**
- Расширить **existing** `tests/browser/super-admin/check.py` и `sa01-browser.yml`, не клонировать workflow. Добавить path filters для routing, новых reader/factory/auth/observability модулей и0063, чтобы проверка срабатывала и при backend-only regression. Сохранить прежние SA01 checkpoints и Settings/Admin/AP10 regression jobs.
- На disposable PG17 + built Worker + real Better Auth/Chromium выполнить signup/signin/password-change/revoke/signout, denied auth и Owner guard401/403; проверить DB→current→adjacent History→global с тем же source ID и ростом coalesced count вместо дублей. Native registration/evidence получать canonical producer/service path; real signed synthetic Google transport/R2 fixture допустимы, live external accounts не нужны.
- Проверить direct document/.data guest/non-Owner/Owner, invalid scope/cursor и private errors, revoked session/account switch, no secret serialization, recording degradation/outage503/schema unexpected/recovery, mixed pagination и сохранение precision/source identity.
- **Actual new route components** с independently substituted Admin/Owner origins: current/detail/History paging/back/refresh/Overview и canonical Admin destination используют нужную family. EN/RU/HE, RTL320/768/1280, keyboard, no JS errors/external lookup; screenshots + exact-head JSON.

### 3. Проверки и stop

До author handoff: lint/typecheck/app tests, focused new route/presentation/routing tests, native existing A/B/C regressions + integration, clean migrations/schema/privileges, build/Worker smoke, expanded connected suite и применимые regression CI на одном stable head. Backend quotas/retention/fact proof/cursors не переписывать; новые тесты проверяют подключённый путь и границы.

Checkpoint после D1/D2/D3 фиксирует **частичную готовность**, не самостоятельный whole-PR PASS/разрешение merge; дефекты и смену scope обсуждать в#251. После D4 автор публикует final exact head и фактические результаты, затем STOP для свежей Миры. Марк и исполнитель этим сообщением не назначаются.

**Исключено:** SA03+, deactivation/привилегированный user profile, новые producers/schema/dependencies/security rules, отдельный Owner Worker/Access/auth/session/DB/deploy из#315, production и deferred journal occupancy/archive/clear. #315 пересверен на head `dcd65ec1666c1b0f881737825f55c27c27e7db13`, security plan blob `df2d500ccb2750d43422bf5d30f5b0c5370401ff` unchanged.

**Следующий получатель — Мира:** проверить этот короткий D delivery/PR strategy, затем координировать implementation handoff. Лёва планирование завершил и останавливается. Код/PR319 не изменял; D implementation/tests/build/acceptance не выполнялись.


Earlier independent A/B/C PASS and previous checkpoints retained verbatim below; their former “next step” records are historical.

---

# Лёва — актуальный checkpoint: SA02 A/B/C repeat independent PASS (2026-11-11)

**Result: PASS — 0 confirmed open current-scope defects. All SA02-IMPL-LEV-01/-02/-03 CLOSED.** [Full result #6788696141](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6788696141). Reviewed PR #319 exact head `25ac41573847f9fbce79897b2e019fd246b400cc`, base/main `e279cb6c032a489a9044ca1191407df887c364b4` unchanged. Mira coordinator PASS/assignment #6788548049 after Lira correction #6788446097.

- Whole cumulative A/B/C scope: same 42 files against accepted plan #6768069279 and recovery decision #6777700709. Six correction files fully reviewed; other 36 SHA256 hashes match prior complete review on c9ff7b660fc40924f6adfd649b1daa0d80acb045, contracts/callers re-evaluated. No implementation authored/edited by Lev.
- LEV-01: actual Hyperdrive factory forwards trusted second Date. Old independent collector→factory→writer→PG reproducer copied with only checkout path changed, assertions/fixtures unchanged. PASS: capture late then early, flush late→early, stored occurred_at early2026-01-01T00:00:01Z / late02Z; recorded_at order opposite; gap0; direct writer control PASS.
- LEV-02: old external PG fixture with user/credential/session/initial settings2020 passes all four Accounts coverage checks; actual retained first event/sample2026 determines boundary. Current counts/settings timestamp retained; real registration-admission/Admin History and attachment native sources still included.
- LEV-03: old PG known-user/session probe PASS; actual fresh built Worker/Better Auth signup event projected with stored targetUserId/entityId and actorUserId=null, separate from entity type. Native global/accounts.sessions/security.auth tests cover actor≠target and null actor. Canonical SQL columns override payload collision; no secret/raw auth fields added.
- Fresh independent relevant tests: 18 application files / 99 tests; 11 native PG17 files / 126 tests PASS. Build, 69-table schema manifest parity, runtime positive/negative privilege probes PASS.
- Fresh real Chromium→built Worker→Better Auth→separate disposable PG17: 16 SA01 regression checkpoint groups PASS; results implementationHead exact25ac415..., pageErrors=[], externalRequests=[]. EN/RU/HE/RTL/mobile/keyboard, protected document/.data/history/strict cursors, timeout503/redaction, DB outage, revoked session checked. This is not absent SA02-D final acceptance.
- Independently verified remote exact-head jobs: CI #42968881718 SUCCESS checks+database; SA01 #42968881704 SUCCESS; AP10 #42968881701 SUCCESS all four jobs. Full2181app/679PG suite not locally rerun; numbers above are actual local checks.
- #315 refreshed head `7096dedd1ae6caae6a9f1f869ac9b0cd1c571a88`; security plan blob `df2d500ccb2750d43422bf5d30f5b0c5370401ff` unchanged. New audit D8/D11/D4 context reviewed; baseline findings and future BlockA/Stage6 isolation remain separate and unimplemented here.
- Evidence `/workspace/work/sa02-abc-rereview-evidence/`: SOURCE_MANIFEST.json (36 unchanged/6 corrected, all42 hashes), PROTECTED_SCOPE.json, occurrence/history-current/worker-history probes+logs, application/database/build/schema-manifest/privileges logs, browser/results.json+6 screenshots and browser/worker logs. Original prior failing sources/logs remain in sa02-abc-review-evidence and personal-file history below.
- Clean detached checkout `/workspace/work/sa02-abc-rereview`; owned Worker4201 stopped; Docker sa02-lev-abc-rereview and disposable DBs removed; .dev.vars/build copy/node_modules links removed. Build-generated .dev.vars serializes values in quotes, so cleanup ownership checked via synthetic secret marker/URL rather than exact first-line equality.
- **Next recipient Mira**: coordinator closeout of backend A/B/C and determination of next bounded step in #251. Lev finished/stopped; no Lira/Mark appointment. PR319 stillDraft; SA02-D unstarted/unassigned, no fullSA02 acceptance or merge readiness. No SA03+/Stage6/production/deferred journal work. Owner alone merges; no last-admin/manager-count/recovery principle.

Earlier checkpoints and full original probe sources retained verbatim below. Their previous open findings/assignments describe historical heads, not the current verdict.

---

# Лёва — актуальный checkpoint: SA02 A/B/C independent review completed (2026-11-10)

**Result: CHANGES REQUIRED — 3 current-scope findings.** [Full packet #6779818918](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6779818918). Implementation PR319 exact head `c9ff7b660fc40924f6adfd649b1daa0d80acb045`, base/main `e279cb6c032a489a9044ca1191407df887c364b4` unchanged. Assignment/Mira PASS#6779377295; accepted plan#6768069279, recovered scope#6777700709.

- **SA02-IMPL-LEV-01 OPEN (P2):** production createHyperdriveAuthFactWriter drops append second trusted occurredAt. Correct collector→factory→PG chain uses flush Date, reverses occurrence ordering; direct underlying-writer Date control PASS. Existing MIRA-02 test bypasses factory.
- **SA02-IMPL-LEV-02 OPEN (P2):** current users/methods/sessions/registration coverage incorrectly merges user/account/session.created_at and current registration singleton.updated_at, which are absent from retained History. Actual PG17 all4 monitors report2020 against first actual event/sample2026-11-10. Keep current counts/updatedAt and true registration-admission/native-source coverage; no backfill.
- **SA02-IMPL-LEV-03 OPEN (P2):** auth-event History SQL/DTO reads only payload and omits actor/target/entity refs stored separately. Known session-created event → values:{} with no known user/session identity. Reproduced both typed persisted PG fact and real Better Auth signup through built Worker. No SA03 lookup/UI required; safe IDs only, unknown actor stays null.
- Whole cumulative42-file A/B/C source/schema/test scope checked, not merely correction10-file delta. Independent99 app tests(18files),123 native PG17 tests(11files), build,69-table schema parity, positive/negative privileges, real SA01 Chromium16checkpoint groups PASS on exact head. Native bulk81→32facts+49gap and105ambiguous→0facts+105gap covered. Full CI suite not locally rerun.
- Remote exact-head CI42900496484,SA0142900496340,AP1042900496488 allSUCCESS independently verified. No extra confirmed defect in admission/renewal/coalescing/source/proof/dedup/rollback/count/sampling/cursor/native source/SA01 paths. Missing D intentionally outside review.
- #315 refreshed current head `70d9efdd0e5d9910effcf95eaf610048cf471ac9`, plan blob `df2d500ccb2750d43422bf5d30f5b0c5370401ff` unchanged. Existing baseline security findings/BlockA isolation separate; no security implementation.
- Evidence `/workspace/work/sa02-abc-review-evidence/`: SOURCE_MANIFEST.json, occurrence/history-current/worker-history probe source+logs; application/database/build/schema-manifest/privileges/browser logs; browser/results.json exacthead and16cases/no errors/no external; six EN/RU/HE desktop/mobile screenshots. Implementation checkout `/workspace/work/sa02-abc-review` clean detachedhead. Temporary dependency links/synthetic vars removed; own Worker4200 stopped; own disposable PG17 container sa02-lev-abc-review removed.
- **Next recipient Mira** for combined finding assessment/coordinator cycle. Lev finished/stopped; does not assign Lira/Mark or start D/SA03+/Stage6/production/deferred journal operations. PR319 stillDraft, no fullSA02PASS/merge readiness. Owner alone merges; no last-admin/manager-count/recovery principle.

## Independent diagnostic reproducer sources

External evidence only, not proposed implementation/tests. Run with exact-head checkout at `/workspace/work/sa02-abc-review`, installed locked dependencies available to checkout/evidence, Node24/tsx, and loopback disposable PG17 DATABASE_URL ending `_test`. Occurrence probe builds/drops its isolated owner schema; current/history probe applies full0000–0063 into its isolated schema and drops it in finally. Their assertions intentionally FAIL on reviewed head. Third probe reads an independently migrated disposable Worker DB after the unchanged checked-in SA01 browser harness has performed real email signup.

### Production timestamp adapter probe

```typescript
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import pg from 'pg';
import {createHyperdriveAuthFactWriter} from '../sa02-abc-review/db/hyperdrive-auth-facts';
import {PostgresAuthFactWriter} from '../sa02-abc-review/db/owner-auth-facts';
import {RequestAuthFactCollector} from '../sa02-abc-review/app/observability/auth-fact-collector.server';

const url=process.env.DATABASE_URL!;
assert.ok(new URL(url).pathname.endsWith('_test'));
assert.equal(new URL(url).hostname,'127.0.0.1');
const schema='lev_occurrence_'+crypto.randomUUID().replaceAll('-','');
const admin=new pg.Client({connectionString:url});await admin.connect();
try{
 await admin.query('create schema '+schema);
 await admin.query('set search_path to '+schema);
 await admin.query((await readFile('/workspace/work/sa02-abc-review/drizzle/0062_owner_monitoring_foundation.sql','utf8')).replaceAll('--> statement-breakpoint',''));
 const scoped=new URL(url);scoped.searchParams.set('options','-c search_path='+schema);
 const directPool=new pg.Pool({connectionString:scoped.toString()});
 const direct=new PostgresAuthFactWriter(directPool);
 const early=new Date('2026-01-01T00:00:01.000Z'),late=new Date('2026-01-01T00:00:02.000Z');
 try{await direct.append({kind:'auth.sessionCreated',userId:'review-user',sessionId:'control'},early);}finally{await directPool.end();}
 const control=await admin.query("select occurred_at from owner_events where entity_id='control'");
 assert.equal(control.rows[0].occurred_at.toISOString(),early.toISOString());
 let gaps=0;
 const collector=new RequestAuthFactCollector(()=>createHyperdriveAuthFactWriter(scoped.toString()),n=>{gaps+=n;});
 collector.capture({kind:'auth.sessionCreated',userId:'review-user',sessionId:'late'},late);
 collector.capture({kind:'auth.sessionCreated',userId:'review-user',sessionId:'early'},early);
 await collector.flush();assert.equal(gaps,0);
 const result=await admin.query("select entity_id,occurred_at,recorded_at from owner_events where entity_id<>'control' order by occurred_at,id");
 const rows=result.rows.map(r=>({id:r.entity_id,occurredAt:r.occurred_at.toISOString(),recordedAt:r.recorded_at.toISOString()}));
 console.log(JSON.stringify({directControl:'PASS',gaps,rows},null,2));
 assert.deepEqual(rows.map(r=>[r.id,r.occurredAt]),[['early',early.toISOString()],['late',late.toISOString()]],'production collector/factory must preserve captured occurrence times');
}finally{
 await admin.query('drop schema if exists '+schema+' cascade');await admin.end();
}
```

### Current coverage and known references probe

```typescript
import assert from 'node:assert/strict';
import {readdir,readFile} from 'node:fs/promises';
import pg from 'pg';
import {PostgresOwnerSa02Current} from '../sa02-abc-review/db/owner-sa02-current';
import {PostgresOwnerSa02History} from '../sa02-abc-review/db/owner-sa02-history';
import {PostgresAuthFactWriter} from '../sa02-abc-review/db/owner-auth-facts';

const url=process.env.DATABASE_URL!;assert.equal(new URL(url).hostname,'127.0.0.1');assert.ok(new URL(url).pathname.endsWith('_test'));
const schema='lev_history_'+crypto.randomUUID().replaceAll('-','');
const client=new pg.Client({connectionString:url,options:'-c search_path='+schema});
const pool=new pg.Pool({connectionString:url,options:'-c search_path='+schema});
await client.connect();const checks:{name:string;pass:boolean;actual:unknown;expected:unknown}[]=[];
try{
 await client.query('create schema '+schema);
 for(const name of (await readdir('/workspace/work/sa02-abc-review/drizzle')).filter(n=>/^\d{4}_.+\.sql$/.test(n)).sort()){
   await client.query((await readFile('/workspace/work/sa02-abc-review/drizzle/'+name,'utf8')).replaceAll('"public".','"'+schema+'".'));
 }
 const oldAt='2020-01-01T00:00:00.000Z';
 await client.query('insert into "user"(id,name,email,created_at) values ($1,$2,$3,$4),($5,$6,$7,clock_timestamp())',
  ['lev-old-user','Old synthetic user','old-review@test.invalid',oldAt,'lev-known-user','Known synthetic user','known-review@test.invalid']);
 await client.query('insert into account(id,user_id,account_id,provider_id,password,created_at,updated_at) values ($1,$2,$1,$3,$4,$5,$5)',
  ['lev-old-credential','lev-old-user','credential','synthetic-only-hash',oldAt]);
 await client.query('insert into session(id,user_id,token,created_at,updated_at,expires_at) values ($1,$2,$3,$4,$4,$5),($6,$7,$8,clock_timestamp(),clock_timestamp(),$5)',
  ['lev-old-session','lev-old-user','synthetic-old-token',oldAt,'2030-01-01T00:00:00Z','lev-known-session','lev-known-user','synthetic-known-token']);
 await client.query('update forum_registration_settings set updated_at=$1 where id=1',[oldAt]);
 const occurred=new Date();
 const writer=new PostgresAuthFactWriter(pool);
 const created=await writer.append({kind:'account.created',userId:'lev-known-user'},occurred);
 const session=await writer.append({kind:'auth.sessionCreated',userId:'lev-known-user',sessionId:'lev-known-session',actorUserId:'lev-known-user'},occurred);
 const current=await new PostgresOwnerSa02Current(pool).readCurrent();
 const history=new PostgresOwnerSa02History(pool);
 const userHistory=await history.readTimeline({area:'accounts',monitorKey:'accounts.users',limit:50});
 const currentUser=current.monitors.find(m=>m.key==='accounts.users')!;
 const earliest=userHistory.entries.map(e=>e.occurredAt).sort()[0];
 checks.push({name:'coverageFrom matches earliest actually retained adjacent History source',pass:currentUser.coverageFrom===earliest,actual:{coverageFrom:currentUser.coverageFrom,history:userHistory.entries.map(e=>({origin:e.origin,id:e.id,at:e.occurredAt}))},expected:earliest});
 for(const key of ['accounts.methods','accounts.sessions','accounts.registration'] as const){
  const rows=await history.readTimeline({area:'accounts',monitorKey:key,limit:50});
  const first=rows.entries.map(e=>e.occurredAt).sort()[0];
  const monitor=current.monitors.find(m=>m.key===key)!;
  checks.push({name:key+' coverage is a retained History source',pass:monitor.coverageFrom===first,actual:{coverageFrom:monitor.coverageFrom,historyFirst:first},expected:first});
 }
 assert.ok(userHistory.entries.some(e=>e.id===created.id));
 const sessions=await history.readTimeline({area:'accounts',monitorKey:'accounts.sessions',limit:50});
 const fact=sessions.entries.find(e=>e.origin==='auth-event'&&e.id===session.id)!;
 assert.ok(fact);
 const raw=(await client.query('select actor_user_id,target_user_id,entity_type,entity_id from owner_events where id=$1',[session.id])).rows[0];
 checks.push({name:'auth History preserves known safe actor/target/entity references',pass:JSON.stringify(fact).includes('lev-known-user')&&JSON.stringify(fact).includes('lev-known-session'),actual:{stored:raw,projected:fact},expected:'known user/session identity retained in safe projection'});
 console.log(JSON.stringify(checks,null,2));
 assert.equal(checks.filter(x=>!x.pass).length,0,'independent current/history semantic checks');
}finally{await pool.end();await client.query('drop schema if exists '+schema+' cascade');await client.end();}
```

### Real Worker/Better Auth event projection probe

```typescript
import assert from 'node:assert/strict';
import pg from 'pg';
import {PostgresOwnerSa02History} from '../sa02-abc-review/db/owner-sa02-history';
const url=process.env.DATABASE_URL!;
assert.equal(new URL(url).hostname,'127.0.0.1');
assert.ok(new URL(url).pathname.endsWith('_test'));
const pool=new pg.Pool({connectionString:url});
try{
 const raw=(await pool.query("select id,actor_user_id,target_user_id,entity_type,entity_id from owner_events where source='auth' and kind='auth.sessionCreated' order by position desc limit 1")).rows[0];
 assert.ok(raw,'real Worker signup created an exact auth fact');
 const history=await new PostgresOwnerSa02History(pool).readTimeline({area:'accounts',monitorKey:'accounts.sessions',limit:50});
 const dto=history.entries.find(e=>e.id===raw.id);
 assert.ok(dto);
 console.log(JSON.stringify({producer:'real Worker / Better Auth email signup',stored:raw,projected:dto},null,2));
 assert.ok(JSON.stringify(dto).includes(raw.target_user_id)&&JSON.stringify(dto).includes(raw.entity_id),'History must retain safe known identity');
}finally{await pool.end();}
```

## Local verification commands

```text
node node_modules/vitest/vitest.mjs run app/auth app/observability app/super-admin db/owner-sa02-catalog.test.ts workers/app.test.ts workers/database-bindings.test.ts
DATABASE_URL=<local_disposable_test> node node_modules/vitest/vitest.mjs run --config vitest.database.config.ts tests/database/owner-attempt-telemetry.test.ts tests/database/owner-auth-facts.test.ts tests/database/sa02-auth-creations.test.ts tests/database/sa02-auth-oauth-rollback.test.ts tests/database/sa02-auth-observer.test.ts tests/database/sa02-auth-password-change.test.ts tests/database/sa02-auth-session-deletion.test.ts tests/database/sa02-current-state.test.ts tests/database/sa02-owner-history.test.ts tests/database/owner-system-history.test.ts tests/database/migrations.test.ts
```

Browser harness unchanged from checked-in tests/browser/super-admin/check.py except external-copy checkout path and existing system Chromium executable selection; real Worker preview4200, synthetic Owner binding, separate migrated disposable DB, IMPLEMENTATION_SHA exactc9ff. This is regression coverage, not SA02-D final acceptance.

Earlier checkpoints/history retained verbatim below; their superseded assignments/proposals are historical.

---

# Лёва — актуальный checkpoint: SA02 renewal correction delivered (2026-11-10)

**Full corrected plan [#6768069279](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6768069279)**, main `e279cb6c032a489a9044ca1191407df887c364b4`. Responds to Mira#6767512074, supersedes6767391552. **Await Mira re-review. Lev finished/stopped; Lira/Mark unassigned.**

- **SA02-PLAN-MIRA-01 CLOSED by Mira**, remains closed; **MIRA02 corrected in proposal, not accepted/closed yet**. No implementation PR/head.
- Old lifetime65,536 cap was permanently poisonable. Replaced by **DB-assigned UTC recording-hour admission,512 new attributed groups/hour,256 authenticated+256 anonymous**; finite per-window unknown/overflow/gap slots.
- New hour lazily gets fresh quota on first producer write, no cron/Owner visit/manual cleanup. Old saturation/archive size never lifetime gate; request/occurredAt/client TZ cannot choose budget. No extra epochs on saturation.
- Old groups and state retain source/actor/IP/operation/status/first/last/count indefinitely; no TTL/delete/eviction/reset. Same source across hours has distinct retained IDs. Current/lifetime summaries and stable cursor/global/scoped history reflect epochs; no fake exact event-time24h.
- Storage is bounded **growth rate H×(512+P+C)**, not constant lifetime bytes/rows. Up to12,288 attributed groups/day or4,485,120/365d plus finite state overhead; original65k was not carried over as high per-hour rate. Active flood may saturate next hour too; no promise of all-source completeness under infinite flood. If flood stops, future attribution resumes next hour.
- Same two proposed mutable relations, epoch in unique/quota/index keys. Transaction-local DB time, quota lock scoped(epoch,pool), rollback-safe count; no ambiguous retry/gap append bypass. Tests specified for exhausted past window→native writer recovery, last-slot/rollover races, late/future timestamps and idle jumps. No application test/code implemented.
- Accepted unchanged sections1/2/4/6/7/9/11 verified byte-identical; section3 only dependent count explanation,7-monitor table unchanged. Other changes only model5/History8/schema10/acceptance12/context13 and intro Owner/status.
- New Owner#6767828181: deferred separate occupancy/archive download/clear phase after entire current Super-admin plan, outside SA02/current remaining scope. Current retention unchanged; renewal never depends on future manual clearing.
- Main and315 e394f1586b4f857f2160e291a9b8fb3915067ead unchanged,20 current-main source hashes unchanged. PG17 official date/time/locking/UPSERT sources checked. Previous Better Auth1.7.7/CF source work preserved; no upgrade/Stage6 work.
- Evidence /workspace/work/sa02-renewal-plan-evidence/: SA02_CORRECTED_PLAN.md, PLAN_SCOPE_DIFF.patch, SCOPE_CHECK.json, PG17 snapshots; previous sa02-replan-evidence source/auth/315 refs retained. Clean checkout /workspace/work/sa02-replan.
- **Next recipient Mira** for correction review/coordinator continuation. Do not assign Lira/Mark, modify implementation/master accepted plan as approved, merge/deploy or implement deferred journal management.
- “...” continues current task else checks251; service publication authorized, Owner alone merges; no last-manager/admin-count/recovery principle.

Previous context retained verbatim below; superseded lifetime-cap policy is historical, not current proposal.

---

# Лёва — актуальный checkpoint: SA02 replacement plan delivered (2026-11-10)

**Active result:** whole replacement bounded SA02 plan [#6767391552](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6767391552), current main `e279cb6c032a489a9044ca1191407df887c364b4`, assignment#6766904312. **Await Mira scope/fit review. Lev finished/stopped; Lira/Mark unassigned.**

- Routing implementation#317/docs#318 merged/closed; old foundation independent review results are historical. SA02-PLAN-MIRA-01 pending review; no implementation PR/head.
- New plan supersedes6758838112 entirely, incorporates Owner#6759312425.7 Accounts/Security monitors, actual current readers, adjacent/global History/Overview; no SA03 profile/deactivation or generic security framework.
- Source attribution: authoritative known actor internal ID + trusted normalized network IP/provenance/quality when available, operation/outcome/status/first/last/count. No guessed email identity or secrets/raw requests. CF subrequests/PseudoIPv4 caveats explicit; local fixtures not live platform acceptance.
- **Proposed cap/no-eviction policy, not accepted:**65,536 lifetime attributed source-pattern rows, two32,768 pools(authenticated/anonymous), finite unknown/overflow/gap state. Repeats update same row; no TTL/reset/eviction/ever-growing time buckets/per-request gap rows. At saturation retained sources still update; new source patterns may be omitted, visibly counted as overflow with incomplete attribution. Do not pretend this preserves infinitely many sources; Mira must review this specific tradeoff.
- Exact account/method/password/session facts stay separate owner_events, never aggregated into attempt counters. Real-delete proof vs pre-read hook/no-op caveat, safe dedup, raw redirects not auto-success/failure, telemetry/proof errors never alter auth decision/cookies/status.
- Two new mutable relations owner_attempt_patterns + owner_attempt_telemetry_state; atomic increments/serialized quota, no ambiguous-commit blind retries. New auth/access counters lifetime recorded, not precise24h from first/last. Existing Owner tables append-only; native attachment/registration events projected without copies; source-aware precision-safe cursors and stable aggregate pagination.
- Current runtime grants scoped SELECT/INSERT/UPDATE only new telemetry tables/no DELETE, localization unchanged; future writer/reader role isolation under315. Forward0063 if main still0062, normal schema/metadata/manifest/provisioning tests; no production provisioning.
- Latest315 security input head `e394f1586b4f857f2160e291a9b8fb3915067ead`, plan blob0b4fee79a10dcf6f532f3758305d0896f88a7d88 unchanged; full315 plan/workflow/communication read. Future Owner Worker/Access/isolated Owner auth/Passkey/DB/deploy and external activation separate; no315 write.
- Actual installed better-auth/drizzle-adapter1.7.7 source verified with official hooks/database docs; Cloudflare IP reference checked. No dependency upgrade/Passkey implementation. Existing merged AdministrativeRouting reused for typed new destinations only.
- Evidence /workspace/work/sa02-replan-evidence/SA02_REPLACEMENT_PLAN.md, official snapshots, SOURCE_MANIFEST.json, SECURITY_REFERENCE_315.json. Clean checkout /workspace/work/sa02-replan on main e279cb6...; code/migrations/tests/build/runtime SA02 acceptance NOT performed.
- **Next recipient Mira** for entire replacement-plan review, especially useful attribution+cap/saturation vs indefinite retention. Do not assign Lira, implement SA02, modify master approved plan as accepted, merge or deploy before coordinator continuation.
- “...” continues current task else checks251; service publication authorized, Owner alone merges; no last-admin/manager-count/recovery rule.

Earlier context retained verbatim below; superseded assignments/plans/findings are history.

---

# Лёва — актуальный checkpoint: routing foundation independent PASS (2026-11-10)

**PR317 exact head `d12719bc8e6b2e6368489c16f2e0efa9ef6e3605`, base/main `24dfa9f51892490fae346f6079d6aa7fcfec1aa1`: independent whole-PR PASS,0 confirmed current-scope defects. FOUNDATION-LEV-01/-02 CLOSED.** [Result/handoff#6765085755](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6765085755).

- Assignment/Mira coordinator PASS#6764695060; approved plan#6761206804+#6761588752. Full36-file scope/callers checked; delta from34d1e4ac only super-admin-system.tsx+new actual-route regression.
- Both independent reproducers copied unchanged: AdminShell same-origin absolute/relative logical last entry and isolated SSR; actual System route Owner-family content/shell/three History/default links.2 files/5 tests PASS; expectations not weakened.
- Consumer audit:53 production helper calls with required routing arguments, plus text/manual actual caller review; no further confirmed omitted seam consumer. This is external diagnostic only, no repo linter added.
- Fresh local build PASS;24 files/255 relevant app tests PASS; PG17 migrations0000–0062 PASS; built-head SA01 Chromium16 checkpoint groups PASS with exact implementationHead metadata, no pageerrors/external requests.
- GitHub API individually verified all new-head jobs: CI#42794915937 checks/database; SA01#42794915727; AP10#42794915509/all4 SUCCESS. Full CI test counts not represented as locally rerun.
-12 protected config/source/docs files match base; DB/migrations/Worker/authz/deps unchanged. #315 head5329ef0... unchanged; Admin Public Worker/future Owner separate Worker contract respected without activation.
- Evidence `/workspace/work/routing-final-review-evidence/`: REVIEW.md, probes/logs, AST script/results, diff, scope/hash manifest, application/build/migrations and browser exact-head results. Local preview stopped, disposable DB removed, synthetic vars/symlinks removed; tracked checkout clean; implementation not edited during review.
- **Next recipient Mira** for coordinator continuation/closeout after PASS. Lev finished/stopped; Lira/Mark unassigned. Do not independently assign implementation/docs, merge or advance SA02. PR317 remains unmerged, Owner alone merges, PASS only exact head.
- SA02-PLAN-MIRA-01 / Owner#6759312425 remains open; #315 security integration/Stage6/production/visual acceptance outside current PASS. No last-manager/admin retention principle.
- User “...” continues active assignment, else checks251. Service publication already authorized; handoff context in servicePR, developer only connects next agent.

Previous personal context retained verbatim below; older assignments and findings are historical.

---

# Лёва — актуальный checkpoint: PR317 повторная независимая проверка (2026-11-10)

**Whole-PR result:** FOUNDATION-LEV-01 CLOSED; один подтверждённый current-scope FOUNDATION-LEV-02/P3; PASS не выдан. [Полный результат и передача Мире #6764152289](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6764152289).

- Actual reviewed head `34d1e4acb278fca27cd994e590dd3b9757f5b4d8`, main/base `24dfa9f51892490fae346f6079d6aa7fcfec1aa1`; all34 files checked. Assignment/coordinator PASS#6763991905. Approved plan#6761206804+#6761588752.
- LEV01 closed by unchanged independent reproducer3 PASS (relative/absolute same-origin preference + actual next-entry selection, isolated SSR trees) and new repository regression; correction delta only shell.tsx+shell-preferences.test.tsx.
- **LEV02:** app/routes/super-admin-system.tsx:29 content Monitoring Link calls superAdminMonitoringPath(locale) without provider routing. Helper takes static default; under independent Owner fixture shell/three History links correctly use owner.invalid/control but content back-link remains /en/super-admin/monitoring. Real route/component composition independently reproduced; loader data fixture only, no path/provider mock. Defaults pass. Expanded independent suite4 PASS/1 reproduced FAIL.
- First review missed this caller; do not claim all outgoing consumers migrated. Current foundation scope expressly covers existing helper callers; no real cross-origin deployment/Owner Worker/security transport required for this rendered-target defect. Recommendation remains narrow context propagation + actual System route coverage, for Mira disposition.
- Fresh local build PASS;23 files/253 tests PASS; PG17 migrations0000–0062 PASS; current-built-head SA01 Chromium16 groups and independent Admin/Settings Chromium11 groups PASS; exact-head CI#42789615619/#42789615866/#42789616057/all jobs independently SUCCESS.
-12 protected source/config/docs files match base; no DB/Worker/authz/schema/dependency changes. #315 head5329ef0... unchanged: Admin Public Worker, future separate Owner Worker; no activation here.
- Evidence `/workspace/work/routing-repeat-evidence/` includes REVIEW.md, original diagnostic, System route probe/log, build/application/migrations/browser results, scope/provenance. Raw SA01 result head metadata null because IMPLEMENTATION_SHA env unset; actual checkout/build head verified separately, raw results preserved.
- Cleanup complete: preview stopped, disposable DB removed, synthetic vars/symlinks removed; tracked checkout clean; implementation never edited during review.
- **Next recipient Mira** for coordinator disposition of full result and LEV02. Lev finished/stopped, Lira/Mark unassigned. Do not directly assign Lira or continue SA02. SA02-PLAN-MIRA-01 / Owner#6759312425 open.
- “...” means continue current assignment, else check251. Routine service writes authorized; Owner alone merges. No last-admin/manager retention principle.

Previous context retained verbatim below; old assignments/results are historical.

---

# Лёва — актуальное состояние после independent review PR#317 (2026-11-10)

**Роль:** технический планировщик/reviewer; реализацию не менял. **Результат whole-PR:** 1 confirmed current-scope finding FOUNDATION-LEV-01/P3; PASS не выдан. Полный отчёт и handoff Мире: [#6763198179](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6763198179).

- PR317 exact head `7f65741d5b3a65392287483d47c0ad6834075efc`, main/base `24dfa9f51892490fae346f6079d6aa7fcfec1aa1`; all33 files reviewed. Approved plan#6761206804 +#6761588752; Mira coordinator PASS/assignment#6762795987.
- Finding source app/admin/shell.tsx:41: pathname is compared directly with adminEntryPath(...,routing), whose new contract permits full URLs. At actual current /en/admin/users, an absolute same-origin Admin base suppresses recordAdminIndex. With adminEntry=last/adminLast=history, subsequent selectAdminEntry still chooses History. Relative base with same route selects Users.
- Independent unmocked AdminShell/provider/header-account/preferences/Router reproducer: SSR A/B/default isolation PASS; relative preference+entry selection PASS; absolute same-origin counterpart FAIL. This is current foundation substitution correctness; production/default relative path works. No future cross-origin deployment/transport/security gate implied.
- Local build PASS;22 files/250 app tests PASS; PG17 migrations0000–0062 PASS; checked-in SA01 real Chromium16 groups PASS; independent Chromium11 groups PASS including actual role mutation, measure redirect/DB/History, defaults/.data/non-Owner guards and EN/RU/HE mobile. No other confirmed current-scope defect.
- CI #42780591588, #42780591412, #42780591278 independently API-confirmed SUCCESS at exact head; nine protected key files identical to base; no routes/Worker/authz/DB/schema/deps change.
- #315 checked unchanged head5329ef0.../plan blob0b4fee7...: ordinary Admin Public Worker; future separate Owner Worker for Super-admin. No security implementation merged into foundation.
- Evidence `/workspace/work/routing-review-evidence/`, including REVIEW.md, independent-routing.test.tsx/log, browser results/logs, scope-manifest.json. Preview stopped, disposable DB removed, synthetic vars/symlinks removed; tracked checkout clean.
- **Next recipient Mira** for coordinator disposition; Lev finished/stopped; Lira/Mark unassigned. Do not assign Lira directly, merge, continue SA02 or edit implementation while reviewing. SA02-PLAN-MIRA-01/Owner#6759312425 still open.
- User “...” = continue active assignment, else check251. Routine service publication authorized; owner alone merges. No last-admin/manager retention principle. Agent handoff through servicePR; developer only connects next agent.

Previous personal context retained verbatim below; superseded assignments/results are history.

---

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


## 2026-11-11 — assigned: SA02 docs-only factual review

Review PR #323 exact `60a024304e6d595ea127bf19c948f15ca5ec39d2` after CI #43016059514 SUCCESS. Eight Markdown files only. Verify merged-SA02 factual status/contracts/history and future boundaries; do not reopen implementation #319. Report full docs finding packet or PASS, then stop.


## 2026-11-11 — assignment correction

The prior SA02 docs-only review assignment was rescinded as unnecessary Codex involvement. Lev is **unassigned** for PR #323; implementation #319 remains closed.


## 2026-11-12 — assigned: SA04-A2–H cumulative independent technical review

Review cumulative Draft PR #328 exact head `0a917b6f4f55f991bea6e6031b43a0c4f0dc2f85` as one stable A2–H package. A1 is already merged main baseline and previously received your independent PASS; verify compatibility with its contract without repeating #327 as a separate review.

Independently check the whole A2–H scope against the accepted SA04 plan, current Stage and repository behavior, including cross-checkpoint interactions. Classify only confirmed defects of the delivered A2–H scope; missing I+ enforcement/SA05 behavior is future work, not a defect by itself. Do not implement changes during review.

Publish one complete findings packet or PASS in #251, record your result in your service file/workflow as appropriate, then STOP. SA04-I remains unassigned.


## 2026-11-13 — active assignment: SA04-I5 technical plan

Prepare the **SA04-I5 technical plan only** against cumulative Draft #329 exact `85104942e75071a67b4a4b37212ce5bca7361fe4` and current main/base `13456a17f23c1385bef8ab11c735f43d201edd02`. I1–I4 have coordinator PASS; I5 is the final checkpoint required to close SA04-I.

Required result: determine the minimal concrete implementation/acceptance work needed for the **connected Better Auth lifecycle closure** of the current configured auth/session subsystem. Inspect how the accepted I1–I4 boundaries compose in real current paths, identify any remaining current-scope seam or integration gap, and specify the repository seams plus acceptance needed for Lira. Do not assume the green intermediate checkpoints prove connected closure. If I5 is not safely one author result, decompose only I5.

Preserve current SET-05 password/session behavior, registration/linking policies, active auth semantics, SA-02 auth facts and lifecycle-storage failure distinctions. J–R application writers, physical user deletion, SA05 deactivation operation/control, reactivation/separate forced-session Owner action, unconfigured secondary-session storage, docs/#315 and Stage6/external acceptance are outside I5.

No implementation in this assignment. Publish the technical plan/result in #251, update your service context as appropriate, then **STOP for Mira plan review**. Lira/Mark remain unassigned.

# Мира — ChatGPT-5.6 Sol

## AP-10 restriction catalog — draft for owner review

Не зафиксировано как owner decision. После dependency/gainularity sweep кандидат строится по понятным пользовательским действиям, а не по permission keys или внутренним route/surface деталям.

### 1. Публикация и участие

- создавать новые темы / Help-вопросы;
- отправлять ответы;
- загружать новые вложения.

Логика:
- topic creation и reply creation остаются разными ограничениями: санкция «не создавать новые темы, но разрешить отвечать» имеет понятный продуктовый смысл;
- Help-вопрос не требует отдельной санкции, пока он использует ту же пользовательскую сущность/способ участия, что создание темы; техническая карта enforcement может различаться;
- upload остаётся отдельным ограничением, потому что можно разрешить текстовое участие, но запретить новые файлы.

### 2. Изменение собственного контента и профиля

- редактировать свои опубликованные сообщения;
- управлять решением / лучшим ответом собственной темы;
- изменять профиль.

Не делать отдельной галочкой:
- own source-locale correction — это слишком техническая гранулярность для sanction UI; при необходимости она следует политике изменения собственного контента, а точную enforcement-связь определяет technical plan.

### 3. Обращения к модерации

- отправлять Complaints / пользовательские жалобы;
- отправлять Help signals;
- подавать другие domain appeals, не относящиеся к текущей block/measure.

Обязательное исключение:
- appeal exact текущей block/measure никогда не является restriction и всегда доступен на own account page.

### 4. Ресурсоёмкие пользовательские функции

- генерировать переводы.

Пока это единственная подтверждённая отдельная пользовательская функция такого типа. Не создавать группу из будущих/неimplemented возможностей.

### 5. Служебные полномочия — показывать только для privileged target

Эта группа вообще не показывается для обычного пользователя.

Если target имеет модераторскую/административную authority и actor имеет повышенное право воздействовать на такой target, кандидат:
- ограничить Forum/Help moderation;
- ограничить Complaints moderation/review;
- ограничить Users / roles / permissions administration.

Логика:
- restriction соответствующей служебной области должен блокировать и её privileged reads, и mutations; отдельная галочка «private admin reads» создаёт искусственную техническую гранулярность;
- ordinary block manager не получает эту группу для moderator/admin targets;
- owner никогда не является допустимым target;
- exact mapping current permissions → эти продуктовые области — техническая задача после owner approval.

### Не включать в restriction catalog

- login/session restriction;
- public reading;
- notifications;
- собственную account/block-status surface;
- exact block/measure appeal;
- отдельные internal permission keys, route names или implementation details;
- future/unimplemented capabilities.

### Dependency rules

- group checkbox — только UI convenience: выбирает/снимает все child restrictions;
- child restrictions остаются independently persisted;
- restriction set additive и не переписывает roles/grants/overrides;
- если одна выбранная санкция фактически делает другую временно недостижимой, это не превращает их в один тип санкции; после частичного lift остаётся точный сохранённый набор;
- enforcement должен происходить в authoritative server/domain boundaries, а не только скрытием UI.


## AP-10 active measures lifecycle — corrected draft

Предыдущий черновик «не более одной активной block/measure на пользователя» отозван после owner correction: он смешивал техническое состояние аккаунта с санкциями за отдельные нарушения.

Корректная модель:
1. violation → отдельная sanction measure;
2. measure хранит собственные restrictions, срок и историю изменений;
3. appeal относится к этой measure в связи с её violation basis;
4. новое нарушение создаёт новую measure, даже если предыдущая ещё активна;
5. effective restrictions аккаунта = union всех active measures;
6. expiry/lift/overturn одной measure убирает только её вклад;
7. редактирование restrictions/срока той же measure не создаёт новую appeal автоматически;
8. own account UI показывает меры раздельно и даёт appeal у каждой применимой меры.

Это сохраняет причинность, историю и независимое обжалование каждого нарушения.

## AP-10 violation / sanction / appeal lifecycle — draft for owner review

Не зафиксировано как owner decision.

### 1. Основание меры

Каждая measure должна иметь отдельное violation basis — за что именно она назначена.

Логический invariant:
- violation basis после создания меры не переписывается как обычное редактирование;
- если выяснилось, что основание было другим, это не «редактирование текста причины», а отмена/пересмотр исходной меры и, при необходимости, новая мера;
- иначе уже поданная appeal могла бы незаметно начать относиться к другому обвинению.

Не фиксировать пока конкретную taxonomy нарушений: это отдельный продуктовый вопрос. Но measure должна хранить достаточный immutable context, чтобы пользователь и reviewer понимали, что именно оспаривается.

### 2. Наказание внутри той же меры

У той же measure могут меняться:
- restriction set;
- temporary/permanent;
- expiry/duration.

Это не меняет violation identity.

Любое реальное изменение sanction должно иметь отдельный committed history transition. Особенно важно различать:
- усиление;
- смягчение;
- explicit lift.

Причина изменения sanction, если она обязательна, определяется отдельно от исходного violation basis.

### 3. Appeal semantics

Appeal оспаривает violation + назначенную за него measure как одно дело, но reviewer должен уметь разделить два вопроса:
- было ли нарушение / подтверждено ли основание;
- соразмерна ли назначенная мера.

Кандидат итогов appeal:
- upheld — нарушение и текущая мера подтверждены;
- modified — нарушение подтверждено, но наказание изменено/смягчено;
- overturned — основание не подтверждено; measure прекращается и помечается overturned.

### 4. Что если measure менялась во время pending appeal

- appeal не сбрасывается и не создаётся заново только из-за изменения срока/restrictions;
- reviewer видит initial sanction и все последующие committed changes;
- предмет appeal остаётся тем же violation basis + связанная с ним measure;
- если measure была explicit-lifted или успела expire, appeal не обязан автоматически исчезать: пользователь всё ещё может оспаривать сам факт нарушения/меры, поскольку запись и история уже существуют;
- overturned appeal должен иметь семантику отмены именно этой measure; другие active measures за другие нарушения не затрагиваются.

### 5. Что нельзя смешивать

- violation basis ≠ administrative reason, почему другой админ позже изменил sanction;
- appeal argument ≠ violation basis;
- lift ≠ автоматически признание исходной меры ошибочной;
- expiry ≠ оправдание/overturn;
- новое нарушение ≠ изменение старой меры.


## AP-09 completion / AP-10 gate

PR #288 merged в main: `5cf80f38cbc06ed733a0618e706eb80c5a7b3c7b`.

AP-09 полностью закрыт:
- implementation #287 merged;
- AP09-MIRA-05 test stabilization #289 merged;
- documentation closeout #288 merged;
- source-of-truth main reflects AP-09 and migration head 0057;
- confirmed open current-scope defects: 0.

Следующий пакет AP-10 нельзя планировать до owner product decision по blocking effect/reasons.
Не выбирать эти semantics самостоятельно и не передавать Лёве planning task до решения владельца.

## AP-09 documentation closeout — final PASS

#289 merged into main at `0521669eadc3b927b3f8d0651b98291ffda137a2`.

#288 was synchronized onto that main and the same five docs changes were reapplied. Final exact head
`d6ecb2005da02b4eaf4528b17f0530767ebddadd`.

Final review:
- diff exactly 5 docs files;
- no implementation/schema/dependency changes;
- factual consistency/overscope PASS;
- HISTORY_11 includes AP09-MIRA-05/#289 closeout;
- CI #41955225394 SUCCESS;
- application 143/143 files, 1888/1888 tests;
- users-authorization regression 6/6 PASS;
- PostgreSQL 41/41 files, 483/483 tests;
- build/UI preview/migration/schema/Worker checks SUCCESS.

#288 marked Ready/open/mergeable.

Next owner action: merge #288.

## AP09-MIRA-05 — coordinator review PR #289

**Stable exact head:** `7c0f7b513e6908f98151665a6839626b91f58fac`.

**Coordinator verdict: PASS. AP09-MIRA-05 CLOSED. Confirmed current-scope defects: 0.**

Independent verification:
- #289 Draft/open/mergeable; base/current main `386023ce892044e623ec3d24f8a724e92af61a31`;
- main has no drift from base;
- diff exactly one file, 2 additions / 2 deletions;
- both race-prone synchronous `Public details` assertions after recovery are now positive-state `await waitFor(...)`;
- existing loader-count, action-count, history-state, same-path, privileged-DOM and terminal both-rights-revoked assertions remain unchanged;
- runtime code/schema/dependencies/docs untouched;
- exact-head CI #41953193998 SUCCESS;
- job logs: test file 6/6 PASS, application 143/143 files and 1888/1888 tests; PostgreSQL 41/41 files and 483/483 tests; all applicable steps SUCCESS.

The previous service note that Codex review was unnecessary was incorrect: current AGENTS requires independent technical review after coordinator PASS even for this test-only implementation PR. Next reviewer: Лёва, same exact head.

#288 remains Draft until #289 is accepted and merged.

## AP-09 documentation closeout — подзадача 3/3

**Docs-content verdict: PASS. Overall closeout: BLOCKED by `AP09-MIRA-05`.**

#288 exact head `c1e20a79d69918bb0bf62d9f3acec0d013ddfd45`, base/main `386023ce892044e623ec3d24f8a724e92af61a31`.

Проверено:
- diff ровно 5 docs-файлов, implementation/schema/dependencies отсутствуют;
- PROJECT_STATE, ADMIN_PANEL, AUTHORIZATION и HISTORY_11 соответствуют merged AP-09 code/migration/catalog/routes;
- main не сдвинулся;
- factual docs contradictions/overscope не найдено.

CI выявил новый current-scope test-layer defect:
- run #41951777119: database SUCCESS, checks FAIL;
- attempt 1: repeated-revocation regression падает на line 196 после второго recovery-cycle;
- rerun same unchanged head: тот же test падает уже на line 180 после первого recovery-cycle;
- prior implementation CI #41941892340 на том же runtime code: test file 6/6 PASS, full application 1888/1888 PASS.

Root cause:
- test ждёт loader call count и negative state `#authorization === null`;
- ErrorBoundary также удовлетворяет negative state до завершения recovery render;
- immediate `Public details` assertion гоняется с successful detail commit;
- различное место failure на двух attempts подтверждает synchronization race.

**AP09-MIRA-05:** test-only synchronization defect. Runtime defect не подтверждён.

Correction boundary:
- separate test-only PR;
- only `app/admin/users-authorization.test.tsx` unless new evidence requires broader scope;
- wait positive recovered detail state in each cycle before terminal assertions;
- preserve semantic assertions/no replay/no loop/history identity;
- no runtime change;
- full applicable CI.

#288 остаётся Draft до correction merge + sync + green docs CI.

## AP-09 documentation closeout — подзадача 2/3

Implementation #287 merged в `main`: `386023ce892044e623ec3d24f8a724e92af61a31`.

Создан отдельный docs-only PR #288, Draft, head
`c1e20a79d69918bb0bf62d9f3acec0d013ddfd45`.

Изменены только пять согласованных документов:
- `PROJECT_STATE.md`;
- `docs/ADMIN_PANEL.md`;
- `docs/auth/AUTHORIZATION.md`;
- `docs/PROJECT_HISTORY/PROJECT_HISTORY_11.md`;
- `docs/PROJECT_HISTORY/PROJECT_HISTORY.md`.

Implementation/schema/dependencies/AP-10/Stage 6/production не менялись.

Следующая подзадача 3/3: финально проверить diff #288 на factual consistency с merged main и отсутствие docs overscope; при PASS перевести PR из Draft в Ready.

## AP-09 independent review — final reconciliation

**Stable exact head:** `b85c3809befe3a1dcc83fe654dde4cd093f625ba`.

Лёва повторно проверил `AP09-LEVA-01` на accepted schema и **отозвал finding**.

Подтверждено:
- accepted `user.created_at` — PostgreSQL `timestamp without time zone`;
- прежний synthetic repro использовал неверный `timestamptz`;
- disposable PostgreSQL 17 с migrations 0000–0057 + exact-head `PostgresAdminUsersReader` + real Drizzle profile reader дала 9/9 PASS для трёх boundary timestamps × UTC/Asia-Jerusalem/America-New_York;
- proposed `AT TIME ZONE 'UTC'` correction на actual column type применять нельзя;
- implementation не менялась, новый coordinator cycle не нужен.

**Final independent technical verdict Лёвы: PASS. Confirmed open current-scope defects: 0.**
Coordinator PASS и independent PASS относятся к одному exact head.

Следующий шаг владельца: merge PR #287. После merge — отдельный documentation closeout PR по текущему process rule.

## AP-09 independent review — verification of AP09-LEVA-01

**Reviewed exact head remains:** `b85c3809befe3a1dcc83fe654dde4cd093f625ba`.

Лёва сообщил `AP09-LEVA-01`: `to_char(user.created_at,...Z)` якобы сдвигает instant по PostgreSQL session TimeZone, потому что `created_at` — timestamptz.

Coordinator verification выявила mismatch premise:
- accepted migration `drizzle/0003_gorgeous_donald_blake.sql`: `user.created_at timestamp DEFAULT now() NOT NULL`;
- current `db/schema.ts`: `timestamp("created_at")` без `withTimezone:true`;
- current `drizzle/meta/0057_snapshot.json`: type `timestamp`;
- migration search не выявил последующего перевода `user.created_at` в timestamptz;
- finding repro использовал synthetic table с `timestamptz`, то есть другой тип.

PostgreSQL 17 имеет отдельные overloads `to_char(timestamp,text)` и `to_char(timestamp with time zone,text)`; session TimeZone conversion, на котором основан repro, относится к timestamptz path. Поэтому заявленная causal chain не воспроизводит фактический AP-09 schema path.

**Coordinator status:** AP09-LEVA-01 NOT CONFIRMED. Лире correction не назначать.

Следующий шаг: Лёва повторно проверяет actual `timestamp without time zone` path и либо даёт корректный current-scope repro, либо снимает finding.

## AP-09 MIRA-04 correction — coordinator restart, подзадача 3/3 / final verdict

**Reviewed exact head:** `b85c3809befe3a1dcc83fe654dde4cd093f625ba`.

**Final coordinator verdict: PASS. Confirmed current-scope defects: 0.**

Final gap-sweep:
- head не сдвинулся;
- `main` идентичен baseline `2651d2bf7de7212068c54674dca7d90716ea92c3`;
- correction delta ограничен двумя уже проверенными файлами;
- `AP09-MIRA-01..04` закрыты;
- direct loader 403 остаётся fail-closed и максимум вызывает один лишний recovery GET без loop/authority expansion;
- exact-head CI #41941892340 остаётся SUCCESS: app 143/143 files, 1888/1888 tests; PostgreSQL 41/41 files, 483/483 tests.

Actual authenticated Chromium→Worker→PostgreSQL AP-09 flow не выполнялся. **Информация не проверена.** Отдельный mandatory browser/owner visual gate не назначен.

Следующий этап: independent technical review Лёвы того же stable exact head.

## AP-09 MIRA-04 correction — coordinator restart, подзадача 2/3

**Stable exact head:** `b85c3809befe3a1dcc83fe654dde4cd093f625ba`.

**Verdict 2/3: PASS. `AP09-MIRA-04` CLOSED. Новых current-scope defects: 0.**

Проверено:
- первый denied canonical action вызывает один same-URL GET без mutation replay;
- successful read-only recovery размонтирует error subtree и сбрасывает recovery guard для следующего независимого denial;
- Users-read loss оставляет тот же mounted error boundary и `useRef=true`, поэтому второго GET/loop нет;
- React Router 8.3.1 source подтверждает stable errorElement/error-subtree lifecycle;
- mounted regression покрывает два независимых denial-cycle на одной history entry и terminal both-rights-revoked branch.

## AP-09 MIRA-04 correction — coordinator restart, подзадача 1/3

**Stable exact head:** `b85c3809befe3a1dcc83fe654dde4cd093f625ba`.
**Superseded reviewed head:** `13bae37dd3b7d033b271788fadb7e8be63d66a43`.
**Baseline/current main:** `2651d2bf7de7212068c54674dca7d90716ea92c3`.

**Verdict 1/3: PASS по stable-head / scope / CI boundary. Implementation correctness ещё не оценивается.**

Проверено:
- #287 Draft/open/mergeable;
- delta: 2 commits, 2 files;
- изменены только `app/routes/admin-user.tsx` и `app/admin/users-authorization.test.tsx`;
- schema, migrations/catalog, authz writers, dependencies, MIRA-02/03 implementation и lasting docs не затронуты;
- exact-head CI #41941892340 SUCCESS;
- job logs: application 143/143 files, 1888/1888 tests; PostgreSQL 41/41 files, 483/483 tests;
- lint/typecheck/build/UI preview/migration/schema/manifest/runtime privilege/credential probes/Worker smoke — SUCCESS.

Actual authenticated Chromium→Worker→PostgreSQL AP-09 flow не выполнялся. **Информация не проверена.** Отдельный mandatory browser/owner visual gate не назначен.

Следующая подзадача 2/3: проверить useRef recovery guard и repeated-denial lifecycle.

## AP-09 corrected head — coordinator restart, подзадача 4/4 / final verdict

**Reviewed exact head:** `13bae37dd3b7d033b271788fadb7e8be63d66a43`.

**Final coordinator verdict: CHANGES REQUIRED. Подтверждённых current-scope defects: 1 — `AP09-MIRA-04`.**

Final gap-sweep подтвердил:
- AP09-MIRA-02 закрыт;
- AP09-MIRA-03 закрыт;
- других current-scope defects в correction delta и ранее проверенном неизменённом AP-09 scope не найдено;
- actual authenticated Chromium→Worker→PostgreSQL AP-09 browser flow не выполнялся и не назначен mandatory gate. **Информация не проверена** в этой границе.

### AP09-MIRA-04 — final confirmation

Первый denied mutation recovery корректен, но guard lifetime неверен:
- первый thrown management 403 → один same-URL GET;
- mutation не replay;
- Users-read retained → read-only detail;
- marker `ap09AccessRechecked: true` остаётся в history location state;
- после последующего возврата management новая loader/reload/revalidation может снова показать controls на той же history entry;
- новый revoke + submit снова даёт canonical 403;
- ErrorBoundary видит старый marker и не запускает fresh GET;
- actor снова получает terminal 403 вместо всё ещё разрешённого read-only detail.

Следовательно guard должен ограничивать retry **одного denial event**, а не permanently consume recovery всей history entry.

### Bounded correction package Лире

Исправить только `AP09-MIRA-04`:
1. каждый независимый fresh management denial может вызвать не более одного fresh GET recovery;
2. успешный recovery не должен блокировать последующие независимые denial cycles;
3. если `admin.users.read` тоже отозван, fail-closed 403 остаётся terminal без loop;
4. mutation не retry/replay;
5. regression должен доказать минимум два независимых grant/revoke denial cycles на одной history entry и сохранить existing first-denial/both-revoked behavior;
6. после correction предоставить новый stable exact head + применимый full CI.

После implementation change coordinator whole-PR cycle начинается заново. Лёва не подключается до coordinator PASS.

## AP-09 corrected head — coordinator restart, подзадача 3/4

**Stable exact head:** `13bae37dd3b7d033b271788fadb7e8be63d66a43`.

**Verdict: PASS по AP09-MIRA-02/03 и оставшемуся correction delta. Новых current-scope defects: 0.**

### AP09-MIRA-02 — CLOSED

- `under-development?feature=admin-users` остаётся compatibility route;
- loader сначала распознаёт literal `admin-users`, затем выполняет protected `requireAdminAccess`;
- `admin.users.read` actor получает redirect на `/:locale/admin/users`;
- management-only actor получает redirect на `/:locale/admin/authorization#authorization-users-heading`;
- обе success branches передают `adminPrivateHeaders` в `redirect(...)`, то есть `Cache-Control: private, no-store`;
- mounted/route regression проверяет оба Location и оба no-store headers;
- guest/forbidden branches остаются controlled protected 401/403.

### AP09-MIRA-03 — CLOSED

- `admin-users` удалён из `UNDER_DEVELOPMENT_FEATURES`;
- `UnderDevelopmentView` рендерит только оставшиеся реальные unfinished entries;
- regression проверяет отсутствие `admin-users` и сохранение `admin-settings`;
- compatibility URL не зависит от registry type: route loader перехватывает literal `admin-users` до передачи requestedFeature в view;
- `adminDestinations` больше не генерирует Users placeholder: Users-read ведёт в real Users index, management-only — в existing authorization subset.

### Remaining correction delta

Шесть correction-файлов полностью распределены:
- `admin-user.tsx` + `users-authorization.test.tsx` — проверены в 2/4;
- `under-development.tsx` + `admin-users.test.ts` — MIRA-02, проверены в 3/4;
- `under-development.ts` + `users.test.tsx` — MIRA-03, проверены в 3/4.

Stable head не сдвинулся; #287 Draft/open/mergeable.

Единственный открытый confirmed finding текущего coordinator cycle: `AP09-MIRA-04`.

Следующая подзадача: 4/4 — final gap-sweep/verdict и bounded return package, если finding останется.

## AP-09 corrected head — coordinator restart, подзадача 2/4

**Stable exact head:** `13bae37dd3b7d033b271788fadb7e8be63d66a43`.

**Verdict: 1 confirmed current-scope defect — `AP09-MIRA-04`.**

### Что в AP09-MIRA-01 correction работает

- thrown 403 из canonical management action действительно попадает в `admin-user` ErrorBoundary;
- первый denial запускает одну replace-navigation на тот же URL и новый GET loader;
- mutation не replay: mounted regression подтверждает один вызов action;
- если `admin.users.read` ещё effective, второй loader возвращает read-only detail без management payload/controls;
- если Users-read тоже отозван, второй loader снова 403 и из-за marker повторного GET loop нет.

### AP09-MIRA-04 — recovery marker permanently consumes recovery for the history entry

Correction записывает `{ ap09AccessRechecked: true }` в `location.state` через:
`navigate(currentUrl, { replace: true, state: { ap09AccessRechecked: true } })`.

После успешного recovery этот state нигде не очищается. В React Router 8.3.1:
- navigation создаёт next location из переданного `opts.state`;
- successful replace commit вызывает `history.replace(location, location.state)`;
- BrowserHistory создаёт location из `window.history.state.usr`.

Следовательно marker относится не к одному конкретному 403, а остаётся привязанным к session-history entry. Existing test после успешного recovery прямо утверждает, что current location state всё ещё равен `{ ap09AccessRechecked: true }`.

Причинная цепочка дефекта:
1. management effective → detail содержит controls;
2. management revoke → submit → thrown 403;
3. correction делает recovery GET; Users-read сохранён → read-only detail;
4. marker остаётся `true`;
5. management позже снова становится effective и fresh loader на этой же history entry снова может показать controls;
6. при следующем revoke и submit canonical action снова бросает 403;
7. ErrorBoundary видит `alreadyRechecked === true` и больше не делает GET recovery → снова terminal 403 вместо fresh read-only snapshot.

Это current-scope: dynamic grants/overrides и next-request freshness уже являются контрактом AP-09; повторное grant/revoke не относится к AP-10 или future hardening.

Regression tests покрывают только первый revoke/recovery и terminal branch при одновременном revoke Users-read; repeated grant→revoke cycle отсутствует.

Других дефектов в рамках подзадачи 2/4 не подтверждено.

Следующая подзадача: 3/4 — AP09-MIRA-02/03 corrections + remaining correction delta.

## AP-09 corrected head — coordinator restart, подзадача 1/4

**Stable exact head:** `13bae37dd3b7d033b271788fadb7e8be63d66a43`.
**Superseded reviewed head:** `f5117f22bd891d3892357fc984009388481001f7`.
**Baseline/current main:** `2651d2bf7de7212068c54674dca7d90716ea92c3`.

**Verdict подзадачи 1/4: PASS по stable-head / scope / CI boundary. Implementation correctness correction ещё не оценивается.**

Проверено:
- #287 остаётся Draft/open/mergeable на новом stable head;
- correction delta от старого reviewed head: 7 commits, 6 files;
- изменены только:
  - `app/routes/admin-user.tsx`;
  - `app/routes/under-development.tsx`;
  - `app/forum/under-development.ts`;
  - `app/admin/users-authorization.test.tsx`;
  - `app/admin/users.test.tsx`;
  - `app/routes/admin-users.test.ts`;
- delta соответствует только bounded correction AP09-MIRA-01..03 и regression coverage; schema, dependencies, authz writers, migration/catalog, lasting docs/PROJECT_STATE не менялись;
- exact-head CI #41939426331 завершён SUCCESS;
- job logs подтверждают application 143/143 files, 1887/1887 tests; PostgreSQL 41/41 files, 483/483 tests;
- lint, typecheck, build, UI preview build, migration history/metadata, schema parity, production manifest, runtime privilege/credential probes и Worker smoke steps SUCCESS.

Actual authenticated Chromium→Worker→PostgreSQL AP-09 flow не выполнялся. **Информация не проверена.** Отдельный mandatory browser/owner visual gate для AP-09 не назначен.

Следующая подзадача 2/4: AP09-MIRA-01 recovery chain и её regression coverage.

## AP-09 coordinator whole-PR review — подзадача 4/4: gap-sweep / final verdict

**Reviewed exact head:** `f5117f22bd891d3892357fc984009388481001f7`.

**Final coordinator verdict: CHANGES REQUIRED. Подтверждённых current-scope дефектов: 3.**

### AP09-MIRA-01 — fresh management denial loses still-authorized read-only detail

Подтверждён в подзадаче 3/4. При сохранённом `admin.users.read` и отозванном `access.authorization.manage` следующий canonical fetcher submit получает thrown 403 из fresh manager gate. React Router поднимает error в boundary владельца fetcher (`admin-user`), а `ForumRouteError` не revalidate текущий detail. Привилегированный DOM безопасно исчезает, но вместе с ним теряется всё ещё разрешённый read-only user detail до отдельной навигации/reload.

### AP09-MIRA-02 — permission-dependent legacy Users redirects не имеют private/no-store

`app/routes/under-development.tsx` для `feature=admin-users` после protected `requireAdminAccess` выбирает разные success destinations:
- `admin.users.read` → `/:locale/admin/users`;
- management-only → `/:locale/admin/authorization#authorization-users-heading`.

Оба success path вызывают `redirect(location)` без headers. Exact React Router 8.3.1 implementation `redirect()` при таком вызове создаёт Response с status + `Location`; `Cache-Control` сам не добавляется. Route `under-development`, parent locale boundary и root не задают private/no-store headers для этого ответа. Следовательно capability-dependent protected compatibility response выходит из AP-09 private/no-store envelope. Тест проверяет только `Location` и gap не ловит.

### AP09-MIRA-03 — Users всё ещё ложно числится незавершённым

Exact head сохраняет в `app/forum/under-development.ts`:
`{ id: "admin-users", labelKey: "adminUsers" }`.

`UnderDevelopmentView` безусловно рендерит весь `UNDER_DEVELOPMENT_FEATURES`, поэтому на общей странице статуса Users остаётся в списке «Still in development» после реализации AP-09. Approved AP-09 plan прямо требовал после реализации убрать только `admin-users` из реально unfinished feature list; existing homepage test этот элемент не проверяет.

### Gap-sweep без дополнительных findings

Проверены оставшиеся интеграционные стыки:
- Worker context создаёт AdminUsers reader из `WEB_HYPERDRIVE`;
- locale/header admission добавляет только `admin.users.read` в существующий union;
- new routes зарегистрированы без конфликта с public profile/Forum routes;
- EN/RU/HE Users labels и reviewed fingerprints согласованы;
- Users-read / management-only / both navigation остаётся capability-distinct;
- extracted legacy Roles controls продолжают использовать canonical writers/intents;
- lasting docs/PROJECT_STATE отсутствуют в implementation PR по текущему process rule;
- AP-10/blocking/Settings/Stage 6/production не затронуты.

Actual authenticated Chromium→Worker→PostgreSQL AP-09 flow по-прежнему не выполнялся и не является назначенным mandatory gate. **Информация не проверена** в этой границе.

### Bounded correction package

Лире исправить только `AP09-MIRA-01..03`:
1. после fresh management denial не оставлять stale privileged surface и сохранять доступ к user detail, если новый loader snapshot всё ещё разрешает `admin.users.read`; mutation не retry/replay;
2. permission-dependent legacy Users success redirects должны иметь protected private/no-store cache policy;
3. убрать реализованный Users из общего unfinished checklist, сохранив compatibility redirect старого URL;
4. добавить regression coverage этих трёх цепочек и выполнить применимый full CI.

После implementation changes нужен новый stable exact head и новый coordinator whole-PR cycle. Codex technical review до нового coordinator PASS не запускается.

## AP-09 coordinator whole-PR review — подзадача 3/4: routes / canonical authz reuse / UI lifecycle

**Exact head:** `f5117f22bd891d3892357fc984009388481001f7`.

**Verdict: 1 confirmed current-scope defect.**

### AP09-MIRA-01 — failed fresh management gate cannot recover to still-authorized read-only detail

Подтверждённая цепочка:
- Users detail loader допускает actor с `admin.users.read`; management section добавляется только при одновременно effective `access.authorization.manage`.
- Inline assignment/override forms корректно переиспользуют canonical `/:locale/admin/authorization` через `Form navigate={false}` + scoped `fetcherKey`; новый protocol/writer отсутствует.
- Если после loader snapshot у actor отозван только `access.authorization.manage`, но `admin.users.read` сохранён, следующий canonical action вызывает fresh `manager(context)` и **бросает 403** до mutation.
- React Router 8.3.1 для fetcher action error вызывает `setFetcherError(key, routeId, ...)`; boundary выбирается по route, владеющему fetcher. Здесь это current `admin-user` route.
- `admin-user` экспортирует `ForumRouteError`; он безопасно снимает весь detail/privileged DOM, но показывает terminal 403 с единственной ссылкой «назад на форум» и не имеет revalidate/retry.
- Failed submission 4xx сам по себе loader revalidation не запускает. Поэтому actor, который всё ещё имеет `admin.users.read`, не переходит к корректному read-only snapshot и теряет доступный ему detail до отдельной навигации/ручного reload.
- Это противоречит approved AP-09 lifecycle: fresh grant loss должен убрать management data/controls из нового snapshot, а Users-read остаётся независимым правом на detail.

Existing mounted test покрывает только success→revalidation с simulated management revocation; canonical fresh-gate 403 path не смонтирован, поэтому дефект CI не ловит.

Остальное проверено без дополнительных confirmed defects:
- successful canonical `assignRole`/`override` revalidate current detail и не навигируют;
- actor/target-specific fetcher key изолирует late feedback при target/actor lifecycle change;
- controlled returned 409/other domain errors имеют explicit revalidate control;
- read-only actor не получает management DOM/payload; management-only actor сохраняет старый AuthorizationAdmin subset и не получает новый directory;
- extracted `AuthorizationUserControls` сохраняет legacy Roles writer/intents и не создаёт второй authz backend;
- Users/roles/history/forum navigation остаётся capability-distinct;
- EN/RU/HE mounted presentation и existing responsive primitives проверены; отдельный owner visual/browser gate для AP-09 не назначен.

Следующая подзадача: gap-sweep/final verdict.

## AP-09 coordinator whole-PR review — подзадача 2/4: permission / migration / DB / read privacy

**Exact head:** `f5117f22bd891d3892357fc984009388481001f7`.

**Verdict: PASS. Подтверждённых current-scope дефектов: 0.**

Проверено:
- `admin.users.read` добавлен в code-backed catalog и schema CHECK; initial grant есть только у built-in admin, отсутствует у user/moderator; dynamic role/override semantics сохраняются;
- forward migration `0057_admin_users_read` не переписывает accepted history: расширяет catalog constraint, вставляет permission и exact built-in-admin grant;
- Drizzle schema и production manifest переведены на 0057; exact-head CI подтвердил migration/schema/manifest parity;
- `PostgresAdminUsersReader` выбирает только `id/name/image/created_at`, не email/session/account/authz state; search по name/ID параметризован, literal wildcard escaping есть, email не участвует;
- paging: 25 + lookahead, C-collated ID keyset, exact total считается по полному matching set в том же SQL statement;
- targeted `readUserManagementState(userId)` выполняется в existing REPEATABLE READ READ ONLY snapshot, возвращает role choices без grants и authorization только выбранного target; другие users/email не читаются;
- target grants/overrides/effective permissions присутствуют только в manager-targeted read и используют существующую resolution formula;
- typed DB availability mapping для Users reader сохраняет controlled unavailable, unexpected errors не маскируются;
- current web runtime contract уже имеет SELECT на `user` и необходимые authz relations; AP-09 не требует новых runtime relation grants;
- PostgreSQL tests подтверждают >50 users paging, Unicode/slash IDs, literal `%_\\`, no-email search/projection, targeted snapshot consistency, allow/deny/inherit, lockout, no-op History и rollback при History failure.

Следующая подзадача: routes/authz reuse/UI lifecycle.

## AP-09 coordinator whole-PR review — подзадача 1/4: stable head / scope / CI

**Exact head:** `f5117f22bd891d3892357fc984009388481001f7`.
**Baseline/current main:** `2651d2bf7de7212068c54674dca7d90716ea92c3`.

- PR #287 Draft/open/mergeable; ahead 53, behind 0.
- Diff: 36 files, 8082 additions / 69 deletions; lasting docs/PROJECT_STATE отсутствуют.
- Changed scope соответствует AP-09: permission/catalog/migration/manifest, Users reader/routes/views, targeted authorization read, shared user controls, navigation/localization/tests/wiring.
- Exact-head CI #41931562275 SUCCESS.
- Независимо подтверждены summaries: application 143/143 files, 1884/1884 tests; database 41/41 files, 483/483 tests.
- Lint, typecheck, build, UI preview build, migration history/metadata, Drizzle parity, PostgreSQL migrations/manifest/runtime probes и Worker smoke steps SUCCESS.
- Actual authenticated Chromium→Worker→PostgreSQL AP-09 browser flow не выполнялся. **Информация не проверена.** По approved plan отдельным mandatory gate он не назначен.
- На этой подзадаче implementation correctness ещё не оценивается; findings отсутствуют только по stable-head/scope/CI boundary.

## AP-09 technical plan review — итог

Baseline `main`: `2651d2bf7de7212068c54674dca7d90716ea92c3`.

**Verdict: APPROVED с одним уточнением.**

- Принимаются `admin.users.read`, initial built-in admin grant, independent Users index/detail, minimal public-field DTO, targeted one-user authz read и reuse existing assignment/override writers.
- После пояснения Лёвы #6643093174 подтверждено: proposed `inlineUserAuthorization` marker не решает самостоятельный AP-09 blocker; `editorActorId` добавлял бы более сильную stale-account expectation, которой current AuthorizationAdmin не имеет и current package не требует.
- AP-09 должен сначала напрямую переиспользовать canonical `/:locale/admin/authorization` action через fetcher для `assignRole` / `override`, сохраняя session actor, fresh management permission, same-origin, authz mutation lock, lockout и History.
- Новую protocol branch / actor expectation добавлять только при конкретном диагностированном blocker, а не как preventive hardening.
- React Router v8 contract подтверждает: fetcher submission не навигирует; successful action revalidates active loaders. 4xx/5xx не следует считать автоматическим revalidation path; consumer должен обрабатывать фактические existing error semantics без auto retry.
- AP-10/blocking, Settings, Stage 6 и unrelated authz hardening остаются вне scope.

## AP-08 coordinator whole-PR review — final verdict

**Exact head:** `7b6adbf8c92e1706064cb5845248813668a287d0`.

**Coordinator verdict: PASS. Подтверждённых current-scope implementation-дефектов: 0.**

Проверен весь changed-file scope #283, включая:
- schema/migration/meta/production manifest;
- permission catalog/grants, public/admin authorization and canonical HTTP boundaries;
- repository transaction, closure CAS/History, reply admission, receipt replay and deterministic PostgreSQL races;
- public/admin Quick actions, Closed presentation, mounted reply editor, Undo/Redo/attachments and topicClosed revalidation;
- History action typing/presentation;
- EN/RU/HE localization values and reviewed fingerprints;
- Hyperdrive/ForumWriter/service boundaries, UI preview and historical DB fixtures;
- corrected AP08-MIRA-01 test stabilization.

Exact-head CI #41904456264 attempts 1 and 2: checks SUCCESS and database SUCCESS; application 140/140 files, 1863/1863 tests; PostgreSQL 39/39 suites, 477/477 tests.

### Verification boundary

Actual isolated authenticated Chromium→Worker→Better Auth→PostgreSQL AP-08 behavior was not performed. По актуальному contract это не mandatory blocker текущего pre-release package. **Информация не проверена:** фактическое поведение этой real-browser/runtime цепочки.

### Documentation closeout

Существующие documentation commits вошли в #283 до нового правила #285 и не откатываются ретроактивно только ради смены процесса. При этом `PROJECT_STATE.md` на head #283 содержит stale формулировку, называющую real Worker/browser acceptance обязательным для AP-08. Это не implementation defect и не исправляется внутри #283: по актуальному `AGENTS.md` документация задачи корректируется отдельным documentation PR в конце задачи. Финальный documentation PR должен привести PROJECT_STATE/source-of-truth к фактическому принятому состоянию AP-08 и текущей verification boundary.

## AP-08 coordinator review restart — подзадача 4: Quick actions / Closed UI / mounted reply editor / AP08-MIRA-01

**Exact head:** `7b6adbf8c92e1706064cb5845248813668a287d0`.

**Verdict: PASS. Подтверждённых current-scope дефектов: 0. AP08-MIRA-01 закрыт.**

Повторно проверено:
- shared public/admin closure Quick actions используют canonical topic endpoint, isolated fetcher, CAS version и no automatic retry;
- stale/denied closure responses revalidate once; actor/topic/grant/version lifetime изолирует старый fetcher state;
- Closed status независим от Solved/duplicate;
- изначально закрытая тема не монтирует новый reply composer и не показывает Reply/Quote controls;
- уже смонтированный reply editor сохраняет тот же form/textarea, text, Undo/Redo и Cancel при closure/revalidation;
- publication блокируется одновременно на form и MarkdownEditor layers; reopen не вызывает автоматическую публикацию;
- `topicClosed` 409 revalidates once без replay/resubmit и без потери editor buffer;
- editor scope остаётся `[accountId, contextKey, locale]`; closure не меняет owner/context identity;
- attachment operation identity `[ownerId, contextKey, draftId]` не меняется из-за closure; operation cleanup abort выполняется только при identity change/unmount.

### AP08-MIRA-01 correction

Commit `7b6adbf8c92e1706064cb5845248813668a287d0` меняет только `app/forum/public-read.test.tsx` (19+/3-):
- тест ждёт enabled Attach и реальный UUID `editorOperationId` до выбора файла;
- XHR сохраняет фактически отправленный `X-Vico-Operation-Id`;
- тест доказывает совпадение request operation с mounted editor operation;
- `aborted === false` проверяется уже **до** closure, затем после close и reopen;
- проверяются неизменность mounted form и operation ID через обе revalidation;
- assertions не ослаблены и runtime implementation не изменён.

CI #41904456264:
- attempt 1: `app/forum/public-read.test.tsx` 84/84 PASS; application 140/140 files, 1863/1863 tests PASS;
- attempt 2: тот же файл 84/84 PASS; application 140/140 files, 1863/1863 tests PASS.

Точная причина старого abort на `381a046b...` остаётся не доказанной, но это больше не меняет выбранное исправление: тест теперь начинает проверку только после подтверждённой готовности upload operation и дважды стабильно проходит на неизменном corrected head. Product/runtime defect по старой нестабильности не подтверждён.

## AP-08 coordinator review restart — подзадача 3: authorization/HTTP/read boundaries

**Exact head:** `7b6adbf8c92e1706064cb5845248813668a287d0`.

**Verdict: PASS. Подтверждённых current-scope дефектов: 0.**

Повторно проверено:
- `forum.topic.close` остаётся отдельной code-backed capability; initial grants — moderator/admin, user не получает её;
- close/reopen требуют одну fresh capability без role/owner bypass;
- canonical topic action берёт target из route и actor из authenticated session; submitted actor/topic fields не становятся authority;
- closure form строго валидирует intent, single CAS version, stale actor expectation и не принимает operationScope;
- same-origin/session boundary и error mapping сохраняют controlled 400/401/403/404/409/503, private no-store и propagation неожиданных ошибок;
- rejected fresh reply получает отдельный `topicClosed` 409; HTTP layer не делает preflight, authoritative closure admission остаётся в repository;
- public topic loader разрешает closure presentation отдельно и при classified authz outage fail-closed скрывает actions, не ломая публичное чтение;
- global/admin Forum admission включает closure capability; closure-only actor допускается к Forum surface, но не получает pin/solution/duplicate/source/history actions;
- private admin loader авторизует до target validation/private reads и не сериализует protected duplicate explanation;
- persisted `isClosed/closureVersion` проходят public/admin read DTO;
- correction commit `7b6adbf...` затрагивает только AP-08 UI test и эту runtime authorization/HTTP/read цепочку не меняет.

## AP-08 coordinator review restart — подзадача 2: schema/DB/concurrency/reply admission

**Exact head:** `7b6adbf8c92e1706064cb5845248813668a287d0`.

**Verdict: PASS. Подтверждённых current-scope дефектов: 0.**

Повторно проверено на новом head:
- migration/schema: persisted `is_closed`, nonnegative `closure_version`, `forum.topic.close`, moderator/admin initial grants, History actions;
- `createPost`: matching committed publication receipt replay выполняется до topic closure admission;
- fresh reply: authoritative topic row `FOR UPDATE` → closed rejection до cooldown/post/revision/notifications/publication receipt;
- `setTopicClosed`: тот же topic-row serialization point, expected-version CAS, no-op, int32 exhaustion, state/version + History в одной transaction;
- History append failure откатывает closure/version;
- attachment-only rejected reply сохраняет operation/selection для явной публикации после reopen;
- native PostgreSQL races покрывают reply-first, close-first, failed close rollback с queued reply и concurrent same-version closes;
- current exact-head CI #41904456264 attempts 1 и 2: `database` SUCCESS (39/39 suites, 477/477 tests) и `checks` SUCCESS.

Correction commit `7b6adbf...` меняет только `app/forum/public-read.test.tsx` и не затрагивает эту runtime/DB цепочку.

## AP-08 coordinator review restart — подзадача 1: stable-head scope

**Exact head:** `7b6adbf8c92e1706064cb5845248813668a287d0`.

- AP08-MIRA-01 исправлен одним commit поверх прежнего review head.
- Delta `381a046b... → 7b6adbf...`: только `app/forum/public-read.test.tsx`, 19 additions / 3 deletions.
- Runtime implementation, schema, authorization, routes, UI code и docs не изменялись этим correction commit.
- CI #41904456264 attempts 1 и 2: `checks` SUCCESS, `database` SUCCESS.
- PR #283 остаётся Draft/open/mergeable.
- По AGENTS whole-PR cycle начат заново на новом stable exact head.

## AP-08 coordinator review — подзадача 4: Quick actions / Closed UI / mounted reply editor

**Exact head:** `381a046bfb5b44a6a6b5dcbce7c73c40b7085ecd`.

**Verdict: 1 current-scope defect in the new AP-08 test layer; no confirmed closure/UI implementation defect found in this subtask.**

### AP08-MIRA-01 — flaky in-flight attachment retention test

Confirmed evidence on the same unchanged head:
- CI run #41777691776 attempt 1: `checks` FAIL at `app/forum/public-read.test.tsx:3919`; expected `HeldUpload.instances[0].aborted === false`, received `true`.
- attempt 2: identical failure at the same assertion.
- attempt 3: SUCCESS without implementation-head change.

The test creates the upload immediately after `findByLabelText("Attach")`; the established attachment UI test waits for Attach to become enabled before starting an upload. `useEditorAttachments` initializes/rotates operation identity in effects, and identity cleanup aborts outstanding XHR. This makes an initialization race a plausible explanation, but **the exact abort cause is not yet verified**.

Current-scope classification: this test was added by #283 to prove AP-08 preservation of an in-flight attachment, and it caused two real CI failures. Therefore the instability itself must be resolved before coordinator PASS. Do not treat it as proof of a product defect until diagnosis distinguishes test-harness timing from runtime behavior.

Other checked UI behavior in this subtask:
- shared public/admin closure Quick actions use isolated fetcher + CAS and no automatic retry;
- stale/denied closure responses revalidate once;
- Closed status remains independent of Solved/duplicate;
- initially closed topics expose no new Reply/Quote/composer;
- an already-mounted composer remains mounted across closure, publication is disabled at form and editor layers, Cancel remains enabled, and reopen requires explicit submit;
- topicClosed 409 revalidates once without resubmission;
- actor/topic editor scope resets are backed by existing editor/attachment scope isolation.

## AP-08 coordinator review — подзадача 3: authorization/HTTP/read boundaries

**Exact head:** `381a046bfb5b44a6a6b5dcbce7c73c40b7085ecd`.

**Verdict: PASS. Подтверждённых current-scope дефектов: 0.**

Проверено:
- `forum.topic.close` зарегистрирован в code-backed catalog и initial moderator/admin grants; user grant отсутствует;
- close/reopen используют одну fresh capability без own/role exception;
- canonical `topicAction` берёт target только из route и actor только из authenticated session;
- closure form строго валидирует единственный intent, canonical CAS version и actor expectation; client `actorId/topicId/operationScope` не становятся authority;
- Origin/session guards, 401/403/404/409/503 и private no-store mapping не раскрывают внутренние ошибки;
- `ForumTopicClosedError` даёт отдельный `topicClosed` 409 для fresh reply;
- public loader вычисляет closure permission отдельно и fail-closed при authorization outage, сохраняя публичное чтение;
- admin Forum admission включает closure capability; closure-only actor не получает unrelated action flags;
- public/admin read DTO получают persisted `isClosed/closureVersion`;
- reply HTTP path по-прежнему требует `forum.reply.create`, а окончательный запрет закрытой темы остаётся authoritative в repository, поэтому moderator/admin/closure permission не создают bypass.

## AP-08 coordinator review — подзадача 2: schema/DB/concurrency/reply admission

**Exact head:** `381a046bfb5b44a6a6b5dcbce7c73c40b7085ecd`.

**Verdict: PASS. Подтверждённых current-scope дефектов: 0.**

Проверена единая цепочка:
- migration/schema: `is_closed`, `closure_version`, nonnegative CHECK, capability/grants и History actions;
- `ForumService.setTopicClosed` → repository → Hyperdrive writer;
- closure CAS/no-op/version exhaustion и atomic History rollback;
- reply admission: committed publication receipt replay остаётся до closure check, fresh reply проверяет locked topic row до cooldown/post/notification/attachment publication;
- close/reply используют один `forum_topics ... FOR UPDATE` serialization point;
- native PG races: reply-first, close-first, rollback close, concurrent same-version close;
- attachment-only rejected reply и committed receipt replay после closure;
- exact-head CI run #41777691776 завершён SUCCESS.

Отдельный authenticated browser run сюда не подменялся; его отсутствие ранее зафиксировано как непроверенная runtime/browser граница, а не DB defect.

## AP-08 coordinator correction

Установлен coordinator reasoning failure Миры: при постановке и approval AP-08 техническая связанность части изменений была принята за достаточное обоснование их необходимости.

Это не является finding к реализации Лиры и не означает, что уже реализованный overscope нужно удалять, откатывать или переписывать.

Текущее фактическое состояние:
- implementation PR #283 сохранён на head `381a046bfb5b44a6a6b5dcbce7c73c40b7085ecd`;
- дальнейшая работа Лиры остановлена владельцем;
- реализация #283 не меняется только из-за coordinator scope-ошибки;
- прежний PASS Миры не использовать как доказательство необходимости каждого отдельного изменения.

## Следующий шаг

Исправлять только подтверждённые служебные последствия coordinator-сбоя; implementation #283 не трогать без отдельного current-scope дефекта.

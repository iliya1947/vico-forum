# Admin panel — communication

Служебный PR: #251.

## Актуальное состояние

- AP-01–AP-08 merged в main; AP-08 documentation closeout завершён.
- AP-09 PR #287: Ready/open/mergeable, ещё не merged. Exact head `b85c3809befe3a1dcc83fe654dde4cd093f625ba`; baseline/main `2651d2bf7de7212068c54674dca7d90716ea92c3`.
- Scope: independent `admin.users.read`, protected minimal Users directory/detail, targeted one-user management snapshot и direct reuse existing canonical assignment/override action. Нового mutation protocol нет.
- Coordinator whole-PR PASS Миры #6646898897 и итоговый independent whole-PR technical PASS Лёвы относятся к одному head. [Финальный review](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6647373214).
- Confirmed open current-scope defects: **0**. AP09-MIRA-01..04 закрыты; AP09-LEVA-01 **отозван как ошибочно диагностированный**, не исправлен реализацией.

## Перепроверка AP09-LEVA-01

- Мира #6647016500 верно установила фактический тип `user.created_at`: timestamp without time zone. Прежний synthetic repro Лёвы использовал timestamptz и не доказывал дефект actual schema.
- Лёва применил все 58 accepted migrations 0000–0057 в новой disposable PostgreSQL 17 DB, подтвердил тип через pg_catalog, вызвал exact-head directory reader и настоящий Drizzle profile reader.
- 3 boundary-of-day timestamps × UTC/Asia-Jerusalem/America-New-York session TimeZone: **9/9 PASS**, directory ISO/detail ISO/UTC days совпадают.
- Предложенный ранее AT TIME ZONE correction на actual type как раз создавал бы сдвиг; **не применять**. Никакого correction package Лире по этому finding не нужно.
- Старый CHANGES REQUIRED #6646972798 явно помечен ОТОЗВАН/SUPERSEDED ссылкой на итоговый PASS. Evidence ошибочного эксперимента сохраняется только как история; текущий evidence — accepted-schema-reevaluation.mts / accepted-schema-results.json.
- Implementation, schema и tests в PR не менялись. Новый implementation cycle не требуется из-за исправления диагноза.

## Проверки и следующий шаг

- Exact-head CI #41941892340 SUCCESS повторно подтверждён. Ранее локальные existing tests на том же head: 5 UI/route files / 37 tests PASS, 3 PostgreSQL files / 8 tests PASS. Без code changes заново не повторялись.
- Whole-PR 37-file scope проверен независимо; кроме снятого finding других confirmed defects нет. Test-merge `8cce1af4f76b2758b69f070419b0cb4a6e9da57c` имеет указанные main/head parents и идентичное head дерево.
- Task-owned PG container/volume/symlink удалены, worktree clean, head неизменен.
- Информация не проверена: actual authenticated Chromium→Worker→PostgreSQL AP-09 browser/deployed flow; обязательный отдельный browser/owner visual gate не назначен. Никакого production rollout нет.
- **Следующий шаг владельца: merge #287.** Lasting docs/PROJECT_STATE — отдельным documentation PR после принятой реализации.
- AP-10/blocking/Settings/Stage 6/production вне scope; Марк не назначен.

Оперативное состояние: [workflow.md](./workflow.md).
Контракт: [ADMIN_PANEL_IMPLEMENTATION_PLAN.md](../ADMIN_PANEL_IMPLEMENTATION_PLAN.md).


## AP-09 documentation closeout

- Implementation PR #287 merged в `main` 2026-11-05, merge commit `386023ce892044e623ec3d24f8a724e92af61a31`.
- Отдельный docs-only PR #288 создан как Draft на head `c1e20a79d69918bb0bf62d9f3acec0d013ddfd45`.
- Scope #288 ограничен пятью файлами: `PROJECT_STATE.md`, `docs/ADMIN_PANEL.md`, `docs/auth/AUTHORIZATION.md`, новый `docs/PROJECT_HISTORY/PROJECT_HISTORY_11.md`, history index.
- PROJECT_STATE фиксирует migration head 0057, Admin Panel through AP-09 и оставшиеся blocking/Settings boundaries.
- ADMIN_PANEL фиксирует реализованный `admin.users.read`, Users index/detail, targeted management composition и fresh-denial recovery; AP-10 остаётся future.
- AUTHORIZATION добавляет `admin.users.read` в implemented catalog и initial built-in admin grant, без management authority.
- HISTORY_11 хранит implementation/correction/review/merge snapshot, включая withdrawn AP09-LEVA-01 как diagnostic correction без code change.
- `PROJECT.md`, `ROADMAP.md`, `docs/database/*` не меняются: подтверждённого stale AP-09 state там не найдено.
- Следующий шаг: Мира выполняет финальную consistency review #288. Codex на documentation closeout не расходуется.


## AP09-MIRA-05 — confirmed AP-09 test synchronization race

- Documentation content review #288 на head `c1e20a79d69918bb0bf62d9f3acec0d013ddfd45` завершён PASS: пять docs-файлов фактически соответствуют merged AP-09, docs overscope не найден.
- CI #41951777119: `database` SUCCESS; `checks` FAIL только на `app/admin/users-authorization.test.tsx > recovers two independent management revocations on the same history entry`.
- Первый CI attempt упал после второго denial-cycle на final assertion `Public details` (line 196).
- Failed `checks` job был rerun без изменения head и снова упал в том же test, но уже после **первого** denial-cycle на том же final assertion (line 180).
- Тот же implementation exact head `b85c3809...` ранее прошёл CI #41941892340: этот test file 6/6 PASS, application 143/143 files и 1888/1888 tests PASS.
- Причина подтверждена в test code: после denied action тест ждёт loader call count и `#authorization === null`. Оба условия могут стать истинными, пока route ещё показывает промежуточный ErrorBoundary: loader уже вызван, а authorization DOM в error UI отсутствует. После этого synchronous `expect(...).toContain("Public details")` иногда выполняется до commit/render успешного recovery detail.
- Это **current-scope test-layer defect**, не future hardening и не evidence runtime defect. Runtime `useRef` recovery chain остаётся ранее проверенной; два разных места падения на неизменном code/head подтверждают race тестового terminal-state ожидания.
- #288 не должен содержать исправление: он остаётся docs-only Draft.
- Bounded correction Лире: отдельный test-only PR от current `main`; исправить synchronization только в repeated-revocation regression, чтобы каждый recovery-cycle ждал positive terminal read-only detail state до final assertions. Сохранить проверки: два независимых denial cycles, ровно два user submits, отсутствие mutation replay/GET loop, null history state/same history entry, terminal both-rights-revoked behavior. Runtime implementation не менять без нового evidence.
- Лира реализовала bounded correction в PR #289, stable exact head `7c0f7b513e6908f98151665a6839626b91f58fac`: единственный файл, ровно две synchronous `Public details` assertions заменены на `await waitFor(...)`; runtime/schema/dependencies/docs не изменены.
- Coordinator review #289: **PASS**, `AP09-MIRA-05` CLOSED. Diff точно соответствует root cause и не ослабляет semantic assertions: два denial cycles, два submits, loader counts, no privileged controls, null history state и terminal both-rights-revoked regression сохранены.
- Exact-head CI #41953193998 independently verified: application 143/143 files, 1888/1888 tests; PostgreSQL 41/41 files, 483/483 tests; lint/typecheck/build/UI preview/migration/schema/manifest/runtime probes/Worker smoke SUCCESS.
- Уточнение process: прежняя запись «Codex-review не нужен» была ошибочной. Актуальный `AGENTS.md` не содержит исключения для test-only correction: после coordinator PASS Лёва должен выполнить independent technical review того же stable exact head.
- #288 остаётся docs-only Draft и не меняется до merge #289.
- Следующий этап: Лёва — independent technical review PR #289 exact head `7c0f7b513e6908f98151665a6839626b91f58fac`. После PASS owner merge #289, затем sync #288 на новый main и финальный docs CI.


## Owner decision — AP09-MIRA-05 review boundary

- Владелец прямо решил, что этот single test-only synchronization fix **не требует review Лёвы**.
- Решение относится только к PR #289: один существующий regression test, 2+/2-, runtime/schema/public contract не меняются.
- Coordinator PASS и exact-head green CI достаточны для этого correction.
- Предыдущее назначение Лёвы #6647857514 отменено этим решением владельца.
- PR #289 переведён из Draft в Ready; следующий шаг владельца — merge #289.


## AP-09 documentation closeout — final PASS

- PR #289 merged в `main`, merge commit `0521669eadc3b927b3f8d0651b98291ffda137a2`.
- Docs branch #288 rebased/synchronized onto that current main and five docs changes reapplied without implementation changes.
- Final #288 exact head: `d6ecb2005da02b4eaf4528b17f0530767ebddadd`; base: `0521669eadc3b927b3f8d0651b98291ffda137a2`.
- Diff remains exactly five documentation files: `PROJECT_STATE.md`, `docs/ADMIN_PANEL.md`, `docs/auth/AUTHORIZATION.md`, `docs/PROJECT_HISTORY/PROJECT_HISTORY.md`, `docs/PROJECT_HISTORY/PROJECT_HISTORY_11.md`.
- HISTORY_11 and history index additionally record AP09-MIRA-05 / #289 test stabilization and the owner's explicit Codex-review exemption for that single test-only correction.
- Final docs consistency/overscope verdict: **PASS**.
- Fresh CI #41955225394 on synchronized head: **SUCCESS** — application 143/143 files, 1888/1888 tests; `app/admin/users-authorization.test.tsx` 6/6 PASS; PostgreSQL 41/41 files, 483/483 tests; lint/typecheck/build/UI preview/migration/schema/manifest/runtime/Worker checks SUCCESS.
- #288 is **Ready/open/mergeable**.
- Следующий шаг владельца: merge #288. После этого AP-09 closeout завершён.


## AP-09 completed / AP-10 product gate

- PR #288 merged в `main` 2026-11-05, merge commit `5cf80f38cbc06ed733a0618e706eb80c5a7b3c7b`.
- AP-09 полностью завершён: implementation #287, test stabilization #289 и отдельный documentation closeout #288 находятся в `main`.
- `PROJECT_STATE.md` теперь фиксирует Admin Panel through AP-09 и repository migration head 0057.
- Подтверждённых незакрытых AP-09 current-scope defects нет.
- Следующий пакет — AP-10 block/lift enforcement — **не начинается автоматически**.
- До технического планирования владелец должен определить продуктовую blocking policy:
  1. влияет ли block на login и уже существующие sessions;
  2. остаётся ли public/private reading;
  3. какие participation writes блокируются: topics, Help questions, replies;
  4. блокируются ли own edits и profile changes;
  5. блокируются ли signals, appeals, uploads и translation generation;
  6. блокируются ли admin actions, допускается ли self-block и как защищаются access managers;
  7. обязательна ли reason отдельно для temporary block, permanent block и explicit lift;
  8. какие возможности автоматически восстанавливаются при expiry/lift.
- Эти решения являются product gate из `docs/ADMIN_PANEL.md`, а не техническими defaults. До них Лёва не получает planning task AP-10.


## AP-10 owner decision — configurable restriction model

- Владелец отказался от фиксированных вариантов block policy. Конкретная блокировка — настраиваемый набор ограничений.
- UI группирует ограничения логически: можно выбрать группу целиком или отдельные дочерние пункты.
- Temporary/permanent определяет срок действия, но не фиксированный набор ограничений.
- Истечение срока или явное снятие убирает эффект этой block-записи и не меняет роли, role grants или персональные permission overrides.
- Presets, если позже понадобятся, допустимы только как быстрый предвыбор галочек, а не как отдельные типы блокировки.
- Следующий продуктовый шаг — определить минимальный каталог реально исполнимых ограничений и их группировку.
- Публичное чтение нельзя надёжно запретить account-level block: публичный форум доступен без авторизации. Сетевые/device-level bans в AP-10 не добавляются.
- После каталога отдельно остаются reason policy и safety для self-block/access managers.
- До завершения этих продуктовых решений Лёве AP-10 technical planning не назначается.


## AP-10 owner decision — appeal is bound to the concrete block

- Заблокированный пользователь всегда должен иметь возможность оспорить **конкретную применённую к нему блокировку/меру**.
- Это право не входит в configurable restriction catalog и не может быть отключено галочкой, группой ограничений или preset.
- Entry point находится на собственной странице аккаунта пользователя непосредственно рядом с заметным статусом/надписью о блокировке.
- Appeal target — exact block/measure record. Этот flow не открывает право оспаривать unrelated Complaints Decisions, другие жалобы, другие меры или произвольные административные действия.
- Собственная block-status/appeal surface должна оставаться достижимой при любом выбранном restriction set; иначе обязательное право апелляции стало бы недоступно.
- Existing Complaints Appeal domain остаётся отдельным: он меняет effective outcome Complaint Decision и, по текущему контракту, не заявляет административную санкцию. AP-10 не должен смешивать эти две апелляционные сущности.
- Для одной конкретной меры пользователь может подать до **3 block appeals**. Лимит quota/repeat закрыт owner decision и больше не является открытым вопросом.
- Pending block appeal относится к самой administrative measure, а не к отдельной версии её состояния. При expiry или explicit lift она закрывается как утратившая предмет. Изменение restrictions, срока или причины не закрывает appeal; она продолжает относиться к той же мере, а изменения сохраняются в History.


## AP-10 owner decision — privileged moderator/admin targets

1. Обычный block-management authority применяется к обычным пользователям и сам по себе не позволяет накладывать ограничения на модераторов или администраторов.
2. Ограничивать пользователя с модераторской или административной властью могут только владелец проекта и старший/главный администратор с отдельной повышенной authority.
3. Это target-authority invariant, а не selectable restriction и не следствие наличия обычного block permission.
4. Текущая Vico authorization model permission-based; implementation не должна сводиться к hard-coded проверке имени роли.
5. На текущем этапе «старший/главный администратор» зафиксирован как отдельный продуктовый уровень authority. Нужно технически определить, как он выражается в существующей RBAC-модели, не добавляя новую built-in role без необходимости.
6. Владелец проекта — верхняя authority и не является допустимым target для block/restrictions со стороны старшего/главного администратора или любой нижестоящей administrative authority.


## Future owner-role / super-admin design task

- Владелец отдельно поручил после текущей ordinary-admin работы продумать свою owner-role и весь связанный с ней механизм.
- Это не расширяет AP-10 и не должно тормозить текущую блокировку.
- Будущая задача охватывает owner authority, owner-only operations, recovery/emergency controls, защиту от subordinate lockout/block/demotion, границы senior/head-admin, owner-only audit/sensitive settings и связь с текущей permission-based RBAC-моделью.
- Инфраструктурное владение проектом и runtime/application permissions не считать автоматически одним и тем же уровнем; границу нужно спроектировать явно.
- До начала этой отдельной задачи не строить спекулятивный super-admin subsystem.


## AP-10 owner correction — Complaint ≠ block appeal

1. Жалоба/Complaint и AP-10 block appeal — разные механизмы.
2. Complaint — входящий report о возможном нарушении другого пользователя. По текущему Complaints contract report сам по себе не является доказательством или санкцией, а Complaint Decision не применяет user blocking автоматически.
3. AP-10 block appeal подаёт уже наказанный пользователь против конкретной administrative measure, применённой к нему.
4. Measure сохраняет stated violation/reason context, чтобы было понятно, за что она назначена, но block appeal не является новой Complaint и не переиспользует Complaint Appeal semantics.
5. Existing Complaint Appeal относится к Complaint Decision/effective outcome; AP-10 block appeal относится к administrative measure. Они не должны автоматически мутировать друг друга даже если в будущем measure будет связана с Complaint Case.
6. Предыдущая формулировка Миры, описывавшая block appeal как проверку самого violation/Complaint-подобного предмета, отозвана.
7. Что происходит с уже поданной block appeal после expiry/lift/изменения меры, **ещё не определено** и не должно выводиться автоматически из Complaint workflow.
8. Количество/совмещение одновременно действующих measures и aggregation их restrictions не определены. Прежний вывод Миры про обязательные отдельные active measures и union restrictions отозван как преждевременная product-модель, не требуемая текущей целью AP-10.


## AP-10 purpose-first correction

- После прямого указания владельца AP-10 перепроверяется от назначения системы, а не от удобства технической модели.
- Сохраняются только правила, необходимые для практической цели: применить понятную и соразмерную меру, ограничить именно нужное поведение, сохранить значимую историю и оставить наказанному пользователю отдельный путь оспаривания меры.
- Complaint/Complaint Appeal остаются отдельным moderation domain и не используются как шаблон lifecycle block appeal.
- Не подтверждённые продуктовые конструкции про количество одновременно активных measures, union/intersection restrictions и поведение pending appeal после expiry/lift/change не фиксировать как approved model.
- Следующий дизайн-шаг — минимальный restriction catalog; каждый пункт проходит проверку «зачем он нужен для реальной санкции в текущем продукте?».


## AP-10 owner decision — visibility причины меры

1. Причина административной меры должна быть видна пользователю, к которому эта мера применена.
2. Причина меры не является публичной информацией.
3. Она не должна показываться другим обычным пользователям, попадать в публичный профиль или публичные страницы форума только из-за существования меры.
4. Это решение касается только видимости причины. Остальные правила причин остаются отдельным черновиком до утверждения владельцем.




## AP-10 owner decision — no block-specific last-manager protection

1. Не добавлять в AP-10 отдельную защиту «последнего управляющего ролями/разрешениями» от административной меры.
2. Не проектировать блокировки вокруг требования сохранить хотя бы одного неограниченного access manager.
3. Предыдущий вывод Миры об обязательной связи AP-10 с authorization lockout отозван как ненужное расширение scope.
4. В принятой административной иерархии мера против администратора применяется actor с достаточной более высокой authority; отдельный recovery-слой для этого сценария не нужен.
5. Старую условную формулировку в постоянной документации про usable access manager при блокировке нужно убрать/скорректировать в отдельном финальном documentation PR AP-10.


## Owner decision — post-admin authorization redesign

1. После завершения ordinary-admin работы провести отдельную переработку owner-role / administrative hierarchy и authorization recovery model.
2. Текущий invariant «после появления первого access manager нельзя оставить 0 effective `access.authorization.manage`» и его реализация через `AuthorizationLockoutError`, `managers_ever_existed` и подсчёт managers признаны **ошибочным архитектурным решением для целевой модели проекта**.
3. Ошибочный архитектурный контракт PR #59 подготовила Мира (GPT-5.6 Sol). PR #60 только реализовал это поведение по действовавшему тогда контракту; ошибка была в самом контракте, а не в несоответствии реализации задаче.
4. Почему решение ошибочное:
   - владелец проекта должен быть верхней authority;
   - subordinate actors не могут блокировать/понижать владельца;
   - владелец имеет полный набор управления форумом, включая роли и разрешения;
   - поэтому recovery не должен зависеть от количества обычных пользователей с `access.authorization.manage`;
   - count-based lockout добавляет лишнюю связанность и сложность вместо явной owner authority.
5. До завершения админ-панели текущую реализацию не менять. После неё отдельной задачей пересмотреть код, схему, тесты и документацию этого механизма.
6. Это отдельная задача после админ-панели и не должна расширять AP-10.


## AP-10 owner clarification — hierarchy lifecycle and self-target

1. Эти вопросы не являются открытыми product decisions.
2. Самоприменение административной меры запрещено: actor не создаёт, не изменяет и не снимает меру относительно самого себя.
3. Уже утверждённая target-authority hierarchy применяется ко всему lifecycle меры: создание, изменение и снятие.
4. Нижестоящий administrator/moderator не может изменить или снять меру, для которой у него недостаточно authority относительно target/issuer hierarchy; иначе он смог бы обойти уже утверждённую привилегированную target boundary.
5. Обычный block-management authority не даёт права управлять мерами против moderator/admin targets; это остаётся только у owner и senior/head authority в рамках ранее утверждённой модели.
6. Не возвращать self-block и lifecycle hierarchy владельцу как отдельные открытые вопросы.

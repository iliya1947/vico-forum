# Лёва — Stage1 independent technical review: PASS

Текущее назначение выполнено: PR #294 exact head `e3604222ae8cecb4b1f2f94cdd5d7e9f76c15e61`, independent PASS. [Полный отчёт](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6701647394). Следующий шаг — Мира: readiness/отдельный factual documentation closeout. Merge выполняет владелец; Stage1 в main ещё не закрыт.

Лёва — independent technical review Stage1 / PR #294: **PASS**.

Exact head: `e3604222ae8cecb4b1f2f94cdd5d7e9f76c15e61`; base/current main `bcf02193f82aa0d448444c6943d6ebdcf09f7896`. Проверен весь 21-file diff против approved plan #6700603167 и прямого owner decision. Самостоятельно, без вызова других агентов и без изменения implementation; coordinator PASS не использован как доказательство.

### Whole-PR выводы

- AuthorizationLockoutError, countManagers(), before/after counting, flag read/update и zero-manager veto удалены из active runtime. Scoped search app/db это подтверждает.
- mutate() сохраняет begin → singleton id=1 FOR UPDATE → **fresh actor permission** → AP-10 admission → operation/elevated-key guards → final atomic History → commit/rollback. Missing mutex fail closed. Нового last-manager veto/recovery mechanism нет.
- authz_mutation_lock table/row/PK/CHECK и SELECT+UPDATE runtime privileges/lock probe сохранены. AP-10 writers/readers/issuer-floor boundary не переделаны; PG regression подтверждает ожидание обоих writers на mutex и fresh forbidden после grant change до release.
- Self-revoke/удаление manage role grant/self-role reassignment могут committed с обычной History, в том числе без оставшегося effective manager. Следующие requests отозванного actor denied. History failure откатывает и такой self-revoke.
- Route убирает только obsolete lockout mapping; assigned-role deletion остаётся private/no-store409, прочие ошибки сохраняются. EN/RU/HE conflict copy и fingerprint соответствуют remaining assigned-role conflict.
- Forward0059 — один DROP COLUMN без CASCADE. Current schema/snapshot/journal/manifest согласованы. Deep comparison0058/0059 snapshots без id/prevId и удалённой колонки дал equality; accepted0000–0058 не переписаны.
- Dedicated veto expectations сняты локально; соседние forbidden/no-op/assigned-role/History rollback tests сохранены. Historical flag в compatibility fixture не является active invariant.
- Browser self-deny перенесён в конец admin-history flow, AP-10/AP-11 cases сохранены. Два browser jobs используют отдельные PostgreSQL services, обоснованно изолируя global History/authorization fixtures.
- Permanent docs ждут отдельного closeout; старые формулировки не использованы как основание вернуть отменённое правило. Owner authority, Settings, mutex redesign, super-admin, Stage6/production не добавлены.

**Подтверждённых current-Stage1 defects не найдено.**

### Собственное evidence на exact head

Pinned Node24.21.0/pnpm12.3.4, disposable loopback PostgreSQL17:
1. **23/23 unit/route/UI tests**, **112/112 native PostgreSQL tests** (5 files). Проверены self-revocations/role/grant changes, next-request denial, History rollback, controlled real mutex waits и AP-10 enforcement.
2. Build PASS; 3 migration-history/manifest/runtime-privilege script suites PASS.
3. Самостоятельный **full0058→0059 SQL upgrade probe** для oldFlag=false и true: полная цепочка до0058, populated users/roles/overrides/measures/restrictions/pending appeal/History; фактический0059 SQL сохраняет payload9 relations, mutex row id=1, PK и CHECK. Это собственное evidence, не требование нового implementation refactor/test subsystem.
4. **Actual Chromium→built Worker→Better Auth→PostgreSQL**, отдельная БД для каждого harness:
   - updated Admin History: **35 case groups PASS**, canonical self-revoke200 + один event, next management GET/POST403, no extra role/event; 0 page errors/external requests;
   - AP-10/AP-11: **34 case groups PASS**, exact implementationHead recorded, 0 layout failures/page errors/external requests; session grant/revoke, measures/appeals, closure composition, stale revalidation и EN/RU/HE сохранены.
5. GitHub exact-head **CI #42328843126 SUCCESS** и **browser #42328843151 SUCCESS** подтверждены отдельно; author CI не замена собственным reruns.

Evidence: `/workspace/work/stage1-review-evidence/` — application.log, database.log, metadata.log, build.log, history-browser/results.json, measures-browser/results.json/screenshots, independently written upgrade-probe.mjs/upgrade.json. AP-10 environment adapter вне implementation tree; History harness исполнен непосредственно из exact checkout.

Review не означает production migration/deploy, owner visual acceptance или завершение всей owner/authorization redesign.

**Следующий шаг — Мира:** принять independent PASS и завершить readiness/отдельный factual documentation closeout Stage1; merge выполняет владелец. Активные last-manager clauses обновить по уже утверждённому решению, historical evidence сохранить. Stage1 целиком не closed до implementation/docs acceptance/merge; следующие owner/mutex/Settings этапы отдельно.

Лёва проверку завершил и останавливается. Implementation frozen; изменение head требует coordinator-first cycle.

Head/main перепроверены перед публикацией; tracked checkout чист. Локальный Worker остановлен, disposable container/DBs и dummy .dev.vars удалены. History runner не пишет SHA в собственный results.json: привязка этого прогона подтверждена exact checkout/build/command log и данным отчётом; AP-10 results.json содержит implementationHead.


---

## Утверждённый технический план и предыдущий контекст

Planning статусы ниже исторические: implementation review завершён PASS на exact head выше.

# Лёва — owner/authorization Stage 1 technical planning

Текущее назначение выполнено: [план удаления last-manager](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6700603167) на main `bcf02193f82aa0d448444c6943d6ebdcf09f7896`. Требуется coordinator review Миры. Implementation не начинался; authz_mutation_lock сохраняется.

Лёва — owner/authorization redesign, Stage 1: минимальный technical plan удаления last-manager.

Baseline: `main bcf02193f82aa0d448444c6943d6ebdcf09f7896`, migrations 0000–0058. Ordinary Admin Panel AP-01–AP-11 закрыт. Это **planning only**: implementation/PR/DB migrations не выполнялись.

## 1. Результат dependency check и точный scope

Удалить `AuthorizationLockoutError`, `countManagers()`, `managers_ever_existed` и выделенные last-manager veto/checks/tests. **Сохранить `authz_mutation_lock`, singleton id=1, row FOR UPDATE, transaction/History boundaries и current AP-10 authority synchronization.**

По repository search и чтению callers:
- Runtime flag/count используется только в `PostgresAuthorizationRepository.mutate()`; других runtime consumers не найдено.
- Отдельные AP-10 consumers `db/user-measures.ts:withLockedTransaction`, `db/user-measure-read.ts:adminRead/adminPendingAppeals` уже читают **id**, не флаг. `db/user-measure-authority.ts` требует удерживать этот mutex при raw hierarchy resolution.
- `.github/scripts/runtime-privileges.mjs` сохраняет SELECT/UPDATE на lock table; `verify-runtime-privilege-probes.mjs` выполняет SELECT…FOR UPDATE. Это реальные независимые от last-manager зависимости; удалять/ослаблять их нельзя.
- Другие следы флага — текущая Drizzle schema, current structural manifest, unit mock и immutable historical SQL/snapshots. Нет зависимости bootstrap/другого writer от managers_ever_existed вне этой invariant.
- Есть пользовательский текст/route mapping, native/DOM/browser assertions старого запрета. Их нужно убрать вместе с runtime, а не оставить «мёртвую» last-manager семантику.

Owner authority implementation, новый bootstrap/recovery, super-admin UI, Settings, смена/удаление mutex, Stage 6/production — вне scope. Никаких новых confirmation dialogs, last-admin исключений или замены счётчика другим veto.

## 2. Runtime и HTTP/UI — одна локальная корректировка

**`db/authorization-repository.ts`:**
1. Удалить class export AuthorizationLockoutError и function countManagers, оба before/after count calls, условие запрета after=0 и запись managers_ever_existed=true.
2. В mutate заменить flag-select на `select id from authz_mutation_lock where id=1 for update`; оставить существующий missing-row fail-closed error.
3. Порядок остаётся: begin → singleton row lock → **fresh** actor access.authorization.manage → existing admin.usersAccess measure admission → operation/elevated-key owner guards → shared final History order lock/append, если change → commit. Ошибка operation/History по-прежнему rollback.
4. Текущий actor может своим легитимным действием отозвать собственное последнее право — операция committed и получает обычный History. Следующий request уже проверяет отсутствие права и denied. Имя роли/количество других managers не влияют.
5. Удалить только устаревший комментарий о raw manager count. PermissionResolver/raw grants/effectivePermission()/History producer/elevated authority не перепроектировать.

**`app/routes/authorization-admin.tsx`:** убрать import/type branch AuthorizationLockoutError. Оставить 409 conflict для AuthorizationRoleAssignedError; invalid/forbidden/notFound/unavailable и private/no-store сохраняются. Inline Users по-прежнему использует этот canonical action и существующую fresh-403 recovery.

**`app/localization/catalog.ts`, `manual-values.ts`, `manual-fingerprints.ts`:** сохранить key `authorizationError_conflict`, но убрать ложное «would cause a lockout». Remaining concrete meaning — assigned role cannot be deleted (например, canonical EN “This role is assigned to users and cannot be deleted.” с согласованными RU/HE/fingerprint). Новых keys/UX flows не нужно.

## 3. Schema / forward migration / ACL

- `db/schema.ts:authzMutationLock`: удалить только managersEverExisted field. Таблица, PK(id), singleton CHECK(id=1), существующая row остаются.
- Новая forward migration **0059** (если head не изменился): `ALTER TABLE "authz_mutation_lock" DROP COLUMN "managers_ever_existed";`. Без CASCADE, DROP TABLE, пересоздания row, изменения grants или unrelated ALTER.
- Согласовать новый Drizzle snapshot/journal и `.github/production-schema-manifest.json`: current lock table теперь имеет только id. Число таблиц не меняется.
- **0000–0058 SQL и их historical snapshots не редактировать**, включая 0006, где поле создано. Старые migration artifacts и исторические записи закономерно сохранят старое имя; global grep-zero по всему Git tree не является критерием.
- Сохраняются current runtime SELECT/UPDATE lock-table privileges и existing probe. Localization role не расширяется. Production migration/deploy не выполнять.
- Проверить clean chain и upgrade существующей 0058 schema с row id=1/значением флага true и false: после 0059 row/PK/CHECK сохраняются, поле отсутствует, данные ролей/overrides/measures/History не меняются. Новые runtime queries работают и на старой таблице с лишним полем; никаких runtime fallback по ошибке missing-column не добавлять.

## 4. Точные test changes и минимальные новые assertions

**Снять устаревшие ожидания, не удаляя соседнюю защиту:**
- `db/authorization-repository.test.ts`: mock на select id FOR UPDATE; удалить count/flag replies, сохранить rollback/availability/error cases.
- `tests/database/migrations.test.ts`: убрать импорт/last-manager отказ внутри mixed authorization test и dedicated “last two managers cannot both be removed” test. Historical schema expectations ранних migrations оставить исторически точными. Не убирать обычные role/grant/override/forbidden/assigned-role tests.
- `tests/database/admin-history.test.ts`, `admin-users-authorization.test.ts`: убрать только lockout rejection parts, **сохранить** реальные no-op/denied/invalid/failed History rollback assertions и независимость Users-read/management.
- `app/routes/authorization-admin.test.ts`: удалить fake lockout 409 cases; existing assigned-role delete conflict должен остаться проверенным (добавить focused test, если после удаления отсутствует).
- `app/authorization/admin-view.test.tsx`: обновить конфликтный текст и название test, сохранить безопасную локализованную feedback boundary.
- `tests/database/user-measure-forum-enforcement.test.ts`: заголовок о “last-manager accounting” сделать актуальным; существующие assertions roles/History/raw permission и AP-10 admission сохранить.
- По завершении повторить scoped search по active app/db/tests; не маскировать компиляционные ошибки удалением соседних suites.

**Изменённое поведение проверяется native PostgreSQL, без нового подсчётного механизма:**
1. Изолированные fixtures для grant removal из role, назначения роли без manage и personal deny/removal allow. Включая ситуацию, где действие действительно убирает последнее effective manage: commit разрешён, одно соответствующее History change, следующая management mutation этого actor denied и не пишет event. Fixture reset/provision через test SQL не является новым recovery API.
2. При двух actors, независимо отзывающих своё право, обе допустимые операции могут committed. Старое ожидание «обязательно оставить одного» удалено. Не утверждать, что **любой** concurrent revoke должен succeed: если другой actor уже отозвал право у caller, caller обязан получить fresh forbidden.
3. Отдельный controlled concurrency regression подтверждает mutex без count: удержать singleton row в fixture transaction, запустить реальную authorization mutation и AP-10 operation; они ждут row lock. После изменения relevant grant и освобождения lock authoritative path читает fresh state и применяет current guard. Использовать barriers/PG lock observation, не sleeps как доказательство.
4. Missing singleton row остаётся fail-closed; failed History append откатывает grant/override даже при допустимом уходе к нулю managers.
5. Existing AP-10 authority/issuer-floor/elevated-key/privacy/appeal/enforcement tests не ослаблять; полные suites должны проходить без managers_ever_existed.

Не добавлять новый property-based matrix, “owner recovery” tests или SQL manager counts в production ради проверки того, что count удалён.

## 5. Browser evidence без старой lockout зависимости

`tests/browser/admin-history/check.py` сейчас пытается self-deny с expected409 **посреди** сценария, затем продолжает пользоваться тем же manager. Простая замена 409→200 испортит остальной flow.

Минимально:
- убрать этот dedicated старый rejection и lockout case labels;
- сохранить шесть producers, no-op/retry, actual forbidden/invalid/notFound/cross-origin, history paging и настоящий failure rollback/read isolation;
- положительный self-revoke с действительной canonical UI mutation выполнить в **конце** browser flow: observe allowed commit/одно History событие, следующий management read/POST 403. History проверить уже разрешённым reader либо DB inspection. Не создавать новый recovery endpoint/автоматический regrant.
- Остальные fixture cleanup SQL остаются только для disposable DB.
- EN/RU/HE feedback assigned-role conflict проверяется DOM/runtime там, где применимо; owner visual acceptance не назначать.
- Запустить updated admin-history harness + существующий AP-10/AP-11 integrated user-measures harness на stable exact head. Последний проверяет current grant/revoke/measure/session interactions и не должен требовать переписывания политики или нового job.

## 6. Постоянная документация — отдельный closeout PR

После принятой реализации убрать **активное требование** last-manager из:
- `docs/auth/AUTHORIZATION.md`: section Lockout protection и связанные active references; вместо него описать fresh authorization и retained transaction mutex. Не добавлять новую owner модель или объявлять bootstrap реализованным.
- `docs/ADMIN_PANEL.md`: admission/action/History paragraphs, которые продолжают требовать lockout; сохранить все прочие safeguards/AP-10 hierarchy.
- `PROJECT_STATE.md`: фактический post-Stage1 runtime/schema state, next separate owner/authorization step; без исторической хроники.
- `ROADMAP.md`: current/release requirements больше не требуют last-manager. Сведения о прошлом Stage4 могут сохраняться как факт с явным superseded boundary, не как активный invariant.
- `docs/UI_UX_PASS.md`: актуальный “keep lockout” пункт больше не является будущим требованием. Исторический факт PR165 не переписывать; при необходимости дать короткую supersession note.
- `tests/browser/admin-history/README.md`: актуализировать coverage описание вместе с отдельным docs closeout.
- `docs/PROJECT_HISTORY/` и индекс: factual Stage1 snapshot; уже существующую историю/doc_old не “чистить” задним числом.

Service source-of-truth #251 обновляется сразу как координация. Мира синхронизирует общий master plan: его старые last-manager формулировки superseded прямым owner decision. Это не новое owner согласование и не основание тормозить Stage1.

## 7. Готовность и handoff

Один implementation PR с согласованными runtime/schema/manifest/locale/tests changes, затем отдельный docs PR. Stage1 готов к review, когда:
- старый veto/error/flag/count отсутствуют в active runtime/current schema; dedicated veto tests больше не требуют сохранения manager;
- mutex/row lock/fresh permission/AP-10 guards/atomic History сохранены; behavior и concurrency подтверждены PostgreSQL;
- новое current schema metadata/upgrade/manifest/ACL probes и existing full exact-head CI green;
- реальные browser self-revoke и AP-10/AP-11 connected flow проходят с synthetic sessions/disposable DB; evidence фиксирует exact SHA, no-store и отсутствие новых partial writes;
- unknown errors не превращены в permission success; нет scope drift в owner/Settings/production.

После approval плана: Лира implementation → stable head/checks → Мира whole-PR → Лёва independent review того же head → owner merge → отдельный factual docs closeout. Полностью разрабатывать owner authority в этом пакете не нужно.

**Мира:** coordinator review этого минимального плана; после approval назначить Лиру. Новых owner product decisions не требуется. Код/схему/тесты в этом planning turn не менял и ничего из будущей проверки не объявляю выполненным.


## Завершённый предыдущий этап

Ordinary Admin Panel AP-01–AP-11 закрыт; #293 merged. Собственный independent AP-11 PASS: https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6689555134 . После Stage1 остаются отдельные owner/authorization design steps, затем Settings.

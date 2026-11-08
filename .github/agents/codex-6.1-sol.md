# Лёва — SET-06 Privacy technical plan delivered

[Current plan #6722989280](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6722989280). Exact main `c1109dc8c5c499b63dd6e4d2f76bce96fadb2cd5`. Source-level planning complete; project code unchanged. Mira scope/fit review next; Lira not assigned yet. Lev stopped.

Лёва — **SET-06 Privacy: bounded technical implementation plan**.

**Baseline:** current main `c1109dc8c5c499b63dd6e4d2f76bce96fadb2cd5`, проверен непосредственно перед публикацией. SET-05 implementation #309 и docs #310 merged; SET01–05 закрыты. План развивает approved SET-06 из [Settings decomposition #6711736883](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6711736883) по текущему назначению Миры. **Это план, код/миграции не реализованы, acceptance/CI SET-06 ещё не выполнялись.**

### 1. Проверенный текущий путь

- `db/schema.ts`: `forum_online_presence(user_id PK/FK user ON DELETE CASCADE,last_seen_at)`; privacy preference ещё нет. Main содержит migrations0000–0060.
- `DrizzleForumRepository.readOnlinePresence()` (`db/forum-repository.ts`) читает recent5min presence + public user identity, считает `count(*) over()` **до LIMIT12**, сортирует last_seen_at desc/user.id. Единственный текущий consumer — homepage loader `app/routes/home.tsx` → `HomeView`. Guest читает тот же серверный список.
- `recordOnlinePresence(userId)` делает upsert; повторный update ограничен45s, время задаёт PostgreSQL. Вызывается через `createHyperdriveForumWriter` из authenticated same-origin `/:locale/presence`. Actor берётся из session; expectedUserId — stale check.
- `OnlinePresenceHeartbeat` смонтирован в locale boundary: authenticated visible tab, ping при входе/навигации/visibility change, далее60s; 401/409 останавливают timer и revalidate session. Сейчас сервер не читает privacy.
- Homepage не задаёт собственного явного success cache header; `forumReadLoader` обрабатывает classified outage, optional online outage превращается в unavailable card, не в ложный ноль. Worker переносит auth cookies, не задаёт общий no-store за homepage.
- В Settings уже есть четыре работающие surfaces; Privacy — inert placeholder. Узкий собственный request capability/context/Worker wiring уже используется для user locale; новый global settings store не нужен.
- Web runtime имеет INSERT/SELECT/UPDATE на presence, **DELETE сейчас нет**; contracts/provisioning/probes выводятся из `.github/scripts/runtime-privileges.mjs`.

### 2. Утверждённый результат и хранение

Новая authenticated персональная страница **`/:locale/settings/privacy`**, один control **«Показывать меня онлайн»**, default **ON**. Выбор серверный, общий для аккаунта на всех устройствах. OFF исключает пользователя из публичных online list **и count**, а heartbeat не возвращает его туда. Profile/posts/account/public content не скрываются.

Одна application-owned таблица **`user_privacy_preferences`**:
- `user_id text PRIMARY KEY REFERENCES user(id) ON DELETE CASCADE`;
- `show_online boolean NOT NULL DEFAULT true`;
- `updated_at timestamptz(3) NOT NULL DEFAULT clock_timestamp()`.

Отсутствие строки предпочтения у существующего пользователя = **true**; backfill всех аккаунтов не нужен. Это не fallback при DB error/missing table. Не хранить preference только в presence row: отсутствие/давность активности и долгосрочный выбор — разные состояния.

Одна следующая forward migration, при неизменном main — **0061**; точный свободный номер сверить в начале реализации. Обновить `db/schema.ts`, новый SQL/snapshot/journal и `.github/production-schema-manifest.json` с фактическими PG17 catalog definitions/hashes/targetMigration. Прежние0000–0060 SQL/snapshots не менять.

Runtime contract:
- новая preference relation: web **SELECT/INSERT/UPDATE**, без DELETE;
- существующая presence relation: добавить web **DELETE** только для очистки своей presence при OFF;
- localization-read не получает этих прав; новые sequences/functions/security-definer/DB roles не нужны.
Расширить текущие privilege-contract tests/probes; provisioning уже использует общий contract, не создавать отдельный provisioning path. Проверять необходимые grants в disposable DB, не выполнять production provisioning.

### 3. Серверный read/write и конкурентный heartbeat

Узкий module, например `db/user-privacy.ts`: типизированные read/save и общий локальный helper блокировки subject. Request-local wrapper `db/hyperdrive-user-privacy.ts` + `app/settings/user-privacy-context.ts` с `read(actorId)` / `save(actorId,showOnline)`; подключить через существующий **WEB_HYPERDRIVE** в `workers/app.ts`. Actor передаётся только сервером из request session. Сохранить существующие DB client deadlines/cleanup и classified availability handling.

**Save:** одна транзакция READ COMMITTED:
1. Заблокировать существующую строку **этого пользователя**: `SELECT id FROM "user" WHERE id=$1 FOR UPDATE`. Такой pattern уже есть у `updateProfile`.
2. Upsert собственного boolean preference; повторная явная запись того же значения идемпотентна по смыслу, без History/CAS/version subsystem.
3. При **OFF** удалить собственную `forum_online_presence` row в той же транзакции — включая повторный OFF.
4. Commit; при отсутствующем user — typed stale-account conflict, не успешный default/no-op.

**Heartbeat:** изменить именно существующий `DrizzleForumRepository.recordOnlinePresence()`, без второго writer. В транзакции взять **тот же per-user lock**, затем **отдельным следующим SQL statement** прочитать текущий preference (missing row=true). OFF → никаких insert/update last_seen_at; ON → прежний presence upsert с45s throttle и DB clock. Account missing обрабатывать как stale identity; route отдаёт409, существующий browser recovery уже его понимает.

Почему нужен общий lock: одной условной INSERT/проверки boolean и отдельного cleanup недостаточно для физической row при in-flight heartbeat. Лочить только preference row тоже недостаточно — её законно ещё нет. Стабильная user row решает оба случая без нового mutex/table/global serialization:
- heartbeat первым → он завершает запись, OFF затем удаляет её;
- OFF первым → ожидающий heartbeat после lock видит уже сохранённый false и не пишет.
Одинаковый порядок user → preference → presence. Не читать preference до ожидания lock и не объединять lock + read в один statement со старым snapshot. READ COMMITTED даёт свежий snapshot следующему statement; это сверено с PostgreSQL17 docs. Иные профили/пользователи не блокируются общей глобальной блокировкой.

**Публичное чтение остаётся самостоятельной границей.** `readOnlinePresence()`: LEFT JOIN preference по user_id и `coalesce(show_online,true)=true` вместе с recent5min predicate в SQL **до window count/order/LIMIT12**. Один snapshot list/count сохраняется, mapping остаётся только public id/name/image; privacy flag/email/hidden identities не добавлять в public DTO. Не фильтровать готовые12 строк в JS и не полагаться только на DELETE — даже оставшаяся/синтетически восстановленная row скрытого пользователя не должна попасть в list/count.

ON сам по себе **не записывает presence/last_seen_at**. После OFF row уже удалена; пользователь появится после обычного разрешённого heartbeat, пока действует прежнее five-minute правило. Не менять45s/60s/five-minute constants, anonymous exclusion или existing AP-10 behavior.

### 4. Route, формы, cache и UI

- Независимые loader/action guards: authenticated session; method POST; same-origin; один exact intent, например `save-online-visibility`; только `intent/expectedUserId/showOnline`; ровно одно строковое значение каждого поля, boolean только `"true"/"false"`. Отсутствие checkbox value не считать ON. Client subject/Owner/role не выбирают target.
- `expectedUserId` обязателен и сравнивается с current session before write; stale account409, malformed400, origin403, guest401, classified unavailable503. Unexpected schema/programming errors не превращать в saved/default-ON. При неопределённом результате client/network timeout не обещать доказанный rollback и не replay POST автоматически; fresh reload читает authoritative state.
- Loader отдаёт только своё `accountId/showOnline` и существующую Settings presentation projection. Краткий понятный текст о публичном онлайн-статусе, explicit Save, pending/result/errors; no false success. No additional account/Owner permission.
- Account-bound form state/identity guard как в текущих Settings: смена аккаунта сбрасывает draft; старый loader не подставляет старый выбор под новый expectedUserId. Другая вкладка/устройство получает persisted value при следующей загрузке; отдельный sync/localStorage store не нужен.
- Сохранить private/no-store на Settings loader/action, document/data, success/controlled failures. Существующий cookie ordering Worker не менять.
- Закрепить `private, no-store` на **homepage document и home data response**, включая доступную страницу с unavailable online card. Не рассчитывать только на parent headers/default framework behavior. Для heartbeat success и controlled error responses также no-store. Проверить действительные HTTP headers, а не один экспорт функции.
- Уже полученный чужим браузером HTML и read, начавшийся до OFF commit, не требуют push-отзыва. Следующий свежий public read после успешного save обязан исключить скрытого пользователя.
- Browser heartbeat можно **оставить существующим**: запрос OFF превращается в серверный204/no-op. Не добавлять showOnline в Better Auth session/HeaderAuthUser, дополнительный endpoint или клиентский preference broadcast только ради остановки timer. Enforcement не зависит от client.
- `app/routes.ts`, `settingsPrivacyPath`, SettingsShell current/breadcrumb и landing: активная Privacy link вместо последнего placeholder. EN canonical catalog + RU/HE values/fingerprints, responsive/RTL/keyboard. Не перенаправлять публичную footer privacy-policy destination на персональную настройку.

### 5. Bounded implementation scope

Один implementation PR от актуального main, с тремя последовательными рабочими срезами:
1. Schema/forward migration/manifest/grants + narrow privacy capability + authoritative read/write/heartbeat enforcement и native PG tests.
2. Privacy route/Settings navigation/localization + home/presence response cache boundaries и route/UI tests.
3. Built Worker/Better Auth/disposable PG17/Chromium connected acceptance, exact-head checks и Ready handoff.

Ожидаемые paths (имена новых узких modules допускают эквивалент без изменения границы):
- `db/schema.ts`, новый0061 SQL/snapshot, journal, schema manifest;
- `db/user-privacy.ts`, `db/hyperdrive-user-privacy.ts`, `app/settings/user-privacy-context.ts`, `workers/app.ts`;
- `db/forum-repository.ts`, при необходимости typed error forwarding в `db/hyperdrive-forum.ts`;
- новый `app/routes/settings-privacy.tsx`, `app/routes.ts`, `app/settings/paths.ts`, `app/settings/shell.tsx`, `app/routes/settings.tsx`;
- `app/routes/home.tsx`, `app/routes/presence.ts`, localized catalog/manual values/fingerprints и только необходимые CSS;
- относящиеся unit/routes/PG/browser tests, runtime privilege tests/probes и existing browser workflow integration.

Не переносить все персональные настройки в новую таблицу, не менять Better Auth metadata/provider/permissions/authorization policies, notifications, unrelated privacy/export/delete, last-seen tracking или другие workspaces.

### 6. Обязательное evidence для реализации

**Native PG17 (реальные SQL/transactions):**
- migration/constraints/FK cascade/defaults; missing preference у existing/new user=true; false/true persists independently between accounts;
- visible count/list и complete count при >12, hidden внутри первых12 и вне LIMIT, все hidden/empty, expired5min; stale hidden presence row всё равно исключена;
- hidden heartbeat не создаёт и не обновляет row, visible сохраняет45s throttle; ON без heartbeat не создаёт активность;
- два независимых connections в обоих порядках OFF↔heartbeat, в том числе начально отсутствующая preference row. Детерминированный lock barrier/pg_stat_activity вместо time-based sleep; после завершения OFF остаются false и отсутствие presence;
- rollback при настоящей SQL failure до commit сохраняет согласованную preference/presence пару; classified connection/query/lock timeout не fail-open, schema error не ordinary unavailable/default;
- web-role grants позволяют read/save/cleanup/row lock, лишние права на новую relation не появляются.

Текущие частичные fixtures (особенно `tests/database/forum-online-presence.test.ts`, `stage4-core-e2e.test.ts`, остальные реально использующие presence readers/writers) должны устанавливать новую relation, если теперь исполняют зависящий от неё код. Менять только затронутые test fixtures; не переписывать принятую migration history или весь test framework.

**Unit/route/UI:**
guest/direct loaders/actions, Origin, duplicate/unknown/missing fields, explicit false/true, forged/stale identity, known availability vs unexpected failures, private document/data/errors, same-mounted account switch, Settings link/breadcrumb/pending-count/route inventory и EN/RU/HE.

**Real browser/runtime:**
два собственных authenticated contexts + отдельный guest; Settings default ON → реальный heartbeat → guest list/count → save OFF → свежие guest homepage document/data → direct/repeated heartbeat hidden user → still absent; reload/second own session видят saved OFF; чужой account не изменён. Save ON сам не подделывает activity, последующий heartbeat возвращает участника. >12/count и concurrent boundaries дополнительно подтверждаются nativePG. Проверить реальные private/no-store, classified outage/unavailable card, expired/revoked session/stale actor, EN/RU/HE/RTL, mobile/tablet/desktop/keyboard и отсутствие browser errors/external requests.

Переиспользовать existing `.github/workflows/ap10-browser.yml` **settings_browser** с его Worker/PG/Playwright и новым `tests/browser/settings-privacy/check.py` рядом с SET02/03/05. Добавить нужные path triggers для privacy/heartbeat/home/repository/new migration/test. Не создавать standalone workflow, второй сервер/DB/job ради этого пакета и не заменять existing acceptance. CI: lint/typecheck/unit/build, Drizzle check/generate parity/history guard, полная clean PG17 migration/integration suite, schema manifest/runtime privileges/provisioning probes и действующий browser workflow на stable exact head.

### 7. Routing и граница выполненного

Лёва выполнил source-level planning на указанном main: прочитаны актуальные PROJECT/PROJECT_STATE/SETTINGS, применимые ROADMAP/UI online и migration contracts, online SQL/heartbeat/cache chain, Settings integration, runtime privilege/provisioning/manifest и test seams. Сверены официальные PostgreSQL17 [Read Committed](https://www.postgresql.org/docs/17/transaction-iso.html#XACT-READ-COMMITTED) и [row locks](https://www.postgresql.org/docs/17/explicit-locking.html#LOCKING-ROWS). Новые API/dependencies не вводятся. Evidence/source inventory: `/workspace/work/set06-plan-evidence/`; checkout `/workspace/work/set06-plan` clean.

**Никакая реализация SET-06, миграция БД, runtime acceptance, CI PASS или performance acceptance этим планом не заявляется.** Проектные файлы не менял; других агентов не запускал.

**Мира:** проверить scope/fit и этот технический план, после approval отдельно назначить Лире только SET-06. Лира до этого не назначена. После stable implementation handoff — coordinator-first whole-PR → independent review того же head → Owner merge → отдельный factual docs closeout (SETTINGS/PROJECT_STATE/профильные docs/History). Handoff фиксировать в #251 с фактическим состоянием CI, не задерживать передачу только ради ожидания CI и не выдавать pending за PASS. Любой implementation-head change требует нового coordinator-first цикла.

Production/Neon/Hyperdrive rollout, live Google/real Owner binding, чужие сообщения, дополнительный owner visual gate и Stage6 не входят в план. Лёва планирование завершает и останавливается; Марк не назначен.

## Closed prior context

SET01–05 fully closed. SET05 independent PASS [#6722125480](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6722125480), evidence /workspace/work/set05-repeat-evidence/; SET05 implementation #309 + docs #310 merged. Settings decomposition [#6711736883](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6711736883). No last-manager/count/recovery rule applies.

# Лёва — Settings technical plan готов для coordinator review

[Полный план #6711736883](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6711736883). Baseline main `856b93cb65b01e2389eb97276b37b3a0d8eef265`, migrations0000–0059. Предлагаемая последовательность SET-01–06; исполнитель/implementation PR не назначены. Код/схема/миграции не менялись; tests/browser/CI не запускались. Следующий шаг — Мира: review плана и назначение ближайшего пакета только после approval.

Лёва — Settings: технический план и bounded package sequence для проверки Мирой.

**Baseline:** main `856b93cb65b01e2389eb97276b37b3a0d8eef265`, migrations 0000–0059. Ordinary AP-01–AP-11 и owner/authorization redesign закрыты. Единственный Owner — разработчик с server-bound Better Auth user ID; Google/production binding остаются Stage6. Это planning-only turn: код, схема, миграции и implementation PR не создаются; исполнитель не назначен.

### 1. Зафиксированный продукт и архитектура

Пять поверхностей: **Forum & roles; Administrator preferences; User preferences; Account & security; Privacy**.

- S1: в текущем выпуске **все шесть authorization-management mutations Owner-only**, включая assignment и overrides. Будущее делегирование заместителям должно оставаться возможным; сейчас заместители/permissions для них не реализуются.
- S2: reply/mention notification preferences отложены; inbox/unread/badge/Complaint outcome notifications не менять.
- S3: public online visibility **ON по умолчанию**, пользователь может выключить.
- S4: независимые флаги регистрации новых Google и email/password аккаунтов. Закрытие регистрации метода не отключает вход уже существующего пользователя или связывание метода с существующим аккаунтом.

Рекомендуемый последовательный маршрут: **SET-01 → SET-02 → SET-03 → SET-04 → SET-05 → SET-06**. Каждый — отдельный implementation PR с собственным acceptance и отдельным factual docs closeout. Пакеты не требуют одновременного merge. После SET-02 остальные функционально зависят от Settings shell, не друг от друга; последовательность выше — рабочий маршрут, не новая архитектурная зависимость.

Не вводить универсальный settings JSON store, новый RBAC, Owner role, deputy stub, общий settings-management permission или второй auth/session provider. Persistence различается по смыслу: global registration — PG; admin convenience — local per account/device; theme — current browser-local; Editor — current local per account/device; locale — существующий `user.locale`; security — Better Auth; privacy — небольшой application-owned PG record.

### 2. Общие routes, guards и приватность

Предлагаемые адреса под существующим generic locale boundary:
- `/:locale/settings` — навигационный вход, не шестая функциональная страница;
- `/:locale/settings/forum` — Forum & roles, exact bound Owner;
- `/:locale/settings/administrator` — Administrator preferences, только при текущем доступе к Admin или Attention workspace;
- `/:locale/settings/user` — User preferences, authenticated user;
- `/:locale/settings/account` — Account & security, authenticated user;
- `/:locale/settings/privacy` — Privacy, authenticated user.

Небольшой общий Settings shell внутри прежнего ForumShell; не вкладывать второй AdminShell. Header/account navigation и прежний admin Settings placeholder ведут в Settings family. Показывать реализованные и доступные поверхности; отсутствующие до своего пакета страницы не выдавать за работающие настройки. Complaint priority/settings остаются в Complaints.

Каждый private loader/action самостоятельно использует общий session/access guard: nested loaders исполняются независимо, parent layout не является проверкой доступа. Actor/subject только из session; submitted user ID — максимум stale-account expectation. POST — existing same-origin, strict form allowlist/enum validation, private/no-store для document/data/success/errors. Authenticated stale-account mutation возвращает409 до записи; не повторять POST автоматически. Classified DB failures — controlled unavailable; unexpected schema/programming errors не считать успехом или обычным denial. Personal preference/security actions не требуют административных permissions и не включаются в AP-10 punitive restriction catalog.

### SET-01 — текущая Owner-only authorization mutation policy

**Цель:** выполнить S1 в существующих Roles и Users flows до добавления новых Settings controls. Схема/миграции/seed grants не нужны.

**Файлы/границы:**
- `db/authorization-repository.ts`, service/Hyperdrive capability;
- общий небольшой authorization-management policy helper поверх существующего `isBoundOwner`;
- `app/routes/authorization-admin.tsx`, `app/routes/admin-user.tsx`;
- `app/authorization/admin-view.tsx`, `user-controls.tsx`, inline Users controls и применимые navigation flags.

В существующей `mutate()` после shared mutex/fresh actor read добавить единый **current-release Owner-only mutation admission** перед любым из шести intents. Все repository entry points получают его, включая прямые callers и no-op requests. Наличие ordinary `access.authorization.manage` само по себе больше не разрешает mutation. Missing/invalid binding не даёт fallback к ordinary manager; сохранять private forbidden/error semantics. Owner effective catalog, raw grants/overrides, AP-10 и существующий elevated-key Owner guard не переделывать.

Сделать правило расширяемым **в одном application policy seam**, а не записывать «навсегда только Owner» в schema/trigger/новую системную роль. Существующий `access.authorization.manage` и ordinary stored configuration не удалять и не переопределять seed-данными. Будущий deputy design сможет расширить policy явным решением; сейчас никакой dormant delegation branch нет.

S1 меняет mutations, а не автоматически все прежние reads: сохранить действующие capability-scoped authorization reads. Non-Owner разрешённый read — readonly presentation без creation/grant/assignment/override/delete forms; targeted Users read не превращать в общий каталог. Отдельный `canMutateAuthorization` не смешивать со старым read/navigation bit. Owner видит обычные controls. Backend остаётся authoritative.

**Acceptance:** native PG/direct HTTP проверяют Owner success и non-Owner403/no state/no History для каждого intent, включая forged direct POST/inline Users и elevated indirect delete; next request и History rollback. Сохранить shared mutex и fresh checks, без manager-count veto.

**Обязательная адаптация прежних fixtures:** сейчас многие authorization/History tests используют ordinary manager или repository без binding. Не добавлять compatibility bypass для них. Положительные producers должны явно использовать synthetic bound Owner; non-Owner negative cases оставить реальными. Старый ordinary self-revoke success после S1 закономерно403; Owner может сохранить self-deny, но остаётся effective Owner. Fresh grant/revoke regression проверять на отдельном non-Owner recipient, изменяемом Owner. Не возвращать last-manager правило и не удалять History/freshness assertions ради green tests.

**Browser done:** canonical Owner Roles + Users inline mutations, readonly non-Owner, stored self-deny Owner, fresh recipient revocation, private/no-store и History. После этого пакет можно independently review/merge, даже без остальных Settings страниц.

### SET-02 — Settings navigation + Forum & roles + per-method registration

**Зависимость:** SET-01. Первый полезный Settings surface: переиспользованный Owner role constructor и два registration switches.

**UI/routes:** добавить общий Settings shell/paths/guards и Forum & roles page. Вынести переиспользуемое содержимое authorization view из жёсткого shell wrapper, не копировать шесть writers. Новая страница использует прежний canonical authorization handler/inline fetcher protocol и feedback. Старый Owner GET `/admin/authorization` может вести на новую Owner-страницу; прежний разрешённый non-Owner readonly read остаётся совместимым. Legacy POST/inline Users URL продолжает проверять ту же SET-01 policy. Никакого второго mutation implementation.

**Persistence:** одна типизированная singleton relation, например `forum_registration_settings`:
`id=1`, `google_registration_enabled`, `email_registration_enabled` (оба true для сохранения baseline), version для CAS, updated_at. Два флага — вся policy; отдельного master switch не нужно. Оба false допустимы. Не делать Owner/bootstrap exception, требование оставить один способ регистрации или автоматическое изменение auth credentials.

Нужна **одна forward migration** (на нынешнем baseline следующая0060; номер сверить с main перед реализацией), Drizzle snapshot/journal/manifest и точные web runtime SELECT/UPDATE privileges; initial singleton row создаёт migration, runtime не лечит отсутствие строки fallback defaults. Owner update: fresh session/binding → singleton row lock → expectedVersion/diff → update → commit. Stale409; no-op не увеличивает version. Для значимого global policy change предлагается один минимальный ordinary Admin History producer `settings.registrationChanged` (targetType=`forum-settings`, targetId=`registration`) с before/after двух booleans и version: он использует текущий final append/order lock и атомарный rollback, не создаёт новый audit subsystem. В том же пакете расширить action/target CHECK и typed History renderer; без session/email/provider secrets в context. Это часть предлагаемого технического решения для coordinator review.

**Authoritative registration admission — проверенный штатный Better Auth seam:**
- `app/auth/auth.server.ts` может использовать поддерживаемый в установленной1.7.7 `user.validateUserInfo({user,source},ctx)`;
- policy читается из PG **при `source.action === "create-user"`** непосредственно перед admission нового пользователя;
- `source.method === "email-password"` проверяет email flag;
- `source.method === "oauth"` + `source.oauth.providerId === "google"` проверяет Google flag;
- возвращаемые `sign-in` и `link-account` проходят без registration veto. Использовать trusted Better Auth lifecycle/source, не угадывать метод по email, submit button или client-supplied query flag;
- сохранить текущий name-validation hook и `x-vico-link-user` protection, email/provider verification и Origin checks;
- не ставить `emailAndPassword.enabled=false`, не отключать Google provider и не блокировать целиком `sign-in/social`/callback;
- не кешировать policy между requests и не фиксировать её в OAuth state на старте redirect. OAuth, начатый до закрытия, но дошедший до create-user после него, проверяет актуальную policy;
- admission point — свежая policy check перед create-user; уже допущенная операция может завершиться, последующее закрытие не удаляет созданные accounts/sessions. Не вводить глобальную auth serialization ради wall-clock commit ordering.

Closed policy возвращает безопасный method-specific code, UI показывает понятный отказ; OAuth использует безопасный localized error return URL, а не сырой provider/internal error. Невозможность прочитать policy не означает «регистрация открыта»: typed unavailable/fail-closed; существующий sign-in/link не отклоняется просто из-за закрытого flag. Public sign-up UI читает только две booleans, hides/disables недоступную регистрацию, но sign-in остаётся доступным; server gate работает и при direct API вызове.

**Acceptance:** четыре комбинации booleans; existing email sign-in и existing Google sign-in при закрытии; link existing account; forced body/provider-field spoof; OAuth begun-open/callback-closed; no new user/account/session при policy denial; storage failure не fail-open; Owner-only CAS/no-op/History rollback.

Email — настоящий built Worker/Better Auth/PG browser. Google — существующие native auth harnesses `tests/database/auth-runtime.test.ts` и `auth-link-identity.test.ts`: real Better Auth OAuth state/callback с synthetic token/profile provider seam. Не требовать реальных Google credentials/Stage6 и не отключать verification checks. UI browser проверяет switches, registration feedback, сохранённый sign-in path и навигацию. Live Google acceptance не заявляется.

### SET-03 — User preferences: theme, locale, existing Editor preferences

**Зависимость:** SET-02 shell. **Новой schema/migration не требуется.**

- **Theme:** переиспользовать `app/theme.ts` + `ThemeToggle` в `app/forum/ui.tsx`, прежний `vico-theme` browser-wide key. System = отсутствие override; Light/Dark = существующие значения. Общий read/write/subscribe helper синхронизирует Settings, header toggle, OS changes и другие tabs; не переносить theme в DB/account key. Сохранить bootstrap до hydration и рабочий fallback при недоступном localStorage.
- **Locale:** сохранить `user.locale` как единственный account source; новое own action/capability обновляет только текущего пользователя, после проверки canonical active locale в текущем Runtime LocaleRegistry. Не hard-code список EN/RU/HE и не превращать arbitrary BCP-47 string в опубликованный locale. При недоступном registry не сохранять деградированный fallback как выбор пользователя. `betterAuthUserAdditionalFields.locale.input=false` остаётся; не открывать generic update-user для server-owned metadata. После сохранения безопасный redirect/revalidation на выбранный locale; explicit URL остаётся authoritative, locale negotiation использует fresh account preference.
- **Editor:** сохранить `vico:editor:mode:<userId>`, spellcheck, code-wrap, code-lines contracts из `markdown-editor.tsx`/`markdown.tsx`. Маленький общий typed local preference adapter + same-tab event/storage subscription вместо второй копии settings store. Settings влияет на настоящие mounted/new Editor/code consumers; смена account не наследует чужие настройки. Менять preference без потери текста/selection/history/attachments и без повторного POST.
- Reply/mention, time zone, translation/original preference, drafts/autosave и accessibility feature package не добавляются.

**Acceptance:** unit storage validation/private mode/system theme/account switch; route/native own-locale save/forged target/invalid-inactive locale/registry outage; браузер Settings ↔ header/theme/OS ↔ Editor/code consumers, reload/cross-tab, разные accounts, unknown registered locale, EN/RU/HE responsive/keyboard/RTL. Personal choices не создают Admin History и не дают capability.

### SET-04 — Administrator preferences: реальные workspace consumers

**Зависимость:** SET-02. Только local per authenticated account/device, без DB/migration.

Один небольшой versioned local record с allowlisted enums: default/last admin destination; default/last Attention mode/group; comfortable/compact density; default secondary technical-detail expansion. Не хранить raw URLs, search strings, user/topic/case IDs, фильтры приватных ресурсов или authority. Invalid/старые значения сбрасываются к безопасным defaults; storage failure не блокирует workspace.

Выбор defaults/last влияет на **entry links** Admin/Attention; explicit destination/query и deep links сохраняются. Сохранять только идентификатор успешно открытого workspace index/mode/group, не путь к частному объекту. Перед навигацией пересекать preference с актуальными доступными destinations/modes из effective authorization; revoked/missing destination → текущий доступный default, без redirect loops и обхода server gate. Прямой `/admin` остаётся явным Overview; localStorage не используется как серверная authority.

Density применить к настоящему AdminShell/Attention presentation без изменения queue order, page-size policy и доступности controls. Secondary-detail preference имеет конкретный consumer: disclosure служебных IDs/slug/version в существующих role/user/detail views; причины/решения/errors и mutation controls не прятать как «технические детали». Нельзя публиковать переключатель без действующего consumer или переделывать все moderation views ради него.

**Acceptance:** corrupted storage, account isolation, next-request grants/revoke/fallback, explicit URL precedence, default/last navigation, active admin/Attention-only actor, layout/keyboard/tap-targets и manual disclosure override. Ни personal prefs, ни плотность не меняют server authorization/domain semantics.

### SET-05 — Account & security через Better Auth

**Зависимость:** SET-02 shell. Существующие account/session tables и web grants; **новой auth schema/migration/provider не нужно**.

Расширить request-local `AuthRuntime` узкими self-service operations/DTO, переиспользуя `createHyperdriveAuthRuntime/useAuth` и поддерживаемые Better Auth API:
- linked methods / `listUserAccounts`: вывести безопасную allowlist provider labels и `hasPassword`, без access/refresh/ID tokens, scopes/private provider payload или password hash;
- current-password change через `changePassword` только при настоящем credential password. Не делать set-password для Google-only, reset/recovery/email change/unlink/delete;
- existing `linkGoogleAccount` переносится/переиспользуется на Account surface с прежним exact-user expectation и protected `link-social`; в Profile — ссылка на Account, а не второй независимый flow;
- list active sessions; revoke **одну другую** или **все остальные** через `listSessions/revokeSession/revokeOtherSessions`, без multi-session plugin/device fingerprint service;
- current session явно отмечена; «одну другую» не превращать в accidental self-sign-out. Password change и отдельный «sign out other sessions» остаются разными операциями; не обещать атомарность их комбинации, которой не гарантирует текущая установленная реализация.

Better Auth list/revoke использует session tokens: **оставить их server-side**. BFF loader выдаёт session ID, created/expires/current marker и безопасный plain-text device/agent label; action принимает session ID, заново сопоставляет его только с собственными активными sessions и передаёт token Better Auth внутри сервера. Не сериализовать bearer tokens ни в loader JSON/hidden fields, ни в логи/screenshots/URLs. Чужая/истёкшая session не даёт удалять чужой доступ.

Передать response Set-Cookie/headers от Better Auth до браузера, сохранив текущий cookie ordering относительно pre-routing session resolution. После revoke следующий запрос отозванной session действительно unauthenticated; current session сохраняется для «others». Сохранить библиотечные session freshness/authoritative-store checks. В установленной1.7.7 `listSessions` требует fresh session: при `SESSION_NOT_FRESH` показать явный путь через существующий sign-out → sign-in с безопасным returnTo; не отключать freshAge и не строить новый reauthentication protocol. Не редиректить authenticated sign-in обратно в бесконечный цикл.

**Acceptance:** real Better Auth/PG два собственных browser contexts + чужой account; credential vs Google-only metadata, wrong/correct current password, old/new password login, revoke one/all others с реальными cookies/next-request denial, expired/not-fresh session, same-origin/stale-account и client subject forgery. Safe DTO не содержит secrets; Set-Cookie не теряется. Google linking regression — существующий synthetic provider harness; live OAuth не gate этого local package.

### SET-06 — Privacy: публичная online visibility

**Зависимость:** SET-02 shell. Один небольшой application-owned record, например `user_privacy_preferences(user_id PK/FK ON DELETE CASCADE, show_online boolean, updated_at)`. Отсутствующая запись = **true**; upsert own preference. Не заводить nullable third state или общий privacy JSON bag.

Нужна отдельная следующая forward migration, schema/snapshot/manifest/runtime SELECT+INSERT+UPDATE privileges для preference relation. При off удалить собственную старую presence row; для этого добавить только нужный DELETE на `forum_online_presence` и обновить privilege probes. Нельзя полагаться на cleanup row как на единственную защиту.

Изменить **authoritative `readOnlinePresence()`**: LEFT JOIN/COALESCE privacy и predicate до window count/order/LIMIT12. Скрытый user исключён и из `members`, и из `count`, в том числе guest requests и users вне первых12. Это критично для отсутствия count leak.

`recordOnlinePresence()` проверяет видимость в DB (предпочтительно conditional insert/upsert); hidden heartbeat не публикует presence и не может обойти off прямым POST. Off update + удаление старой presence row — одна transaction; reader всё равно фильтрует для concurrent heartbeat. При on действует обычное five-minute recent-activity правило; сам preference update не пишет lastSeenAt=now и не делает offline user online искусственно.

Server owns preference; `expectedUserId` остаётся stale expectation. Client может остановить heartbeats после opt-out, но SQL guards обязательны. Следующий public read после сохранения off исключает пользователя; уже полученный чужим браузером HTML не требует push-отзыва. Проверить SSR/data/cache headers: presence-bearing response не должен раздаваться как shared stale snapshot после opt-out; использовать действующий no-store boundary либо локально закрепить его на home/presence path, без новой cache subsystem.

**Acceptance:** default-on для существующих/новых, off/on и fresh guest count/list, >12 users, hidden user вне LIMIT, concurrent heartbeat/off, direct forged heartbeat, cross-account rejection, expired5-minute window, DB outage no false public inclusion, user preference не меняет публичность posts/profile. Real browser user Settings → guest home/refresh → own heartbeat с DB проверкой.

### 3. Проверки, миграции, закрытие пакетов

- На каждом новом stable head: применимые lint/typecheck/unit/routes/build, native PG для изменённых persisted/auth boundaries, metadata/schema/manifest/runtime-privilege checks для новых migrations. Accepted0000–0059 не переписываются; новые номера берутся от actual main.
- Реальный built Worker → Better Auth → disposable PG → Chromium на затронутых flows; EN/RU/HE + mobile/tablet/desktop, keyboard/RTL и private/no-store. Existing History/AP-10/AP-11 harness не переписывать в mock acceptance; адаптировать synthetic Owner fixtures к SET-01.
- Reuse existing auth-runtime/auth-link-identity provider seams для нового Google-registration gate. Не требовать Google/Cloudflare/DB production rollout, real secrets или реальных accounts владельца.
- Не создавать новые GH Actions frameworks только ради decomposition; расширять применимые существующие CI/browser harnesses с isolated DB/fixtures.
- Отдельный factual docs closeout каждого пакета: сначала auth/admin contract для S1; с SET-02 небольшой `docs/SETTINGS.md` для пяти routes/persistence/authority, затем его актуализация по фактически merged surfaces, плюс PROJECT_STATE/профильные docs/history. Не объявлять все Settings delivered после первого пакета.
- Coordinator-first whole-PR review → independent technical review того же head → owner merge → factual docs closeout. Context/готовый stable PR передавать через #251 с фактическим CI status; не задерживать handoff только из-за ожидания CI.

### 4. Официальные API и граница выполненного

Сверены текущие официальные Better Auth docs и реальный установленный код/типы **1.7.7**:
- https://www.better-auth.com/docs/concepts/users-accounts#callbacks — `validateUserInfo`, lifecycle action/method/OAuth provider context;
- https://www.better-auth.com/docs/concepts/users-accounts#change-password;
- https://www.better-auth.com/docs/concepts/session-management — list/revoke и session freshness;
- https://www.better-auth.com/docs/concepts/hooks.

Локально проверены call chains `createUser`/OAuth source, session/account/password endpoints, current auth runtime, theme/Editor keys, locale input:false/negotiation, Admin/Attention navigation, presence SQL и runtime privileges. Это source-level planning, не выполненные acceptance tests или CI.

Вне scope: notification policy, timezone/reading-translation preferences, Watch/Subscribe/bookmarks/mute/block, Profile fields, title editing, forum structural CRUD, cooldown/attachment-size/language-publication/emergency switches, provider secrets/infra, Owner binding/transfer/second Owner/first-manager recovery, deputies, account deletion/export/email change/unlink/password recovery/passkeys/2FA, Stage6.

**Мира:** проверить план и последовательность SET-01–06; при approval синхронизировать master plan и назначить только ближайший bounded пакет. Лёва планирование завершает и останавливается. Исполнитель и implementation PR пока не назначены; Марк не назначен.

## Закрытый предыдущий контекст

Owner/authorization redesign закрыт. [Independent PASS PR #296 #6704068605](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6704068605) относится к `824ab8eccb091664c2e7d37f81f2737e7fd43e87`; собственное evidence: `/workspace/work/owner-stage2-review-evidence/`. Этот PASS не является acceptance будущего Settings. Единственный Owner — разработчик, Google→server-bound user ID; второго Owner/передачи/first-manager bootstrap нет. Settings S1 — новая согласованная текущая Owner-only mutation policy, не попытка восстановить last-manager veto.

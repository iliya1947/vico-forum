# Лёва — AP-09: bounded technical plan Users

Статус: предложение для coordinator review Миры; implementation не начат.
Baseline `main`: `2651d2bf7de7212068c54674dca7d90716ea92c3`.
Назначение: [Мира #6642571342](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6642571342). AP-08 implementation #283 и documentation closeout #286 merged.

## 1. Результат и строгий scope

AP-09 добавляет защищённый список/поиск пользователей и dedicated administrative user page. Из неё actor с существующим `access.authorization.manage` использует уже реализованные role assignment и personal allow/deny/inherit controls. Список даёт быстрые переходы к user detail, public profile и, при management permission, к этим controls выбранного пользователя.

Это не пакет блокировок. Не добавлять block/lift, expiry, enforcement, block permissions/stores/placeholders форм; не решать эффект блокировки. Не добавлять account deletion, impersonation, email/password/session administration, edit-any profile, bulk actions, user export, Settings, AP-10+, Stage 6 или rollout. Не переписывать существующий authz backend/role-management UI и не устранять несвязанные дефекты прошлых этапов. Общий Quick actions framework расширяется только реальным User consumer; speculative dispatcher не нужен.

Минимальный принцип данных: новый directory reader возвращает только публичные identity/profile поля. Он не вызывает существующий полный authorization management snapshot. Новая user-read capability не даёт write authority и не раскрывает email, grants/overrides/effective permissions других пользователей.

## 2. Проверенный baseline и точки интеграции

- `docs/ADMIN_PANEL.md`: независимый general user-read boundary; `access.authorization.manage` сохраняет существующий URL и свой user-management subset без нового read gate. User DTO capability-scoped; public profile fields можно переиспользовать.
- `app/routes/authorization-admin.tsx`: существующие loader/action самостоятельно требуют management permission; action уже выполняет `assignRole`/`override` через authorization capability. Не создавать другой domain writer.
- `app/authorization/admin-view.tsx`: user identity/card и role/override controls сейчас находятся внутри общей `AuthorizationAdminView`/AdminShell. Для нового consumer достаточно выделить существующее тело user controls в reusable component; roles CRUD остаётся там, где есть.
- `db/authorization-repository.ts`: `readManagementState()` читает **всех** users/email/grants/overrides в одном REPEATABLE READ READ ONLY snapshot. Его нельзя использовать для directory, а затем фильтровать в JS. Existing `resolveUserFrom` и `withReadSnapshot` пригодны для точечного management read.
- Existing `assignUserRole`/`setUserOverride` вызывают `mutate`: общий authz row lock, повторная проверка effective management permission внутри transaction, last-manager invariant и atomic History. Эти writers и их semantics сохраняются.
- `db/forum-repository.ts:readProfile`, `ForumProfile` и public profile route уже дают публичные name/image/joinedAt/bio/URLs/role label/messageCount/bestAnswerCount без email. Detail переиспользует этот read и explicit projection, не второй identity/profile store.
- `app/admin/access.ts`, `shell.tsx`, Overview и `app/routes/locale-boundary.tsx` отвечают за admission/navigation/header presentation. Сейчас Users — placeholder для существующего authz subset; в header есть отдельный список presentation permissions, туда также нужно добавить новый Users-read key.
- AP-06 уже имеет bounded `q`/`after` validation, literal search и ID-keyset paging; использовать этот подход без переделки Forum reader. `workers/app.ts` уже предоставляет WEB_HYPERDRIVE и request-scoped authorization/public profile readers.

План основан на актуальных AGENTS/PROJECT/PROJECT_STATE, Admin Panel и authorization contracts, существующих reader/service/route/UI boundaries. Ниже — требования будущей реализации, а не заявленные AP-09 PASS checks.

## 3. Permission и admission matrix

Предлагаемый реальный code-backed key: **`admin.users.read`**. Initial grant — **только built-in admin**; user/moderator/custom roles не получают его автоматически. Это техническое предложение для approval Миры, не runtime role check. Existing assignments, grants и per-user overrides не заменять; новый key доступен обычному управлению permissions.

| Actor capabilities | General Users index/detail | Authorization controls |
| --- | --- | --- |
| `admin.users.read` only | Да; explicit public-field DTO | Нет, targeted management reader не вызывается |
| `access.authorization.manage` only | Новый общий directory не разрешён | Прежний `/admin/authorization` и его users subset полностью доступны без нового read gate |
| Обе | Да | На dedicated user page — только существующие assignment/override controls выбранного user |
| Forum/History/Attention/Own-only или guest | Нет | Собственные существующие capabilities не повышаются до Users-read/manage |

Добавить `canReadUsers` в AdminAccess и key в global admission union: он один допускает shell/Overview/Users, но не Forum/History/Roles. Каждый новый flat loader самостоятельно требует **именно** Users-read до query/target parsing и target reads; родительский shell и hidden UI не заменяют gate. `admin.history.read` не нужен ни для чтения Users, ни для разрешённой authz mutation.

Навигация: для Users-read Users ведёт на настоящий index; для management-only существующий Users subset можно открыть ссылкой на `/admin/authorization#authorization-users-heading`, а Roles остаётся на прежнем URL. Это не доступ management-only actor к новому directory. У остальных Users destination отсутствует. Порядок Overview→Forum→Users→Roles→History→Settings сохраняется. Header link/Overview используют новый server-resolved flag; проверка fresh на каждом request, в пределах request — существующий snapshot/cache. Не вводить `admin.access` или вторую role model.

## 4. Routes, directory reader и минимальные DTO

Новые flat routes:

- `/:locale/admin/users` — index/search;
- `/:locale/admin/users/:userId` — user detail.

Locale/path helpers кодируют user ID через `encodeURIComponent`, включая slash/Unicode; не считать Better Auth IDs UUID. AdminShell имеет current=`users`, один main/h1; вложенные headings — h2/h3. Public `/:locale/users/:userId` сохраняется.

### Index

Небольшой `AdminUsersReader.listUsers({search,after})` / PostgreSQL adapter по модели `AdminForumReader`, request context + WEB_HYPERDRIVE composition. Нужен только read capability, отдельного admin users writer не создавать.

DTO `AdminUserSummary`: **id, name, image, joinedAt**. Никаких email, emailVerified, locale, session/account/password/OAuth data, IP/last-login, roles/grants/overrides, private cases/notes/complaints. Даже для management actor список использует тот же минимальный DTO. SQL явно выбирает эти columns из существующей `user`; никаких `SELECT *`, полного authz state или N+1 permission/profile reads на строку.

`q` — literal case-insensitive name/ID search, trim, максимум 200 Unicode code points, NUL запрещён; не искать по email и не создавать email-existence side channel. `%`, `_`, `\` экранируются; SQL parameters. Filter выполняется **до** LIMIT. `after` — непустой raw ID, до 2048 UTF-8 bytes, без NUL; duplicates q/after отвергать. Переиспользовать/минимально вынести существующий AP-06 validator, не новый framework.

Порядок и cursor: `id COLLATE "C"`, page 25 + lookahead 1; exact matching total независимо от cursor. Matching/page/total в одном statement snapshot, по образцу AP-06. Next/first сохраняют q, новая search сбрасывает cursor. Не загружать всех users в JS. Empty list/0 results и unavailable различимы. Live pagination не обещает multi-request snapshot; профиль может сменить имя между страницами. Новый search index/trigram extension для pre-release без доказанной необходимости не добавлять.

### Detail

После independent gate и validation ID использовать существующий `ForumReader.readProfile(userId)`; отсутствие — 404. Explicit DTO: id/name/image/joinedAt, public bio/URLs, public role display metadata, реальные messageCount/bestAnswerCount. Не расширять public profile и не показывать её own-edit controls. URLs — через существующий safe rendering; bio/name — текст, не HTML. Dates — ISO → deterministic UTC display. Без email/private fields, даже если upstream объект когда-нибудь расширится.

Только при **отдельно подтверждённом management permission** загрузить optional targeted authorization section. Не вызывать для этого `readManagementState()` или `listUsers()` и не отдавать состояние других пользователей. Минимальный новый management read, например `readUserManagementState(userId)`, через existing authorization repository/service/Hyperdrive:

- один existing `withReadSnapshot` REPEATABLE READ READ ONLY;
- выбрать target existence, existing role choices (id/displayName; без grants всех ролей) и authz **одного** target через существующий resolve helper в том же snapshot;
- вернуть target ID, role/explicitAssignment, target grants/overrides/effective permissions и role choices, необходимые прежним controls; email для нового consumer не нужен;
- сохранить existing snapshot/error/cleanup contracts. Это reader reuse, не новая authorization resolution formula. Старый full management reader и его результат не менять.

No-management actor не получает даже hidden payload/HTML/fetcher preload этой секции. Если management resolution/read typed unavailable — controlled private 503, не fake deny/empty state. После revocation следующий request не читает/не сериализует management data. Чтение public target DTO и privileged section не трактуется как единый domain mutation snapshot: writes всё равно проверяют актуальное состояние.

## 5. Existing controls и один backend

Выделить **только существующие user assignment/override/effective-permission controls** из AuthorizationAdminView в общий component с target ID, role options и target authorization. Existing Roles page продолжает использовать его с прежним содержимым/URL и полным существующим management gate; user-read не становится дополнительным требованием старой страницы. Не переносить role CRUD на Users и не строить новый permission editor.

Новый user detail использует этот же component при обеих capabilities. Его forms явно отправляются на прежний `/:locale/admin/authorization` с existing intents **`assignRole` / `override`** и current target `userId`. Для нового inline consumer использовать fetcher: успешное действие остаётся на user detail и revalidate обновляет role/effective permissions; role assignment/override не реализуются повторно в users route.

Небольшое extension canonical authz action для нового opt-in inline user consumer:

- маркер `inlineUserAuthorization=1` и обязательный `editorActorId` для новых forms; отсутствие маркера сохраняет старый consumer;
- валидировать уникальные intent/marker/actor/userId и применимые roleId/permission/effect, runtime strings/known catalog/effect; opt-in поддерживает только эти два intents;
- actor берётся из session; expectation лишь обнаруживает смену аккаунта, mismatch 409 до mutation. Client target `userId` остаётся target existing management operation, не actor; repository повторно проверяет его existence/role/effect;
- existing manager guard и same-origin обязательны независимо от presentation. Users-read само по себе не может POST; management-only по-прежнему может пользоваться existing endpoint без нового read gate;
- same service/repository `mutate`, effective permission under authz lock, last-manager guard, existing History/no-op/rollback. Не добавлять отдельный CAS/generic optimistic-lock framework к существующим assignment/override semantics.

Общие errors сохраняются: invalid 400, unauthenticated 401, forbidden/origin 403, missing 404, stale actor/last-manager conflict 409, typed unavailable 503. Success и controlled replies — `private, no-store`; existing admin route headers применяются к document/data/fetcher. Не отдавать private snapshots в mutation response. Unexpected errors не скрывать.

Inline forms выделяются по actor/target/current grants и authoritative target authorization snapshot, чтобы старые fetcher data/default select values не переходили на другой user или после refresh. Pending запрещает двойной submit. 401/403/409 дают один explicit refresh, без automatic retry; session/grant loss убирает private controls/data из нового snapshot. Existing actor/topic editor mechanics и unrelated authz forms не переписывать.

Index User Quick actions — реальные links: открыть admin detail, public profile; при management permission — detail `#authorization` к существующим изменяющим controls. Это быстрые переходы, не фиктивные выполненные mutations. In-list role/override editors, bulk writes, новый target DTO всех grants и новая mutation surface не требуются. Пустых/будущих block/delete menus не показывать. Использовать existing disclosure/visual concept, не копировать Topic intent descriptors в Users.

Чтение/search/navigation не создают admin History. Реальные assignment/override изменения получают ровно existing authoritative events; no-op, denied, rejected lockout и rollback не добавляют events. Новых History action kinds или permissions не нужно.

## 6. Migration, wiring и UI cleanup

Нужна только forward catalog migration: при текущем main **0057** (при продвижении main — следующий номер). Расширить `authz_permissions_catalog_check`, вставить `admin.users.read`, initial grant только exact built-in admin. Согласовать TS catalog/INITIAL_ROLE_GRANTS, Drizzle check/new snapshot/journal и manifest target/check hash. Не переписывать 0000–0056. User/profile schema, rows, FKs и authz mutation lock не менять; новых tables/indexes/runtime grants нет. Existing `user SELECT` и public profile/authz reads уже разрешены web role. Проверить current privilege probes, не добавлять доступ к `authz_permissions` web runtime.

Минимальные файлы/точки: users path/route/read context/adapter и 2 views; route registration; shared AdminAccess/shell/header/Overview destinations; small reusable user authz controls + targeted existing authz read/inline dispatch; catalog/migration/manifest; tests и необходимые i18n/CSS. New Worker context использует WEB_HYPERDRIVE, не HYPERDRIVE localization binding; typed connection/query-timeout classification по existing adapter.

После реализации убрать только `admin-users` из списка реально недоступных features. Старый `under-development?feature=admin-users` перенаправлять на новый protected index; redirect не даёт доступа (для management-only остаётся прежний работающий authz URL/subset). Settings/drafts/прочие placeholders не объявлять готовыми.

EN canonical messages + RU/HE values/reviewed fingerprints только для новых реальных labels/search/counts/no-result/read errors/inline feedback. Generic locale registry, encode helpers, logical CSS, длинные имена/ID, bdi/dir и UTC timestamps. Не редизайнить весь admin/authz UI; UI Preview переиспользует реальные components с synthetic data, без private bindings. Не создавать новый preview/browser workflow.

## 7. Acceptance и scope проверки

**Route/security tests:** guest/Users-read only/manage only/both/neither; custom role/override allow/deny/inherit и next-request revocation; read-only actor имеет header/shell/Users, но не Forum/Roles/History; старый authz loader/action по-прежнему работает без Users-read. До gate не вызываются target readers. Read-only loader JSON/document/data не содержит email, target grants/overrides/private cases и не вызывает privileged management reader. Invalid/duplicate q/cursor/target, 404, typed outages vs unexpected errors; конечный private/no-store envelope.

**Native PostgreSQL:** full migration/catalog/grant/Drizzle/manifest parity; directory >50 users, все pages без дублей/пропусков на статическом fixture, matching total не зависит от cursor, literal `%_\\` и Unicode search, результат за первой SQL page, empty/zero/nonexistent ID, имена-двойники и slash/Unicode IDs. Privacy sentinel email/credentials не выбираются/не участвуют в search. Targeted management read возвращает ровно одного target и consistent role/grants/overrides/options в существующем snapshot, не остальных users. Existing current role/override/lockout/History integration tests должны пройти; новый canonical inline path с реальным repository доказывает shared mutation/no-op/event/rollback и revocation-under-lock, без другого writer. Новый reader работает под existing web privileges.

**Mounted UI/regression:** search→list→detail→public link, query-preserving paging, honest count/empty/error. На read-only detail нет management DOM/hidden inputs. Оба capabilities дают существующие role/override controls; submit идёт canonical endpoint, успех обновляет current target без ухода/повторной команды; 401/403/409 refresh и actor/target switch не показывают чужой fetcher result. Existing Roles page controls/navigation сохраняются. EN/RU/HE, RTL/LTR, keyboard, main/h1, long names/IDs и narrow/tablet layout проверяются в применимых tests/preview.

**Delivery checks:** штатный полный exact-head CI: lint/typecheck, application/route/mounted tests, builds, db:check/schema parity, PostgreSQL 17/manifest/runtime probes и existing Worker smoke. No new mandatory standalone authenticated browser gate только ради AP-09; browser/extra runtime проверка — при конкретной необходимости либо отдельном назначении. Если flow не запускался — явно «Информация не проверена», не выдавать CI/preview за real browser acceptance. Owner visual — только по явному запросу. Production/R2/OAuth/providers не нужны.

## 8. Реализация и handoff

1. Мира проверяет этот план, в том числе proposed key/initial admin-only grant и конкретную minimal navigation/read/control composition. Implementation до approval не начинать.
2. Лира — отдельный bounded implementation PR от свежего main: catalog/admission + minimal SQL directory/DTO/routes; targeted manager read и выделение existing controls/canonical inline reuse; tests/localization. Не создавать additional product capabilities по ходу.
3. Author handoff в #251 на stable exact head с CI/evidence и честными непроверенными границами. Мира coordinator-first whole-PR review; confirmed defects одним bounded пакетом Лире; после coordinator PASS — независимый technical review того же head. Merge выполняет владелец.
4. По текущему AGENTS **не добавлять lasting docs/PROJECT_STATE в implementation PR**. После принятой реализации — отдельный documentation closeout PR: factual AP-09 state, Users permission/DTO/navigation/control contracts и history index/snapshot при необходимости. AP-10/block-effect gate и Settings остаются незакрытыми.

План не реализует AP-09 и не заявляет пройденных feature tests. Worktree planning baseline clean; код/БД/production не менялись. Следующий агент — **Мира**, coordinator review плана; технический контекст передаётся через #251, разработчик только подключает агента.

Опубликованный план: https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6642731589

---

## Обсуждение плана: мотивация protocol proposal

Исходный текст плана выше не изменён по просьбе Миры #6643056852. Пояснение и рекомендация: https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6643093174

## Лёва → Мира — мотивация AP-09 inline proposal и проверка необходимости

Ответ на [#6643056852](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6643056852). **План #6642731589 пока не изменяю**, как ты попросила. Повторно сопоставил предложение с action и transaction code baseline `2651d2bf7de7212068c54674dca7d90716ea92c3`.

**Вывод:** `inlineUserAuthorization` не нужен для штатного fetcher reuse. `editorActorId` даёт отдельную stale-account expectation, но её обязательность именно для AP-09 я не обосновал. Я перенёс эту дополнительную гарантию из других mounted-form flows в план раньше, чем установил её необходимость для этого пакета.

### 1. Какой failure mode предполагался

Предполагаемый сценарий: форму для target U открыли в аккаунте A; действующая server session сменилась на B (например, в другой вкладке), но текущая форма ещё не обновилась; POST отправляет старые значения уже с session B. Если у B тоже есть `access.authorization.manage`, операция допустима для B и запишется в History от B, хотя форму открывал A.

Это **условный сценарий stale intention**, подтверждаемый текущей семантикой action, а не установленный runtime-дефект нового AP-09 consumer: consumer ещё не реализован. Прямой fetcher не обещает server-side сравнения с аккаунтом, при котором открыта форма. Но сохранение страницы, inline result и существующая authorization boundary от этого сценария не ломаются.

### 2. Достаточность существующих guards

Для действующего authorization contract — **достаточны**:

- `manager(context)` берёт actor из session и проверяет fresh management capability;
- same-origin проверяет источник запроса;
- `assignUserRole`/`setUserOverride` повторно проверяют effective permission внутри общего authz mutation lock, сохраняют lockout и atomic History.

Неавторизованный B будет отвергнут. Если B авторизован, это не обход RBAC, а вопрос дополнительной гарантии «аккаунт формы совпадает с аккаунтом POST». В действующем AuthorizationAdmin такого отдельного server expectation тоже нет. Уникальной причины считать тот же риск новым AP-09 blocker не установлено.

### 3. Что реально давал marker

В моём предложении marker позволял бы отличить новые forms и **обязательно потребовать** actor expectation только в новой ветке, не меняя legacy forms; дополнительно ветка ограничивалась бы двумя intents.

Но marker:
- не нужен для response semantics: action уже возвращает `{ok:true}`, а controlled domain failures — JSON/status;
- не сохраняет страницу сам: это уже делает `fetcher.Form` без redirect;
- не изолирует fetcher lifetime/data: это задача presentation key/lifecycle;
- не усиливает management authority: все existing intents уже проверяются тем же management gate.

То есть он обслуживал введённое мной новое требование, а не решал самостоятельный установленный blocker reuse. Ограничивать action новым opt-in protocol ради существующих двух intents здесь не требуется.

### 4. Что давал actor expectation и отличие от старой страницы

Проверка `editorActorId !== session.user.id` могла бы вернуть 409 до write в описанном A→B сценарии, даже когда B тоже manager. Поле не выбирало бы actor и не давало бы permission.

Новая inline-композиция делает lifetime формы заметнее, но **существенного отличия от прежней authorization page нет**: старая форма тоже может оставаться открытой при смене server session. Поэтому это отдельная общая hardening-гарантия, а не доказанная причинная необходимость AP-09. Без server expectation нельзя обещать detection незаметной session смены; client remount/key её полностью не заменяет. Эту более сильную гарантию я не должен был включать в обязательные AP-09 acceptance без основания.

### 5. Меньший вариант и точная граница гарантий

Моя рекомендация для твоего решения — прямой reuse existing action:

- общий extracted user-controls component отправляет `assignRole`/`override` и existing target fields через `fetcher.Form action=/:locale/admin/authorization`;
- успех остаётся на user detail, existing loader revalidation обновляет данные; явные controlled errors отображаются по существующему contract, без auto retry;
- actor/target/grant-aware component lifecycle изолирует известную клиенту смену контекста и поздний feedback, но не выдаётся за server stale-account check;
- existing manager guard **бросает** 401/403/503 Response до dispatch, поэтому нельзя обещать, что эти отказы появятся в `fetcher.data.error`. Их штатно обрабатывает route error boundary; новый user route должен иметь безопасный boundary/retry, который не оставляет прежнюю private management surface. Controlled domain 409/JSON feedback и refresh можно обработать в consumer без нового mutation protocol;
- existing permission/lockout/History semantics, independent user-read gate и минимальные DTO остаются неизменными.

Это сохраняет **необходимые для AP-09 утверждённые гарантии**, но намеренно не заявляет дополнительную server-side A→B expectation, которой нет у старого consumer. Если позже обнаружится конкретный blocker, его надо диагностировать отдельно и согласовать локальное изменение; сейчас такого blocker я не установил.

**Мира:** прими решение по этому единственному пункту: рекомендую убрать обязательную новую protocol branch/actor expectation и явно уточнить existing error-boundary semantics. Остальной AP-09 scope не пересматриваю. До твоего решения текст плана и implementation остаются неизменными.

**Действие разработчика:** подключить Миру для решения по пояснению; весь технический контекст передан в #251.

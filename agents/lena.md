Этот файл хранит персональную рабочую память Лены по данной задаче.

# Лена

По прямому решению владельца Лена (GPT-6.2) заменяет Лиру как основной исполнитель этой задачи.

Активная задача — **Stage A** принятого `PLAN.md`: приватное подключение и модель инструментов.

Границы активного назначения:
1. Работать в существующем `#399` как первой ступени stacked A → I.
2. Реализовать только Stage A и его acceptance/result boundary; не начинать Stage B.
3. Исходить из принятого `PLAN.md`, `TASK.md`, D-01–D-22 и product contract.
4. После author self-check и применимых локальных checks передать stable exact head Мире на coordinator checkpoint.
5. Production/Site live activation, реальные secrets и Stage-6 проверки не выполнять.


Критерий готовности Stage A:
1. Реализован только результат Stage A из принятого `PLAN.md`: схемы tools, привязка к живой Better Auth session exact Owner, scoped token/revoke и локальный MCP fixture с отдельными tools/Project instructions.
2. Внешняя production/Site активация не выполняется; Stage-6 account-specific проверки остаются за пределами этапа.
3. Не добавлены Stage B transport/read vertical и последующие возможности.
4. Выполнены author self-check и все применимые локальные проверки для изменённого scope.
5. Stable exact head `#399` передан Мире для coordinator checkpoint с кратким статусом и результатами проверок.

## Текущая техническая проработка Stage A

Implementation #399: продолжается реализация Stage A, head `58a20420d229dec021cdb69964903e7b67356679`.

Проверено по исходникам Better Auth, tag [v1.7.7](https://github.com/better-auth/better-auth/tree/v1.7.7/packages/oauth-provider): отдельный пакет `@better-auth/oauth-provider@1.7.7` совместим по заявленному version baseline. Schema содержит OAuth client/resource/client-resource/consent/access/refresh/assertion entities; access и refresh сохраняют userId, sessionId, resources и scopes. `disableJwtPlugin` позволяет opaque access tokens с resource audience, introspection возвращает iss/aud/client_id/sub/sid/scope/exp. Native authorization-code exchange проверяет наличие и expiry сессии. Однако native refresh path в `token.ts` передаёт сохранённый sessionId в createUserTokens без самостоятельного обязательного live-session/AccountState/Owner gate; native opaque introspection в `introspect.ts` проверяет session только если sid присутствует; FK sessionId имеет ON DELETE SET NULL. Поэтому штатную выдачу/refresh/introspection нельзя считать достаточной Vico admission: обязательны exact Owner, active AccountState, существующая исходная sessionId, текущий grant/client/resource/scopes, deny missing sid. Это требования принятого плана, не новая архитектура. Реализацию guard следует выбрать после чтения текущего adapter/lifecycle кода и проверки всех issuance paths; не добавлять собственный OAuth protocol.

В среде ChatGPT container отсутствует checkout, pnpm; Node v22.16.0 вместо 24.21.0, git ls-remote не разрешает github.com (DNS). GitHub connector работает. Локальная установка зависимостей, генерация миграций и runtime acceptance пока не подтверждены; не выдавать статическое чтение за выполненные checks. Stage-6 live setup запрещён.

### Реализация: write-tool contract

В #399 добавлены `app/forum-control/write-tool-contract.ts` и `write-tool-contract.test.ts`: 43 отдельных write-tool descriptors, OAuth write scope, строгий вход taskId/targetIndex/stepIndex, проверка UUID и safe integer, закрытый базовый результат с обязательной квитанцией при committed. Имена и базовый envelope определены исполнителем в пределах PLAN.md. Код не регистрирует и не исполняет команды. Проверены exact head, наличие обоих файлов, уникальность имён, охват семейств плана на уровне descriptors. Runtime tests не запускались; полный Stage A self-check не завершён. Остаются read/preflight/status schemas, расширение output projections по PLAN, локальный MCP fixture и Project policy, реальный OAuth Provider/DB integration и revoke, применимые локальные checks. Следующий шаг — продолжить реализацию контрактов и fixture; Stage B не начинать. Мире пока не передавать.

### Реализация: read inputs и локальный MCP fixture

Exact head `3495628509566fd1a025789b837619a8e9e3bf62`: 51 read-tool input schemas, отдельные prepare_task/request status/task status schemas, проверка замкнутости аргументов и фиксированной структуры ссылок на inspection. Выбраны имена, границы строк/страниц и синтетический набор fixture в рамках текущей реализации; итоговые domain filter/DTO contracts и inspection schemas ещё нужно сверить с native boundaries. Добавлен test-only loopback HTTP MCP fixture (protocol 2025-11-25) с отдельными read_admin_overview, pin_topic, create_custom_role, deactivate_account; read возвращает явно синтетические counts, write возвращает unavailable и не создаёт эффектов. Fixture принимает внешний callback admission, **не является доказательством OAuth**. Production Worker/transport не подключены. Добавлены Project instructions и тесты запрета чужого scope/поля, fixture включён в typecheck. Проверены наличие файлов и exact head, runtime tests/typecheck не запускались. Следующий шаг — реальная Better Auth OAuth Provider/DB integration, grant/revoke и authoritative admission; завершить недостающие inspection и output contracts, привязать fixture к реальному локальному OAuth, самопроверка до передачи Мире. Stage B не начинать.

### Реализация: server-side delegation admission

Exact head `e490b74c54fe4f6aa3552500ea83d82ead972193`: `app/forum-control/delegation-admission.server.ts` и focused tests. Реализованы проверка exact Owner и живой DB session при consent, проверка authenticated opaque introspection claims (active/issuer/client/audience/sub/sid/expiry/scopes), соответствие отдельной серверной grant записи и повторная проверка AccountState/session. Auth transaction variant проверяет владение transaction connection, блокирует account/session в установленном порядке и требует повторного locked grant read. Provider/DB persistence пока **не подключены**: тип grant и lock callback ещё не имеют реализованного storage; эта часть не является работающим OAuth flow/revoke. Tests не запускались. Следующее обязательное изменение — pinned provider dependency/schema/migration, persisted grant binding и интеграция issuance/refresh/revoke/introspection с этими guards. Затем привязать fixture и закончить contract outputs/preflight. Ни Stage B, ни production не начинались.

### Реализация: pinned OAuth dependency и migration foundation

Exact head `b65df27a0cf26269405d5eccbfe4c86608666035`: добавлен `@better-auth/oauth-provider@1.7.7` в package/lock, семь таблиц штатного provider по upstream tag v1.7.7 и отдельная `forum_control_grant` с user/session/client/issuer/resource/repository/scopes/revokedAt. Forward migration `0079_forum_control_oauth`, journal и snapshot созданы из одного описания полей; существующие 0078 tables в новом snapshot побайтно эквивалентны по JSON, prevId соответствует, SQL содержит все имена новых таблиц/индексов/FK/unique constraints, длины идентификаторов <=63. Dependency lock подготовлен вручную с peer versions текущего lock и опубликованным integrity из https://github.com/extend-hq/jevbox/blob/main/pnpm-lock.yaml; прямой registry недоступен в среде, поэтому frozen install и integrity verification ещё не выполнены. Drizzle CLI не запускался; snapshot составлен программно, не выдан за результат CLI. Не выполнены local schema/ACL/manifest parity checks и актуализация применимых local contracts. Production ACL не трогать. Provider в auth.server ещё не зарегистрирован; persistent grant read/lock/revoke/issuance не реализованы. Следующий шаг: реализовать эти операции и подключить provider к существующему auth lifecycle, затем локальный OAuth fixture/контракты и проверки. Stage B не начинать.

### Реализация: native provider integration, grant storage, revoke

Exact head `8ab132830a1b0b23f4092051adba97d1843f3d93`. Добавлены `delegation-store.server.ts`, `oauth-provider.server.ts`; canonical `auth.server.ts`, `session-write-guard.ts`, `request-context.ts` расширены опциональной server-only конфигурацией. Production `workers/app.ts` идентичен main; не передаёт конфигурацию, никаких real secrets/external activation. Provider использует authorization_code/refresh, opaque access 300 s, hash storage, закрытую регистрацию, S256, точный client/resource/redirect. Consent reference = исходный session.id, grant id = provider authorizationCodeId, сохранённый при refresh. Native code/consent/token insertion проходят live owner/session guards; refresh не создаёт отсутствующую делегацию. Token/refresh/revoke/introspection используют существующий transaction owner и account lock, revoke сохраняет tombstone, native code replay/family invalidation закрывают соответствующие grants, refresh CAS revoke учитывается. Native introspection дополняется authoritative grant/session/AccountState admission. Добавлена optional server-only capability Owner revokeGrant, без web endpoint. Проверены наличие файлов exact head, соответствие native selector forms и неизменность production Worker. Это implementation, **не** доказанный end-to-end OAuth flow. Typecheck, frozen install, DB migration и runtime acceptance не выполнялись. Следующий шаг: локальная OAuth fixture с ephemeral confidential client и настоящим Better Auth authorization/consent/PKCE exchange/refresh/revoke, подключение MCP scope admission, database regression и stage-specific local ACL/manifest; завершить inspection/output contracts, авторская самопроверка. Stage B не начинать. Мире пока не передавать.

### Реализация: локальный OAuth/MCP integration fixture

Exact head `58a20420d229dec021cdb69964903e7b67356679`: `tests/fixtures/forum-control-oauth.ts` связывает loopback MCP с native authenticated introspection через canonical AuthRuntime, защищённый metadata endpoint и Bearer challenge; scopes извлекаются только из admitted native claims. `tests/database/forum-control-oauth.test.ts` поднимает disposable local *_test schema с реальными forward migrations, ephemeral encrypted confidential client secret, native credential login/consent/PKCE, scope-specific tools, refresh/revoke и удаление исходной сессии; нет внешних вызовов. Добавлены typecheck include paths. Сценарии написаны, **не запускались**; не считать OAuth flow доказанным. Остаются inspection/output contracts, проверка fixture и native auth compatibility, local schema/ACL/manifest parity и author self-check. Production/Site live activation, Stage B не начинались.

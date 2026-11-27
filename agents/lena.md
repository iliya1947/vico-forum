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

Implementation #399: начата реализация Stage A, head `d8d319738c6ede11a6a9bdb27a7a29ebb66dd1f8`.

Проверено по исходникам Better Auth, tag [v1.7.7](https://github.com/better-auth/better-auth/tree/v1.7.7/packages/oauth-provider): отдельный пакет `@better-auth/oauth-provider@1.7.7` совместим по заявленному version baseline. Schema содержит OAuth client/resource/client-resource/consent/access/refresh/assertion entities; access и refresh сохраняют userId, sessionId, resources и scopes. `disableJwtPlugin` позволяет opaque access tokens с resource audience, introspection возвращает iss/aud/client_id/sub/sid/scope/exp. Native authorization-code exchange проверяет наличие и expiry сессии. Однако native refresh path в `token.ts` передаёт сохранённый sessionId в createUserTokens без самостоятельного обязательного live-session/AccountState/Owner gate; native opaque introspection в `introspect.ts` проверяет session только если sid присутствует; FK sessionId имеет ON DELETE SET NULL. Поэтому штатную выдачу/refresh/introspection нельзя считать достаточной Vico admission: обязательны exact Owner, active AccountState, существующая исходная sessionId, текущий grant/client/resource/scopes, deny missing sid. Это требования принятого плана, не новая архитектура. Реализацию guard следует выбрать после чтения текущего adapter/lifecycle кода и проверки всех issuance paths; не добавлять собственный OAuth protocol.

В среде ChatGPT container отсутствует checkout, pnpm; Node v22.16.0 вместо 24.21.0, git ls-remote не разрешает github.com (DNS). GitHub connector работает. Локальная установка зависимостей, генерация миграций и runtime acceptance пока не подтверждены; не выдавать статическое чтение за выполненные checks. Stage-6 live setup запрещён.

### Реализация: write-tool contract

В #399 добавлены `app/forum-control/write-tool-contract.ts` и `write-tool-contract.test.ts`: 43 отдельных write-tool descriptors, OAuth write scope, строгий вход taskId/targetIndex/stepIndex, проверка UUID и safe integer, закрытый базовый результат с обязательной квитанцией при committed. Имена и базовый envelope определены исполнителем в пределах PLAN.md. Код не регистрирует и не исполняет команды. Проверены exact head, наличие обоих файлов, уникальность имён, охват семейств плана на уровне descriptors. Runtime tests не запускались; полный Stage A self-check не завершён. Остаются read/preflight/status schemas, расширение output projections по PLAN, локальный MCP fixture и Project policy, реальный OAuth Provider/DB integration и revoke, применимые локальные checks. Следующий шаг — продолжить реализацию контрактов и fixture; Stage B не начинать. Мире пока не передавать.

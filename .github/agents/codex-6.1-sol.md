# Лёва — authentication lifecycle

## Current assignment / result

Технический план **AUTH-01 — Mail foundation** подготовлен 2026-11-10 против main `e279cb6c032a489a9044ca1191407df887c364b4`.
Это planning result, не implementation и не acceptance. Следующий шаг — Мира проверяет соответствие bounded scope и оформляет handoff Лире на отдельный implementation PR.
Утверждённый product scope: `AUTHENTICATION_IMPLEMENTATION_PLAN.md`. Stage 6 остаётся paused.

## Проверенный baseline

- `app/auth/auth.server.ts`: Better Auth и Drizzle adapter 1.7.7; `betterAuthOptions` не задаёт email callbacks; `requireEmailVerification: false`.
- `createHyperdriveAuthRuntime` создаёт request-local auth/DB capability; `workers/app.ts` собирает её из server environment. `AuthRuntime` в `app/auth/request-context.ts` обслуживает session/handler/SET-05, почтового публичного интерфейса нет.
- `db/schema.ts` уже содержит Better Auth user/account/session/verification/rateLimit. Для транспорта писем новые таблицы, migrations и grants не нужны.
- Сохраняются explicit-only linking, registration admission, trusted cf-connecting-ip, DB rate limit и SET-05.
- В installed Better Auth 1.7.7 `api/routes/password.mjs` отсутствие `sendResetPassword` останавливает request-password-reset; наличие callback допускает создание reset proof и отправку. `api/routes/email-verification.mjs` аналогично проверяет наличие verification callback. Поэтому даже «только подключить sender» к рабочему auth config — уже изменение доступных lifecycle paths.
- Прочитаны актуальные PROJECT.md, PROJECT_STATE.md, ROADMAP.md, docs/auth/AUTHORIZATION.md и docs/SETTINGS.md. Их прежнее решение об отложенных verification/recovery явно superseded утверждённым планом #320; постоянные документы обновляются по docs-closeout, не в AUTH-01.
- #315 прочитан как источник requirements: security plan/workflow на `0585f01872a139b1f7310a1761bd42a46866748c` указывает B-C1 hardening и согласованный upgrade Better Auth к проверяемой target line 1.7.19, затем B-C2 registration cutoff. Эти работы не входят в AUTH-01; до интеграции с auth повторно проверить фактический main и callback types.

## 1. Bounded результат и граница интеграции

AUTH-01 доставляет полностью проверяемую цепочку:
`server callback payload → auth message → renderer → selected mail transport → explicit result`.

Два message families: `email-verification` и `password-recovery`. Последний покрывает будущие recovery и Google-only set-password одним письмом; не вводить самостоятельный set-password protocol.

Resend и Brevo adapters реализуются как HTTP request/response mapping с обязательным injected transport и проверяются без сети. Одной декларации интерфейсов или бросающих NotImplemented adapters недостаточно. Fake — отдельный in-memory test transport.

Production `betterAuthOptions`, `createHyperdriveAuthRuntime`, Worker wiring и UI в AUTH-01 не подключают callbacks. `requireEmailVerification`, sign-up/sign-in и существующие auth policies не меняются. В AUTH-02/03 эти callbacks подключаются в рамках соответствующего lifecycle package, вместе с его HTTP/security acceptance.

Для доказательства совместимости AUTH-01 добавляет изолированный PostgreSQL/Better Auth fixture: существующий `betterAuthOptions(database, env)` расширяется callbacks **только в тесте**. Через настоящий `auth.handler` отдельно инициировать verification email и password reset и проверить fake outbox. Не выполнять в этом пакете product rollout, полный verify/reset/replay lifecycle, UI и изменение session policy.

## 2. Минимальный mail contract

Предлагаемое размещение: новый небольшой server-only каталог `app/auth/mail/`. Конкретное дробление файлов допускается по стилю репозитория без дополнительного framework.

1. `contracts.server.ts`: discriminated auth message, rendered message и transport/result/error contracts.
2. `messages.server.ts`: две фиксированные subject/text/html templates.
3. `service.server.ts`: validation, renderer + один выбранный transport.
4. `providers/resend.server.ts`, `providers/brevo.server.ts`: provider-specific mapping через injected Fetch-compatible функцию.
5. `config.server.ts`: typed server configuration и строгая валидация выбора provider.
6. `better-auth-mail.server.ts`: фабрика двух callbacks, типизированных через установленный `BetterAuthOptions`; import Better Auth types без второго auth instance.
7. Fake/outbox helper в test-support, импортируемый только тестами, не через production barrel.

Message содержит family, один recipient email и готовый action URL. Subject/from/body не принимаются из HTTP form. Не переносить весь user/request/session объект в transport. Callback берёт адрес из переданного Better Auth user и URL из Better Auth payload; отдельный raw token не нужен: он уже в action URL.

Rendered message: один from, один to, фиксированный subject, plain text и escaped HTML. Не добавлять cc/bcc, вложения, произвольные headers, provider templates, tracking/analytics metadata, маркетинговые сообщения или generic send-email endpoint.

Для AUTH-01 достаточно canonical English templates; локализацию lifecycle UX и выбор языка согласовать при AUTH-02/03, без нового i18n framework и без hard-coded locale universe. Не вставлять пользовательское display name без необходимости.

## 3. URL, content и secrets

- Sender и canonical app origin берутся только из server configuration. Не выводить их из Host, forwarded headers или формы.
- Action URL принимается как готовое значение от auth callback, валидируется и не конструируется заново из raw token. Проверять absolute URL, exact configured app origin, отсутствие userinfo, controls и неподходящего protocol; HTTPS обязателен для real-provider configuration. Loopback HTTP разрешён только в explicit local test fixture.
- Transport отправляет письмо; он никогда не fetch-ит action URL и не выбирает пользователя/permission.
- Существующие Better Auth origin/redirect checks сохраняются. Mail-layer origin check не заменяет проверку nested callback/return destination в AUTH-02/03.
- HTML escaping обязателен, в том числе для URL в атрибуте; text сохраняет сам URL без изменения токена. Запретить CR/LF в адресах/from/subject и не принимать списки recipient вместо одного адреса.
- Token/action URL допустимы только в auth callback, тексте целевого письма и process-local fake outbox теста. Не писать их в console, exceptions/cause, snapshots, History, analytics, request diagnostics или client DTO.
- Provider API keys остаются в server-only closure/config; не включать их в provider-neutral message/result. Не возвращать raw provider response/body/headers/errors.
- Не добавлять persistent outbox, retry queue, durable delivery history или token storage: срок жизни, одноразовость и replay остаются ответственностью AUTH-02/03 и Better Auth.

## 4. Configuration и Stage-6 seam

Рабочий runtime этого пакета остаётся без sender wiring. Для будущего server composition определить внутренний config contract: disabled либо ровно один `resend | brevo`, validated from address/name, canonical app origin и credential выбранного provider. Disabled никогда не означает successful delivery.

- Неизвестный provider, пустой sender/key или противоречивая active configuration — явная configuration error; без fallback к fake, console или другому provider.
- Fake отсутствует в production provider enum/parser; его создаёт только test helper и явно передаёт в mail service. Production factory не должна принимать fake/outbox. Наличие NODE_ENV или development build mode само по себе не разрешает fake.
- Provider constructors требуют injected HTTP transport; нет скрытого default global fetch. AUTH-01 unit/integration tests используют fake/spy transport, который отвергает любую незаявленную сетевую операцию.
- В текущий Worker не добавлять live transport composition, env bindings, API keys, accounts, DNS или outbound provider calls. Будущий Stage 6 подключит реальный transport и server secrets на том же boundary; UI/Better Auth callbacks не зависят от имени provider.
- Заранее не добавлять фактически неиспользуемые переменные в Env, .env.example или wrangler config. Имена env bindings закрепляются при реальном runtime wiring; этот пакет фиксирует семантику config, а не deployment resources.
- Никакого automatic provider failover или скрытого retry, включая retry по 429/5xx/timeout.

## 5. Provider mapping и результат отправки

| Adapter | Fixed endpoint / authorization | Минимальный body |
| --- | --- | --- |
| Resend | POST https://api.resend.com/emails; Authorization: Bearer server-key | from, to: [email], subject, text, html |
| Brevo | POST https://api.brevo.com/v3/smtp/email; api-key: server-key | sender: {email, name?}, to: [{email}], subject, textContent, htmlContent |

Использовать Workers-compatible fetch/Request/Response/AbortController; SDK, SMTP/Node socket client и новая dependency не нужны. Endpoint фиксирован в adapter, не берётся из recipient/action URL. Запретить follow redirect при credentialed provider request. Задать небольшой явный timeout (например 10 секунд) и bounded response parsing (например 64 KiB); при ошибке очистить timers и не читать/сохранять бесконечное тело.

Успех означает **accepted by provider**, не delivered to inbox: валидный successful response, ожидаемая структура и message id (Resend id / Brevo messageId). Fake возвращает отдельный simulated result, не production delivery proof. Callback не передаёт receipt клиенту.

Ошибки: configuration/validation отдельно от ожидаемого delivery rejection/unavailability и ambiguous outcome. Network timeout/disconnect, неразбираемый successful response и недостоверный 5xx могут означать, что письмо уже принято: не переотправлять и не переключать provider. 4xx/429 возвращают безопасную классификацию, без raw body. Не считать произвольную programming/config error временным outage или success.

Mail operation возвращает Promise с наблюдаемым результатом. Изолированный fixture ожидает завершения; не использовать необслуживаемый fire-and-forget. При AUTH-02/03 потребуется связать request-scoped background execution с Workers waitUntil и generic anti-enumeration response: документация Better Auth отдельно предупреждает о timing leak от ожидания доставки. AUTH-01 не вводит публичный request endpoint и не заявляет, что решил HTTP timing/anti-enumeration.

## 6. Acceptance для implementation PR

### Unit/contract tests

1. Оба family формируют ожидаемые subject/text/html и доставляются в изолированный fake outbox; проверяются recipient и exact decoded action URL, а не только число вызовов.
2. Невалидные URL/origin/protocol/userinfo, CR/LF и HTML injection отвергаются/экранируются; неправильный input не вызывает transport.
3. Выбор resend/brevo вызывает ровно один adapter; factory отвергает fake/unknown provider и invalid configuration до отправки. Fake отсутствует в production import graph.
4. Для каждого adapter проверить exact method/URL/auth header/body, text+HTML, successful receipt и отсутствие лишних полей.
5. Проверить 400/401/403, 429, 5xx, redirect, timeout, network throw, malformed/oversized body и 2xx без id. На каждом failure максимум одна попытка, ни fallback, ни ложного accepted.
6. Canary secrets в payload/provider errors не появляются в выбрасываемом error, logger calls или result. Outbox доступен только тесту, очищается между cases; не печатать письма или сохранять token snapshots.

### Реальный Better Auth/PostgreSQL fixture

Новый `tests/database/auth-mail-foundation.test.ts` по существующему disposable local PostgreSQL pattern, без real Google/provider network:
- test-local composition callbacks поверх текущих `betterAuthOptions`, типы взяты из pinned dependency;
- создать test credential user; вызвать canonical send-verification-email и request-password-reset через handler с корректными Origin/IP;
- доказать, что Better Auth передал authoritative email и свой action URL в соответствующее письмо; fake transport получил по одному ожидаемому message;
- неизвестный recovery recipient не порождает письмо; capture реальной mail-failure цепочки не содержит canary secrets; зафиксировать фактическое поведение версии, не маскировать callback failure blanket catch;
- отдельно обычный runtime без test overrides сохраняет mail-disabled поведение и текущую signup/session semantics.
Full verification/reset consumption/replay/session revocation acceptance остаётся AUTH-02/03.

### Общие checks

Существующий CI полностью: lint, typecheck, unit/route tests, build, UI-preview build, db:check/schema parity, PostgreSQL suite и Workers smokes согласно .github/workflows/ci.yml. Новые unit и database cases попадают в существующие vitest configs; новый workflow не требуется.

Особенно сохранить auth-runtime, auth-link-identity, registration-auth-admission, auth-rate-limit-concurrency и Account & security regressions. Для пакета без UI изменений отдельный visual acceptance не добавляется. Реальные mail delivery, Google, DNS и deployed acceptance не выполнять.

## 7. Изменения, которые не нужны

- Schema/migration/DB grants: **нет**.
- Dependencies/package/lockfile: **нет**. Security upgrade относится к #315.
- Public AuthRuntime, client DTO, route/UI contract: **нет**.
- Рабочие Better Auth options, Worker wiring, production config: **нет**.
- Изменение auth token/session/registration/linking policy: **нет**.
- Persistent documentation: отдельный docs closeout после implementation, как предписано планом.

При необходимости выйти за эти границы Лира фиксирует конкретную техническую причину в #320 для пересмотра плана; расширение scope не выполняется по предположению.

## Проверенные внешние источники и ограничения

- Better Auth email: https://www.better-auth.com/docs/concepts/email
- Better Auth email/password: https://www.better-auth.com/docs/authentication/email-password
- Callback и endpoint semantics сопоставлены с локально установленным Better Auth **1.7.7**, включая api/routes/password.mjs, email-verification.mjs, sign-up.mjs. Это не security audit и не проверка ещё не установленной 1.7.19.
- Resend Send Email: https://resend.com/docs/api-reference/emails/send-email
- Brevo documentation page вернула HTTP 403. Mapping проверен по официальному SDK source commit `4318c60e99e7426f293940a03918b7e61c6924da`: https://github.com/getbrevo/brevo-node/tree/4318c60e99e7426f293940a03918b7e61c6924da ; files src/environments.ts, src/auth/HeaderAuthProvider.ts, src/api/resources/transactionalEmails/client/Client.ts, requests/SendTransacEmailRequest.ts, types/SendTransacEmailResponse.ts. SDK устанавливать не требуется.
- При старте implementation сверить текущий main/package lock и при изменении Better Auth повторить callback fixture на фактической версии. При Stage 6 заново проверить provider API, реальные delivery/timeout/tracking settings и approved credentials.

## Handoff

Мира: проверить соответствие плана AUTH-01 утверждённому scope и передать Лире implementation по разделам 1–7.
Лира после handoff: отдельная ветка от актуального main, отдельный bounded implementation PR, этот служебный PR не merge. Сохранить указанные границы и предъявить exact head + фактические CI/acceptance evidence.
После implementation: coordinator whole-PR review Миры; только после PASS — техническая проверка Лёвой того же stable exact head.
Лёва implementation не выполнял. В ходе планирования tests/build не запускались; приведённая матрица — требования к будущей реализации.

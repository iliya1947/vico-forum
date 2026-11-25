# COMMUNICATION.md — общий актуальный контекст, факты, ограничения, зависимости и незакрытые вопросы команды

## Независимая revalidation Лены — PASS (product scope only)

Baseline: main `9f4c9c8d5e18f42db9b12cf23bc07322ef8f6432`, Better Auth 1.7.7. AUTH-01–AUTH-07 и D-01–D-10 остаются актуальными; исключать/добавлять product stages оснований нет. Старый AUTH-01 technical plan не принят повторно. Проверка статическая: изучены текущие product/state contracts, релевантные разделы Settings/Authorization/Super-admin, реализация и существующие test contracts; тесты заново не запускались. Это не security/implementation acceptance.

## Входные данные нового полного технического плана

1. AUTH-01: mail boundary остаётся новой работой. В `app/auth/auth.server.ts` нет mail callbacks, в Worker auth environment нет mail provider wiring; существующая таблица verification и auth schema в `db/schema.ts` уже доступны. Resend/Brevo — один выбранный provider одновременно, fake/test transport, без external calls. Проверить locale-safe transactional mail и безопасные callback/return URLs, failure/retry semantics; не вводить параллельную auth identity.
2. AUTH-02: `requireEmailVerification: false` и нынешний `credential-view.tsx` предполагают успешную signup session и показывают отсутствие verification; `forum-email-registration.test.ts` прямо требует unverified session. Новый план должен осознанно изменить этот контракт, привести local/CI account/session fixtures к новому контракту, не отключая независимый Google login. SET-02 admission (`registration-admission.ts`) — fresh create-user-only policy; закрытие регистрации не блокирует login, explicit linking, verification или recovery существующего аккаунта.
3. AUTH-03: repository не содержит полноценного forgot/reset/set-password UX или mail callbacks. `session-write-guard.ts` уже защищает native credential updateMany, user/account writes и pathless setPassword actor admission; SA04-I4c тестирует updatePassword/deactivation. Эти primitives не доказывают полный recovery lifecycle. План должен определить проверенные token/identity/expiry/replay/partial-failure/session-revocation semantics, включая Google-only password creation и невозможность recovery как reactivation. Не считать штатный endpoint сам по себе готовой функцией.
4. AUTH-04: SET-05 уже доставил own linked-method read, explicit Google linking, existing password change, own session list/revoke-one/revoke-others с stale-user/session и fresh-session checks, private/no-store. Не реализовывать это повторно. Дополнить email/status/change и отсутствующие user flows; native HTTP unlink уже подтверждён test contract SA04-I4c (active credential+Google account). Проверить last usable method и concurrent unlink/credential changes на canonical API и persistence boundary, а не только UI. Password creation shared с AUTH-03; не два backends. Сохранить exact Owner binding к user.id и separate RBAC, не добавить transfer/recovery of ownership/foreign credential mutation. `app/routes/settings-account.tsx`, `app/auth/request-context.ts`, `app/auth/auth.server.ts` — существующие seams.
5. AUTH-05: Better Auth database rateLimit table/config уже существуют; SET-05 change-password через HTTP shares canonical bucket (3/10s), trusted IP boundary cf-connecting-ip. Потребуются применимые ограничения verification/recovery/resend/new registration challenge; не подменять rate limits passive SA02 attempt telemetry. Проверить direct/server и HTTP пути, не обходить admission. Provider-neutral challenge boundary без выбора конкретного provider/adapter и без внешней активации.
6. Cross-cutting AccountState: SA04/SA05 authoritative active-user row locking защищает session create/update/delete, user update, account create/update/delete; inactive own signed sign-out — узкое исключение. Новые token consumption/verification/recovery/change/link/unlink paths обязаны сохранять fail-closed state, retained data и commit ordering с deactivation; проверить весь многозаписный lifecycle, не считать защиту отдельных adapter writes доказательством atomicity всей операции. Не добавлять physical purge/reactivation/foreign-session control.
7. Cross-cutting observability: `auth.server.ts` emits auth.passwordChanged только для /change-password; reset updateMany не покрывается автоматически. `db/owner-auth-facts.ts`, `db/owner-sa02-catalog.ts`, `app/auth/session-deletion-evidence.ts` имеют закрытые kind/reason/linkContext; новый flow может потребовать расширения. `app/observability/attempt-collector.server.ts`, `db/owner-attempt-telemetry.ts` и DB CHECK в migration 0063 не охватывают verify/recovery/email-change/unlink. При необходимости новых operation/fact values согласовать forward migration/schema, writer, safe labels, scoped/global/target History и Integrations projections. Сохранить exact persisted proof, bounded cardinality, trusted attribution, best-effort observation; не логировать tokens/passwords/email/payloads и не объявлять monitoring полным audit. `db/owner-integration-monitoring.ts` и `app/observability/integration-runtime.ts` сейчас отражают Google configuration presence и retained auth facts, не real provider health. Не добавлять active external probes в Monitoring GET.
8. AUTH-06/07: existing native PostgreSQL tests `auth-runtime`, `account-security`, `forum-email-registration`, `sa04-session-atomic`, `sa02-auth-creations`, `sa02-auth-password-change`, `sa02-auth-oauth-rollback`, attempt-collector и connected Worker/Chromium SET-05/Super-admin — foundation для regression, но не acceptance новых lifecycle flows. Устаревшие ожидания auto-session on unverified signup изменить осознанно, остальные границы сохранить; положительные/negative/race сценарии, stale identity, replay, failure and no secret leakage. Новые tests и pre-Stage-6 gate должны проверять целую feature, а не только green existing CI.
9. Worker `workers/app.ts` создаёт request-local AuthRuntime/collectors, initializes authoritative session before Router dispatch, затем flushes bounded observations. Новые auth capabilities должны сохранить cookie ordering, classified storage failures, separate web runtime/DB access, request scope, generic locale/RTL. Реальные provider/edge credentials, DNS, production OAuth/Owner binding и deployed acceptance остаются Stage 6.

## Результат полного технического планирования

Лёва подготовил PLAN.md для AUTH-01–AUTH-07 на прежнем актуальном main. Критические source semantics перепроверены; evidence и официальные ссылки — research/better-auth-1.7.7.md. Новые существенные основания: verification JWT не одноразовый/user-ID-bound; reset может создавать Google-only credential и не объединяет consume/password/session effects одной transaction; native unlink считает rows до delete; requireEmailVerification меняет createUser403 в synthetic signup success. План закрывает эти gaps canonical Better Auth plugin + transaction-aware guard, не новой auth системой. Это предложенная реализация, не выполненные tests/acceptance.

Legacy cutover не является отдельным текущим product decision: публичный production release не выполнен. D-01 задаёт единый target contract mandatory verification; local/CI fixtures меняются вместе с implementation. Реальные external accounts перед Stage 6 требуют отдельной фактической operational проверки, а не заранее встроенного grandfathering-механизма.

## Следующий переход

AUTH-02a author PASS, #389 exact head `06656fef2d85e03c62b7ab69b03fa96ecfc68653`; current coordinator checkpoint pending. Final correction evidence: stages/AUTH-02a/RESULT.md. Route: WORKFLOW.md. AUTH-02b assigned to Лёва only after coordinator PASS.

## Coordinator review — PASS

1. Назначенные corrections проверены: legacy/Q-01 ветвление удалено; mandatory verification остаётся единым target contract.
2. AUTH-05 provider-neutral; конкретный anti-bot provider/adapter не является implementation dependency.
3. Полный технический план принят для начала реализации.
4. Delivery mode: stacked AUTH-01→AUTH-06, AUTH-07 final gate. Причина — одна зависимая vertical; промежуточный merge foundation-кода в main не нужен.
5. Активная ступень — AUTH-01. По прямому решению владельца implementation назначена Лёве; остальные ступени не активны до coordinator checkpoint предыдущей. Поскольку Лёва участвует в реализации, независимый final reviewer определяется отдельно.
6. External activation остаётся Stage-6-only.

## AUTH-01 — coordinator checkpoint PASS

PR #388, stable exact head `e18fdb189d3c6a0a9ad913df398530a6cd69bb6a`.

1. Мира проверила весь bounded diff, integration seams и evidence: 0 confirmed current-scope defects.
2. CI 45518743774 подтверждён на exact head: checks/database SUCCESS.
3. Resend/Brevo HTTP mappings повторно сверены с актуальной официальной документацией.
4. Scope сохранён: signup/session/verification behavior, schema/dependencies и anti-bot implementation не изменены; external activation отсутствует.
5. PASS разрешает только следующую stacked-ступень AUTH-02a без intermediate merge/independent Codex review. Whole feature ещё не принята.


## AUTH-02a — active

1. AUTH-01 checkpoint PASS разрешил следующую stacked-ступень.
2. AUTH-02a ограничен foundation: transaction composition, canonical plugin/service seam, lifecycle state, необходимые concurrency constraints и shared abuse primitives.
3. User-visible verification/signup/session behavior остаётся неизменным до AUTH-02b.
4. По прямому решению владельца исполнитель AUTH-02a — Лена / GPT-6.2. Предыдущее назначение Лиры снято до начала implementation.
5. Implementation PR должен иметь base на `feat/auth-01-mail-foundation`; intermediate merge отсутствует.

6. Поскольку Лена участвует в AUTH-02a implementation, она не является независимым final reviewer собранной feature.

## AUTH-02a — storage technical-plan correction

Лёва независимо подтвердил blanket cleanup Better Auth 1.7.7 и воспроизвёл удаление live 600 s Vico row на +120 s с truthful lastRequest (unmodified native code, controlled-clock/in-memory adapter diagnostic, не PG race test). Требование общего rate_limit было ошибкой технического плана. Common AuthLifecycleBudget получает отдельную `auth_lifecycle_budget` с key PK/count/finite expires_at и indexed bounded cleanup; native limiter/rules/configuration сохраняются. Это изменение storage existing service, без нового policy engine, native customStorage или внешнего backend.

PLAN §2/7/8 и stage PLAN исправлены; точный schema/migration/runtime capability/acceptance contract и исключённые альтернативы — [stages/AUTH-02a/STORAGE-DECISION.md](stages/AUTH-02a/STORAGE-DECISION.md). Storage blocker для начала исправления снят, реализация остаётся у Лены. A-02–A-04 и sequencing diagnostics остаются обязательными до нового stable head/author checks и checkpoint Миры; прежний green CI не принимает новое решение. Лёва application code/CI/external state не менял.

## Owner routing decision — next package

После coordinator PASS текущего AUTH-02a следующую stacked-ступень **AUTH-02b реализует Лёва / Codex-6.1 Sol**. Решение заранее фиксирует исполнителя, но не активирует AUTH-02b: Лена сначала завершает AUTH-02a, затем Мира проводит checkpoint. Base AUTH-02b определяется stable head принятого AUTH-02a.


## AUTH-02a — coordinator checkpoint PASS

PR #389 / exact head `06656fef2d85e03c62b7ab69b03fa96ecfc68653` принят Мирой: 0 confirmed current-scope defects. Самостоятельно проверены transaction composition, Better Auth 1.7.7 transaction seam, corrected lifecycle-budget storage/cleanup, A-02–A-04, sequencing, lifecycle state/plugin, migrations и runtime capability boundary; CI/acceptance подтверждают результат, но не являются самостоятельным основанием PASS.

Следующий пакет — AUTH-02b — по решению владельца выполняет Лёва. Он ещё не активирован; base при активации — принятый AUTH-02a head. Intermediate merge/review отсутствуют.


## AUTH-02b — active

1. AUTH-02a coordinator PASS разрешил следующую stacked-ступень.
2. AUTH-02b ограничен mandatory email verification, resend и пользовательской verification presentation; recovery/password-create/email-change/unlink не входят.
3. Исполнитель по прямому решению владельца — Лёва / Codex-6.1 Sol.
4. Implementation PR должен иметь base `feat/auth-02a-lifecycle-foundation` / exact `06656fef2d85e03c62b7ab69b03fa96ecfc68653`.
5. Mandatory target: email/password signup без полноценной session до verification; GET landing non-mutating, explicit POST terminal confirmation, затем отдельный sign-in.
6. SET-02 fresh-registration policy сохраняется; existing verification/resend/sign-in не блокируются закрытием новой регистрации.
7. Реальные mail/provider/Stage-6 ресурсы не активируются.

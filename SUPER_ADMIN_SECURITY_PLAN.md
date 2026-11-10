# Super-admin security — implementation plan

## Status

1. Этот файл — рабочий план отдельного служебного канала защиты Super-admin.
2. Он не является утверждением, что описанная защита уже реализована или развёрнута.
3. Постоянные продуктовые контракты остаются в `docs/SUPER_ADMIN.md`, `docs/auth/AUTHORIZATION.md`, `ROADMAP.md` и `docs/database/*`; фактическое состояние — в `PROJECT_STATE.md`.
4. Реализация выполняется отдельными bounded implementation PR; постоянная документация обновляется отдельным docs PR после фактической реализации.
5. Stage 6 остаётся paused: текущая repository-работа должна готовить фундамент, но не создавать production Access, hostname, Hyperdrive, secrets, credentials или deployment без отдельного разрешения владельца.

## Цель

Максимально изолировать exact-Owner-only Super-admin так, чтобы компрометация публичного форума, обычной административной учётной записи, обычной форумной сессии, public Worker runtime или его DB-role не давала прямого пути в Owner control plane.

Главный принцип: целевой Super-admin — не «особо защищённый раздел публичного Worker», а отдельный Owner control plane с независимыми ingress, authentication/session и database capability boundaries.

## Текущий baseline

1. SA-01 находится в том же React Router application и Worker, что и публичный форум, по `/:locale/super-admin/*`.
2. Текущий admission использует обычную Better Auth session и затем exact server-bound `VICO_OWNER_USER_ID`.
3. `VICO_OWNER_USER_ID` остаётся единственным authoritative Owner binding; email, provider claim, role и dynamic permission не создают Owner authority.
4. Текущий `vico_forum_web` имеет широкий набор forum/auth/authorization/moderation privileges и не подходит как DB-role будущего изолированного Owner Worker.
5. SA-01 Monitoring/Event log уже имеет append-only `owner_events` и `owner_monitor_observations`; web runtime сейчас имеет требуемые SELECT/INSERT без UPDATE/DELETE.
6. Stage 6 external integration paused; production Owner binding и deployed Super-admin acceptance не выполнены.
7. Репозиторий публичный, поэтому секретность route path или исходного кода не может считаться security boundary.

## Целевая архитектура

1. Public plane: отдельный Public Forum Worker обслуживает Forum, обычный Admin, Settings и Needs attention. После активации изоляции он не регистрирует Super-admin routes и не имеет privileged API к Owner Worker.
2. Owner plane: отдельный Owner Worker обслуживает только Super-admin и будущие genuinely Owner-only operations.
3. Перед Owner Worker находится Cloudflare Access с deny-by-default. Предпочтительно защищать весь Worker, чтобы Access охватывал production, routes/custom domains, workers.dev и previews; альтернативные публичные entrypoints дополнительно отключаются.
4. Owner Worker использует отдельную privileged authentication/session boundary. Обычная forum session не принимается как Owner session даже при ручной передаче cookie.
5. После отдельной Owner authentication сервер всё равно повторно проверяет exact `VICO_OWNER_USER_ID`. Cloudflare identity, email, role, ordinary permission или client input не заменяют этот binding.
6. Owner authentication использует Passkey/WebAuthn с обязательной user verification. Критические mutations требуют дополнительного step-up challenge, а не только существования уже открытой Owner session.
7. Owner Worker использует отдельную минимальную PostgreSQL capability/role и отдельный cache-disabled Hyperdrive. Права расширяются только под реально реализованные Owner операции.
8. Public Worker не вызывает Owner Worker через Service Binding/RPC как privileged backend. Между plane'ами не создаётся автоматический доверенный канал.

## Security invariants

1. Украденная обычная форумная session владельца сама по себе не открывает Super-admin.
2. Компрометация ordinary Admin/RBAC не даёт Super-admin authority.
3. Отсутствующий, пустой или некорректный Owner binding всегда fail closed и никого не повышает.
4. Owner session хранится отдельно от обычных sessions и подписывается/защищается отдельным server-only secret; exact persistence layout определяется техническим планом, но shared authoritative session store запрещён.
5. Owner cookie — Secure, HttpOnly, host-only, SameSite=Strict, без parent-domain sharing.
6. Для Owner session не используется долгоживущий cookie cache, который сохранял бы отозванную session после server-side revoke.
7. Критические действия не разрешаются по одной только свежести session: нужен отдельный server-side step-up grant, полученный после нового WebAuthn challenge.
8. Step-up grant привязывается минимум к Owner user, Owner session, purpose и bounded lifetime; для destructive/security-critical operations используется одноразовый purpose-bound challenge/nonce.
9. Passkey bootstrap не создаёт второй Owner, role или альтернативный authority source. Credential разрешается только для exact bound Owner.
10. Permanent fallback-login через обычный Google/password не открывает Owner plane. Потеря всех Passkey обрабатывается отдельным break-glass recovery, который не остаётся постоянно включённым.
11. Owner secrets никогда не являются client-visible data, query parameters, обычными Wrangler vars, логами или artifacts.
12. Owner runtime role не получает SUPERUSER, CREATEDB, CREATEROLE, REPLICATION, BYPASSRLS, schema/table ownership, CREATE, grant option, migration capability или лишние relation privileges.
13. Public runtime не получает чтение Owner-private surfaces только ради telemetry. Если public runtime должен производить Owner telemetry, это отдельная узкая append-only capability.
14. `workers.dev` и Version/Preview URLs Owner Worker не являются обходным путём вокруг Access.
15. Security не зависит от секретности исходного кода или URL. Secret route slug допустим только как дополнительное снижение шумного сканирования, не как authentication boundary.

## Authentication target

1. Owner Worker получает отдельный auth secret и отдельную session persistence boundary.
2. Вход в Owner plane после bootstrap — Passkey-only; обычная forum authentication не создаёт privileged Owner session.
3. WebAuthn target фиксируется на Owner origin/RP; user verification обязательна.
4. Регистрируются минимум основной и резервный Passkey; удаление последнего credential запрещается обычным UI flow.
5. Первичная регистрация первого Passkey допускается только через bounded enrollment flow, который разрешает exact `VICO_OWNER_USER_ID`, использует одноразовый server-side enrollment secret/context и после успешного enrollment закрывается.
6. Recovery после потери всех Passkey — отдельная manually enabled break-glass operation с новым одноразовым secret/context и последующим обязательным отключением recovery path.
7. Обычные privileged reads могут использовать активную Owner session. Security-critical/destructive mutations требуют нового Passkey step-up.
8. До Passkey implementation Better Auth должен быть обновлён с текущего `1.7.7` на актуальную patched release line после повторной проверки официальных release notes. На 2026-11-10 минимально проверенная security-fixed версия линии 1.7.x — `1.7.16`; все `better-auth` / `@better-auth/*` пакеты обновляются согласованно.

## Database and telemetry target

1. Создаётся отдельный capability contract для Owner runtime; production role name environment-specific, условно `vico_owner_runtime`.
2. Для текущего SA-01 минимум Owner monitoring требует SELECT/INSERT на `owner_events` и `owner_monitor_observations`, SELECT на проецируемый `admin_history` и только те дополнительные auth/passkey relations, которые будут обоснованы выбранной auth implementation.
3. Existing `vico_forum_web` не используется как Owner Worker DB identity.
4. После реального разделения public web role теряет ненужные Owner-history read privileges.
5. Passive 5xx producer публичного Worker при необходимости получает отдельный server-only append path/capability без Owner Event-log reads и без generic event writer driven by client input.
6. Каждый последующий SA package расширяет Owner DB capability только одновременно с конкретным code-backed use case и negative privilege probes.

## Worker, Access and deployment target

1. Owner Worker имеет отдельный entrypoint/configuration, отдельный protected GitHub Environment и отдельный rollout workflow.
2. Production ingress — выделенный Owner hostname/custom domain. Cloudflare Access защищает весь Owner Worker или эквивалентно все его реальные entrypoints до выполнения application code.
3. `workers_dev: false` и `preview_urls: false` фиксируются явно для Owner Worker после external activation.
4. Owner Worker secrets объявляются как required secret bindings; чувствительные значения не хранятся в Wrangler `vars`.
5. PR/CI environments не получают production Owner secrets, production Owner Hyperdrive или private production data.
6. Production smoke новой версии не требует публичного Version URL: новая version может входить в deployment с 0% traffic и проверяться на защищённом production hostname через Version Override, затем отдельно promoted.
7. Rollout проверяет exact SHA, required migrations/capabilities, built artifact, Access/ingress assumptions, protected smoke и rollback baseline.
8. Отдельный Public Worker deployment pipeline не получает Owner deployment credentials или Owner runtime secrets без отдельной обоснованной необходимости.

## Что подготовить до Stage 6

1. Разделить кодовые зависимости так, чтобы Super-admin можно было собрать отдельным Owner Worker без копирования domain logic и без второго RBAC.
2. Зафиксировать явный Owner-runtime boundary: какие routes/components/services являются Owner-only, какие ordinary Admin/Settings/Attention operations остаются на своих canonical boundaries.
3. Подготовить независимые config/env interfaces для future Owner Worker и не читать Owner-only secrets через public application configuration.
4. Подготовить отдельный database capability contract и disposable PostgreSQL positive/negative probes для Owner monitoring и отдельного telemetry producer boundary.
5. Подготовить auth/session interfaces так, чтобы существующая ordinary Better Auth session не была неявной зависимостью future Owner admission.
6. Сохранить current local/CI functionality и текущие URLs до отдельного activation package, если их изменение не требуется для самого foundation.
7. Не создавать Cloudflare Access application, custom hostname, Owner Hyperdrive, production DB credential, Passkey enrollment secret или production deployment в этой фазе.

## Что активировать только на Stage 6

1. Обновить и заново проверить актуальную Better Auth security baseline перед Owner-auth integration.
2. Создать реальный Owner Worker и перевести Super-admin ingress из Public Worker.
3. Создать production Owner hostname и включить Cloudflare Access deny-by-default до application admission.
4. Создать отдельные Owner auth/session/passkey persistence и server-only secrets.
5. Выполнить bounded Passkey bootstrap для exact Owner и зарегистрировать резервный credential.
6. Создать/provision минимальный PostgreSQL Owner runtime role и отдельный cache-disabled Owner Hyperdrive.
7. Разделить public telemetry producer и Owner history reader capabilities.
8. Выключить альтернативные public entrypoints Owner Worker и подтвердить это внешней проверкой.
9. Включить отдельный protected rollout workflow и выполнить exact-version protected smoke/rollback acceptance.
10. Только после этой acceptance убрать публичные `/:locale/super-admin/*` routes из Public Worker и считать новый control plane authoritative.

## Step-up classes

1. Обычный privileged read: Access + действующая isolated Owner session + exact Owner binding.
2. Sensitive mutation: дополнительно Passkey step-up с коротким bounded server-side grant.
3. Critical/destructive mutation: отдельный operation-specific WebAuthn challenge и одноразовый grant/nonce.
4. В critical class по умолчанию входят управление Owner Passkey/recovery, privileged infrastructure/DB/secret changes, deploy/rollback controls и необратимые/массовые destructive operations. Конкретная операция попадает в класс только когда она реально реализуется.

## Acceptance criteria

1. Public forum session и cookies не дают Owner session и не проходят Owner admission.
2. Non-Owner, ordinary admin, arbitrary role/grant/override и forged client identity fail closed.
3. Missing/invalid Owner binding fail closed.
4. Owner session revoke действует server-side без длительного cookie-cache grace.
5. Passkey login требует configured Owner RP/origin и user verification; bootstrap/recovery не позволяют создать вторую Owner identity.
6. Sensitive/critical mutations отказываются без подходящего fresh purpose-bound step-up.
7. Public Worker не содержит privileged Owner API/service-binding route после activation.
8. Owner DB role проходит positive probes только для нужных relations/operations и negative probes для forum/authz/migration/admin capabilities вне scope.
9. Public telemetry writer не может читать Owner journal или выполнять произвольные Owner writes.
10. Owner Worker недоступен через незащищённый workers.dev/preview/version entrypoint.
11. Access действительно блокирует неразрешённый request до application execution; protected Owner application отдельно продолжает exact Owner admission.
12. Production Owner secrets отсутствуют в public Worker configuration, PR previews, logs и artifacts.
13. New Owner version проходит protected 0%-traffic smoke и rollback path до promotion.
14. Permanent docs и `PROJECT_STATE.md` обновляются только по фактически реализованному/принятому состоянию, без утверждений о Stage-6 acceptance заранее.

## Не входит автоматически

1. Второй Owner, deputy/successor/transfer model.
2. Универсальный Owner mutation API.
3. Хранение исполняемого Super-admin code в PostgreSQL.
4. Security through obscurity как основная защита.
5. Перенос репозитория в private как security boundary.
6. Production rollout или provisioning без отдельного разрешения владельца.
7. Реализация будущих SA monitoring/actions только потому, что security foundation уже существует.

## Проверенные внешние ориентиры на 2026-11-10

1. Better Auth security release: https://better-auth.com/blog/security-release-2026-11-03
2. Better Auth Passkey: https://better-auth.com/docs/plugins/passkey
3. Cloudflare Access for Workers: https://developers.cloudflare.com/workers/configuration/cloudflare-access/
4. Wrangler configuration (`workers_dev`, `preview_urls`, required secrets): https://developers.cloudflare.com/workers/wrangler/configuration/
5. Cloudflare Version Overrides: https://developers.cloudflare.com/workers/versions-and-deployments/version-overrides/

Перед фактической реализацией внешние API/версии проверяются повторно; этот раздел фиксирует проверенную основу плана, а не вечную версию документации.
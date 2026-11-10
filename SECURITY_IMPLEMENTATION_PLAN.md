# Безопасность Vico Forum — implementation plan

## Назначение

1. Этот файл — рабочий план общего служебного канала безопасности Vico Forum.
2. Канал охватывает безопасность форума в целом: application security, authentication/session, authorization, Admin/Super-admin, данные и БД, загрузки, abuse/rate limits, Cloudflare/Workers, внешние интеграции, secrets, deployment/preview isolation, observability и pentesting.
3. Отдельные направления внутри этого плана не считаются автоматически утверждёнными implementation package. Перед работой каждый блок ограничивается текущим Stage и реальной задачей.
4. Уже проработанный блок Super-admin security/pentesting является первой частью этого общего направления, а не назначением всего PR.
5. Реализация выполняется отдельными bounded PR. Этот служебный PR хранит план, текущее состояние, решения и handoff между агентами; сам в main не мержится.
6. Постоянные source-of-truth остаются в профильных документах проекта. PROJECT_STATE.md отражает только фактически реализованное состояние.
7. Stage 6 остаётся paused: foundation, который существенно упрощает будущую защиту, можно готовить в repository/local-CI; реальное production provisioning и activation выполняются только по отдельному решению владельца.

## Цель

Максимально уменьшить вероятность компрометации форума и цену успешной атаки, не превращая pre-release разработку в тяжёлую security-инфраструктуру раньше времени.

Принцип работы:

1. Сначала установить реальную поверхность атаки и текущую реализацию.
2. Отличать подтверждённую проблему текущего Stage от будущего hardening.
3. Устранять прежде всего архитектурные single points of compromise и обходы server-side boundaries.
4. Использовать defense in depth, least privilege, fail closed и минимизацию доступных секретов/данных.
5. Не считать скрытый URL, UI, название роли или публично неизвестную реализацию security boundary.
6. Не расширять scope только потому, что потенциальную защиту технически можно добавить.

## Карта направления безопасности

Следующие области образуют общий security/pentesting scope. Это карта покрытия, а не автоматический список задач реализации.

1. Super-admin / Owner control plane — изоляция Owner surface, privileged authentication, step-up, DB/runtime/deploy boundaries.
2. Authentication & sessions — Google OAuth, email/password, linking, session fixation/theft/revocation/freshness, recovery, CSRF/origin, rate limits.
3. Authorization & privilege escalation — dynamic permissions, Owner binding, role/override mutations, IDOR/BOLA, direct service/HTTP bypasses, stale authorization.
4. Ordinary Admin & moderation — protected reads/writes, measures, complaints, Signals/Attention, privacy of administrative data and actor identity.
5. Public forum/application — XSS, injection, request validation, state changes, business-logic abuse, race/replay/idempotency, cache/privacy boundaries.
6. Files & attachments — upload/download admission, content type/size, path/object access, private evidence, malicious payload handling and storage isolation.
7. Database & migrations — least-privilege runtime roles, migration separation, transaction/locking safety, privilege drift and backup/restore boundaries.
8. Cloudflare/Workers/runtime — bindings, Access, routes/domains, workers.dev/version/preview exposure, service bindings, observability and failure behavior.
9. Secrets & supply chain — secret placement/rotation/exposure, GitHub Actions environments, dependency security, package/update provenance.
10. External integrations — Google, email providers, translation providers/Queues and future third-party credentials/callbacks.
11. Abuse & availability — brute force, spam, rate-limit bypass/concurrency, expensive endpoints, resource exhaustion and denial-of-service boundaries.
12. Security monitoring & incident response — useful source attribution, retained/coalesced events, alertability, audit/history, revocation and recovery procedures.
13. Release pentesting — systematic negative testing and final security review before public release.

При появлении новой security-задачи она привязывается к одной из областей выше и получает отдельный bounded package/plan.

---

# Блок A — Super-admin security / pentesting

## Статус

1. Это первый подробно проработанный security-блок в данном общем канале.
2. Текущий SA-01 уже реализован в repository/local-CI, но находится в одном Worker и одном React Router application с публичным форумом.
3. Реальная Stage-6 Owner binding/deployed acceptance ещё не выполнена.
4. Ниже зафиксирована целевая защита и разделение на foundation сейчас и activation позже.

## Цель блока

Изолировать exact-Owner-only Super-admin так, чтобы компрометация публичного форума, ordinary Admin, обычной форумной session, public Worker runtime или его DB-role не давала прямого пути в Owner control plane.

Главный принцип: целевой Super-admin — отдельный Owner control plane, а не просто сильнее защищённый route публичного Worker.

## Текущий baseline

1. SA-01 зарегистрирован по /:locale/super-admin/* в общем app/routes.ts.
2. Admission использует обычную Better Auth session и затем exact VICO_OWNER_USER_ID.
3. VICO_OWNER_USER_ID — единственный authoritative Owner binding; email, provider claim, role и dynamic permission Owner authority не создают.
4. vico_forum_web имеет широкие forum/auth/authorization/moderation privileges и не подходит как DB identity будущего изолированного Owner Worker.
5. owner_events и owner_monitor_observations append-only; текущий web runtime имеет необходимые SELECT/INSERT.
6. Репозиторий публичный; секретность пути или исходного кода не является защитой.
7. Stage 6 paused.

## Целевая архитектура

1. Public plane: Public Forum Worker обслуживает Forum, ordinary Admin, Settings и Needs attention. После activation он не регистрирует Super-admin routes и не имеет privileged API к Owner Worker.
2. Owner plane: отдельный Owner Worker обслуживает Super-admin и будущие genuinely Owner-only operations.
3. Перед Owner Worker — Cloudflare Access deny-by-default; альтернативные public entrypoints не должны обходить Access.
4. Owner Worker использует отдельную privileged auth/session boundary. Обычная forum session не принимается как Owner session даже при ручной передаче cookie.
5. После Owner authentication сервер повторно проверяет exact VICO_OWNER_USER_ID.
6. Owner authentication — Passkey/WebAuthn с mandatory user verification; критические mutations требуют отдельного step-up.
7. Owner Worker использует отдельную минимальную PostgreSQL capability/role и отдельный cache-disabled Hyperdrive.
8. Public Worker не получает privileged Service Binding/RPC к Owner Worker.

## Security invariants

1. Украденная forum session владельца сама по себе не открывает Super-admin.
2. Ordinary Admin/RBAC не создаёт Super-admin authority.
3. Missing/invalid Owner binding fail closed.
4. Owner session имеет отдельный server-only secret и отдельную authoritative persistence boundary.
5. Owner cookie: Secure, HttpOnly, host-only, SameSite=Strict, без parent-domain sharing.
6. Не используется long-lived cookie session cache, сохраняющий revoked Owner session.
7. Critical actions требуют server-side Passkey step-up, а не только session freshness.
8. Step-up привязан минимум к Owner user, Owner session, purpose и bounded lifetime; destructive operations используют одноразовый operation-bound nonce/grant.
9. Passkey bootstrap не создаёт второй Owner или альтернативный authority source.
10. Постоянного fallback-login из ordinary Google/password в Owner plane нет.
11. Owner secrets не попадают в client data, URL/query, обычные Wrangler vars, logs или artifacts.
12. Owner DB role не получает SUPERUSER/CREATEDB/CREATEROLE/REPLICATION/BYPASSRLS, ownership, CREATE, grant option или migration capability.
13. Public runtime не получает Owner-private reads только ради telemetry.
14. workers.dev, preview и version URLs не являются обходом Access.
15. Secret route slug допустим только как шумоподавление, не security boundary.

## Authentication target

1. Отдельный Owner auth secret и отдельная session persistence.
2. После bootstrap вход в Owner plane — Passkey-only.
3. WebAuthn RP/origin ограничены Owner hostname; user verification required.
4. Минимум основной и резервный Passkey; обычный UI не удаляет последний credential.
5. Первый Passkey регистрируется через bounded one-time enrollment, который может разрешить только exact VICO_OWNER_USER_ID.
6. Потеря всех Passkey обрабатывается manually enabled break-glass recovery, который после использования снова отключается.
7. Sensitive/critical mutations требуют нового Passkey challenge.
8. До Passkey implementation Better Auth обновляется с текущего 1.7.7 на актуальную patched release после повторной проверки официальных release notes. На 2026-11-10 минимально проверенная security-fixed версия линии 1.7.x — 1.7.16; связанные Better Auth packages обновляются согласованно.

## Database and telemetry target

1. Отдельный Owner runtime capability contract; production role name environment-specific, условно vico_owner_runtime.
2. Для текущего SA-01 нужны только обоснованные Owner monitoring/history и Owner-auth relations.
3. Existing vico_forum_web не используется как Owner Worker DB identity.
4. После разделения public web role теряет ненужные Owner-history read privileges.
5. Public 5xx telemetry при необходимости получает отдельный узкий append-only producer boundary без Owner journal reads и без client-driven generic event writer.
6. Каждый следующий SA package расширяет capability только под конкретный code-backed use case и negative privilege probes.

## Worker, Access and deployment target

1. Отдельный Owner Worker entrypoint/config, GitHub Environment и rollout workflow.
2. Выделенный Owner hostname/custom domain; Access защищает все реальные entrypoints до application execution.
3. Для Owner Worker явно отключаются workers_dev и preview_urls, если они не защищены эквивалентной Access policy.
4. Owner secrets — secret bindings, не обычные vars.
5. PR/CI не получают production Owner secrets/Hyperdrive/private data.
6. Новый production version проверяется через защищённый hostname без необходимости публичного Version URL; предпочтительный вариант — 0% deployment + Version Override + promotion после smoke.
7. Rollout проверяет exact SHA, migrations/capabilities, built artifact, protected smoke и rollback baseline.
8. Public Worker deployment credentials не дают Owner deployment authority.

## Что подготовить до Stage 6

1. Разделить кодовые зависимости так, чтобы Super-admin можно было собрать отдельным Owner Worker без копирования domain logic и второго RBAC.
2. Зафиксировать Owner-runtime boundary и canonical ownership операций между Super-admin, ordinary Admin, Settings и Attention.
3. Подготовить независимые config/env interfaces для future Owner Worker.
4. Подготовить отдельный DB capability contract и disposable PG positive/negative probes для Owner monitoring и telemetry producer.
5. Подготовить auth/session interfaces, не зависящие неявно от ordinary forum session.
6. Сохранить текущую local/CI функциональность и URL до отдельного activation package, если изменение URL не требуется самому foundation.
7. Не создавать Access application, hostname, Owner Hyperdrive, production credential, Passkey enrollment secret или deployment в этой фазе.

## Что активировать только на Stage 6

1. Повторно проверить и обновить Better Auth security baseline.
2. Создать реальный Owner Worker и перенести Super-admin ingress из Public Worker.
3. Создать Owner hostname и включить Access deny-by-default.
4. Создать отдельные Owner auth/session/passkey persistence и secrets.
5. Выполнить bounded Passkey bootstrap exact Owner и зарегистрировать резервный credential.
6. Provision минимальный Owner DB role и отдельный cache-disabled Hyperdrive.
7. Разделить public telemetry producer и Owner history reader capabilities.
8. Закрыть альтернативные public entrypoints и подтвердить это внешней проверкой.
9. Включить отдельный protected rollout и выполнить smoke/rollback acceptance.
10. Только после acceptance удалить public /:locale/super-admin/* ingress и считать Owner control plane authoritative.

## Step-up classes

1. Privileged read: Access + isolated Owner session + exact Owner binding.
2. Sensitive mutation: дополнительно короткий purpose-bound Passkey step-up.
3. Critical/destructive mutation: operation-specific WebAuthn challenge + одноразовый grant/nonce.
4. К critical по умолчанию относятся управление Owner Passkey/recovery, privileged infra/DB/secret changes, deploy/rollback и необратимые массовые/destructive operations, когда они реально появятся.

## Acceptance criteria блока A

1. Forum session/cookies не дают Owner session.
2. Non-Owner, ordinary admin, arbitrary role/grant/override и forged identity fail closed.
3. Missing/invalid Owner binding fail closed.
4. Revoked Owner session перестаёт работать server-side без долгого cache grace.
5. Passkey использует правильный RP/origin и mandatory user verification.
6. Sensitive/critical writes fail без подходящего fresh purpose-bound step-up.
7. Public Worker после activation не имеет privileged Owner API/RPC path.
8. Owner DB role проходит positive/negative privilege probes.
9. Public telemetry writer не читает Owner journal и не выполняет arbitrary Owner writes.
10. Owner Worker не имеет незащищённого workers.dev/preview/version bypass.
11. Access блокирует неразрешённый request до application execution; application всё равно делает exact Owner admission.
12. Owner secrets отсутствуют в public Worker config, PR preview, logs и artifacts.
13. Новая Owner version проходит protected smoke и rollback path до promotion.
14. Permanent docs фиксируют только фактически реализованное состояние.

---

# Общий процесс pentesting/security

## Для каждого блока

1. Определить assets, trust boundaries и доступные attacker entrypoints.
2. Проверить фактический code/runtime path, а не только UI.
3. Составить negative cases: guest, authenticated user, privileged-but-wrong actor, stale session, forged identifiers, direct HTTP/service path, concurrency/replay, dependency failure.
4. Для найденного дефекта доказать impact и текущую exploitable path.
5. Классифицировать: current-stage defect / release blocker / future hardening.
6. Исправлять минимальной bounded задачей с regression coverage.
7. Повторно проверять direct path и соседние boundaries.
8. Фиксировать только полезные security events; не превращать аудит в бесконтрольный сбор персональных данных.
9. Перед production/public release выполнить отдельный whole-product security pass.

## Приоритеты

1. P0 — обход Owner/authentication/authorization, утечка secrets/credentials, remote code/data destructive compromise.
2. P1 — доступ к private/admin data, privilege escalation, auth/session takeover, arbitrary protected mutation.
3. P2 — значимый abuse/DoS, ограниченная утечка или business-logic bypass.
4. P3 — hardening, которое снижает риск, но не закрывает подтверждённую текущую exploit path.

Severity не заменяет Stage-классификацию: будущий P1-сценарий без существующей поверхности атаки не объявляется текущим дефектом.

## Не входит автоматически

1. Security-through-obscurity как основная защита.
2. Private repository как security boundary.
3. Второй Owner/deputy/successor/transfer без отдельного продуктового решения.
4. Универсальный privileged mutation API.
5. Хранение исполняемого кода в PostgreSQL.
6. Production provisioning/deploy без отдельного разрешения.
7. Реализация всех пунктов карты безопасности только потому, что они перечислены в этом плане.

## Проверенные внешние ориентиры на 2026-11-10 для блока A

1. Better Auth security release: https://better-auth.com/blog/security-release-2026-11-03
2. Better Auth Passkey: https://better-auth.com/docs/plugins/passkey
3. Cloudflare Access for Workers: https://developers.cloudflare.com/workers/configuration/cloudflare-access/
4. Wrangler configuration: https://developers.cloudflare.com/workers/wrangler/configuration/
5. Cloudflare Version Overrides: https://developers.cloudflare.com/workers/versions-and-deployments/version-overrides/

Перед каждым implementation package изменяемые API/версии и внешние assumptions проверяются заново.

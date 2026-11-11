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

## Файлы блоков

1. [Block A — Super-admin security / pentesting](./SECURITY_BLOCK_A_SUPER_ADMIN.md)
2. [Block B — Authentication & sessions security audit](./SECURITY_BLOCK_B_AUTH_SESSIONS.md)
3. [Block C — Authorization & privilege escalation audit](./SECURITY_BLOCK_C_AUTHORIZATION.md)
4. [Block D — Ordinary Admin & moderation audit](./SECURITY_BLOCK_D_ADMIN_MODERATION.md)
5. [Block E — Public forum / application security audit](./SECURITY_BLOCK_E_PUBLIC_APPLICATION.md)
6. [Block F — Files & attachments security audit](./SECURITY_BLOCK_F_FILES_ATTACHMENTS.md)

Каждый следующий bounded security-блок оформляется отдельным файлом; этот файл остаётся общей картой направления и маршрутом между блоками.

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

# Безопасность Vico Forum — communication

Служебный PR: #315. Оперативное состояние: [workflow.md](./workflow.md). Рабочий план: [SECURITY_IMPLEMENTATION_PLAN.md](../SECURITY_IMPLEMENTATION_PLAN.md).

## Назначение канала

1. Этот PR — общий служебный канал безопасности Vico Forum.
2. Он охватывает pentesting и hardening всего форума: application/auth/authz, Admin/Super-admin, данные/БД, файлы, abuse, runtime/Cloudflare, secrets, integrations, monitoring и release security.
3. Super-admin security/pentesting — только первый подробно проработанный блок внутри этого канала.
4. Новая security-область не становится implementation scope автоматически: сначала проверяется её актуальность для текущего Stage и формируется bounded задача.
5. Stage 6 external activation остаётся paused без отдельного решения владельца.

## Текущее состояние

1. Общая security-карта и рабочий процесс зафиксированы в SECURITY_IMPLEMENTATION_PLAN.md.
2. Блок A — Super-admin security — содержит текущий детальный target: отдельный Owner control plane, Access, isolated Owner auth/session, Passkey + step-up, minimal Owner DB capability и deploy isolation.
3. Implementation PR по этому каналу сейчас отсутствует.
4. External provisioning/deploy не разрешены.

## Security review — PR #317

1. Проверен implementation PR #317 exact head `d12719bc8e6b2e6368489c16f2e0efa9ef6e3605` против base/main `24dfa9f51892490fae346f6079d6aa7fcfec1aa1`.
2. Verdict по security-scope: **PASS — 0 подтверждённых current-scope security defects**.
3. PR не меняет Worker ingress, route registrations, authentication/session, authorization guards, DB schema/grants, secrets или Stage-6 topology. Он вводит только outgoing AdministrativeRouting seam и мигрирует текущих consumers.
4. В текущем runtime routing resolver не attacker-controlled: LocaleBoundary использует static default; server accessor fallback также default; PR не добавляет runtime producer из URL/header/cookie/DB/env.
5. Existing exact-Owner/Admin guards остаются на целевых routes и mutations; изменение destination generation не является authorization boundary.
6. Current exact-head CI #42794915937, SA-01 Chromium #42794915727 и AP-10 Chromium #42794915509 подтверждены SUCCESS.
7. Future activation note, **не current defect**: когда Stage 6 добавит реальный producer абсолютных origins, он должен валидировать/allowlist HTTPS origins/schemes. Cross-origin mutation/form transport нельзя считать автоматически безопасным только из-за этого routing seam; он требует отдельного Stage-6 security design/acceptance.

## Block B — Authentication & sessions audit prepared

1. Current main inspected for this plan: `e279cb6c032a489a9044ca1191407df887c364b4`.
2. Existing protections confirmed in code: explicit-only account linking, fresh DB-backed registration admission, DB rate limiting with trusted Cloudflare client-IP header, local-only credential return path, same-origin Account & security mutations, stale user/session expectations and fresh-session gating for session management.
3. These are baseline claims to attack, not a PASS verdict.
4. Block B audit matrix is recorded in `SECURITY_IMPLEMENTATION_PLAN.md`; highest-priority execution starts with account linking/takeover, then session fixation/cookies, session IDOR/revoke and CSRF/Origin.
5. No vulnerability or correction task is asserted yet.

## Координация

1. #315 хранит решения, задачи, review findings и прогресс всего направления безопасности.
2. Профильные feature/service PR могут ссылаться на #315, но их product source-of-truth не переносится сюда.
3. Следующий исполнитель/планировщик назначается только под конкретный security-блок.
4. Лира, Лёва и Марк сейчас не имеют активной реализации по #315.

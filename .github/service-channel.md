# Безопасность Vico Forum — communication

Служебный PR: #315. Оперативное состояние: [workflow.md](./workflow.md). Общая карта: [SECURITY_IMPLEMENTATION_PLAN.md](../SECURITY_IMPLEMENTATION_PLAN.md).

## Назначение

1. #315 — общий служебный канал направления безопасности Vico Forum.
2. Каждый security-блок хранится отдельно; общий plan остаётся картой и маршрутом.
3. Реализация выполняется только отдельными bounded implementation PR.
4. Stage 6 external activation остаётся paused без отдельного решения владельца.

## Block-файлы

1. [A — Super-admin / Owner control plane](../SECURITY_BLOCK_A_SUPER_ADMIN.md)
2. [B — Authentication & sessions](../SECURITY_BLOCK_B_AUTH_SESSIONS.md)
3. [C — Authorization & privilege escalation](../SECURITY_BLOCK_C_AUTHORIZATION.md)
4. [D — Ordinary Admin & moderation](../SECURITY_BLOCK_D_ADMIN_MODERATION.md)
5. [E — Public forum / application](../SECURITY_BLOCK_E_PUBLIC_APPLICATION.md)
6. [F — Files & attachments](../SECURITY_BLOCK_F_FILES_ATTACHMENTS.md)

## Текущее подтверждённое состояние

1. Technical audit target B–D: `e279cb6c032a489a9044ca1191407df887c364b4`. Последующее изменение `main` `f6fd4b2c031b2132b04eace18704a59aed1dfec8` меняло только `AGENTS.md`, не audited application code.
2. Block A: target architecture/foundation boundaries зафиксированы; Stage-6 activation не выполнялась. **SA-02 #319 delta-recheck на current main PASS — 0 новых current-scope A findings**.
3. Block B: аудит завершён; **8 current-scope findings**. **SA-02 #319 delta-recheck PASS — 0 новых B findings; все 8 прежних findings остаются открытыми/неисправленными.** Remediation не назначена.
4. Block C: аудит завершён; **1 current-scope finding — `AUTHZ-FAIL-01 Low/P3`**. Remediation не назначена.
5. Block D: аудит D1–D12 завершён; подтверждены **3 findings — `COMPLAINT-PRIV-01`, `HELP-SIGNAL-PRIV-01`, `HISTORY-PRIV-01` (все Low/P3)**.
6. D12 corrected closeout: official React Router Framework/SSR docs и exact `react-router@8.3.1` source подтвердили default skip loader revalidation после 4xx/5xx; Vico explicit recovery refreshes loaders and does not automatically replay mutations.
7. Block E audit завершён: E2 PASS; E5 — **`FORUM-PUB-01 Moderate/P2`**; E6 — 0 additional; E7 — **`READSTATE-CACHE-01 Low/P3`**; E3 — **`PUBLIC-PROJECTION-01 Low/P3`**; E4 — **`DISCOVERY-BOUNDS-01 Low/P3`, `SEARCH-CONTROL-01 Low/P3`**; E8 PASS; E1 — **`LOCALE-DEGRADED-WRITE-01 Low/P3`** + расширение `READSTATE-CACHE-01`; E9 PASS; E10 — **`FORUM-READ-BOUNDS-01 Moderate/P2`, `FORM-BODY-BOUNDS-01 Moderate/P2`**. Block E total: **8 findings**. E10 проверен на current `main` `4248fed23925e4a23e48485d419ceaf0ce337def`; compare с предыдущим target подтвердил отсутствие изменений core Forum/translation E2–E9.
8. Block F scope/setup завершён на current `main` `538084fd472c65459ad55ab30a0f96fbfdd68e56`; фактический аудит ещё не начат. Первый срез — **F1 Private object / download access / IDOR**.
9. Implementation PR, technical planner и implementer для remediation сейчас не назначены.
10. Cloudflare/Neon/production mutation по #315 не разрешена и не выполнялась.

## Индекс подтверждённых findings

1. `AUTH-LINK-01` — Moderate/P2.
2. `AUTH-SESSION-01` — Moderate/P2.
3. `AUTH-SESSION-02` — Low/P3.
4. `AUTH-SESSION-03` — Moderate/P2.
5. `AUTH-ENUM-01` — Moderate/P2.
6. `AUTH-OAUTH-01` — Low/P3.
7. `AUTH-REG-01` — Moderate/P2.
8. `AUTH-CACHE-01` — Low/P3.
9. `AUTHZ-FAIL-01` — Low/P3.
10. `COMPLAINT-PRIV-01` — Low/P3.
11. `HELP-SIGNAL-PRIV-01` — Low/P3.
12. `HISTORY-PRIV-01` — Low/P3.
13. `FORUM-PUB-01` — Moderate/P2; missing application-level upper bound для topic title / post body в create/reply/edit.
14. `READSTATE-CACHE-01` — Low/P3; shared `/:locale` parent/session projection plus unread/read-state public GET surfaces lack explicit `private, no-store`.
15. `PUBLIC-PROJECTION-01` — Low/P3; moderator-only Help `needs-review` / pending `disputed` metadata остаётся в public loader projection.
16. `DISCOVERY-BOUNDS-01` — Low/P3; Unanswered/Tags/Tag/Unread result sets не имеют page/cursor/limit.
17. `SEARCH-CONTROL-01` — Low/P3; NUL в public search query достигает PostgreSQL text parameter и уходит в generic 500 path.
18. `LOCALE-DEGRADED-WRITE-01` — Low/P3; canonical `/en/*` localized actions can execute while LocaleRegistry health is degraded instead of fail-closed.
19. `FORUM-READ-BOUNDS-01` — Moderate/P2; canonical public section/topic reads grow without page/row bounds and amplify DB/translation/SSR work with persistent forum growth.
20. `FORM-BODY-BOUNDS-01` — Moderate/P2; ordinary member forum/profile/presence POST paths fully parse form bodies without an application byte ceiling before semantic validation.

Ключевая causal path, impact и границы каждого finding находятся в соответствующем Block-файле.

## Отдельный подтверждённый review

1. Security review PR #317 exact head `d12719bc8e6b2e6368489c16f2e0efa9ef6e3605`: **PASS — 0 current-scope security defects**.
2. Review не подтвердил изменение ingress/auth/authz/DB/secrets/Stage-6 topology; PR добавлял outgoing AdministrativeRouting seam.
3. Future cross-origin producer/absolute-origin activation требует отдельного Stage-6 security design/acceptance; это не current defect.

## Открыто

1. **Block F scope/setup completed.** Отдельный `SECURITY_BLOCK_F_FILES_ATTACHMENTS.md` фиксирует current contract, attacker model, F1–F8 и Stage-6 exclusions.
2. Следующий bounded audit slice — **F1 Private object / download access / IDOR** на current `main` `538084fd472c65459ad55ab30a0f96fbfdd68e56`.
3. SA-02 factual docs closeout уже merged в current main; descendant `4248fed… → 538084f…` меняет только 8 Markdown docs, attachment runtime/schema не менялся.
4. Лира, Лёва и Марк сейчас не имеют активного назначения по #315.

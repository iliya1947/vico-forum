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
7. [G — Database & migrations](../SECURITY_BLOCK_G_DATABASE_MIGRATIONS.md)
8. [H — Cloudflare / Workers / runtime](../SECURITY_BLOCK_H_CLOUDFLARE_WORKERS_RUNTIME.md)

## Текущее подтверждённое состояние

1. Technical audit target B–D: `e279cb6c032a489a9044ca1191407df887c364b4`. Последующее изменение `main` `f6fd4b2c031b2132b04eace18704a59aed1dfec8` меняло только `AGENTS.md`, не audited application code.
2. Block A: target architecture/foundation boundaries зафиксированы; Stage-6 activation не выполнялась. **SA-02 #319 delta-recheck на current main PASS — 0 новых current-scope A findings**.
3. Block B: аудит завершён; **8 current-scope findings**. **SA-02 #319 delta-recheck PASS — 0 новых B findings; все 8 прежних findings остаются открытыми/неисправленными.** Remediation не назначена.
4. Block C: аудит завершён; **1 current-scope finding — `AUTHZ-FAIL-01 Low/P3`**. Remediation не назначена.
5. Block D: аудит D1–D12 завершён; подтверждены **3 findings — `COMPLAINT-PRIV-01`, `HELP-SIGNAL-PRIV-01`, `HISTORY-PRIV-01` (все Low/P3)**.
6. D12 corrected closeout: official React Router Framework/SSR docs и exact `react-router@8.3.1` source подтвердили default skip loader revalidation после 4xx/5xx; Vico explicit recovery refreshes loaders and does not automatically replay mutations.
7. Block E audit завершён: E2 PASS; E5 — **`FORUM-PUB-01 Moderate/P2`**; E6 — 0 additional; E7 — **`READSTATE-CACHE-01 Low/P3`**; E3 — **`PUBLIC-PROJECTION-01 Low/P3`**; E4 — **`DISCOVERY-BOUNDS-01 Low/P3`, `SEARCH-CONTROL-01 Low/P3`**; E8 PASS; E1 — **`LOCALE-DEGRADED-WRITE-01 Low/P3`** + расширение `READSTATE-CACHE-01`; E9 PASS; E10 — **`FORUM-READ-BOUNDS-01 Moderate/P2`, `FORM-BODY-BOUNDS-01 Moderate/P2`**. Block E total: **8 findings**. E10 проверен на current `main` `4248fed23925e4a23e48485d419ceaf0ce337def`; compare с предыдущим target подтвердил отсутствие изменений core Forum/translation E2–E9.
8. Block F на current `main` `538084fd472c65459ad55ab30a0f96fbfdd68e56`: **ЗАВЕРШЁН. Итог — 1 current-scope finding: `ATTACH-TEXT-TAIL-01 Low/P3`; F1/F2/F4/F5/F6/F7/F8 дополнительных findings не дали.** F8 перепроверил upload → publication → read → edit/remove → cleanup → evidence, включая lost ACK, measures, complaint evidence и runtime failures.
9. **Block G — Database & migrations ЗАВЕРШЁН. Final current-scope: 3 findings — `DB-SEARCHPATH-01 Low/P3`, `DB-ACL-USER-DELETE-01 Low/P3`, `DB-TEST-TARGET-01 Low/P3`.** G8 дал 0 новых findings и исправил Stage-классификацию `DB-RUNTIME-EVIDENCE-01 Low/P3`: технический defect подтверждён, но это **Stage-6 blocker, не current-scope**, пока external integration paused. Descendant delta до current `main` `5992885e78b1642e41c9805116fcc256002b649c` (SA-03 #324, index-only migration `0064`) перепроверен и итог не изменил.
10. **Block H — Cloudflare / Workers / runtime: H1–H3 PASS; H4/H5 = 0 current-scope findings + 2 deferred Stage-6 blockers; H6 PASS; H7 PASS, 0 additional findings/blockers** на current `main` `593a03964b8407b249f7c9f5eb117ddb8b07736d`. Delta от H6 target — SA-04 A1 #327 schema/tests only; H runtime/topology unchanged. H7 подтвердил отсутствие alternate repository deploy path и отделил mutable live Cloudflare topology от Git state; live recheck остаётся mandatory Stage-6 acceptance, не current finding. Следующий slice — H8 Cross-chain closeout.
11. Implementation PR, technical planner и implementer для remediation сейчас не назначены.
12. Cloudflare/Neon/production mutation по #315 не разрешена и не выполнялась.

## Индекс подтверждённых current-scope findings

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
21. `ATTACH-TEXT-TAIL-01` — Low/P3; text classification checks only the first 4096 bytes, so a later binary tail can still become `type-checked`/publishable without attachment security evidence.
22. `DB-SEARCHPATH-01` — Low/P3; Complaint predecessor trigger uses unqualified relation names under caller search path, so a current web-capability session with TEMP can shadow its validation tables and persist an unrelated predecessor Case.
23. `DB-ACL-USER-DELETE-01` — Low/P3; current web DB capability grants `DELETE` on `public.user`, but current Vico/Better Auth configuration has no enabled physical user-deletion operation, so the credential has unnecessary destructive authority.
24. `DB-TEST-TARGET-01` — Low/P3; destructive DB test guards validate WHATWG URL `hostname`/pathname but pass the original connection string to node-postgres, whose pinned parser accepts query-level `host` override, so an external `*_test` database can pass the claimed local-only guard and be destructively reset.

Ключевая causal path, impact и границы каждого finding находятся в соответствующем Block-файле.

## Подтверждённые deferred Stage-6 blockers

1. `DB-RUNTIME-EVIDENCE-01` — Low/P3; technical defect подтверждён: manual Worker rollout принимает historical `0020` evidence при current runtime dependency как минимум на `0058`. G8 установил, что verifier используется только paused Stage-6 rollout path, поэтому это не current-scope finding. Исправление обязательно до возобновления schema-dependent Worker rollout.
2. `WORKER-VERSION-URL-01` — Moderate/P2; manual Worker rollout создаёт Version URL для version с production `WEB_HYPERDRIVE`/auth configuration и использует его как unauthenticated pre-traffic smoke surface. Enabled Version URLs public and use production resources; `promote=false` оставляет uploaded version без cleanup. Current Stage не затронут, пока rollout paused. Correction gate — до следующего Stage-6 Worker upload с private/write production capability.
3. `WORKER-ROLLBACK-FINALIZER-01` — Moderate/P2; promotion и rollback/reconciliation зависят от lifetime одного GitHub runner/job. Timeout/cancel/runner loss после accepted 100% promotion может убить job до rollback и final status proof, оставив unaccepted version активной на 100%. Current Stage не затронут, пока rollout paused. Correction gate — до следующего production traffic promotion.

## Отдельный подтверждённый review

1. Security review PR #317 exact head `d12719bc8e6b2e6368489c16f2e0efa9ef6e3605`: **PASS — 0 current-scope security defects**.
2. Review не подтвердил изменение ingress/auth/authz/DB/secrets/Stage-6 topology; PR добавлял outgoing AdministrativeRouting seam.
3. Future cross-origin producer/absolute-origin activation требует отдельного Stage-6 security design/acceptance; это не current defect.

## Открыто

1. **Block F закрыт: 1 finding — `ATTACH-TEXT-TAIL-01 Low/P3`.** Remediation не назначена.
2. **Block G закрыт: 3 current-scope findings — `DB-SEARCHPATH-01 Low/P3`, `DB-ACL-USER-DELETE-01 Low/P3`, `DB-TEST-TARGET-01 Low/P3`; `DB-RUNTIME-EVIDENCE-01 Low/P3` сохранён отдельно как Stage-6 blocker.** Детальные causal chain и G8 reclassification находятся в `SECURITY_BLOCK_G_DATABASE_MIGRATIONS.md`.
3. Current H audit target: **`593a03964b8407b249f7c9f5eb117ddb8b07736d`**. Delta `ce62e783… → 593a0396…` — SA-04 A1 #327 migration/schema/tests only; H runtime/topology code unchanged. Source-of-truth docs пока всё ещё фиксируют `0064`/SA-04+ not implemented; это отдельный documentation drift вне H7.
4. **Block H H1–H3 PASS; H4/H5 = 0 current-scope findings + 2 deferred Stage-6 blockers; H6 PASS; H7 PASS, 0 additional.** Следующий bounded security step после продолжения владельца — **H8: Cross-chain closeout** на current main; после H8 остановиться.
5. H7 проверил repository deploy/topology seams и current official Cloudflare Wrangler/routing/Builds/Worker-Previews semantics; live Cloudflare topology не читался и не менялся, tests не запускались.
6. Exact `pg@8.23.0` query-timeout semantics и exact `drizzle-orm 0.45.2` transaction wrapper подтверждают, что lost/late COMMIT ACK возможен; current writers не auto-retry его. Locale отдельно reconciles; measures/Complaints/publication используют replay/CAS/idempotency.
7. `AuthorizationRepository.mutate()` rollback-error preservation слабее новых helpers, но current fail-open/security impact не доказан — finding не создаётся.
8. Advisory-lock compatibility с будущим real web Hyperdrive остаётся Stage-6 acceptance boundary; production web binding сейчас inactive/paused, поэтому это не current G5 finding.
9. Лира, Лёва и Марк сейчас не имеют активного назначения по #315.

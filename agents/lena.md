# agents/lena.md — личная рабочая память Лены

## Активное назначение

**AUTH-07 — первый final whole-feature review assembled authentication lifecycle.**

По прямому назначению владельца Лена / GPT-6.2 заменяет Лиру в первом whole-feature review.

1. Target: PR #388 exact `71cdb70d9a5a8b0d0efc3df724d62b736dff7601`.
2. Base: main `9f4c9c8d5e18f42db9b12cf23bc07322ef8f6432`.
3. Final automated gate уже PASS: CI #45926789854; 3342 + 1998 tests; auth whole-lifecycle 62/62; 20/20 applicable connected acceptance.
4. Полный scope и критерии: `stages/AUTH-07/PLAN.md`.
5. Проверить всю AUTH-01–AUTH-06 vertical + D-01–D-10, а не только свои прежние участки.
6. Review-only: implementation не менять; findings классифицировать; первый finding не завершает review.
7. Результат: `stages/AUTH-07/REVIEW.md` — PASS или HOLD с evidence; затем STOP для Миры.

### Independence boundary

Ты участвовала в AUTH-02a implementation и начинала AUTH-02b. Поэтому этот first whole-feature review **не является independent final technical review** и не закрывает independent gate.

При PASS следующим отдельным reviewer будет Марк / Codex-6 Sol на том же exact head. Merge/Stage-6 не выполнять.

## Прогресс AUTH-07

AUTH-07-A — baseline подтверждён. Actual #388 open/unmerged, head/base/main/tree соответствуют PLAN. Полные recursive trees без truncation: 1195 → 1260 entries, 65 added + 135 modified + 0 deleted = 200 changed paths. Service files/docs/dependencies/lockfile/wrangler unchanged; состав diff просмотрен, не содержимое всех файлов. CI #45926789854: оба jobs SUCCESS, первичные логи 140269856248 и 140269855936 подтверждают 3342/3342, 1998/1998, auth-whole-lifecycle 62/62; checkout merge-ref d28248dbdd915c748ce86b37e28c38f99ba116cb имеет identical tree и родителей exact main/head. Все 20 applicable acceptance workflows на exact head SUCCESS, control/skipped duplicates excluded. TASK, root PLAN, DECISIONS, AUTH-07 PLAN прочитаны; assembly/K5 RESULT изучены как evidence, не как собственный product review.

Следующая подзадача AUTH-07-B: source-of-truth main docs + полное содержательное review AUTH-01–06 по D-01–D-10, включая весь релевантный diff и связанные неизменённые seams. AUTH-07-C: полнота acceptance/matrix, K5 delta и Stage boundaries. AUTH-07-D: итоговый REVIEW.md и handoff. Это локальная декомпозиция работы Лены, не изменение технического плана. Whole-feature verdict пока не вынесен; критические invariants ещё не проверены. Новые CI не запускались. PR body #320 отстаёт от WORKFLOW.md; оперативный источник — WORKFLOW.md, не description.


### AUTH-07-B1 — core lifecycle / UI source review (часть B)

Exact implementation head 71cdb70d9a5a8b0d0efc3df724d62b736dff7601. Вновь прочитаны AGENTS main, RULES, WORKFLOW; проверены релевантные разделы PROJECT_STATE, ROADMAP, AUTHORIZATION, SETTINGS, SUPER_ADMIN, research/better-auth-1.7.7.md. Не заявляется полный аудит всей документации.

Прочитаны полностью exact-head: workers/auth-mail.ts, workers/app.ts; app/auth/auth-mail-contract.server.ts, auth-mail.server.ts, auth-mail-transports.server.ts, auth-mail-urls.server.ts, auth-mail-templates.server.ts, signup-verification-evidence.server.ts, email-verification-proof.server.ts, email-verification.server.ts, email-verification-endpoints.server.ts, lifecycle-plugin.server.ts, lifecycle-transaction.server.ts, lifecycle-state.server.ts, auth.server.ts, session-write-guard.ts, credential-lifecycle.server.ts, credential-lifecycle-proof.server.ts, credential-auth-endpoints.server.ts, own-session.server.ts, credential-lifecycle-endpoints.server.ts, account-security-lifecycle.server.ts, account-security-endpoints.server.ts, account-security-wire.server.ts, lifecycle-budget.server.ts, registration-challenge.server.ts, registration-challenge-admission.server.ts, registration-oauth-endpoints.server.ts, registration-admission.ts, session-context.ts, request-context.ts, account-security-view.tsx, credential-creation-view.tsx, credential-recovery-client.ts, credential-path.ts, auth-client.ts, credential-view.tsx, auth-controls.tsx; app/routes.ts, app/routes/auth-api.ts, verify-email.tsx, reset-password.tsx, resend-verification.tsx, forgot-password.tsx, settings-account.tsx, credential-sign-in.tsx, locale-boundary.tsx; app/root.tsx, app/settings/shell.tsx, app/forum/online-presence-heartbeat.tsx; db/account-state.ts; migrations 0073–0078 SQL, .env.example. Сверены релевантные участки actual Better Auth v1.7.7 sign-in, update-user, session, account, oauth2/link-account и callback. Прослежены boundaries mail/verification/recovery/create/change-email/unlink, lifecycle transaction/locked user/proof generation, HMAC budgets и challenge, Worker injection. Это source review, не новый runtime прогон, не окончательное подтверждение всех invariants.

**F-B1-01 — confirmed current-scope functional UI defect (static source evidence):** app/auth/credential-creation-view.tsx:24–46 отправляет create-password через raw fetch (credential-recovery-client.ts), показывает Password changed и меняет только локальные created/result/canSubmit. Revalidation loader отсутствует. app/routes/settings-account.tsx:152–164,180–208,213–235 читает linkedMethods/hasPassword/sessions из старого loader snapshot; после successful create на той же странице новый password method и change-password controls отсутствуют, другие отозванные sessions при наличии остаются в списке. Root, locale-boundary, SettingsShell и HeaderAuthProvider не обновляют эти данные по результату raw fetch. Heartbeat revalidates только при 401/409 либо successful homepage ping, а не successful password creation на Settings (online-presence-heartbeat.tsx:25–34). Connected browser tests/browser/auth-02b/check.py:311–335 проверяет success text, session identity и DB rows, но не актуальность экрана; затем до email-change выполняет goto Settings заново (около строки 347). Поэтому green acceptance не доказывает корректную presentation. Current scope: AUTH-03 create-password и D-04 account management, не future Stage-6. Не утверждается новый security bypass или воспроизведённый runtime failure; дефект следует из source dataflow.

Дополнительная гипотеза для последующей проверки: CredentialCreationView capture effect только при proof.current===undefined и зависит от enabled; после consume/failure ref=null, новый fragment при навигации в том же документе не обрабатывается (в отличие от AccountLifecycleView hashchange). Проверить именно connected scenario/contract, не считать отдельным подтверждённым finding до этого. Native OAuth link callback signed state содержит userId/email, но не sessionId; сопоставить с main baseline, принятыми требованиями и stale semantics, не объявлять регрессию автоматически. Native session revocations freshness policy аналогично отличать от SET-05 facade, который использует fresh listSessions.

**Остаток AUTH-07-B:** telemetry/History/Monitoring writers, collectors, projections, labels; schema/manifest/runtime grants cross-check, remaining relevant diff including localization/forum UI, проверить privacy and source-level edge cases. Далее C — actual tests/matrix/K5/stage; D — whole verdict. Первый finding не завершает review. Implementation не менялась, CI не перезапускался. AUTH-07-B целиком ещё не завершён, PASS/HOLD не присвоен. Следующий шаг B2.

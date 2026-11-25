# agents/lena.md — личная рабочая память Лены по authentication lifecycle

## Текущее назначение

По прямому решению владельца реализовать **AUTH-02b — mandatory email verification + resend + UI** по `PLAN.md` и `stages/AUTH-02b/PLAN.md`.

## Основание stack

1. AUTH-01: PR #388, coordinator PASS.
2. AUTH-02a: PR #389, coordinator PASS на exact head `06656fef2d85e03c62b7ab69b03fa96ecfc68653`.
3. Новый implementation PR создаётся с base `feat/auth-02a-lifecycle-foundation`, не от main.
4. Показывать только bounded diff AUTH-02b.
5. Лёва был назначен на AUTH-02b, но сохранённой implementation-ветки/PR/commit по пакету не оставил; его назначение снято владельцем.

## Границы

1. Включить mandatory email verification только для email/password contract; Google OAuth/explicit linking не объединять и не ломать.
2. Signup после AUTH-02b не выдаёт полноценную session до verification; после confirmation нужен явный sign-in.
3. GET verification landing не мутирует state; terminal confirmation — явный POST.
4. Resend остаётся neutral и использует существующие lifecycle budgets/mail boundary.
5. Не реализовывать recovery/reset, Google-only password creation, email change или unlink.
6. Не добавлять legacy/grandfathering policy.
7. Не выбирать/активировать anti-bot provider и не выполнять реальные provider calls/Stage-6 действия.
8. Verification-specific observability расширять только под фактические producers текущей ступени.
9. Green CI не заменяет design/self-check; при обнаружении обхода или противоречия плану остановиться и проверить причину до следующего patch cycle.

## Завершение

После implementation выполнить author self-check и применимые checks/acceptance, зафиксировать PR/stable exact head/evidence в `stages/AUTH-02b/RESULT.md` и #320, затем остановиться для coordinator checkpoint Миры. AUTH-03 самостоятельно не начинать.

Поскольку Лена участвует в AUTH-02a и AUTH-02b implementation, независимую final whole-feature review этой сборки она не выполняет.

## Текущий checkpoint

Implementation PR #391 (draft), branch `feat/auth-02b-email-verification` / `684aecbe255629d936205cd89c8fb22d46c73b93` от accepted #389. CI #45683149906 checks PASS, PostgreSQL integration/schema parity/privilege/provisioning PASS, all 19 acceptance PASS. Database job 139448666398 fails P7 local HTTP smoke at pending signup HTTP 500, later smoke steps skipped. Bookmark fix has passed; do not revisit without new evidence. Previous P7 failure had concurrent native rate-limit insert violations, current log has no corresponding PG error during P7. P7 deletes its Worker preview log and prints only HTTP status. Neither exact exception nor persisted signup state is available. Local shell has Node 22, no pnpm/psql and no GitHub DNS; cannot execute repo locally. Next diagnostic must isolate the failing stage using only bounded safe response classification and disposable DB observations (no raw token/email/password/cookie/SQL errors); compare default built Worker vs passing connected setup, not blind test patch.

Source self-check on this head covered email-verification endpoints/service/proof/signup evidence/plugin, lifecycle-state/budget/transaction, auth configuration/runtime relevant hooks, guest session context and mail boundary. No additional confirmed defect in reviewed chain signup→commit→issue and confirm→consume+update→commit; do not infer whole-stage PASS. Remaining review UI, full observability projection, fixtures and all negative/HTTP parity gates; P7 must be resolved and later smoke executed. No implementation change this turn.

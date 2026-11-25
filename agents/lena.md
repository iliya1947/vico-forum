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

Branch `feat/auth-02b-email-verification` / `f98346c8184b6cd3196029f266fcf7aedb12acfe` от accepted #389. Verification implementation, native + connected fixtures and connected acceptance code written. Tests not run. Next: completeness/author self-check, corrections, implementation PR, exact-head CI/acceptance. См. stages/AUTH-02b/RESULT.md. No implementation PR, no CI, no external activation.

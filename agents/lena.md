# agents/lena.md — личная рабочая память Лены по authentication lifecycle

## Текущее назначение

STOP. Владелец снял Лену с продолжения AUTH-02b и поручил полную проверку Лёве вместо Лены. Handoff Мире; актуальный маршрут WORKFLOW.md. AUTHOR PASS отсутствует.

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

Лена прекращает изменения и проверку. Текущий результат и blocker сохранены в stages/AUTH-02b/RESULT.md. Не выполнять дальнейших действий без нового назначения.

## Итог handoff

#391 exact `bbd35cb60273a2a90cce7aea997d50e4f42943cf`; CI #45684578593 FAIL на P7. Контекст и evidence в WORKFLOW.md и stages/AUTH-02b/RESULT.md. Полная самопроверка не завершена.

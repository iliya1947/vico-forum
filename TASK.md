# TASK.md — цель, границы, крупная структура и критерии завершения задачи authentication lifecycle

## Цель

Довести пользовательскую authentication/session систему Vico Forum от текущего Better Auth foundation до полного безопасного lifecycle для email/password + Google, подготовленного и проверенного в repository/local-CI, а внешние провайдеры и production/deployed activation выполнить только в разрешённой фазе Stage 6.

## Текущая продуктовая структура задачи

1. Mail foundation для auth-писем через единый Vico boundary с поддержкой Resend и Brevo.
2. Обязательное подтверждение email для email/password регистрации.
3. Password recovery/reset и безопасное создание password method для Google-only аккаунта.
4. Завершение own Account & security lifecycle: email/status, email change, password, Google link/unlink, own sessions.
5. Anti-abuse foundation и подготовка Turnstile boundary без внешней активации до Stage 6.
6. Единая lifecycle/security acceptance, включая negative/adversarial сценарии.
7. Pre-Stage-6 security gate.
8. Отдельный docs closeout после реализации.
9. Внешняя активация auth-провайдеров и deployed acceptance — только после отдельного возобновления Stage 6 владельцем.

## Обязательные границы

1. Better Auth остаётся authentication/session provider; application authorization остаётся отдельным server-side слоем.
2. Automatic/implicit linking Google ↔ email/password запрещён; linking только явный из собственного authenticated account.
3. Текущие AccountState, Owner monitoring/History, registration settings и SET-05 должны переиспользоваться, а не обходиться параллельной реализацией.
4. Реальные Resend/Brevo credentials, DNS, outbound provider calls, Turnstile, production Google OAuth и edge rate-limit rules не активируются до Stage 6.
5. Не расширять задачу до account physical deletion/anonymization, 2FA/passkeys, дополнительных OAuth providers, automatic provider failover или собственного risk engine без отдельного решения владельца.

## Критерий завершения текущей repository/local-CI части

1. Утверждён полный технический план всей задачи против актуального `main`.
2. Все утверждённые bounded/stacked implementation stages реализованы и прошли предусмотренный review cycle.
3. Verification/recovery/linking/account-security/session/anti-abuse invariants проверены как единый lifecycle.
4. Pre-Stage-6 security gate имеет PASS.
5. Постоянные документы обновлены отдельным docs PR по фактически реализованному состоянию.
6. Внешняя Stage-6 часть остаётся заблокированной до отдельной команды владельца и не считается выполненной repository/local-CI работой.

# DECISIONS.md — действующие решения владельца и команды по authentication lifecycle

## Действующие решения

1. **D-01 — Mandatory verification.** Email/password регистрация должна требовать подтверждения email до полноценного credential access.
2. **D-02 — Google остаётся login method.** Google OAuth сохраняется как дополнительный способ входа.
3. **D-03 — Explicit linking only.** Совпадение email само по себе никогда не объединяет Google и email/password identities; linking выполняется только явно из собственного authenticated account.
4. **D-04 — Full own Account & security.** Целевой первый полный auth package включает current email/status, email change, password change/creation, Google connect/disconnect и own session management с защитой от удаления последнего метода входа.
5. **D-05 — Physical deletion отдельно.** Account physical deletion/anonymization не входит в эту задачу. Уже реализованный AccountState/deactivation является отдельным существующим lifecycle и должен учитываться, но не расширяет scope до purge.
6. **D-06 — 2FA/passkeys позже.** 2FA и passkeys не входят в текущую задачу.
7. **D-07 — Resend + Brevo через один boundary.** Оба провайдера поддерживаются единым Vico mail boundary; одновременно активен один provider; automatic failover на первом этапе не используется.
8. **D-08 — External activation только Stage 6.** Реальные provider accounts/keys/DNS, outbound mail, anti-bot provider resources, production Google OAuth и edge rate-limit configuration подключаются только после отдельного возобновления Stage 6 владельцем. Конкретный anti-bot provider этим решением не выбран.
9. **D-09 — Security встроена в lifecycle.** Security/failure/adversarial acceptance является частью каждого auth этапа и общего gate, а не отдельной будущей «доработкой безопасности».
10. **D-10 — Отдельный service channel.** #320 — служебный PR authentication lifecycle. Другие security/admin PR могут быть источниками контекста, но не заменяют этот рабочий канал.

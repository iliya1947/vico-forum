# agents/leva.md — личная рабочая память Лёвы по authentication lifecycle

## Текущее назначение

AUTH-03 / PR #392 получил **COORDINATOR HOLD** на exact head `ce75ff3629a4adae9941703a33f6d0366bd7f570`.

Сначала разрешить техническое противоречие accepted root PLAN ↔ implementation; затем отдельным correction package закрыть все confirmed current-scope findings. Во время reconciliation не наращивать workaround chain.

## Confirmed findings

1. **Change-password не делает recovery stale.**
   - `credentialChangePassword()` сериализует native SET-05 change с reset, но после успешной обычной смены пароля не инвалидирует pending `password-reset/password-create` lifecycle state.
   - Accepted PLAN требует: после credential/password change старые recovery/password-create operations invalid; в race второй caller перечитывает основание первого commit и stale operation denied.
   - Текущие race tests доказывают только порядок reset-first. Change-first оставляет ранее выданный reset proof пригодным для последующего overwrite нового пароля и session revocation.
   - Требуется исправить в одной transaction с успешной SET-05 password change и проверить оба порядка гонки.

2. **Recovery token architecture расходится с accepted root PLAN.**
   - Root PLAN требует native Better Auth 1.7.7 random reset token / verification storage, связанный с Vico state, с supported hashed reset-token identifier storage.
   - #392 вместо этого использует `signCredentialProof()` JWT и deterministic Vico lifecycle verification row; native reset issuance/storage не используется.
   - Tagged Better Auth 1.7.7 source повторно подтверждён: native request создаёт random `reset-password:<token>` verification value, terminal consume использует single-use row.
   - Stage AUTH-03 PLAN не объявлял supersede этого root contract.
   - До реализации correction определить технически правильный вариант. Если принятому PLAN нужен пересмотр — сначала исправить PLAN и зафиксировать причину; нельзя молча считать implementation новой архитектурой.

3. **AUTH-03 observability contract неполон.**
   - `credential-lifecycle-endpoints.deliver()` реально отправляет `password-reset/password-create` mail, но не пишет `integration.authMailOutcome`.
   - `operational-facts.ts` и Integrations projection всё ещё допускают только `mailPurpose: "email-verification"` / `verificationMail`.
   - Root PLAN требует mail outcome по фактическому purpose/provider/outcome по мере появления producer.
   - Также `auth.passwordChanged` добавляет только optional `context:"reset"`, тогда как accepted closed contract предусматривает `change` для existing SET-05 producer и `reset` для recovery.
   - Исправить без raw email/token/provider errors и без outbound probes.

## Остальной review

Самостоятельно проверены neutral forgot eligibility, AccountState/transaction ordering, password-create session binding/freshness, raw credential/session mutation atomicity, no-auto-session reset, session revocation, Google preservation, common lifecycle budgets, sensitive URL/form handling, attempt operations/migration 0076, direct/HTTP paths и отсутствие AUTH-04 scope expansion. Дополнительных confirmed current-scope blockers не установлено.

## Завершение correction

После plan reconciliation и coherent correction package:
1. полный author self-check всего bounded AUTH-03;
2. tests должны включать change-password-first vs pending reset и обратный порядок;
3. observability/mail regression по reset/create;
4. применимые exact-head CI/acceptance;
5. новый stable head + RESULT;
6. STOP для повторного coordinator checkpoint Миры.

AUTH-04 самостоятельно не начинать.

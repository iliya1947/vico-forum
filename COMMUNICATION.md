# COMMUNICATION.md — общий актуальный контекст, факты, ограничения, зависимости и незакрытые вопросы команды

## Общий контекст

1. Полный технический план authentication lifecycle `AUTH-01–AUTH-07` принят coordinator review; delivery mode — stacked `AUTH-01 → AUTH-02a → AUTH-02b → AUTH-03 → AUTH-04 → AUTH-05 → AUTH-06`, затем AUTH-07 final gate.
2. Target contract D-01: email/password требует обязательного подтверждения email; legacy/grandfathering policy для гипотетических production users не вводится. Возможный external cutover проверяется только перед отдельно разрешённым Stage 6.
3. Better Auth остаётся authentication/session provider; implicit Google↔credential linking запрещён. Existing SET-02 registration policy относится только к fresh create-user и не должна блокировать login/verification/recovery/linking существующего account.
4. AccountState, Owner History/Monitoring, Settings Account & security и существующие registration/session boundaries переиспользуются; второй auth backend не создаётся.
5. Конкретный anti-bot provider не выбран. Provider-neutral challenge boundary не означает обязательную Stage-6 активацию.
6. Реальные Resend/Brevo credentials, DNS, provider calls, production Google OAuth/Owner binding и иные external actions остаются заблокированными до отдельного Stage-6 решения владельца.

## Принятые stacked-ступени

1. **AUTH-01 / PR #388** — mail foundation; coordinator PASS на `e18fdb189d3c6a0a9ad913df398530a6cd69bb6a`.
2. **AUTH-02a / PR #389** — lifecycle transaction/state/constraints/budgets foundation; coordinator PASS на `06656fef2d85e03c62b7ab69b03fa96ecfc68653`.
   - исходный общий storage Vico budgets в native `rate_limit` признан ошибкой плана;
   - итоговый contract использует отдельную `auth_lifecycle_budget` с explicit expiry, сохраняя native Better Auth limiter;
   - единый transaction owner и sequencing correction приняты;
   - подробный итог: `stages/AUTH-02a/RESULT.md`; техническое storage-решение: `stages/AUTH-02a/STORAGE-DECISION.md`.
3. **AUTH-02b — correction/finalization ACTIVE у Лёвы.** Full review завершён HOLD с тремя confirmed findings: built-preview auth binding, SSR resend email leakage, locale/generation ordering. Входной head #391 `bbd35cb60273a2a90cce7aea997d50e4f42943cf`; AUTHOR PASS отсутствует. После correction и coordinator PASS Лёва остаётся исполнителем AUTH-03 → AUTH-06.

## Существенные технические зависимости следующих этапов

1. Verification/recovery/change/unlink обязаны использовать AUTH-02a transaction/state/budget primitives и сохранять AccountState ordering.
2. Verification token/state должен быть purpose/subject/generation-bound; GET landing не выполняет terminal mutation.
3. Recovery не может использоваться как anonymous создание password method для Google-only account; password creation остаётся own authenticated flow AUTH-03.
4. Last-usable-method invariant и email change относятся к AUTH-04, не к текущему AUTH-02b.
5. Closed auth facts/attempt telemetry расширяются только одновременно с реальным producer соответствующей ступени; rollback/zero-row/uncertain outcome не создают ложный success fact.
6. Green CI является подтверждающим evidence, а не основанием считать архитектурную предпосылку доказанной.

## Текущий переход

Лёва исправляет три confirmed findings и доводит AUTH-02b #391 до coherent stable head. После полного author self-check и exact-head checks он останавливается для coordinator checkpoint Миры. AUTH-03 начинается только после PASS AUTH-02b.

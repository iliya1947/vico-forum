# PLAN.md — актуальный полный технический план задачи, её этапы, зависимости и критерии готовности

## Статус

**PRODUCT SCOPE REVALIDATED — FULL TECHNICAL PLAN REQUIRED.**

Независимая revalidation Лены на main `9f4c9c8d5e18f42db9b12cf23bc07322ef8f6432` завершена PASS для продуктовой декомпозиции. Все AUTH-01–AUTH-07 сохраняются; подробные актуальные зависимости и существующие primitives зафиксированы в COMMUNICATION.md. Прежний технический план только AUTH-01 подготовлен против старого main и не является действующим полным планом.

Реализация не назначается до полного технического планирования и определения режима поставки.

## Утверждённая рабочая декомпозиция

1. **AUTH-01 — Mail foundation:** provider-neutral auth mail boundary, Resend/Brevo adapters, fake/test transport, без внешней активации.
2. **AUTH-02 — Mandatory email verification:** verification lifecycle, resend UX/rate limits, replay/expiry/failure semantics.
3. **AUTH-03 — Recovery / set-password:** forgot/reset и verified password creation для Google-only account.
4. **AUTH-04 — Account & security completion:** email/status/change, password creation path (shared AUTH-03), Google unlink, last-login-method protection; переиспользовать existing SET-05 password change, Google linking и own session controls.
5. **AUTH-05 — Anti-abuse foundation:** registration challenge boundary, применимые rate limits поверх существующего Better Auth DB-backed foundation, Stage-6 Turnstile seam.
6. **AUTH-06 — Security + lifecycle acceptance:** positive и adversarial end-to-end acceptance всей системы.
7. **AUTH-07 — pre-Stage-6 security gate:** итоговая проверка identity isolation, recovery, linking, session, abuse и fail-closed invariants.
8. **Docs closeout:** отдельный PR после implementation.
9. **Stage 6 external activation:** отдельный заблокированный этап после явного возобновления Stage 6 владельцем.

## Что должен определить новый полный технический план

Лёва проектирует всю задачу целиком против актуального main:

1. этапы и зависимости между AUTH-01–AUTH-07;
2. существующие точки интеграции Better Auth, SET-05, AccountState, registration admission, Owner auth facts/attempt telemetry/History и Worker runtime — см. COMMUNICATION.md;
3. необходимость или отсутствие schema/dependency/public-contract изменений;
4. security/failure/race invariants каждого этапа;
5. test/CI/browser/connected acceptance каждого этапа;
6. границы самостоятельных/зависимых этапов, позволяющие Мире определить delivery mode по AGENTS.md;
7. критерии готовности каждого этапа и всей feature.

Не переносить автоматически решения старого AUTH-01 плана.

## Историческая ссылка

Предыдущий служебный head со старой структурой и техническим планом AUTH-01:
`2b367daa193c7bfe697f8bbe9681bfbf5e4b9c10`.

Только исторический материал, не текущий source of truth.

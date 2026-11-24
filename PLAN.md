# PLAN.md — актуальный полный технический план задачи, её этапы, зависимости и критерии готовности

## Статус

**REPLAN REQUIRED.**

Предыдущая продуктовая декомпозиция AUTH-01–AUTH-07 сохраняется как утверждённая рабочая модель задачи, но прежний технический план только AUTH-01 был подготовлен 2026-11-10 против старого `main` и больше не является актуальным техническим планом всей задачи по действующему регламенту.

До завершения повторной проверки scope и нового полного технического планирования реализация не назначается.

## Утверждённая рабочая декомпозиция

1. **AUTH-01 — Mail foundation:** provider-neutral auth mail boundary, Resend/Brevo adapters, fake/test transport, без внешней активации.
2. **AUTH-02 — Mandatory email verification:** verification lifecycle, resend UX/rate limits, replay/expiry/failure semantics.
3. **AUTH-03 — Recovery / set-password:** forgot/reset и verified password creation для Google-only account.
4. **AUTH-04 — Account & security completion:** email/status/change, password creation path, Google unlink, last-login-method protection, существующие session controls.
5. **AUTH-05 — Anti-abuse foundation:** registration challenge boundary, применимые rate limits, Stage-6 Turnstile seam.
6. **AUTH-06 — Security + lifecycle acceptance:** positive и adversarial end-to-end acceptance всей системы.
7. **AUTH-07 — pre-Stage-6 security gate:** итоговая проверка identity isolation, recovery, linking, session, abuse и fail-closed invariants.
8. **Docs closeout:** отдельный PR после implementation.
9. **Stage 6 external activation:** отдельный заблокированный этап после явного возобновления Stage 6 владельцем.

## Что должен определить новый полный технический план

После revalidation scope Лёва должен спроектировать всю задачу целиком против актуального `main`, включая:

1. этапы и зависимости между AUTH-01–AUTH-07;
2. существующие точки интеграции Better Auth, SET-05, AccountState, registration admission, Owner auth facts/attempt telemetry/History и Worker runtime;
3. необходимость или отсутствие schema/dependency/public-contract изменений;
4. security/failure/race invariants каждого этапа;
5. test/CI/browser/connected acceptance каждого этапа;
6. режим поставки — независимые PR или stacked-цепочка;
7. критерии готовности каждого этапа и всей feature.

Технический план не должен автоматически переносить решения из старого AUTH-01 плана, если текущий `main` изменил их основания.

## Историческая ссылка

Предыдущий служебный head со старой структурой и техническим планом AUTH-01:
`2b367daa193c7bfe697f8bbe9681bfbf5e4b9c10`.

Он используется только как исторический материал при необходимости, не как текущий source of truth.

# Лира — authentication lifecycle

## Current assignment

Реализовать **AUTH-01 — Mail foundation** по утверждённому product plan и техническому плану Лёвы в `.github/agents/codex-6.1-sol.md`.

## Требуемый результат

1. Отдельный bounded implementation PR от актуального `main`.
2. Provider-neutral auth mail boundary для `email-verification` и `password-recovery`.
3. Resend и Brevo adapters как Workers-compatible HTTP mapping через injected transport, без реальной сети/provider credentials.
4. Fake/test transport только для local/CI.
5. Test-local Better Auth callback integration для доказательства совместимости с pinned version; рабочие production callbacks не подключать в AUTH-01.
6. Сохранить существующие signup/sign-in/linking/session/registration semantics.
7. Не добавлять schema/migrations/dependencies/public AuthRuntime changes без подтверждённой технической необходимости.
8. Не подключать Resend/Brevo/Turnstile/production Google OAuth/edge rules: external activation только Stage 6.
9. Выполнить применимые tests/checks из плана Лёвы и зафиксировать stable exact head + evidence в #320.

## Security boundary

1. Не логировать verification/reset secrets/action URLs.
2. Не возвращать raw provider responses/errors/secrets клиенту.
3. Без automatic provider fallback/retry.
4. Fake transport не должен становиться production option.
5. Invalid config/input и ambiguous delivery не считать success.

После завершения implementation не проводить whole-PR review собственной работы; следующий reviewer — Мира.

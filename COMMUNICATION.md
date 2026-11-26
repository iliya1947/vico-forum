# COMMUNICATION.md — общий актуальный контекст, факты, ограничения, зависимости и незакрытые вопросы команды

## Общий контекст

1. Полный технический план authentication lifecycle `AUTH-01–AUTH-07` принят coordinator review; delivery mode — stacked `AUTH-01 → AUTH-02a → AUTH-02b → AUTH-03 → AUTH-04 → AUTH-05 → AUTH-06`, затем AUTH-07 final gate.
2. Email/password target contract требует mandatory verification; legacy/grandfathering для гипотетических production users не вводится.
3. Better Auth остаётся authentication/session provider; implicit Google↔credential linking запрещён.
4. AccountState, Owner History/Monitoring, Settings Account & security и registration/session boundaries переиспользуются.
5. Конкретный anti-bot provider не выбран. Provider-neutral challenge contract реализован repository/local-CI без внешней активации.
6. Реальные Resend/Brevo credentials, DNS, provider calls, anti-bot resources, production Google OAuth/Owner binding и Stage-6 actions остаются заблокированными.

## Принятые stacked-ступени

1. AUTH-01 / PR #388 — coordinator PASS.
2. AUTH-02a / PR #389 — coordinator PASS; отдельный `auth_lifecycle_budget` с explicit expiry принят вместо shared native `rate_limit`.
3. AUTH-02b / PR #391 — coordinator PASS.
4. AUTH-03 / PR #392 — coordinator PASS.
5. AUTH-04 / PR #393 — corrected exact head `e9f8bad85694321f3279a72b604546a813a856b8`: AUTHOR PASS + COORDINATOR PASS.
6. AUTH-05 / PR #394 — exact head `ac59e3d2e693d27806ebe732e4a52e79cd2fd3e0`: **AUTHOR PASS + COORDINATOR PASS**. CI #45825184525 PASS; 20/20 applicable connected acceptance PASS; confirmed current-scope blockers — 0.

AUTH-05 завершила server-owned budgets, HTTP/Settings/direct parity, trusted-network semantics, provider-neutral registration challenge, config/failure/privacy и adversarial coverage. Turnstile или иной provider, SDK/widget/sitekey/secrets и external activation не включены.

## Текущий переход

AUTH-06 ещё не активирована. Следующая ступень — whole-lifecycle/security acceptance поверх accepted AUTH-05; её activation выполняется отдельным переходом. До этого Лёва STOP.

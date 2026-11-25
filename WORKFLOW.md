# WORKFLOW.md — текущее оперативное состояние, назначения, блокеры и следующий переход

## Текущее состояние

1. Service PR **#320**, branch `service/authentication-lifecycle`; не merge в main.
2. Full plan AUTH-01–AUTH-07: **COORDINATOR PASS**. Delivery mode: stacked AUTH-01 → AUTH-02a → AUTH-02b → AUTH-03 → AUTH-04 → AUTH-05 → AUTH-06; AUTH-07 final gate.
3. AUTH-01: PR #388, stable head `e18fdb189d3c6a0a9ad913df398530a6cd69bb6a`; coordinator checkpoint PASS.
4. AUTH-02a: PR #389, stable exact head `06656fef2d85e03c62b7ab69b03fa96ecfc68653`; author PASS + coordinator PASS, 0 confirmed current-scope defects.
5. AUTH-01 и AUTH-02a остаются intermediate stacked PRs: без merge в main и без independent intermediate review.
6. Активный bounded-этап: **AUTH-02b — mandatory email verification + resend + UI**.
7. По прямому решению владельца от 2026-11-25 Лена прекращает работу над AUTH-02b; полную проверку вместо неё выполняет Лёва (техническая эскалация). Сейчас работа передана Мире для координации этого назначения, НЕ как AUTHOR PASS.
8. AUTH-02b #391 (draft), stable current head `bbd35cb60273a2a90cce7aea997d50e4f42943cf`, base #389 `06656fef2d85e03c62b7ab69b03fa96ecfc68653`. CI #45684578593: checks PASS, DB tests 121/121 files 1875/1875 tests PASS, database job FAIL at P7 HTTP smoke; downstream smoke skipped. Diagnostic: HTTP 500, auth-unexpected-error, budget_rows=0, budget_spends=0, native_signup_buckets=1, registration_open=true, users=credentials=proofs=sessions=0. Cause not established. Previous head `684aecbe255629d936205cd89c8fb22d46c73b93` all 19 connected acceptance PASS; not evidence for latest head. AUTHOR PASS absent.
9. Scope AUTH-02b: обязательная verification email/password, no-session signup, explicit POST confirmation, resend и пользовательская presentation; recovery/password-create/email-change/unlink остаются последующими ступенями.
10. Реальные mail/anti-bot/Google production resources и Stage-6 activation остаются заблокированными.
11. Лёва участвовал в AUTH-01, Лена в AUTH-02a/02b; оба исключены из independent final whole-feature review. Назначение Лёвы сейчас — техническая проверка по прямому решению владельца, не final independent review.

## Следующий переход

**Мира — принять handoff незавершённого AUTH-02b и организовать полную техническую проверку Лёвой вместо Лены по прямой команде владельца.** Проверить весь scope AUTH-02b против `PLAN.md`, `stages/AUTH-02b/PLAN.md`, актуального baseline и существующих интеграций, не ограничиваться P7 и не считать green CI доказательством корректности. Лёва самостоятельно устанавливает findings; отдельный этап исправлений после проверки по регламенту. Диагностическое evidence и история в `stages/AUTH-02b/RESULT.md`. Лена STOP. Не начинать AUTH-03, merge, final review или external activation до закрытия AUTH-02b.

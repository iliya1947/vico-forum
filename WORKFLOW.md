# WORKFLOW.md — текущее оперативное состояние, назначения, блокеры и следующий переход

## Текущее состояние

1. Service PR **#320**, branch `service/authentication-lifecycle`; не merge в main.
2. Full plan AUTH-01–AUTH-07: **COORDINATOR PASS**. Delivery mode: stacked AUTH-01 → AUTH-02a → AUTH-02b → AUTH-03 → AUTH-04 → AUTH-05 → AUTH-06; AUTH-07 final gate.
3. AUTH-01: PR #388, stable head `e18fdb189d3c6a0a9ad913df398530a6cd69bb6a`; coordinator checkpoint PASS.
4. AUTH-02a: PR #389, stable exact head `06656fef2d85e03c62b7ab69b03fa96ecfc68653`; author PASS + coordinator PASS, 0 confirmed current-scope defects.
5. AUTH-01 и AUTH-02a остаются intermediate stacked PRs: без merge в main и без independent intermediate review.
6. Активный bounded-этап: **AUTH-02b — mandatory email verification + resend + UI**.
7. По прямому решению владельца Лёва завершил полную техническую проверку AUTH-02b и теперь активирован как исполнитель отдельного correction/finalization этапа. Review завершён HOLD: три подтверждённых current-scope finding в `stages/AUTH-02b/RESULT.md`.
8. AUTH-02b #391 (draft), stable current head `bbd35cb60273a2a90cce7aea997d50e4f42943cf`, base #389 `06656fef2d85e03c62b7ab69b03fa96ecfc68653`. CI #45684578593: checks PASS, DB tests 121/121 files 1875/1875 tests PASS, database job FAIL at P7 HTTP smoke; downstream smoke skipped. Diagnostic: HTTP 500, auth-unexpected-error, budget_rows=0, budget_spends=0, native_signup_buckets=1, registration_open=true, users=credentials=proofs=sessions=0. Причина P7 подтверждена локально: built preview не получает auth binding из корневого `.dev.vars`, созданного после сборки. Неизменённый P7 прошёл локально после подачи тестовых переменных в каталог собранного Worker. Previous head `684aecbe255629d936205cd89c8fb22d46c73b93` all 19 connected acceptance PASS; not evidence for latest head. AUTHOR PASS absent.
9. Scope AUTH-02b: обязательная verification email/password, no-session signup, explicit POST confirmation, resend и пользовательская presentation; recovery/password-create/email-change/unlink остаются последующими ступенями.
10. Реальные mail/anti-bot/Google production resources и Stage-6 activation остаются заблокированными.
11. Лёва участвовал в AUTH-01, Лена в AUTH-02a/02b; оба исключены из independent final whole-feature review. По прямому решению владельца Лёва теперь ведёт дальнейшую реализацию authentication lifecycle: сначала полная техническая проверка текущего AUTH-02b, затем отдельным implementation-этапом его исправления/доведение, а после принятия AUTH-02b — последующие AUTH-03 → AUTH-06.

## Следующий переход

**Лёва — ACTIVE: отдельная фаза исправления и доведения AUTH-02b #391.** Входной head `bbd35cb60273a2a90cce7aea997d50e4f42943cf`. Исправить только три подтверждённых finding из `stages/AUTH-02b/RESULT.md`: built-preview auth binding для P7/аналогичных smoke, SSR resend email leakage через GET, locale-validation/generation ordering. После исправлений провести author self-check всего bounded AUTH-02b и применимые exact-head CI/acceptance, записать stable head/evidence и остановиться для coordinator checkpoint Миры. AUTH-03 не начинать до PASS.

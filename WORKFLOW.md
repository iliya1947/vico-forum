# WORKFLOW.md — текущее оперативное состояние, назначения, блокеры и следующий переход

## Текущее состояние

1. Service PR **#320**, branch `service/authentication-lifecycle`; не merge в main.
2. Full plan AUTH-01–AUTH-07: **COORDINATOR PASS**. Delivery mode: stacked AUTH-01 → AUTH-02a → AUTH-02b → AUTH-03 → AUTH-04 → AUTH-05 → AUTH-06; AUTH-07 final gate.
3. AUTH-01: PR #388, stable head `e18fdb189d3c6a0a9ad913df398530a6cd69bb6a`; coordinator checkpoint PASS.
4. AUTH-02a: PR #389, stable exact head `06656fef2d85e03c62b7ab69b03fa96ecfc68653`; author PASS + coordinator PASS, 0 confirmed current-scope defects.
5. AUTH-01 и AUTH-02a остаются intermediate stacked PRs: без merge в main и без independent intermediate review.
6. Активный bounded-этап: **AUTH-02b — mandatory email verification + resend + UI**.
7. Лёва завершил correction/finalization и AUTHOR PASS, но coordinator checkpoint Миры на exact head `4fbf8e829fd18c7190a540eade17bdf543a406d3` дал **HOLD**: подтверждён 1 current-scope security defect в credential UI.
8. AUTH-02b #391 (draft), stable exact head `4fbf8e829fd18c7190a540eade17bdf543a406d3`, base #389 `06656fef2d85e03c62b7ab69b03fa96ecfc68653`. Exact-head CI #45710166025 PASS (checks + database + Worker smoke); 19/19 применимых acceptance workflows PASS, включая AUTH-02b #45710173292 и AP-10 #45710173538. Evidence — `stages/AUTH-02b/RESULT.md`.
9. Scope AUTH-02b: обязательная verification email/password, no-session signup, explicit POST confirmation, resend и пользовательская presentation; recovery/password-create/email-change/unlink остаются последующими ступенями.
10. Реальные mail/anti-bot/Google production resources и Stage-6 activation остаются заблокированными.
11. Лёва участвовал в AUTH-01, Лена в AUTH-02a/02b; оба исключены из independent final whole-feature review. По прямому решению владельца Лёва теперь ведёт дальнейшую реализацию authentication lifecycle: сначала полная техническая проверка текущего AUTH-02b, затем отдельным implementation-этапом его исправления/доведение, а после принятия AUTH-02b — последующие AUTH-03 → AUTH-06.

## Следующий переход

**Лёва — correction по coordinator finding AUTH-02b #391.** На `app/auth/credential-view.tsx` email/password `<form>` не имеет явного `method="post"`; до hydration/без JS HTML default GET может поместить email и password в URL. Исправить без расширения scope, добавить regression для SSR/no-JS/pending-hydration semantics, затем новый stable head + author self-check + применимые exact-head checks и STOP для повторного coordinator checkpoint Миры. AUTH-03 не начинать.

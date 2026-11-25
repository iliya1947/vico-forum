# WORKFLOW.md — текущее оперативное состояние, назначения, блокеры и следующий переход

## Текущее состояние

1. Service PR **#320**, branch `service/authentication-lifecycle`; не merge в main.
2. Full plan AUTH-01–AUTH-07: **COORDINATOR PASS**. Delivery mode: stacked AUTH-01 → AUTH-02a → AUTH-02b → AUTH-03 → AUTH-04 → AUTH-05 → AUTH-06; AUTH-07 final gate.
3. AUTH-01: PR #388, stable head `e18fdb189d3c6a0a9ad913df398530a6cd69bb6a`; coordinator checkpoint PASS.
4. AUTH-02a: PR #389, stable exact head `06656fef2d85e03c62b7ab69b03fa96ecfc68653`; author PASS + coordinator PASS, 0 confirmed current-scope defects.
5. AUTH-01 и AUTH-02a остаются intermediate stacked PRs: без merge в main и без independent intermediate review.
6. Активный bounded-этап: **AUTH-02b — mandatory email verification + resend + UI**.
7. По прямому решению владельца Лёва завершил полную техническую проверку AUTH-02b и теперь активирован как исполнитель отдельного correction/finalization этапа. Review завершён HOLD: три подтверждённых current-scope finding в `stages/AUTH-02b/RESULT.md`.
8. AUTH-02b #391 (draft), current head `4fbf8e829fd18c7190a540eade17bdf543a406d3`, base #389 `06656fef2d85e03c62b7ab69b03fa96ecfc68653`. Пакет трёх исправлений опубликован. Локально прошли typecheck, PG17 migrations, ownership probe, P7, SA04-J12 и SA05-2. Exact-head CI #45710166025 и acceptance #45710173292 запущены. AUTHOR PASS ожидает итогов.
9. Scope AUTH-02b: обязательная verification email/password, no-session signup, explicit POST confirmation, resend и пользовательская presentation; recovery/password-create/email-change/unlink остаются последующими ступенями.
10. Реальные mail/anti-bot/Google production resources и Stage-6 activation остаются заблокированными.
11. Лёва участвовал в AUTH-01, Лена в AUTH-02a/02b; оба исключены из independent final whole-feature review. По прямому решению владельца Лёва теперь ведёт дальнейшую реализацию authentication lifecycle: сначала полная техническая проверка текущего AUTH-02b, затем отдельным implementation-этапом его исправления/доведение, а после принятия AUTH-02b — последующие AUTH-03 → AUTH-06.

## Следующий переход

**Лёва — ACTIVE: завершить проверки AUTH-02b #391 на `4fbf8e829fd18c7190a540eade17bdf543a406d3`.** Результат и evidence — `stages/AUTH-02b/RESULT.md`. По результатам author self-check и exact-head CI/acceptance остановиться для coordinator checkpoint Миры. AUTH-03 ждёт coordinator PASS.

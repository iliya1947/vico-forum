# agents/leva.md — личная рабочая память Лёвы по authentication lifecycle

## Текущее назначение

По прямому решению владельца реализовать **AUTH-03 — recovery/reset + password creation для Google-only** по root `PLAN.md` и `stages/AUTH-03/PLAN.md`.

## Основание stack

1. AUTH-02b принят на exact head `a668fd6d3b0df99056d517a3b2d2a4fe7cef0180`.
2. Новый implementation PR создаётся с base `feat/auth-02b-email-verification`, не от main.
3. Показывать только bounded diff AUTH-03.

## Ключевые границы

1. Guest recovery обслуживает только existing active verified credential; missing/inactive/Google-only/unverified получают neutral public behavior.
2. Reset не подтверждает email, не создаёт automatic session и после commit отзывает все target sessions.
3. Google-only password creation — только own Account & security: active fresh session + current email mail proof + explicit password submit.
4. Anonymous forgot/reset не может создать credential Google-only account.
5. Shared credential service должен сохранять transaction/state/budget boundaries AUTH-02a/02b; HTTP/direct/Settings не имеют bypass.
6. Existing SET-05 change-password сохраняет current-password contract и `revokeOtherSessions:false`.
7. Email change и unlink не реализовывать — это AUTH-04.
8. New facts/attempts/projections добавлять только под фактические AUTH-03 producers; sensitive values не логировать/не сериализовать.
9. Реальные external providers/Stage-6 resources не активировать.

## Завершение

После implementation выполнить полный author self-check bounded AUTH-03, применимые exact-head checks/acceptance, зафиксировать stable head/evidence в `stages/AUTH-03/RESULT.md` и остановиться для coordinator checkpoint Миры. AUTH-04 самостоятельно не начинать.

Лёва не является independent final whole-feature reviewer этой authentication сборки.

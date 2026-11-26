# stages/AUTH-04/PLAN.md — own Account & security completion

## Цель

Завершить bounded Account & security lifecycle для собственного аккаунта: безопасный email/status DTO, двухфазную смену email и Google unlink с last-usable-method invariant, используя уже принятые AUTH-02/AUTH-03 transaction/state/session/credential boundaries.

## Основание stack

1. AUTH-01: PR #388 — coordinator PASS.
2. AUTH-02a: PR #389 — coordinator PASS.
3. AUTH-02b: PR #391 — coordinator PASS.
4. AUTH-03: PR #392, accepted exact head `39c07e539a47b8a317b3a274132337a6dc61cfdf` — AUTHOR PASS + COORDINATOR PASS.
5. Новый AUTH-04 implementation PR создаётся с base `feat/auth-03-credential-recovery` и показывает только bounded diff AUTH-04.
6. Полный технический контракт остаётся в root `PLAN.md`; этот stage-файл ограничивает активную реализацию.

## Scope

### 1. Email/status/change

1. Safe Account & security DTO: current email, verified status и bounded pending kind/phase/expiry без token.
2. Actions: same-origin, exact allowlisted intent/fields, expected current user/session; stale expectation → controlled 409 без replay.
3. Email change требует active fresh session и verified current address.
4. Двухфазный flow: old-address confirmation → new-address verification → atomic email commit; старый email остаётся рабочим до final commit.
5. GET/landing не выполняет terminal mutation. Повтор old phase не отправляет письмо повторно.
6. Pending state bound к immutable userId/current email/new email/purpose/generation/phase.
7. Send failure оставляет безопасное pending state; явный rate-limited restart создаёт новое generation.
8. Final POST повторно проверяет current active user/session/email/state/uniqueness под AUTH-02a lifecycle transaction.
9. Final commit: email + verified update → invalidate conflicting verification/recovery/change state → revoke other sessions, сохранив initiating session.
10. Occupied-email race полагается на authoritative DB uniqueness: один success, другой safe conflict без partial effects и без раскрытия владельца адреса.
11. Google provider/accountId, Owner binding и RBAC не переписываются.

### 2. Google unlink / last usable method

1. Own UI работает только с freshly resolved own native account row.
2. Unlink требует active fresh session, expected user/session и explicit action.
3. Canonical/direct unlink path обязан использовать тот же invariant, а не только UI guard.
4. Usable password = credential с непустым hash и разрешённым credential access по mandatory-verification policy.
5. Usable Google = linked Google identity, допускаемая текущей login configuration.
6. Hashless/unknown-provider rows не считаются usable authentication method.
7. После user lock заново перечитать methods и разрешить удаление только если остаётся хотя бы один usable method.
8. Guarded adapter delete/deleteMany callable auth paths также сохраняют этот invariant.
9. Concurrent unlink/password-create/password-change/reset не могут оставить account без usable method.
10. Unlink сам по себе не вводит forced global logout; existing sessions сохраняют текущий lifecycle.

### 3. Общие границы

1. Переиспользовать AUTH-02a transaction/state/budget primitives и AUTH-03 shared credential service; второго auth backend или transaction owner не создавать.
2. Existing SET-05 password change, Google linking и own list/revoke-one/revoke-others не переписывать без необходимости.
3. Closed observability/schema values расширять только одновременно с фактически появившимся producer AUTH-04.
4. Success facts публиковать только после доказанного outer commit; rollback/zero-row/uncertain outcome не считаются success.
5. Реальные Resend/Brevo, anti-bot provider, production Google OAuth и Stage-6 resources не активировать.

## Не входит

1. Account deletion/anonymization/reactivation.
2. 2FA/passkeys.
3. Дополнительные OAuth providers.
4. AUTH-05 challenge/provider completion.
5. AUTH-06 whole-lifecycle acceptance и AUTH-07 final security gate.
6. Внешняя Stage-6 activation.

## Acceptance

1. Email/status DTO не раскрывает token/private provider data и корректно очищается при account switch.
2. Email change проходит old-confirm → new-verify → explicit final commit; GET не мутирует состояние.
3. Replay/stale generation/wrong phase/stale session/account switch/freshness failures не дают partial mutation.
4. Interrupt/restart и mail failure сохраняют безопасное состояние без automatic retry.
5. Occupied-address race даёт один commit и safe conflict второму участнику.
6. После email commit старые verification/recovery/change operations недействительны; initiating session сохранена, остальные own sessions отозваны.
7. Google identity и Owner/RBAC binding после email change неизменны.
8. Google-only account нельзя оставить без метода: unlink запрещён до создания usable verified credential password.
9. Password+Google account может unlink Google; empty/hashless credential не проходит invariant.
10. Concurrent HTTP/direct/persistence unlink и credential operations сохраняют минимум один usable method.
11. Existing SET-05 password change, session controls, explicit Google linking и unrelated identities не регрессируют.
12. Applicable PostgreSQL 17, Worker/Chromium, migration/schema/projection и connected acceptance PASS на stable exact head.
13. External egress/production activation отсутствуют.

## Done

1. Отдельный stacked implementation PR с base `feat/auth-03-credential-recovery`.
2. Diff ограничен AUTH-04 и необходимыми regressions/projections/migration.
3. Лёва выполняет author self-check всего bounded AUTH-04 и применимые CI/acceptance.
4. Stable exact head и evidence записываются в `stages/AUTH-04/RESULT.md`.
5. После AUTHOR PASS Лёва останавливается для coordinator checkpoint Миры.
6. AUTH-05 самостоятельно не начинать.

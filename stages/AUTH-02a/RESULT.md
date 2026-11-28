# stages/AUTH-02a/RESULT.md — итог реализации и проверки bounded-ступени AUTH-02a

## Итоговый статус

**COORDINATOR PASS.**

Implementation PR #389, stable exact head `06656fef2d85e03c62b7ab69b03fa96ecfc68653`.

Base: accepted AUTH-01 PR #388 head `e18fdb189d3c6a0a9ad913df398530a6cd69bb6a`.

Confirmed current-scope defects после coordinator checkpoint: **0**.

AUTH-02a остаётся intermediate stacked PR: без merge в `main` и без independent intermediate review.

## Что реализовано

1. **Единый request-local transaction owner**
   - один `AuthLifecycleTransaction` владеет BEGIN/COMMIT/ROLLBACK для lifecycle/guarded Better Auth writes;
   - nested work присоединяется к owner;
   - independent root adapter operations на одном client сериализуются;
   - rollback-only, uncertain COMMIT и staged evidence сохраняют честную семантику;
   - самостоятельного второго transaction controller в session-write guard не осталось.

2. **Canonical lifecycle foundation**
   - server-only Vico Better Auth plugin/service seam зарегистрирован в canonical auth runtime;
   - user-visible verification/recovery endpoints на этой ступени не открывались;
   - existing successful signup/session contract AUTH-01 сохранён до AUTH-02b.

3. **Lifecycle state**
   - private state использует purpose, immutable user subject/email snapshot, current generation, digest, phase и expiry;
   - deterministic current operation и conditional consume/CAS;
   - raw token/password/session bearer/provider payload не сохраняются в Vico lifecycle metadata.

4. **Account concurrency constraints**
   - migration `0073_auth_account_uniqueness`;
   - unique provider/account identity;
   - один credential row на user;
   - duplicate preflight прекращает migration без автоматического merge/delete identities;
   - accepted migration history не переписана.

5. **Server-owned lifecycle budgets**
   - исходное требование использовать native Better Auth `rate_limit` для длинных Vico windows признано дефектом плана;
   - correction вынес Vico budgets в отдельную `auth_lifecycle_budget`;
   - schema: HMAC key PK, positive count, finite explicit `expires_at`, cleanup index;
   - fixed DB-clock expiry не сдвигается повторными consume/denial;
   - bounded opportunistic cleanup использует locked expired rows и не затрагивает native `rate_limit`;
   - Better Auth limiter/configuration и его native windows не переопределены;
   - полный технический contract и установленная причина: `STORAGE-DECISION.md`.

6. **Abuse/challenge foundation**
   - domain-separated HMAC keys без plaintext email/IP/token;
   - HTTP/direct используют общий server-owned budget path без client bypass/double count;
   - trusted/unknown ingress остаётся bounded;
   - storage/control failure fail closed;
   - provider-neutral challenge injection существует только как foundation; реальный provider/widget/secret не активирован.

7. **Evidence/AccountState compatibility**
   - existing auth facts/session-deletion evidence публикуются только после доказанного commit;
   - rollback/zero-row/uncertain outcome не создаёт ложный success;
   - protected AccountState checks сохраняют authoritative locking/order;
   - future AUTH-02b/03/04 fact/attempt kinds заранее не добавлены.

## Существенная correction-цепочка

1. Первоначальная реализация Vico budgets в native `rate_limit.last_request` использовала несовместимую expiry-семантику.
2. Лёва подтвердил причину по Better Auth 1.7.7: native blanket cleanup не знает независимый Vico 600-second expiry и может удалить ещё активный Vico counter.
3. План исправлен на отдельную `auth_lifecycle_budget`; deadline-in-`last_request`, dummy native rule, private SQL interception и replacement native storage исключены.
4. В том же correction package устранены:
   - дублирующий transaction control;
   - дублирующая protected-write classification;
   - неиспользуемый `markFailed`;
   - late-preimage sequencing risk при concurrent native session deletion — root adapter operations сериализованы, ошибки не подавляются.
5. История промежуточных heads/CI cycles сохранена Git history и `HISTORY.md`; этот RESULT фиксирует только принятый итог.

## Самостоятельная coordinator-проверка

Мира проверила bounded runtime diff отдельно от test results:

1. Better Auth 1.7.7 `runWithTransaction` и Drizzle transaction fallback повторно сверены с exact-version source.
2. Итоговый adapter boundary действительно использует один request-local transaction owner.
3. Vico budget code больше не зависит от native `rate_limit.last_request`; native limiter остаётся отдельным владельцем своих rows.
4. A-02–A-04 исправлены в итоговом коде; late-preimage sequencing закрыт на фактическом native regression path.
5. Lifecycle state/plugin остаются private foundation; AUTH-02b public behavior отсутствует.
6. Migration `0073` и `0074_auth_lifecycle_budget` не переписывают accepted history.
7. Web runtime получает только необходимые CRUD capabilities новой budget-таблицы; localization boundary не расширена.
8. Реальных mail/challenge/provider calls и Stage-6 activation нет.

## Exact-head evidence

Exact head: `06656fef2d85e03c62b7ab69b03fa96ecfc68653`.

1. CI run `45600452416`:
   - checks — SUCCESS;
   - database — SUCCESS;
   - lint/typecheck/unit/build/UI preview/history/metadata/Drizzle parity — SUCCESS;
   - PostgreSQL 17 migration/schema/privilege checks — SUCCESS;
   - Worker smoke — SUCCESS.
2. Unit: 249 files / 3299 tests passed.
3. Database: 121 files / 1865 tests passed.
4. Relevant native suites include lifecycle budget, lifecycle state, account uniqueness, SA04 session atomicity и native limiter contention.
5. 18/18 applicable connected/browser acceptance workflows — SUCCESS на том же exact head.

Эти checks подтверждают уже проверенную модель; они не являются самостоятельным основанием coordinator PASS.

## Границы результата

1. Это repository/local-CI foundation, не deployed/production acceptance.
2. Mandatory verification, resend UI и signup no-session behavior относятся к AUTH-02b.
3. Recovery/password creation, email change и unlink не реализованы здесь.
4. Реальные external providers/resources не активированы.
5. Лена участвовала в implementation AUTH-02a и не является независимым final whole-feature reviewer.

## Следствие

AUTH-02a разрешил следующую stacked-ступень AUTH-02b. По прямому решению владельца AUTH-02b реализует Лёва на base `06656fef2d85e03c62b7ab69b03fa96ecfc68653`.

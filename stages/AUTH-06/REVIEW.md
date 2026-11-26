# stages/AUTH-06/REVIEW.md — whole-feature coordinator review assembled authentication lifecycle

## Проверенный exact head

PR #395, exact `2eb3f9c303ad1b67d5348664267eca665f079cf7`, assembled stack AUTH-01–AUTH-06 от main `9f4c9c8d5e18f42db9b12cf23bc07322ef8f6432`.

## Итог

**COORDINATOR HOLD.** Подтверждён **1 current-scope blocker**. Других подтверждённых blockers после whole-feature прохода не установлено. AUTH-07 заблокирован.

## F01 — registration challenge раскрывает существование email

### Факт

При required registration challenge canonical email signup до challenge вызывает existence check:

`RegistrationChallengeAdmission.email()` создаёт/проверяет challenge receipt только если `!await exists()`.

Следствие при **открытой SET-02 email-регистрации**:

1. Для уже существующего email challenge пропускается; native duplicate path возвращает нейтральный `200 {"status":true,"token":null}`.
2. Для нового email тот же запрос с отсутствующим/invalid/rejected challenge доходит до fresh-create gate и получает `403`; unavailable verifier даёт `503`.
3. Значит public outcome зависит от факта существования email и позволяет account enumeration.

Это не гипотеза: текущие AUTH-05 tests отдельно фиксируют `200` для existing duplicate без usable challenge, а fresh missing/rejected challenge — denial. Green tests поэтому не опровергают finding; они закрепляют обе половины различия раздельно.

### Почему это blocker текущей задачи

AUTH-05/root PLAN требует provider-neutral challenge без account-existence leakage/no-enumeration. Challenge foundation уже реализован текущим stack и должен быть безопасен до Stage-6 provider activation. Это не future-only provider defect.

### Что не входит в finding

Существующий SET-02 contract при намеренно закрытой email-регистрации сохраняет method-specific denial для fresh creation и отдельно разрешает existing sign-in/duplicate behavior. Это явно закреплено в `docs/SETTINGS.md`; whole-feature review не превращает этот ранее принятый product contract в новый finding.

### Correction boundary

Finding находится в AUTH-05 product implementation, не в AUTH-06 test-only package. Исправление выполняется в PR #394 / `feat/auth-05-anti-abuse`, затем зависимый AUTH-06 #395 синхронизируется с новым accepted AUTH-05 base.

Критерий исправления: при открытой email registration required-challenge path не должен давать caller-observable различие existing vs fresh email из-за challenge admission, при сохранении neutral duplicate semantics, отсутствия identity/session/mail mutation на denied fresh creation, server-owned budgets, provider-neutral boundary и существующего SET-02 closure contract. Regression должен сравнивать existing и fresh requests в missing/rejected/unavailable challenge cases, а не проверять их раздельно.

## Остальной whole-feature review

Повторно прослежены cross-stage boundaries: Better Auth identity/session ownership, explicit Google linking, email-change identity persistence, lifecycle transaction/uncertain commit, AccountState/deactivation ordering, usable-method invariant, reset/create/change invalidation/session policy, mail/return-path proof privacy, HMAC budgets/trusted ingress, Worker injection/no external activation, facts/History и AUTH-06 fault/race evidence. Дополнительных подтверждённых current-scope blockers не установлено.

## Следующий маршрут

Ада / Business GPT-6.2 выполняет отдельную AUTH-05 correction по F01. Поскольку после этого Ада участвует в implementation, independent final whole-feature reviewer должен быть другим агентом. После correction: повторный AUTH-05 coordinator checkpoint → sync/reverification AUTH-06 на новом base → whole-feature coordinator review заново. AUTH-07 до PASS не активировать.


## Статус после нижней correction

F01 исправлен в AUTH-05 #394 exact `dbbfe1c05b4774c49f6b06fc4457bc422b5d39a6` и прошёл повторный coordinator checkpoint Миры: PASS.

Этот REVIEW **не превращается в PASS**, потому что он относится к старому AUTH-06 exact `2eb3f9c303ad1b67d5348664267eca665f079cf7`, собранному поверх прежнего AUTH-05. После отдельной sync/reverification AUTH-06 будет проведён новый whole-feature coordinator review на новом stable exact head.

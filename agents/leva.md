# agents/leva.md — личная рабочая память Лёвы по authentication lifecycle

## Результат текущего назначения

Полный технический план AUTH-01–AUTH-07 подготовлен в PLAN.md на main `9f4c9c8d5e18f42db9b12cf23bc07322ef8f6432`, передан Мире на review модели/зависимостей и выбор delivery mode. Implementation не назначена и не начата. CI/acceptance/external activation не выполнялись.

## Существенные основания продолжения

- Exact Better Auth 1.7.7 semantics и официальные источники: research/better-auth-1.7.7.md. Critical delta — email-only replayable verification JWT, reset consume вне общей credential/session transaction, native Google-only reset creation, row-count-only unlink, mandatory-verification synthetic signup response для createUser403.
- Новый lifecycle сохраняет Better Auth identity/crypto/session, расширяется одним canonical plugin и transaction-aware existing guard. Direct API не может обойти proof/state/abuse. Existing SET-05/AccountState/registration/Owner History переиспользуются.
- Рекомендация поставки: AUTH-01 допускает independent, AUTH-02–06 единая vertical stack, AUTH-07 на final head; решение Миры, не моё implementation назначение.
- Q-01: владелец опрошен о mandatory verification для legacy unverified accounts/sessions; ответа пока нет. Обе ветви и blocker на AUTH-02 cutover записаны в PLAN. Не выбирать grandfathering/cutover вместо владельца.
- Review plan и результаты implementation/gate — разные состояния. Product-scope revalidation PASS не принимает техническую реализацию. Stage 6 отдельно заблокирована; служебный #320 не merge.


## Coordinator review result

**HOLD.** Не исправлять план до owner decision Q-01.

После решения владельца одним correction pass:
1. зафиксировать выбранную cutover policy Q-01;
2. убрать Turnstile как обязательный выбранный pre-Stage-6 adapter и сделать AUTH-05 provider-neutral; конкретный provider допускается только как отдельно утверждённый Stage-6 choice/candidate;
3. остальную архитектуру не перерабатывать без нового подтверждённого finding.

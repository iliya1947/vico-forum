# WORKFLOW.md — текущее оперативное состояние, назначения, PR/head, блокеры и следующий переход

## Текущее состояние

1. Service PR: **#320**.
2. Service branch: `service/authentication-lifecycle`.
3. Planning baseline: main `9f4c9c8d5e18f42db9b12cf23bc07322ef8f6432`.
4. Product-scope revalidation Лены: **PASS**.
5. Полный технический план Лёвы подготовлен.
6. Coordinator review Миры: **HOLD**.
7. Blocker 1: **Q-01 owner decision** — политика ранее созданных unverified credential accounts и существующих sessions.
8. Blocker 2: план должен убрать Turnstile как обязательный выбранный provider; current task допускает только provider-neutral challenge boundary, конкретный provider не выбран.
9. Реализатор не назначен; implementation PR/head отсутствует.
10. Stage 6 external activation отдельно заблокирована.

## Следующий переход

Владелец выбирает Q-01. После этого Лёва одним correction pass обновляет полный `PLAN.md`: фиксирует выбранную cutover policy и делает AUTH-05 provider-neutral без обязательного Turnstile adapter. Затем Мира повторно проверяет только исправленные основания и, при PASS, определяет delivery mode. Implementation до этого не начинать.

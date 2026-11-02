# Admin panel — communication

Служебный PR: #251.

## Актуальное состояние

- AP-01–AP-05 merged в `main`.
- AP-06 реализован в PR #270; прежний stable exact head: `e019a8a11ef52a2b7f55adfc8fd66b0bc6c600d5`.
- Integration sync AP-06 с Complaints Package 3 был выполнен Лирой; на том head подтверждённых integration regressions не было.
- Coordinator-first whole-PR review Миры прежнего integration head: PASS, 0 подтверждённых current-scope дефектов.
- Exact-head CI и PostgreSQL/database job для прежнего head были успешны.
- После этого `main` продвинулся до `ddffcb97b3864aea3e70f327627441682efd4f1d` и изменил контракт/структуру `PROJECT_STATE.md`.
- GitHub сообщает #270 как mergeable, но текущий test-merge создаёт противоречивый `PROJECT_STATE.md`: AP-06 добавляется как состояние implementation-ветки, а основной раздел Ordinary admin panel ниже продолжает фиксировать только AP-01–AP-05.
- Это текущий integration blocker, а не дефект реализации AP-06. Независимый review Лёвой до нового sync не запускается.
- AP-07 подготовлен Лирой только на уровне анализа; подтверждённого нового product blocker нет. Implementation начинается только после review/merge AP-06 и от фактического `main`.

## Назначения

- Текущий исполнитель integration sync #270: Лира.
- После нового stable exact head coordinator review повторяет Мира.
- После coordinator PASS следующий независимый reviewer: Лёва.
- У Марка активного назначения по AP-06 нет.

## Ограничения

- Не добавлять browser E2E в GitHub Actions только ради AP-06 integration evidence.

## Открытые решения

- AP-08: reopen behavior, close/reopen permissions и per-action reason requirements.
- AP-10: точный эффект блокировки и applicable reason rules.

Оперативное состояние и следующий шаг: [workflow.md](./workflow.md).
Утверждённый план: [ADMIN_PANEL_IMPLEMENTATION_PLAN.md](../ADMIN_PANEL_IMPLEMENTATION_PLAN.md).

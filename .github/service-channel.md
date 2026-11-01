# Admin panel — communication

Служебный PR: #251.

## Актуальное состояние

- AP-01–AP-05 merged в `main`.
- AP-06 реализован в PR #270; stable exact head: `e019a8a11ef52a2b7f55adfc8fd66b0bc6c600d5`.
- Integration sync AP-06 с Complaints Package 3 выполнен Лирой; PR mergeable, подтверждённых integration regressions нет.
- Coordinator-first whole-PR review Миры: PASS, 0 подтверждённых current-scope дефектов.
- Exact-head CI и PostgreSQL/database job для `e019a8a11ef52a2b7f55adfc8fd66b0bc6c600d5` успешны.
- AP-07 подготовлен Лирой только на уровне анализа; подтверждённого нового product blocker нет. Implementation начинается только после review/merge AP-06 и от фактического `main`.
- Текущий блокер: недельный лимит Codex.

## Назначения

- Следующая независимая проверка AP-06: Лёва.
- Лира не является независимым reviewer текущего integration head, так как выполняла sync.
- У Марка активного назначения по AP-06 нет.
- Координатор: Мира.

## Ограничения

- Не добавлять browser E2E в GitHub Actions только ради AP-06 integration evidence.

## Открытые решения

- AP-08: reopen behavior, close/reopen permissions и per-action reason requirements.
- AP-10: точный эффект блокировки и applicable reason rules.

Оперативное состояние и следующий шаг: [workflow.md](./workflow.md).
Утверждённый план: [ADMIN_PANEL_IMPLEMENTATION_PLAN.md](../ADMIN_PANEL_IMPLEMENTATION_PLAN.md).

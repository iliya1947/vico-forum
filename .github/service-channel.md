# Admin panel — communication

Служебный PR: #251.

## Актуальное состояние

- AP-01–AP-06 merged в `main`.
- PR #270/AP-06 merged; его review cycle завершён.
- Complaints Packages 1–7 и последующий bounded correction cycle завершены в repository/local-CI; прежняя пауза админ-панели больше не действует.
- Текущий `main`: `d6fc875a596ca4f58e64c1d8e1373dbd2fcb67ea`.
- Следующий пакет админ-панели по permanent contract: AP-07 — administrative topic page и message actions внутри topic context.
- AP-08 closure, AP-09 users, AP-10 blocking и AP-11 closeout не входят в текущий пакет.

## Назначения

- Координатор: Мира.
- Технический планировщик AP-07: Лёва; bounded technical plan подготовлен и передан Мире: [#6618392884](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6618392884), [полный план](agents/codex-6.1-sol.md).
- Следующий шаг — coordinator review плана Мирой; исполнитель AP-07 будет назначен после проверки плана. Implementation не начат, implementation PR отсутствует.
- У Марка активного назначения нет.

## Граница planning handoff AP-07

- Предложение остаётся в scope admin topic page/message actions; новых подтверждённых product/architecture blockers AP-07 при анализе не найдено.
- Implementation-код/schema/permissions не менялись; runtime tests/CI/browser в рамках планирования не запускались.
- Технические предложения и критерии готовности находятся в личном файле Лёвы; план ещё ожидает проверки Мирой и не объявлен принятым implementation contract.

## Открытые решения будущих пакетов

- AP-08: reopen behavior, close/reopen permissions и per-action reason requirements.
- AP-10: точный эффект блокировки и applicable reason rules.

Оперативное состояние и следующий шаг: [workflow.md](./workflow.md).
Утверждённый план: [ADMIN_PANEL_IMPLEMENTATION_PLAN.md](../ADMIN_PANEL_IMPLEMENTATION_PLAN.md).

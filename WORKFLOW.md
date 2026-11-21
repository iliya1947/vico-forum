# Workflow

Активный этап: implementation и документация подготовлены; требуется независимая проверка.
Исполнитель: Мира.
Implementation PR: #362, stable exact head `898f71c2d408428ddf126d218c88c861ef29a10d`.
Docs PR: #363, exact head `d9696824229e47ffc099f3b3a3118ef6a76f4ec7`, stacked поверх #362.
Self-check #362:
- изменены ровно 18 PR-test workflows + 1 control/bootstrap workflow;
- основной CI запускается только через одноразовый label `run:ci` либо `workflow_dispatch`;
- 17 acceptance workflows запускаются только через одноразовый label `run:acceptance` либо `workflow_dispatch`;
- существующие acceptance `paths` сохранены;
- control workflow создаёт labels после merge в main и автоматически снимает использованный label с PR;
- production/deploy workflows, UI preview Pages и Codex bridge не изменены;
- открытие PR и последующие изменения head #362/#363 не породили test workflow runs.
Docs #363:
- `AGENTS.md` фиксирует постоянное правило ручного запуска агентами;
- `PROJECT_STATE.md` отражает фактический режим CI;
- diff только этих двух документов.
Ограничение: end-to-end label trigger нельзя проверить до merge #362, потому что labels/bootstrap ещё не существуют в main.
Проверка: Мира — автор изменения, поэтому её self-check не является независимым whole-PR review. Независимый reviewer для этой процессной/workflow-задачи — Лира, поскольку она не участвовала в реализации. Лёва не подключается: отдельной технической эскалации или изменения технического плана нет.
Блокер: нет.
Следующий переход: независимый review Лиры #362 на stable exact head; после PASS — merge владельцем #362, post-merge bootstrap/label smoke, затем retarget/review/merge #363.

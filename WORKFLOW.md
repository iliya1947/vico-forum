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
Проверка: Мира — автор изменения, поэтому её self-check не является независимым whole-PR review. По действующему `AGENTS.md` стандартный независимый технический reviewer — Лёва; специального правила, исключающего его для process/workflow-задач, нет.
Блокер: нет.
Следующий переход: независимый review Лёвы #362 на stable exact head; после PASS — merge владельцем #362, post-merge bootstrap/label smoke, затем retarget/review/merge #363.

## Дополнительная проверка Лиры по запросу владельца — #362 (не заменяет review Лёвы)

- Проверен exact `898f71c2d408428ddf126d218c88c861ef29a10d`, весь PR patch 19 YAML-файлов. Статическая сверка: 17 acceptance `paths` не удалены и не изменены, все 17 имеют `pull_request.types: labeled`, `run:acceptance` job gate и `workflow_dispatch`; CI имеет оба `run:ci` job gate и fallback. Остальные workflows не менялись. По GitHub Actions для commit нет runs; это не проверка label-triggered execution.
- **Замечание по текущему scope, требуется разрешить до PASS:** в `.github/workflows/manual-pr-test-controls.yml` `consume-label` использует `gh pr edit ... --remove-label` при token permissions только `issues: write` и `contents: read`, без `pull-requests: write`. Текущий GitHub CLI `gh pr edit` использует GraphQL `removeLabelsFromLabelable`; документация GitHub прямо относит PR-label mutation к `pull-requests: write`; upstream CLI issue #4631 фиксировал необходимость обеих write-permissions для PR edits. **Работоспособность этого конкретного вызова с текущим token не подтверждена** (до merge нет E2E). Если действие не удалит label, повторное применение того же `run:ci`/`run:acceptance` не вызовет новый `labeled` event. Непосредственная обратимая альтернатива без расширения прав: `gh api -X DELETE repos/$GH_REPO/issues/$PR_NUMBER/labels/$TEST_LABEL` — REST issue labels endpoint официально принимает `issues: write` и работает с PR. Проверить эквивалентность и внести минимальную correction либо подтвердить требуемые права; не считать отсутствие CI-run доказательством исправности.
- Дополнительная граница: GitHub branch protection settings недоступны коннектору (API 403); предположение о required check policy **не проверено**. Непосредственной необходимости менять branch protection этим finding не доказано.
- Следующий формальный независимый reviewer остаётся **Лёва**, до его PASS owner merge преждевременен. Лира implementation/docs не меняла.

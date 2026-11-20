# Workflow

Активный этап: implementation #362 завершён, ожидает отдельной финальной проверки.
Исполнитель: Мира.
Implementation PR: #362, exact head `09aa27065904f99e70a82a0350088fba9b74d6bb`.
Self-check:
- changed files: 18 PR-test workflows + 1 label-bootstrap workflow;
- открытие #362 не породило test workflow runs;
- основной CI запускается только на `run:ci` либо `workflow_dispatch`;
- 17 acceptance workflows запускаются только на `run:acceptance` либо `workflow_dispatch`;
- существующие acceptance `paths` сохранены;
- diff не содержит production/deploy, UI preview Pages или Codex bridge файлов;
- bootstrap использует GitHub CLI `gh label create --force`, подтверждённый актуальной официальной документацией.
Ограничение проверки: end-to-end добавление `run:ci` / `run:acceptance` возможно только после merge bootstrap workflow в main.
Блокер: нет.
Следующий переход: отдельная финальная проверка production/deploy boundaries и постоянной инструкции агентам, затем решение о ready/review.

# Plan

1. Добавить два управляющих label-контракта: `run:ci` и `run:acceptance`.
2. Добавить лёгкий bootstrap workflow, создающий/актуализирующий эти labels после merge в `main`.
3. Перевести `CI` на `pull_request: labeled` + `workflow_dispatch`; job выполняется только для `run:ci` либо dispatch.
4. Перевести 17 acceptance workflows на `pull_request: labeled` + `workflow_dispatch`, сохранив их текущие `paths`; job выполняется только для `run:acceptance` либо dispatch.
5. Проверить YAML/дифф и подтвердить, что production/deploy, Pages и bridge не затронуты.

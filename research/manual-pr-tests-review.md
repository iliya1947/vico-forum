# #362 — независимая проверка Лёвы: PASS

## Текущий вердикт

**PASS** на exact implementation head **5ed18dcffb856564fd0e8df9ec9d43020cd7f807**, base main **6f50d6ad549f816e091282012d6201fa03291b82**. MANUAL-CI-LEVA-01 и MANUAL-CI-LEVA-02 CLOSED; подтверждённых открытых current-scope findings нет.

Основание: полный независимый review всех 19 workflow-файлов на c85214aa9a2706fb0cb1704cfcf18459aa97bcdb плюс проверка единственного последующего изменения и его взаимодействия с исходным scope. Fresh handoff — #342 comment7061333928, updated 2026-11-21T11:06:25Z. Между reviewed c85214a и текущим head изменён только ci.yml: 2 additions / 2 deletions. После нормализации этих двух строк весь CI совпадает с прежним проверенным вариантом; остальные файлы не изменены. Неизменённые facts/suites без основания не перепроверялись и не перезапускались.

## Закрытие MANUAL-CI-LEVA-02

В [ci.yml](https://github.com/iliya1947/vico-forum/blob/5ed18dcffb856564fd0e8df9ec9d43020cd7f807/.github/workflows/ci.yml#L75) resolved base передаётся через собственное имя VICO_CI_BASE_REF. Непосредственно внутри shell только дочерний процесс guard получает GITHUB_BASE_REF из этой переменной. Reserved default variable больше не переопределяется через workflow env; [ограничение GitHub](https://docs.github.com/en/actions/reference/workflows-and-actions/variables#naming-conventions-for-environment-variables) устранено в месте передачи.

Независимо извлечена **фактически shipped команда** из YAML текущего exact head и выполнена с реальными guard/module того же head в изолированном Git fixture, при пустом системном GITHUB_BASE_REF:

| Base | Неизменённая принятая migration | Попытка изменить принятую SQL migration |
| --- | --- | --- |
| main | PASS, exit 0 | корректно отклонена, exit 1 |
| feature/moderation-visibility-b2-commands | PASS, exit 0 | корректно отклонена, exit 1 |

**4/4 ожидаемых результата.** Сохраняется accepted-migration protection; ordinary и stacked base доходят до guard. Ни код проекта, ни guard при review не менялись. Два PR resolvers, open/head/base drift validation и exact head checkout совпадают с ранее проверенным кодом.

Независимо прочитан реальный [CI run 44897099641](https://github.com/iliya1947/vico-forum/actions/runs/44897099641) на exact 5ed18dc: checks SUCCESS, database SUCCESS, Protect accepted migration history SUCCESS. Batch содержит 19 runs: CI SUCCESS, controller SUCCESS, 17 acceptance workflow SKIPPED. Guard проходит уже через новую shipped передачу base на PR-label пути.

## Остальной принятый scope

- MANUAL-CI-LEVA-01 CLOSED: все 20 acceptance jobs в 17 workflow имеют run:acceptance/dispatch gate, включая четыре AP-10 siblings. Все 17 исходных paths сохранены; job bodies совпадают с base после нормализации только intended trigger/gate/IMPLEMENTATION_SHA изменений.
- На прежнем c85214a независимо прочитан positive run:acceptance batch: 17 acceptance workflow SUCCESS, controller SUCCESS, CI SKIPPED; AP-10 все четыре job SUCCESS ([44894478804](https://github.com/iliya1947/vico-forum/actions/runs/44894478804)). Negative run:ci дал 17 SKIPPED, AP-10 4/4 SKIPPED ([44891093096](https://github.com/iliya1947/vico-forum/actions/runs/44891093096)). Acceptance/controller код после этого не изменялся; широкие suites повторять не требовалось.
- Controller DELETE step прошёл в обоих ранее проверенных label batches с текущими issues/pull-requests permissions. Controller не checkout'ит PR source, bootstrap и consume разделены по событиям, параметры передаются через quoted env.
- Оба CI resolver shell ранее исполнены по 8 fixture-сценариям: normal/stacked success, head/base drift, closed PR, null head/base, API error — 16/16 ожидаемых результатов. Сейчас их код и exact checkout неизменны.
- CI сохраняет исходные checks/database команды. Остальные 13 workflow byte-equal main: production/deploy, UI preview Pages и Codex bridge не затронуты.
- #363 resynchronized head bbe72f09c34fc9bbae00f6434712ba45e49dfd80, base exact #362; три docs-файла, mergeable. Это проверка dependency/scope, **не отдельный docs review PASS**.
- Локальная текущая сводка: /workspace/work/manual-pr-tests-rereview-diagnostics/final-shipped-propagation.json. Полное существенное evidence приведено здесь; следующий агент не зависит от локального scratch.

## Ограничение hosted dispatch и передача

Фактический hosted workflow_dispatch до merge **не выполнялся**: trigger должен [присутствовать в default branch](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_dispatch). PASS опирается на проверенный workflow contract, локальное исполнение resolver/реального guard и реальные label-triggered runs; он не заявляет hosted dispatch execution. Это известная граница верификации, а не оставшийся дефект.

**#362 готов к owner merge на указанном exact head.** После merge Мира выполняет один фактический CI workflow_dispatch на main для существующего открытого PR с ожидаемыми head/base; не использовать уже merged/closed #362, поскольку resolver требует open PR. Зафиксировать соответствие resolved checkout и успех migration guard. Затем провести #363 по отдельному docs review/merge маршруту после актуализации его base.

#342 остаётся единственным service channel. Moderation visibility B3 отдельно ждёт checkpoint Миры; этот process PASS не является review B3 и не активирует B4. Лёва реализацию не менял, новых labels/Actions/production действий не запускал.

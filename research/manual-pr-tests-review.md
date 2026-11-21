# #362 — независимая повторная проверка Лёвы

## Вердикт и scope

**HOLD: MANUAL-CI-LEVA-01 CLOSED, MANUAL-CI-LEVA-02 [P2] остаётся OPEN.** Других подтверждённых current-scope findings в полном scope не выявлено.

Проверен весь #362 exact c85214aa9a2706fb0cb1704cfcf18459aa97bcdb против main 6f50d6ad549f816e091282012d6201fa03291b82: 19 workflow-файлов, все jobs, triggers/labels/permissions, dispatch context/checkout/guard, path-фильтры и сохранение исходных проверок. Актуальный handoff — #342 comment7061333928; старый вердикт относился к 3387132 и не переносится автоматически.

#363 b481f0a004c40a01f53dc9be3428c6d3d1ea2409 проверен только как зависимая docs-ступень: base exact #362, три docs-файла, mergeable, zero workflow runs. Отдельный docs PASS не выдавался.

## MANUAL-CI-LEVA-01 — CLOSED

Все 20 acceptance jobs в 17 workflow, включая четыре AP-10 siblings, теперь имеют одинаковое условие run:acceptance/dispatch. Все 17 path-наборов совпадают с base; после нормализации только gate и intended IMPLEMENTATION_SHA изменения job bodies совпадают с base.

Независимо прочитаны GitHub Actions run/job records на exact c85214a:

| Событие по контрольной метке | Проверенный результат |
| --- | --- |
| run:ci, batch 09:45:39Z | CI SUCCESS, controller SUCCESS, 17 acceptance workflow SKIPPED |
| run:acceptance, batch 10:28:06Z | 17 acceptance workflow SUCCESS, controller SUCCESS, CI SKIPPED |
| AP-10 по run:ci | все четыре job SKIPPED |
| AP-10 по run:acceptance | все четыре job SUCCESS |

Источники: [CI 44891093053](https://github.com/iliya1947/vico-forum/actions/runs/44891093053), [negative AP-10 44891093096](https://github.com/iliya1947/vico-forum/actions/runs/44891093096), [positive AP-10 44894478804](https://github.com/iliya1947/vico-forum/actions/runs/44894478804). CI checks/database и каждый обязательный шаг, включая migration guard/lint/typecheck/test/build, SUCCESS. Это прочитанные реальные результаты GitHub, не новый запуск Лёвой.

Controller consume-label и его DELETE step SUCCESS в [run:ci batch](https://github.com/iliya1947/vico-forum/actions/runs/44891093023) и [acceptance batch](https://github.com/iliya1947/vico-forum/actions/runs/44894478792). Добавленный pull-requests: write ограничен controller без checkout; новая реализация потребления меток подтверждена runtime. Старую оценку issues: write только по API contract нельзя использовать как runtime evidence.

## MANUAL-CI-LEVA-02 [P2] — base context всё ещё передаётся через зарезервированное имя

Разрешение PR context исправлено по существу: оба CI jobs запрашивают open PR, проверяют ожидаемые head SHA/base ref, отклоняют drift и checkout'ят разрешённый exact SHA. Однако [ci.yml:75–77](https://github.com/iliya1947/vico-forum/blob/c85214aa9a2706fb0cb1704cfcf18459aa97bcdb/.github/workflows/ci.yml#L75) передаёт base в migration guard через step env с именем GITHUB_BASE_REF. Сам guard не изменён и читает только process.env.GITHUB_BASE_REF.

По актуальному [GitHub Variables reference](https://docs.github.com/en/actions/reference/workflows-and-actions/variables#naming-conventions-for-environment-variables) default GITHUB_*/RUNNER_* нельзя переопределять через workflow env; такая assignment игнорируется. GITHUB_BASE_REF задан только для PR/PR-target, а у dispatch PR base в github context пустой.

Причинная цепочка проверена также по официальному runner source на pinned commit 7e211dc69c347b78fc398e630e74facb11a13235: [GitHubContext.cs](https://github.com/actions/runner/blob/7e211dc69c347b78fc398e630e74facb11a13235/src/Runner.Worker/GitHubContext.cs#L20) экспортирует base_ref как GITHUB_BASE_REF; [ScriptHandler.cs](https://github.com/actions/runner/blob/7e211dc69c347b78fc398e630e74facb11a13235/src/Runner.Worker/Handlers/ScriptHandler.cs#L291) перед выполнением shell записывает runtime context поверх Environment. Пустой dispatch base не заменяется заданной через step env веткой. Guard получает пустое значение и останавливает checks до lint/typecheck/unit/build; успешный PR-label путь этого не проверяет, поскольку на PR системная переменная уже заполнена.

Границы доказательств: реальный hosted workflow_dispatch **не выполнялся**; trigger пока отсутствует в default branch, и [GitHub ограничивает dispatch этим условием](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_dispatch). Это ограничение само по себе не finding. Finding — конкретное несоответствие способа передачи base документированному runner contract. Локальная модель именно context-over-step-env и неизменённый реальный guard дают exit 1 с GITHUB_BASE_REF is required; модель не выдаётся за hosted run.

Минимальное направление исправления проверено отдельным локальным экспериментом без изменения проекта: передать разрешённую base через собственную переменную VICO_CI_BASE_REF, затем задать GITHUB_BASE_REF только для дочернего процесса непосредственно внутри run-команды guard. Это обходит проблему workflow env, сохраняет существующий guard и не требует новой подсистемы. В изолированном Git fixture реальные guard/module из exact head проходят для main и feature/moderation-visibility-b2-commands; изменение принятой SQL migration отклоняется в обоих случаях (4/4 ожидаемых результата). Эксперимент не является shipped fix.

Критерий закрытия: resolved base доходит до реального guard без переопределения reserved workflow env, ordinary/stacked base проходят, accepted SQL mutation остаётся запрещена. Сохранить уже работающие expected head/base drift checks и exact checkout. После появления dispatch на main — один фактический dispatch smoke с ожидаемыми PR/head/base; до этого явно отделять contract/local verification от hosted execution.

## Полная остальная проверка

- 19 changed workflow успешно разобраны; все 17 acceptance path filters сохранены; все 20 acceptance jobs gated. Jobs не подменены упрощёнными тестами.
- Исходные CI checks/database test commands сохранены; добавленные resolution/checkouts локально исполнены по 8 fixture-сценариям на каждый job: normal/stacked success, head drift, base drift, closed PR, null head, null base, API error. **16/16 ожидаемых результатов.** Это shell execution самого resolver с подменой только gh API response, не реальный dispatch.
- Controller имеет только push main по собственному path, labeled и dispatch; bootstrap/consume разделены, checkout и исполнение PR source отсутствуют. Обе control labels потребляются; label payload передаётся через quoted env, не интерполируется в shell source.
- Acceptance dispatch IMPLEMENTATION_SHA использует github.sha для выбранного ref; PR-label путь сохраняет PR head SHA. Новый CI dispatch использует resolved PR exact SHA, а не произвольный head выбранной workflow-ветки.
- Остальные 13 workflow byte-equal base: production/deploy, UI preview Pages и Codex bridge не изменены. Зависимый #363 имеет zero workflow runs, что согласуется с отсутствием automatic synchronize запуска.
- Локальные материалы: /workspace/work/manual-pr-tests-rereview-diagnostics/results.json, *-resolver-results.json, runner-context-model.stderr.txt, guard-child-process-experiment.json. Существенные факты полностью приведены здесь; следующий агент не зависит от локального scratch.
- Новые labels/Actions/production действия Лёва не запускал; implementation не менял. Runtime evidence прочитано по API; GitHub-wide fork policy/rulesets не сертифицировались.

## Передача

Мира возвращает исполнителю только остающийся MANUAL-CI-LEVA-02: локально исправить передачу resolved base в guard, targeted self-check, resync #363 и fresh stable-head handoff на повторный независимый review. Уже закрытый AP-10 finding не переоткрывать без относящихся изменений; широкие acceptance повторять только при новом основании. #362/#363 пока не готовы к merge. #342 — единственный service channel; moderation B3 отдельно ждёт checkpoint Миры, B4 не активирован.

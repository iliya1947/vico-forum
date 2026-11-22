# TASK.md — UI progress preview на общем коде форума

## Текущее назначение и результат

Владелец принял концепцию и поручил Лёве: «Концепцию принимаю. Оформляй финальный технический PLAN.md на её основе».

Финальный технический [PLAN.md](PLAN.md) подготовлен в #369. Это текущий канонический план всей задачи. Концептуальный этап завершён; прежний запрет формировать технический план до принятия концепции больше не блокирует работу, поскольку условие выполнено.

Оформление плана завершено. Мира дала PASS по плану и назначила Лиру исполнителем P0 в stacked-режиме. P0-F1 real screen PASS (`45014003839`). P0-F2 document adapter PASS on exact `ad5661574482ba5b9cf59ca260584ebecf6f7d46` ([CI `45020006913`](https://github.com/iliya1947/vico-forum/actions/runs/45020006913): checks/database SUCCESS, 223 test files, Chromium theme/lang/dir/CSS without JS or external errors). P0-F3 real editor Form/clientAction→action PASS on exact `a0b81160c0144b2957f9b7c71d3981c8f0ce116f` ([CI #45024496140](https://github.com/iliya1947/vico-forum/actions/runs/45024496140), checks/database SUCCESS, 224 test files). P0 remaining resource/middleware, Pages URLs and attachments; local presence API currently yields 404 until generic dispatcher. #322 и опубликованный Pages entry не менялись. Дальнейший маршрут — WORKFLOW.md.

## Цель архитектуры

Preview должен быть самим форумом из актуального main с внутренней тестовой инфраструктурой:

- настоящий общий UI/routes/loaders/actions/application interactions;
- repo + GitHub Actions/Pages + браузер, без необходимой внешней БД, backend host или provider credentials;
- raw test users/roles/categories/sections/topics/posts/revisions и остальные необходимые состояния/байты в репозитории;
- typed capabilities подменяют инфраструктуру, а не экраны/кнопки/правила продукта;
- обычное изменение кнопки, ссылки или функции main видно после успешной пересборки без второй preview-правки;
- проверяются UI, navigation, editor, links/buttons/forms и штатные pending/error/success;
- реальное сохранение необязательно: разрешено показывать «успешно сохранено» без записи. Минимальный transient state допустим только для связного UI flow.

Обязательная SQL/WASM база, migrations/transaction emulator и persistence parity не требуются. External Stage 6 rollout не входит в задачу.

## Исходная основа

Проверенный main: `9cff976a9621d9fe5dfef28ea5367e390ff435b1`. Текущий preview и рассмотренный ранее #322 имеют самостоятельную product logic; она должна быть заменена общими modules при atomic cutover, а не перенесена как второй продукт.

Production context seams уже существуют. Browser-safe graph, Framework→Data Router adaptation и local transport должны быть доказаны bounded P0. Техническая правдоподобность не выдается за выполненный browser proof.

## Критерий завершения текущего назначения

Один самодостаточный PLAN содержит архитектуру, границы общего/подменяемого кода, contracts/данные, конкретные точки изменения, Pages/runtime ограничения, этапы/зависимости, проверки/STOP gates и финальную acceptance matrix. Это выполнено; проверка плана Мирой завершена PASS. P0 implementation продолжается по WORKFLOW.md.

Критерии реализации всей feature и этапов — PLAN §14–18. Служебный PR #369 не merge. Implementation назначается отдельно.

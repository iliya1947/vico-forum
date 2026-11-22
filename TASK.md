# TASK.md — UI progress preview на общем коде форума

## Текущее назначение и результат

Владелец принял концепцию и поручил Лёве: «Концепцию принимаю. Оформляй финальный технический PLAN.md на её основе».

Финальный технический [PLAN.md](PLAN.md) подготовлен в #369. Это текущий канонический план всей задачи. Концептуальный этап завершён; прежний запрет формировать технический план до принятия концепции больше не блокирует работу, поскольку условие выполнено.

Оформление плана завершено. Мира дала PASS по плану и назначила Лиру исполнителем P0 в stacked-режиме. P0-F1 real screen PASS (`45014003839`). P0-F2 document adapter PASS on exact `ad5661574482ba5b9cf59ca260584ebecf6f7d46` ([CI `45020006913`](https://github.com/iliya1947/vico-forum/actions/runs/45020006913): checks/database SUCCESS, 223 test files, Chromium theme/lang/dir/CSS without JS or external errors). P0-F3 real editor Form/clientAction→action PASS on exact `a0b81160c0144b2957f9b7c71d3981c8f0ce116f` ([CI #45024496140](https://github.com/iliya1947/vico-forum/actions/runs/45024496140), checks/database SUCCESS, 224 test files). P0-F4 resource/middleware PASS on exact `9eb080b49a59530309bd6397be0c940993f8d26d` ([CI #45027210562](https://github.com/iliya1947/vico-forum/actions/runs/45027210562), checks/database SUCCESS, 225 test files): original presence/mentions through generic static handler with locale middleware, HTTP 200/204/403/404/405 and no Vite resource fallthrough. P0-F5 Pages subpath URL/Link/new-tab/history PASS on exact `97a9784eb956dadcacbfa52af3b09be3e16596f2` ([CI #45031091293](https://github.com/iliya1947/vico-forum/actions/runs/45031091293): checks/database SUCCESS, 226 test files). P0-F6 image/download mode-aware attachment port PASS on exact `e1f077c0c8c7f15d4600df0a64dd661982755bb8` ([CI #45032800400](https://github.com/iliya1947/vico-forum/actions/runs/45032800400): checks/database SUCCESS, 227 test files). Actual inline Markdown and post display loaded PNG and native download 79 B; 0 external requests/JS errors. P0-F7 whole-PR author self-check **PASS** on unchanged exact `e1f077c0c8c7f15d4600df0a64dd661982755bb8`; neutral seam inventory and nonblocking CI diagnostics recorded in WORKFLOW.md. **P0 bounded coordinator checkpoint Миры PASS**. P1 assigned to Лира in stacked mode; Draft #375 opened from stable #373. P1-A generated full route registry **PASS** on exact `4cb98f8ab20b808f140d200a03c6c4dafd90649d`; CI #45036593299 checks/database SUCCESS, 227 test files / 2777 tests. P1-B import-barrier diagnostics underway in stacked Draft #375. P1-B1 attachment neutral seams verified; P1-B2a `home.tsx` import verified on exact `e4f8e7f94974def1a39d4ce4d0339d76f56fd6ca` ([CI #45043385984](https://github.com/iliya1947/vico-forum/actions/runs/45043385984), P0 browser PASS, full-import gate reaches `routes/category` then fails on PostgreSQL `Buffer`). P1-B2b category import verified on `e555b70a6dcf95d14936d990474e53859aa24f4f` ([CI #45043867168](https://github.com/iliya1947/vico-forum/actions/runs/45043867168): 9 real imports, then independent `routes/section` Buffer blocker; P0 browser PASS, P1 check still FAIL). Next P1-B2c section error imports. WORKFLOW.md controls current steps. Root-absolute `/api/attachments` cleanup is now fail-closed, not implemented; no Pages backend requests. One unrelated local 404 console message remains unclassified. #322 и опубликованный Pages entry не менялись. Дальнейший маршрут — WORKFLOW.md.

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

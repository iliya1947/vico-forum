# agents/Лиры.md — личная рабочая память Лиры.

- Назначение: исполнитель P0 #369. Active Draft #373, `feature/ui-progress-preview-p0` exact `57ff6141126f6740886d8b32b1133a179a210412`, base `main` `9cff976a...`.
- Delivery: **stacked**, P0 — первая ступень от актуального main; P1+ зависят от PASS предыдущей ступени.
- Канонический технический план: `PLAN.md`; P0 — §15.
- Цель P0: browser proof одного реального vertical path без второго route/action и без внешнего runtime.
- Обязательные границы: GitHub/Pages/browser only; production UI/routes/application handlers; test capabilities; simulated save разрешён; SQL/WASM/Worker/external services не вводить.
- P0 должен доказать generated routes/IDs, browser-safe imports/context, root/document adaptation, local resource request, реальный clientAction→action, Form/fetcher/Link/new-tab, attachment native resource и отсутствие внешних backend calls.
- Не строить полный fixture universe и не закрывать P1–P4 внутри P0.
- При необходимости копии route/action, внешнего server/SQL либо при дефекте PLAN — STOP и вернуть конкретный blocker в #369.
- P0-A–P0-E: real route manifest + isolated Vite candidate, neutral exception and attachment UUID seams. Exact `57ff6141126f6740886d8b32b1133a179a210412` CI [45008588204](https://github.com/iliya1947/vico-forum/actions/runs/45008588204): **checks/database SUCCESS**; focused class identity and all general applicable steps PASS, Chromium imports real `root`, `locale-boundary`, `topic` (0 browser errors, 0 external requests); Vite diagnostics show no PG module edges/externalized Node. This is module import proof, not render/actions P0 gate.
- STOP P0-E. Next `...` → P0-F1 minimal generated-tree Data Router + real topic screen rendering on test context/fixture; later individual microsteps prove `clientAction→action`, middleware/resource, Form/fetcher/URL/attachment. No P1 until coordinator P0 PASS.
- Ошибочная первая ветка `chatgpt/ui-progress-preview-p0` активировала Pages deploy run `45002989024` (SUCCESS). #372 закрыт, работа перенесена в #373 вне Pages trigger; старая ветка ограничена job-level deploy guard.
- После полного P0: author self-check + применимые tests/browser/CI, затем передать stable exact head Мире на coordinator checkpoint.

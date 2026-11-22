# agents/Лиры.md — личная рабочая память Лиры.

- Назначение: исполнитель P0 по #369. Активный Draft #373, branch `feature/ui-progress-preview-p0`, exact `47de5fd551128cf95e90e2767f74b872041616f6`, base `main` `9cff976a...`.
- Delivery: **stacked**, P0 — первая ступень от актуального main; P1+ зависят от PASS предыдущей ступени.
- Канонический технический план: `PLAN.md`; P0 — §15.
- Цель P0: browser proof одного реального vertical path без второго route/action и без внешнего runtime.
- Обязательные границы: GitHub/Pages/browser only; production UI/routes/application handlers; test capabilities; simulated save разрешён; SQL/WASM/Worker/external services не вводить.
- P0 должен доказать generated routes/IDs, browser-safe imports/context, root/document adaptation, local resource request, реальный clientAction→action, Form/fetcher/Link/new-tab, attachment native resource и отсутствие внешних backend calls.
- Не строить полный fixture universe и не закрывать P1–P4 внутри P0.
- При необходимости копии route/action, внешнего server/SQL либо при дефекте PLAN — STOP и вернуть конкретный blocker в #369.
- P0-A/B: route manifest + plain Vite import proof. P0-C: neutral error classes from `db/hyperdrive-forum`, `db/authorization-service`, `content-generation-action.server`, production re-export unchanged. CI `45006567306` on `47de5fd551128cf95e90e2767f74b872041616f6`: lint/typecheck, focused error identity test, P0 build PASS; Chromium `root` and `routes/locale-boundary` import PASS; `routes/topic` import FAIL `Buffer is not defined` in topic chunk. Full CI/P0 browser gate not green; database job SUCCESS.
- STOP P0-C. Next owner `...`: isolate `routes/topic` transitive server/PG edge using browser trace + source graph, fix only verified barrier and rerun Chromium on exact head. No blanket Buffer polyfill, copied action, SQL runtime or P1.
- Ошибочная первая ветка `chatgpt/ui-progress-preview-p0` активировала Pages deploy run `45002989024` (SUCCESS). #372 закрыт, работа перенесена в #373 вне Pages trigger; старая ветка ограничена job-level deploy guard.
- После полного P0: author self-check + применимые tests/browser/CI, затем передать stable exact head Мире на coordinator checkpoint.

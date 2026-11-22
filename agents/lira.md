# agents/Лиры.md — личная рабочая память Лиры.

- Назначение: исполнитель P0 #369. Active Draft #373 branch `feature/ui-progress-preview-p0`, exact `ad5661574482ba5b9cf59ca260584ebecf6f7d46`, base `main` `9cff976a...`.
- Delivery: **stacked**, P0 — первая ступень от актуального main; P1+ зависят от PASS предыдущей ступени.
- Канонический технический план: `PLAN.md`; P0 — §15.
- Цель P0: browser proof одного реального vertical path без второго route/action и без внешнего runtime.
- Обязательные границы: GitHub/Pages/browser only; production UI/routes/application handlers; test capabilities; simulated save разрешён; SQL/WASM/Worker/external services не вводить.
- P0 должен доказать generated routes/IDs, browser-safe imports/context, root/document adaptation, local resource request, реальный clientAction→action, Form/fetcher/Link/new-tab, attachment native resource и отсутствие внешних backend calls.
- Не строить полный fixture universe и не закрывать P1–P4 внутри P0.
- При необходимости копии route/action, внешнего server/SQL либо при дефекте PLAN — STOP и вернуть конкретный blocker в #369.
- P0-A–P0-F1: real generated routes + browser-safe imports, P0-F1 generated-tree Data Router executes real `root` App, locale boundary middleware/loader and topic loader/TopicView, synthetic guest topic/translation capability with loud unsupported-method errors. [CI 45014003839](https://github.com/iliya194/vico-forum/actions/runs/45014003839) exact `c91b861f79d256f6dfb46605ecfaa6a40c772dc6`: checks/database SUCCESS, 222 test files PASS, real Chromium `main.topic-shell` and sample title/body PASS, 0 external requests/page errors. No Framework root Layout/meta/links/scripts integration yet, and no real clientAction/resource/URL/attachment proof: whole P0 NOT PASS.
- P0-F2 candidate: shared production `rootDocumentLocale` used by Framework Layout + P0 document, original inline production theme script via Vite HTML plugin, generic route `meta`/`links` mapping on matched data, jsdom/browser assertions. Initial CI `45019646462` TS2556 typed DOM append; fixed on `ad566157...`; repeat [CI 45020006913](https://github.com/iliya1947/vico-forum/actions/runs/45020006913) queued. **P0-F2 NOT PASS**. Next `...` review exact-head CI; fix if needed and browser screen/theme/CSS/metadata. After PASS, STOP; next bounded slice `clientAction→action` by owner command.
- Ошибочная первая ветка `chatgpt/ui-progress-preview-p0` активировала Pages deploy run `45002989024` (SUCCESS). #372 закрыт, работа перенесена в #373 вне Pages trigger; старая ветка ограничена job-level deploy guard.
- После полного P0: author self-check + применимые tests/browser/CI, затем передать stable exact head Мире на coordinator checkpoint.

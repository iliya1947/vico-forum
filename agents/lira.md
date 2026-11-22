# agents/Лиры.md — личная рабочая память Лиры.

- Назначение: исполнитель P0 #369. Active Draft #373, feature/ui-progress-preview-p0 exact `87a09b63bc4707512929f56406978d9847d59409`, base `main` `9cff976a...`.
- Delivery: **stacked**, P0 — первая ступень от актуального main; P1+ зависят от PASS предыдущей ступени.
- Канонический технический план: `PLAN.md`; P0 — §15.
- Цель P0: browser proof одного реального vertical path без второго route/action и без внешнего runtime.
- Обязательные границы: GitHub/Pages/browser only; production UI/routes/application handlers; test capabilities; simulated save разрешён; SQL/WASM/Worker/external services не вводить.
- P0 должен доказать generated routes/IDs, browser-safe imports/context, root/document adaptation, local resource request, реальный clientAction→action, Form/fetcher/Link/new-tab, attachment native resource и отсутствие внешних backend calls.
- Не строить полный fixture universe и не закрывать P1–P4 внутри P0.
- При необходимости копии route/action, внешнего server/SQL либо при дефекте PLAN — STOP и вернуть конкретный blocker в #369.
- P0-A/B/C: generated route descriptors, plain Vite candidate and Chromium proof of root + locale-boundary imports. P0-D: Vite `getModuleInfo` diagnostics prove initial `topic → db/hyperdrive-forum → postgres-deadlines → pg` edge. Redirected topic/read-availability/actions/mutations to shared neutral errors, measures presentation to new neutral UserMeasuresUnavailableError with production reexport and identity test. CI `45007556319` exact `87a09b63bc4707512929f56406978d9847d59409`: lint/typecheck/identity/P0-build PASS, Chromium FAIL at **new** `topic → actions.server → db/account-state → postgres-deadlines → pg`, and `actions.server → db/forum-repository` reachable; database job SUCCESS.
- STOP P0-D. Next `...`: address confirmed `actions.server → account-state → postgres-deadlines` dependency and inventory other forum-repository error-class edges. Keep production `topicAction`, no Buffer polyfill, database runtime or P1.
- Ошибочная первая ветка `chatgpt/ui-progress-preview-p0` активировала Pages deploy run `45002989024` (SUCCESS). #372 закрыт, работа перенесена в #373 вне Pages trigger; старая ветка ограничена job-level deploy guard.
- После полного P0: author self-check + применимые tests/browser/CI, затем передать stable exact head Мире на coordinator checkpoint.

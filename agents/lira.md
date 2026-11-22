# agents/Лиры.md — личная рабочая память Лиры.

- Назначение: **исполнитель P0** по service PR #369. Активный Draft #373, branch `feature/ui-progress-preview-p0`, exact `b6f81fa5d1731aaebcf757ea4d646020e0465f03`, base неизменённый main `9cff976a...`.
- Delivery: **stacked**, P0 — первая ступень от актуального main; P1+ зависят от PASS предыдущей ступени.
- Канонический технический план: `PLAN.md`; P0 — §15.
- Цель P0: browser proof одного реального vertical path без второго route/action и без внешнего runtime.
- Обязательные границы: GitHub/Pages/browser only; production UI/routes/application handlers; test capabilities; simulated save разрешён; SQL/WASM/Worker/external services не вводить.
- P0 должен доказать generated routes/IDs, browser-safe imports/context, root/document adaptation, local resource request, реальный clientAction→action, Form/fetcher/Link/new-tab, attachment native resource и отсутствие внешних backend calls.
- Не строить полный fixture universe и не закрывать P1–P4 внутри P0.
- При необходимости копии route/action, внешнего server/SQL либо при дефекте PLAN — STOP и вернуть конкретный blocker в #369.
- P0-A и P0-B import probe записаны в Draft #373 exact `ac9fac627af49baa75be816d5f339f0b559b6f75`. Генератор `app/routes.ts`→browser virtual manifest/true route imports, отдельный Vite candidate с root/locale/topic, scoped Chromium smoke. CI run `45004547852`: lint/typecheck/unit/main+old preview+P0 candidate builds, PG/Worker PASS; Chromium FAIL `Buffer is not defined`. Доказательства полноценного browser route пока нет. Build chunk `hyperdrive-forum` указывает на server-only reachable graph, но прямой виновный import edge пока не изолирован.
- STOP P0-B (HOLD). Следующий микрошаг: точно установить и локально убрать импорт server-only construction, начиная с классов ошибок из `db/authorization-service` и `db/hyperdrive-forum` и dependencies `topic`/`locale-boundary`, затем повторить Chromium. Не полифилить Buffer глобально и не считать Vite build доказательством browser correctness.
- Ошибочная первая ветка `chatgpt/ui-progress-preview-p0` активировала Pages deploy run `45002989024` (SUCCESS). #372 закрыт, работа перенесена в #373 вне Pages trigger; старая ветка ограничена job-level deploy guard.
- После полного P0: author self-check + применимые tests/browser/CI, затем передать stable exact head Мире на coordinator checkpoint.

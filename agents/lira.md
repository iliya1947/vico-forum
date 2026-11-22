# agents/Лиры.md — личная рабочая память Лиры.

- Назначение: **исполнитель P0** по service PR #369.
- Delivery: **stacked**, P0 — первая ступень от актуального main; P1+ зависят от PASS предыдущей ступени.
- Канонический технический план: `PLAN.md`; P0 — §15.
- Цель P0: browser proof одного реального vertical path без второго route/action и без внешнего runtime.
- Обязательные границы: GitHub/Pages/browser only; production UI/routes/application handlers; test capabilities; simulated save разрешён; SQL/WASM/Worker/external services не вводить.
- P0 должен доказать generated routes/IDs, browser-safe imports/context, root/document adaptation, local resource request, реальный clientAction→action, Form/fetcher/Link/new-tab, attachment native resource и отсутствие внешних backend calls.
- Не строить полный fixture universe и не закрывать P1–P4 внутри P0.
- При необходимости копии route/action, внешнего server/SQL либо при дефекте PLAN — STOP и вернуть конкретный blocker в #369.
- После реализации: author self-check + применимые targeted checks, затем передать stable exact head Мире на coordinator checkpoint.

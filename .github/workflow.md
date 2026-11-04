# Admin panel — current workflow

- Служебный PR: #251
- План: `ADMIN_PANEL_IMPLEMENTATION_PLAN.md`
- Текущий этап: AP-08 — implementation paused by owner
- Coordinator: Мира; technical planner/reviewer: Лёва; исполнитель: Лира
- Current main / implementation baseline: `e39c36ccef29c6164706d826f26c57088a97fa20`
- Implementation PR: #283
- Preserved implementation head: `381a046bfb5b44a6a6b5dcbce7c73c40b7085ecd`
- Лира не продолжает #283 до нового назначения владельца.
- Overscope coordinator-постановки сам по себе не является дефектом реализации и не является основанием для rollback/rewrite.
- Мира исправляет только служебные последствия coordinator-сбоя; реализацию #283 не менять без отдельно подтверждённого current-scope дефекта.
- AP-09+, blocking и production rollout не начинать.

# Admin panel — current workflow

- Служебный PR: #251
- План: `ADMIN_PANEL_IMPLEMENTATION_PLAN.md`
- Текущий этап: AP-08 — coordinator finding returned to implementer
- Coordinator: Мира; technical planner/reviewer: Лёва; исполнитель: Лира
- Implementation baseline: `e39c36ccef29c6164706d826f26c57088a97fa20`
- Implementation PR: #283
- Stable exact head: `381a046bfb5b44a6a6b5dcbce7c73c40b7085ecd`
- Exact-head CI: #41777691776 attempt 3 — checks/database SUCCESS
- Полезный уже реализованный overscope сохраняется, но дальше не развивается.
- Отдельный authenticated browser run не блокирует текущий package; фактическое browser/DB поведение не проверено.
- Coordinator review на `381a046bfb5b44a6a6b5dcbce7c73c40b7085ecd` остановлен после finding AP08-MIRA-01; Лира диагностирует и устраняет нестабильность нового AP-08 attachment-retention test.
- Новую документацию в #283 не добавлять; documentation PR — отдельно в конце задачи.
- Лёва и Марк сейчас не назначены.
- AP-09+, blocking и production rollout не начинать.

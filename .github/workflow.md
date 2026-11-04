# Admin panel — current workflow

- Служебный PR: #251
- План: `ADMIN_PANEL_IMPLEMENTATION_PLAN.md`
- Текущий этап: AP-09 — technical plan готов, coordinator review Миры
- Coordinator: Мира; technical planner/reviewer: Лёва; исполнитель после approval: Лира
- Current main / planning baseline: `2651d2bf7de7212068c54674dca7d90716ea92c3`
- AP-08: implementation #283 + documentation #286 merged; package закрыт
- AP-09 implementation PR ещё не создан
- Scope: Users index/search + dedicated admin user page + reuse existing applicable authorization controls
- План Лёвы: [#6642731589](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6642731589) и `.github/agents/codex-6.1-sol.md`
- Предложения на approval: `admin.users.read` (initial admin only), minimal name/ID directory, targeted manager-only authz read и shared existing controls/canonical mutations
- Следующий шаг: Мира проверяет план; после approval передаёт bounded implementation Лире
- Implementation до approval не начинать; block/lift/enforcement/AP-10/Settings/Stage 6/production вне scope
- Новые lasting docs / PROJECT_STATE — отдельный documentation PR в конце задачи
- Марк не назначен

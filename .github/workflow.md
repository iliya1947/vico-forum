# Admin panel — current workflow

- Служебный PR: #251
- План: `ADMIN_PANEL_IMPLEMENTATION_PLAN.md`
- Текущий этап: AP-08 — implementation
- Coordinator: Мира; technical planner/reviewer: Лёва; исполнитель: Лира
- Current main / implementation baseline: `e39c36ccef29c6164706d826f26c57088a97fa20`
- AP-08 technical plan Лёвы: [#6621343128](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6621343128) — coordinator review Миры **PASS**
- Approved scope: topic close/reopen одной capability, без mandatory reason; closed topic запрещает новые replies всем; authoritative closure/reply concurrency, committed publication replay, atomic History, shared canonical topic actions/Quick actions
- Approved technical choices: persisted `is_closed` + `closure_version`; capability `forum.topic.close`; initial grants moderator/admin; один existing topic-row serialization path; no second RBAC/API/lock subsystem
- Следующий шаг: Лира реализует AP-08 отдельным bounded implementation PR от указанного main, затем публикует stable exact head и фактические checks/acceptance в #251
- После author handoff: Мира coordinator-first whole-PR review; после PASS — Лёва independent technical review того же stable head
- AP-09+, blocking и production rollout не начинать

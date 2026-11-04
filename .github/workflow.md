# Admin panel — current workflow

- Служебный PR: #251
- План: `ADMIN_PANEL_IMPLEMENTATION_PLAN.md`
- Текущий этап: AP-08 — technical plan подготовлен, coordinator review Миры
- Coordinator: Мира; technical planner/reviewer: Лёва; implementation после approval: Лира
- Current main / planning baseline: `e39c36ccef29c6164706d826f26c57088a97fa20`
- AP-07 #282 merged; AP-08 implementation PR ещё не создан
- AP-08: close/reopen одной capability, без обязательной причины; closed topic запрещает новые replies всем
- План Лёвы: [comment #6621343128](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6621343128) и `.github/agents/codex-6.1-sol.md`; новый persisted state + closure CAS version; общий topic-row lock для closure/reply, existing committed receipt replay, atomic History, canonical action/shared Quick actions, сохранение mounted composer при closed denial
- Proposed key `forum.topic.close`, initial moderator/admin grants — часть технического плана на review, ещё не implemented
- Следующий шаг: Мира проверяет технический план и после approval назначает bounded implementation Лире
- Implementation до approval, AP-09+, blocking и production rollout не начинать

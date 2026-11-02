# Complaints — communication

Служебный PR: #254.

## Актуальное состояние

- Packages 1–4 завершены и merged в `main`.
- Текущий этап: **Package 5 — реализация/документация завершена на stable head; ожидаются browser/owner acceptance gates до coordinator review**.
- Лёва подготовил технический план Package 5 от main `1ad8a6402111928c0f08e6f15aba624ba18a4426`; Мира независимо проверила ключевые предпосылки и **утвердила план**.
- Подтверждено по текущему main:
  1. Existing `forum_reply_notifications` допускает только reply/mention и требует actor/topic/post; для complaint Decision без dummy references нужна forward schema extension.
  2. Existing review activity — только TTL lease `forum_complaint_activity`; историческую review activity из него восстановить нельзя. Минимальный `review-started` event в существующем complaint event stream относится к текущему Package 5 scope.
  3. Atomic Decision + notification fanout в одной transaction совместим с текущим replay/CAS: failure откатывает весь набор, committed retry не должен дублировать rows/read state.
  4. Readonly уже persisted Appeals в History допустимы; submit/resolve workflow, queue, eligibility/effective-outcome policy и appeal notifications остаются Package 6.
  5. До Package 6 participant result не показывает фальшивую рабочую Appeal форму/URL; честно сообщает, что подача ещё недоступна.
  6. Текст «административные меры приняты» не выводится без authoritative Case→sanction факта; current main такой связи не хранит.
- Утверждённый implementation scope:
  - real resolved Cases History + bounded lifecycle;
  - privacy-scoped reviewer/identity projections;
  - unified notifications surface с typed `complaint-decision`;
  - deduplicated result notifications фактическим reporters Case и affected content author;
  - participant result route/DTO;
  - сохранить admin History отдельно и не копировать Quick actions/sanctions в Complaints.
- Package 6+, Signals/Security, unrelated admin work и Stage 6/production rollout вне scope.
- Draft implementation PR #277: exact head `5ad59262ea6ef1c2cc5b917f4d03c94564112460`. [CI #41495180494](https://github.com/iliya1947/vico-forum/actions/runs/41495180494) SUCCESS: checks/database, 1728 application и 454 PostgreSQL tests; миграции/manifest/Worker smoke PASS. Обновлены профильная документация и PROJECT_STATE.
- Авторская реализация закончена. Independent coordinator/technical review, targeted browser scenario, owner visual acceptance, merge и production не выполнялись и не заявляются.

## Назначения

- Мира — ChatGPT-5.6 Sol: technical plan согласован.
- Лёва — Codex-6.1 Sol: technical plan завершён; следующий technical reviewer после coordinator PASS.
- Лира — ChatGPT-6: текущий исполнитель Package 5.
- Марк — Codex-6 Sol: без назначения.

Оперативное состояние: [workflow.md](./workflow.md).
Утверждённый продуктовый план: [COMPLAINTS_IMPLEMENTATION_PLAN.md](../COMPLAINTS_IMPLEMENTATION_PLAN.md).
Технический план: [codex-6.1-sol.md](./agents/codex-6.1-sol.md).

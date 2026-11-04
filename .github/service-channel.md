# Admin panel — communication

Служебный PR: #251.

## Актуальное состояние

- AP-01–AP-07 merged в `main`. AP-07 merged через PR #282; current main `e39c36ccef29c6164706d826f26c57088a97fa20`.
- AP-07 прошёл coordinator whole-PR review Миры и independent technical whole-PR review Лёвы на stable head `985160867001fd42b3ad2614262927aab3edfb3e`; confirmed open current-scope defects: 0.
- AP07-ACC-01/02 закрыты actual Worker/Better Auth/PostgreSQL/Chromium evidence. Отдельных действий по AP-07 больше нет.
- Следующий bounded package по permanent `docs/ADMIN_PANEL.md` — **AP-08: topic closure**.
- AP-08 имеет обязательный product gate до technical planning. Уже утверждено только базовое поведение: закрытая тема не принимает новые ответы; закрытие само по себе не меняет solved/best answer/duplicate state и не удаляет сообщения; persisted closed-state и reply admission должны быть authoritative/concurrency-safe; committed publication replay сохраняется.
- До implementation необходимо решение владельца по четырём пунктам:
  1. существует ли reopening вообще;
  2. если существует — использует ли reopen ту же capability, что close, либо отдельную;
  3. требуется ли причина отдельно для close и отдельно для reopen;
  4. есть ли actor exception, позволяющее кому-либо отвечать в закрытой теме; implicit moderator bypass запрещён.
- Эти решения в проверенных source-of-truth и комментариях #251 ранее не зафиксированы. До них Лёве не передаётся technical planning и AP-08 implementation не начинается.
- AP-09 Users, AP-10 blocking, AP-11 closeout и production rollout не начинать раньше соответствующей очереди/решений.

## Назначения и следующий шаг

- Мира — зафиксировала merge AP-07 и AP-08 product gate.
- Лёва — будет назначен на bounded technical planning AP-08 сразу после решений владельца.
- Лира — implementation после проверки/утверждения плана.
- Марк — не назначен.
- **Следующий шаг: решения владельца по четырём пунктам AP-08.**

Оперативное состояние: [workflow.md](./workflow.md).
Контракт: [ADMIN_PANEL_IMPLEMENTATION_PLAN.md](../ADMIN_PANEL_IMPLEMENTATION_PLAN.md).

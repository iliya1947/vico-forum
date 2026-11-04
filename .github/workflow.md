# Admin panel — current workflow

- Служебный PR: #251
- План: `ADMIN_PANEL_IMPLEMENTATION_PLAN.md`
- Текущий этап: AP-08 — bounded technical planning
- Coordinator: Мира; technical planner/reviewer: Лёва; implementation после утверждения плана: Лира
- Current main: `e39c36ccef29c6164706d826f26c57088a97fa20`
- AP-07 implementation PR #282: merged в main
- AP-08 scope: topic closure/reopen
- Product decisions владельца зафиксированы:
  - reopening поддерживается;
  - close и reopen используют одну capability;
  - обязательная причина не требуется ни для close, ни для reopen;
  - closed topic запрещает новые replies всем без actor exceptions; чтобы ответить, тему сначала нужно reopen
- Сохраняются permanent invariants: close/reopen не меняют solved/best answer/duplicate/messages; persisted closed-state и reply admission authoritative/concurrency-safe; committed publication replay сохраняется без нового reply/event
- Следующий шаг: Лёва готовит bounded technical plan AP-08 на актуальном main и публикует его в #251 для coordinator review Миры
- AP-08 implementation до утверждения technical plan не начинать; AP-09+ и production rollout не начинать

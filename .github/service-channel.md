# Admin panel — communication

Служебный PR: #251.

## Актуальное состояние

- AP-01–AP-07 merged в main; current main `e39c36ccef29c6164706d826f26c57088a97fa20`.
- AP-08 product decisions владельца зафиксированы: reopen есть; close/reopen одной capability; mandatory reason нет; closed topic запрещает новые replies всем без actor exceptions.
- Лёва подготовил bounded technical plan AP-08: [#6621343128](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6621343128).
- Мира завершила coordinator review плана: **PASS**. Подтверждённых противоречий product decisions/current main/source-of-truth не найдено; дополнительных продуктовых решений не требуется.
- `closure_version` принят как текущая stale-form/CAS защита от реальной ABA-гонки open→closed→open, а не future-only foundation. Новая closure table, generic lock/event subsystem или второй mutation API не требуются.
- `forum.topic.close` с initial moderator/admin grants принят как единая close/reopen capability в рамках существующей dynamic permission model; custom roles/overrides сохраняют обычную семантику.
- План сохраняет existing publication receipt replay до closed admission, topic-row serialization для close/reply, atomic History, public/admin shared Quick actions и in-memory editor buffer при closed 409/revalidation.
- AP-09 Users, AP-10 blocking, AP-11 closeout и production rollout вне текущего implementation scope.

## Назначения и следующий шаг

- Лёва — technical planning AP-08 завершён; implementation не выполняет.
- Мира — technical plan review завершён: PASS.
- **Лира — следующий агент: реализовать утверждённый AP-08 отдельным bounded implementation PR.**
- Марк не назначен.

### Задача Лире

Реализуй утверждённый technical plan AP-08 из #6621343128 на актуальном `main` `e39c36ccef29c6164706d826f26c57088a97fa20`.

Scope: topic close/reopen и только необходимые для него schema/capability/History/reply-admission/shared-UI/documentation/test изменения.

Готовность:
- утверждённые product/technical invariants реализованы без AP-09+ и несвязанного refactor;
- applicable repository/PG/runtime/browser checks выполнены в доступной среде и фактически описаны;
- отдельный implementation PR имеет stable exact head;
- `PROJECT_STATE.md` и lasting source-of-truth обновлены только фактически реализованным состоянием;
- author handoff опубликован в #251 для coordinator-first review Миры.

Оперативное состояние: [workflow.md](./workflow.md).
Контракт: [ADMIN_PANEL_IMPLEMENTATION_PLAN.md](../ADMIN_PANEL_IMPLEMENTATION_PLAN.md).

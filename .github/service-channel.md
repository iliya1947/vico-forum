# Complaints — communication

Служебный PR: #254.

## Актуальное состояние

- Packages 1–4 завершены и merged в `main`.
- Package 5 реализован в Draft PR #277, но coordinator review stable head `5ad59262ea6ef1c2cc5b917f4d03c94564112460` завершён **CHANGES REQUIRED**.
- Exact-head CI #41495180494 зелёный: 1728 application / 454 PostgreSQL tests и остальные обязательные repository checks PASS. Green CI не закрыл найденные semantic gaps.
- Мира проверила весь Package 5 scope. Подтверждённых проблем в schema/migration, atomic Decision→notifications fanout, replay/dedup/read_at, participant result membership/privacy, reporter/appellant identity filtering, review-started persistence и Package 6 boundary не найдено.
- Подтверждены 5 current-scope issues:
  1. **History excerpt bound:** `readComplaintResolvedHistory` выбирает полный immutable `original_content` до 25 Cases, а 500-char truncation выполняется только в React. Post body storage не имеет content-length bound, поэтому private loader/data payload не bounded. Excerpt должен ограничиваться на server/read boundary.
  2. **Package 5 query boundary:** unified notifications принимает duplicate `page` и игнорирует unknown query; History group3 в existing Attention route также silently принимает duplicate/invalid pagination (или fallback 0). Approved plan требует unknown/duplicate pagination → 400 для новых P5 surfaces и normalized React Router URL там, где Framework добавляет internal metadata. Existing unrelated Attention surfaces не переписывать.
  3. **Legacy notification count semantics:** `readReplyNotifications` и `markReplyNotificationRead` уже фильтруют reply/mention, но `countUnreadReplyNotifications` считает все kinds. Header при этом всё ещё вызывает legacy count, а новый `countUnreadNotifications` лишь alias. Нужно сохранить legacy reply/mention-only SQL count и перевести generic/header path на all-kind generic count.
  4. **Resolved History label:** History list использует `complaintQueueTotal` = “Open cases: {{total}}”, поэтому resolved History сообщает пользователю неверный статус. Нужен отдельный localized resolved-History total label.
  5. **Readonly Appeal presentation:** timeline DTO получает persisted `appealSide` и `appealOrdinal`, но UI их не отображает. Package 5 требует readonly lifecycle existing Appeal records с argument/ordinal/side/time; это не реализация Package 6 workflow.
- Correction должна быть локальной. Не менять schema/domain сверх необходимости, не вводить Appeal submit/policy/notifications, sanctions, Signals/Security или unrelated UI rewrite.
- После нового implementation head Мира начинает новый whole-PR cycle. Лёва не расходуется до coordinator PASS.

## Назначения

- Мира — ChatGPT-5.6 Sol: coordinator review завершён CHANGES REQUIRED.
- Лира — ChatGPT-6: текущий исполнитель bounded correction PR #277.
- Лёва — Codex-6.1 Sol: ждёт нового coordinator PASS.
- Марк — Codex-6 Sol: без назначения.

Оперативное состояние: [workflow.md](./workflow.md).
Утверждённый продуктовый план: [COMPLAINTS_IMPLEMENTATION_PLAN.md](../COMPLAINTS_IMPLEMENTATION_PLAN.md).
Технический план: [codex-6.1-sol.md](./agents/codex-6.1-sol.md).

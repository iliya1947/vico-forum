# Лира — ChatGPT-6

## Активная задача — AP-07 implementation

Основание: назначение в workflow #251, принятый technical plan Лёвы в [codex-6.1-sol.md](./codex-6.1-sol.md).
Base `main` при старте: `d6fc875a596ca4f58e64c1d8e1373dbd2fcb67ea`.

## Subtask 1/3 — section → bounded topics

- Создан один общий [draft implementation PR #282](https://github.com/iliya1947/vico-forum/pull/282), `feat/admin-topic-message-ap07`.
- Текущий head `bc864636a15165ba5e7fc8cdea53a88f39ee5871`. Восемь изменённых файлов: protected AdminForumReader SQL current title/ID с literal LIKE escaping, count, 25-item + lookahead ID keyset, Help section; Hyperdrive adapter; section loader/query; UI list/link; route/DOM/native PG tests.
- Доменная тема/admin topic route **ещё не создана**. Ссылка section → topic готовится для subtask 2, поэтому draft PR не готов к merge/review.
- Локальные tests/TypeScript/PostgreSQL в этой среде не запускались: git clone недоступен из-за DNS; GitHub exact-head CI [#41742485116](https://github.com/iliya1947/vico-forum/actions/runs/41742485116) — in_progress, без итогового verdict на момент записи. Результат CI не выдаётся за browser/whole-PR acceptance.

## Следующие подзадачи

1. Dedicated admin topic page/view и отдельные authorization/private DTO/translation/attachment boundaries.
2. Shared per-message Quick actions, source-locale inline transport/history response privacy, завершение всей AP-07 и её проверки.
3. Только после полного AP-07: stable-head handoff в #251 для coordinator-first whole-PR review Миры.

AP-08 closure/reopen, Users, blocking, Settings, structural CRUD и unrelated Complaints/Signals/production work не включать.

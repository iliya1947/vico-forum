# Мира — ChatGPT-5.6 Sol

## AP-08 technical plan review

Technical plan Лёвы #6621343128 проверен против current main `e39c36ccef29c6164706d826f26c57088a97fa20`, owner decisions, `docs/ADMIN_PANEL.md`, authorization и Editor publication/replay boundaries.

Verdict: **PASS**.

1. `is_closed + closure_version` — минимальный persisted/CAS набор; отдельная version нужна для stale ABA open→closed→open.
2. Existing topic-row `FOR UPDATE` остаётся общей authoritative serialization boundary для reply и closure; новой lock-системы не требуется.
3. Matching committed publication receipt проверяется до closed admission, поэтому уже подтверждённый reply остаётся idempotently replayable после closure.
4. `forum.topic.close` одной capability на close/reopen согласуется с owner decision и dynamic permission model; initial moderator/admin grants согласуются с текущей moderation default model.
5. Close/reopen History остаётся atomic в существующей transaction/order boundary; no-op/stale/denied/replay не создают events.
6. Closed-state ограничивает только новые replies; существующие read/edit/solution/duplicate/source/history/attachment semantics не расширяются без решения.
7. Composer preservation при closed 409/revalidation нужен для текущего Editor contract: mounted text/Undo/attachment selection не должны теряться из-за ожидаемой server state conflict.
8. AP-09+, blocking, structural CRUD, generic infrastructure и production rollout не включены.

Подтверждённых current-scope замечаний к плану: 0.

## Следующий шаг

Лира реализует утверждённый AP-08 отдельным bounded implementation PR. После stable author handoff Мира проводит coordinator-first whole-PR review.

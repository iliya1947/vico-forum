# Complaints — communication

Служебный PR: #254.

## Актуальное состояние

- Packages 1–4 завершены и merged в `main`.
- Package 5 реализован в Draft PR #277, stable exact head `1af1c6272bf7b46009145488b52a42f89bfd0b2f` от текущего main `1ad8a6402111928c0f08e6f15aba624ba18a4426`.
- Повторный coordinator whole-PR review Миры нового exact head завершён **PASS**.
- Exact-head CI #41501045924 независимо сверён: head совпадает; SUCCESS, 1736/1736 application tests (123 files), 455/455 PostgreSQL tests (36 files), lint/typecheck/builds/migration/schema/Worker smoke PASS.
- Пять ранее подтверждённых current-scope findings проверены на новом head и закрыты: server-side History excerpt bound; strict normalized P5 query/pagination; legacy/generic unread count split + generic header; resolved History total label; readonly Appeal side/ordinal.
- Whole-PR повторно проверен по Package 5 scope: History/timeline permissions и identity projection, Decision→notification atomic fanout/replay/dedup, participant-only result, review-started lease/event semantics, migration/backfill и Package 6 boundary. Новых подтверждённых current-scope дефектов не найдено.
- React Router 8.3.1 normalized loader `url` для Framework Mode подтверждён по актуальной официальной API/changelog документации.
- Targeted interactive Chromium→Worker→PG и owner visual acceptance не заявляются; отдельного owner visual request не было.
- Следующий этап: независимый technical whole-PR review Лёвы того же stable exact head. Implementation не менять до его результата.

## Назначения

- Мира — ChatGPT-5.6 Sol: coordinator PASS завершён.
- Лира — ChatGPT-6: implementation/correction завершены, без текущего назначения.
- Лёва — Codex-6.1 Sol: **следующий independent technical reviewer PR #277 exact head `1af1c6272bf7b46009145488b52a42f89bfd0b2f`**.
- Марк — Codex-6 Sol: без назначения.

Оперативное состояние: [workflow.md](./workflow.md).
Утверждённый продуктовый план: [COMPLAINTS_IMPLEMENTATION_PLAN.md](../COMPLAINTS_IMPLEMENTATION_PLAN.md).
Технический план: [codex-6.1-sol.md](./agents/codex-6.1-sol.md).

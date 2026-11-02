# Complaints — communication

Служебный PR: #254.

## Актуальное состояние

- Packages 1–4 завершены и merged в `main`.
- Package 5 реализован в Draft PR #277. Предыдущий coordinator whole-PR review head `5ad59262ea6ef1c2cc5b917f4d03c94564112460` завершён **CHANGES REQUIRED**; пять подтверждённых current-scope findings исправлены в новом stable exact head `1af1c6272bf7b46009145488b52a42f89bfd0b2f`.
- **Exact-head CI #41501045924 — SUCCESS:** 1736 application / 455 PostgreSQL tests, lint/typecheck/builds, migration/manifest/Worker smoke PASS. Проверки нового head не заменяют независимый review.
- Исправленные 5 current-scope issues:
  1. SQL `left(...,500)` ограничивает History excerpt до loader/data JSON; full review/evidence не менялись.
  2. Только новые surfaces P5 (unified notifications, Attention History group3) строго отвергают duplicate/unknown/invalid application query с 400. Используется normalized Framework URL; соседние Attention modes оставлены без изменения.
  3. Legacy `countUnreadReplyNotifications` снова считает только reply/mention в SQL; generic `countUnreadNotifications` считает все виды, header использует generic API. Read/open существующих уведомлений не переделывались.
  4. Resolved History получил отдельный EN/RU/HE total label с актуальными fingerprints.
  5. Readonly timeline показывает persisted Appeal side/ordinal и существующие аргумент/результат, без Package 6 workflow.
- Targeted application/router/SSR и native PostgreSQL regressions добавлены, успешно выполнены в exact-head CI.
- Не подтверждены новые defects в schema/fanout/privacy/activity; эти механизмы не переделывались. Chromium→Worker→PG interactive acceptance и owner visual acceptance не заявлены; браузер пользователя Лира не использует.
- Следующий этап: новый coordinator whole-PR review Миры PR #277 на `1af1c6272bf7b46009145488b52a42f89bfd0b2f`, затем при coordinator PASS независимый technical review Лёвы.

## Назначения

- Мира — ChatGPT-5.6 Sol: следующий coordinator whole-PR reviewer нового stable head.
- Лира — ChatGPT-6: bounded correction и author handoff завершены.
- Лёва — Codex-6.1 Sol: independent technical reviewer после coordinator PASS.
- Марк — Codex-6 Sol: без назначения.

Оперативное состояние: [workflow.md](./workflow.md).
Утверждённый продуктовый план: [COMPLAINTS_IMPLEMENTATION_PLAN.md](../COMPLAINTS_IMPLEMENTATION_PLAN.md).
Технический план: [codex-6.1-sol.md](./agents/codex-6.1-sol.md).

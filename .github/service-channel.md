# Complaints — communication

Служебный PR: #254.

## Актуальное состояние

- Packages 1–4 завершены и merged в `main`.
- Package 5 реализован в Draft PR #277; reviewed exact head `1af1c6272bf7b46009145488b52a42f89bfd0b2f` от main `1ad8a6402111928c0f08e6f15aba624ba18a4426`.
- Exact-head CI #41501045924: SUCCESS — 1736/1736 application tests, 455/455 PostgreSQL tests, lint/typecheck/builds/migration/schema/Worker smoke PASS.
- Coordinator whole-PR review Миры этого head ранее завершён PASS после закрытия пяти предыдущих findings.
- Лёва завершил independent technical whole-PR review: **CHANGES REQUIRED — 2 P2 и 2 P3**; полный результат: https://github.com/iliya1947/vico-forum/pull/254#issuecomment-6586050672.
- Мира независимо перепроверила каждый finding против exact head, current main и действующего Package 5 contract. **Все 4 подтверждены как current-scope defects**:
  1. **P2 — History timeline pagination:** route regexp отвергает корректные положительные `page`; после первых 50 событий следующая страница недоступна.
  2. **P2 — desktop Decision notification:** удалён avatar, но desktop four-column grid сохранён; copy попадает в 3.25rem avatar column, карточка визуально ломается.
  3. **P3 — readonly Appeal result localization:** persisted `upheld | overturned` выводится raw enum в EN/RU/HE History; Package 5 обязан локализовать текущую readonly presentation.
  4. **P3 — notifications POST boundary:** общий inbox action использует unbounded `request.formData()`, принимает duplicate/unknown fields и не требует URL-encoded body, хотя утверждённый P5 technical contract требует bounded URL-encoded input + duplicate/id validation.
- Findings #1–4 не являются Package 6/future groundwork. Auth bypass по finding #4 не заявляется; ownership/result membership остаются отдельными прошедшими boundaries.
- Correction должен быть локальным и bounded; уже прошедшие migration/fanout/activity/privacy boundaries без отдельного подтверждённого дефекта не переделывать.
- Следующий шаг: Лира выполняет один correction package по этим четырём findings в PR #277. После нового stable head + применимых checks — новый coordinator whole-PR review Миры; после PASS — independent technical review Лёвы того же head.

## Назначения

- Мира — ChatGPT-5.6 Sol: перепроверка technical findings завершена, 4/4 confirmed current-scope.
- Лира — ChatGPT-6: назначен bounded correction Package 5 / PR #277 по четырём подтверждённым findings.
- Лёва — Codex-6.1 Sol: independent review завершён, CHANGES REQUIRED; implementation не менял.
- Марк — Codex-6 Sol: без назначения.

Оперативное состояние: [workflow.md](./workflow.md).
Утверждённый продуктовый план: [COMPLAINTS_IMPLEMENTATION_PLAN.md](../COMPLAINTS_IMPLEMENTATION_PLAN.md).
Технический план: [codex-6.1-sol.md](./agents/codex-6.1-sol.md).

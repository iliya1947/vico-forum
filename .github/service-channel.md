# Complaints — communication

Служебный PR: #254.

## Актуальное состояние

- Packages 1–4 merged в `main`; Package 5 реализован в Draft PR #277, новый stable exact head `96bb5e82dc7ff7df9e57ce08c182f5c8c49d38fe` от main `1ad8a6402111928c0f08e6f15aba624ba18a4426`.
- Предыдущий coordinator whole-PR PASS и independent technical CHANGES REQUIRED относились к `1af1c6272bf7b46009145488b52a42f89bfd0b2f`. [Технические findings Лёвы](https://github.com/iliya1947/vico-forum/pull/254#issuecomment-6586050672) перепроверены Мирой: 4/4 current-scope.
- Четыре подтверждённых findings исправлены в ограниченном пакете:
  1. History timeline использует canonical strict `page` parser, включая page=1/10000, и проверенный memory-router Next переход после 50 событий.
  2. Системная Decision карточка получает три реальные CSS grid tracks на desktop вместо пустой avatar-колонки; мобильный и RTL layout, legacy reply/mention cards сохранены.
  3. Persisted Appeal result `upheld | overturned` локализован в readonly History EN/RU/HE; source fingerprints добавлены, DB values/effective outcome не менялись.
  4. Shared notifications POST читает максимум 4096 bytes URL-encoded body, проверяет ровно intent/open + bounded notification ID, запрещает duplicate/unknown/invalid fields/encoding до storage mutation; session/origin/recipient ownership/result membership сохранены.
- Новые targeted tests для loader >50 events, UI Next route transition, HTML/CSS system-vs-legacy presentation, readonly labels и malformed/oversized POST. [CI #41513618388](https://github.com/iliya1947/vico-forum/actions/runs/41513618388): **SUCCESS**, 1741 application / 455 PostgreSQL tests, lint/typecheck/builds/migration/schema/Worker smoke PASS.
- Schema/migration, atomic Decision fanout, activity, participant privacy, permissions, admin и Package 6 не расширялись и не переделывались.
- Targeted Chromium → Worker → PostgreSQL и owner visual acceptance на новом head Лирой не проводились и не заявляются; браузер пользователя не использовался. Реализация завершена; ожидается новый independent coordinator cycle, затем technical review при PASS.

## Назначения

- Мира — ChatGPT-5.6 Sol: следующий coordinator whole-PR reviewer нового stable head.
- Лира — ChatGPT-6: bounded correction + author handoff завершены.
- Лёва — Codex-6.1 Sol: ждёт нового coordinator PASS для independent technical review того же head.
- Марк — Codex-6 Sol: без назначения.

Оперативное состояние: [workflow.md](./workflow.md).
Утверждённый продуктовый план: [COMPLAINTS_IMPLEMENTATION_PLAN.md](../COMPLAINTS_IMPLEMENTATION_PLAN.md).
Технический план: [codex-6.1-sol.md](./agents/codex-6.1-sol.md).

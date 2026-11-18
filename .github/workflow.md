# Workflow — пользовательские действия перед #320

## Общий канал

- Service PR: #342.
- Последовательность реализации: edit own topic title → Watch → bookmarks → mute/block → #320.
- Service PR #342 остаётся общим каналом всей этой последовательности и не merge в main.

## Завершённый этап 1 — edit own topic title

- Implementation PR #343: merged, merge commit `d8667f630450f702783bbbdb9a3ec14432e75660`.
- Docs PR #344: merged, merge commit `7cc23edede57994cdedab49c1556ddb55034dd29`.
- Reviews: PASS; confirmed current-scope defects: 0.
- Owner visual acceptance: отложен в общий UI/UX pass по прямому решению владельца.

## Активный implementation-этап 2 — Watch

- Технический план Лёвы: завершён и принят Мирой.
- W1/W2/W3: приняты; детали — `USER_ACTIONS_SERVICE_PLAN.md`.
- Исполнитель: Лира / ChatGPT-6.
- Implementation PR/head: ещё отсутствует.
- После реализации: Мира coordinator review → Лёва technical review, если не участвовал в реализации.

## Опережающий planning-track

- Лёва / Codex-6.1 Sol заранее планирует оставшиеся функции **по одной**.
- Текущий planning slice: **Bookmarks**.
- После полного Bookmarks plan: Лёва STOP; Mute/block не планирует до следующей команды владельца.
- Предварительное планирование не разрешает реализацию Bookmarks до завершения Watch и отдельного handoff.

## Следующие параллельные шаги

1. Лира реализует Watch в отдельном implementation PR и после stable head STOP возвращает Мире.
2. Лёва исследует актуальный main и готовит полный технический план Bookmarks в `USER_ACTIONS_SERVICE_PLAN.md`, затем STOP.

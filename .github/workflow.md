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
- Implementation PR #345: Draft, branch `feature/topic-watch`, промежуточный head `6cede3af5fe2d096cf01be676050a662b2d9f91b` (ещё не stable review head).
- Backend/schema/route реализованы; UI/loader и относящиеся tests/CI/browser acceptance ещё не завершены.
- После реализации: Мира coordinator review → Лёва technical review, если не участвовал в реализации.

## Опережающий planning-track

- Лёва / Codex-6.1 Sol заранее планирует оставшиеся функции **по одной**.
- Текущий planning slice: **Bookmarks**.
- Bookmarks plan: **готов**, B1–B7 в `USER_ACTIONS_SERVICE_PLAN.md`; ожидает scope/fit решений Миры по target/product contract, schema/ACL, self-state admission и route/list/UI.
- После полного Bookmarks plan: Лёва STOP; Mute/block не планирует до следующей команды владельца.
- Предварительное планирование не разрешает реализацию Bookmarks до завершения Watch и отдельного handoff.

## Следующие параллельные шаги

1. Лира после продолжения владельца завершает Watch UI/private loader и focused/real-DB/browser проверки в #345; после stable exact head STOP возвращает Мире на coordinator review. До этого #345 Draft.
2. Лёва завершил полный Bookmarks plan и **STOP**. Мира может проверить план и зафиксировать B1/B2/B3/B5; реализация Bookmarks не активируется до завершения Watch и отдельного handoff. Mute/block — только после следующей команды владельца.

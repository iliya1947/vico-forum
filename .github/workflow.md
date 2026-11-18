# Workflow — пользовательские действия перед #320

## Общий канал

- Service PR: #342.
- Последовательность реализации: edit own topic title → Watch → bookmarks → mute/block → #320.
- Service PR #342 остаётся общим каналом всей этой последовательности и не merge в main.

## Завершённый этап 1 — edit own topic title

- Implementation PR #343 и docs PR #344: merged.
- Reviews: PASS; confirmed current-scope defects: 0.

## Активный implementation-этап 2 — Watch

- Технический план: завершён и принят.
- Исполнитель: Лира / ChatGPT-6.
- Draft implementation PR #345, current interim head `bacaadfed1d2494380956c278aab7b0b1bbbd862` (previous `6cede3af5fe2d096cf01be676050a662b2d9f91b`).
- CI на предыдущем head выявил реальные ошибки typing/test fixtures; исправлены в текущем head, повторные GitHub checks выполняются.
- Backend/schema stage выполнен; UI/tests/browser acceptance ещё не завершены.
- PR #345 не готов к review.

## Опережающий planning-track

- Bookmarks: полный план Лёвы завершён; scope/fit Миры — ACCEPT.
- Принятый target: темы + приватный список своих сохранённых тем.
- Bookmarks implementation не активирован до завершения Watch и отдельного handoff.
- Следующий planning slice: **Mute/block**, но ещё не активирован.

## Следующий шаг

1. Лира продолжает Watch до stable exact head и STOP для coordinator whole-PR review Миры.
2. По следующей отдельной команде владельца Лёва готовит полный технический план Mute/block и после него STOP.

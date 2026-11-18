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
- Draft implementation PR #345, current interim head `bacaadfed1d2494380956c278aab7b0b1bbbd862`.
- Backend/schema stage выполнен; CI corrections продолжаются; UI/tests/browser acceptance ещё не завершены.
- PR #345 не готов к review.

## Опережающий planning-track

- Bookmarks: полный план Лёвы завершён и принят Мирой.
- Принятый target Bookmarks: темы + приватный список своих сохранённых тем.
- Bookmarks implementation не активирован до завершения Watch и отдельного handoff.
- **Mute/block: текущий planning slice.**
- Технический планировщик: Лёва / Codex-6.1 Sol.
- Mute/block implementation не активирован.

## Следующие параллельные шаги

1. Лира продолжает Watch до stable exact head и STOP для coordinator whole-PR review Миры.
2. Лёва исследует актуальный main и готовит полный технический план Mute/block, затем STOP для scope/fit review Миры.

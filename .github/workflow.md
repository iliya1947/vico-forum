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
- Draft implementation PR #345; current interim head `72e9b8d15ee515af1c5dab309cc66ea9514178ae` (not stable review head).
- Backend/schema/route и UI/loader/locales внедрены; route/UI+real PG тесты и connected Chromium workflow добавлены; CI/browser acceptance ещё не завершён.
- PR #345 не готов к review.

## Опережающий planning-track

- Bookmarks: полный план Лёвы завершён и принят Мирой.
- Принятый target Bookmarks: темы + приватный список своих сохранённых тем.
- Bookmarks implementation не активирован до завершения Watch и отдельного handoff.
- **Mute/block: текущий planning slice.**
- Технический планировщик: Лёва / Codex-6.1 Sol.
- Mute/block plan: **готов**, M0–M8 в `USER_ACTIONS_SERVICE_PLAN.md`; ожидает scope/fit решений Миры по M1/M2/M3/M4/M6.
- Mute/block implementation не активирован.

## Следующие параллельные шаги

1. Лира продолжает Watch до stable exact head и STOP для coordinator whole-PR review Миры.
2. Лёва завершил полный Mute/block plan и **STOP**. Мира проверяет весь план и фиксирует M1/M2 (product targets/effects), M3 (history/consumption/races), M4 (schema/ACL/admission), M6 (route/list/UI/availability). Будущая реализация не активируется этим планированием.

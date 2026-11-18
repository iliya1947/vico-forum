# Workflow — пользовательские действия перед #320

## Общий канал

- Service PR: #342.
- Последовательность: edit own topic title → Watch → bookmarks → mute/block → #320.
- Service PR #342 остаётся общим каналом всей этой последовательности и не merge в main.

## Завершённый этап 1 — edit own topic title

- Implementation PR #343: merged, merge commit `d8667f630450f702783bbbdb9a3ec14432e75660`.
- Docs PR #344: merged, merge commit `7cc23edede57994cdedab49c1556ddb55034dd29`.
- Implementation/docs reviews: PASS.
- Confirmed current-scope defects: 0.
- Owner visual acceptance: отложен в общий UI/UX pass по прямому решению владельца.

## Активный этап 2 — Watch

- Scope: явный Watch/Unwatch конкретной темы для будущих reply-notifications через существующий inbox.
- Текущий main/base: `7cc23edede57994cdedab49c1556ddb55034dd29`.
- Технический планировщик: Лёва / Codex-6.1 Sol.
- Технический план: готов в `USER_ACTIONS_SERVICE_PLAN.md`, §1–9; ожидает scope/fit review Миры и решений W1–W3.
- Исполнитель: не активирован; по стандартному циклу после принятия плана — Лира / ChatGPT-6.
- Implementation PR/head: отсутствует.
- Reviewers: Мира coordinator; Лёва technical reviewer только если не участвует в реализации.
- Реализация Watch ещё не начата.

## Следующий шаг

Мира проверяет полный технический план Watch и фиксирует решения W1 (новая Watch table/migration/runtime privileges), W2 (own-state authorization classification либо отдельный catalog key), W3 (topic route/result contract). Затем определяет готовность bounded implementation и активирует исполнителя. Лёва завершил планирование и STOP; Лира ещё не активирована. Implementation PR/head отсутствует, feature tests/CI/browser не запускались.

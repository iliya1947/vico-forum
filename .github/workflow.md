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
- Исполнитель: не активирован; по стандартному циклу после принятия плана — Лира / ChatGPT-6.
- Implementation PR/head: отсутствует.
- Reviewers: Мира coordinator; Лёва technical reviewer только если не участвует в реализации.
- Реализация Watch ещё не начата.

## Следующий шаг

Лёва исследует Watch по актуальному main и фиксирует полный технический план в `USER_ACTIONS_SERVICE_PLAN.md`: persistence/state, authoritative actor/topic boundary, существующий reply/mention notification fanout и dedupe, route/UI, lifecycle/failure/concurrency и применимые проверки. Код не реализует. После плана — STOP и возврат Мире на scope/fit review.

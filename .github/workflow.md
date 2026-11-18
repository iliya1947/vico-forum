# Workflow — пользовательские действия перед #320

## Общий канал

- Service PR: #342.
- Последовательность: edit own topic title → Watch → bookmarks → mute/block → #320.
- Service PR #342 остаётся общим каналом всей этой последовательности и не merge в main.

## Завершённый этап 1 — edit own topic title

- Implementation PR #343: merged, merge commit `d8667f630450f702783bbbdb9a3ec14432e75660`.
- Docs PR #344: merged, merge commit `7cc23edede57994cdedab49c1556ddb55034dd29`.
- Reviews: PASS; confirmed current-scope defects: 0.
- Owner visual acceptance: отложен в общий UI/UX pass по прямому решению владельца.

## Активный этап 2 — Watch

- Base/current main для принятого плана: `7cc23edede57994cdedab49c1556ddb55034dd29`.
- Технический план Лёвы: завершён и принят Мирой.
- W1: новая минимальная watch persistence + forward migration/ACL — ACCEPT.
- W2: authenticated personal self-state, **без нового RBAC permission** — ACCEPT.
- W3: canonical topic route + narrow `setTopicWatch` desired-state command — ACCEPT.
- Исполнитель: Лира / ChatGPT-6.
- Implementation PR/head: ещё отсутствует.
- Review после реализации: Мира coordinator; затем Лёва technical reviewer на том же stable head.

## Следующий шаг

Лира реализует принятый bounded Watch scope в отдельном implementation PR от актуального main, выполняет применимые проверки и browser acceptance, фиксирует stable exact head и STOP для coordinator whole-PR review Миры. #342 остаётся open service PR.

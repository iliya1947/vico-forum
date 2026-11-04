# Admin panel — communication

Служебный PR: #251.

## Актуальное состояние

- AP-01–AP-06 merged в main; AP-07 реализован в draft PR #282.
- Проверенный defective head: `b0d5e74663cd57851225447e792ab4a9bf98322c`.
- CI #41746716082 SUCCESS, но actual browser acceptance Лёвы завершилась FAIL по двум runtime findings.
- Мира независимо перепроверила оба finding как current-scope:
  - **AP07-ACC-01 / P2** — реальный defect AP-07 privacy transport. В action responses выставляется `private, no-store`, но canonical `app/routes/topic.tsx` не экспортирует route headers; фактический Worker/browser response теряет Cache-Control. Это прямо противоречит AP-07 contract.
  - **AP07-ACC-02 / P2** — реальный defect нового admin topic responsive layout. Допустимый display name до 100 символов может расширить новую admin topic page за 320/768 viewport; responsive layout входит в текущий admin contract.
- Оба finding относятся к AP-07 и требуют локального correction. Широкий public-layout redesign, новый RBAC/domain/backend, migrations и AP-08+ не требуются.
- Owner visual acceptance не запрашивался.

## Назначения

- Координатор: Мира — coordinator triage завершён.
- Лира — active bounded correction двух дефектов в PR #282.
- Лёва — после нового stable head выполняет targeted actual browser re-test; independent technical whole-PR review остаётся после coordinator PASS.
- Марк не назначен.

## Correction scope

1. Исправить конечный HTTP cache/privacy envelope для затронутых canonical topic action responses так, чтобы AP-07 history/inline success и controlled errors реально получали `private, no-store`, без поломки public GET, parent/cookie semantics или domain/RBAC behavior.
2. Исправить только AP-07 admin topic responsive overflow для валидных длинных display names/контента на narrow/tablet viewports.
3. Добавить/обновить регрессии, проверяющие фактический HTTP boundary и responsive behavior, где это доступно существующим harness/tests.
4. Не менять unrelated public layout, permissions, schema/migrations, dependencies, Complaints/Signals, AP-08+.
5. После correction опубликовать новый stable exact head и фактические checks/CI в #251.

Оперативный маршрут: [workflow.md](./workflow.md).
Контракт: [ADMIN_PANEL_IMPLEMENTATION_PLAN.md](../ADMIN_PANEL_IMPLEMENTATION_PLAN.md).
Runtime findings: [#6620081742](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6620081742).

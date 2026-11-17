# Workflow — edit own topic title

## Текущее состояние

- Задача: редактирование заголовка собственной темы.
- Этап: coordinator technical whole-PR review Миры завершён без current-scope findings; ожидается owner visual acceptance перед формальным coordinator PASS.
- Координатор: Мира / ChatGPT-5.6 Sol.
- Технический планировщик и исполнитель: Лёва / Codex-6.1 Sol.
- Лира / ChatGPT-6: не участвует в реализации.
- Независимый reviewer после formal coordinator PASS: Марк / Codex-6 Sol.
- Implementation PR: #343 — https://github.com/iliya1947/vico-forum/pull/343.
- Stable implementation head: `10321fdae762004ac2d55e9618a89c6c41e0d2ac`.
- Current main: `906d15d896cc3a4f3b7dc9a03f46acd883925d1d`.
- Coordinator technical review: no confirmed current-scope defects.
- GitHub checks: 17 check-runs success on exact head, including `title_browser`, `checks`, `database` and existing browser suites.

## Принятый scope

- Новый permission `forum.topic.title.editOwn` + forward catalog migration/default grants.
- Server-side session/permission/ownership, active-account admission, immutable revision и CAS обязательны.
- Новый изменённый title получает `sourceLocale: "und"`; старые translations остаются revision-bound.
- Existing user-measure restriction `posts.edit` блокирует и title edit; нового restriction key нет.
- Отдельный title-edit cooldown не добавляется.
- Отдельные drafts/receipts/autosave/recovery subsystem не добавляются.

## Следующий шаг

Владелец выполняет visual acceptance UI-изменения #343. Если head остаётся `10321fdae762004ac2d55e9618a89c6c41e0d2ac` и acceptance дан, Мира фиксирует formal coordinator PASS/APPROVE и передаёт тот же exact head Марку на независимый технический review.

Служебный PR #342 не merge в main.

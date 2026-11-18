# Workflow — edit own topic title

## Текущее состояние

- Задача: редактирование заголовка собственной темы.
- Этап: implementation review cycle завершён; PR #343 готов к merge владельцем.
- Координатор: Мира / ChatGPT-5.6 Sol — PASS.
- Технический планировщик и исполнитель: Лёва / Codex-6.1 Sol.
- Независимые reviewers: Лира / ChatGPT-6 — PASS; Марк / Codex-6 Sol — PASS.
- Implementation PR: #343 — https://github.com/iliya1947/vico-forum/pull/343.
- Stable implementation head: `10321fdae762004ac2d55e9618a89c6c41e0d2ac`.
- Base/current main на closeout-проверке: `906d15d896cc3a4f3b7dc9a03f46acd883925d1d`.
- Confirmed current-scope defects: отсутствуют.
- GitHub checks: 17 check-runs success на exact head.
- Owner visual acceptance: отложен в отдельный UI/UX pass по прямому решению владельца.

## Принятый scope

- Новый permission `forum.topic.title.editOwn` + forward catalog migration/default grants.
- Server-side session/permission/ownership, active-account admission, immutable revision и CAS обязательны.
- Новый изменённый title получает `sourceLocale: "und"`; старые translations остаются revision-bound.
- Existing user-measure restriction `posts.edit` блокирует и title edit; нового restriction key нет.
- Отдельный title-edit cooldown не добавляется.
- Отдельные drafts/receipts/autosave/recovery subsystem не добавляются.

## Следующий шаг

Владелец merge implementation PR #343. После фактического merge Мира открывает отдельный заключительный docs PR и приводит permanent/current-state документацию к уже merged состоянию: `docs/auth/AUTHORIZATION.md`, `docs/ADMIN_PANEL.md`, `PROJECT_STATE.md` и необходимую history/navigation запись по действующим правилам.

Служебный PR #342 не merge в main.

# Workflow — edit own topic title

## Текущее состояние

- Задача: редактирование заголовка собственной темы.
- Этап: coordinator PASS Миры; ожидается независимый технический review Марка.
- Координатор: Мира / ChatGPT-5.6 Sol — PASS.
- Технический планировщик и исполнитель: Лёва / Codex-6.1 Sol.
- Независимый reviewer / следующий участник: Марк / Codex-6 Sol.
- Implementation PR: #343 — https://github.com/iliya1947/vico-forum/pull/343.
- Stable implementation head: `10321fdae762004ac2d55e9618a89c6c41e0d2ac`.
- Current main/base: `906d15d896cc3a4f3b7dc9a03f46acd883925d1d`.
- GitHub checks: 17 check-runs success на exact head.
- Owner visual acceptance: не gate этой bounded-задачи; отложен в отдельный UI/UX pass по прямому решению владельца.

## Принятый scope

- Новый permission `forum.topic.title.editOwn` + forward catalog migration/default grants.
- Server-side session/permission/ownership, active-account admission, immutable revision и CAS обязательны.
- Новый изменённый title получает `sourceLocale: "und"`; старые translations остаются revision-bound.
- Existing user-measure restriction `posts.edit` блокирует и title edit; нового restriction key нет.
- Отдельный title-edit cooldown не добавляется.
- Отдельные drafts/receipts/autosave/recovery subsystem не добавляются.

## Следующий шаг

Марк проверяет весь принятый scope PR #343 на exact head `10321fdae762004ac2d55e9618a89c6c41e0d2ac`. Проверка независимая, без исправлений во время review. При PASS задача переходит к merge/documentation closeout; при подтверждённых current-scope findings — возврат Лёве одним пакетом через Миру.

Служебный PR #342 не merge в main.

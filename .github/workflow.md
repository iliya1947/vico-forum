# Workflow — edit own topic title

## Текущее состояние

- Задача: редактирование заголовка собственной темы.
- Этап: технический план принят; реализация передана Лире.
- Координатор: Мира / ChatGPT-5.6 Sol.
- Технический планировщик: Лёва / Codex-6.1 Sol; план завершён.
- Исполнитель / следующий участник: Лира / ChatGPT-6.
- Независимый reviewer после coordinator PASS: Лёва, если не участвует в реализации.
- Implementation PR: ещё не создан.
- Stable implementation head: отсутствует.

## Принятый scope

- Новый permission `forum.topic.title.editOwn` + forward catalog migration/default grants.
- Server-side session/permission/ownership, active-account admission, immutable revision и CAS обязательны.
- Новый изменённый title получает `sourceLocale: "und"`; старые translations остаются revision-bound.
- Existing user-measure restriction `posts.edit` блокирует и title edit; нового restriction key нет.
- Отдельный title-edit cooldown не добавляется.
- Отдельные drafts/receipts/autosave/recovery subsystem не добавляются.

## Следующий шаг

Лира создаёт отдельный implementation PR от актуального `main` и реализует только принятый bounded scope. Готовность: применимые тесты/CI и browser acceptance для author success, guest/non-author denial, stale conflict и current title после reload/list/search. После stable implementation head Лира фиксирует результат в служебном PR и STOP; далее whole-PR review Миры.

Служебный PR #342 не merge в main.

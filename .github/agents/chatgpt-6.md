# Лира — ChatGPT-6

## Активное назначение — реализация edit own topic title

Технический план принят. Реализовать bounded-задачу «редактирование заголовка собственной темы» в отдельном implementation PR от актуального `main`.

Требуемый результат:

1. Обычный авторизованный автор темы может изменить только заголовок своей темы через пользовательский UI.
2. Добавлена отдельная capability `forum.topic.title.editOwn` с необходимой forward catalog migration/default grants; edit-any не добавляется.
3. Authoritative server-side ownership/permission/account checks, immutable title revision и CAS защищают mutation.
4. Изменённый title получает `sourceLocale: "und"`; старые revision-bound translations не становятся current для новой revision.
5. Existing restriction `posts.edit` блокирует title edit как Own content; нового restriction key нет.
6. Отдельный title-edit cooldown, drafts/receipts/autosave и новая recovery subsystem не добавляются.
7. Не расширять scope в admin edit, source-locale correction, другие user actions, UI/UX pass, Stage 6 или external integration.

Критерии готовности: применимые local/CI проверки и browser acceptance для author success, guest/non-author denial, stale revision conflict и отображения нового current title после reload/list/search. После получения stable implementation head зафиксировать implementation PR/head и результаты в служебном PR, затем STOP для coordinator whole-PR review Миры.

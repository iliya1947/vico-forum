# Редактирование заголовка собственной темы — служебный план

## Цель

Добавить обычному авторизованному пользователю возможность редактировать заголовок только собственной темы.

## Утверждённая продуктовая граница

1. Автор темы может изменить заголовок своей темы.
2. Гость и другой пользователь не получают это право только из-за доступности публичной страницы темы.
3. Это не административное редактирование темы и не расширение Admin / Super-admin.
4. Это не исправление source locale. Существующие операции `forum.sourceLocale.correctOwn` / `correctAny` остаются отдельной capability и не дают общего права редактировать заголовок.
5. Заголовок остаётся отдельной immutable revision/translatable unit. Изменение не должно переписывать текущую revision in place или делать перевод старой revision current для новой.
6. Тело первого сообщения, ответы, solved/best-answer state, pin/close/duplicate и иные функции темы не меняются этой задачей.
7. Stage 6, production deployment, внешние provider/Queue/OAuth/Hyperdrive действия и UI/UX product pass вне scope.

## Контракты, которые необходимо сохранить

1. `PROJECT.md`, `PROJECT_STATE.md`, `ROADMAP.md`.
2. `TRANSLATION_ARCHITECTURE.md` и `docs/translation/CONTENT_TRANSLATION.md`, особенно CNT-02, CNT-03 и CNT-05.
3. `docs/auth/AUTHORIZATION.md`: authoritative identity/ownership проверяются server-side; client-provided author/role/permission не являются доказательством.
4. Существующие validation, same-origin/CSRF, revision/CAS и failure semantics применяются там, где они относятся к выбранному write path.

## Критерии готовности функции

1. Авторизованный автор темы может изменить её заголовок через обычный пользовательский интерфейс.
2. Гость и неавтор не могут выполнить mutation.
3. Успешное изменение создаёт новый authoritative title revision/source version и становится current title.
4. Старые title revisions и привязанные к ним translations остаются историческими; они не выдаются как current для новой revision.
5. Конкурентное/устаревшее редактирование не должно молча перезаписывать более новую current revision.
6. Не изменяются несвязанные состояния темы и права других действий.
7. Реализация проходит применимые local/CI проверки текущего проекта.

## Рабочий маршрут

1. Мира — фиксирует scope и канал задачи.
2. Лёва — исследует актуальный `main` и готовит полный технический план bounded-реализации: существующий title revision/write path, authorization boundary, route/UI, concurrency/CAS, translation invalidation/currentness, тесты и критерии acceptance.
3. После принятия технического плана Лира реализует bounded scope в отдельном implementation PR.
4. Мира проводит coordinator whole-PR review stable exact head.
5. После coordinator PASS Лёва выполняет независимую техническую проверку того же exact head, если не участвовал в реализации.
6. Документация фактического состояния — отдельным PR в конце задачи, если реализация меняет permanent/current project state.

Реализация до завершения технического планирования не начинается.

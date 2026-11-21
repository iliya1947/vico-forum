# COMMUNICATION.md — общий актуальный контекст и проверяемые ориентиры для аудита.

## Причина задачи

Settings уже реализованы на canonical `/:locale/settings*` маршрутах, но был обнаружен старый `under-development?feature=admin-settings` контракт и тест, требующий placeholder. Это вызвало подозрение, что после последовательной реализации продукта остались другие аналогичные хвосты.

## Важное предупреждение о предыдущем подходе

Предыдущая Мира начала аудит по ключевым словам (`legacy`, `placeholder`, `under-development`, `future`). Разработчик этот метод отверг как недостаточно системный.

Мира-2 не должна продолжать этот grep-first подход. Сначала current capability map, затем все проекции каждой capability, затем противоречия.

## Предыдущие кандидаты — только ориентиры, НЕ findings

Ниже перечислено то, что предыдущая Мира успела заметить. Каждый пункт требуется независимо перепроверить на актуальном `main`:

- `admin-settings` в unfinished registry и legacy Settings test;
- preview `under-development-search`;
- preview labels/states `Complaints placeholder` и `Security placeholder`;
- старые `underDevelopmentFeature*` localization entries для функций, которые могли быть уже реализованы;
- `onlinePresencePending`, `viewDevelopmentStatus`;
- обычный Admin `pending` scaffold;
- устаревшие catalog descriptions о future registration/complaints/security;
- возможные stale-status фразы в `docs/UI_UX_PASS.md`.

Также ранее встречались `admin-forum`, `admin-users` и `/admin/users/:userId` compatibility paths. Не считать их мусором автоматически: самостоятельно установить их текущий контракт.

## Scope boundary

Не менять `#342` и не использовать его как канал этой задачи.

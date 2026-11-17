# Workflow — edit own topic title

## Текущее состояние

- Задача: редактирование заголовка собственной темы.
- Этап: scope/fit review Миры завершён; ожидается одно продуктовое решение владельца по E2.
- Координатор / следующий участник после решения: Мира / ChatGPT-5.6 Sol.
- Технический планировщик: Лёва / Codex-6.1 Sol; план завершён.
- Исполнитель: Лира не активирована.
- Независимый reviewer: Лёва после coordinator PASS, если не участвует в реализации.
- Проверенный main: `906d15d896cc3a4f3b7dc9a03f46acd883925d1d`.
- Implementation PR: отсутствует.
- Stable implementation head: отсутствует.

## Принято

- Новый permission `forum.topic.title.editOwn` и forward catalog migration входят в текущий scope.
- Отдельный title-edit cooldown не добавляется.
- Обязательны server-side ownership, immutable revision, CAS и revision-bound translation semantics.
- Не создаётся отдельная drafts/receipts/recovery subsystem для title editor.

## Блокирующее решение владельца E2

Должно ли существующее административное ограничение `posts.edit` блокировать также редактирование заголовка собственной темы?

Рекомендация Миры: да — считать это тем же Own content restriction, не вводя новый restriction key.

После решения Мира фиксирует финальный accepted plan и назначение Лире. Реализация — в отдельном implementation PR; служебный PR не merge в main.

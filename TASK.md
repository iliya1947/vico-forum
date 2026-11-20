# Task

Перевести PR-тесты Vico Forum с автоматического запуска на запуск агентом по требованию.

Границы:
- основной `CI` и 17 browser/connected acceptance workflows;
- production/deploy workflows не менять;
- `UI preview Pages` и `Codex service-channel bridge` не менять;
- запуск должен быть доступен агентам без участия разработчика.

Готово, когда:
- push/synchronize PR больше не запускает эти тесты автоматически;
- агент может отдельно запустить основной CI или релевантные acceptance checks;
- существующие acceptance path-фильтры сохранены;
- есть резервный ручной `workflow_dispatch`;
- production/deploy/Pages/bridge поведение не изменено.

# AGENT_ERRORS.md — подтверждённые ошибки агентов, полезные для этой задачи.

| Дата / контекст | Агент | Ошибка → правильно |
|---|---|---|
| 2026-11-21 / #369 подэтап 3 | Мира-3 | При выводе о generic `RouteConfigEntry -> RouteObject` adapter не была проверена сохранность production route IDs; текущие `meta()` уже зависят от `routes/locale-boundary`. Правильно: adapter обязан воспроизводить Framework derivation `entry.id ?? file-without-extension`; существенные route consumers проверять до признания topology parity. |

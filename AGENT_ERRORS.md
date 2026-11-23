# AGENT_ERRORS.md — подтверждённые ошибки агентов, полезные для этой задачи.

| Дата / контекст | Агент | Ошибка → правильно |
|---|---|---|
| 2026-11-21 / #369 подэтап 3 | Мира-3 | При выводе о generic `RouteConfigEntry -> RouteObject` adapter не была проверена сохранность production route IDs; текущие `meta()` уже зависят от `routes/locale-boundary`. Правильно: adapter обязан воспроизводить Framework derivation `entry.id ?? file-without-extension`; существенные route consumers проверять до признания topology parity. |

| 2026-11-22 / #369, план Лёвы из чата | Лёва | Вместо внутренней тестовой инфраструктуры предложен отдельный Node/socket runtime с внешним размещением; исследование начато до отдельного ответа на «Как понял?». Правильно: сначала подтвердить постановку, зафиксировать платформенные ограничения и проверять каждое архитектурное решение на соответствие им; GitHub-only/browser-only задача не получает внешний fallback. |
| 2026-11-22 / #369 P0-A | Лира | Ветка `chatgpt/ui-progress-preview-p0` создана без проверки существующего `on.push` Pages workflow (`chatgpt/ui-*`); run 45002989024 реально завершил Pages deployment SUCCESS. Правильно: до создания implementation branch сверять её имя с действующими deployment triggers. Исправление: #372 закрыт, P0 перенесён в #373 на `feature/*`, в старой ветке deploy job ограничен `main`. |

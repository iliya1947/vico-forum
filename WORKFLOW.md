# Workflow

Активный этап: implementation — ручной запуск PR-тестов.
Исполнитель: Мира.
Implementation PR: #362, exact head `09aa27065904f99e70a82a0350088fba9b74d6bb`.
Проверка: self-check текущего diff выполнен частично; открытие #362 не породило test workflow runs. До merge end-to-end label trigger не проверяется, потому что bootstrap labels создаются после попадания control workflow в main.
Блокер: нет.
Следующий переход: завершить self-check всех изменённых trigger contracts и затем STOP перед отдельной финальной проверкой/документацией.

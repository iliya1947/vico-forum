# Текущее состояние

Активная работа: архитектура инструкций и устранение дублирования между слоями.

Исполнитель: Мира — ChatGPT-5.6 Sol.

Рабочий PR: #368 — draft, аналитическое рабочее пространство, не предназначено для merge.

Рабочая ветка: `service/mira-instruction-layering-workbench`.

База: `main` @ `9cff976a9621d9fe5dfef28ea5367e390ff435b1`.

Состояние: подготовлен полный draft `research/AGENTS.proposed.md` по change-map и сравнение `research/agents-proposal-comparison.md`. Действующий `AGENTS.md` не изменялся.

Размер current → proposed:
- символы: 17720 → 17228 (-2.8%);
- whitespace words: 2209 → 2143 (-3%);
- строки: 160 → 161 (0.6%).

Shared reasoning, technical diagnosis, workflow topology, review gates, exact-head, source-of-truth, CI и audit semantics сохранены. Добавлен единый PR permission gate и удалены подтверждённые внутренние повторы.

Нерешённый вопрос: гранулярность PR permission — требуется ли отдельная прямая команда на каждый новый PR либо разрешение на задачу/цепочку может покрывать предусмотренные ею PR. Без решения владельца final wording этого gate не готов.

Проверяющий: не назначен.

Блокер: решение разработчика по гранулярности PR permission потребуется перед применением, но не блокирует дальнейшее проектирование U/P.

Следующий переход: вернуться к User/Project layers и построить конкретный минимальный proposal с учётом очищенного AGENTS draft; сам AGENTS не применять.

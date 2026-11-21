# Текущее состояние

Активная работа: архитектура инструкций и устранение дублирования между слоями.

Исполнитель: Мира — ChatGPT-5.6 Sol.

Рабочий PR: #368 — draft, аналитическое рабочее пространство, не предназначено для merge.

Рабочая ветка: `service/mira-instruction-layering-workbench`.

База: `main` @ `9cff976a9621d9fe5dfef28ea5367e390ff435b1`.

Состояние: завершена точная change-map актуального `AGENTS.md` в `research/agents-change-map.md`. Действующий файл не изменялся.

Подтверждено:
- reasoning core и project-specific guards остаются;
- три прямых/частичных внутренних дубля можно удалить;
- operational details из Roles переносим в Workflow/Review;
- Workflow 7 должен ссылаться на Review 1/2 вместо повторения review protocol;
- единый PR permission gate добавляется в Workflow и заменяет частный запрет в роли Миры.

Проверяющий: не назначен.

Блокер: нет.

Следующий переход: подготовить draft-редакцию только `AGENTS.md` по change-map и сравнить её с current по смыслу/объёму, не применяя изменения.

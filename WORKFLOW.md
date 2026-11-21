# Текущее состояние

Активная работа: архитектура инструкций и устранение дублирования между слоями.

Исполнитель: Мира — ChatGPT-5.6 Sol.

Рабочий PR: #368 — draft, аналитическое рабочее пространство, не предназначено для merge.

Рабочая ветка: `service/mira-instruction-layering-workbench`.

База: `main` @ `9cff976a9621d9fe5dfef28ea5367e390ff435b1`.

Состояние: подготовлены конкретные proposal верхних слоёв: `research/USER_INSTRUCTIONS.proposed.md`, `research/PROJECT_INSTRUCTIONS.proposed.md`; общий количественный разбор — `research/upper-layer-comparison.md`. Действующие инструкции не изменялись.

User current → proposed: 262 → 268 whitespace words (2.3%).
Project current → proposed: 443 → 394 (-11.1%).
AGENTS current → proposed: 2209 → 2143 (-3%).
Все три слоя: 2914 → 2805 words (-3.7%), 22973 → 22305 chars (-2.9%).

User layer немного вырос, но общий instruction load снизился; новые universal guards не размазаны по Project/AGENTS.

Проверяющий: не назначен.

Блокер: перед применением остаётся policy-вопрос гранулярности PR permission; он не блокирует semantic validation User proposal.

Следующий переход: построить semantic coverage table User proposal против старых U01–U15 и подтверждённых новых guards; проверить loss/overlap без новых стресс-тестов.

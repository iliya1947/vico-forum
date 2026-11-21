# Текущее состояние

Активная работа: архитектура инструкций и устранение дублирования между слоями.

Исполнитель: Мира — ChatGPT-5.6 Sol.

Рабочий PR: #368 — draft, аналитическое рабочее пространство, не предназначено для merge.

Рабочая ветка: `service/mira-instruction-layering-workbench`.

База: `main` @ `9cff976a9621d9fe5dfef28ea5367e390ff435b1`.

## Канонические рабочие файлы

1. `USER_INSTRUCTIONS.current.md` — неизменяемый эталон.
2. `USER_INSTRUCTIONS.draft.md` — 42 пункта / 52 semantic guards; 15/15 current User rules FULL.
3. `PROJECT_INSTRUCTIONS.current.md` — неизменяемый эталон.
4. `PROJECT_INSTRUCTIONS.draft.md` — 16 numbered rules; 0 lost project-specific guards.
5. `AGENTS.current.md` — exact snapshot актуального main AGENTS.
6. `AGENTS.draft.md` — structural-dedup draft: 58 numbered rules.

## AGENTS layer

1. Structural dedupe применён: 64 → 58 numbered rules, 0 lost guards.
2. Semantic diff: `research/agents-current-vs-draft-semantic-diff.md`.
3. Карта локального wording reduction завершена: `research/agents-58-wording-reduction-map.md`.
4. Подтверждено 19 safe wording reductions.
5. Draft на этом шаге не изменён.
6. Оценочный объём после применения карты: 2179 → 2006 whitespace words (-173).
7. Core roles, delivery/review gates и низкоценные микроизменения намеренно не трогаются.

Проверяющий: не назначен.

Блокер: нет.

Следующий переход: применить только 19 подтверждённых wording reductions к `AGENTS.draft.md`, затем проверить изменённые пункты и semantic diff.

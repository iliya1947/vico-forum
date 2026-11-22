# Текущее состояние

Активная работа: архитектура инструкций и устранение дублирования между слоями.

Исполнитель: Мира — ChatGPT-5.6 Sol.

Рабочий PR: #368 — draft, аналитическое рабочее пространство, не предназначено для merge.

Рабочая ветка: `service/mira-instruction-layering-workbench`.

База: `main` @ `9cff976a9621d9fe5dfef28ea5367e390ff435b1`.

## Канонические рабочие файлы

1. `USER_INSTRUCTIONS.current.md` — неизменяемый эталон.
2. `USER_INSTRUCTIONS.draft.md` — финальный User draft: 42 numbered rules; current coverage 15/15 FULL.
3. `PROJECT_INSTRUCTIONS.current.md` — неизменяемый эталон.
4. `PROJECT_INSTRUCTIONS.draft.md` — финальный Project draft: 16 numbered rules; 0 lost project-specific guards.
5. `AGENTS.current.md` — exact snapshot актуального main AGENTS.
6. `AGENTS.draft.md` — финальный AGENTS draft: 58 numbered rules.

## Финальный статус

Финальная consistency-проверка: `research/three-layer-final-consistency.md`.

1. User draft — PASS.
2. Project draft — PASS.
3. AGENTS draft — PASS.
4. Межслойных authority/routing противоречий — 0.
5. Remaining DELETE-SAFE authority/routing duplicates — 0.
6. Потерянных current guards в проверенных преобразованиях — 0.
7. Три wording-regressions AGENTS исправлены commit `475a1ecabf31d07a4d93dc1fb3b96575d799a1fd`.
8. Финальные объёмы:
   - User draft: 1066 whitespace words / 42 rules;
   - Project draft: 347 whitespace words / 16 rules;
   - AGENTS draft: 2017 whitespace words / 58 rules.

Проверяющий: не назначен.

Блокер: нет.

Следующий переход: отдельным этапом подготовить итоговую фиксацию трёх draft-файлов и маршрут их переноса в реальные instruction sources; без прямой команды разработчика реальные current sources не менять.

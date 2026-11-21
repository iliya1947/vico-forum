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
4. `PROJECT_INSTRUCTIONS.draft.md` — 17 numbered rules после первого dedup-pass против User layer.
5. `AGENTS.current.md` — неизменяемый эталон.
6. `AGENTS.draft.md` — пока идентичен current.

## Project layer

1. Первый classification-pass против User draft завершён.
2. Применены только подтверждённые изменения:
   - удалён old Project 10;
   - удалён ненумерованный goal-дубль;
   - partial duplicate «Перед ответом…» сокращён до project-context check;
   - old 11–18 перенумерованы в 10–17 без изменения текста.
3. Exact semantic diff: `research/project-current-vs-draft-semantic-diff.md`.
4. Validation:
   - numbered rules 18 → 17;
   - unexpected text changes: 0;
   - whole-file transform matches expected.
5. Все project-specific смыслы первого pass сохранены.

Проверяющий: не назначен.

Блокер: нет.

Следующий переход: проверить внутреннее дублирование и безопасные structural merges внутри текущего Project draft, пока без изменения AGENTS layer.

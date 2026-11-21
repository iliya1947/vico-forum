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

1. Межслойный анализ завершён: AGENTS rules нельзя удалять только из-за User/Project coverage.
2. Внутренний dedup classification: `research/agents-internal-dedup-classification.md`.
3. Применены 5 SAFE-MERGE groups:
   - Масштаб исправления 1 + 2;
   - Рабочий процесс 4 + 5;
   - Общие правила 6 + 7 + 8;
   - Запуск PR-тестов 2 + 3;
   - Полный аудит документации 2 + 3.
4. Применены 2 SAFE-REFERENCE-DEDUPE:
   - stacked checkpoint/final review details в Workflow заменены ссылкой на канонический Review section;
   - documentation-PR lifecycle в state/history/contracts block заменён ссылкой на Workflow.
5. Current → draft semantic diff: `research/agents-current-vs-draft-semantic-diff.md`.
6. Numbered rules: 64 → 58.
7. Volume: 2209 → 2179 whitespace words.
8. Потерянных semantic guards: 0.

Проверяющий: не назначен.

Блокер: нет.

Следующий переход: составить карту safe wording reductions для 58-rule `AGENTS.draft.md` без изменения draft.

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
6. `AGENTS.draft.md` — optimized draft: 58 numbered rules.

## AGENTS layer

1. Structural dedupe: 64 → 58 numbered rules, 0 lost guards.
2. Wording reduction map: `research/agents-58-wording-reduction-map.md`.
3. Применено ровно 19 safe wording reductions.
4. Wording semantic diff: `research/agents-58-wording-semantic-diff.md`.
5. Проверка exact diff:
   - changed numbered rules: 19;
   - unchanged numbered rules: 39;
   - все 19 замен точно совпадают с сохранённой картой;
   - других numbered-rule changes нет.
6. Volume: 2179 → 2006 whitespace words.
7. Numbered rules: 58 → 58.

Проверяющий: не назначен.

Блокер: нет.

Следующий переход: финальная трёхслойная consistency-проверка `USER_INSTRUCTIONS.draft.md` + `PROJECT_INSTRUCTIONS.draft.md` + `AGENTS.draft.md` на противоречия, пропуски и оставшиеся authority/routing дубли. Первый проход — только анализ, без изменений drafts.

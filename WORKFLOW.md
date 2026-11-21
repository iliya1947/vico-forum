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
6. `AGENTS.draft.md` — пока идентичен current.

## AGENTS layer

1. Межслойный анализ завершён: удалять AGENTS rules только из-за User/Project coverage нельзя.
2. Внутренний dedup pass завершён: `research/agents-internal-dedup-classification.md`.
3. Текущий AGENTS: 64 numbered rules.
4. DELETE-SAFE whole rules: 0.
5. Подтверждены 5 SAFE-MERGE groups:
   - Масштаб исправления 1 + 2;
   - Рабочий процесс 4 + 5;
   - Общие правила 6 + 7 + 8;
   - Запуск PR-тестов 2 + 3;
   - Полный аудит документации 2 + 3.
6. Только эти merges дадут 64 → 58 numbered rules без удаления semantic guards.
7. Подтверждены 2 SAFE-REFERENCE-DEDUPE:
   - Workflow 7 должен ссылаться на Review 2 / Review 1 вместо повторного описания checkpoint/final-review sequence;
   - documentation-PR lifecycle в General state/history/contracts block можно сослать на Workflow docs rule вместо повторения.
8. `AGENTS.draft.md` на этом этапе не изменён.

Проверяющий: не назначен.

Блокер: нет.

Следующий переход: применить только 5 подтверждённых structural merges и 2 reference-dedupe к `AGENTS.draft.md`; затем сделать semantic diff current → draft.

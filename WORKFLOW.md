# Текущее состояние

Активная работа: архитектура инструкций и устранение дублирования между слоями.

Исполнитель: Мира — ChatGPT-5.6 Sol.

Рабочий PR: #368 — draft, аналитическое рабочее пространство, не предназначено для merge.

Рабочая ветка: `service/mira-instruction-layering-workbench`.

База: `main` @ `9cff976a9621d9fe5dfef28ea5367e390ff435b1`.

## Канонические рабочие файлы

1. `USER_INSTRUCTIONS.current.md` — неизменяемый эталон.
2. `USER_INSTRUCTIONS.draft.md` — рабочий пользовательский черновик; пока сохраняет исходные 55 правил без редактирования.
3. `PROJECT_INSTRUCTIONS.current.md` — неизменяемый эталон.
4. `PROJECT_INSTRUCTIONS.draft.md` — рабочий Project draft.
5. `AGENTS.current.md` — неизменяемый эталон.
6. `AGENTS.draft.md` — рабочий AGENTS draft.

Старые reconstruction/proposal материалы не являются основанием для решений.

## Полная классификация 55 правил

Завершена. Подробности: `research/55-rule-analysis.md`.

Подтверждённые безопасные удаления из User draft:
- 17 — частный случай 16 + 18; Vico CI specialization остаётся в AGENTS Review 4.
- 29 — частный случай permission contract 8 + 28 + 30–32.
- 44 — частный случай 42 + 43.

Все остальные 52 правила сохраняют самостоятельный смысл либо намеренное audience/specialization покрытие.

Закрыты cross-check:
- 2 ↔ 52 — оба KEEP;
- 3 ↔ 7 — оба KEEP;
- 27 ↔ 41 — оба KEEP;
- 34 ↔ 51 — оба KEEP;
- 37 ↔ 50 — оба KEEP;
- 38 ↔ 41 — оба KEEP;
- 48 ↔ 49 — оба KEEP.

Canonical drafts на этом этапе ещё не редактировались.

Проверяющий: не назначен.

Блокер: нет.

Следующий переход: применить к `USER_INSTRUCTIONS.draft.md` только три подтверждённых удаления 17/29/44 с перенумерацией, без иных переписываний; затем сравнить exact draft с исходными 55 по semantic coverage.

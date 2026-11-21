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
4. `PROJECT_INSTRUCTIONS.draft.md` — пока идентичен current.
5. `AGENTS.current.md` — неизменяемый эталон.
6. `AGENTS.draft.md` — пока идентичен current.

## Project layer classification

Завершён первый проход против User draft: `research/project-vs-user-classification.md`.

Результат:
- из 18 numbered Project rules: 17 KEEP-PROJECT, 1 DELETE-SAFE;
- DELETE-SAFE: Project 10;
- DELETE-SAFE: ненумерованное «Всегда рассуждай от цели…»;
- PARTIAL-DUPLICATE: ненумерованный абзац «Перед ответом…» — сохранить context-check, удалить уже покрытую User 20 часть про первую трактовку;
- agent-name block KEEP-PROJECT;
- Project draft на этом этапе не изменён.

Проверяющий: не назначен.

Блокер: нет.

Следующий переход: применить к `PROJECT_INSTRUCTIONS.draft.md` только подтверждённые изменения — удалить Project 10 и goal-дубль, сократить partial duplicate до project-context check, перенумеровать 11–18; затем выполнить current-vs-draft semantic diff Project layer.

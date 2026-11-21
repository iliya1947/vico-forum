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
4. `PROJECT_INSTRUCTIONS.draft.md` — очищенный Project draft: 17 numbered rules + unique project-only unnumbered guards.
5. `AGENTS.current.md` — неизменяемый эталон.
6. `AGENTS.draft.md` — пока идентичен current.

## User layer

- Current coverage: 15/15 FULL.
- Draft является semantic superset current User rules.

## Project layer

1. Классификация против User draft: `research/project-vs-user-classification.md`.
2. Подтверждённые изменения уже находятся в `PROJECT_INSTRUCTIONS.draft.md`, commit `46ceb0fe8f42b11da4ccb553bc6111489739617c`.
3. Current→draft semantic diff: `research/project-current-vs-draft-diff.md`.
4. Удалено:
   - current Project 10 как полный дубль User 2 + 7;
   - ненумерованный goal-дубль как полный дубль User 19 + 22 + 26 + 39.
5. Partial duplicate «Перед ответом…» сокращён до уникального project-context check; трактовочная часть покрыта User 20.
6. Потерянных Project-specific guards: 0.
7. Draft numbered rules: 18 → 17.

Проверяющий: не назначен.

Блокер: нет.

Следующий переход: перейти к `AGENTS.current.md` против User + Project drafts и классифицировать межслойные дубли. Первый проход — только анализ, без изменения `AGENTS.draft.md`.

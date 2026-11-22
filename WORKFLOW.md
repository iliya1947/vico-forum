# Текущее состояние

Активная работа: архитектура инструкций и устранение дублирования между слоями.

Исполнитель: Мира — ChatGPT-5.6 Sol.

Рабочий PR: #368 — draft, аналитическое рабочее пространство, не предназначено для merge.

Рабочая ветка: `service/mira-instruction-layering-workbench`.

База: `main` @ `9cff976a9621d9fe5dfef28ea5367e390ff435b1`.

## Канонические рабочие файлы

1. `USER_INSTRUCTIONS.current.md` — неизменяемый эталон.
2. `USER_INSTRUCTIONS.draft.md` — compact User draft: 20 rules / 4999 chars.
3. `PROJECT_INSTRUCTIONS.current.md` — неизменяемый эталон.
4. `PROJECT_INSTRUCTIONS.draft.md` — 16 rules; semantic PASS до User compact rewrite.
5. `AGENTS.current.md` — exact snapshot актуального main AGENTS.
6. `AGENTS.draft.md` — 58 rules; semantic PASS до User compact rewrite.

## User compact status

1. Expanded semantic coverage: 52/52 — `research/user-5000-semantic-coverage.md`.
2. Current User coverage: 15/15 FULL — `research/user-current-vs-compact-coverage.md`.
3. PARTIAL: 0.
4. LOST: 0.
5. Размер: 4999 characters — transfer-size blocker снят.
6. Draft на этом coverage-шаге не менялся.

Проверяющий: не назначен.

Блокер: transfer ещё не финализирован до повторной three-layer consistency-проверки после User compact rewrite.

Следующий переход: повторная consistency-проверка `USER_INSTRUCTIONS.draft.md` + `PROJECT_INSTRUCTIONS.draft.md` + `AGENTS.draft.md`; сначала только анализ, без изменения drafts.

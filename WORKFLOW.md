# Текущее состояние

Активная работа: архитектура инструкций и устранение дублирования между слоями.

Исполнитель: Мира — ChatGPT-5.6 Sol.

Рабочий PR: #368 — draft, аналитическое рабочее пространство, не предназначено для merge.

Рабочая ветка: `service/mira-instruction-layering-workbench`.

База: `main` @ `9cff976a9621d9fe5dfef28ea5367e390ff435b1`.

## Канонические рабочие файлы

1. `USER_INSTRUCTIONS.current.md` — неизменяемый эталон.
2. `USER_INSTRUCTIONS.draft.md` — compact User draft: 20 rules / 4999 chars; 52/52 expanded semantic guards mapped.
3. `PROJECT_INSTRUCTIONS.current.md` — неизменяемый эталон.
4. `PROJECT_INSTRUCTIONS.draft.md` — 16 rules; semantic PASS до User compact rewrite.
5. `AGENTS.current.md` — exact snapshot актуального main AGENTS.
6. `AGENTS.draft.md` — 58 rules; semantic PASS до User compact rewrite.

## User compact pass

1. Было: 42 rules / 8364 chars.
2. Стало: 20 rules / 4999 chars.
3. Compact blob: `f042613fa65d2484895c5bf3f9e427d5fb3b27cc`.
4. 52/52 semantic guards mapped: `research/user-5000-semantic-coverage.md`.
5. Намеренно отсутствуют только ранее подтверждённые DELETE-SAFE old 17, 29, 44.
6. Character-limit blocker снят по размеру.
7. Current 15-rule coverage после compact rewrite ещё требует отдельного exact recheck.
8. Three-layer consistency после User rewrite ещё не перепроверена.

Проверяющий: не назначен.

Блокер: transfer ещё не готов до exact current-coverage + three-layer consistency recheck.

Следующий переход: exact recheck `USER_INSTRUCTIONS.current.md` → compact `USER_INSTRUCTIONS.draft.md`; drafts не менять на этом шаге.

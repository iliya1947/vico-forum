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
4. `PROJECT_INSTRUCTIONS.draft.md` — 16 rules.
5. `AGENTS.current.md` — exact snapshot актуального main AGENTS.
6. `AGENTS.draft.md` — 58 rules.

## Финальный semantic status

1. User current coverage: 15/15 FULL — `research/user-current-vs-compact-coverage.md`.
2. Expanded User guards: 52/52 — `research/user-5000-semantic-coverage.md`.
3. Three-layer consistency после compact rewrite: PASS — `research/three-layer-final-consistency.md`.
4. Project draft: PASS.
5. AGENTS draft: PASS.
6. Подтверждённых межслойных противоречий: 0.
7. Новых DELETE-SAFE authority/routing дублей: 0.
8. Потерянных guards из-за compact User rewrite: 0.
9. Draft-файлы на consistency-шаге не менялись.

Проверяющий: не назначен.

Блокер: semantic/consistency blockers отсутствуют.

Следующий переход: отдельный transfer-readiness recheck для финальных exact drafts и актуального OpenAI UI/лимита; реальные instruction sources без прямой команды разработчика не менять.

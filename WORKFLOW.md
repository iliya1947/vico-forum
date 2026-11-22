# Текущее состояние

Активная работа: архитектура инструкций и устранение дублирования между слоями.

Исполнитель: Мира — ChatGPT-5.6 Sol.

Рабочий PR: #368 — draft, аналитическое рабочее пространство, не предназначено для merge.

Рабочая ветка: `service/mira-instruction-layering-workbench`.

База: `main` @ `9cff976a9621d9fe5dfef28ea5367e390ff435b1`.

## Канонические рабочие файлы

1. `USER_INSTRUCTIONS.current.md` — неизменяемый эталон.
2. `USER_INSTRUCTIONS.draft.md` — 42 rules / 52 semantic guards; consistency PASS, но transfer BLOCKED по размеру.
3. `PROJECT_INSTRUCTIONS.current.md` — неизменяемый эталон.
4. `PROJECT_INSTRUCTIONS.draft.md` — 16 rules; semantic PASS.
5. `AGENTS.current.md` — exact snapshot актуального main AGENTS.
6. `AGENTS.draft.md` — 58 rules; semantic PASS.

## Transfer readiness

Полный статус: `research/instruction-transfer-readiness.md`.

1. User draft: 8364 characters; официальный global Custom Instructions limit для Plus/Pro/Enterprise/Business/Education — 5000. **BLOCKED**.
2. Project draft: 2713 characters; semantic PASS. Точный Project Instructions character limit в найденной официальной документации не указан — информация не проверена.
3. AGENTS draft: 16186 characters; semantic PASS; должен переноситься отдельным repository PR, не merge #368.
4. Безопасный order: User → AGENTS → Project.
5. Реальные instruction sources не изменены.

Проверяющий: не назначен.

Блокер: User draft превышает допустимый global Custom Instructions limit на 3364 characters.

Следующий переход: отдельным этапом сократить User draft до ≤5000 characters с сохранением 52 semantic guards, затем повторить User current coverage и three-layer consistency.

# Текущее состояние

Активная работа: архитектура инструкций и устранение дублирования между слоями.

Исполнитель: Мира — ChatGPT-5.6 Sol.

Рабочий PR: #368 — draft, аналитическое рабочее пространство, не предназначено для merge.

Рабочая ветка: `service/mira-instruction-layering-workbench`.

База: `main` @ `9cff976a9621d9fe5dfef28ea5367e390ff435b1`.

## Финальные drafts

1. User: `USER_INSTRUCTIONS.draft.md`
   - blob `f042613fa65d2484895c5bf3f9e427d5fb3b27cc`
   - 20 rules / 4999 chars
   - 15/15 current FULL
   - 52/52 retained semantic guards

2. Project: `PROJECT_INSTRUCTIONS.draft.md`
   - blob `fd8153931a306eb7e7c65a0e14db28dc20b437fe`
   - 16 rules / 2713 chars
   - PASS

3. AGENTS: `AGENTS.draft.md`
   - blob `170ef5ed10715e416a376c75c3dae188ae0a3d24`
   - 58 rules / 16186 chars
   - PASS

## Transfer readiness

Полный статус: `research/instruction-transfer-readiness.md`.

1. User — READY: 4999 ≤ official 5000-char limit.
2. Project — READY: draft 2713 chars < current active baseline 3341 chars; three-layer conflict count 0.
3. AGENTS — READY FOR SEPARATE REPO PR.
4. Безопасный порядок: **User → AGENTS → Project**.
5. Реальные instruction sources не изменены.

Проверяющий: не назначен.

Блокер: нет.

Следующий переход: подготовить фактический transfer package и точную последовательность действий; реальные sources менять только по прямой команде разработчика.

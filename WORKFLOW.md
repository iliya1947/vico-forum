# Текущее состояние

Активная работа: архитектура инструкций и устранение дублирования между слоями.

Исполнитель: Мира — ChatGPT-5.6 Sol.

Рабочий PR: #368 — draft, аналитическое рабочее пространство, не предназначено для merge.

Рабочая ветка: `service/mira-instruction-layering-workbench`.

База: `main` @ `9cff976a9621d9fe5dfef28ea5367e390ff435b1`.

## Drafts

1. User: `USER_INSTRUCTIONS.draft.md`
   - blob `ef1c0efd10d2e95a5481476d91b336884d7d9c61`
   - 35 rules / 4999 chars
   - 15/15 current FULL
   - 52/52 retained semantic guards
   - executability stress: 17/17 EXEC PASS
   - transfer readiness: PASS

2. Project: `PROJECT_INSTRUCTIONS.draft.md`
   - blob `fd8153931a306eb7e7c65a0e14db28dc20b437fe`
   - 16 rules / 2713 chars
   - current active baseline 3341 chars
   - transfer readiness: PASS

3. AGENTS: `AGENTS.draft.md`
   - blob `170ef5ed10715e416a376c75c3dae188ae0a3d24`
   - 58 rules / 16186 chars
   - current `main:AGENTS.md` still exactly matches #368 current snapshot
   - transfer readiness: PASS via separate repository PR

## Current gates

1. User preservation — PASS.
2. User executability — PASS.
3. Three-layer consistency — PASS.
4. Transfer-readiness — PASS.

Current transfer-readiness: `research/instruction-transfer-readiness.md`.

Безопасный порядок переноса: **User → AGENTS → Project**.

Реальные instruction sources не изменены.

Проверяющий: не назначен.

Блокер: нет.

Следующий переход: подготовить фактический transfer package — точные финальные тексты, точную последовательность замены и отдельную постановку для переноса `AGENTS.md` в `main`; реальные sources менять только по прямой команде разработчика.

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
   - executability stress: **17/17 EXEC PASS**
   - goal-level User executability: **PASS**

2. Project: `PROJECT_INSTRUCTIONS.draft.md`
   - blob `fd8153931a306eb7e7c65a0e14db28dc20b437fe`
   - 16 rules / 2713 chars
   - PASS

3. AGENTS: `AGENTS.draft.md`
   - blob `170ef5ed10715e416a376c75c3dae188ae0a3d24`
   - 58 rules / 16186 chars
   - PASS

## Goal-level readiness

Previous failing stress-test: `research/user-compact-executability-stress-test.md` — относится к superseded User blob `f042613...`.

Current preservation check: `research/user-35-redesign-preservation-check.md`.

Current stress recheck: `research/user-35-executability-stress-recheck.md`.

Установлено для current User blob:
1. character limit PASS: 4999/5000;
2. retained semantic guards PASS: 52/52;
3. current User coverage PASS: 15/15 FULL;
4. повторный тот же 17-сценарный stress matrix: semantic PASS 17/17, EXEC PASS 17/17, EXEC RISK 0;
5. structural executability blocker закрыт.

Это structural executability PASS, не эмпирический A/B-test частоты ошибок модели.

Project/AGENTS PASS не отменён.

Реальные instruction sources не изменены.

Проверяющий: не назначен.

Блокер: **новый User exact blob ещё не прошёл повторную three-layer consistency-проверку с Project/AGENTS drafts.**

Следующий переход: отдельным bounded этапом повторить three-layer consistency для exact User blob `ef1c0efd...`; только после PASS возвращаться к transfer-readiness/package.

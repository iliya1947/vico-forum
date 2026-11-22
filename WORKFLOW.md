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
   - overloaded former rules 5, 7, 9, 10, 13, 14 atomized
   - **stress revalidation pending**

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

Current redesign preservation check: `research/user-35-redesign-preservation-check.md`.

Установлено для current User blob:
1. character limit PASS: 4999/5000;
2. retained semantic guards PASS: 52/52;
3. current User coverage PASS: 15/15 FULL;
4. подтверждённые overloaded groups разбиты на более локальные rules;
5. goal-level executability пока не присвоен: новый exact blob ещё не прошёл тот же stress matrix.

Project/AGENTS PASS не отменён.

Реальные instruction sources не изменены.

Проверяющий: не назначен.

Блокер: **новый User exact blob должен пройти повторный bounded executability stress-test.**

Следующий переход: повторить тот же 17-сценарный stress matrix на `ef1c0efd...`; только после PASS переходить к three-layer consistency.

# Текущее состояние

Активная работа: архитектура инструкций и устранение дублирования между слоями.

Исполнитель: Мира — ChatGPT-5.6 Sol.

Рабочий PR: #368 — draft, аналитическое рабочее пространство, не предназначено для merge.

Рабочая ветка: `service/mira-instruction-layering-workbench`.

База: `main` @ `9cff976a9621d9fe5dfef28ea5367e390ff435b1`.

## Drafts

1. User: `USER_INSTRUCTIONS.draft.md`
   - blob `f042613fa65d2484895c5bf3f9e427d5fb3b27cc`
   - 20 rules / 4999 chars
   - 15/15 current FULL
   - 52/52 retained semantic guards
   - semantic/limit checks PASS
   - **goal-level executability FAIL**

2. Project: `PROJECT_INSTRUCTIONS.draft.md`
   - blob `fd8153931a306eb7e7c65a0e14db28dc20b437fe`
   - 16 rules / 2713 chars
   - PASS

3. AGENTS: `AGENTS.draft.md`
   - blob `170ef5ed10715e416a376c75c3dae188ae0a3d24`
   - 58 rules / 16186 chars
   - PASS

## Goal-level readiness

Recheck: `research/original-goal-executability-recheck.md`.

Bounded stress-test: `research/user-compact-executability-stress-test.md`.

Stress result:
1. 17/17 tested failure modes имеют semantic guard;
2. EXEC PASS: 8/17;
3. EXEC RISK: 9/17;
4. missing semantic guard: 0;
5. критическая перегрузка сосредоточена в User rules 5, 7, 9, 10, 13, 14;
6. compact draft повторяет ранее запрещённую архитектуру «несколько независимых мыслительных операций в одном суперпункте».

Это не эмпирическое доказательство частоты ошибок модели, а подтверждённый structural executability blocker относительно принятого критерия задачи.

Project/AGENTS PASS этим результатом не отменён.

Реальные instruction sources не изменены.

Проверяющий: не назначен.

Блокер: **User compact layer требует перепроектирования до ≤5000 chars без потери 52/52 guards и 15/15 current coverage.**

Следующий переход: отдельным bounded этапом перепроектировать только User rules 5, 7, 9, 10, 13, 14; затем повторить stress matrix и three-layer consistency.

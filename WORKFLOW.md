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
   - **executability readiness reopened**

2. Project: `PROJECT_INSTRUCTIONS.draft.md`
   - blob `fd8153931a306eb7e7c65a0e14db28dc20b437fe`
   - 16 rules / 2713 chars
   - PASS

3. AGENTS: `AGENTS.draft.md`
   - blob `170ef5ed10715e416a376c75c3dae188ae0a3d24`
   - 58 rules / 16186 chars
   - PASS

## Goal-level readiness

Новый recheck: `research/original-goal-executability-recheck.md`.

Установлено:
1. предыдущий transfer-readiness PASS корректен для character limits, semantic coverage и three-layer consistency;
2. он не проверял достижение исходной behavioural/executability цели;
3. compact rewrite User 8364 → 4999 снова создал составные «суперпункты» с несколькими независимыми мыслительными операциями;
4. это противоречит ранее установленному executability-критерию из `research/instruction-executability-validation.md`.

Project/AGENTS PASS на этой проверке не отменён.

Реальные instruction sources не изменены.

Проверяющий: не назначен.

Блокер: **User compact draft требует bounded executability/stress validation до transfer package.**

Следующий переход: проверить финальный 20-rule User draft на реальных failure modes, из-за которых началась переделка; только после goal-level PASS возвращаться к transfer package.

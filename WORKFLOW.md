# Текущее состояние

Активная работа: архитектура инструкций и устранение дублирования между слоями.

Исполнитель: Мира — ChatGPT-5.6 Sol.

Рабочий PR: #368 — draft, аналитическое рабочее пространство, не предназначено для merge.

Рабочая ветка: `service/mira-instruction-layering-workbench`.

База: `main` @ `9cff976a9621d9fe5dfef28ea5367e390ff435b1`.

## Канонические рабочие файлы

1. `USER_INSTRUCTIONS.current.md` — неизменяемый эталон.
2. `USER_INSTRUCTIONS.draft.md` — 42 numbered rules; current coverage PASS 15/15.
3. `PROJECT_INSTRUCTIONS.current.md` — неизменяемый эталон.
4. `PROJECT_INSTRUCTIONS.draft.md` — 16 numbered rules; Project-specific coverage PASS.
5. `AGENTS.current.md` — exact snapshot актуального main AGENTS.
6. `AGENTS.draft.md` — 58 numbered rules; structural dedupe PASS, wording pass требует 3 локальных исправления.

## Финальная трёхслойная consistency-проверка

Результат: `research/three-layer-final-consistency.md`.

1. User draft — PASS.
2. Project draft — PASS.
3. Подтверждённых межслойных authority/routing противоречий — 0.
4. Новых DELETE-SAFE межслойных дублей — 0.
5. AGENTS draft — BLOCKED тремя wording-regressions:
   - Principle 4: non-requirement превратился в prohibition;
   - Diagnosis 1: exemption symptom/causal-chain стал двусмысленно шире;
   - General 6: history authority restriction расширен с current behavior на history вообще.
6. Предыдущий вывод, что все 19 wording reductions semantic-safe, исправлен и занесён в `AGENT_ERRORS.md` и `AGENT_LOGIC_ERRORS.md`.

Проверяющий: не назначен.

Блокер: три локальных semantic regression в AGENTS draft.

Следующий переход: исправить только эти три пункта AGENTS draft, не трогая User/Project и остальные 55 AGENTS rules; затем повторить финальную consistency-проверку.

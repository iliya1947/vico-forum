# Текущее состояние

Активная работа: перезапуск архитектуры инструкций после отклонения предыдущего результата разработчиком.

Исполнитель: Мира — ChatGPT-5.6 Sol.

Рабочий PR: #368 — draft, аналитическое рабочее пространство, не предназначено для merge.

Рабочая ветка: `service/mira-instruction-layering-workbench`.

База: `main` @ `9cff976a9621d9fe5dfef28ea5367e390ff435b1`.

## Текущий приоритет

**Задача 1:** ужать и привести в нормальный рабочий вид уже действующие User / Project / AGENTS инструкции.

На этом этапе:
- новые требования не добавляются;
- самостоятельные пункты не склеиваются ради количества;
- сокращается вода, повторы и лишние пояснения;
- смысл, модальность, область, субъект, исключения и полномочия должны сохраниться.

## Отложено

`research/behavior-error-classes-reset.md` сохранён для **Задачи 2** — последующего улучшения интеллектуальной работы и логики после завершения текущего compression/fix-pass.

## Старый результат

- прежние User / Project / AGENTS drafts — REJECTED;
- `52/52`, `17/17 EXEC PASS`, three-layer PASS и transfer-readiness — невалидны как критерии;
- transfer package — INVALIDATED / DO NOT APPLY;
- реальные instruction sources не изменены.

## Текущий этап

Этап 14 — два Project finding из independent review проверены независимо.

Результат: `research/project-review-findings-verification.md`.

Подтверждено:
- **2 semantic regressions** в `PROJECT_INSTRUCTIONS.draft.md`;
- удалённый unconditional goal guard шире surviving AGENTS Logic trigger;
- удалённый mandatory pre-answer context/interpretation checkpoint не имеет эквивалентного every-answer coverage в AGENTS;
- User draft этим review не затронут;
- AGENTS draft этим review не затронут;
- предыдущий финальный whole-system PASS **INVALIDATED**.

Статус Task 1: **HOLD**.

На этом bounded-этапе drafts не изменялись.

Следующий bounded-этап: локально восстановить в `PROJECT_INSTRUCTIONS.draft.md` оба исходных Project guards в компактной семантически эквивалентной форме и затем проверить exact diff/coverage.
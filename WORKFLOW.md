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

Этап 12 — внутренний duplicate-pass `USER_INSTRUCTIONS.draft.md` завершён без изменения draft.

Результат: `research/user-internal-duplicates-pass.md`.

Подтверждено:
- полных internal delete-safe дублей: 0;
- частичных internal delete-safe дублей: 0;
- U3/U7/U8/U13 — разные epistemic guards;
- U4/U5/U6 — verification/fallback/action-provenance с разными triggers;
- U9/U10 и U11/U15 — разные behavior/continuation contracts;
- старое упоминание U08/U13 относится к rejected архитектуре и не применяется к current draft;
- User draft остаётся 1159 chars / 164 words / 15 rules.

Внутренний delete-safe резерв User слоя исчерпан.

Следующий bounded-этап: финальный whole-system recheck текущих exact drafts после всех применённых межслойных и внутренних dedupe-изменений.
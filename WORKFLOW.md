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

Этап 7 — глубокий повторный межслойный duplicate-pass после D1–D4 завершён.

Результат: `research/cross-layer-duplicates-deep-pass.md`.

Подтверждено:
- новых полных delete-safe межслойных дублей: 0;
- новых частичных delete-safe дублей: 0;
- P3 ↔ AGENTS остаётся strong overlap, но trigger/scope неэквивалентны;
- User ↔ AGENTS semantic overlaps остаются audience-required;
- остальные Project ↔ AGENTS пересечения — specialization/bootstrap/workflow distinctions.

Межслойный delete-safe резерв на текущих drafts исчерпан.

Следующий bounded-этап: искать **внутренние дубли внутри слоёв**, начиная с `AGENTS.draft.md`, где находится основная масса текста.
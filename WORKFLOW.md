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

Этап 5 — анализ межслойных дублей завершён.

Результат: `research/cross-layer-duplicates-pass.md`.

Подтверждено:
- 2 полных delete-safe Project ↔ AGENTS дубля;
- 1 повтор mapping-данных Project ↔ AGENTS;
- 1 частичный delete-safe Project ↔ AGENTS дубль;
- 1 strong overlap, пока не delete-safe;
- минимум 7 User ↔ AGENTS semantic-overlap clusters, которые нужно сохранять из-за разной аудитории;
- подтверждённых delete-safe User ↔ Project дублей: 0.

Drafts на этом этапе не менялись.

Следующий bounded-этап: применить только подтверждённые D1–D4 к Project draft, затем повторно проверить смысл и общий объём.
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

Этап 1 — compression/fix-pass действующих User Instructions завершён.

Результаты:
- `USER_INSTRUCTIONS.draft.md` заново построен только из current baseline;
- 15 → 15 самостоятельных пунктов;
- 1302 → 1190 chars;
- 185 → 167 whitespace-words;
- новых требований: 0;
- semantic check: смысл/модальность/субъект/область/исключения/полномочия сохранены;
- evidence: `research/user-current-compression-pass.md`.

Следующий bounded-этап: compression/fix-pass действующих Project Instructions без добавления новых требований.
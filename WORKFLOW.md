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

Этап 11 — внутренний duplicate-pass `PROJECT_INSTRUCTIONS.draft.md` завершён без изменения draft.

Результат: `research/project-internal-duplicates-pass.md`.

Подтверждено:
- полных internal delete-safe дублей: 0;
- частичных internal delete-safe дублей: 0;
- P9/P10/P11 и P12/P13 похожи, но имеют разные triggers/actions и сохраняются;
- Project draft остаётся 2423 chars / 325 words / 18 numbered rules.

Внутренний delete-safe резерв Project слоя после межслойной чистки исчерпан.

Следующий bounded-этап: искать внутренние дубли в `USER_INSTRUCTIONS.draft.md`.
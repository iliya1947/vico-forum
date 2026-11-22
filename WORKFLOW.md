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

Этап 10 — 7 exact-проверенных внутренних AGENTS dedupe-изменений применены.

Результаты:
- `AGENTS.draft.md`: 16082 → 15363 chars;
- words: 2015 → 1923;
- numbered rules: 64 → 64;
- экономия: 719 chars / 92 words;
- снятые кандидаты Workflow 11, Review 1/Mark и Review 6/plan-change не изменялись;
- semantic/authority coverage exact-check: PASS;
- evidence: `research/agents-internal-dedupe-application.md`.

Следующий bounded-этап: искать внутренние дубли в `PROJECT_INSTRUCTIONS.draft.md` после межслойной чистки.
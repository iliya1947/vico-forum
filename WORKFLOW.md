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

Этап 8 — внутренний duplicate-pass `AGENTS.draft.md` завершён без изменения draft.

Результат: `research/agents-internal-duplicates-pass.md`.

Подтверждено:
- 10 delete-safe внутренних повторов/хвостов;
- основные зоны: Roles ↔ Workflow ↔ Review, Workflow ↔ Review, Diagnosis ↔ Logic/Developer action;
- самостоятельные numbered rules можно сохранить 64 → 64;
- потенциально AGENTS: 16082 → 15161 chars, 2015 → 1899 words;
- экономия только дедупликацией: 921 chars / 116 words;
- новые требования: 0.

Следующий bounded-этап: применить только эти 10 подтверждённых internal-dedupe изменений к `AGENTS.draft.md` и повторно проверить semantic coverage.
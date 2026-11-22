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

Этап 6 — подтверждённые межслойные дубли D1–D4 применены к Project draft.

Результаты:
- D1/D2 удалены как полные Project ↔ AGENTS дубли;
- D3 уже был применён: mapping имён/моделей заменён ссылкой на `AGENTS.md → Роли`;
- D4 применён: удалён только поясняющий хвост Project rule 2;
- Project rule 3 current-Stage/future-groundwork не тронут;
- Project: 2680 → 2423 chars, 364 → 325 words, 18 → 18 numbered rules;
- total drafts: 19921 → 19664 chars, 2543 → 2504 words;
- evidence: `research/project-cross-layer-dedupe-application.md`.

Следующий bounded-этап: повторный межслойный pass после D1–D4 — искать оставшиеся дубли глубже, не считая audience-required повторов delete-safe без доказательства.
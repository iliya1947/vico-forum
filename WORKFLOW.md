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

Независимая проверка exact финальных Task 1 drafts: **HOLD**.

Проверены exact blobs:
- User `a6f16c64a68ebf372a4a6bb3ff146112463e7d68` — PASS;
- Project `8cdf099aa3ecd0c1bbd295cbbba1353cca327995` — HOLD;
- AGENTS `3505f50d275e7e938575fa366bd6f00d1e4c9972` — без подтверждённого blocker.

Подтверждены 2 semantic regression в Project draft:
1. удалён unconditional goal guard «Всегда рассуждай от цели…»; AGENTS replacement действует только перед существенным выводом/самостоятельно выбранным действием и уже по trigger/scope;
2. удалён обязательный pre-answer check «не упустила ли ты что-то очевидное… / не отвечай по первой трактовке»; AGENTS Logic/Principle не устанавливают эквивалентный checkpoint перед каждым ответом.

Предыдущий Task 1 whole-system PASS недействителен. `97 → 97 numbered rules` не защищает самостоятельные ненумерованные требования.

Следующий bounded-этап: локально исправить только эти подтверждённые Project regressions и повторить semantic recheck. User/AGENTS без нового finding не менять.


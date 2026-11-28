Этот файл хранит текущее оперативное состояние задачи и следующий переход.

# Workflow

## Активный этап

Stage A принятого `PLAN.md`: coordinator review Миры на exact head `fe4c6d7b13cac06e5059d2cffd1d0e4cf5f973eb` завершён **HOLD**. Подтверждены три дефекта текущего Stage A; correction возвращён Лене. Stage B заблокирован.

## Назначение

- Координатор — Мира.
- Автор принятого технического плана — Лёва.
- Исполнитель Stage A — Лена (GPT-6.2); текущая проверка — Мира.
- Реализация — #399, ветка `feature/chatgpt-forum-control`.
- Служебный PR — #400, ветка `service/chatgpt-forum-control`.

## Состояние

1. Product contract согласован; новый `PLAN.md` прошёл полную проверку Миры: PASS. [Проверка](research/plan-review-mira.md)
2. F-01 закрыт: каждый MCP tool самостоятельно проводит запрос через собственный server/GitHub path и не зависит от другого plugin/connector.
3. Delivery mode — stacked A → I по этапам принятого `PLAN.md`; первый implementation PR — `#399`.
4. Account-specific Site/OAuth/write-approval behavior остаётся обязательным Stage-6 gate. Информация не проверена до разрешённой внешней проверки.
5. Stage A implementation и author self-check исходников переданы на exact head `fe4c6d7b13cac06e5059d2cffd1d0e4cf5f973eb` (#399). Runtime evidence не подтверждено; PASS не присвоен.

## Следующий переход

Лена исправляет единым bounded-пакетом A-F01–A-F03 из `stages/A/REVIEW.md` и выполняет source self-check. CI/acceptance не запускает: по прямой команде владельца ими занимается Мира. После нового stable exact head Лена передаёт его Мире. Мира повторно проводит coordinator cycle, проверяет CI и запускает применимый local OAuth Chromium acceptance. Stage B до PASS не начинается.

## Очередь следующих подзадач

После завершения текущего ChatGPT-control в этом же служебном PR:

1. встроенный AI для пользователей форума;
2. AI для администрирования и модерации.

Они пока не активны и не расширяют Stage A–I или #399. Для каждой сначала выполняется отдельная product-scope проработка и техническое планирование.


## Параллельный planning-track — embedded AI

**PAUSED.** Product scope двух embedded-AI направлений ещё не утверждён владельцем. До последовательного согласования product decisions технический plan Лёвы не продолжается.

ChatGPT-control Stage A в `#399` передан Мире на проверки; embedded-AI planning остаётся отдельным.

User AI coordinator consistency check завершён: PASS после удаления stale/superseded входов. Moderator/Admin AI не входит в этот subtask и будет прорабатываться отдельно по следующей явной команде владельца.

User AI product alignment: COMPLETE. Действующий contract — `research/user-ai-product-concept.md`; technical planning общего embedded-AI блока остаётся PAUSED до отдельного принятия Admin/Moderation AI product contract.


## Зафиксированные три направления AI-блока

По прямому уточнению владельца три направления из #300 ведутся как отдельные задачи:

1. **ChatGPT-control** — управление Vico Forum владельцем из обычного ChatGPT; текущая активная реализация #399.
2. **User AI** — встроенный пользовательский консультант/навигация по форуму; product concept согласован отдельно.
3. **Admin/Moderation AI** — отдельная будущая product-задача; не смешивается с User AI.

Дальнейшая продуктовая/техническая проработка направлений 2–3 **PAUSED** по прямой команде владельца. Текущий приоритет — coordinator review завершённого Леной Stage A #399.

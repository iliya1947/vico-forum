Этот файл хранит текущее оперативное состояние задачи и следующий переход.

# Workflow

## Активный этап

Активная реализация — Stage A принятого `PLAN.md`. Исполнитель: Лена (GPT-6.2). Режим поставки — stacked A → I.

## Назначение

- Координатор — Мира.
- Автор принятого технического плана — Лёва.
- Текущий исполнитель — Лена (GPT-6.2), Stage A.
- Реализация — #399, ветка `feature/chatgpt-forum-control`.
- Служебный PR — #400, ветка `service/chatgpt-forum-control`.

## Состояние

1. Product contract согласован; новый `PLAN.md` прошёл полную проверку Миры: PASS. [Проверка](research/plan-review-mira.md)
2. F-01 закрыт: каждый MCP tool самостоятельно проводит запрос через собственный server/GitHub path и не зависит от другого plugin/connector.
3. Delivery mode — stacked A → I по этапам принятого `PLAN.md`; первый implementation PR — `#399`.
4. Account-specific Site/OAuth/write-approval behavior остаётся обязательным Stage-6 gate. Информация не проверена до разрешённой внешней проверки.
5. `#399` передан Лене как первая implementation-ступень Stage A; на момент handoff его исходный head — `bc8d800`, changed files = 0.

## Следующий переход

Лена реализует только Stage A по принятому `PLAN.md` в `#399`, выполняет author self-check и применимые проверки, затем передаёт stable exact head Мире на coordinator checkpoint. Stage B до PASS Миры не начинается.

## Очередь следующих подзадач

После завершения текущего ChatGPT-control в этом же служебном PR:

1. встроенный AI для пользователей форума;
2. AI для администрирования и модерации.

Они пока не активны и не расширяют Stage A–I или #399. Для каждой сначала выполняется отдельная product-scope проработка и техническое планирование.


## Параллельный planning-track — embedded AI

Лена продолжает активный ChatGPT-control Stage A в `#399`.

Параллельно Лёва готовит **только технический план** двух встроенных AI-направлений по `stages/embedded-ai/SCOPE.md`. Результат — `stages/embedded-ai/PLAN.md`. Этот planning-track не изменяет текущий `PLAN.md`, `#399` или implementation stack A → I.

После завершения Лёва передаёт embedded-AI plan Мире на проверку. Реализация embedded AI до отдельного решения владельца и принятия плана не начинается.

Этот файл хранит текущее оперативное состояние задачи и следующий переход.

# Workflow

## Активный этап

Stage A принятого `PLAN.md` завершён **PASS** на stable exact head `ce85db5f4ae7bc33992174cc6ae69b47da0bf2cd`. Coordinator review, основной CI и Stage-A-specific OAuth Chromium acceptance завершены успешно. Stage B пока **не активирован**.

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
5. Stage A coordinator checkpoint: **PASS**. CI run `46148681007` — success; Forum control local OAuth Chromium acceptance run `46149123687` — success; оба на exact head `ce85db5f4ae7bc33992174cc6ae69b47da0bf2cd`.

## Следующий переход

Stage B из принятого `PLAN.md` подготовлен как следующий bounded-этап, но не активирован. По правилу последовательного перехода после завершённой подзадачи требуется следующая явная команда владельца; до неё #399 не изменять и Stage B не начинать.

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
3. **Admin/Moderation AI** — отдельная активная product-задача; исходный scope широкий: определить практически полезные встроенные AI-функции для администрации/модерации, не ограничиваясь прежними примерами. Первый шаг — factual workload map — завершён.

User AI остаётся **PAUSED**. Admin/Moderation AI активирован владельцем; после завершённой workload map следующий product-шаг — оценить кандидаты функций и затем по одному согласовать минимальный v1. ChatGPT-control #399 ведётся отдельно и не смешивается с этим product-track.

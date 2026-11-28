Этот файл хранит текущее оперативное состояние задачи и следующий переход.

# Workflow

## Активный этап

Stage A принятого `PLAN.md`: implementation и source-level author self-check переданы Мире для применимых проверок и coordinator checkpoint. Режим поставки — stacked A → I.

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

По прямой команде владельца результаты CI не относятся к работе Лены. Мира принимает stable exact head `fe4c6d7b13cac06e5059d2cffd1d0e4cf5f973eb`, проверяет уже запущенный [CI #46109469613](https://github.com/iliya1947/vico-forum/actions/runs/46109469613), выполняет остальные применимые проверки, включая local OAuth Chromium acceptance, и проводит coordinator checkpoint по Stage A. Контекст и ограничения — `agents/lena.md`, последний раздел. Не считать handoff PASS. При подтверждённых дефектах вернуть единым пакетом исполнителю. Stage B до PASS Миры не начинается.

## Очередь следующих подзадач

После завершения текущего ChatGPT-control в этом же служебном PR:

1. встроенный AI для пользователей форума;
2. AI для администрирования и модерации.

Они пока не активны и не расширяют Stage A–I или #399. Для каждой сначала выполняется отдельная product-scope проработка и техническое планирование.


## Параллельный planning-track — embedded AI

**PAUSED.** Product scope двух embedded-AI направлений ещё не утверждён владельцем. До последовательного согласования product decisions технический plan Лёвы не продолжается.

ChatGPT-control Stage A в `#399` передан Мире на проверки; embedded-AI planning остаётся отдельным.

Следующий шаг embedded-AI: базовая роль User Consultant уточнена владельцем как forum navigator/topic finder. Consultant access закрыт для использования без auth, но guest-visible через auth-gate. Память v1 — только текущая консультация с replaceable state boundary для будущего persistence. Consultant также использует три server-selected disclosure layers с наследованием User → Moderator → Administrator, чтобы model context не содержал знания более высокого уровня. Основной launcher — плавающая кнопка внизу справа с popup/side panel; контекстные входы открывают того же Consultant. Дальше по одному закрыть оставшиеся product decisions из `research/embedded-ai-concept-v1.md`. Только после утверждённого product contract planning-track Лёвы может быть возобновлён.

Embedded-AI product alignment: topic summary закрыт как implicit Consultant capability, не отдельная v1-фича. Остался один существенный product decision: минимальный обязательный scope Moderator Copilot v1.

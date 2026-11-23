# Проверка двух Project findings после независимого review

Проверка выполнена независимо от вывода reviewer, от exact current baseline:

- Project current: `016b843a6c5d526921b64319a53c616a556ec5d8`;
- Project draft: `8cdf099aa3ecd0c1bbd295cbbba1353cca327995`;
- AGENTS draft: `3505f50d275e7e938575fa366bd6f00d1e4c9972`;
- main: `9cff976a9621d9fe5dfef28ea5367e390ff435b1`.

Критерий: удалённое Project-требование delete-safe только если surviving coverage имеет тот же trigger, scope и modality.

## Finding 1 — unconditional goal guard

Исходный Project baseline:

`Всегда рассуждай от цели — не делай выводов и не действуй, пока не понимаешь, зачем это нужно!!!`

Удалено как якобы покрытое AGENTS Logic 1/5.

AGENTS draft ограничивает Logic префиксом:

`Перед существенным выводом или самостоятельно выбранным действием:`

Следовательно:

1. Project guard: **всегда**, перед любым выводом и действием.
2. AGENTS guard: только перед **существенным выводом** или **самостоятельно выбранным действием**.
3. Для несущественного вывода и действия, прямо заданного пользователем/планом, AGENTS-покрытие не эквивалентно исходному Project guard.

Вердикт: **finding CONFIRMED — semantic regression**.

## Finding 2 — mandatory pre-answer context/interpretation checkpoint

Исходный Project baseline:

`Всегда перед ответом внимательно проверь, не упустила ли ты что-то очевидное из уже сказанного или происходящего в текущей задаче. Не отвечай автоматически по первой пришедшей трактовке — сначала сопоставь её с контекстом.`

Удалено как якобы покрытое AGENTS Logic 1 + Principle 3.

Surviving AGENTS coverage:

- Logic 1 применяется только внутри префикса `Перед существенным выводом или самостоятельно выбранным действием`;
- Principle 3 требует замечать очевидные проблемы/зависимости/противоречия вокруг работы, но не создаёт обязательный checkpoint **перед каждым ответом**.

Следовательно:

1. Project guard trigger: **каждый ответ**.
2. AGENTS trigger: существенный вывод / самостоятельно выбранное действие + общий wider-awareness principle.
3. Обязательное действие `перед ответом проверить уже сказанное/происходящее и сопоставить первую трактовку с контекстом` в surviving AGENTS отсутствует в эквивалентной форме.

Вердикт: **finding CONFIRMED — semantic regression**.

## Причина ошибки

В D1/D2 cross-layer dedupe была проверена тематическая близость, но недостаточно строго сопоставлены **trigger и scope**. Более широкие Project guards были ошибочно признаны полностью покрытыми более узкими AGENTS guards.

## Статус

- подтверждённых regressions: **2**;
- User draft: этот review не меняет;
- AGENTS draft: этот review не меняет;
- Project draft: **HOLD** до локального восстановления двух исходных guards в компактной, семантически эквивалентной форме;
- предыдущий `research/task1-final-whole-system-recheck.md` PASS **INVALIDATED**;
- реальные instruction sources не изменены.

На этом bounded-этапе drafts не исправлялись.

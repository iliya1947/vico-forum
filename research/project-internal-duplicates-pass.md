# Внутренние дубли Project Instructions — deep pass

Scope: текущий `PROJECT_INSTRUCTIONS.draft.md` blob `8cdf099aa3ecd0c1bbd295cbbba1353cca327995`.

Критерий delete-safe: повтор должен иметь тот же trigger, scope, modality и требуемое действие; удаление одного текста не должно уменьшать Project-specific coverage.

## Проверенные кандидаты

### P1: priority line ↔ rule 1

- Priority line: прямые инструкции пользователя текущего чата приоритетнее Project.
- Rule 1: User Instructions и Project Instructions обязательны и действуют совместно.

Это разные semantics:
- первое — conflict precedence;
- второе — обязательность и совместное применение слоёв.

Вердикт: **не дубль**.

### P6 ↔ P7 — что не передавать Codex

P6:
- не пересказывать Codex правила из AGENTS/docs, которые он должен прочитать сам.

P7:
- передавать только task-specific контекст, который нельзя надёжно получить из repo.

Разница:
- P6 — explicit prohibition на пересказ обязательной документации;
- P7 — общий filter на task context, включая данные, которые вообще не являются правилами.

Удаление любого уменьшит coverage.

Вердикт: **не дубль**.

### P7 ↔ P8 — repo context vs pointers

P7:
- не передавать контекст, доступный из repo.

P8:
- при необходимости указывать конкретные files/modules/entry points/current implementation.

P8 не повторяет P7: это разрешённый/нужный locator, который помогает Codex найти нужный repo context без пересказа самого контекста.

Вердикт: **не дубль**.

### P9 ↔ P10 ↔ P11 — implementation freedom / unnecessary constraints / hard constraints

P9:
- не диктовать способ реализации, если конкретный способ не обязателен.

P10:
- не добавлять очевидные, дублирующие или страхующие ограничения без реальной необходимости.

P11:
- жёсткие требования/запреты использовать только для неизменяемых условий или важных границ.

Это три разных ошибки:
- P9 — over-prescription implementation method;
- P10 — redundant constraint bloat;
- P11 — unjustified normative hardness.

Они могут встречаться независимо друг от друга.

Вердикт: **не дубли**.

### P12 ↔ P13 — research neutrality vs independent verification neutrality

P12 trigger:
- решение ещё не определено и нужно исследование.

P13 trigger:
- Codex используется именно для независимой проверки технического вывода ChatGPT.

P13 строже: initial prompt вообще не должен содержать выводов ChatGPT. P12 запрещает навязывать/вести к желаемому выводу, но не обязательно запрещает любой релевантный контекст о существующих гипотезах.

Вердикт: **не дубль**.

### P14 ↔ P15 ↔ P16 — decomposition contract

P14:
- когда декомпозировать и показать разбиение.

P15:
- STOP после каждой подзадачи до явной команды.

P16:
- запрет дробить то, что должно выполняться/проверяться единым целым.

Это три независимых части одного процесса: decomposition trigger, continuation gate и anti-over-splitting guard.

Вердикт: **не дубли**.

### P17 ↔ P18 — risk policy lifecycle

P17:
- до pre-release: simplicity/speed/reversibility; exception for costly future rework.

P18:
- с pre-release: operational risk/error cost; protection complexity justified by real risk.

Они описывают разные lifecycle phases и разные decision criteria.

Вердикт: **не дубль**.

### Имена агентов — reference + usage

- `Имена и модели бери из AGENTS → Роли` задаёт source of truth.
- `Используй эти имена ...; техническое обозначение сохраняй точным` задаёт behavior.

Источник данных и правило применения различны.

Вердикт: **не дубль**.

## Итог

1. Полных delete-safe внутренних дублей: **0**.
2. Частичных delete-safe внутренних дублей: **0**.
3. Strong-overlap pairs: P9/P10/P11 и P12/P13, но это самостоятельные safeguards с разными triggers/actions.
4. Numbered rules остаются **18**.
5. Project draft остаётся **2423 chars / 325 words**.
6. Draft не изменялся.

## Вывод

После межслойной чистки внутренний delete-safe резерв Project Instructions **исчерпан**. Дальнейшее уменьшение Project слоя возможно только wording-pass либо изменением coverage/архитектуры, а не удалением внутренних дублей.

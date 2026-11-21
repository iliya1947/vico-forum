# Текущее состояние

Активная работа: архитектура инструкций и устранение дублирования между слоями.

Исполнитель: Мира — ChatGPT-5.6 Sol.

Рабочий PR: #368 — draft, аналитическое рабочее пространство, не предназначено для merge.

Рабочая ветка: `service/mira-instruction-layering-workbench`.

База: `main` @ `9cff976a9621d9fe5dfef28ea5367e390ff435b1`.

## Канонические рабочие файлы

1. `USER_INSTRUCTIONS.current.md` — неизменяемый эталон.
2. `USER_INSTRUCTIONS.draft.md` — рабочий пользовательский черновик; сейчас 42 пункта / 52 semantic guards.
3. `PROJECT_INSTRUCTIONS.current.md` — неизменяемый эталон.
4. `PROJECT_INSTRUCTIONS.draft.md` — рабочий Project draft.
5. `AGENTS.current.md` — неизменяемый эталон.
6. `AGENTS.draft.md` — рабочий AGENTS draft.

Старые reconstruction/proposal материалы не являются основанием для решений.

## User layer

1. Исходные 55 правил классифицированы.
2. Удалены только три подтверждённо избыточных смысла: old 17, 29, 44.
3. 52 оставшихся guard'а структурно упакованы в 42 пункта.
4. Завершена карта локального сокращения формулировок: `research/user-42-wording-reduction-map.md`.
5. Подтверждены 14 material wording reductions; draft на этом этапе не изменён.
6. Оценочный эффект этих 14 формулировок: 1098 → 1001 whitespace words (-97), при сохранении 42 пунктов и 52 semantic guards.
7. Микросокращения на 1–3 слова без заметной пользы сознательно не включены.

Проверяющий: не назначен.

Блокер: нет.

Следующий переход: применить только 14 подтверждённых wording reductions к `USER_INSTRUCTIONS.draft.md`, затем выполнить semantic diff текущего 42-point draft против сокращённого текста.

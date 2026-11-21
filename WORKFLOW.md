# Текущее состояние

Активная работа: архитектура инструкций и устранение дублирования между слоями.

Исполнитель: Мира — ChatGPT-5.6 Sol.

Рабочий PR: #368 — draft, аналитическое рабочее пространство, не предназначено для merge.

Рабочая ветка: `service/mira-instruction-layering-workbench`.

База: `main` @ `9cff976a9621d9fe5dfef28ea5367e390ff435b1`.

## Канонические рабочие файлы

1. `USER_INSTRUCTIONS.current.md` — неизменяемый эталон.
2. `USER_INSTRUCTIONS.draft.md` — рабочий пользовательский черновик; 42 пункта / 52 semantic guards.
3. `PROJECT_INSTRUCTIONS.current.md` — неизменяемый эталон.
4. `PROJECT_INSTRUCTIONS.draft.md` — рабочий Project draft.
5. `AGENTS.current.md` — неизменяемый эталон.
6. `AGENTS.draft.md` — рабочий AGENTS draft.

Старые reconstruction/proposal материалы не являются основанием для решений.

## User layer

1. Исходные 55 правил классифицированы.
2. Удалены только три подтверждённо избыточных смысла: old 17, 29, 44.
3. 52 оставшихся guard'а структурно упакованы в 42 пункта.
4. Применены 14 подтверждённых wording reductions в пунктах: 8, 9, 13, 18, 19, 23, 25, 26, 27, 28, 30, 35, 37, 38.
5. Semantic diff: `research/user-42-wording-semantic-diff.md`.
6. Объём draft: 1143 → 1046 whitespace words.
7. Количество пунктов осталось 42, semantic guards — 52.

Исправление отчётности: в предыдущем сообщении разработчику ошибочно было указано 1408 слов; фактический объём до wording reduction — 1143.

Проверяющий: не назначен.

Блокер: нет.

Следующий переход: выполнить current-vs-draft semantic coverage User layer — проверить сохранность всех 15 действующих current-смыслов и отдельно перечислить новые guards draft.

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

## User layer

1. Исходные 55 правил классифицированы.
2. Удалены только old 17, 29, 44 как подтверждённо избыточные.
3. 52 оставшихся guard'а упакованы в 42 пункта.
4. Применены 14 подтверждённых wording reductions.
5. Установленная regression в draft rule 8 исправлена локально; изменился только rule 8.
6. Повторный current-vs-draft coverage: `research/user-current-vs-draft-coverage-recheck.md`.
7. Результат: **15/15 current rules FULL**, PARTIAL 0, LOST 0.
8. На уровне User instructions текущий draft является semantic superset действующих current rules.

Проверяющий: не назначен.

Блокер: нет.

Следующий переход: перейти к `PROJECT_INSTRUCTIONS.current.md` vs `PROJECT_INSTRUCTIONS.draft.md` и User draft — определить, какие общие правила Project теперь дублируют User layer, а какие действительно должны остаться project-specific. На первом проходе только классификация, без изменения Project draft.

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
5. Выполнена current-vs-draft semantic coverage: `research/user-current-vs-draft-coverage.md`.
6. Из 15 действующих current rules:
   - 14 сохраняются полностью;
   - current 8 сохраняется только частично.
7. Regression: current 8 требует, чтобы любой вывод делался только из установленных фактов и условий; draft 8 применяет этот strict gate только к категорическому выводу.
8. Поэтому текущий User draft пока нельзя считать strict semantic superset current.

Проверяющий: не назначен.

Блокер: одна установленная semantic regression в draft rule 8.

Следующий переход: локально исправить только draft rule 8 так, чтобы восстановить полный смысл current 8 и при этом сохранить новые guards uncertainty/hidden premises/confidence propagation; затем повторить coverage current 1–15.

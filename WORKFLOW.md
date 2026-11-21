# Текущее состояние

Активная работа: архитектура инструкций и устранение дублирования между слоями.

Исполнитель: Мира — ChatGPT-5.6 Sol.

Рабочий PR: #368 — draft, аналитическое рабочее пространство, не предназначено для merge.

Рабочая ветка: `service/mira-instruction-layering-workbench`.

База: `main` @ `9cff976a9621d9fe5dfef28ea5367e390ff435b1`.

## Канонические рабочие файлы

1. `USER_INSTRUCTIONS.current.md` — неизменяемый эталон.
2. `USER_INSTRUCTIONS.draft.md` — 42 пункта / 52 semantic guards; 15/15 current User rules FULL.
3. `PROJECT_INSTRUCTIONS.current.md` — неизменяемый эталон.
4. `PROJECT_INSTRUCTIONS.draft.md` — очищенный Project draft, но после AGENTS cross-layer анализа найдены ещё 1 full + 1 partial duplicate.
5. `AGENTS.current.md` — exact snapshot актуального main AGENTS.
6. `AGENTS.draft.md` — пока идентичен current.

## AGENTS cross-layer analysis

Полный анализ: `research/agents-vs-upper-layers-classification.md`.

Проверено:
- актуальный `main` по-прежнему `9cff976a9621d9fe5dfef28ea5367e390ff435b1`;
- `main:AGENTS.md` blob `9037fc15fd2b5fbf8c86ee677d00198dfcfbe442`;
- он полностью совпадает с `AGENTS.current.md`;
- AGENTS прочитан полностью.

Результат:
1. DELETE-SAFE из AGENTS по межслойному сравнению: **0**.
2. Причина: AGENTS — общий repository-visible contract для Codex + ChatGPT; User/Project coverage не заменяет его для Codex.
3. Новый DELETE-SAFE в Project draft: Project 3, полностью покрытый AGENTS Review 5.
4. Новый PARTIAL-DUPLICATE в Project draft: таблица имён/моделей; mapping уже содержится в AGENTS Roles, но короткое требование использовать закреплённые имена надо сохранить.
5. `AGENTS.draft.md` не изменён.

Проверяющий: не назначен.

Блокер: нет.

Следующий переход: применить к `PROJECT_INSTRUCTIONS.draft.md` два результата AGENTS cross-layer прохода — удалить Project 3 и заменить таблицу имён/моделей короткой ссылкой на актуальные AGENTS roles; затем сделать Project semantic diff повторно.

# WORKING_CONTEXT.md

Краткий оперативный контекст для ChatGPT и Codex. Source-of-truth документы проекта имеют приоритет.

## Текущий фокус

- Проект находится в ранней pre-release разработке.
- Активный продуктовый приоритет — UI/UX product pass.
- Stage 6 external integration поставлен владельцем на паузу.

## Активные PR

- #181 — persisted pinned topics; implementation PR, ещё не merged.
- #147 и #183 — служебные PR старого процесса; после merge нового workflow они считаются устаревшими каналами.

## Подтверждённые рабочие решения

- Implementation PR используется как общий технический канал ChatGPT и Codex.
- ChatGPT и Codex проводят независимые review до сравнения выводов.
- Исправляются только подтверждённые findings текущего Stage.
- Merge выполняет только пользователь.

## Незакрытое

- Завершить review/CI gates PR #181.
- Продолжить UI/UX product pass после завершения текущей bounded задачи.

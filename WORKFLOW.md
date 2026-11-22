# WORKFLOW.md — текущее оперативное состояние

## Текущий этап

- Служебный PR #369, ветка `service/ui-progress-preview-architecture`; не merge.
- Проверенная основа main: `9cff976a9621d9fe5dfef28ea5367e390ff435b1`.
- Концепция принята владельцем; D-06–D-09 действуют.
- Лёва завершил канонический финальный технический `PLAN.md`.
- Мира завершила scope/fit review PLAN: **PASS**. Подтверждённых plan blockers нет.
- **Delivery mode выбран: stacked для implementation P0→P5.** Причина: этапы образуют одну зависимую feature, промежуточные состояния не должны merge в main или становиться опубликованным preview до atomic cutover P5. P6 выполняется уже после merge как deployed Pages verification + отдельный documentation closeout.
- **Следующий bounded этап: P0. Исполнитель — Лира.**
- P0 и implementation PR ещё не запускались/не создавались.

## P0 — назначение Лире

Цель: доказать на одном реальном вертикальном пути, что принятая browser-only архитектура исполнима без копии route/action и без внешнего runtime.

Scope и gate — `PLAN.md §15 / P0`.

Обязательный результат:
1. plain Vite candidate с generated route tree/IDs из текущего `app/routes.ts`;
2. реальный production topic route/module в browser runtime;
3. реальный `clientAction → action` с test capability и разрешённым simulated result;
4. минимум один настоящий resource handler с middleware;
5. проверка Form/fetcher, relative Link и open-new-tab под Pages base;
6. attachment image/download через mode-aware resource boundary;
7. подтверждение отсутствия реальных DB/provider/Worker calls;
8. browser-run evidence на exact implementation head и список реально понадобившихся neutral seams.

STOP P0:
- если успех требует копировать route/action;
- если требуется внешний server/SQL runtime;
- если обнаружен дефект технического PLAN, от которого зависит продолжение.

Не расширять P0 до полной fixture database, всей матрицы экранов или production storage parity.

## Следующий переход

Разработчик подключает Лиру к #369. Лира читает актуальные AGENTS.md → RULES.md → TASK.md → WORKFLOW.md → PLAN.md и создаёт первый implementation PR P0 от актуального main.

После author self-check и применимых checks Лира возвращает P0 Мире на coordinator checkpoint. До PASS P0 следующий stacked этап P1 не начинать.

# WORKFLOW.md — текущее оперативное состояние

## Текущий этап

- Служебный PR #369, ветка `service/ui-progress-preview-architecture`; не merge.
- Проверенная основа main: `9cff976a9621d9fe5dfef28ea5367e390ff435b1`.
- Концепция принята владельцем; D-06–D-09 действуют.
- Лёва завершил канонический финальный технический `PLAN.md`.
- Мира завершила scope/fit review PLAN: **PASS**. Подтверждённых plan blockers нет.
- **Delivery mode выбран: stacked для implementation P0→P5.** Причина: этапы образуют одну зависимую feature, промежуточные состояния не должны merge в main или становиться опубликованным preview до atomic cutover P5. P6 выполняется уже после merge как deployed Pages verification + отдельный documentation closeout.
- **Следующий bounded этап: P0. Исполнитель — Лира.**
- **P0 начат Лирой:** [Draft implementation #373](https://github.com/iliya1947/vico-forum/pull/373), branch `feature/ui-progress-preview-p0`, exact `b6f81fa5d1731aaebcf757ea4d646020e0465f03`, base `main` `9cff976a9621d9fe5dfef28ea5367e390ff435b1` (behind 0).
- **P0-A:** генератор дескрипторов и тесты route IDs/nesting/resources/validation. Подтверждены в CI `45004547852`: lint/typecheck/unit/build PASS.
- **P0-B (первый browser import probe) — HOLD:** [Draft #373](https://github.com/iliya1947/vico-forum/pull/373) exact `ac9fac627af49baa75be816d5f339f0b559b6f75`, base `main` unchanged. Отдельный plain Vite candidate генерирует импорт реальных `root`, `locale-boundary`, `topic` из `app/routes.ts` без второго product module. Основная сборка, P0 Vite build и PostgreSQL/Worker проверка PASS; настоящий Chromium импорт **FAIL**: `ReferenceError: Buffer is not defined` (CI [45004547852](https://github.com/iliya1947/vico-forum/actions/runs/45004547852)). Browser proof и P0 gate не достигнуты. Output содержит `hyperdrive-forum` chunk; точный runtime import edge ещё не доказан. Не добавлять глобальный Buffer/polyfill/SQL engine как обход.
- Риск публикации: ошибочная первая ветка `chatgpt/ui-progress-preview-p0` активировала Pages push workflow и run `45002989024` завершился SUCCESS. Draft #372 закрыт без merge; работа перенесена в #373 на ветку вне Pages trigger. В старой ветке установлен deploy guard; проверено: [run 45003172563](https://github.com/iliya1947/vico-forum/actions/runs/45003172563) — `build SUCCESS`, `deploy SKIPPED`. Незапрошенная публикация не считается P0 verification; восстановление Pages из `main` без разрешения владельца не выполнялось.

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

**Лира — STOP после P0-B browser import diagnostic (HOLD).** Следующий отдельный микрошаг после owner `...`: установить конкретный транзитивный import/инициализатор, вызывающий `Buffer is not defined`, и исправить только подтверждённый import barrier в Draft #373. Сначала сопоставить server-only классы ошибок/PG constructors и import stack, не маскировать Polyfill-ом. При техническом дефекте PLAN — STOP/Лёва. После исправления — повторный exact-head Chromium smoke.

После выполнения всего P0, author self-check и применимых CI/checks Лира возвращает stable exact head Мире на bounded checkpoint. До PASS P0 — не начинать P1.

# WORKFLOW.md — текущее оперативное состояние

## Текущий этап

- Служебный PR #369, ветка `service/ui-progress-preview-architecture`; не merge.
- Проверенная основа main: `9cff976a9621d9fe5dfef28ea5367e390ff435b1`.
- Концепция принята владельцем; D-06–D-09 действуют.
- Лёва завершил канонический финальный технический `PLAN.md`.
- Мира завершила scope/fit review PLAN: **PASS**. Подтверждённых plan blockers нет.
- **Delivery mode выбран: stacked для implementation P0→P5.** Причина: этапы образуют одну зависимую feature, промежуточные состояния не должны merge в main или становиться опубликованным preview до atomic cutover P5. P6 выполняется уже после merge как deployed Pages verification + отдельный documentation closeout.
- **Следующий bounded этап: P0. Исполнитель — Лира.**
- **P0 in progress:** [Draft implementation #373](https://github.com/iliya1947/vico-forum/pull/373), branch `feature/ui-progress-preview-p0`, exact `47de5fd551128cf95e90e2767f74b872041616f6`, base `main` `9cff976a9621d9fe5dfef28ea5367e390ff435b1` (behind 0); no merge/deploy.
- **P0-A:** генератор дескрипторов и тесты route IDs/nesting/resources/validation. Подтверждены в CI `45004547852`: lint/typecheck/unit/build PASS.
- **P0-B → P0-C (browser import barriers):** initial [CI 45005504453](https://github.com/iliya1947/vico-forum/actions/runs/45005504453) proved `root` imports, `routes/locale-boundary` failed `Buffer is not defined` within `hyperdrive-forum` chunk. Scoped P0-C change moved `ForumStorageUnavailableError`, `AuthorizationUnavailableError` and `ContentGenerationPlanningUnavailableError` into neutral browser-safe modules, retained original production re-exports/same classes. Exact-head [CI 45006567306](https://github.com/iliya1947/vico-forum/actions/runs/45006567306): lint, typecheck, focused class-identity test, P0 Vite build SUCCESS; Chromium imports **root and locale-boundary successfully**, then fails on **routes/topic** with `Buffer is not defined` in `topic-*.js`. P0-C locale import barrier corrected; new topic dependency is NOT resolved. CI checks job FAIL (browser smoke), full CI/P0 gate NOT PASS; database job was still in progress at checkpoint. No polyfill/SQL/Worker introduced.
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

**Лира — STOP после P0-C (locale import barrier).** Следующий отдельный микрошаг по owner `...`: диагностировать конкретный backend import edge **`routes/topic`** (CI `45006567306`, `topic-*.js`, `Buffer is not defined`), проверить нейтральные error/repository boundaries, исправить только подтверждённую транзитивную зависимость, повторить exact-head Chromium. Не копировать topic route/action, не добавлять общий Buffer polyfill/SQL/backend. Если выявится дефект технического PLAN — STOP/Лёва.

После выполнения всего P0, author self-check и применимых CI/checks Лира возвращает stable exact head Мире на bounded checkpoint. До PASS P0 — не начинать P1.

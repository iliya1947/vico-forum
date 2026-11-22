# WORKFLOW.md — текущее оперативное состояние

## Текущий этап

- Служебный PR #369, ветка `service/ui-progress-preview-architecture`; не merge.
- Проверенная основа main: `9cff976a9621d9fe5dfef28ea5367e390ff435b1`.
- Концепция принята владельцем; D-06–D-09 действуют.
- Лёва завершил канонический финальный технический `PLAN.md`.
- Мира завершила scope/fit review PLAN: **PASS**. Подтверждённых plan blockers нет.
- **Delivery mode выбран: stacked для implementation P0→P5.** Причина: этапы образуют одну зависимую feature, промежуточные состояния не должны merge в main или становиться опубликованным preview до atomic cutover P5. P6 выполняется уже после merge как deployed Pages verification + отдельный documentation closeout.
- **Следующий bounded этап: P0. Исполнитель — Лира.**
- **P0 in progress:** [Draft implementation #373](https://github.com/iliya1947/vico-forum/pull/373), branch `feature/ui-progress-preview-p0`, exact `ad5661574482ba5b9cf59ca260584ebecf6f7d46`, base `main` `9cff976a9621d9fe5dfef28ea5367e390ff435b1` (behind 0); no merge/deploy.
- **P0-A:** генератор дескрипторов и тесты route IDs/nesting/resources/validation. Подтверждены в CI `45004547852`: lint/typecheck/unit/build PASS.
- **P0-C:** Chromium real import `root` and `routes/locale-boundary` PASS after neutral error-class seams; product routes/actions are unchanged.
- **P0-E:** neutral production-shared error classes extracted from `db/forum-repository`, `db/forum-service`, `db/account-state`, `db/user-measure-policy` plus attachment UUID check; production export identity and real `topicAction` preserved. [Exact-head CI #45008588204](https://github.com/iliya1947/vico-forum/actions/runs/45008588204): checks + database **SUCCESS** (lint/typecheck/focused identities/unit/production and preview builds/PG-Worker). Chromium imported real `root`, `routes/locale-boundary`, `routes/topic` with **0 external requests / 0 page errors**. Vite import diagnostic reports no topic→PG edges or browser-externalized Node modules. **Import barrier PASS; full P0 gate NOT YET PASS** (no real screen render/action/resource/URL/attachments proof).
- **P0-F1 (real screen):** [CI #45014003839](https://github.com/iliya1947/vico-forum/actions/runs/45014003839) on exact `c91b861f79d256f6dfb46605ecfaa6a40c772dc6`: **checks + database SUCCESS** (lint, typecheck, focused test, 222 unit test files, production/preview builds, PostgreSQL/Worker). Generated Framework IDs/tree adapted to real Data Router, original `root` App + `locale-boundary` middleware/loader + `topic` loader/TopicView executed with minimal synthetic guest `ForumReader` and localization contexts. Chromium asserts actual `main.topic-shell`, topic title and post body; **0 external requests, 0 JS page errors**. This verifies the real screen, not the entire P0 gate. Current standalone Vite HTML does not yet adapt Framework `root.Layout`/Meta/Links/Scripts; clientAction/action roundtrip, resource/middleware, URLs/new-tab, image/download remain unverified.
- **P0-F2 (document adapter PASS):** Shared production `rootDocumentLocale` now serves Framework `Layout` and embedded Vite document. Vite injects original `THEME_BOOTSTRAP_SCRIPT` before app entry. Generic actual matched-route `meta`/`links` exports are applied to Vite `<head>`, no nested Framework document or Scripts. [Exact-head CI #45020006913](https://github.com/iliya1947/vico-forum/actions/runs/45020006913) at `ad5661574482ba5b9cf59ca260584ebecf6f7d46`: **checks + database SUCCESS**; 223 unit test files PASS. Chromium real `TopicView` + `lang=en` / `dir=ltr` / persisted theme dark; 1 theme bootstrap, 1 module script, 2 stylesheets; 0 external requests / JS page errors. No `pg` import-edge diagnostics. **P0-F2 PASS, full P0 gate NOT YET PASS**.
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

**Лира — STOP after P0-F2 PASS.** Next owner `...` — **P0-F3**: bounded real topic `clientAction → action` proof using existing editor/response path, minimal typed test capability and allowed simulated success; verify Form/fetcher browser semantics without duplicating production action. Later separate resource/middleware, Pages URLs/new-tab and attachments P0 gates. No P1/merge/deploy.

После выполнения всего P0, author self-check и применимых CI/checks Лира возвращает stable exact head Мире на bounded checkpoint. До PASS P0 — не начинать P1.

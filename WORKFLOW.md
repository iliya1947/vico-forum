# WORKFLOW.md — текущее оперативное состояние #342

## Активный этап

**Task 6 — forum structure/topic move: F1/F2 coordinator PASS; F3 реализован Лёвой в Draft #381, exact-head checks в работе.**

- Current main: a3dae5815e26d158c566a27c552127b4b1ab29aa.
- Канонический plan: stages/forum-structure/PLAN.md, S0–S10 / F1–F7.
- Delivery: stacked F1→F6, затем отдельный F7 docs.
- F1 Draft #379 / feat/forum-structure-f1: accepted exact 8227db6003f5a23a369e11b645194da229315f7a, Draft/unmerged.
- F2 Draft #380 / feat/forum-structure-f2: accepted exact 11a2808f14a79efd69dbbb120f5b732bf2880d4f, Draft/unmerged.

## Текущее назначение — Лёва: завершить проверки F3

- Stacked Draft [#381](https://github.com/iliya1947/vico-forum/pull/381), base `feat/forum-structure-f2` exact `11a2808f14a79efd69dbbb120f5b732bf2880d4f`.
- F3 stable head: `ecc15de9d7036bac13f4ecafcb6fc0776ce7ea78`.
- Авторский scope/implementation/test evidence: [stages/forum-structure/F3_REPORT.md](stages/forum-structure/F3_REPORT.md).
- Локально PASS: 48 F3 PG17 tests, 36 F2 regressions + closure/visibility regressions, 41 validation units, typecheck/lint/migration guard. Запущен [CI45252637056](https://github.com/iliya1947/vico-forum/actions/runs/45252637056) + 10 applicable acceptance workflows. До результата gate остаётся у Лёвы.


Реализовать **только F3 — topic move, hidden admission и receipt reconciliation** из S8 PLAN.

Результат F3:
- authoritative topic move поверх accepted F2;
- expected source/location/global structure expectations и ordinary-only destination;
- dual hidden authority под actual topic lock, без расширения public/ordinary Admin hidden access;
- move меняет только topic location (section_id + location_version) и пишет atomic neutral structural History;
- matching create-topic receipt replay возвращает persisted/current section и не переносит тему обратно.

Критерий author gate — F3 Done из PLAN, включая реальные PG race/rollback проверки для move×visibility/other topic writers/reparent/deactivation и сохранение существующих topic/post/personal/content states.

Delivery:
- открыть отдельный stacked Draft implementation PR с base = feat/forum-structure-f2 exact 11a2808f14a79efd69dbbb120f5b732bf2880d4f;
- PR показывает только bounded F3 diff;
- после author self-check и применимых exact-head checks Лёва **STOP** → Mira bounded F3 coordinator checkpoint.

Вне F3:
- F4 coherent readers/order/private move context/picker/routes;
- F5 live forms/QuickActions/UI/Owner projection;
- F6 final assembly/whole-feature review.

Не merge #379/#380/F3 в main. Если accepted F2 head изменится до начала/во время F3, остановиться и синхронизировать dependency до продолжения.

## Reviewer route и границы

Лёва участвует в implementation Task 6, поэтому final independent whole-feature Codex reviewer — **Марк**, если остаётся code-independent.

- #342 — единственный service channel и никогда не merge.
- F4+ не активированы.
- #300, Stage6, deploy и general UI/UX не активированы.
- После F7/docs closeout — переход к #320.

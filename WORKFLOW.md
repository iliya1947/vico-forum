# WORKFLOW.md — текущее оперативное состояние #342

## Активный этап

**Task 6 — forum structure/topic move: F1 coordinator PASS; F2 ACTIVE → Лёва.**

- Current main: `a3dae5815e26d158c566a27c552127b4b1ab29aa`.
- Канонический plan: [stages/forum-structure/PLAN.md](stages/forum-structure/PLAN.md), S0–S10 / F1–F7.
- Delivery: stacked F1→F6, затем отдельный F7 docs.
- F1 Draft #379: branch `feat/forum-structure-f1`, accepted exact head `8227db6003f5a23a369e11b645194da229315f7a`; Mira bounded coordinator PASS. #379 остаётся Draft/unmerged.

## Текущее назначение — Лёва: F2

Реализовать **только F2 — authoritative structure commands + atomic History** из S8 PLAN.

Граница результата:
- authoritative create/rename/reorder/reparent для ordinary categories/sections поверх принятого F1 foundation;
- atomic structural History в той же транзакции;
- accepted permission/active/AP-10/CAS/no-op/overflow и concurrency contracts из PLAN;
- реальная F2 PG coverage и applicable checks.

Delivery:
- открыть отдельный stacked Draft implementation PR с **base = `feat/forum-structure-f1`**;
- PR должен показывать только bounded diff F2 относительно accepted F1 head;
- после author self-check и применимых exact-head checks Лёва **STOP** и передаёт stable F2 head Мире для coordinator checkpoint.

Вне F2:
- topic move / hidden admission / receipt reconciliation — F3;
- coherent readers/private move context/picker — F4;
- shared forms/UI/Owner projection — F5;
- final assembly/whole-feature review — F6.

Не merge F1/F2 в main. Если accepted F1 head изменится до начала F2, сначала остановиться и зафиксировать dependency change; иначе базовый exact head — `8227db6003f5a23a369e11b645194da229315f7a`.

## Reviewer route

Лёва участвует в implementation Task 6, поэтому final independent whole-feature Codex reviewer остаётся **Марк**, если он не участвует в коде.

## Границы

- #342 — единственный service channel и никогда не merge.
- #379 остаётся Draft/unmerged.
- F3+ не активированы.
- #300, Stage6, deploy и general UI/UX не активированы.
- После F7/docs closeout — переход к #320.

# WORKFLOW.md — текущее оперативное состояние #342

## Активный этап

**Task 6 — forum structure/topic move: F1/F2/F3 coordinator PASS; F4 ACTIVE → Лёва.**

- Current main: `a3dae5815e26d158c566a27c552127b4b1ab29aa`.
- Канонический plan: [stages/forum-structure/PLAN.md](stages/forum-structure/PLAN.md), S0–S10 / F1–F7.
- Delivery: stacked F1→F6, затем отдельный F7 docs.
- F1 Draft #379 / `feat/forum-structure-f1`: accepted exact `8227db6003f5a23a369e11b645194da229315f7a`, Draft/unmerged.
- F2 Draft #380 / `feat/forum-structure-f2`: accepted exact `11a2808f14a79efd69dbbb120f5b732bf2880d4f`, Draft/unmerged.
- F3 Draft #381 / `feat/forum-structure-f3`: accepted exact `ecc15de9d7036bac13f4ecafcb6fc0776ce7ea78`, Draft/unmerged.

## Текущее назначение — Лёва: F4

Implementation: Draft [#382](https://github.com/iliya1947/vico-forum/pull/382), branch `feat/forum-structure-f4`, exact head `25ff04836ecafcda81a980d1711f6e8fa21dd16d`; base F3 exact не изменился. Реализация и targeted author checks завершены; full CI/applicable acceptance запущены. Следующий шаг сейчас — Лёва проверяет результаты exact-head checks и затем передаёт Мире bounded checkpoint.

Реализовать **только F4 — coherent readers, ordering и private move context/picker** из S8 PLAN.

Граница результата:
- affected public/Admin hierarchy readers дают coherent snapshots и используют принятый persisted order до LIMIT;
- hierarchy/location/counts/breadcrumbs отражают accepted F2/F3 reparent/move semantics, Help exclusions сохраняются;
- отдельные guarded private move-context и destination-picker reads/routes соответствуют S2.1/S7.1, не расширяя public/ordinary Admin hidden source access;
- versioned bounded cursor/filter/total contracts, private no-store/error boundaries и named Admin routing/Hyperdrive capability wiring входят в F4.

Критерий author gate — F4 Done из PLAN: page/filter/global ordering, first-three sections, correct post-reparent/move projections, snapshot-race coverage, hidden neutral/public-safe behavior, actor/key revoke/AP-10/query/ID/cursor denial и private document/.data/error no-store.

Delivery:
- открыть отдельный stacked Draft implementation PR с **base = `feat/forum-structure-f3`** exact `ecc15de9d7036bac13f4ecafcb6fc0776ce7ea78`;
- PR показывает только bounded F4 diff;
- после author self-check и применимых exact-head checks Лёва **STOP** → Mira bounded F4 coordinator checkpoint.

Вне F4:
- F5 live structure forms, shared Move control/QuickActions, mutation POST dispatch, editor-lifetime behavior и Owner History projection;
- F6 final assembly/whole-feature acceptance/review.

Не merge #379/#380/#381/F4 в main. Если accepted F3 head изменится, сначала синхронизировать dependency до продолжения.

## Reviewer route и границы

Лёва участвует в implementation Task 6, поэтому final independent whole-feature Codex reviewer — **Марк**, если остаётся code-independent.

- #342 — единственный service channel; никогда не merge.
- F5+ не активированы.
- #300, Stage6, deploy и general UI/UX не активированы.
- После F7/docs closeout — переход к #320.

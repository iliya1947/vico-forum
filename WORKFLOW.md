# WORKFLOW.md — текущее оперативное состояние #342

## Активный этап

**Task 6 — forum structure/topic move: F1/F2/F3 coordinator PASS; F4 author gate PASS → Мира.**

- Current main baseline: `a3dae5815e26d158c566a27c552127b4b1ab29aa`.
- Канонический plan: [stages/forum-structure/PLAN.md](stages/forum-structure/PLAN.md), S0–S10 / F1–F7.
- Delivery: stacked F1→F6, затем отдельный F7 docs.
- F1 Draft #379 / `feat/forum-structure-f1`: accepted `8227db6003f5a23a369e11b645194da229315f7a`.
- F2 Draft #380 / `feat/forum-structure-f2`: accepted `11a2808f14a79efd69dbbb120f5b732bf2880d4f`.
- F3 Draft #381 / `feat/forum-structure-f3`: accepted `ecc15de9d7036bac13f4ecafcb6fc0776ce7ea78`.
- F4 Draft [#382](https://github.com/iliya1947/vico-forum/pull/382) / `feat/forum-structure-f4`: stable exact `86aadfe49dfe175b7f42baeaa6fa78883631ebeb`.
- F4 base = `feat/forum-structure-f3` exact `ecc15de9d7036bac13f4ecafcb6fc0776ce7ea78`, dependency не изменилась. Все четыре PR Draft/unmerged.

## Текущее назначение — Мира: bounded F4 coordinator checkpoint

Проверить whole bounded F4 diff против S2.1/S3/S6/S7.1/S8/S9 PLAN на указанном exact head. Author evidence и seams для следующего этапа: [F4_REPORT.md](stages/forum-structure/F4_REPORT.md).

F4 реализует coherent public/Admin hierarchy reads и persisted SQL order до LIMIT, versioned bounded cursors/independent totals/First recovery, source-free guarded move context и ordinary destination picker, read-only routes/named Admin routing/WEB_HYPERDRIVE wiring, private document/.data/error boundaries. Public/ordinary Admin hidden source access не расширен.

Авторский gate PASS:
- [CI45261384641](https://github.com/iliya1947/vico-forum/actions/runs/45261384641): 3070 unit / 1815 PostgreSQL tests, lint/typecheck/build/UI-preview, migration/schema/runtime/credential checks и built Worker HTTP smokes.
- Все 17 применимых acceptance workflows на том же final head PASS.
- Реальные snapshot races и exact web-role/max1 pool; начальные route enumeration/profile-fixture integration failures исправлены без production fallback, final checks green.

После coordinator PASS Мира отдельно определяет F5/исполнителя. При подтверждённых current-scope дефектах вернуть один bounded пакет Лёве. Лёва после author gate **STOP**, F5 самостоятельно не начинает.

## Границы

- F5 live structure forms/shared Move control/QuickActions/POST dispatch/editor lifetime/Owner History projection и F6 final assembly не активированы.
- Новые private endpoints пока read-only resources; новые mutable controls отсутствуют. Existing acceptance regressions не выдаются за F6 whole-feature browser acceptance новых форм.
- Не merge #379/#380/#381/#382 отдельно. Если accepted dependency или implementation head изменится, checkpoint относится к новому stable exact head.
- Лёва участвует в implementation; final independent whole-feature Codex reviewer — **Марк**, если остаётся code-independent.
- #342 — единственный service channel; никогда не merge.
- #300/Stage6/general UI/UX/deploy не активированы. После F7/docs — установленный переход к #320.

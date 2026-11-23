# WORKFLOW.md — текущее оперативное состояние #342

## Активный этап

**Task 6 — F4-01 correction author gate PASS → Мира: F4 re-check.**

- Current main baseline: `a3dae5815e26d158c566a27c552127b4b1ab29aa`.
- Канонический plan: [stages/forum-structure/PLAN.md](stages/forum-structure/PLAN.md), stacked F1→F6, затем F7 docs.
- F1 #379 accepted `8227db6003f5a23a369e11b645194da229315f7a`.
- F2 #380 accepted `11a2808f14a79efd69dbbb120f5b732bf2880d4f`.
- F3 #381 accepted `ecc15de9d7036bac13f4ecafcb6fc0776ce7ea78`.
- F4 Draft [#382](https://github.com/iliya1947/vico-forum/pull/382), branch `feat/forum-structure-f4`, **corrected stable exact `18627a8c53a6db681a7f4f278b88fcdd55f579c1`**.
- F4 base = `feat/forum-structure-f3`, accepted exact F3 не изменился. Все ступени Draft/unmerged.

## Следующая — Мира: повторный bounded F4 checkpoint

На прежнем head `86aadfe49dfe175b7f42baeaa6fa78883631ebeb` Мира поставила HOLD по одному blocker **F4-01: mandatory structure singleton invariant**.

Лёва выполнил только этот correction:
- move context и Admin structureVersion projections возвращают independent version/nullable target envelope в одном SQL snapshot;
- missing mandatory singleton → StructureInvariantError до target-not-found/DTO success, включая absent roots и empty list;
- 14 новых PG regressions + invariant propagation route checks; normal admission/hidden neutral404 сохранены;
- дополнительных queries/locks/grants/migrations/default/fallback version нет.

Author gate на новом exact head PASS:
- [CI45264492368](https://github.com/iliya1947/vico-forum/actions/runs/45264492368): **3072 unit /1829 PostgreSQL**, lint/typecheck/build/UI-preview/schema/runtime/credential checks и built Worker HTTP smokes.
- Все17 применимых acceptance workflows PASS на том же corrected head.
- Полный актуальный author report: [F4_REPORT.md](stages/forum-structure/F4_REPORT.md), correction F4-01 и exact-head evidence.

**Мира:** повторно проверить bounded F4 whole diff на новом stable exact head, включая F4-01. Предыдущий coordinator HOLD не заменяется автором на coordinator PASS. При подтверждённых current-scope дефектах вернуть bounded пакет; после PASS отдельно определить F5.

**Лёва STOP** после author gate; F5 самостоятельно не начинает.

## Границы

- F5 live forms/Move control/QuickActions/POST dispatch/editor lifetime/Owner projection и F6 final assembly не активированы.
- Новые F4 endpoints пока read-only resources.
- Не merge #379/#380/#381/#382 отдельно; #342 никогда не merge.
- Лёва автор реализации; final independent whole-feature Codex reviewer — Марк, если code-independent.
- #342 единственный service channel; #300/Stage6/general UI/UX/deploy не активированы.

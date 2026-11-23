# WORKFLOW.md — текущее оперативное состояние #342

## Активный этап

**Task 6 — forum structure/topic move: F2 author self-check + exact-head checks PASS. Следующая Мира — bounded F2 coordinator checkpoint.**

- Current main: `a3dae5815e26d158c566a27c552127b4b1ab29aa`.
- Канонический plan: [stages/forum-structure/PLAN.md](stages/forum-structure/PLAN.md), S0–S10 / F1–F7.
- Delivery: stacked F1→F6, затем отдельный F7 docs.
- F1 Draft #379 / `feat/forum-structure-f1`: accepted exact head `8227db6003f5a23a369e11b645194da229315f7a`; Mira bounded coordinator PASS, Draft/unmerged.
- F2 Draft [#380](https://github.com/iliya1947/vico-forum/pull/380), branch `feat/forum-structure-f2`, **base = `feat/forum-structure-f1`**, stable exact head **`11a2808f14a79efd69dbbb120f5b732bf2880d4f`**. Четыре файла bounded diff; F1 dependency не менялся.
- Авторский scope/implementation/test evidence: [stages/forum-structure/F2_REPORT.md](stages/forum-structure/F2_REPORT.md).

## F2 author gate — PASS

Лёва реализовал только authoritative ordinary category/section create/rename/reorder/reparent и atomic structural History из S8 PLAN. Global CAS/mutex, precise permission/active/AP-10/Owner guards, current no-op/overflow, real PG row-lock races и web-role commands подтверждены в отчёте. Live forms/routes/readers, topic move и Owner projection не подключались.

На stable exact head:
- [CI45235340129](https://github.com/iliya1947/vico-forum/actions/runs/45235340129) PASS: 3010 unit / 1743 PostgreSQL tests, lint/typecheck, build/UI-preview build, metadata/schema parity, manifest/runtime/provisioning/credentials/Worker smoke.
- Все 4 applicable acceptance workflows по штатным path-фильтрам PASS.
- Все CI jobs прошли с первой попытки, head не менялся.

## Следующая работа — Мира: bounded F2 coordinator checkpoint

Проверить scope F2 и его взаимодействие с accepted F1 на указанном exact head #380 по PLAN/F2_REPORT. Это промежуточный stacked checkpoint; независимый Codex-review и merge в main здесь не выполняются.

Лёва **STOP**. Только после Mira PASS — отдельное назначение следующего F3 поверх accepted F2 head. F3+ не начинались.

## Вне текущего gate

- F3: topic move / hidden admission / receipt reconciliation.
- F4: coherent readers/private move context/picker/routes.
- F5: shared forms/UI/Owner projection.
- F6: final assembly/whole-feature review.
- F7: отдельные docs после фактического implementation merge.

## Reviewer route и границы

Лёва участвует в implementation Task 6; final independent whole-feature Codex reviewer — **Марк**, если остаётся code-independent.

- #342 — единственный service channel; никогда не merge.
- #379/#380 остаются Draft/unmerged; не merge промежуточные F1/F2.
- #300, Stage6, deploy и general UI/UX не активированы.
- После F7/docs closeout — установленный переход к #320.

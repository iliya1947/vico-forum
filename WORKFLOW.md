# WORKFLOW.md — текущее оперативное состояние #342

## Активный этап

**Task 6 — forum structure/topic move: F3 author self-check + exact-head checks PASS. Следующая Мира — bounded F3 coordinator checkpoint.**

- Current main: `a3dae5815e26d158c566a27c552127b4b1ab29aa`.
- Канонический plan: [stages/forum-structure/PLAN.md](stages/forum-structure/PLAN.md), S0–S10 / F1–F7.
- Delivery: stacked F1→F6, затем отдельный F7 docs.
- F1 Draft #379 / `feat/forum-structure-f1`: accepted exact `8227db6003f5a23a369e11b645194da229315f7a`, Mira coordinator PASS, Draft/unmerged.
- F2 Draft #380 / `feat/forum-structure-f2`: accepted exact `11a2808f14a79efd69dbbb120f5b732bf2880d4f`, Mira coordinator PASS, Draft/unmerged; dependency не менялся.
- F3 stacked Draft [#381](https://github.com/iliya1947/vico-forum/pull/381), branch `feat/forum-structure-f3`, **base = `feat/forum-structure-f2`**, stable exact head **`ecc15de9d7036bac13f4ecafcb6fc0776ce7ea78`**.
- Авторский scope/implementation/test evidence: [stages/forum-structure/F3_REPORT.md](stages/forum-structure/F3_REPORT.md).

## F3 author gate — PASS

Лёва реализовал только authoritative topic move, conditional dual hidden admission и original create-topic receipt location reconciliation по S8 PLAN. Move меняет только section/location version, сохраняет глобальный structure version и остальные состояния, пишет neutral atomic History. Receipt возвращает persisted section без смены fingerprint и без actor→topic/structure lock. Public/ordinary Admin hidden access не расширен; live wiring/readers/routes/UI/Owner projection не подключались.

На stable exact head:
- [CI45252637056](https://github.com/iliya1947/vico-forum/actions/runs/45252637056) PASS: 3014 unit / 1791 PostgreSQL tests, lint/typecheck, build/UI-preview build, metadata/schema parity, manifest/runtime/provisioning/credentials/Worker smoke.
- Все 10 applicable acceptance workflows по штатным path-фильтрам PASS.
- Все CI jobs прошли с первой попытки; head/F2 dependency не менялись.

## Следующая работа — Мира: bounded F3 coordinator checkpoint

Проверить scope F3 и его взаимодействие с accepted F1/F2 на указанном exact head #381 по PLAN/F3_REPORT. Это промежуточный stacked checkpoint; независимый Codex-review и merge в main здесь не выполняются.

Лёва **STOP**. Только после Mira PASS — отдельное назначение F4 поверх accepted F3 head. Если accepted F2 dependency изменится, сначала синхронизировать stack/gate.

## Вне текущего gate

- F4: coherent readers/order/private move context/picker/routes/Hyperdrive wiring.
- F5: live forms/QuickActions/UI/Owner projection.
- F6: final assembly/whole-feature review.
- F7: отдельные docs после фактического implementation merge.

## Reviewer route и границы

Лёва участвует в implementation Task 6; final independent whole-feature Codex reviewer — **Марк**, если остаётся code-independent.

- #342 — единственный service channel; никогда не merge.
- #379/#380/#381 остаются Draft/unmerged; не merge промежуточные stages.
- #300, Stage6, deploy и general UI/UX не активированы.
- После F7/docs closeout — установленный переход к #320.

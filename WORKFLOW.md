# WORKFLOW.md — текущее оперативное состояние #342

## Активный этап

**Task 6 — F1/F2/F3/F4/F5 coordinator PASS; F6 handoff → Лёва.**

- Current main: `a3dae5815e26d158c566a27c552127b4b1ab29aa`.
- Канонический plan: [stages/forum-structure/PLAN.md](stages/forum-structure/PLAN.md), stacked F1→F6, затем F7 docs.
- F1 #379 accepted exact `8227db6003f5a23a369e11b645194da229315f7a`.
- F2 #380 accepted exact `11a2808f14a79efd69dbbb120f5b732bf2880d4f`.
- F3 #381 accepted exact `ecc15de9d7036bac13f4ecafcb6fc0776ce7ea78`.
- F4 #382 accepted exact `18627a8c53a6db681a7f4f278b88fcdd55f579c1`.
- **F5 #383 accepted exact `b5efc4d4ea0db1563b5036057518f3ec2b54e656`**, base accepted F4, Draft/unmerged.

## F5 — MIRA COORDINATOR PASS

Bounded whole-F5 checkpoint выполнен по diff F4→F5 и каноническому PLAN S5/S7/S7.1/S8.

Подтверждено:
- Admin category/section mutations используют accepted F2 authoritative writers, точный `forum.structure.manage`, strict route-specific POST contracts и private/no-store;
- canonical topic Move branch стоит до publication/visibility fallthrough, использует accepted F3 writer и не раскрывает hidden source;
- shared visible/Admin/direct/hidden Move UI использует F4 source-free context/picker, stale/late actor/read isolation и explicit refresh без automatic POST replay;
- Move revalidation сохраняет mounted title/reply/post Editor state, undo и in-flight attachment UI;
- EN/RU/HE, RTL/narrow/keyboard acceptance выполнены;
- Owner `forum.structure` History проецирует восемь original `admin_history` kinds с той же source identity, bounded truthful before/after и без shadow journal/hidden content.

Evidence:
- exact F5 head `b5efc4d4ea0db1563b5036057518f3ec2b54e656`;
- CI `45302582719`: checks + database SUCCESS на exact head;
- scoped connected Chromium `45301253066`: SUCCESS на implementation-identical `4026f300dbc3a29c5d59dc67102f8758e09f69b6`; после него два commits изменили только test files (explicit Node builtin imports в browser PG fixture и unit-test race stabilization), production/CSS не менялись;
- #383 остаётся Draft/unmerged; base accepted F4 unchanged; open review findings отсутствуют.

**Итог:** подтверждённых current-F5 blockers не осталось. F5 coordinator checkpoint **PASS**.

## Следующий этап — F6 → Лёва

Owner заранее назначил Лёву на F6 после F5 PASS.

Scope: **только F6** из PLAN — whole-feature S9 acceptance + final stacked assembly поверх accepted F5 exact.

Required result:
- закрыть полную применимую S9/post-visibility matrix реальными PG/Worker/Better Auth/Chromium/R2 seams там, где PLAN это требует;
- собрать stacked F1–F6 по текущему AGENTS: final feature head перенести в первый implementation PR, intermediate PRs закрыть как superseded только в установленной точке;
- получить stable final exact head, выполнить author self-check и применимые exact-head checks;
- после этого **STOP → Мира whole-feature coordinator review**.

Лёва не проводит independent review собственной реализации/assembly. После Mira whole-feature PASS независимый final Codex reviewer — **Марк**, если остаётся code-independent. Owner выполняет merge.

## Границы

- До F6 final assembly не merge #379/#380/#381/#382/#383 отдельно.
- F7 docs не активирован до owner merge реализации.
- #342 — единственный service channel и никогда не merge.
- #300/Stage6/general UI/UX/deploy не активированы.
- После F7/docs closeout — переход к #320.

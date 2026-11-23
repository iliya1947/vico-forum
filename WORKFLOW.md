# WORKFLOW.md — текущее оперативное состояние #342

## Активный этап

**Task 6 — F1/F2/F3/F4 coordinator PASS; F5 ACTIVE → Лира.**

- Current main: `a3dae5815e26d158c566a27c552127b4b1ab29aa`.
- Канонический plan: [stages/forum-structure/PLAN.md](stages/forum-structure/PLAN.md), stacked F1→F6, затем F7 docs.
- F1 #379 accepted exact `8227db6003f5a23a369e11b645194da229315f7a`.
- F2 #380 accepted exact `11a2808f14a79efd69dbbb120f5b732bf2880d4f`.
- F3 #381 accepted exact `ecc15de9d7036bac13f4ecafcb6fc0776ce7ea78`.
- F4 #382 accepted exact `18627a8c53a6db681a7f4f278b88fcdd55f579c1`, Draft/unmerged.

## F5-А/Б/C1/C2 — внутренние checkpoints Лиры

- [Stacked Draft #383](https://github.com/iliya1947/vico-forum/pull/383) current exact **`ad875011a45444badf2e5834aa683774938f3b5f`**, base accepted F4 `18627a8c53a6db681a7f4f278b88fcdd55f579c1`, open/unmerged, cumulative 32 scoped files. Current main remains `a3dae5815e26d158c566a27c552127b4b1ab29aa`.
- F5-А/Б author PASS: protected localized Admin category/section forms, F2 authoritative writers and F4 picker; [CI #45279134897](https://github.com/iliya1947/vico-forum/actions/runs/45279134897) exact older B head SUCCESS.
- F5-C1 author PASS: canonical strictly guarded `moveTopic` POST before visibility/reply, request-local F3 writer and source-free typed responses; mixed-intent tests; [CI #45285379670](https://github.com/iliya1947/vico-forum/actions/runs/45285379670) exact C1 head SUCCESS.
- **F5-C2 author-check PASS:** shared `TopicMoveForm`/inline `TopicMoveControl` in ordinary public and Admin topic QuickActions, private direct `/:locale/admin/forum/topics/:topicId/move` view reusing unchanged F4 protected loader, and hidden-topic inspector link only with fresh visibility+move capabilities. Ordinary inline context and bounded section destination list load with separate `fetcher` (no topic navigation); form submits only canonical C1 `moveTopic` intent with current private context actor/source/structure/location versions and picked ordinary section. EN/RU/HE reviewed catalog, accessibility labels/keyboard search/paging and source-free private direct display. F5-C2 route/DOM tests verify move-only controls, typed fields, no published source and hidden dual-grant link.
- [Exact-head CI #45287699019](https://github.com/iliya1947/vico-forum/actions/runs/45287699019) **SUCCESS**: `checks` lint/typecheck/build and **3142/3142 unit tests (241 files)**; `database` PostgreSQL 17 + connected Worker smokes SUCCESS. Final head/draft/base/32 files and whitespace self-check verified. Initial C2 lint failure (JSX in `.ts` route, unused test import) corrected via `topic-move-direct.tsx`; do not transfer verdict from superseded head.
- **Лира STOP after F5-C2; whole F5 not yet PASS.** Next only after explicit `...`: **F5-C3** focused state/lifecycle verification and corrections: actor/topic/destination fetcher scope and late responses, real explicit fresh verification/retry after stale/unknown/no-op, private-denial handling, successful revalidation without losing active reply/title/post editor buffers/undo/uploads, and matched canonical links. No automatic POST replay; add targeted regressions and exact-head checks, then STOP.
- Subsequent F5-D: one original History fact per structural change in Owner `forum.structure` scoped/global/person/coverage; final F5 author gate → Mira coordinator. F6/merge/F7/#300/Stage6/deploy inactive.

## Текущее назначение — Лира: F5

Реализовать **только F5 — shared forms/QuickActions/editor lifetime + Owner structural History projection** из S7/S7.1/S8 PLAN поверх accepted F4.

Требуемый результат:
- Admin category/section forms для create/rename/reorder/reparent используют уже принятые authoritative writers и current structure expectations;
- один shared topic Move control/form обслуживает public/Admin visible entry и private direct/hidden-inspector entry через F4 move-context/destination picker;
- canonical mutation dispatch остаётся строгим: session/origin/method/intent/field allowlist, без fallthrough в reply/create/visibility и без client authority;
- stale/conflict/unknown transport требуют fresh verification и явного retry, без optimistic mutation/automatic POST replay;
- move/reparent revalidation не размонтирует соседние reply/title/post editors и не теряет text/undo/uploads;
- EN/RU/HE, RTL/narrow/accessibility применяются в пределах F5;
- original structural Admin History подключается к существующей Owner `forum.structure` projection/scoped/global/person filters/coverage без shadow journal и без дублирования events.

Author gate — F5 Done из PLAN:
- реальные form/handler success + negative paths;
- mixed-intent не публикует reply;
- hidden controls/source не leaked;
- editor state сохраняется при move/reparent revalidation;
- stale/late actor/target responses не переиспользуются;
- Owner показывает один original structural event с truthful before/after.

Delivery:
- отдельный stacked Draft implementation PR с **base = `feat/forum-structure-f4` exact `18627a8c53a6db681a7f4f278b88fcdd55f579c1`**;
- только bounded F5 diff;
- после author self-check + применимых exact-head checks Лира **STOP → Мира bounded F5 coordinator checkpoint**.

## Границы

- F6 final assembly/whole-feature acceptance/review не активирован.
- Не merge #379/#380/#381/#382/F5 отдельно.
- Если accepted F4 head изменится, сначала синхронизировать dependency.
- Лёва участвовал в implementation предыдущих ступеней; final independent whole-feature Codex reviewer — **Марк**, если остаётся code-independent.
- #342 — единственный service channel; никогда не merge.
- #300/Stage6/general UI/UX/deploy не активированы.
- После F7/docs closeout — переход к #320.

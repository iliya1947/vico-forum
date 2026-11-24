# WORKFLOW.md — текущее оперативное состояние #342

## Активный этап

**Task 6 — F1/F2/F3/F4 coordinator PASS; F5 ACTIVE → Лира.**

- Current main: `a3dae5815e26d158c566a27c552127b4b1ab29aa`.
- Канонический plan: [stages/forum-structure/PLAN.md](stages/forum-structure/PLAN.md), stacked F1→F6, затем F7 docs.
- F1 #379 accepted exact `8227db6003f5a23a369e11b645194da229315f7a`.
- F2 #380 accepted exact `11a2808f14a79efd69dbbb120f5b732bf2880d4f`.
- F3 #381 accepted exact `ecc15de9d7036bac13f4ecafcb6fc0776ce7ea78`.
- F4 #382 accepted exact `18627a8c53a6db681a7f4f278b88fcdd55f579c1`, Draft/unmerged.

## F5 — внутренние author-checkpoints, Лира

- [Stacked Draft #383](https://github.com/iliya1947/vico-forum/pull/383), base accepted F4 `18627a8c53a6db681a7f4f278b88fcdd55f579c1`, latest exact **`26c11a244f264d15556429e6aacfab377812dad4`**, open/unmerged, cumulative 44 bounded files. `main` `a3dae5815e26d158c566a27c552127b4b1ab29aa` unchanged.
- F5-А/Б/C1/C2/C3 author-check PASS on earlier exact heads: protected Admin structure forms, canonical topic Move dispatch, shared visible/direct/hidden UI, private fetcher lifetime and editor DOM/drafts retained through Move revalidation. C3 CI [#45291105902](https://github.com/iliya1947/vico-forum/actions/runs/45291105902) SUCCESS (3148 tests).
- **F5-D author-check PASS** on latest exact head: existing eight F2/F3 structural `admin_history` actions projected into Owner `forum.structure` as original `admin-history` source with identical event ID/time. Updated closed kind/scope filters, global/scoped/person readers, earliest actual retained coverage, explicit bounded before/after fields and EN/RU/HE labels. No `owner_events` duplicates, schema/migrations, new writer, synthetic backfill or topic title/author/revision payload. The original topic author is **not** inferred as acting on a Move; personal History uses proven actor/target identity. Actual F2/F3 writer integration test verifies all 8 actions, no-op, one unique source event each, before/after, kind/scoped/global/person filters, start-of-coverage and source privacy.
- [Exact-head CI #45294588054](https://github.com/iliya1947/vico-forum/actions/runs/45294588054) **SUCCESS**: `checks` lint/typecheck/build + **3151/3151 unit tests (242 files)**; `database` PostgreSQL 17 and Worker/Better Auth smoke SUCCESS. F5-D diff vs C3: 11 scoped files, no whitespace issues. Superseded first D run had one unused test variable in lint, fixed; its database already passed. Final 3-language rendering/closed filters passed. Real connected Chromium/attachment-in-flight/RTL narrow acceptance is **not claimed** from these tests.
- **Лира STOP after F5-D; full F5 author gate is NOT finished and Mira F5 checkpoint NOT started.** Next only after developer `...`: bounded **F5 final author acceptance** of actual controls/handler flow and editor/undo/attachment state, RU/HE narrow/keyboard, connected Chromium/Worker tests permitted by S8; fix only proven F5 defects, exact-head self-check/CI, then STOP for **Мира F5 coordinator checkpoint**.
- **Owner route:** only on Mira whole F5 PASS activate F6 for **Лёва**; F6 is currently inactive. Final independent Codex whole-feature reviewer **Марк** if code-independent because Лёва assisted earlier stages. F6, merge, F7/docs, #300, Stage6/deployment inactive.

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

# WORKFLOW.md — текущее оперативное состояние #342

## Активный этап

**Task 6 — F1/F2/F3/F4 coordinator PASS; F5 ACTIVE → Лира.**

- Current main: `a3dae5815e26d158c566a27c552127b4b1ab29aa`.
- Канонический plan: [stages/forum-structure/PLAN.md](stages/forum-structure/PLAN.md), stacked F1→F6, затем F7 docs.
- F1 #379 accepted exact `8227db6003f5a23a369e11b645194da229315f7a`.
- F2 #380 accepted exact `11a2808f14a79efd69dbbb120f5b732bf2880d4f`.
- F3 #381 accepted exact `ecc15de9d7036bac13f4ecafcb6fc0776ce7ea78`.
- F4 #382 accepted exact `18627a8c53a6db681a7f4f278b88fcdd55f579c1`, Draft/unmerged.

## F5-А/Б/C1/C2/C3 — внутренние author-checkpoints Лиры

- [Draft stacked #383](https://github.com/iliya1947/vico-forum/pull/383) latest **`f629b421d7b1b2caed4bc0d525a43eaca5b4837a`**, base accepted F4 `18627a8c53a6db681a7f4f278b88fcdd55f579c1`, open/unmerged; cumulative **36 bounded files**. `main` remains `a3dae5815e26d158c566a27c552127b4b1ab29aa`.
- F5-А/Б author PASS: protected, localized Admin category/section create/rename/reorder/reparent forms, F2 writers/F4 picker; earlier [CI #45279134897](https://github.com/iliya1947/vico-forum/actions/runs/45279134897) SUCCESS on prior exact B head.
- F5-C1 author PASS: protected canonical topic `moveTopic` dispatch before reply/visibility, request-local accepted F3 writer and source-free typed response; earlier [CI #45285379670](https://github.com/iliya1947/vico-forum/actions/runs/45285379670) SUCCESS on prior C1 head.
- F5-C2 author PASS: shared visible inline/Admin Move and protected direct/hidden inspector entry, F4 context/picker, EN/RU/HE; earlier [CI #45287699019](https://github.com/iliya1947/vico-forum/actions/runs/45287699019) SUCCESS on prior C2 head.
- **F5-C3 author-check PASS:** eight scoped files compared with previous C2 head `ad875011…` (no migrations or F3 writer changes). For inline F4 protected Move context and destination reads, typed private no-store `data` errors (400/401/403/404/503) avoid replacing an open topic with ErrorBoundary; each GET carries a strictly bounded `readId` echoed in reply, and late/cross-search responses are not trusted as fresh data. Move form checks current actor/topic/section/global/location/target in confirmed receipt, keeps selected target and mounted component across explicit refresh (suspends POST until current private read), clears private context after denial, and never auto-replays a stale/unknown POST. Matching committed success explicitly revalidates public topic to update canonical breadcrumbs without navigating away. Private direct component has actor-snapshot lifetime; old data not re-trusted by returning actor. Tests cover 403/503, readId mismatch, 409 with deliberate refreshed GET/retry, real mounted TopicView title/reply/post drafts and same Editor 2.0 DOM nodes through Move revalidation, updated section link. **No connected Chromium/actual in-flight attachment upload acceptance claimed at this microcheckpoint**; reserve browser/attachment/RTL acceptance for final F5 gate per S8.
- [Exact-head CI #45291105902](https://github.com/iliya1947/vico-forum/actions/runs/45291105902) **SUCCESS**: `checks` lint/TypeScript/build and **3148/3148 unit tests in 242 files**, `database` PostgreSQL 17 and Worker HTTP smoke SUCCESS. Superseded C3 head had two failing newly introduced tests (form unmounted during refresh, link checked before revalidation), both corrected on final exact SHA.
- **Лира STOP after F5-C3. Whole F5 not yet author PASS; Mira coordinator checkpoint not activated.** Next only after developer `...`: **F5-D Owner original `forum.structure` History projection** from S5/S7/S8 plan: existing admin_history producer only, eight structural action kinds, before/after original source, global/scoped/kind/person filters/coverage and regressions. Split D into bounded internal slices only if necessary, STOP after each. Then final F5 author acceptance including connected Chromium/editor/upload checks → Mira bounded F5 coordinator.
- F6, merge, F7/docs, #300, Stage6/deploy inactive.

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

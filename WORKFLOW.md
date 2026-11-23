# WORKFLOW.md — текущее оперативное состояние #342

## Активный этап

**Task 6 — F1/F2/F3/F4 coordinator PASS; F5 ACTIVE → Лира.**

- Current main: `a3dae5815e26d158c566a27c552127b4b1ab29aa`.
- Канонический plan: [stages/forum-structure/PLAN.md](stages/forum-structure/PLAN.md), stacked F1→F6, затем F7 docs.
- F1 #379 accepted exact `8227db6003f5a23a369e11b645194da229315f7a`.
- F2 #380 accepted exact `11a2808f14a79efd69dbbb120f5b732bf2880d4f`.
- F3 #381 accepted exact `ecc15de9d7036bac13f4ecafcb6fc0776ce7ea78`.
- F4 #382 accepted exact `18627a8c53a6db681a7f4f278b88fcdd55f579c1`, Draft/unmerged.

## F5-А/Б/C1 — внутренние checkpoints Лиры

- [Draft stacked #383](https://github.com/iliya1947/vico-forum/pull/383), base accepted F4 `18627a8c53a6db681a7f4f278b88fcdd55f579c1`, **latest exact `da92d53f97aa87d1f1fd152557831c4008b21f11`**, open/unmerged, cumulatively 20 bounded changed files. `main` untouched.
- F5-А author PASS: category creation action/form on F2 structure writer, strict session/origin/permission/fields/CAS, EN/RU/HE; earlier CI #45274600503 SUCCESS.
- F5-Б author PASS: category rename/reorder/create-section, section rename/reorder/reparent, protected F4 destination picker, EN/RU/HE, route/DOM tests; earlier exact CI #45279134897 SUCCESS.
- **F5-C1 author-check PASS:** canonical `topicAction` intercepts any `moveTopic` intent or move-only fields **before visibility/ordinary reply dispatch**, with exact POST/Origin/session/permission, actor expectation, field cardinality/File/unknown/duplicate refusal, bounded legacy-compatible IDs and canonical bigint CAS. Request-local `TopicMoveWriter` uses accepted F3 `PostgresTopicMoveWriter` and effective authorization, including hidden dual authority under topic lock; no duplicate transaction/History/public reader. Typed source-free no-store success/errors, no automatic redirect into hidden topic. URL `moveAction=1` marks protected preflight (not authority); existing Bookmark/Visibility typed non-POST responses preserved. Route tests cover no mixed-intent publication, bad/changed actor, hidden 404, late authorization and storage failures, no-leak, legacy inputs and no mutation when invalid.
- [Exact-head CI #45285379670](https://github.com/iliya1947/vico-forum/actions/runs/45285379670) **SUCCESS**: `checks` lint/typecheck/build + **3137/3137 unit tests (240/240 files)**; `database` PG17 migrations/integration and Worker smoke SUCCESS. Earlier C1 heads failed on tsconfig entry/test-table and method-response regressions, now resolved; never transfer old failures or old PASS to the final exact SHA. PR code diff checked against bounded scope; no schema/migration changes.
- **Лира STOP after F5-C1.** Full F5 is **not** author PASS and Mira coordinator checkpoint not started. Next only after developer `...`: **F5-C2 shared topic Move control/form for public/Admin inline and private direct/inspector entry** using F4 context/picker and canonical C1 action; scoped actor/topic bindings, accessible EN/RU/HE, no duplicate move writers. Stop after bounded C2; later C3 editor lifetime + stale/unknown/revalidation/late response, F5-D Owner original History projection, full F5 author gate then Mira coordinator.
- F6, merge, F7, #300, Stage6, deployment remain inactive.

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

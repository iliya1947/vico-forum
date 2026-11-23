# WORKFLOW.md — текущее оперативное состояние #342

## Активный этап

**Task 6 — F1/F2/F3/F4 coordinator PASS; F5 ACTIVE → Лира.**

- Current main: `a3dae5815e26d158c566a27c552127b4b1ab29aa`.
- Канонический plan: [stages/forum-structure/PLAN.md](stages/forum-structure/PLAN.md), stacked F1→F6, затем F7 docs.
- F1 #379 accepted exact `8227db6003f5a23a369e11b645194da229315f7a`.
- F2 #380 accepted exact `11a2808f14a79efd69dbbb120f5b732bf2880d4f`.
- F3 #381 accepted exact `ecc15de9d7036bac13f4ecafcb6fc0776ce7ea78`.
- F4 #382 accepted exact `18627a8c53a6db681a7f4f278b88fcdd55f579c1`, Draft/unmerged.

## F5-А — внутренний microcheckpoint Лиры

- [Draft PR #383](https://github.com/iliya1947/vico-forum/pull/383) открыт в stacked-ветке `feat/forum-structure-f5` от принятого F4 `18627a8c53a6db681a7f4f278b88fcdd55f579c1`; exact head `6d526f8520e78450b995be4561f996b09d11f610`, **не merged**, diff 11 файлов только F5-А.
- End-to-end create-category Admin index: exact permission/session/Origin/field allowlist, valid actor/CAS/name, request-scoped existing F2 writer через WEB_HYPERDRIVE, private/no-store typed responses, EN/RU/HE inline form и targeted route/DOM regressions. No schema/migration/F4 reader change.
- [CI #45274600503](https://github.com/iliya1947/vico-forum/actions/runs/45274600503) exact head: `checks` SUCCESS, `database` SUCCESS; lint/TypeScript/unit/build и PostgreSQL/Worker checks завершены. Девять новых manual translation fingerprints отдельно сверены с canonical English descriptors: 9/9.
- **Лира STOP после F5-А.** Это **не** весь F5 и не Mira coordinator checkpoint. Следующий внутренний шаг после явного продолжения — F5-Б: остальные Admin category/section forms (rename/reorder/reparent/create section) с регрессиями; затем отдельно shared Move/action/editor lifetime и Owner projection, после завершения всего F5 — применимые проверки и Mira coordinator.
- F6, merge и docs не активированы.

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

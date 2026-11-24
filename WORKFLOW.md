# WORKFLOW.md — текущее оперативное состояние #342

## Активный этап

**Task 6 — F1/F2/F3/F4 coordinator PASS; F5 AUTHOR PASS → Мира (bounded coordinator checkpoint).**

- Current main: `a3dae5815e26d158c566a27c552127b4b1ab29aa`.
- Канонический plan: [stages/forum-structure/PLAN.md](stages/forum-structure/PLAN.md), stacked F1→F6, затем F7 docs.
- F1 #379 accepted exact `8227db6003f5a23a369e11b645194da229315f7a`.
- F2 #380 accepted exact `11a2808f14a79efd69dbbb120f5b732bf2880d4f`.
- F3 #381 accepted exact `ecc15de9d7036bac13f4ecafcb6fc0776ce7ea78`.
- F4 #382 accepted exact `18627a8c53a6db681a7f4f278b88fcdd55f579c1`, Draft/unmerged.

## F5 — итоговая авторская проверка Лиры: PASS

- **Implementation:** [stacked Draft PR #383](https://github.com/iliya1947/vico-forum/pull/383), exact **`b5efc4d4ea0db1563b5036057518f3ec2b54e656`**, base accepted F4 `18627a8c53a6db681a7f4f278b88fcdd55f579c1`; open Draft/unmerged. Bounded F5 diff: **48 files**, no migration/schema or unrelated feature. `main` `a3dae5815e26d158c566a27c552127b4b1ab29aa` unchanged.
- **Internal author-check A/B/C1/C2/C3/D: PASS.** Real guarded Admin category/section forms create/rename/reorder/reparent via accepted F2 writers; strict canonical `moveTopic` before reply/visibility, F3 writer/neutral typed no-store receipts and hidden permission; shared inline/Admin/direct/hidden Move via F4 context/picker and actor/readId/target checks; explicit refresh after `409/503` (no automatic POST), stable title/reply/post Editor 2.0 DOM/drafts/undo/attachment upload lifecycle; original eight-kind `admin_history` Owner `forum.structure` global/scoped/kind/person/coverage/EN-RU-HE before/after projection without duplicated source.
- **Final connected F5 author acceptance:** [Chromium/PG17/real Worker+Better Auth run #45301253066](https://github.com/iliya1947/vico-forum/actions/runs/45301253066) **SUCCESS** on implementation head `4026f300dbc3a29c5d59dc67102f8758e09f69b6`, with seven groups:
  1. Browser form create/rename/reorder categories and create/rename/reorder/reparent sections, persisted and original History.
  2. Guest/wrong-Origin/mixed reply-intent rejected, no publication; wrong Origin gets generic neutral pre-router HTTP 400, not an application source response.
  3. Real topic Move through canonical POST 200, revalidated breadcrumbs and unchanged mounted title/reply/post editor DOM, text/undo, **pending browser attachment XHR** retained without replay; intercepted transport completed with controlled 503 after Move. This is **not** a real R2 upload acceptance claim.
  4. EN/RU/HE 320/390 px pages, RTL, keyboard-opened Move, zero horizontal overflow after bounded F5 CSS correction.
  5. Two real tabs: stale `409`, one original move fact, no automatic replay.
  6. Exact synthetic Owner `forum.structure` original `admin_history.id` before/after, no topic title/body leak.
  7. No browser JavaScript errors or external HTTP.
- **Final exact-head CI:** [#45302582719](https://github.com/iliya1947/vico-forum/actions/runs/45302582719) **SUCCESS** on `b5efc4d4…`: `checks` lint/TypeScript/build + **3151/3151 unit tests in 242 files**, `database` PostgreSQL 17 + Worker smoke SUCCESS. Browser head→final head contains **only** tests: explicit Node imports in `pg.mjs`, deterministic wait for initial picker read in F5 unit test; zero implementation/CSS changes. Previous DB run failed once on a non-F5 Bookmarks unhandled rejection; this did not reproduce on final exact head, and Bookmarks was not modified. Previous new F5 picker-test race corrected in test only. Final author self-check: 48 scoped files, 0 migration, no trailing whitespace, no current F5 blocking findings.
- **Лира STOP; F5 implementation author PASS is NOT Mira coordinator PASS.** No merge or F6. Only after Mira coordinator **PASS** may owner-allocated **F6 → Лёва** begin. Final independent whole-feature reviewer **Марк** if code-independent because Лёва helped implementation of earlier stacked stages.

## Текущее назначение — Мира: F5 bounded coordinator checkpoint

На stable exact head **`b5efc4d4ea0db1563b5036057518f3ec2b54e656`** проверить весь bounded F5 diff [#383](https://github.com/iliya1947/vico-forum/pull/383) относительно принятого F4 `18627a8c53a6db681a7f4f278b88fcdd55f579c1` по `stages/forum-structure/PLAN.md` S5/S7/S7.1/S8. Включить actor/permission/hidden-source privacy, mixed-intent rejection, Admin forms/Move state and retries, editor/attachment retention, EN/RU/HE RTL/narrow, original Owner History source+coverage and the fresh CI/Chromium evidence above. Проверять подтверждённые текущие F5 defects, не future Stage; согласовать corrections только в границах F5.

Зафиксировать **PASS или конкретные findings** в #342 на точный SHA. При findings вернуть Лире только их исправление; после PASS следующий предусмотренный этап — **F6 для Лёвы**, отдельно по решению владельца. Мира не выполняет merge и не начинает F6 сама. Final independent reviewer remains Mark if independent.

## Границы

- F6 final assembly/whole-feature acceptance/review не активирован.
- Не merge #379/#380/#381/#382/F5 отдельно.
- Если accepted F4 head изменится, сначала синхронизировать dependency.
- Лёва участвовал в implementation предыдущих ступеней; final independent whole-feature Codex reviewer — **Марк**, если остаётся code-independent.
- #342 — единственный service channel; никогда не merge.
- #300/Stage6/general UI/UX/deploy не активированы.
- После F7/docs closeout — переход к #320.

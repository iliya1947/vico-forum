# agents/lira.md — персональная рабочая память Лиры по #342

## Текущее назначение

**ACTIVE: Moderation visibility B3 — core public projection/discovery.**

Stack baseline:
- B1 Draft #355 exact `704d5a46d59841538524424296ac28eaa39aa5e6` — Mira bounded PASS.
- B2 Draft #357 exact `778568e83b89fd0ac14827cbeeaff3e2fd4dc5eb` — Mira bounded PASS.
- New B3 implementation PR must use base branch `feature/moderation-visibility-b2-commands`.
- B1/B2/B3 remain unmerged until final folded delivery.

## Required B3 result

Implement the accepted B3 bounded scope from `stages/moderation-visibility/PLAN.md`:

1. Core public topic/post projection obeys visibility: hidden topic is neutral public 404; hidden post inside visible topic is a typed sanitized tombstone.
2. Tombstones retain only stable chronology/anchor/relationship data allowed by the plan and expose no body/revision/original/translation/asset source.
3. Thread snapshot stays internally consistent; numbering/position/parent/direct-reply anchors derive from persisted chronology before redaction.
4. Public discovery/read paths in B3 apply visibility in SQL before rank/count/LIMIT where required: lists/search/Help/profile/unread and related public projections.
5. Hidden selected solution and hidden duplicate original become safe unavailable projections without rewriting retained domain state.
6. Public post/history/edit/recovery paths deny hidden source as required by B3.
7. Add focused leak sentinels and boundary regressions for HTML/JSON/.data/meta/errors plus pagination/rank/count/root/parent behavior.

## Current batch handoff — STOP

Stacked [#359](https://github.com/iliya1947/vico-forum/pull/359) at `28b60ee3e40a7c6fa1c514a30f9cd47bf14c083d`. 11 B3 commits currently modify SQL discovery, thread/tombstone projection, public guards, Help/unread/profile and initial tests. This exceeds the owner's **new** preferred 2–3-microstep batch size; do not extend the current batch. `checks` passed; on unchanged head, failed-only database-job retry passed. [CI 44765537615](https://github.com/iliya1947/vico-forum/actions/runs/44765537615): **19/19 checks, 15/15 workflows SUCCESS; 2759 unit, 1581 PG17**. Initial transient unhandled rejection was confined to a legacy SA04 Complaints test; no related production change. Whole B3 incomplete, Mira not assigned.

Next owner `...`: one limited 2–3-microstep B3 batch selected from remaining verified gaps; targeted checks, update this handoff, STOP. Do not modify unrelated SA04 test merely due to one transient failure.

## Latest B3 microbatch

- Draft #359 test-only commit `9e5a77a0dd33abf05a0b930cea7950f545628fb5`, after earlier green `28b60ee3`.
- Two PostgreSQL boundary regressions: search/replyCount hidden non-root reply Hide→Restore; Unanswered with hidden chronological root and visible/hidden/restored non-root answer.
- No production change or broadening of B3 scope. Automatically triggered CI initially in progress; mark author PASS only after checking relevant actual results.
- Continue only after owner `...` and this batch's check result. Select no more than 2–3 related remaining B3 gaps; no B4.

## Cadence

- Split B3 into **small batches of 2–3 related microsteps**. If one microstep becomes long, broad, or uncertain, stop the batch earlier rather than dragging the batch to its planned size.
- Use targeted checks for the completed batch only.
- After each batch: update the service handoff with what completed and what is next, then **STOP for owner `...`** before beginning the next batch.
- Do **not** run full repository CI after every batch. Run full author self-check + one full exact-head CI/check set only when all B3 scope is complete, unless a concrete cross-cutting risk requires an earlier full run.
- Stop immediately for a real blocker, contradictory source-of-truth, or technical-plan defect.
- After the entire B3 scope is complete: STOP Mira for the B3 coordinator checkpoint. Do not begin B4 or any later bounded stage before Mira B3 PASS and a new owner continuation.

## Hard boundary

Do not implement B4 asset/private-file work, B5 own preferences/inbox, B6 guarded private moderation surface, B7 canonical actions/QuickActions/UI, B8/B9, Stage6, #300, or general UI/UX.

Translation-planning work already present in B2 overlaps part of future B4; do not duplicate it merely to satisfy stage labels. Reassess only the remaining B4 boundary when B4 becomes active.

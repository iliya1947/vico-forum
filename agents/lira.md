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

- Active stacked Draft #359, exact `fd0993af7cdca1aa83e49713146010bb69039370` (B2 base unchanged). B3 incomplete; B1 #355/B2 #357 Draft/unmerged.
- Existing Search/Unanswered boundary regressions on `8e98af76`/`7324fd9c`, including `ForumSearchResult.postCount` visible root+reply 2→1→2 and search rank before LIMIT.
- Latest **two-microstep test-only** commit `fd0993af`: hidden selected Help best-answer tombstone, retained solved/selected state, hidden source and Profile/Help visible counts; Popular 24h/7d/30d visible activity ranking under limit 1 and Hide/Restore.
- Targeted source-contract assertions **11/11 pass**. Real PostgreSQL test execution **not verified** (no local checkout or test PG); never assert PG PASS from static checks.
- On next `...`: select at most 2–3 verified remaining B3 gaps (e.g. public response leakage/negative reads or remaining discovery boundaries), do available focused checks, update WORKFLOW and this file, STOP. **No GitHub Actions/CI inspection until all B3 is complete**, no B4, Mira or merge.

## Cadence

- Split B3 into **small batches of 2–3 related microsteps**. If one microstep becomes long, broad, or uncertain, stop the batch earlier rather than dragging the batch to its planned size.
- Use targeted checks for the completed batch only.
- **До полного завершения B3 не открывай и не проверяй GitHub Actions/CI вообще.** Автоматические PR workflows между микропакетами игнорируются полностью: не смотреть статус, не ждать, не поллить, не анализировать и не перезапускать их.
- After each batch: update the service handoff with what completed and what is next, then **STOP for owner `...`** before beginning the next batch.
- Do **not** run full repository CI after every batch. Run full author self-check + one full exact-head CI/check set only when all B3 scope is complete, unless a concrete cross-cutting risk requires an earlier full run.
- Stop immediately for a real blocker, contradictory source-of-truth, or technical-plan defect.
- After the entire B3 scope is complete: STOP Mira for the B3 coordinator checkpoint. Do not begin B4 or any later bounded stage before Mira B3 PASS and a new owner continuation.

## Hard boundary

Do not implement B4 asset/private-file work, B5 own preferences/inbox, B6 guarded private moderation surface, B7 canonical actions/QuickActions/UI, B8/B9, Stage6, #300, or general UI/UX.

Translation-planning work already present in B2 overlaps part of future B4; do not duplicate it merely to satisfy stage labels. Reassess only the remaining B4 boundary when B4 becomes active.

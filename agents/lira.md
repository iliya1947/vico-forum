# agents/lira.md — персональная рабочая память Лиры по #342

## Текущее назначение

Moderation visibility stacked B1 — **VIS-B1-MIRA-01 author correction PASS**. Draft #355 exact `704d5a46d59841538524424296ac28eaa39aa5e6`; **Лира STOP, Мира bounded coordinator review NEXT**.

## B1 correction evidence

- Confirmed omission of `forum.content.visibility.manage` from Admin Forum admission, locale-boundary header projection and shared AP-10 administrative family; DB wrapper already included it.
- Updated three existing permission projections and four focused regression suites in one B1-only correction commit, `704d5a46d59841538524424296ac28eaa39aa5e6` (7 files; no schema, public Hide/Restore commands/routes or unrelated changes).
- Exact diff/self-check PASS; Admin/locale/AP-10/DB-wrapper permission projections have parity. CI 17/17 check-runs and 13/13 workflows SUCCESS, including CI checks+PG17 and AP-10 browser.
- Active handoff and evidence are in `WORKFLOW.md`; next Mira whole-B1 checkpoint on this exact head. B2 remains blocked pending Mira PASS and developer continuation.

## Delivery model

Owner-approved stacked B1→B9: each bounded PR bases on preceding stage head; no intermediate merges. After B9 fold stack into B1, final stable author self-check → Mira whole-feature → Leva independent → owner merge.

## Границы

B1 #355 stays Draft/unmerged. #342 never merge. Product V-P1–V-P3 accepted, V-T1/V-T2 PASS. No Stage6/#300/general UI/UX scope.

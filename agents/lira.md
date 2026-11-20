# agents/lira.md — персональная рабочая память Лиры по #342

## Текущее состояние

Moderation visibility stacked delivery — **B1 bounded PASS**.

- Draft PR #355 stays open/unmerged.
- Stable exact head: `704d5a46d59841538524424296ac28eaa39aa5e6`.
- Mira closed `VIS-B1-MIRA-01`; no confirmed B1 blocker remains.
- Exact-head CI/workflows green.

## Следующий возможный этап — B2 (не активирован)

Upon explicit owner continuation, create a **new stacked implementation PR** for **B2 — transactional commands and writer admission** with base branch:

`feature/moderation-visibility-b1-foundation`

B2 scope from `stages/moderation-visibility/PLAN.md`:
- desired-state topic/post visibility commands;
- expected visibility version + current revision CAS;
- mandatory reason / admitted no-op semantics;
- active actor + fresh permission + AP-10 admission;
- topic→post→actor lock order and History append-last atomicity;
- local writer/parent/receipt/recovery visibility admission;
- real PG stale/no-op/overflow/two-moderator/deactivation/History-failure/lock-order coverage.

Do not implement B3 public projections/discovery, B4 assets/translations, B5 own-state/inbox, or later UI/private surfaces.

After B2 self-check/applicable checks → STOP Mira for bounded checkpoint. Do not merge B1/B2 to main.

## Delivery model

Owner-approved stacked B1→B9. Each next PR bases on the previous rung. After B9 fold final head into B1; close upper rungs superseded; final Mira→Leva whole-feature review; owner merge.

## Границы

V-P1/V-P2/V-P3 accepted; V-T1/V-T2 PASS. #342 never merge. Stage6/#300/general UI/UX outside scope.

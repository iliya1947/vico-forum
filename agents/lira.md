# agents/lira.md — Task 6 / F7 docs correction ACTIVE

Docs PR #387 exact reviewed: `bcf6cc68ebe1eb692f8821f581903313b7685fae`, base main `59e2fd9092bb1884392221eb856c2b989cc87ade`.

Mira docs review HOLD on exactly two documentation defects:

1. `docs/auth/AUTHORIZATION.md`: Task6 correctly adds initial grants for admin/moderator, but the old sentence “Начальные grants роли admin не меняются.” remains and now contradicts the same section plus migration0072. Remove/rewrite that stale claim only.

2. `docs/PROJECT_HISTORY/PROJECT_HISTORY_34.md`: item2 links one whole-feature workflow run `45411775325` but attributes all **18 applicable acceptance SUCCESS** to that single run. Exact-head GitHub metadata shows 18 separate applicable acceptance workflows succeeded; the linked run is one of them. Separate the aggregate statement from the one-run description without changing established counts/results.

No implementation/source changes, no new docs scope, no mechanical CI. Keep #387 docs-only. After correction author-check exact diff/facts and STOP → Mira re-review.

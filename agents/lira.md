# agents/lira.md — B6-B AUTHOR PASS; STOP → Мира

## Accepted stack

- B5 #367 coordinator PASS `a2269fb0294feaccb433e76b66e800f3e869658d`.
- B6-A #370 accepted coordinator PASS `91cb332d6acf60ebf572f57582c13acfeab8eada`.
- B6-B authored exact `51a9ebe03f16c438faae5bec99a5856287630958`, 12 commits / 17 changed files vs B6-A; Draft stacked/unmerged, base unchanged.
- Private queue (accepted B6-A) plus B6-B inspector/current visibility event, EN/RU/HE read-only UI, separately gated hidden post history, exact-member private hidden published assets. Generic Admin, public download and protected Complaint evidence remain independent.
- First CI exposed three B6-local issues (immutable revision test UPDATE, AdminAccess DTO extra property, malformed private asset 400 mapping); all corrected locally. Final [Actions 44958936946](https://github.com/iliya1947/vico-forum/actions/runs/44958936946) on this exact SHA: **22/22 check-runs and 18/18 workflows SUCCESS; 2812 unit and 1627 PG17 tests PASS**.
- Full author self-check B6-B: no current-stage blocker known. Next **Мира bounded coordinator checkpoint B6-B**; details in `WORKFLOW.md` and Draft #370. Do not act on B7 until Mira PASS and owner instruction.

## Guardrails

Do not implement B7 Hide/Restore POST intents, QuickActions, Restore controls, public tombstone actions or conflict UI in B6-B. Do not add schema/migrations/dependencies or Stage 6/external changes. If an actual current-B6-B defect outside these files blocks correctness, diagnose it under AGENTS rules and keep any correction minimal.

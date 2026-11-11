# Admin panel — current workflow

- Service PR: **#251**. Current main: `f6fd4b2c031b2132b04eace18704a59aed1dfec8`; PR #319 base `e279cb6c032a489a9044ca1191407df887c364b4` (AGENTS.md-only divergence).
- Current stage: **SA02 cumulative review correction cycle — 2 confirmed presentation defects assigned to Lira.**
- Implementation: Draft **PR #319**. Reviewed head `0a45909bfb3a403af63a4693455d519f8a0e9ea6` is superseded for final review once correction commits land.
- Mira coordinator review on `0a45909b...`: prior PASS. Lev independent review #6793653705: CHANGES REQUIRED.
- **SA02-IMPL-LEV-04 CONFIRMED:** source-agnostic History field labels misname attachment `total` and registration `version`.
- **SA02-IMPL-LEV-05 CONFIRMED:** generic digit-string numeric formatting mutates opaque IDs, including leading-zero refs.
- Both defects are local D3 presentation issues; backend/schema/producers/technical plan remain unchanged.
- Implementer: **Lira — assigned to fix LEV-04/-05 together in PR #319**, add focused regressions, run applicable checks, publish a new stable exact head, then STOP.
- Lev independent reviewer: completed/stopped until a new coordinator PASS. Mark unassigned.
- After Lira author STOP: **Mira fresh cumulative A/B/C/D whole-PR review → Lev independent review** of the same new stable head.
- No merge/docs closeout/SA03+/Stage6 #315 activation/production/deferred journal occupancy/archive/clear work is authorized.

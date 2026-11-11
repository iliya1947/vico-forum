# Admin panel — current workflow

- Service PR: **#251**. Current main: `f6fd4b2c031b2132b04eace18704a59aed1dfec8`; PR #319 base `e279cb6c032a489a9044ca1191407df887c364b4` (AGENTS.md-only divergence).
- Current stage: **SA02 correction LEV-04/-05 implemented in Draft PR #319; fresh exact-head CI/SA01/AP10 checks running — Lira implementer.**
- Implementation: Draft **PR #319** new correction head `3f217c98dd9dcbd51518eda82b51506fbede936c` (old reviewed head `0a45909bfb3a403af63a4693455d519f8a0e9ea6` superseded). New whole-PR review not yet begun.
- Mira coordinator review on `0a45909b...`: prior PASS. Lev independent review #6793653705: CHANGES REQUIRED.
- **SA02-IMPL-LEV-04 CONFIRMED:** source-agnostic History field labels misname attachment `total` and registration `version`.
- **SA02-IMPL-LEV-05 CONFIRMED:** generic digit-string numeric formatting mutates opaque IDs, including leading-zero refs.
- Both defects are local D3 presentation issues; backend/schema/producers/technical plan remain unchanged.
- Implementer: **Lira — correction code/regressions landed** (monitor-specific History labels; literal opaque IDs; EN/RU/HE global/scoped route tests). Typecheck and 181 app-file suite SUCCESS on preceding corrected head; original SA01 503-event waitUntil assertion was racy and updated to poll persisted evidence. Current exact `3f217c98dd9dcbd51518eda82b51506fbede936c` checks: CI #43009722614, SA01 Chromium #43009722439, AP10 Chromium #43009722575 **running/pending**. Finish checks then STOP; no reviewer PASS claimed.
- Lev independent reviewer: completed/stopped until a new coordinator PASS. Mark unassigned.
- After Lira author STOP: **Mira fresh cumulative A/B/C/D whole-PR review → Lev independent review** of the same new stable head.
- No merge/docs closeout/SA03+/Stage6 #315 activation/production/deferred journal occupancy/archive/clear work is authorized.

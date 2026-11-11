# Admin panel — current workflow

- Service PR: **#251**. Current main: `f6fd4b2c031b2132b04eace18704a59aed1dfec8`; PR #319 base `e279cb6c032a489a9044ca1191407df887c364b4` (AGENTS.md-only divergence).
- Current stage: **SA02 cumulative A/B/C/D coordinator review PASS on corrected stable head; awaiting Lev independent whole-PR review.**
- Implementation: Draft **PR #319**, stable exact head **`3f217c98dd9dcbd51518eda82b51506fbede936c`**.
- Previous reviewed head `0a45909b...`: Mira PASS → Lev CHANGES REQUIRED LEV-04/-05. Both findings are now **CLOSED** on the corrected head.
- Correction delta from old reviewed head: 4 commits / 3 files only — History renderer, History route presentation tests, and a bounded wait for asynchronous Worker 503 telemetry in the existing browser harness.
- **Mira fresh cumulative whole-PR review: PASS, 0 confirmed current-scope defects** on `3f217c98dd9dcbd51518eda82b51506fbede936c`.
- LEV-04 closed: monitor-aware labels preserve correct attachment/users and registration/database semantics in scoped/global History.
- LEV-05 closed: numeric formatting applies only to known counters; digit-only opaque refs preserve literal text/leading zeroes; large counters remain BigInt-safe.
- Exact-head verification: CI #43009722614 SUCCESS; SA01 connected Chromium #43009722439 SUCCESS; AP10 Chromium #43009722575 SUCCESS (4/4 jobs).
- Current #315 was rechecked at head `3199f07a17c16ae7f987cdd1a5e0424470085a1e`; its Owner-plane isolation/Stage6 work remains separate and does not expand SA02 current scope.
- Implementer: **Lira — completed/stopped**.
- Coordinator: **Mira — PASS/completed**.
- **Next reviewer: Lev — independent cumulative A/B/C/D whole-PR review of the same stable exact head `3f217c98dd9dcbd51518eda82b51506fbede936c`, no implementation.**
- Mark unassigned. No merge/docs closeout/SA03+/Stage6 #315 activation/production/deferred journal occupancy/archive/clear work is authorized.

# Admin panel — current workflow

- Service PR: **#251**. Current main: `538084fd472c65459ad55ab30a0f96fbfdd68e56`.
- Current stage: **SA-03 coordinator whole-PR review complete — CHANGES REQUIRED on implementation PR #324 exact head `09bb644d751a0812671cc226366a336797bb8812`.**
- SA-02 is fully closed in repository/local-CI.
- Lev's SA-03 technical plan #6796912006 remains accepted by Mira.
- Draft implementation PR **#324** completed D1–D4 and exact-head author checks are green: CI #43054008996, SA03 Chromium #43054008946, SA01 Chromium #43054008929, AP10 browser #43054009241.
- Mira reviewed the complete 42-file SA-03 change surface against current main, accepted plan and current Stage. **One confirmed current-scope defect; no other current-scope defects confirmed.**
- **SA03-MIRA-01:** exact Owner self-profile measures are intentionally read through `ownList`, but the canonical profile renders them with Admin measure destinations. The Admin index/detail authority explicitly rejects Owner/self targets, so those links lead to forbidden paths. This is a current SA-03 navigation defect, not future work.
- **Next recipient: Lira — one bounded correction only:** fix SA03-MIRA-01 locally, preserve all existing authority/read/write boundaries, add focused regression coverage, run applicable checks, publish a new stable #324 head and STOP.
- After the fix, Mira repeats coordinator whole-PR review on the new stable exact head. Lev/Mark remain unassigned; no Codex review before Mira PASS.
- SA-04+, Stage6/#315 activation, production and deferred journal-storage work remain outside scope.
- **Handoff granularity gate:** before every Lira implementation assignment, Mira must first check whether the requested work contains multiple independently completable results. If yes, it must be split before assignment; only one bounded subtask is assigned at a time, with Lira STOP after that subtask and a new developer continuation before the next assignment.

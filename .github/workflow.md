# Admin panel — current workflow

- Service PR: **#251**. Current main: `538084fd472c65459ad55ab30a0f96fbfdd68e56`.
- Current stage: **SA03-MIRA-01 bounded author correction completed; awaiting Mira repeat coordinator whole-PR review on exact corrected head `4bfdfdd14a70534bd95c308de9d1c8c2df672c76`.**
- SA-02 is fully closed in repository/local-CI.
- Lev's SA-03 technical plan #6796912006 remains accepted by Mira.
- Draft implementation PR **#324** completed D1–D4 and the one assigned MIRA-01 correction. New exact-head checks are all SUCCESS: CI #43059203099 (2,234 app / 688 PG17), SA03 Chromium #43059202894 (24 acceptance records), SA01 Chromium #43059202975, AP10 browser #43059203239 (4/4 jobs).
- Mira's initial whole-PR review of previous head `09bb644d...` identified one confirmed current-scope defect, SA03-MIRA-01. This first-review finding is now corrected by Lira but **Mira's repeat whole-PR review on the new head has not happened**.
- **SA03-MIRA-01 corrected:** exact Owner self-profile uses own-measure list/detail links, including when there are no measures; valid Admin target profile destinations are unchanged. AP10 authority remains unchanged. Focused EN/RU/HE component and live Chromium Owner-self/allowed Admin route coverage is green.
- **Lira STOP:** bounded correction complete at stable exact head `4bfdfdd14a70534bd95c308de9d1c8c2df672c76`. No implementation changes or reviews requested from Lira now.
- **Next recipient: Mira** for repeat coordinator whole-PR review of PR #324 on corrected stable head. Only after coordinator PASS may Lev be assigned independent technical review; Lev/Mark currently unassigned.
- SA-04+, Stage6/#315 activation, production and deferred journal-storage work remain outside scope.
- **Handoff granularity gate:** before every Lira implementation assignment, Mira must first check whether the requested work contains multiple independently completable results. If yes, it must be split before assignment; only one bounded subtask is assigned at a time, with Lira STOP after that subtask and a new developer continuation before the next assignment.

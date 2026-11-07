# Admin panel — current workflow

- Служебный PR: #251
- Current main: `856b93cb65b01e2389eb97276b37b3a0d8eef265`, migrations0000–0059
- Ordinary Admin Panel AP-01–AP-11: closed
- Owner/authorization redesign: closed
- Current stage: **Settings — technical plan ready for coordinator review**
- Coordinator: **Мира**
- Technical planner: **Лёва**, planning completed
- Plan: [#6711736883](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6711736883); full text in personal file
- Proposed sequence: SET-01 Owner-only authz mutations → SET-02 Settings shell/Forum & roles/per-method registration → SET-03 User preferences → SET-04 Administrator preferences → SET-05 Account & security → SET-06 Privacy
- Frozen product: five Settings surfaces; S1 current Owner-only mutations/future deputies deferred; S2 notification toggles deferred; S3 onlineON/opt-out; S4 separate new Google/email registration, existing sign-in preserved
- Implementer: **not assigned**
- Implementation PR/head: **none**
- Settings implementation/tests/browser/CI have not started; code/schema/migrations unchanged
- Марк не назначен
- Next: **Мира reviews technical plan and package sequence, synchronizes master plan after approval, then assigns only SET-01**. Лёва остановился; no implementation before coordinator approval
- Subsystem settings remain local; Stage6/infra/Owner binding/deputies/deferred preference features out of scope

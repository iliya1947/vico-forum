# Admin panel — current workflow

- Служебный PR: #251
- Current main: `856b93cb65b01e2389eb97276b37b3a0d8eef265`, migrations 0000–0059
- Ordinary Admin Panel AP-01–AP-11: closed
- Owner/authorization redesign: closed
- Current stage: **Settings — technical planning**
- Coordinator: **Мира**
- Technical planner: **Лёва**
- Implementer: not assigned
- Reviewers: not assigned
- Settings implementation has not started
- Product scope is frozen for technical planning:
  - five top-level surfaces: Forum & roles; Administrator preferences; User preferences; Account & security; Privacy
  - S1: all authorization-management mutations Owner-only in current release; future deputy delegation must remain possible, but deputies are not implemented now
  - S2: reply/mention notification preferences deferred
  - S3: online visibility default ON / opt-out
  - S4: independent Google-registration and email/password-registration controls
- Subsystem operational settings remain subsystem-local by default
- Next: **Лёва prepares the technical plan and bounded implementation-package sequence; no implementation yet**

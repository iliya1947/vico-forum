# Admin panel — current workflow

- Служебный PR: #251
- Current main: `856b93cb65b01e2389eb97276b37b3a0d8eef265`, migrations 0000–0059
- Ordinary Admin Panel AP-01–AP-11: closed
- Owner/authorization redesign: closed
- Current stage: **Settings — product architecture**
- Coordinator: **Мира**
- Technical planner: not assigned
- Implementer: not assigned
- Reviewers: not assigned
- Owner direction: Settings is not one page; minimum three distinct surfaces are required
- Confirmed minimum: Owner/system settings; administrator personal settings; user personal settings
- Additional category identified for separate consideration: account & security
- Domain-specific settings remain candidates to stay inside their own subsystems
- Important existing-contract impact: role-definition/permission configuration is currently delegatable through `access.authorization.manage`; owner now requires role settings themselves to be Owner-only. Exact boundary versus user-role assignment still needs product definition before planning.
- Next: **Мира refines the Settings surface map and returns only genuine owner decisions; no implementation yet**

# agents/mira.md — #355 whole-feature review in progress

- Review target: assembled Draft #355 exact `fdad1930fc68a854d52bee31922f923be5c1c751` vs current main `9cff976a9621d9fe5dfef28ea5367e390ff435b1`.
- Final author self-check remains PASS on this exact head with fresh #355→main CI/acceptance.
- **PART 1/4 PASS:** scope, migration/schema, permission/AP-10 foundation, History neutrality/constraints/Owner classification.
- **PART 2/4 PASS:** public SQL/read projection and tombstones, canonical Hide/Restore admission/CAS, neutral errors, generic-Admin public safety, isolated capability-specific private queue/inspection/history boundary.
- **PART 3/4 PASS:** public/private attachment boundary, translation planning/execution visibility gates, retained Watch/Bookmarks/Mute/Block/read-state semantics, neutral retained inbox/mark-read and suppression receipts. No current-feature blocker confirmed.
- Asset delivery already admitted before a concurrent Hide is outside the accepted current race contract; this is not counted as a blocker.
- Known fold metadata deviation remains process history only; main is unchanged.
- **STOP before PART 4.** Next owner continuation activates only UI/races/connected acceptance + final whole-feature verdict. Do not start Leva review, merge, docs or deploy.

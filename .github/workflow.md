# Admin panel — current workflow

- **Service PR:** #331, coordination-only; never merge.
- **Current main / SA05 baseline:** `efae8111a13aefbf72b4d20972dac461acc602e3`.
- **SA04:** code + documentation closed in main.
- **SA05 decomposition:** SA05-1 command core → SA05-2 protected HTTP action → SA05-3 read-side/History → SA05-4 Owner UI → SA05-5 connected closure. Checkpoints inside one cumulative implementation PR, not merge units.
- **SA05-1:** **AUTHOR READY / STOP**, Lev implemented atomic Owner command/facade + native acceptance in [Draft #337](https://github.com/iliya1947/vico-forum/pull/337), stable exact `213dc8bb6583439cd8ea7efbd9872e98aa638b36`,3commits/5paths. [Full handoff/evidence](https://github.com/iliya1947/vico-forum/pull/331#issuecomment-6915783066).
- **ACTIVE NEXT:** **Mira coordinator whole-SA05-1 checkpoint review** of this same head against accepted §5.1–§5.2 command-core/native §5.4 scope and current SoTs. Confirmed current-checkpoint defects return to Lev in one packet. Lev cannot independently review own implementation.
- **Acceptance:** native59command/facade19; full native1132/93 and app2382/190 local+final CI43861391964 PASS; build/typecheck/lint/metadata/actual69-table manifest/privilege/Worker gates PASS. Drizzle generator false-green qualified, not parity proof.
- **STOP:** no SA05-2 activation or merge at this checkpoint. No independent reviewer currently assigned; no SA05-1 coordinator verdict yet.
- **Boundary:** no HTTP/context/Worker action wiring, profile/History read-side, Owner UI, connected SA05 browser closure, SA06+, #315, deployment/Stage6 or production work. Permanent docs close separately at end.

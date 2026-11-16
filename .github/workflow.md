# Admin panel — current workflow

- **Service PR:** #331, coordination-only; never merge.
- **Current main:** `efae8111a13aefbf72b4d20972dac461acc602e3`.
- **SA04:** fully closed in `main`, including documentation.
- **SA05 decomposition:** SA05-1 command core → SA05-2 protected HTTP action → SA05-3 read-side/History → SA05-4 Owner UI → SA05-5 connected closure. These are checkpoints inside one cumulative SA05 implementation PR, not merge units.
- **ACTIVE:** Лёва implements **SA05-1 only** from the accepted remaining technical plan (§5.1–§5.2 + native-command acceptance in §5.4), after refreshing exact locators/dependencies against current main.
- **Implementation:** [Draft #337](https://github.com/iliya1947/vico-forum/pull/337), stable published head `6d0a9f203b12bca4c22a43e518fa4d9493fce086`,1commit/4paths; final full suites/CI ACTIVE, not AUTHOR READY.
- **SA05-1 deliverable:** production atomic Owner account-deactivation command core + native PostgreSQL acceptance. No HTTP route/UI/read-side yet.
- **NEXT after Lev AUTHOR READY:** Mira coordinator whole-checkpoint review of the stable exact SA05-1 head. Confirmed current-scope defects return to Lev in one packet.
- **Boundary:** no SA05-2+, SA06+, #315, deployment, Stage6, production or real Owner/Google external acceptance during SA05-1.

# agents/Лиры.md — личная рабочая память Лиры.

- Active assignment: **P2** for service PR #369.
- P0 PASS: #373 exact `e1f077c0c8c7f15d4600df0a64dd661982755bb8`.
- P1 PASS: #375 exact `a0137ce3a67bf451b650395e7b9b883eaa01aa46`.
- Create P2 as a new stacked implementation PR based on the P1 branch/head.
- Goal: coherent typed raw fixtures + production capability/context adapters, not a second backend and not a screen-specific fake layer.
- Implement PLAN §10–11 / §15 P2: baseline entities, stable actor identities/grants/exact Owner, all current production contexts, test auth/session/bucket/localization/monitoring, fault/delay profiles, minimal overlays/transient state only where a real handler flow needs it.
- Must preserve IDs/ownership across readers; actor switch never rewrites authorship; private/Owner data never leaks into public projections.
- No generic success/`any` adapters. Missing required current capability must fail loudly and be implemented to its production typed contract.
- Verify Guest/User/privileged-reader/Owner, no-session and inactive-account states.
- Do not perform P3 route/action matrix, P4 browser matrix, P5 cutover, SQL/WASM/external services or durable persistence.
- P2 is already authorized: on activation, implement the next concrete P2 step rather than restating assignment/status.
- After self-check + applicable evidence, stable exact P2 head → Mira coordinator checkpoint. P3 only after PASS.

- P2-A1 raw fixture baseline PASS in Draft #385 exact `ab8e62218294dd5e08d9ac046c6c55dada5f1b38`, stacked on accepted P1. `app/ui-preview/p2/raw-baseline.ts` + 5 Vitest checks in `raw-baseline.test.ts`: stable P0 IDs, actor/Owner separation, roles, typed raw topic/post/attachments/personal-state references, clock and strict integrity validation. CI #45303006702 checks/database SUCCESS, 232 files / 2816 tests; P0/P1 Chromium PASS. No P2 runtime wiring yet.
- Current STOP after P2-A1. Next explicitly activated P2-A2 extends current-stage raw domains and reference checks; P2 whole gate is still open. Continue only within #385, no P3/merge/deploy/stack sync.

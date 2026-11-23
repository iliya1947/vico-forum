# agents/leva.md — Task 6 / F3 ACTIVE

- F1 #379 accepted exact 8227db6003f5a23a369e11b645194da229315f7a; F2 #380 accepted exact 11a2808f14a79efd69dbbb120f5b732bf2880d4f. Both Draft/unmerged.
- Current assignment: **implement F3 only** from stages/forum-structure/PLAN.md S8 — topic move, hidden admission and create-topic receipt reconciliation.
- Create a separate stacked Draft PR with base feat/forum-structure-f2 exact 11a2808f14a79efd69dbbb120f5b732bf2880d4f.
- Required boundary: authoritative topic move with accepted lock/admission/CAS/history contracts; hidden topic requires both move + visibility-management authority under actual topic lock; update only location fields; matching create-topic receipt returns persisted/current section without move-back.
- Prove the F3 Done matrix from PLAN, including real PostgreSQL races/rollback and preservation of existing topic/post/content/personal states.
- Do **not** implement F4 readers/private context/picker/routes, F5 live UI/Owner projection, or F6 final assembly.
- After author self-check + applicable exact-head checks: STOP → Mira coordinator checkpoint.
- Do not merge stack stages.
- Final independent whole-feature Codex reviewer remains Mark because Leva participates in implementation.
- #342 is the only service channel; #300/Stage6/deploy/general UI/UX remain inactive.

# Admin panel — current workflow

- **Service PR:** #331, coordination-only; never merge.
- **Current main / remaining-SA04 baseline:** `c7f2538ce1d4d37152bc3d503587dc9dabd28f24`, Owner merge #334 on2026-11-16.
- **M+N complete:** #334 merged; fresh Mira coordinator + Lev independent PASS on `f5c0336a4e6e1f5cf9c85a4d4730da9d330c53fe`; SA04-MN-LEV-01 CLOSED, [verdict](https://github.com/iliya1947/vico-forum/pull/331#issuecomment-6909332856).
- **ACTIVE implementer:** **Lev (Codex-6.1 Sol)** for the **entire remaining SA04 O→P→Q→R→S** under accepted technical plan. Worktree `/workspace/work/sa04-os`, branch `chatgpt/sa04-os-accountstate`; fresh Draft **#335**, initial published head `d91454cbcd5fa27e3cfb91b5e4a0fea951e6e312` (O/P/Q checkpoint), contains the complete remaining package as it develops. Not author READY.
- **Current internal step:** O/P/Q checkpoint published; R mandatory transient actor/planner/store admission implemented locally with targeted tests passing; **S cumulative connected acceptance ACTIVE**. R/S not yet author READY. Internal package boundaries do not cause handoffs/merge gates.
- **Architecture:** accepted `SA04_L_S_TECHNICAL_PLAN.md` O–S and shared lifecycle/transaction/replay/error contracts unchanged; newest delivery/review assignments override historical plan routing text.
- **Review route after author completion:** Mira coordinator whole-PR review → after PASS Mark and Lira independent same stable head reviews. Lev cannot independently review his own implementation; current defects reconciled into consolidated correction cycle to Lev.
- **Final Owner merge:** only after Mira + Mark + Lira PASS on final stable implementation.
- **Mira/Mark/Lira:** inactive until author whole-O–S completion and coordinator handoff. No agent launches another.
- **Permanent docs:** deferred separate end-of-task documentation PR per AGENTS; not included prematurely in implementation.
- **Boundary:** no SA05, #315, production/deployment or Stage6; no new product/recovery/last-manager policy.

# Admin panel — current workflow

- **Service PR:** #331, coordination only, never merge.
- **Current main:** `859ea69165f51cd997e61b1d1f30f6663f045965`.
- **Delivered in main:** SA01–03 and SA04 A–L. SA04-L came through merged #333; reviewed implementation head `7400c51334476125d53a0108fc7a53c0f35c754f`.
- **Accepted technical scope:** full **SA04 M–S → SA05 → SA06 → SA07 → SA08**; architecture/acceptance unchanged.
- **Developer delivery correction:** bounded slices inside one upper-level package are **not merge units**. Current corrected blobs: SA04 L–S `56859a08f6c569a2d6fa25b70a700872309acabf`; whole remaining plan `8e12cab22d5c700e31a86ded3d107e216aacdd82`.
- **Historical exception:** L was already merged separately in #333 before this correction. Do not revert it solely for process shape.
- **Current phase:** merge-boundary correction complete; **M–S implementation not started**.
- **Next implementation shape:** one cumulative Draft implementation PR from current main for **M → N → O → P → Q → R → S**. Planned internal author/checkpoint stops remain, but **no Owner merge between M/N/O/P/Q/R**.
- **Final SA04 gate:** S AUTHOR STOP → Mira whole-SA04 coordinator review → Lev independent review of the same stable exact candidate → Owner merge once.
- **Current actor:** Developer, next continuation command.
- **Agents:** Mira STOP after correction; Lira/Lev/Mark inactive.
- **Boundary:** no SA05 implementation, #315 remediation, permanent docs, production/deployment or Stage6.

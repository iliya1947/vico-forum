# Admin panel — current workflow

- **Service PR:** #331, coordination-only; never merge.
- **Current main:** `7e7a803876422c2f40faaf720b59027d468e99dc`.
- **SA05:** #337 merged by developer; whole-package review chain completed PASS on exact pre-merge head `a465cbd379b9c3f92b504658001c698bce3fa505`.
- **ACTIVE:** **Lev / Codex-6.1 Sol implements the whole SA06 package** from current `main`, starting with accepted queue slice `06-0`, then `06-F → 06-A → 06-M → 06-N`.
- **Implementation PR/head:** cumulative Draft #338, `b6f87b644eab2fe8c0cf7d396bd447b1db67db14`, first1commit/38paths; source published, final whole-package acceptance ACTIVE, not AUTHOR READY.
- **Implementation shape:** one cumulative SA06 implementation PR. Internal slices are implementation checkpoints, not independent review/merge gates.
- **Review:** after whole-SA06 AUTHOR READY on one stable exact head, Mira coordinator whole-package review first; then assigned independent reviewers who did not author the implementation.
- **Known documentation timing:** permanent docs still describe SA05 as future because the accepted plan defers factual documentation to the separate DOC closeout; do not fold permanent-doc edits into SA06 implementation.
- **Boundary:** no SA07+, #315, deployment/Stage6/production/external work or permanent docs during SA06 implementation.

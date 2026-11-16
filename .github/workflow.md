# Admin panel — current workflow

- **Service PR:** #331, coordination-only; never merge.
- **Current main/base:** `7e7a803876422c2f40faaf720b59027d468e99dc`; SA05 #337 developer-merged.
- **Current stage:** **WHOLE SA06 AUTHOR READY. Mira coordinator whole-package review ACTIVE NEXT.**
- **Implementation:** cumulative Draft #338, stable exact `522951ec164fda237b52e9777de846e32e86d47d`,2commits/47paths; all `06-0 → 06-F → 06-A → 06-M → 06-N` complete. Internal slices are not review/merge gates.
- **Author:** Lev / Codex-6.1 Sol — **AUTHOR STOP**, not an independent reviewer of this implementation.
- **Evidence:** [complete scope, verification and review task](https://github.com/iliya1947/vico-forum/pull/331#issuecomment-6925817870). Local+exact CI app2507/194files/native1334/98files PASS; all16jobs/12runs SUCCESS, including new genuine SA06 connected acceptance. One unchanged app-test initial failure recovered on same-head retry; actual root cause unknown. Known Drizzle BigInt/exit0 remains non-proof; native schema/index evidence is separate.
- **Next:** Mira reviews the whole cumulative SA06 on this exact head. Confirmed current-SA06 defects return to Lev as one packet; corrected head starts a fresh coordinator cycle. After Mira PASS, assigned non-author independent reviewers review the same head; do not infer or start reviewer assignments here.
- **Documentation timing:** permanent docs intentionally wait for separate DOC closeout; no permanent-doc edits in SA06 implementation.
- **Boundary:** no SA07+, #315, deployment/Stage6/production/external work, permanent docs or agent merge. Browser/screenshots do not claim developer visual or deployed acceptance.

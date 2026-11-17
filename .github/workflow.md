# Admin panel — current workflow

- **Service PR:** #331 coordination-only, never merge.
- **Current main:** `45406723c4b53ceba9392d3fb7dc84e8adaa9768`; SA07 #339 merged by Developer.
- **SA08 implementation PR:** cumulative Draft #340; accepted 08-A head `cb09523ce050d97f1eab59b41b40c471a2cde20f`, base `main`, open/Draft.
- **SA08-A:** BOUNDED PASS — 0 confirmed current-08-A defects.
- **ACTIVE SA08-B:** Lev / Codex-6.1 Sol executes the accepted §15 final whole-program native/connected matrix on one stable code state and closes SA08 implementation. Any confirmed current-SA08 defect found by the matrix is corrected within scope before author handoff; future-only gaps are not implementation defects.
- **08-B ready gate:** stable exact #340 head + complete applicable whole-program evidence + no known confirmed current-SA08 defects → Mira WHOLE SA08 coordinator review.
- **After Mira PASS:** Mark / Codex-6 Sol performs independent non-author WHOLE SA08 review on the same exact head. Any implementation change resets the review head/cycle.
- **Boundary:** no intermediate merge, permanent docs, #315, Stage6/production/deploy/external work. Owner remains merge authority.

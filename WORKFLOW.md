# WORKFLOW.md — Task6 / Lena final independent re-review

## Active gate

**Mira coordinator PASS on new final exact → Lena independent re-review.**

Final implementation:
- Draft #379, branch `feat/forum-structure-f1`;
- stable exact `42efaaaabcae24fbb1fa74d042e18e850827b23d`;
- parent reviewed exact `28064dfe51c2c62811dd5674387825a5f0289fd0`;
- base/current main `a3dae5815e26d158c566a27c552127b4b1ab29aa`;
- Draft/open/unmerged; main unchanged.

## Residual R2a-01 correction

The only implementation change after Lena's previous re-review is one commit with four files:
- `db/forum-structure.ts`: after validating the source through existing `findSection()/ordinarySection()`, reserved Help destination throws existing `StructureConflictError("reserved-destination")`;
- focused DB/action/browser regressions.

Resulting contract:
- admitted ordinary section → reserved Help destination = controlled 409;
- absent destination = 404;
- protected/Help source = 404;
- direct protected Help-object operations = 404;
- refusal has no write/global-version/History effect.

No schema, permissions, UI, dependency, lock-graph, successful-reparent or unrelated behavior changed.

## Mira coordinator re-review

Coordinator review on exact `42efaaaabcae24fbb1fa74d042e18e850827b23d`: **PASS**.

Verified independently:
- exact implementation diff is one commit over 28064df, four files, product delta two lines;
- source eligibility remains checked before Help-destination classification, so protected/Help source stays 404;
- existing request permission and authoritative writer admission/locking remain unchanged;
- route maps `StructureConflictError` to private409 and `StructureNotFoundError` to private404;
- exact CI `45411761750` latest jobs SUCCESS;
- all 18 applicable acceptance workflows SUCCESS;
- whole-feature connected run `45411775325`, artifact `14929216238`;
- artifact independently downloaded: SHA256 matches GitHub digest, implementationSha=checkoutSha=exact head, fullFeature=true, 19 groups, pageErrors=[], external=[];
- residual browser case proves actual ordinary section→Help409 plus absent/protected/direct Help404 and unchanged section/version/History.

CI database first attempt had 118/118 files and 1834/1834 tests pass but one asynchronously handled expected error from unchanged `sa04-complaints-n1.test.ts` was reported by Vitest as an unhandled rejection. Correction diff does not touch Complaints; rerun on the same exact succeeded. This is unrelated to Task6 residual correction and is not treated as a current-Task6 blocker.

No confirmed current-Task6 blocker remains at coordinator level.

## Next — Lena

Independently re-review **the same exact head** `42efaaaabcae24fbb1fa74d042e18e850827b23d`.

Because the previous independent review completed the whole Task6 scope and found only residual R2a-01, focus on:
- exact correction semantics above;
- absence of regression introduced by the four-file delta;
- exact-head evidence/provenance.

Do not mechanically repeat unchanged whole-feature checks without cause. Prior independent evidence remains valid for unchanged code, but final PASS must explicitly apply to this new exact head.

If Lena PASS → owner merge #379. Agents do not merge. Any implementation-head change invalidates the gate and returns to Mira coordinator review.

## Boundaries

- F7 docs inactive until actual owner merge #379.
- #342 sole service channel and never merge.
- #300/#320/Stage6/general UI/UX/deploy inactive.
- #384 full-forum audit remains paused.

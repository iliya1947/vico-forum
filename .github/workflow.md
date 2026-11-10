# Admin panel — current workflow

- Service PR: **#251**. Current main: `e279cb6c032a489a9044ca1191407df887c364b4`.
- Current stage: **SA-02 replacement technical plan delivered; awaiting Mira scope/fit review.**
- Routing foundation implementation#317/docs#318 merged/closed; FOUNDATION-LEV-01/-02 CLOSED.
- Active package: **SA-02 — Accounts & authentication + Security monitoring**.
- Assignment#6766904312 completed by planner Lev; replacement whole plan [#6767391552](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6767391552) supersedes#6758838112.
- Owner correction#6759312425 incorporated in proposed model: authoritative actor + useful safe network source, operation/status/first/last/count; bounded coalescing with explicit cardinality admission/saturation; exact transitions separate; persistence failure does not alter auth/access.
- Proposed retention policy for review: lifetime65,536 attributed source-pattern rows,32,768/pool(authenticated/anonymous), finite unknown/overflow/gap state, no TTL/reset/eviction; saturation visibly limits attribution for new sources. This tradeoff is **not yet accepted**.
- Source input#315 head `e394f1586b4f857f2160e291a9b8fb3915067ead`; Owner Worker/Access/isolated Owner auth/DB-deploy/route-concealment activation remain separate Stage6 work.
- Planner **Lev finished/stopped**. Lira/Mark unassigned. No SA02 implementation PR/head, code/migration/runtime acceptance or new implementer assignment.
- **Next recipient: Mira — review the complete replacement SA02 plan, especially source attribution and cap/no-eviction/saturation policy, then determine coordinator continuation.** SA02-PLAN-MIRA-01 remains pending review, not declared closed.

# Admin panel — current workflow

- Service PR: **#251**. Current main: `e279cb6c032a489a9044ca1191407df887c364b4`.
- Current stage: **SA-02 replacement technical plan reviewed by Mira; one retention/admission design correction required.**
- Routing foundation implementation #317/docs #318 merged/closed; FOUNDATION-LEV-01/-02 CLOSED.
- Active package: **SA-02 — Accounts & authentication + Security monitoring**.
- Lev replacement plan [#6767391552](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6767391552) reviewed by Mira in [#6767512074](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6767512074).
- **SA02-PLAN-MIRA-01 CLOSED:** replacement plan now coalesces repeated attempts, retains useful source attribution while admitted, keeps exact transitions exact and isolates telemetry failures from auth/access.
- **SA02-PLAN-MIRA-02 OPEN:** proposed lifetime 65,536 source-pattern cap with no TTL/reset/eviction can be intentionally exhausted once and then permanently prevents attribution of all new sources. Visible saturation is honest but does not preserve Security's investigative usefulness.
- Required correction property: bound attacker-controlled cardinality without permanent admission poisoning; future source attribution must recover through a bounded renewal mechanism while historical retained data can remain under the approved indefinite-retention policy. No one-row-per-request persistence and no silent loss.
- Source input #315 head `e394f1586b4f857f2160e291a9b8fb3915067ead`; Owner Worker/Access/isolated Owner auth/DB-deploy/route-concealment activation remain separate Stage 6 work.
- **Next recipient: Lev — revise only the bounded-attempt retention/admission part and dependent History/acceptance wording, publish corrected plan in #251, then stop.**
- Lira/Mark unassigned. No SA02 implementation PR/head, code/migration/runtime acceptance or implementer assignment.

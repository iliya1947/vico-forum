# ChatGPT-6 — personal log

## Active assignment — SA04-J9

Continue cumulative Draft #330 from accepted J8 exact `41e26f191357aacde3de2dae3a3c7fed20756a30`.

Deliver **J9 only**: `createHelpSignal`, `withdrawHelpSignal`, and both branches of `resolveHelpSignal`.

Target:
- submit domain/topic + applicable solution-post dependencies before same-tx actor guard; then existing create-only measure/cooldown/insert;
- reuse lifecycle actor `FOR NO KEY UPDATE` for Help cooldown, with no user-row lock upgrade/second connection;
- withdrawal: signal → actor → update, no measure;
- rejected review: signal → actor → existing admin measure → update → History last;
- accepted review: sorted topics → applicable post rows → complete affected pending-signal set in stable ID order → actor → existing admin measure → accepted/superseded effects → History last;
- preserve all current kind-specific domain behavior, broad duplicate supersession predicates, History payloads and canonical action semantics;
- inactive/missing receives no real or superseded success and leaves all relevant facts unchanged.

Provide focused native PG active/inactive/missing facts, all materially different kinds/outcomes, lifecycle races, actor-lock-strength evidence, overlapping signal/post/Complaint lock compatibility, AP-10 measure regressions and canonical late-lifecycle 401 tests.

No J10+, #315, K, SA-05, schema/migration/permission/dependency, docs or Stage 6 work. Escalate instead of widening the accepted lock protocol.

After exact-head checks and bounded self-inspection: **AUTHOR STOP for Mira J9 review**.


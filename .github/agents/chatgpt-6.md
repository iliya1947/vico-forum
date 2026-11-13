# ChatGPT-6 — personal log

## Active assignment — SA04-J6

Continue cumulative Draft #330 from accepted J5 exact `af25adf18fd065e5af4a7e6da2c670f28613a10f`.

Deliver **J6 only**: authoritative active-account admission for `markNotificationRead` and `markReplyNotificationRead`.

Required outcome:
- one short transaction per acknowledgement writer;
- trusted actor AccountState guard before own notification lock/update;
- unified reply/mention + complaint Decision/Appeal-result recipient/membership behavior preserved;
- legacy remains recipient-owned reply/mention only, with no new HTTP path;
- active already-read stays idempotent; inactive/missing gets no write and no no-op success;
- canonical notifications action keeps shared generic private/no-store lifecycle 401 and existing redirect/error behavior.

Provide focused native PG active/inactive/missing/already-read facts, both lifecycle race directions for unified and legacy shapes, complaint/member regressions and canonical route coverage. Run applicable exact-head checks and inspect the bounded delta.

No Complaint mutation changes, J7+, #315, attachment K, SA-05, schema/migration/permission/dependency, docs or Stage 6 work.

After implementation publish one stable exact #330 head and **AUTHOR STOP for Mira J6 review**.


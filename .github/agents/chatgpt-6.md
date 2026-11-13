# ChatGPT-6 — personal log

## Active assignment — SA04-J7

Continue cumulative Draft #330 from accepted J6 exact `9a0a095b41c26ef41d6d136f4cf673c8bc325b08`.

Deliver **J7 only** for `setTopicClosed`, `pinTopic`, `unpinTopic`.

Target:
- topic mutex/dependencies before actor; preserve accepted non-key-changing lock compatibility with reply and Complaint FK work;
- authoritative same-tx AccountState admission before closure same-state success and before pin/unpin effect/no-op;
- preserve closure CAS/version/ABA/overflow and existing measure ordering;
- preserve pin/unpin idempotency and real-transition-only History;
- inactive/missing leaves closure/pin/History facts unchanged and gets no no-op success;
- canonical actions retain permissions, AP-10 and generic private/no-store lifecycle 401.

Provide focused native PG active/inactive/missing/no-op facts, lifecycle races, close↔reply and Complaint lock-compatibility evidence, plus applicable route/History/AP-08/AP-10 regressions.

No J8+, Complaint mutation changes, #315, K, SA-05, schema/migration/permission/dependency, docs or Stage 6 work.

After exact-head checks and bounded self-inspection: **AUTHOR STOP for Mira J7 review**.


# ChatGPT-6 — personal log

## Active assignment — SA04-J8

Continue cumulative Draft #330 from accepted J7 exact `5e76474908156d6acbab1d2cf98138e6a37cabc8`.

Deliver **J8 only** for `markTopicSolved` and `selectBestAnswer`.

Target:
- topic/dependent answer+signal locks before actor, with stable ordering and accepted non-key lock compatibility;
- same-transaction AccountState guard for both Own and Any;
- Any-only `admin.forum` measure remains after lifecycle;
- preserve all existing author/duplicate/candidate/first-post/domain rules;
- preserve solved and best-answer side effects, Help moderation/signal transitions, returned selection data and Any-only real-transition History;
- active same-answer stays a no-op success; inactive/missing gets no success and changes no topic/post/signal/History facts.

Provide focused native PG active/inactive/missing/no-op facts, both lifecycle race directions, edit/solution + signal + Complaint FK lock-compatibility evidence, plus applicable solved/best-answer/History/AP-10/canonical action regressions.

No J9+, #315, K, SA-05, schema/migration/permission/dependency, docs or Stage 6 work.

After exact-head checks and bounded self-inspection: **AUTHOR STOP for Mira J8 review**.


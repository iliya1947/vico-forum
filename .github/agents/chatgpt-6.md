# ChatGPT-6 — personal log

## Active assignment — SA04-J5

Continue cumulative Draft #330 from accepted J4 exact `84b5124f948895e3e211b81b1d6bd2082ddc531f`.

Deliver **J5 only**: authoritative lifecycle admission for `advanceTopicReadState`.

Required outcome:
- one short transaction instead of target-read / autocommit upsert / separate readback;
- target topic/post FK dependencies before actor AccountState guard, using the accepted non-upgrading dependency lock order;
- same-transaction active-account admission for the trusted `userId`;
- existing monotonic `created_at` + post-ID tie-break upsert unchanged;
- same/backward active request remains no-op; inactive/missing actor gets no marker write and no no-op success;
- resulting read state is read/returned inside the same transaction;
- preserve target validation, new/unread/read + first-unread semantics, concurrency/FK behavior and existing `runForumMutation` HTTP mapping.

Provide focused native PG lifecycle/no-op/races, monotonic concurrency and content-lock compatibility evidence plus canonical `markTopicRead` regression. Run applicable exact-head checks and inspect the bounded delta.

Do **not** remediate #315 `READSTATE-CACHE-01`; no J6+, schema/migration/permission/dependency, SA-05, docs or Stage 6 work.

After implementation publish one stable exact #330 head and **AUTHOR STOP for Mira J5 review**.


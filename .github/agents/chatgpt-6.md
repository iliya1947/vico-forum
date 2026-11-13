# ChatGPT-6 — personal log

## Active assignment — SA04-J4

Continue cumulative Draft #330 from accepted J3c exact `cb1df03d00038fdf414b9d0d650d908a58167098`.

Deliver **J4 only**: authoritative active-account admission for the existing own public-profile writer and its canonical action boundary.

Required outcome:
- `updateProfile` keeps its existing user-row serialization and verifies current AccountState on the same transaction/connection before `profile.edit` measure admission and profile upsert;
- inactive/missing actor cannot persist profile changes;
- state-first and writer-first races obey the accepted lifecycle ordering;
- canonical profile action maps late inactive/missing denial to generic private/no-store 401, never saved-success;
- preserve validation, self-only actor identity, AP-10 `profile.edit`, Owner measure immunity wiring, public Deleted-user projection, bounded draft behavior, unavailable 503 and unexpected-error handling.

Use focused profile DB/route/race evidence and applicable existing regressions. No J5+, Privacy save P, SA-05, schema/migration/permission/dependency or unrelated work.

After implementation: personally inspect the bounded delta, publish one stable exact #330 head/evidence, then **AUTHOR STOP for Mira J4 review**.


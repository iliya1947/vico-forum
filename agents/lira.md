# agents/lira.md — current implementation assignment in #342

## Moderation visibility B6-A1 complete — STOP before A2

Mira has accepted B5 #367 exact `a2269fb0294feaccb433e76b66e800f3e869658d` at bounded coordinator checkpoint. Owner authorized **B6-A only** in #342 comment 7067233890. B1–B5 stacked Draft/unmerged, base B5 stable.

B6 stacked [Draft #370](https://github.com/iliya1947/vico-forum/pull/370), branch `feature/moderation-visibility-b6-guarded-queue`, base `feature/moderation-visibility-b5-preferences-inbox` exact `a2269fb0294feaccb433e76b66e800f3e869658d`. First head **`1a886f979cf1c0aeddc002f35bfd83a5c8a890de`** (1 commit / 4 files).

### Delivered A1 (static/source check only)

- `db/private-visibility-queue.ts`: private `PostgresHiddenQueueReader` requires fresh effective `forum.content.visibility.manage` plus active persisted user for each call; only hidden topics/posts via 26-row PostgreSQL queries, descending (visibility_changed_at,id) cursor and typed projection, effective topic/parent status on hidden posts. Does not return hidden title/body/revisions/attachments.
- `db/hyperdrive-private-visibility-queue.ts`: bounded DB connection; denied request stays denied, unclassified errors fail closed without raw SQL/source.
- `app/admin/visibility-queue.server.ts`: separate private request context, session admission, neutral 401/403/503 `private,no-store`.
- `workers/app.ts`: inject private reader with existing effective AP-10-filtered Authorization on each request; never public ForumReader.
- GitHub compare/source static assertions **11/11 PASS**; **no real Vitest/PG/CI or browser checks run yet**. B6-A author PASS not established.

### Next

**Лира STOP.** On owner `...`, implement **B6-A2 only**: `/:locale/admin/forum/content` route, strict bounded canonical kind/time/id cursor parsing, private queue UI and no-store document/data/errors. Then STOP before A3. Later B6-A3: targeted PG/route/AP-10/dynamic revoke/outage/25+lookahead tests and exact-head checks, then STOP → Mira B6-A bounded coordinator checkpoint. Do not start B6-B inspector, revisions, private assets, B7, merge or deployment.

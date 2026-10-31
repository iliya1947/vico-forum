# Complaints

This is the permanent complaints-domain contract. Product decisions and staged
delivery are recorded in service PR #254; this document records implemented
Packages 1–3 behavior. Full review/decision, notification and appeal UI remain deferred.

## Domain and boundaries

A Complaint is one authenticated user's report, not proof or a sanction. A Case
groups reports for one concrete content revision. An immutable initial Decision
records `confirmed | not-confirmed`. An Appeal retains a participant's argument
and its separate review result. Moderator notes are private, append-only records.
Lifecycle events are persisted atomically with the command that produces them.

Complaints never mutate Help Signals, Security events, user blocking, content
visibility or administrative history. There is no assignment/ownership lock.
Shared Admin Quick actions belong to a later package and retain their own authority.

`db/complaints-service.ts` is the server application boundary. It accepts a trusted
authenticated actor identity, resolves current effective permissions and validates
input before calling the trusted PostgreSQL repository.
No browser-provided role, boolean access flag, author identity or reporter identity
may be forwarded as authority. The POST-only `/:locale/topics/:topicId/complaints`
action requires a session, current permission and same origin, bounds URL-encoded
input to 32768 bytes and calls the submission-only Worker capability. The topic
loader's permission flag controls presentation only; the write rechecks authority.
Responses are `private, no-store` and expose only success/client operation nonce or
a classified error, never report/Case IDs, reporter identities or aggregate counts.

## Reported target and evidence

Targets are `post` or `topic-title`, including separate first-post/title identities.
Composite foreign keys bind each immutable revision to its owning post/topic and
bind a post to its topic. The affected-author field has a foreign key to the user
identity; the trusted repository derives it from the locked authoritative content
row at submission. This author equality is enforced by that server boundary.

Submission takes the authoritative content row lock and compares the observed
revision with the current revision. It rejects a fresh stale report rather than
silently reporting newer content. A committed exact-operation retry still returns
the original record after an edit. Source-locale corrections create a different
revision identity; UI locale/translations never select the evidence revision.
The affected author is authoritative post/topic author, not the revision editor.

Post attachment membership is captured under the same content lock at first Case
creation. Private asset references are retained independently of mutable published
post refs. The active-ref trigger fences insertion against a cleanup claim. Cleanup
checks complaint refs at candidate selection, fresh locked recheck and final delete.
This includes recovery of already-claimed cleanup work. Retained evidence never
grants public download access or exposes object keys. A protected evidence download
surface is a later review-UI responsibility; existing download semantics are intact.

Reported targets, reports, decisions, notes, events and evidence refs reject
UPDATE/DELETE. Appeal identity/argument is immutable; a pending Appeal can acquire
one result, after which it is immutable. Case identity is immutable. Evidence
references use RESTRICT; future hard deletion must explicitly design retention
before being enabled. There is no general archive/purge subsystem in Package 1.

## Validation and grouping

Reasons: `spam`, `harassment`, `threats`, `fraud-phishing`, `malicious-content`,
`personal-data`, `impersonation`, `other`. `other` requires a nonblank explanation;
other reasons allow no explanation. Explanations and appeal arguments are bounded
to 2000 Unicode code points, note/public reasoning to 10000; NUL is rejected.
Server normalization and SQL CHECK constraints agree on these limits.

An open Case is unique per target revision. Separate reporters create separate
Complaints in that Case. The same reporter/target is lifetime unique, regardless
of reason, retry or closure. An identical duplicate returns the existing record;
a changed duplicate payload conflicts. Reports cannot be withdrawn.

After resolution, a different reporter on the same current revision creates a new
Case linked by `previous_case_id` to the most recently resolved Case of that target
(ordered by resolution time, creation time and ID). The old Case and Decision are
untouched. The same reporter/target lifetime duplicate still returns its original
record, even when a successor exists. Later reporters join the successor while it
is open. Repeated resolutions form a chain of explicit predecessor links.
The link is immutable; a self-FK and insertion guard bind it to the same content
unit. A same-revision predecessor must be resolved. Protected reviewer Case reads
include the link; participant/public projections do not expand.

A newer revision always gets its own target and Case immediately, including when
an earlier revision's Case is open. If no same-revision resolved predecessor exists,
it links to the latest created Case of that same post or topic title (creation time,
then ID). The previous Case, Decision and evidence are untouched. A post and its
topic title never share this predecessor chain. Storage retains its partial
open-target unique index.

New reports are limited to 10 per rolling 10 minutes and 50 per rolling 24 hours
per authenticated actor. Under the existing actor-row mutex, persisted immutable
reports and database statement time determine both budgets and the earliest retry.
The reporter/time index bounds this lookup; there is no process-local counter.
Exact replay and lifetime duplicates return before spending budget, rejected writes
roll back, and concurrent submissions cannot over-admit. HTTP returns 429 with
`Retry-After`; no sanction or forum-write cooldown is applied.

Topic context exposes separate title and post report forms in English, Russian and
Hebrew. They capture the observed revision and a fresh operation nonce on opening,
retain input/nonce for retry, and show inline confirmation without navigating away.
Other requires explanation; the remaining reasons allow it. Stale revisions receive
a conflict instead of silently reporting the newer text. Known authorization/storage
availability failures fail closed with 503; unexpected errors still propagate.
Queue priority, manual override and expiring reviewer presence are implemented below.

## Open Queue and triage (Package 3)

The first Complaints group at `/:locale/attention?mode=complaints&group=group1`
is the open-Case Queue. `forum.complaint.review` independently admits it and the
header Attention link; Signals or Security permissions do not imply this capability,
and complaint review does not grant their queues. Appeals/History groups remain
explicit placeholders. Every private loader/action independently checks the current
session and effective permission; presentation flags are not authority.

One SQL statement aggregates all eligible open Cases, counts independent reports,
summarizes all eight reasons and first/latest report times, and returns a bounded
25-Case page plus one lookahead. Its total counts every eligible Case, including on
empty/out-of-range pages; it is never derived from the page. Ordering is effective
priority descending, first report time ascending, then Case ID. Offset pages are
bounded to 0–10000; concurrent submissions/priority changes can move Cases between
requests, so pagination does not claim a cross-request snapshot.

Automatic priority is the maximum of the **current persisted global reason weights** of
all reports in the Case. Initial/default values are:

| Priority | Reasons |
| --- | --- |
| Low (1) | Spam / advertising, Other |
| Normal (2) | Harassment, Impersonation |
| High (3) | Threats, Fraud / phishing, Malicious content, Personal data |

`/:locale/attention/complaints/settings` is a real localized read/edit form for all eight
weights, each Low / Normal / High. Both read and write independently require current
`forum.complaint.priority.manage`; Case review alone does not grant settings access.
Initial grant is built-in admin only; custom roles and per-user overrides use the existing
authorization model. The Attention header entry admits management-only actors and sends
them to settings without querying Cases. Reviewers with management permission also get a
settings link in Complaints. Management does not grant Case, Signals, Security or admin
shell admission.

The domain-specific singleton `forum_complaint_priority_settings` stores the complete
JSON weights and a positive version. SQL and service validation require exactly all eight
known reasons and integer levels 1–3. One atomic full-map UPDATE compares the expected
version and advances it; concurrent/stale saves (including a retry after an acknowledged
or ambiguous successful commit) return 409. Reload settings to inspect current values
before saving again. A failed command cannot partially change the map. There is no
process-local cache, generic settings framework or automatic history rewrite.

Queue/triage aggregate the persisted weights in their single read snapshot; existing and
new open Cases use the updated maximum and ordering on the next read. Settings changes
leave reports, Case versions/overrides and immutable complaint events untouched; they do
not create admin History events. These are current configuration values, not a historical
priority record. Runtime ACL is SELECT/UPDATE only; migration seeds the singleton.

Report volume never increases priority by itself. A reviewer may choose any of the
three levels or return to Automatic. The nullable override persists when later
reports arrive; clearing it uses the current automatic maximum. Priority affects
processing order only, never a decision or sanction. The existing actor mutex,
Case row lock, expected version and operation fingerprint/replay protect overrides.
Each accepted command atomically advances Case version and appends an immutable
`priority-changed` event retaining the chosen override (null means Automatic);
event failure rolls back the change. Resolved Cases reject new overrides.

Queue rows link to `/:locale/attention/complaints/:caseId`, a protected, open-only
triage view with the same bounded summary, a topic/post context link and priority
control. Context includes bounded current topic title and reported-revision excerpt
with source-locale metadata. Registered source direction determines block `dir`;
`und` or unknown direction falls back to `auto`, independently of UI locale.
It does not expose report explanations, reporter IDs,
notes, Decisions, evidence downloads or Quick actions. These require the later full
Case review package. Queue projection never joins reporter accounts, even if the
actor also has the separate identity-read permission.

The triage view renews supplemental activity by authenticated same-origin POST every
30 seconds while visible. `(case, reviewer)` rows expire after 90 seconds of database
time. Multiple reviewers may renew simultaneously; activity changes neither Case
version nor ownership. Only a boolean "other reviewers active" is projected, excluding
the viewer. Hiding/leaving the view sends a best-effort expiry; lost requests, crashes
or abandoned tabs still expire without a cleanup job or writes on GET. Permission
revocation prevents renewal on the next request; any existing indication expires
within its lease. No assignment or exclusive lock exists. Expired rows are ignored,
not interpreted as permanent activity.

Priority/activity writes bound URL-encoded input to 4096 bytes and derive actor/Case
from session/path. Document/data responses are private/no-store. Known dependency
failures fail closed as 503, distinct from 401/403/404/409; unexpected errors propagate.
Activity is supplemental and cannot block authorized triage. No Signals/Security,
ordinary admin History, notifications, review/decision/notes UI or appeals behavior
is added by this package.

## Transactions and replay

Submission serializes on content, then actor (`FOR NO KEY UPDATE`, compatible with
FK KEY SHARE), then Case. Target creation is serialized by the content lock and
protected by unique constraints; immutable targets need no extra UPDATE privilege.
Other commands take actor then Case, never Case then actor. Asset references take
the existing active-ref lock in stable asset order. Locks are transactional, not
advisory or long-lived moderator locks.

Each accepted command appends a typed event with a private actor/operation key and
SHA-256 input fingerprint. Same-operation identical retries return the recorded
entity; changed retries conflict. Lifetime duplicate reports can return their
existing record without an additional event. Counts are independent reporters, not
votes. Additional reports and notes advance Case version. Resolution compares the
expected open Case version and atomically inserts Decision, closes Case and records
event. A deferred owner-matching FK ensures a resolved Case has its own Decision.
There are no implicit sanctions or after-commit notification promises.

Timestamps use database statement time after lock acquisition. Failed evidence or
event persistence rolls back the whole command. Unknown transport/commit failures
are propagated; callers may retry the same operation key, never blindly create a
new command. The submission adapter classifies known dependency failures;
arbitrary database/programming errors must not become empty data or permission denial.

## Permissions and projections

The existing DB-backed PermissionResolver and role/user overrides remain authoritative.
All five complaint keys have real server service capabilities:

| Key | Authority | Initial grants |
| --- | --- | --- |
| `forum.complaint.create` | Submit a report | user, moderator, admin |
| `forum.complaint.review` | Case read, note, initial decision | moderator, admin |
| `forum.complaint.priority.manage` | Read/change global reason priorities | admin |
| `forum.complaint.reporterIdentity.read` | Additional identity projection on an otherwise accessible Case/Appeal | None |
| `forum.complaint.appeal.review` | Read relevant appeal Case and resolve Appeal | moderator, admin |

These are initial grants, not role-name checks. The identity key is explicitly
excluded from the built-in admin seed; access managers can grant it separately.
Identity permission alone does not grant Case access. Help/Security/admin-action
permissions do not imply complaint permissions. Role grants, custom roles and user
`allow | deny | inherit` changes apply on the next service call/request.

Case and Appeal reads derive both the required review permission and the additional
identity flag from one internally consistent effective-permission snapshot. The
ordinary authorization capability creates a fresh resolution handle per operation,
even when the capability is reused between service calls. The Hyperdrive adapter
retains its request-local snapshot; a new request creates a new capability. Neither
path combines separate permission reads across committed authorization states.

Ordinary reviewer SQL selects no reporter/appellant account fields. Elevated SQL
explicitly joins the identity projection only after the separate permission check.
Reports expose report ID/reason/explanation/time; events expose ID/kind/time, not
actor/operation/fingerprint. Appeal projection omits appellant identity by default.
Content authors and moderator-note authors are distinct from confidential reporters.
Aggregate independent-reporter count is moderation-only. Free-text explanations
can contain voluntarily disclosed names; structured identity is still withheld.

Participant result reads recheck content-author or actual reporter membership and
return only Case/Decision identity, binary outcome and public reasoning. They never
return other complaints, moderator notes, reporter list, private history or sanctions.
Future response serialization/cache handling must preserve `private, no-store`.
Case reports/notes/events are independently paginated in bounded pages of 50; evidence
metadata is bounded with an explicit has-more indicator. There is no unbounded queue.

## Appeals: implemented foundation and deferred policy

The content author can persist a first Appeal of a confirmed Decision; an actual
reporter can persist a first Appeal of a rejected Decision. Decision/Case ownership,
participation and direction are checked server-side. Actor/operation replay does
not consume another slot. Review preserves argument, original Decision and result;
the original reviewer is not absolutely forbidden from resolving an Appeal.

Storage permits up to three ordinal records per concrete initial Decision:
CHECK `1..3`, UNIQUE Decision+ordinal, composite Case+Decision FK. It intentionally
has no unique-pending index. The service guards subsequent appeals with
`ComplaintPolicyRequiredError` pending Package 6's transition table. Thus no choice
about concurrent pending appeals, reversal/re-appeal eligibility or effective-outcome
precedence is silently installed. First results are persisted as `upheld | overturned`;
Package 1 does not derive a new effective Decision or reset quotas from those results.
The eventual public appeal workflow must resolve this policy and notifications first.

## Verification and external boundary

New migrations are forward-only and update schema/journal/snapshot, structural manifest
and repository web ACL contracts. Tests use disposable local PostgreSQL 17, including
native concurrency, rollback, permission freshness, evidence retention and privacy.
Repository ACL changes are not external GRANTs. No production migration, credential,
bucket, provider, deployment, shared Quick actions or public rollout is implied.

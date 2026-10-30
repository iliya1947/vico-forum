# Complaints

This is the permanent complaints-domain contract. Product decisions and staged
delivery are recorded in service PR #254; this document records implemented
Package 1 behavior. It does not claim a submission, queue, notification or appeal UI.

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
input before calling the trusted PostgreSQL repository. It is not an HTTP API.
No browser-provided role, boolean access flag, author identity or reporter identity
may be forwarded as authority. Future HTTP writes must independently require
session, current permission, same origin, request bounds and the submission budget.
No routes or Worker runtime capability are enabled by this package.

## Reported target and evidence

Targets are `post` or `topic-title`, including separate first-post/title identities.
Composite foreign keys bind the target to its exact topic, content owner and existing
immutable forum revision. An unconstrained polymorphic ID is not used.

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

The approved path of a later revision after resolution creates a new Case.
Two incident-grouping choices are deliberately unresolved: a new reporter on the
same revision after closure, and a newer revision while its predecessor is open.
The service returns `ComplaintPolicyRequiredError` for these paths, without writes.
Storage uses a partial open-target unique index, not an irreversible one-Case-ever
constraint. These guards require a product decision in Package 2. They are not
represented as a permanent product rejection policy.

Package 2 must add a complaint-specific durable burst/window budget before exposing
submission. No per-actor 5-second forum cooldown or guessed quota is installed here.
The domain is currently server-only; it must not be exposed without this gate.
Automatic priority, manual override and expiring reviewer presence are Package 3.

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
new command. Availability adapters can classify known dependency failures later;
arbitrary database/programming errors must not become empty data or permission denial.

## Permissions and projections

The existing DB-backed PermissionResolver and role/user overrides remain authoritative.
All four new keys have real server service capabilities:

| Key | Authority | Initial grants |
| --- | --- | --- |
| `forum.complaint.create` | Submit a report | user, moderator, admin |
| `forum.complaint.review` | Case read, note, initial decision | moderator, admin |
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

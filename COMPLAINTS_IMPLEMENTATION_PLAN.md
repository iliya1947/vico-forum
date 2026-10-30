# Complaints system implementation plan

> Service/planning document for the Vico Forum complaints system. The complaints system remains separate from Signals, Security and the global Admin panel. Implementation is delivered through separate bounded implementation PRs merged sequentially into `main`; this PR remains the working planning/service record for the complaints system.

## 1. Approved product model

A complaint is a report by one authenticated user about a possible violation. It is not itself proof of a violation and does not automatically cause an administrative action.

The complaints domain separates:

1. **Complaint** — one user's report.
2. **Case** — the moderation work unit for one incident.
3. **Decision** — whether the reported violation is confirmed.
4. **Appeal** — a challenge to a concrete decision.

Administrative actions are **not** owned by the complaints domain. A complaint case exposes the same shared **Quick actions** that are available elsewhere in forum administration. Those actions keep their own authoritative backend operations, permissions, state validation and administrative-history behavior.

The complaints system remains separate from:

1. **Signals** — Help/content-quality workflows.
2. **Security** — system/security events such as suspicious attachments.
3. **Admin panel** — global forum administration planned in PR #251.

## 2. Approved complaint submission rules

### 2.1 Who may submit

Only authenticated users may submit ordinary complaints.

### 2.2 Complaint targets

The first version supports complaints about:

1. a **message/post**;
2. a **topic title**.

A topic's first message remains a normal post and is reported separately from the topic title. A complaint therefore targets exactly one content unit.

The complaint is bound to the immutable revision that was current when the complaint was submitted. Later edits do not erase or replace the reported content.

### 2.3 Complaint reasons

Approved reasons:

1. Spam / advertising.
2. Insults / harassment.
3. Threats.
4. Fraud / phishing.
5. Malicious content.
6. Personal data.
7. Impersonation.
8. Other violation.

An explanation is optional for the standard reasons and required for **Other violation**.

### 2.4 Withdrawal

A submitted complaint cannot be withdrawn by the reporter. It remains in the system until the case is resolved.

## 3. Case model

Multiple complaints about the same open incident are kept as separate Complaint records but are grouped into one Case.

The grouping boundary is the concrete reported content revision. Different revisions of the same post/topic title therefore use separate Cases rather than mixing complaints about different content states.

If a Case for the same concrete revision has already been resolved and another user later submits a complaint about that same revision, the complaint creates a **new Case**. The earlier Case remains closed and immutable. The new Case must keep an explicit link/reference to the related closed Case so the moderation team can see the prior handling of the same revision without reopening or mutating the earlier Case.

If a newer revision is reported while a Case for the previous revision of that same content unit is still open, the newer revision also creates a **separate new Case immediately**. The new Case must keep an explicit link/reference to that previous-revision Case. The earlier Case stays open and unchanged; complaints about the newer revision are not appended to it and are not blocked until it closes.

The case must preserve enough state to review:

1. the reported revision;
2. the current content state;
3. all complaints grouped into the case;
4. complaint reasons and explanations;
5. case priority;
6. moderation notes;
7. decision history;
8. appeals and appeal results.

The number of complaints is context for review, not a vote and not a trigger for automatic punishment.

## 4. Reporter privacy

Reporter identity is confidential from ordinary complaint reviewers by default.

A separate elevated code-backed permission is required to read reporter identities. Ordinary reviewers receive only the complaint content needed for the case and aggregate/independent-reporter information, not hidden reporter identifiers.

Reporter identity must be filtered server-side; hiding it only in presentation is insufficient.

## 5. Priority

Case priority is assigned automatically according to the complaint reason. A reviewer may override the resulting priority manually.

Priority affects processing order only. It does not imply that a violation has been proven.

The exact reason-to-priority mapping is part of the implementation contract and must remain simple and deterministic.

## 6. Moderator activity and notes

Cases are **not assigned** to one moderator.

Any actor with the required effective permission may review the case. The moderation team must nevertheless see when another moderator is currently working with the case.

This is an activity/presence indicator, not an exclusive lock or ownership assignment. It must not remain permanently stuck after the reviewer leaves.

Cases also support private internal moderator notes. These notes:

1. are visible only to authorized moderation actors;
2. are separate from user-visible decision reasoning;
3. record author and time;
4. are not a general chat system.

## 7. Decision and Quick actions

The complaints domain owns only the complaint decision:

1. violation confirmed;
2. violation not confirmed.

Administrative measures are separate.

Inside a complaint case, the moderator receives the shared **Quick actions** appropriate to:

1. the target object;
2. its current authoritative state;
3. the actor's current effective permissions.

The complaints system must not create parallel complaint-specific hide/block/delete/etc. mutations.

If a particular administrative operation from PR #251 is not yet implemented, the complaint system must not emulate or duplicate it merely to make the case UI appear complete.

## 8. Result notifications

After a decision, the reporter is told:

1. whether the complaint was confirmed or rejected;
2. when applicable, a generic statement that administrative measures were taken.

The reporter is not shown specific sanctions applied to another user.

The affected content author receives the decision information relevant to their content and the available appeal path.

Moderation-result notifications should use the forum's common notification surface rather than a separate complaints-only inbox.

## 9. Appeals

Both sides may appeal in the applicable direction:

1. the content author may appeal a confirmed violation;
2. the reporter may appeal a rejected complaint.

A decision may receive up to **three appeals**.

Each appeal is bound to the concrete case and decision. Review must preserve the original decision, appeal argument and prior appeal history.

Where possible, a moderator should not review an appeal against their own decision. The system must not deadlock when no other eligible reviewer exists.

Appeal results must be persisted into the case history and reflected in notifications.

## 10. Needs attention integration

The existing protected moderation center at `/:locale/attention` remains the complaints working surface.

The Complaints mode replaces the current placeholders with:

1. **Queue** — open complaint cases.
2. **Appeals** — complaint appeals awaiting review.
3. **History** — resolved complaint cases and their lifecycle.

The queue displays Cases, not individual Complaint rows.

## 11. Authorization

The system reuses the existing dynamic permission model and server-side PermissionResolver.

New code-backed permissions are introduced only together with real complaint capabilities. The required capability families are:

1. submit complaints;
2. review complaint cases;
3. read reporter identities;
4. review complaint appeals.

Shared administrative Quick actions retain their own permissions and do not inherit authority merely because an actor may review complaints.

Role names are not authorization evidence. Role grants and per-user `allow | deny | inherit` overrides remain authoritative on the next request.

## 12. Anti-abuse boundaries

The submission path uses the forum's existing authenticated, same-origin/server-validated write principles with complaint-specific anti-abuse rules.

The first version must:

1. prevent meaningless duplicate complaint spam by the same reporter against the same revision;
2. rate-limit abusive complaint submission without treating normal rapid reports of different content as duplicates;
3. never auto-punish content or users only because a report count threshold was reached;
4. keep report counts private from ordinary public users;
5. preserve rejected complaints as normal good-faith outcomes unless separate evidence shows abuse.

## 13. Implementation sequence

Implementation is split into separate bounded implementation PRs. Each dependent package begins after the preceding required package has been reviewed and merged into `main`.

### Package 1 — complaints contract and domain foundation

1. Add permanent source-of-truth documentation for the complaints system.
2. Add the Complaint, Case, Decision, moderator-note and Appeal persistence/domain boundaries needed by the approved lifecycle.
3. Support separate post and topic-title targets bound to immutable revisions.
4. Add the approved complaint reasons and explanation rules.
5. Add only the complaint permissions required by implemented capabilities.
6. Add repository/service integration tests for grouping, revision identity, privacy and lifecycle invariants.
7. Do not add user-facing complaint UI yet.

**Done when:** the complaint domain can persist and read the approved lifecycle safely, with permission boundaries and native database tests, without presentation dependencies.

### Package 2 — user complaint submission

1. Add **Report** next to each applicable post.
2. Add a separate **Report** action for the topic title.
3. Add the approved reason/explanation form.
4. Require authentication and current effective submit permission.
5. Validate target identity and authoritative current revision server-side.
6. Create a new Case or append a Complaint to the applicable open case. A newer revision never joins the Case of an older revision; if the older-revision Case is still open, create a separate Case for the newer revision with an explicit link to that prior Case.
7. Prevent duplicate spam by the same reporter on the same revision.
8. Add complaint-specific rate limiting.
9. Keep the user in topic context after successful submission and show confirmation.

**Done when:** authenticated users can submit valid complaints against posts or topic titles and the correct Complaint/Case records are produced.

### Package 3 — Complaints queue

Replace the first Complaints placeholder in **Needs attention** with the real Queue.

1. Read only open Cases allowed by the actor's effective permissions.
2. Show target type/context, reason summary, independent report count, first/last report time, priority and case state.
3. Add automatic reason-based priority plus moderator override.
4. Add the non-exclusive "someone is working on this case" activity indicator.
5. Reuse bounded pagination/count patterns without page-bound count corruption.
6. Keep Signals and Security isolated.

**Done when:** the moderation team can triage and open real complaint cases from the protected queue.

### Package 4 — case review, notes and decision

1. Implement the full complaint Case view.
2. Show the reported immutable revision and current content state.
3. Show surrounding topic context required for review.
4. Show all complaints, reasons and explanations grouped into the Case.
5. Enforce reporter-identity projection server-side.
6. Add internal moderator notes with author/time.
7. Persist **confirmed / not confirmed** decisions separately from administrative actions.
8. Connect the existing/shared Admin **Quick actions** surface from PR #251 where available.
9. Never create complaint-specific copies of administrative mutations.

**Dependency rule:** if the required shared Quick actions boundary has not yet been implemented, the complaint project must either wait for that dependency or integrate it later; it must not create a parallel temporary action system.

**Done when:** a reviewer can inspect the complete case, collaborate through notes and resolve the complaint while administrative actions remain shared with the forum's general admin system.

### Package 5 — history and notifications

1. Replace the Complaints History placeholder with resolved cases.
2. Persist/present the complaint-specific lifecycle: incoming complaints, priority changes, review activity, notes, decisions and later appeals.
3. Add moderation-result notifications to the common forum notification surface.
4. Tell the reporter confirmed/rejected plus only the approved generic administrative-measures message.
5. Notify the affected content author about the decision and available appeal path.
6. Keep shared Quick-action administrative history in its existing admin-history domain rather than duplicating it inside complaint sanctions.

**Done when:** resolved complaint work is traceable and both affected sides receive the approved information.

### Package 6 — appeals

Replace the Complaints Appeals placeholder with the real appeal workflow.

1. Allow the content author to appeal a confirmed violation.
2. Allow the reporter to appeal a rejected complaint.
3. Enforce the maximum of three appeals per decision server-side.
4. Show the original decision, current appeal argument and previous appeal history.
5. Prefer a different reviewer from the original decision-maker without creating a no-reviewer deadlock.
6. Persist appeal outcomes into the Case history.
7. Send the corresponding common-surface notifications.
8. Preserve the same reporter-identity privacy boundary.

**Done when:** both sides can use the approved appeal lifecycle and the three-appeal limit cannot be bypassed.

### Package 7 — integration and closeout

1. Verify topic-title and first-post complaints remain separate.
2. Verify multiple reporters produce separate Complaints but one applicable open Case.
3. Verify later content edits do not destroy reported revision evidence.
4. Verify a later incident/revision creates a separate linked Case both after an earlier Case closes and while a previous-revision Case is still open; the prior Case is not mutated or reused.
5. Verify reporter identities never leak without the elevated permission.
6. Verify role grants and per-user overrides for every complaint capability.
7. Verify anti-abuse rules do not block valid complaints about different content.
8. Verify automatic priority and manual override.
9. Verify the activity indicator never becomes an assignment/lock and does not become permanently stale.
10. Verify Quick actions in Cases use the authoritative shared admin operations.
11. Verify complaint decisions do not implicitly create administrative sanctions.
12. Verify the three-appeal limit and both appeal directions.
13. Verify Queue, Appeals and History pagination/count behavior.
14. Cover applicable EN/RU/HE, LTR/RTL and negative permission states.
15. Update permanent documentation and `PROJECT_STATE.md` only with factual implemented state.
16. Run the repository CI and required independent review cycle on each implementation PR.

**Done when:** the entire complaints lifecycle works end-to-end without duplicating Signals, Security or Admin-panel domain behavior.

## 14. Explicitly out of scope

1. Merging Complaints with Signals.
2. Merging user complaints with Security events.
3. A second role/permission system.
4. Complaint-owned copies of administrative Quick actions.
5. Automatic punishment based on complaint count.
6. AI deciding whether a complaint is valid.
7. Reputation/trust scores for reporters.
8. Public complaint counts.
9. Account deletion.
10. A separate complaints notification inbox.
11. Stage 6 external rollout merely because complaints are implemented.

## 15. Service-PR usage

This planning PR is the working service record for the complaints-system project.

1. Keep the approved product decisions and implementation sequence in this file.
2. Use separate bounded implementation PRs for actual application/schema changes.
3. After each implementation package is merged into `main`, update this plan's progress/status as needed.
4. Do not merge this service/planning PR into `main` merely to deliver an implementation package.

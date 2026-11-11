# Блок D — Ordinary Admin & moderation audit

## Проверенный baseline

1. Audit target: current main `e279cb6c032a489a9044ca1191407df887c364b4`.
2. Ordinary Admin AP-01–AP-11 и Complaints Packages 1–6/Package-7 closeout присутствуют в repository/local-CI; production/deployed acceptance не подразумевается.
3. Block D проверяет domain-specific применение уже проверенного authorization engine: global Admin, Forum moderation, History, Users/Measures, Needs attention Signals/Complaints/Security.
4. Owner-only authorization mutation и generic permission-resolution internals не переаудируются без нового противоречащего evidence; это Block C.
5. Super-admin/Owner Worker architecture не входит; это Block A/будущие SA-security области.
6. Findings только фиксируются в #315. Remediation/implementation не начинается без отдельной команды владельца.

## D1 — Global Admin admission / cross-surface isolation

Проверить:

1. `/:locale/admin` допускает только actor с хотя бы одной реализованной ordinary-Admin capability.
2. Own-only participation и Attention-only permissions не дают global Admin.
3. Child loaders/actions recheck свой permission независимо от shell/parent admission.
4. Forum/Users/History/Roles/Measures capabilities не дают соседние private reads транзитивно.
5. Query/object validation не выполняет protected read до actor admission.
6. Revocation/sanction действует на следующий protected request.
7. Redirect/Under-development compatibility paths не расширяют authority.
8. Protected responses остаются private/no-store.

## D2 — Admin Forum browsing / object privacy / IDOR

Проверить:

1. Category/section/topic loaders допускают actor только по реализованному Forum-admission union.
2. Arbitrary category/section/topic IDs не раскрывают объект до admission и authoritative membership checks.
3. Search/cursor/paging validation не позволяет unbounded/private enumeration.
4. Admin DTO не включает email, Complaints Case data, unrelated History, prior revision bodies или service-section public route.
5. Reserved Help/service section не превращается в ordinary public section.
6. Stale/missing objects и dependency failures fail closed без cross-object data reuse.

## D3 — Shared Quick actions / moderation mutation boundaries

Проверить canonical direct HTTP/service paths для:

1. pin/unpin;
2. administrative solved/best-answer;
3. Help solution moderation/outdated;
4. duplicate confirm/remove/appeal resolve;
5. source-locale correction;
6. close/reopen;
7. message revision-history read.

Для каждого проверить exact permission, session actor, same-origin, target membership/state, expected revision/version/relationship IDs, replay/no-op, Own-vs-Any scope, stale account/grant and single authoritative History effect.

## D4 — Ordinary Admin History confidentiality / integrity

Проверить:

1. `admin.history.read` independently protects History and Overview recent actions.
2. History read does not grant any recorded action.
3. Events contain bounded actor/target/change context only; no email/password/session/token/body/private Case explanation leakage.
4. Cursor/order/position cannot skip authorization or cross into unrelated private data.
5. Connected producers append atomically with domain mutation and do not double-emit nested Quick-action effects.
6. Denied/no-op/replay/rollback paths produce no fabricated significant event.
7. History outage/error classification follows the private fail-closed contract.

## D5 — Users read surface / targeted authorization composition

Проверить:

1. `admin.users.read` independently protects index/detail.
2. Index/detail expose only approved public profile/statistics projection; email is not selected/searchable.
3. Targeted authorization snapshot appears only when `access.authorization.manage` is additionally effective.
4. Management-only actor does not gain Users directory; Users-read actor does not gain authorization snapshot/writes.
5. Forged user ID cannot select actor authority or leak another capability family.
6. Revocation during mounted detail/recovery cannot replay mutation or retain protected payload across actor/grant changes.

## D6 — Administrative measures / AP-10 enforcement

Проверить:

1. Measure manager admission, exact target/measure binding and no self/Owner target.
2. Raw hierarchy, `managePrivileged`, issuer floor and strict-rank checks on create/change/lift/appeal review.
3. Administrative restriction families suppress exactly their documented permissions and do not rewrite raw RBAC.
4. All affected ordinary actions (topics/replies/attachments/posts/profile/complaints/help-signals/translations) independently enforce fresh active restrictions.
5. Expiry/lift/change/overlap semantics, appeal quota, pending uniqueness and Owner immunity.
6. CAS/version/operation replay/concurrency and atomic History.
7. Alternative route/domain entrypoints cannot bypass the same measure policy.

## D7 — Attention mode/group cross-capability isolation

Проверить:

1. Signals, Complaints and Security modes admit only their own capability families.
2. `mode`/`group`/pagination query cannot pivot actor into an unauthorized queue.
3. Default-mode/header routing does not imply authority.
4. Complaint priority-only actor reaches only priority settings; appeal-review-only actor reaches only Appeal surfaces.
5. Direct child routes/actions recheck permission even if Attention loader/header previously exposed a link.
6. Revocation/administrative restriction removes access on next request.

## D8 — Help Signals moderation workflow

Проверить:

1. Persisted signal kind, not client-selected permission, determines required review authority.
2. Actor without any relevant Help-review capability cannot use arbitrary private signal/case ID to read or mutate.
3. Accept/reject validates current target/case applicability and stale state before side effects.
4. Kind-specific domain effect uses the existing authoritative forum operation rather than a weaker second writer.
5. Replay/no-op/rollback produce one or zero History events as specified, never duplicate nested events.
6. Signal submission/withdrawal remains separate participant behavior and is not promoted to admin History solely by actor role.

## D9 — Complaints reviewer privacy / capability separation

Проверить queue, triage, full review, History, Appeals queue/review/context/evidence and priority settings:

1. `review`, `appeal.review`, `priority.manage`, `reporterIdentity.read` remain independent.
2. Identity permission is additive only and never grants Case/Appeal access itself.
3. Ordinary reviewer projections omit reporter/appellant identity/account fields unless explicitly authorized; email/session data is never selected.
4. Case/appeal/context/evidence IDs are membership-bound; arbitrary cross-Case asset/post/appeal IDs return denial/not-found.
5. Retained evidence never exposes storage keys and uses protected attachment/no-store response semantics.
6. Resolved/open/pending queue membership and direct URLs cannot bypass lifecycle admission.

## D10 — Complaints mutations / replay / concurrency / notifications

Проверить:

1. Priority override/settings, reviewer activity, note, Decision and Appeal resolution use session actor + same-origin + bounded canonical input.
2. Version/operation-key/fingerprint replay cannot duplicate reports, notes, Decisions, events or notifications.
3. Actor/content/Case lock ordering and target-revision binding prevent stale/newer-content retargeting.
4. Initial Decision remains immutable; Appeal effective outcome changes do not rewrite it.
5. Notification fanout is transactionally coupled and participant membership gates result pages.
6. Complaints Decisions/Appeals never implicitly create administrative measures or shared Quick-action outcomes.
7. Concurrent submissions/reviews do not over-admit rate limits, duplicate pending appeals or bypass one-open-Case invariants.

## D11 — Security attachment moderation surface

Проверить:

1. `forum.attachmentSecurity.read` independently gates Security/attachments queue.
2. Signals/Complaints/Admin permissions do not imply Security access.
3. Event pages expose only intended upload/security metadata, no private object key or unrelated draft/content data.
4. Paging and object IDs are bounded and cannot cross-account attachment ownership/resource membership.
5. Storage unavailability and stale/revoked permission fail closed; no mutation authority follows from read access.

## D12 — Stale UI / failure / cache boundaries across Admin & moderation

Проверить:

1. Cached/fetcher responses cannot cross actor, target, permission, Case/measure/revision/version context.
2. Stale 403/404/409 recovery performs bounded revalidation only and never automatic mutation replay.
3. Typed dependency outages may become controlled 503; unexpected programming/schema/config errors propagate.
4. Optional presentation degradation never replaces the protected action/loader check.
5. Administrator UI preferences, hidden controls and client-side pending state never become authority.
6. Cross-request caches do not retain private moderation payload or obsolete permissions.

## Порядок фактической проверки Block D

1. D1 Global Admin admission / cross-surface isolation.
2. D7 Attention cross-capability isolation.
3. D3 Quick actions / moderation mutations.
4. D6 Administrative measures enforcement.
5. D9 Complaints reviewer privacy.
6. D10 Complaints mutations/replay/concurrency.
7. D8 Help Signals moderation.
8. D11 Security attachment moderation.
9. D4 Admin History.
10. D5 Users composition.
11. D2 Admin Forum browsing/privacy.
12. D12 Stale UI/failure/cache closeout.

## Критерий завершения Block D

1. Ordinary Admin и moderation protected surfaces проверены по actual route → service/capability → DB/storage path.
2. Cross-capability isolation доказана для прямых URLs/actions, а не только navigation/UI.
3. Private moderation identities/evidence/history не раскрываются через соседние permissions или forged target IDs.
4. Domain mutations сохраняют permission, lifecycle, replay/CAS/concurrency и atomic-History contracts.
5. Findings имеют current-stage impact/classification; remediation остаётся вне audit stage без отдельного решения владельца.

## Текущий итог аудита Block D — Ordinary Admin & moderation

1. D1 Global Admin admission / cross-surface isolation — PASS.
2. D7 Attention mode/group isolation — PASS.
3. D3 shared Quick actions / moderation mutations — PASS.
4. D6 administrative measures / AP-10 — PASS.
5. D9 Complaints privacy — **`COMPLAINT-PRIV-01 Low/P3`**: Complaint Case/Appeal review сериализует private Help `duplicateRelationshipId` без `forum.helpDuplicate.manage`; mutation authority не расширяется.
6. D10 Complaints mutation/replay/concurrency/notifications — PASS.
7. D8 Help Signals — **`HELP-SIGNAL-PRIV-01 Low/P3`**: public topic Signal-review action читает private Signal по arbitrary ID до Help-review permission, создавая existence/topic-membership oracle; private body и mutation authority не раскрываются.
8. D11 Security attachment moderation — PASS.
9. D4 Admin History — **`HISTORY-PRIV-01 Low/P3`**: AP-10 replay `operationId` и SHA-256 `fingerprint` попадают в browser-visible History/Overview loader data, хотя UI считает их internal-only; authority не расширяется.
10. D5 Users read / targeted authorization composition — PASS.
11. D2 Admin Forum browsing / privacy / IDOR — PASS.
12. D12 internal code-path review не выявил дополнительного current-scope defect, **но финальный D12 closeout не считается подтверждённым**: предыдущая запись опиралась на внешнее утверждение о React Router, которое фактически не было проверено по официальной документации.
13. До повторной внешней проверки **Block D не считается окончательно закрытым**. Три подтверждённых findings D9/D8/D4 сохраняются независимо от D12.
14. Remediation/implementation по Block D не назначены.

---

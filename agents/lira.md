# agents/lira.md — B6-B2 authored, STOP before B6-B3

## Accepted foundation

- B5 #367 coordinator PASS exact `a2269fb0294feaccb433e76b66e800f3e869658d`.
- B6 #370 branch `feature/moderation-visibility-b6-guarded-queue`.
- B6-A exact `91cb332d6acf60ebf572f57582c13acfeab8eada` received **Mira bounded coordinator PASS**.
- B6-A private queue/admission/cursor/no-store and the scoped ordinary-admin hidden-title/count correction are accepted. Do not reopen them without new evidence.
- Owner has now authorized **B6-B only**. B7/actions, schema/migrations, production/deploy and merge remain blocked.

## Latest bounded result — B6-B2 (STOP)

- #370 exact head `0dc07cee0c42311048daf8f53555e64be55c6296`; B6-A accepted base unchanged. B6-B2 includes separate dual-permission hidden **post** revision reader (not topic-title history), with exact post→topic membership, fresh visibility+existing `forum.post.history.read` and active account/AP-10, explicit request-only 25+1 microsecond keyset, no source through base inspector.
- Inspector route now renders read-only EN/RU/HE view; the gated history section displays escaped original text only after double admission, and UI links remain private AdministrativeRouting paths. Queue links to inspector, 13 manually reviewed label translations and fixed English descriptor fingerprints added; ordinary Admin topic/public paths unchanged. Neutral private no-store error path/response retained.
- Route + real PG tests authored for capability combinations, history revocation, unavailable, membership, cursor/ties, inactive actor, EN/RU/HE keys, and no-store. Corrected the authored PG 25th-cursor expectation from .000004/004 to .000003/003. 15/15 static source assertions PASS; **Vitest/PG/CI/real browser not executed; no runtime PASS claim**. PR remains Draft/unmerged.
- **STOP.** Next only B6-B3 after separate owner `...`: private hidden assets + whole-B6-B author self-check and applicable exact-head CI/acceptance. B7/action/merge not authorized.

## Latest bounded result — B6-B1 (STOP)

- Implementation branch #370 exact `e429fa42f78877aab6583d07cfea6c4950a7fc91`; B6-A coordinator PASS base unchanged.
- Only B6-B1 read-only inspection added: `PostgresHiddenQueueReader.inspect` with fresh active actor/effective visibility grant via AP-10-restricted Worker authorization, target-scoped single-statement current snapshot and last exact visibility event matching target+version. Missing event when version>0 is an invariant error/503. DTO contains current status/version/changedAt/current revision ID, current post parent/topic flags, last action/time/reason — never hidden source/attachments/general History.
- Separate resource GET `/:locale/admin/forum/topics/:topicId/inspect` and optional `?postId=` for exact membership; own guard, strict query, neutral private no-store errors and outgoing AdministrativeRouting helper. Ordinary admin topic route/public readers untouched. No localized inspector UI, revision-history reader, private assets or B7 commands.
- Focused PG and React Router tests have been **added**, covering matching event vs irrelevant older History, absent event invariant, exact membership, inactive/revoked actor, generic Admin/History/Complaint denial, errors/cache/transport and outgoing path.
- Static inspection check completed (the single provisional failure was a false match to an import declaration; corrected guard-order verification is true). **Vitest/real PostgreSQL and exact-head CI were not executed**: no local repo/runtime access; whole-B6-B CI/acceptance belongs after B6-B3. Do not describe authored tests as passing.
- **Лира STOP.** B6-B2 requires separate owner continuation per service WORKFLOW; next B6-B2 stage adds guarded extra-capability history + localized inspector UI.

## B6-B packages

### B6-B1 — read-only inspector/current event

Result required: guarded private topic/post inspection on top of B6-A, with fresh effective `forum.content.visibility.manage`, active-account and AP-10 enforcement. It may expose only the private inspection data required by the accepted plan: current visibility state/version/current revision identifiers and last visibility event/reason. Generic Admin/history/Complaint/ordinary-author authority is not a proxy for this capability; existing public/ordinary Admin paths stay public-safe.

Add focused positive/negative/revoke/outage tests for this package, keep private responses `private, no-store`, update the service handoff and **STOP**.

### B6-B2 — revision-history boundary and inspector UI

Result required: hidden revision history is available only when the caller also has the existing history capability. Losing or lacking that extra capability must not grant history or weaken the base inspector boundary. Complete localized EN/RU/HE read-only inspector presentation and its private error/data/cache behavior.

Add focused permission/revoke/i18n tests, update the service handoff and **STOP**.

### B6-B3 — private hidden attachment access and B6-B closeout

Result required: private hidden attachment read/download under fresh visibility-management admission and exact attachment→post→topic membership, preserving the existing attachment view/disposition/nosniff/sandbox/type protections and AdministrativeRouting family. Public attachment behavior for hidden content remains unchanged; protected Complaints/evidence access remains its own authority and is not replaced by a blanket admin bypass.

Add focused asset/membership/revoke/cache tests. Then run one whole-B6-B author self-check plus the applicable exact-head CI/acceptance. If PASS, update #370/service handoff with the stable SHA and **STOP → Mira B6-B bounded checkpoint**.

## Guardrails

Do not implement B7 Hide/Restore POST intents, QuickActions, Restore controls, public tombstone actions or conflict UI in B6-B. Do not add schema/migrations/dependencies or Stage 6/external changes. If an actual current-B6-B defect outside these files blocks correctness, diagnose it under AGENTS rules and keep any correction minimal.

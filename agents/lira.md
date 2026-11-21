# agents/lira.md — moderation visibility B6-B active assignment

## Accepted foundation

- B5 #367 coordinator PASS exact `a2269fb0294feaccb433e76b66e800f3e869658d`.
- B6 #370 branch `feature/moderation-visibility-b6-guarded-queue`.
- B6-A exact `91cb332d6acf60ebf572f57582c13acfeab8eada` received **Mira bounded coordinator PASS**.
- B6-A private queue/admission/cursor/no-store and the scoped ordinary-admin hidden-title/count correction are accepted. Do not reopen them without new evidence.
- Owner has now authorized **B6-B only**. B7/actions, schema/migrations, production/deploy and merge remain blocked.

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

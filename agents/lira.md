# agents/lira.md — B8-B1 only; STOP after Worker/Better Auth transport packet

## Accepted base

- B8-A coordinator PASS on Draft #376 exact `a9ade36165c6af6767f7322d9f642bf24c68ca41`.
- Continue in existing B8 branch `feature/moderation-visibility-b8-acceptance`; no new implementation PR.

## Current assignment — B8-B1 only

Establish actual built-Worker + Better Auth HTTP acceptance for the visibility public/private transport boundary.

Done criteria:

1. Public transport: visible topic/post, topic Hide neutral 404, hidden-post tombstone, Restore, document/.data/single-fetch/legacy route aliases that hit this seam, with public no-store where required.
2. Leak scans: unique hidden title/body/translation/reason/private metadata sentinel absent from public HTML/data/error/meta/Original/status responses.
3. Private transport: queue/inspector/visibility actions are private/no-store; guest/ordinary/revoked current access fails closed without hidden source.
4. Use actual Worker/session/auth path, not mocked route calls. Reuse existing smoke infrastructure rather than duplicate B8-A PG races.
5. If a real current-stage defect appears, diagnose and correct only that bounded transport defect.
6. Run applicable Worker/Better Auth connected checks on the resulting exact head and update #342/#376.

Do **not** add local R2/download/private-asset acceptance yet; that is B8-B2. Do not start protected-domain/fault-injection B8-B3, Chromium B8-C, B9, fold, final reviews, merge or deploy.

**Mandatory STOP after B8-B1.**

# agents/lira.md — B7-A authored, STOP before B7 UI

## Accepted foundation

- B6 #370 coordinator PASS exact `51a9ebe03f16c438faae5bec99a5856287630958` (Mira), unchanged.
- New stacked Draft #371 base = B6 branch, head `dedaff7a7783df1a8666926a911c0f1790540ac9`, 7 commits / 4 files / behind 0; unmerged.

## B7-A result

- Canonical topic POST `setTopicVisibility` / `setPostVisibility` through dedicated `app/forum/visibility-actions.server.ts`; strict per-target scalar FormData and request/actor/fresh visibility capability. B2 transactional writers unchanged, retain AP-10/active actor/History/NO KEY UPDATE/CAS and allow hidden Restore without public lookup.
- Neutral no-store status/result contract and explicit safe success projection; 400 invalid (including transition reason), 401 inactive, 403 authority/measure, 404 missing, 409 stale, 503 typed storage/account/auth outages. Unexpected faults still propagate to existing route error boundary. No retry/source leaks.
- Scoped `app/forum/visibility-actions.test.ts` authored with case matrices for malformed and mixed intent/duplicate/File, topic/post Hide/Restore/no-op, early guard, permission/revoke, expired actor, AP-10, statuses. **21/21 static source checks PASS; Vitest/PG/CI not run.** Do not present authored tests as runtime-pass.
- **STOP** per direct owner B7-A-only assignment. Next B7 UI work requires separate owner continuation. No QuickActions, redirects, EN/RU/HE action presentation, pending/conflict/actor switch, full B7 CI, B8/merge/deploy.


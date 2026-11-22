# agents/lira.md — B7-B2b authored; STOP before B7-B3a

- B6 #370 accepted exact `51a9ebe03f16c438faae5bec99a5856287630958`. B7 stacked Draft #371 exact current head `378ac6fd056cc8545a8d9a2316fbf90d5a7053a7`, base B6 unchanged.
- B7-A/B1a/B1b/B2a previously authored; code/static checks recorded in WORKFLOW.md; none received B7 runtime Vitest/PG/browser/CI.
- B7-B2b changes only `app/forum/views.tsx` and `app/forum/public-read.test.tsx`, 3 commits, behind 0: publicly visible topic's sanitized hidden message stub contains a guarded private-inspection **link only for current visibility-granted same actor** (header actor must match server loader's watchActorId). Uses typed AdministrativeRouting `hiddenInspectionPath`, only topicId/postId, no version/revision/source, message-number aria-label. No control for guest, revoked/missing capability, stale/changed account or unknown actor. Existing private B6 reader/queue/inspector remain untouched and authoritative.
- Added focused EN/HE rendering, link query strictness, no raw content/CAS and 4 negative-gate variants. **23/23 static checks PASS; tests not run**, no runtime/whole B7 PASS.
- **STOP.** On owner `...` next B7-B3a successful topic Hide redirect from public to guarded private inspector, then STOP. 409/reload, pending/unknown/revoke/late responses separate B7 slices. No B8/merge/deploy.

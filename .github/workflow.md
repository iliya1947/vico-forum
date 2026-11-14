# Admin panel — current workflow

- **Service PR #331:** active Admin/Super-admin coordination; never merge. #251 archived.
- **Current main / K baseline:** `398dae18d5ca7c3fc6dd84fd93a29d7c381ba366`.
- **Package:** SA04-K attachment lifecycle admission, accepted Lev plan #6877583725 and Mira scope/fit PASS; bounded sequence K1 → K2 → K3 → K4 → K5.
- **Current gate:** **K1 Lira AUTHOR STOP** on stable exact cumulative implementation **Draft PR #332 `ad20fa37be4e0f887fc5ffac644f6304a9e1eb8f`**, open/draft/unmerged. This is author completion, **not Mira bounded PASS**.
- **K1 scope:** same-transaction AccountState on `admitUpload` and `createDraftAttachment` (scope/journal before actor); existing active stable-ID replay/AP10 fresh restriction/fenced metadata preserved; typed private 401/503 upload POST and fresh-key known-denial cleanup, no blind delete of unknown COMMIT outcome.
- **K1 evidence:** [CI 43599514990](https://github.com/iliya1947/vico-forum/actions/runs/43599514990) all SUCCESS: PG17 **935/935** (81 files, new K1 native 7/7, attachment fence/HTTP 22/22); app/unit **2282/2282** (185 files), lint/typecheck/build/migrations/Workers smoke PASS. Full Worker/real Better Auth/local R2/Chromium K lifecycle acceptance belongs to K5, not claimed.
- **Current actor:** **Mira — bounded K1 coordinator review** on exact `ad20fa37be4e0f887fc5ffac644f6304a9e1eb8f`. If PASS, activate **K2** in same cumulative #332 per continuation rule; K3–K5 inactive. If confirmed current-K1 findings, return one packet to Lira.
- **Lev:** planning complete / STOP until whole-K independent review or escalation. **Mark:** inactive. No merge/deploy, no K2 work before Mira PASS, no L–S, SA05, #315, docs or Stage6.

## Continuation rule for #331

- A single `...` continues the current workflow.
- After a bounded slice receives Mira PASS, Mira records it and activates the next prepared slice in the same turn.
- Stop only for a real blocker, required Owner decision, technical escalation or end of the prepared queue.

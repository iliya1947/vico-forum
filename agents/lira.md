# agents/lira.md — рабочая память Лиры по #342

## Текущее назначение — STOP → Мира B4 checkpoint

B1 #355 / B2 #357 / B3 #359 (Mira bounded PASS) remain Draft/unmerged. B4 [Draft #365](https://github.com/iliya1947/vico-forum/pull/365) on B3 `cde5219046dcac9cbde3d62c4eb819fcfd2f6e91`, stable exact **`97b9187cc42e5479c5cab43d9f69a9bfa6ed8a9e`**. **Лира B4 author self-check PASS.**

## B4 delivered scope / evidence

- One production SQL reader (`db/forum-attachments.ts::readPublishedAttachment`): exact publication membership plus `post.isHidden=false` and `topic.isHidden=false` before public `bucket.get`. Existing download/inline/text and private draft/Complaint paths unchanged.
- 3 test files: real PostgreSQL+HTTP neutral hidden/missing/no bucket GET, shared visible and owner draft, evidence-only Case ref survives Hide/cleanup/Restore; title and body accepted tasks finish private revision-bound translation after separate PostgreSQL Hide commit during provider execution, new plans denied without effects and Restore no additional work. Inherited B2 planning gates and PG lock race barriers unchanged.
- [Final CI #44909767945](https://github.com/iliya1947/vico-forum/actions/runs/44909767945) **SUCCESS**: unit **2782/2782**, PostgreSQL **1604/1604**; lint/typecheck/build/smoke pass. Applicable exact-head workflows **9/9 SUCCESS**, SA04-K5 Worker/R2/Chromium, SA07, SA08 included. Four-file B4 diff checked against accepted B3/plan; no confirmed B4 blocker. No production rollout.

## Next

**Мира** independently checks bounded B4 on stable `97b9187cc42e5479c5cab43d9f69a9bfa6ed8a9e`. Only after coordinator PASS and owner `...` may Лира begin B5. Do not start B5–B9, merge, private moderator asset route (B6), independent Leva review or Stage6. **Лира STOP.**

## 2026-11-21 — B5 owner-authorized handoff

Owner continuation after B4 PASS authorizes B5 only. Create next stacked PR from B4 #365 exact `97b9187cc42e5479c5cab43d9f69a9bfa6ed8a9e`. Implement Watch/Bookmarks/Mute-Block/inbox visibility integration exactly per accepted B5 contract, run author self-check and applicable exact-head checks, then STOP for Mira. Do not enter B6/B7.

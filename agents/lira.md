# agents/lira.md — B7-MIRA-01 correction only

## Stable reviewed head

- B7 Draft #371 exact `901661dbc38b9a19626fd2c7fe2a951637692d3d`, accepted B6 #370 base `51a9ebe03f16c438faae5bec99a5856287630958`, behind0.
- Mira coordinator checkpoint: **HOLD with one confirmed current-B7 blocker**. No second current-B7 blocker was confirmed.
- Existing exact-head evidence remains green (19/19 checks, 15/15 workflows), but it did not detect this contract mismatch.

## Current task — B7-MIRA-01 only

Correct the canonical visibility action boundary so real pre-dispatch authentication/origin denials keep the B7 visibility response contract consumed by the Hide/Restore UI.

Observed defect on the reviewed head:
- `topicAction` performs generic `forumMutationGuard` before `visibilityTopicAction`;
- guest/session and origin denials therefore return generic `ForumMutationError` without `operation:"contentVisibility"`;
- Hide/Restore forms consequently classify a real preflight 401 as unconfirmed/unknown instead of the intended denied/revalidation state.

Done criteria:
1. Visibility requests through the actual canonical `topicAction` preserve the intended visibility-specific neutral result semantics for preflight 401/403 without weakening authentication/origin/fresh permission checks or changing unrelated topic intents.
2. Add focused regression coverage through the real canonical route/action seam, including the consumer-visible denial behavior; do not rely only on fabricated operation-specific responses.
3. Run applicable checks on the new stable exact head and update the #342 handoff.

**STOP after this correction.** Do not start B8/B9, stack fold, merge, deployment, or unrelated cleanup.

# ChatGPT-6 — personal log

## SA04-K1 — ACTIVE ASSIGNMENT: attachment metadata/replay lifecycle admission

Baseline: current `main=398dae18d5ca7c3fc6dd84fd93a29d7c381ba366`.
Accepted complete K plan: #331 comment #6877583725. Only **K1** is assigned.

Required result: implement authoritative transaction-local AccountState admission for `DrizzleForumAttachments.admitUpload` and `createDraftAttachment`, with the canonical attachment POST failure composition, while preserving current stable-ID replay, AP-10 upload restriction, fence and publication behavior.

Acceptance:
- inactive/missing actor cannot obtain matching replay/fallback/private success or create metadata/ref facts;
- active committed replay keeps current behavior relative to a later `attachments.upload` restriction; fresh upload still checks that restriction;
- same caller-owned DB transaction/connection uses the existing AccountState guard; no second connection or schema/public-contract change;
- deterministic lifecycle denial after a fresh settled physical upload may best-effort clean only that fresh attempt key; ambiguous commit/storage outcome must keep existing recovery rather than blind delete;
- focused real PostgreSQL evidence covers active/inactive/missing, fresh/replay/fallback and both lifecycle race orders with before/after facts; canonical POST distinguishes lifecycle 401, classified unavailable 503 and unexpected failure;
- create a **new cumulative Draft implementation PR from current main** and AUTHOR STOP on one stable exact head with applicable checks and a concise evidence packet for Mira.

Do not implement K2 journal actor signatures, K3 private reads, K4 Cancel or K5 connected local-R2/browser closure early. L–S, SA05, #315, permanent docs and Stage6 are out of scope. If K1 cannot be completed locally without changing the accepted K lock/protocol or broader architecture, stop with a technical escalation for Lev.


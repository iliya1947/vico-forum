# DL-CHAT-PROVENANCE-001/1 — prior-project-chat recheck

> **SUPPLEMENTAL AUDIT EVIDENCE — NOT A PROJECT SOURCE OF TRUTH**
>
> Chat history is used only for provenance. It does not establish current repository behavior, does not
> convert an unaccepted assistant proposal into a user decision, and does not replace raw external artifacts
> where the accepted Phase-2 disconfirmation criterion explicitly required them.

## Audited heads

- PR #78 task head: `59a651acf1f3e10ee588ddfcb7cdb6e269ee3317`
- PR #79 response base after required pre-change archive: `46c8e78637083f3a5d0467b2e1d72e73d75cacd2`

## Exact 15-ID derivation

The accepted `DL-TARGET-001.json` target artifact contains the 16 then-evidence-limited IDs:

`EX29-13`, `EX37-02`, `EX45-15`, `EX45-16`, `EX45-17`, `EX45-18`, `EX45-19a`, `EX45-19b`,
`EX45-21a`, `EX46-01`, `EX49-20`, `EX51-22`, `EX55-18`, `EX77-29`, `EX77-30`, `EX77-65`.

`EX77-65` was subsequently superseded by accepted direct-user evidence and moved to
`reviewed-supporting/direct-user-confirmed historical provenance`. Removing only that superseded ID yields
the active finite set of 15 reviewed here.

Exact-once proof: **15 rows / 15 unique / 0 missing / 0 extra / 0 duplicates / superseded EX77-65 absent**.

## Result

- `direct-chat-evidence`: **7** — the seven PR #45 records.
- `supporting-only`: **7** — EX37-02, EX46-01, EX49-20, EX51-22, EX55-18, EX77-29, EX77-30.
- `contradictory`: **0**.
- `no-sufficient-chat-evidence`: **1** — EX29-13.
- proposed substantive classification changes: **0**.
- evidence-limited set remains **15 / 15**.
- Phase-2 arithmetic remains **1,697 classified+disconfirmed + 332 reviewed-supporting = 2,029**.

## Exact per-ID old → new

| ID | Prior-chat result | Chat episode / boundary | Proposed classification transition |
| --- | --- | --- | --- |
| `EX29-13` | `no-sufficient-chat-evidence` | No accessible prior-project-chat match for PR #29 exact he/ka/ru final-row test-policy intent. | `insufficient-evidence` → `insufficient-evidence` |
| `EX37-02` | `supporting-only` | 2026-09-20: user identified EX37-02 as unresolved; ChatGPT classified it insufficient-evidence; user later accepted that evidence limit. | `insufficient-evidence` → `insufficient-evidence` |
| `EX45-15` | `direct-chat-evidence` | 2026-09-13 04:06:50Z user requested documentation of real Hyperdrive acceptance; 04:12:07Z ChatGPT recorded deployed-origin 500ms lock_timeout and 1500ms statement_timeout results; PR #45 followed at 05:15:41Z. | `insufficient-evidence` → `insufficient-evidence` |
| `EX45-16` | `direct-chat-evidence` | 2026-09-13 04:06:50Z user requested docs record real Hyperdrive acceptance including pool reuse and COMMIT/ROLLBACK reset; 04:12:07Z ChatGPT recorded acceptance context. | `insufficient-evidence` → `insufficient-evidence` |
| `EX45-17` | `direct-chat-evidence` | 2026-09-13 04:12:07Z ChatGPT recorded PostgreSQL statement timeout 57014 at approximately 1571ms in the PR #45 acceptance episode. | `insufficient-evidence` → `insufficient-evidence` |
| `EX45-18` | `direct-chat-evidence` | 2026-09-13 04:12:07Z ChatGPT recorded lock timeout 55P03 at approximately 569ms in the PR #45 acceptance episode. | `insufficient-evidence` → `insufficient-evidence` |
| `EX45-19a` | `direct-chat-evidence` | 2026-09-13 04:12:07Z ChatGPT recorded Query read timeout / 2000ms in the PR #45 acceptance episode. | `insufficient-evidence` → `insufficient-evidence` |
| `EX45-19b` | `direct-chat-evidence` | 2026-09-13 04:12:07Z ChatGPT recorded that the uniquely identifiable backend was not found after the client timeout. | `insufficient-evidence` → `insufficient-evidence` |
| `EX45-21a` | `direct-chat-evidence` | 2026-09-13 04:06:50Z user requested removing the staging/deadline blocker and marking deadline acceptance complete in PROJECT_STATE; 04:12:07Z ChatGPT stated the deadline acceptance was closed. | `insufficient-evidence` → `insufficient-evidence` |
| `EX46-01` | `supporting-only` | 2026-09-13 05:51:26Z ChatGPT quoted README wording that pre-Stage-4 audit/hardening was completed and simultaneously identified it as stale against PROJECT_STATE/ROADMAP; 05:55:48Z ChatGPT reported correcting the stale docs. | `insufficient-evidence` → `insufficient-evidence` |
| `EX49-20` | `supporting-only` | 2026-09-13 11:25:33Z user provided Neon tool access; 11:27:41Z/11:58:12Z ChatGPT described live production catalog checks and role/membership details; 20:16:08Z ChatGPT described migrator role attributes; 2026-09-14 13:38:42Z user said PR #49 was merged. | `insufficient-evidence` → `insufficient-evidence` |
| `EX51-22` | `supporting-only` | 2026-09-14 16:43:02Z ChatGPT fix prompt said not to change historical non-current revision deletion because Stage 4B did not define retention policy; 16:49:40Z and 16:54:37Z user authorized the broader final cleanup, but no explicit retention-policy acceptance was retrieved. | `insufficient-evidence` → `insufficient-evidence` |
| `EX55-18` | `supporting-only` | 2026-09-14 20:22:43Z ChatGPT summarized controlled 400/404/503 writer outcomes; 20:26:13Z review discussion did not mention a generic unknown-writer catch-all policy; later 2026-09-18 chats explicitly left unrelated forum-writer semantics untouched while narrowing authorization failures. | `insufficient-evidence` → `insufficient-evidence` |
| `EX77-29` | `supporting-only` | 2026-09-17 21:06:20Z/21:38:56Z ChatGPT distinguished the zero-stale gate from the architecturally allowed stale contract and noted strict stale-CI required a separate decision; 2026-09-20 audit chat explicitly classified the combined canary/test regression wording as insufficient and the user accepted the distinction. | `insufficient-evidence` → `insufficient-evidence` |
| `EX77-30` | `supporting-only` | 2026-09-17 21:38:56Z ChatGPT found unauthorized zero-stale narrowing but no direct evidence of backdating; 2026-09-20 audit chat classified strict documentation laundering as insufficient and the user accepted the distinction. | `insufficient-evidence` → `insufficient-evidence` |

Every row therefore keeps its accepted Phase-2 classification. The `old → new` change is provenance-only:
the audit may record the chat-result annotation shown above, but none of the 15 records is promoted out of
`insufficient-evidence` on this evidence.

## Why the strongest chat matches still do not resolve the evidence limit

### PR #45 — EX45-15/16/17/18/19a/19b/21a

Accessible 2026-09-13 chat is genuinely useful and contemporaneous. The user requested that real Hyperdrive
acceptance, pool/reset behavior, deadline results, and blocker closure be recorded; ChatGPT recorded the
`500/1500`, `57014/~1571ms`, `55P03/~569ms`, `Query read timeout/2000ms`, and backend-not-found results.

That is direct chat evidence that these observations were discussed and used for PR #45 documentation.
However, accepted disconfirmation profile `L` is stricter: it requires the raw diagnostic/run/session
evidence needed to independently verify the external observations. The accessible chat preserves the
report, not the raw harness/log/session artifact. Therefore these seven rows gain stronger provenance but
remain `insufficient-evidence`.

`EX45-21a` is similarly strengthened as provenance: the user directly requested that deadline acceptance be
marked complete and the assistant recorded closure. That proves the contemporaneous closure decision, not
the missing raw external measurement artifact underneath it.

### EX46-01

Contemporaneous chat quotes the README completion wording and, importantly, treats it as stale against the
then-current PROJECT_STATE/ROADMAP before correcting the docs. This supports the provenance of the wording
but does not independently prove the underlying audit/hardening completion. Profile `M` remains dependent on
the unresolved external-acceptance evidence from profile `L`.

### EX49-20

The user provided Neon tool access and contemporaneous assistant messages describe detailed production
catalog observations, including ownership and membership attributes. No raw `pg_catalog` / `pg_roles`
result artifact is preserved in the accessible chat, and no user message directly confirms the result rows.
Profile `V` explicitly requires raw catalog/run evidence, so the record stays evidence-limited.

### EX51-22

Chat confirms an assistant scope decision not to change deletion of historical non-current revisions because
Stage 4B did not define retention policy. The user's later approval was for the broader cleanup and is not an
explicit retain-all/delete-allowed/deferred-policy decision. Thus chat supports deliberate deferral but does
not establish a user-authoritative permanent retention/deletion contract.

### EX55-18

The contemporaneous PR #55 chat records controlled 400/404/503 outcomes, but no retrieved message says that
all unexpected writer/programming/schema/configuration failures were deliberately chosen to map to generic
`503`, and no explicit user acceptance of such a policy was found. The current evidence limit remains.

### EX77-29 / EX77-30

Prior chats support the later narrowing: the zero-stale gate is the independently supported regression;
canary removal is not independently established as defective; normalization of the then-current policy is
supported, but strict laundering/backdating is not. These chats reinforce the accepted
`insufficient-evidence` classifications rather than overturning them.

### EX37-02 / EX29-13

`EX37-02` has later chat confirmation that the user accepted the audit's evidence limit, but no original
preserved PR #37 audit artifact or blocker approval was recovered. `EX29-13` produced an explicit chat miss:
no accessible conversation resolves permanent exact-state invariant versus current-final-state test intent.

## Proposed propagation

**Substantive transitions: none.**

For all 15 records:

`old: insufficient-evidence → new: insufficient-evidence`.

The only proposed update is provenance metadata: attach the exact per-ID `prior-project-chat` result from the
machine artifact (`direct-chat-evidence`, `supporting-only`, or explicit miss) while preserving each original
repository-evidence limitation. No target contract, source-of-truth document, remediation mechanism, Phase 5
work, or `final` status follows from this response.

## Outcome

**PASS**

The finite 15-record chat recheck is complete, exact-once, and yields no justified classification upgrade.

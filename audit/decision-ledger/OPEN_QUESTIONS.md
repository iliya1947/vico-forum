# Open Audit Questions

> **WORKING AUDIT MATERIAL — NOT A SOURCE OF TRUTH**

Only questions that cannot be resolved by repository evidence belong here. Do not ask the user to
decide implementation facts that Git, code, tests, or exact-version primary documentation can answer.

## Pending user decisions

### UD-001 — explicit unavailable-locale safe-read UX

Scope: only `GET`/`HEAD` requests whose explicit `/:locale` segment is malformed, unknown,
inactive, or disabled.

Repository history leaves two valid choices:

1. **Preserve the current `307` English fallback.** Redirect temporarily to the same route and
   query under `/en/...`. This gives the visitor readable English content and keeps the current
   uniform safe-read behavior.
2. **Return `404`.** Treat an explicitly addressed unavailable locale as not found instead of
   substituting English. This follows stricter explicit-URL semantics but removes automatic English
   recovery for mistyped or unavailable locale URLs.

The choice does not reopen generic/data-driven locale architecture, canonical `308` handling for an
active alias/case/deprecated form, non-`GET`/`HEAD` fail-closed behavior, internal-only redirect
targets, or the no-side-effect rule for unknown locale requests.

Evidence boundary: PR #11 removed its premature hard-coded `404` and restored an explicit decision
gate; PR #12 required a choice but did not supply direct-user authority; PR #13/#16 selected and
implemented the current `307` behavior as a technically valid alternative. Current documentation and
code prove present behavior but cannot supply the missing user decision.

Status: `awaiting-user`.

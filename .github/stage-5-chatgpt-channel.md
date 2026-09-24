# Stage 5 ChatGPT coordination channel

This non-merge service PR records ChatGPT's independent reviews, technical conclusions, and
bounded work results for Stage 5. It is not a source of truth for project architecture or state.

## Current baseline

- GitHub `main`: `730fb145c00fde2e503c5aa5282512ecb80192d2`.
- Active product stage: Stage 5 translations/background jobs.
- Codex service channel: PR #94.
- ChatGPT mergeable change under review: PR #101.
- External Workers AI binding/credentials/live acceptance remain Stage 6 concerns.

## Current task

PRV-02 concrete Cloudflare Workers AI M2M100 adapter in PR #101.

PR #101 current reviewed head:
`61e93885fcdfafa3629e6c79050ccb862a9adff9`.

GitHub CI run `35967497347` completed successfully:
- `checks` — success;
- `database` — success.

## Independent verification of Codex findings

ChatGPT independently verified the two current-scope findings from Codex PR #94 before any
correction:

1. **Canonical Filipino mapping is missing.**
   Vico canonicalizes translation locales through `Intl.getCanonicalLocales()`; current runtime
   canonicalizes `tl` to `fil`. The M2M100 model support set uses provider code `tl`
   (Tagalog), while the adapter currently performs exact set membership and contains `tl` but
   not `fil`. Therefore canonical Vico `fil` cannot reach this supported provider capability.
   The provider-local adapter must map canonical `fil` to provider code `tl` and cover the
   exact outgoing request.

2. **Known Workers AI error-code semantics are hidden by broad HTTP-status classification.**
   The current adapter checks generic status before recognized provider codes. Cloudflare's
   current error table identifies `5019 / 405` as deprecated SDK configuration and
   `3036 / 429` as exhausted daily account allocation, while `3040 / 429` is temporary
   capacity exhaustion. The current classifier maps `405` to `provider-unsupported` before
   `5019` can reach the terminal configuration path and groups `3036` with transient
   rate/capacity retry. Recognized provider codes must take precedence over generic status,
   permanent account/configuration conditions must be terminal, and realistic tests must include
   both status and code.

Both findings are defects of the current PRV-02 task, not future-stage groundwork.

## Status

- PR #101 remains open and unmerged.
- No correction has been applied yet.
- Technical agreement with Codex is required before correction.

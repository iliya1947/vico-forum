# Stage 5 ChatGPT coordination channel

This file initializes the non-merge ChatGPT service PR for Stage 5. ChatGPT uses this channel to
record independent reviews, technical conclusions, and bounded work results. In accordance with
`AGENTS.md`, ChatGPT updates this PR; it is not merged into `main`.

This coordination record is not a source of truth for project state or architecture. The
applicable contracts remain `AGENTS.md`, `PROJECT.md`, `PROJECT_STATE.md`, `ROADMAP.md`,
`TRANSLATION_ARCHITECTURE.md`, and the relevant documents under `docs/translation/`.

## Current baseline

- GitHub `main`: `a3155ddaed16a8a0f07ee81ad8ecb38851d4c35d`.
- Active product stage: Stage 5 translations/background jobs.
- Codex service channel: PR #94.
- External provider credentials, real Cloudflare Queue bindings, and deployed provider/Queue
  smoke remain Stage 6 concerns.

## Current task from Codex

Codex PR #94 assigns `JOB-04`: retry classification and DLQ-equivalent terminal-failure
semantics before `JOB-06`, a concrete provider adapter, and Stage 5B.

Before implementation, ChatGPT will treat the Codex task and its proposed boundaries as the
current technical plan, while independently checking the resulting implementation against the
Stage 5 contracts and current `main`.

## Status

Channel initialized. No product code or source-of-truth project state is changed by this commit.

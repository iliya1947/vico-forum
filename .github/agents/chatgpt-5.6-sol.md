# Мира — ChatGPT-5.6 Sol

Активная задача: поэтапный аудит AUD-20261022. Этап 5 начат; части 1–3 завершены.

Этот файл используется для собственных рабочих результатов, выводов и технического контекста Миры в рамках текущего служебного PR.

## AUD-20261022 — этапы 1–4

- Baseline: `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`.
- Этап 1: 18 актуальных документов / 7934 строки прочитаны полностью.
- Этап 2: architecture/config/dependency/server-client boundaries проверены.
- Этап 3: email/password/session, dynamic authorization и ownership boundaries проверены.
- Этап 4: public forum/discovery/participation/unread/notifications/profiles/presence/public Help modes завершён.
- Findings остаются только в current developer chat до завершения checking sequence.

## AUD-20261022 — этап 5, часть 1

- Solved/best-answer, manual solution moderation, duplicate relationship/appeal stale/concurrent paths проверены повторно.
- Finding details не публикуются в service PR до завершения аудита.

## AUD-20261022 — этап 5, часть 2

- Ordinary Help signals проверены end-to-end: server session identity, exact permissions by persisted kind, validation, immutable target identity, withdrawal ownership, independent persisted cooldown, stale/superseded lifecycle and concurrent resolution.
- Новых independent findings не установлено.

## AUD-20261022 — этап 5, часть 3 — standalone Attention

- Baseline повторно подтверждён; `AGENTS.md` полностью прочитан.
- Проверены весь primary `app/routes/attention.tsx`, весь `tests/database/forum-help-attention.test.ts`, Attention presentation ranges `app/forum/views.tsx`, applicable route regressions `app/forum/public-read.test.tsx`, repository `readHelpAttentionCounts/readHelpAttentionCases` и action dependencies.
- Access: guest 401; actor без Help/security moderation 403; Signals/Complaints gated existing Help moderation capabilities; Security isolated by independent `forum.attachmentSecurity.read`. Security-only actor safely resolves bare `/:locale/attention` to Security and never reads Help queue.
- Group parsing is mode-specific; invalid group resets to that mode's default. Page is bounded safe integer 0..10000. Signals cases/counts are not queried for Complaints/Security; attachment queue is not queried outside Security/Attachments.
- Visibility passed to repository is current effective capability-derived. Counts include every visible pending user signal, appeals when allowed, plus separate authoritative current-best-answer needs-review status tasks. Inaccessible categories remain zero/empty.
- Mixed contract is implemented as topics with >1 visible pending user signals; it repeats those exact signals, not appeals or authoritative review-status rows. Paging selects Mixed topics before expanding their cases; connected test intentionally verifies >50 individual signal cards can result from one Mixed topic-page set.
- Needs-review combines two work sources without conflating identities: exact pending user signals and `review-status` case keyed by current best-answer post id. Review-status card has no fake accept/reject mutation and points moderator to answer controls.
- Attention action requires same-origin + authenticated session. Signal case action reads exact persisted signal, rejects topic mismatch, derives permission from persisted kind, then resolves exact signal id. Repository handles terminal/stale current state under locks.
- Appeal action requires duplicate-manage, reads current pending appeal for topic and requires `appeal.id === caseId` before mutation; writer passes `expectedAppealId: caseId` so a replacement appeal cannot be acted on through a stale card.
- Connected DB coverage confirms permission isolation, global counts, case projection, resolved-task disappearance, authoritative review status, expected appeal identity and group-specific paging.
- No new independent current-Stage finding established in part 3.
- Security attachment content/lifecycle deep audit intentionally remains stage 7; only Attention access/routing/presentation boundary checked here.
- Next step: stage 5 part 4 completeness sweep and stage closure.

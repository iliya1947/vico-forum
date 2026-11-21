# agents/mira.md — персональная рабочая память Миры по #342

## Текущее назначение

Мира — coordinator/workflow lead #342. Не реализует current #354 без прямого owner-переназначения.

## Current correction context

- Owner объединил WATCH-AUDIT-1, BOOKMARKS-AUDIT-1, BOOKMARKS-AUDIT-2 и TITLE-AUDIT-1 в один Draft #354.
- Watch-only срез на head `afe23e08f0e54cafbfc2d803fe9f1cee59b2bbbf` был проверен Мирой PASS.
- Этот PASS не финальный после расширения scope.
- #354 head `6dd9c66c2d22158f41e76089436399082b6553c5`: WATCH-AUDIT-1, BOOKMARKS-AUDIT-1 и BOOKMARKS-AUDIT-2 закрыты bounded implementation+evidence. Bookmarks list больше не имеет local `removed` latch; fresh loader определяет наличие row, включая Remove→re-Add→fresh loader→late old ACK. Exact-head 7/7 workflows SUCCESS. Следующий bounded-шаг — TITLE-AUDIT-1.
- После author self-check всего пакета Мира обязана заново проверить **весь #354**, а не только delta от Watch PASS.
- Только после fresh Mira PASS Лёва получает один independent review того же exact head.

## Owner/process boundaries

- #342 — текущий service PR, never merge.
- #300 не использовать до полного завершения #342, кроме прямой команды владельца.
- Merge выполняет владелец.
- Не активировать moderation visibility/structure до закрытия #354.

## После corrections

1. moderation visibility;
2. forum structure/topic move;
3. затем сверка #320.

Visibility V1–V9 plan подготовлен Лёвой; при миграции не найден отдельный явный final Mira scope/fit record по V-P1/V-P2/V-P3/V-T1/V-T2, поэтому перед implementation это нужно проверить по фактам, не считать автоматически принятой каждую proposal-развилку.

Structure S0–S10 plan имеет явный Mira PASS и принятые S-P1–S-P4/S-T1/S-T2.


## 2026-11-19 — fresh coordinator whole-PR review #354: HOLD

Reviewed stable exact head `01cecb91090a2f29f90b7c6ae4a83db77a0f4910` against current main, TASK and corrections plan. Scope exactly 9 files; main drift only service-regulation docs. Watch stale-ACK, Bookmark stale-ACK and Bookmark removed-latch corrections are sound; normal/transient/late-response guards remain. Title post-DOM focus works for normal Save/Cancel and connected Chromium.

One confirmed current-scope finding: **TITLE-AUDIT-1-R1 [P3]**. `restoreOpenerFocus.current` remains true when closing a draft while `canEdit=false`, because the component returns null and focus effect cannot consume/clear the request. A later same-key permission restoration makes opener appear and consumes that stale request, causing delayed unexpected focus steal. Return only this narrow correction to Lira. No other current-scope findings confirmed.

Exact-head workflows independently checked: 7/7 SUCCESS; CI checks/database SUCCESS; Watch, Bookmarks and Title connected jobs SUCCESS. Green checks do not override R1. Any implementation change resets whole-PR review.


## 2026-11-19 — #354 fresh coordinator whole-PR review after R1: PASS

Reviewed stable exact head `b67e14d81cd20f2e42264e3d25d336ee19db626b` against current main, TASK and corrections plan. Current main remained `bb3d44f...`; only service-regulation docs differ from PR base.

Previous reviewed head `01cecb91...` had one finding, TITLE-AUDIT-1-R1. New implementation delta is limited to `topic-title-editor.tsx` and its component test. The correction consumes the pending focus request before checking whether the opener is available, so a close under `canEdit=false` cannot leave a request that later steals focus when permission returns. Regression exercises the same mounted actor/topic permission-loss → Cancel → focus elsewhere → permission restore sequence.

Unchanged Watch/Bookmark/list corrections were already independently checked on the prior whole-PR cycle and remain byte-unchanged; final PR scope remains exactly 9 files. Final exact-head 7/7 workflows SUCCESS; no review threads/comments introduced new findings.

**Coordinator result: PASS. Confirmed current-scope defects = 0.**
Next reviewer: Leva / Codex-6.1 Sol, independent whole-PR review of the same exact SHA. Any implementation-head change invalidates this final PASS.


## 2026-11-20 — #354 merged; moderation visibility scope/fit

Owner merged #354 unchanged reviewed head; main is `6fa2a43b02c55515bbd46a0d74fe6cc0d4424caf`.

Visibility V1–V9 proposal checked against current PROJECT/PROJECT_STATE, AUTHORIZATION/Admin contracts, permission catalog/AP-10 family, topic/post schema, closure CAS writer and Admin History. V-T1/V-T2 technically fit existing architecture; no new architecture decision is needed. No owner acceptance record found for V-P1/V-P2/V-P3, so implementation remains blocked only on those product decisions. Recommendations are recorded in WORKFLOW and stage PLAN.


## Correction — visibility acceptance was already established

My prior scope/fit step incorrectly treated missing migrated acceptance metadata as an open owner decision. Recovered prior discussion from 18 Nov matches V-P1/V-P2/V-P3 exactly, and owner explicitly corrected that this had already been passed. These product decisions are now recorded as accepted in DECISIONS/visibility plan. Do not ask owner to reconfirm them. Next step is Leva plan finalization against current main only.


## 2026-11-20 — moderation visibility plan review: HOLD

Leva completed current-main adaptation of V1–V9. Product/technical content review found no new scope conflict, but one blocking process defect: V8 defines one Draft implementation PR containing B1–B9 while also treating them as bounded checkpoints with STOP after each. Current AGENTS.md requires a separate implementation PR and review cycle for every completed bounded stage; there is no owner exception for visibility. Finding: VIS-PLAN-R1. Return only delivery/checkpoint topology to Leva; do not reopen accepted V-P decisions or technical design. Lira remains unassigned until corrected plan passes.


## Correction — VIS-PLAN-R1 was process, not technical

The one-PR B1–B9 topology mismatch was incorrectly classified as a technical plan finding and returned to Leva. This was wrong: AGENTS conformance is Mira's workflow responsibility. I corrected the service plan directly without changing V1–V9 technical content. Plan review is PASS; Lira is assigned B1 only, in its own implementation PR.


## 2026-11-20 — owner adopted stacked bounded PR workflow

Previous correction to force per-stage merge was superseded by owner process decision. New default pattern for suitable composite vertical work: stack bounded PRs, keep intermediate stages out of main, fold final stack into the first PR, close upper steps superseded, then perform one final whole-feature Mira→Leva review and owner merge. For visibility: B1→B9. Track mandatory follow-up after #342: update AGENTS.md to encode this workflow generally.


## 2026-11-20 — proactive tooling rule

Owner requires proactive discovery of useful GitHub/tool capabilities. I must not wait for the developer to discover workflow features accidentally. When a native tool capability materially simplifies or improves current work, I should identify it, check constraints, and propose it before cementing a worse process. Mandatory AGENTS.md follow-up after #342 together with stacked PR workflow.


## 2026-11-20 — B1 checkpoint HOLD on #355

Reviewed exact `736da519e3f3fcae716ec5fb1b81886cdac63a6e`. One current-scope blocker: VIS-B1-MIRA-01, incomplete integration of `forum.content.visibility.manage` across Admin Forum admission/header projection and shared AP-10 admin.forum family map. The DB wrapper already includes it, creating parity drift. No B2 until Lira corrects B1 and returns a fresh exact head.


## 2026-11-20 — B1 bounded PASS

Fresh review of #355 exact `704d5a46d59841538524424296ac28eaa39aa5e6`: VIS-B1-MIRA-01 corrected across Admin admission, locale projection and AP-10 family map; focused regressions added; correction limited to seven files. Exact-head CI and all 13 associated workflows SUCCESS. No new B1 blocker. B1 PASS, remains Draft/unmerged. B2 only on explicit owner continuation, stacked from B1 branch.


## 2026-11-20 — B2 bounded PASS

Reviewed #357 exact `778568e83b89fd0ac14827cbeeaff3e2fd4dc5eb` as local B1→B2 stacked diff. Commands/CAS/reason/no-op, fresh actor/AP-10/direct RBAC, append-last History/rollback, writer gates, receipt/recovery semantics and real PG races/deactivation/lock compatibility satisfy the B2 checkpoint. Final 22/22 checks and 18/18 workflows SUCCESS; no current-B2 blocker. Translation planning overlap with B4 is not a defect by itself. B3 next only on owner continuation.

## 2026-11-21 — manual PR test process side task

Temporary service PR #361 was created in violation of the fixed #342 assignment and is closed without merge. Recovered Lira review from #361: #362 old exact `898f71c2...` had one finding around `gh pr edit` label removal permissions. Corrected #362 now uses the documented Issues REST label-removal endpoint with the existing `issues: write` permission; new exact head `3387132aeed815fb93cf3094c3d70f5e343ce998`. Old review does not carry PASS across the head change. #342 remains the only service channel.



## 2026-11-21 — #362 corrections author PASS; Leva rereview pending

Leva's two P2 findings are corrected on stable #362 exact `c85214aa9a2706fb0cb1704cfcf18459aa97bcdb`. AP-10 all four jobs share the acceptance gate. Manual CI dispatch is pinned by explicit PR number + expected exact head/base and rejects drift before checkout; migration guard receives the resolved real base, and dispatch acceptance evidence uses the dispatched `github.sha`. During author-check I found and corrected two issues in my own prior correction: duplicated per-job PR resolution could race, so expected head/base are now mandatory; and `issues: write` alone produced real 403 for label removal despite the fine-grained-token REST permission table, so the no-checkout controller now also has narrowly scoped `pull-requests: write`.

Runtime evidence on the final head: control run `44891093023` SUCCESS and consumed `run:ci`; CI `44891093053` checks+database SUCCESS; all acceptance workflows triggered by the label event were skipped, including AP-10. Actual `workflow_dispatch` execution remains unverified before merge because the new dispatch trigger is not yet on default branch; GitHub contract was checked instead. #363 current docs head `b481f0a004c40a01f53dc9be3428c6d3d1ea2409`, stacked directly on #362. Fresh independent Leva review is next; no PASS carries from the old head.

## 2026-11-21 — final MANUAL-CI-LEVA-02 correction

Leva rereview on #362 exact `c85214aa9a2706fb0cb1704cfcf18459aa97bcdb` found one remaining P2: step-level workflow env cannot override reserved `GITHUB_BASE_REF`; my prior exhaustive self-review missed that runner contract. Corrected locally in #362 exact `5ed18dcffb856564fd0e8df9ec9d43020cd7f807`: resolved base is carried as `VICO_CI_BASE_REF`, and only the child migration guard process receives `GITHUB_BASE_REF="$VICO_CI_BASE_REF"`. Diff from prior reviewed head is only ci.yml, 2 additions/2 deletions. Targeted `run:ci` runtime: controller SUCCESS, 17 acceptance SKIPPED, CI 44897099641 checks+database SUCCESS, migration guard SUCCESS. Broad acceptance was not repeated because no acceptance code changed. Hosted dispatch remains unavailable pre-merge; Leva's local experiment covered ordinary/stacked base and immutable-migration rejection for this propagation pattern. #363 current docs head `bbe72f09c34fc9bbae00f6434712ba45e49dfd80`, stacked directly on #362. Fresh Leva closure of MANUAL-CI-LEVA-02 is next.

## 2026-11-21 — hosted workflow_dispatch smoke PASS

After owner merged #362 to main `7ae969e70e4028156252511b701dbb9b667a61e2`, the required real dispatch smoke was run manually through GitHub UI as CI run `44900723276`. Inputs were PR 363 / exact head `bbe72f09c34fc9bbae00f6434712ba45e49dfd80` / base `main`. Hosted logs prove the resolver succeeded, ordinary PR checkout was skipped, dispatch checkout switched HEAD to that exact SHA, `VICO_CI_BASE_REF=main`, and the child migration guard invocation succeeded. Both `checks` and `database` completed SUCCESS. This closes the previously unexecuted hosted-dispatch boundary for the ordinary base case. Next separate subtask is docs review/currentization of #363; implementation #362 remains closed/merged and should not be reopened.

## 2026-11-21 — #363 docs review HOLD

Reviewed #363 head `bbe72f09c34fc9bbae00f6434712ba45e49dfd80` against merged main `7ae969e70e4028156252511b701dbb9b667a61e2`. The three intended docs changes are substantively consistent with the merged manual-test mechanism and hosted dispatch evidence. One current docs-PR blocker remains: branch ancestry still carries the pre-merge #362 history, so GitHub reports 22 changed files. Direct recursive tree comparison proves the endpoint trees differ only in `AGENTS.md`, `AGENT_LOGIC_ERRORS.md`, `PROJECT_STATE.md`; the 19 workflow files are content-identical. DOCS-363-MIRA-01: rebuild the docs branch directly on current main before PASS. No content edits made during review.

## 2026-11-21 — #363 final docs PASS

DOCS-363-MIRA-01 closed by rebuilding the docs branch directly from current main `7ae969e70e4028156252511b701dbb9b667a61e2`. New exact head `7ae9f0f8d007cb7f2c2c007794476715881a13ef` is ahead 1 / behind 0 and PR diff contains exactly `AGENTS.md`, `AGENT_LOGIC_ERRORS.md`, `PROJECT_STATE.md`. The three blob SHAs are byte-identical to the content already reviewed before rebuild, so the content PASS carries; only ancestry changed. PR mergeable, no automatic PR test runs. Final docs review PASS; owner may merge #363.

## 2026-11-21 — manual PR-test process task COMPLETE

Owner merged #363 unchanged reviewed head; main is now `9cff976a9621d9fe5dfef28ea5367e390ff435b1`. #362 implementation, hosted dispatch smoke and #363 docs closeout are complete; there are no remaining process-side findings/debts. Resume the previously paused moderation visibility B3 coordinator checkpoint on Draft #359 exact `3fa0740c4bec304eb3912aedfffb8e6c4ff309e1`. Do not start B4 before B3 coordinator PASS and a new owner continuation.

## 2026-11-21 — B3 coordinator checkpoint HOLD

Reviewed #359 exact `3fa0740c4bec304eb3912aedfffb8e6c4ff309e1` against B2 `778568e83b89fd0ac14827cbeeaff3e2fd4dc5eb` and the accepted B3 plan. One confirmed current-B3 blocker: VIS-B3-MIRA-01 [P2]. B3 narrowed raw `readPost` to visible-only even though V2 explicitly keeps raw `readTopic/readPost/readHierarchy` as trusted service/fixture seams. Because unchanged `readHierarchy` enumerates persisted posts through raw `readPost`, any hidden post/topic now makes the trusted hierarchy throw a false “current body revision missing” error. Public denial is already enforced by `readTopicPage/readPostLocation/readPostHistory` and route/action paths; writer/source-locale admission already rechecks visibility under locks. No second current-B3 finding confirmed; B4–B7 gaps were classified as future rungs, not findings. Return only this correction to Lira; B4 stays blocked until fresh B3 PASS.

## 2026-11-21 — VIS-B3-MIRA-01 correction runtime verified

#359 exact `cde5219046dcac9cbde3d62c4eb819fcfd2f6e91` remains stable. Existing exact-head CI `44904360356` completed SUCCESS with both checks/database green; all 15 exact-head workflows completed SUCCESS. Lira's correction remains limited to restoring trusted raw `readPost` and adding focused PG regression. Per stacked workflow, author runtime closure remains Lira's gate before my fresh coordinator checkpoint; I did not bypass it or start B4.

## 2026-11-21 — B3 coordinator checkpoint PASS

Fresh checkpoint completed on #359 exact `cde5219046dcac9cbde3d62c4eb819fcfd2f6e91`. The only implementation delta since my prior full B3 review is the two-file VIS-B3-MIRA-01 correction: raw `readPost` restored byte-identical to B2 and focused real-PG trusted-hierarchy/public-denial regression added. Exact-head CI `44904360356` is green (2782 unit / 1600 PG), all 15 workflows green, changed-file scope remains 34 B3 files. VIS-B3-MIRA-01 CLOSED; no other current-B3 blocker remains from the prior complete checkpoint. B3 coordinator PASS. Stop before B4 until owner continuation.

## Mira-2 side assignment — systematic stale/legacy audit

Новый audit-only handoff от Ильи через #342. Не продолжать прежний grep-first подход. Читать `research/stale-legacy-audit-handoff.md`, построить current capability map, затем проверить все проекции и выдать один классифицированный registry. Не исправлять и не вмешиваться в B4.

## 2026-11-21 — B4 coordinator checkpoint PASS

Reviewed #365 exact `97b9187cc42e5479c5cab43d9f69a9bfa6ed8a9e` against accepted B4 and B3 baseline. Four-file diff only; production change is the public attachment post/topic visibility gate before bucket access. Translation and evidence additions are bounded real-PG regressions proving inherited contracts. Complaint evidence bucket routes remain protected reviewer exceptions. CI and 9/9 exact-head workflows green. No current-B4 blocker. Lira exceeded the assigned B4-A-only STOP by completing B4-B/C; process error logged, but the extra diff remains within accepted B4 technical scope and does not invalidate technical PASS. Stop before B5.

## 2026-11-21 — B5 coordinator checkpoint PASS

Reviewed #367 exact `a2269fb0294feaccb433e76b66e800f3e869658d` against accepted B5 and B4 baseline. Watch/Bookmark/Mute ON visibility gates and safe OFF/undo, retained unavailable lists, Block presentation boundary, mixed/legacy notification masking/mark/open, chronology/read/count/suppression/Restore invariants all match the accepted contract. Canonical hidden-topic undo path is reachable because personal intents run before public visibility reads. Corrected M3 test reflects the required real PostgreSQL blocking order and does not weaken production locks. 18/18 exact-head checks and 14/14 workflows green. No current-B5 blocker. Stop before B6.

## 2026-11-21 — B6-A coordinator checkpoint PASS

Reviewed #370 exact `91cb332d6acf60ebf572f57582c13acfeab8eada` against accepted B6-A. Private queue/admission/cursor/privacy contracts pass; timestamp precision is schema-level millisecond so cursor ordering is stable. Existing admin-topic route stays public-safe. The ordinary admin section/category hidden-title/count leak was confirmed current-stage and its scoped correction is required for the guarded-private-surface invariant. 22/22 exact-head checks and 18/18 workflows green. No current-B6-A blocker. STOP before B6-B.


## 2026-11-22 — B6-B coordinator checkpoint PASS

Reviewed #370 local B6-A→B6-B diff on stable exact `51a9ebe03f16c438faae5bec99a5856287630958`: 12 commits / 17 files. Guarded inspector/current event, dual-capability hidden post revision history and exact-member private hidden attachment access match accepted B6. AP-10 applies to both visibility and post-history permissions; public/ordinary Admin/Complaint boundaries remain independent. Exact-head GitHub evidence independently verified: 22/22 check-runs and 18/18 workflows SUCCESS. No current-B6-B blocker. Lira bypassed explicit B6-B1/B2 STOP gates; process error logged, technical diff retained. Stop before B7 until owner continuation.

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

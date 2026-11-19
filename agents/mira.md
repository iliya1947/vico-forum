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

# agents/lira.md — персональная рабочая память Лиры по #342

## Текущее назначение

Moderation visibility B2 stacked Draft [#357](https://github.com/iliya1947/vico-forum/pull/357) over B1 [#355](https://github.com/iliya1947/vico-forum/pull/355). B1 Mira bounded PASS. **B2.1/B2.2 author PASS; Лира STOP before B2.3.**

## Подтверждённое B2

- B2.1 `41f94434e62b59d40d7f7ebd57be5927decb23c9`: `appendVisibilityHistory` neutral ID-only labels, reason/rollback PG regressions.
- B2.2 exact stable `ff5d560da266ba1c2ccf8eb28304be02a2d5cab8`: transactional topic/post Hide/Restore, current version/revision CAS, membership, active actor, direct fresh RBAC+Owner/AP10 admission before no-op; one neutral History event per transition and rollback if append fails. Backend not exposed through public routes.
- Final [CI 44701346485](https://github.com/iliya1947/vico-forum/actions/runs/44701346485) **PASS**: 22/22 check-runs, 18/18 workflows, 2758/2758 unit, 1493/1493 PG17 incl 7/7 new. No need to recheck same exact head without new cause.
- B2.2 changes and tests confined to Draft #357; no B3+.

## Следующий шаг только по явной команде владельца

**B2.3: existing writers availability guards** — reply/direct hidden parent, published edit, own title/source, solution/Help/closure/pin and local recovery/admission seams as scoped by `stages/moderation-visibility/PLAN.md`; preserve lock order. Keep PG two-order concurrency/lock graph as separately bounded follow-on. STOP after B2.3.

B2 overall not complete or ready for Mira checkpoint. B1/B2 Draft/unmerged. After full B2: author self-check/exact-head CI → Mira bounded checkpoint; after B9 final folded feature Mira → Leva → owner merge. Service #342 never merge.

## Границы

V-P1–V-P3 accepted; V-T1/V-T2 PASS. Stage6/#300/general UI/UX excluded.

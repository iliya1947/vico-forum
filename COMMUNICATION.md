# COMMUNICATION.md — общий актуальный контекст команды по #342

## Канал и источник истины

- Service PR этой задачи: #342; он никогда не merge в main.
- GitHub main — источник истины продукта.
- #300 не используется Мирой как текущий рабочий канал/источник назначений до завершения #342, кроме прямой команды владельца.

## Актуальные продуктовые факты

- Edit own title, Watch, Bookmarks и Mute/Block уже merged и задокументированы в main.
- Repository migration ceiling в текущем product state: 0070; external accepted evidence остаётся только через 0020.
- Stage 6 paused и не связан с текущим corrective/product route.

## Consolidated correction #354

#354 merged в main как `6fa2a43b02c55515bbd46a0d74fe6cc0d4424caf` после Mira+Leva PASS одного exact head. Все четыре исходных finding и TITLE-AUDIT-1-R1 CLOSED; current-scope defects = 0.

## Текущий этап

Собранная moderation visibility #355 exact `66b1bb7ec0f4a1f5bed17583398d5acc041da143` против current main `9cff976a9621d9fe5dfef28ea5367e390ff435b1` получила fresh Mira whole-feature PASS и Leva independent whole-feature re-review PASS.

**VIS-FINAL-LEVA-01/02 CLOSED**, текущих блокирующих findings нет. Проверены protected own Help withdrawal и ordinary Admin tombstone chronology/root/best/candidates, весь 8-file correction delta и взаимодействия с canonical action/translation/shared controls. Main и остальная feature implementation не изменились.

Канонический report — `stages/moderation-visibility/REVIEW.md`. Локально 17 files/304 tests PASS, включая 3 прежних reproductions. Fresh exact-head CI/browser/local-R2 SUCCESS независимо API-checked; full hosted suites локально не повторялись. Старый HOLD на fdad1930 superseded.

## Дальнейший маршрут

#355 остаётся Draft/unmerged и готов к owner merge после снятия Draft на проверенном head. При новом implementation head нужен новый применимый review cycle. После фактического merge — отдельное назначение docs closeout; затем forum structure/topic move по #342. Reviewer не merge, не начинает docs/structure и не запускает deployment. V-P1/V-P2/V-P3 уже приняты.

## 2026-11-20 — stacked delivery adopted

Owner decision: moderation visibility и будущие подходящие составные задачи использовать stacked bounded PR ladder. Для task5: B1 from main, B2 from B1 head … B9 from B8 head; после B9 final head folded into B1, B2–B9 closed superseded, final B1 → Mira whole-feature → Leva independent whole-feature → owner merge. AGENTS.md должен быть отдельно обновлён после текущей задачи, чтобы закрепить этот workflow глобально.


## 2026-11-20 — moderation visibility B1 PASS

Mira bounded checkpoint PASS on #355 exact `704d5a46d59841538524424296ac28eaa39aa5e6`. VIS-B1-MIRA-01 CLOSED; no current B1 blocker. #355 stays Draft/unmerged as first stacked rung. B2 is prepared but inactive until owner continuation; its base must be `feature/moderation-visibility-b1-foundation`.


## 2026-11-20 — B2 cadence correction

Owner approved continuous completion of the remaining B2 tail. B2.3e1 and following internal microsteps no longer require owner STOP or full repository CI after each microstep. Lira should use targeted checks while iterating, complete the whole B2 bounded scope, then run one author self-check + one full exact-head CI and hand B2 to Mira. Stop early only for a real blocker/plan conflict.


## 2026-11-20 — moderation visibility B2 PASS

Mira bounded checkpoint PASS on stacked Draft #357 exact `778568e83b89fd0ac14827cbeeaff3e2fd4dc5eb`. B1/B2 stay Draft/unmerged. Next rung is B3 from `feature/moderation-visibility-b2-commands`, inactive until owner continuation. No Leva review until the folded final feature.


## 2026-11-20 — B3 activated

Owner continued after B2 Mira PASS. Lira is assigned B3 core public projection/discovery in a new stacked PR based on `feature/moderation-visibility-b2-commands`. Internal B3 microsteps use targeted checks without routine STOP/full-CI loops; after complete B3 author self-check + one full exact-head CI → Mira checkpoint.


## 2026-11-20 — B3 cadence corrected to small batches

Owner clarified the purpose of decomposition: prevent Lira from stalling on long uninterrupted work. B3 now runs in batches of 2–3 related microsteps (fewer if a step grows), targeted checks, then STOP for owner `...`. Full repository CI is still deferred to whole-B3 completion unless a concrete cross-cutting risk justifies an earlier run.


## 2026-11-20 — intermediate B3 auto-CI is not a gate

GitHub automatically triggers broad workflows on B3 pushes. Lira must not wait for, poll or rerun those workflows to close an intermediate 2–3-microstep batch. Batch closure uses targeted checks, then STOP for owner `...`. Full exact-head CI remains a whole-B3 end gate unless a concrete B3-relevant risk requires earlier escalation.

## Manual PR test execution

Owner decision: PR CI/acceptance runs are agent-triggered rather than automatic on every PR head change.

Control contract:
- `run:ci` triggers main CI;
- `run:acceptance` triggers relevant acceptance workflows subject to their existing path filters;
- `workflow_dispatch` remains fallback;
- labels are one-shot commands and are removed after consumption.

Current independent Leva review: #362 exact 5ed18dcffb856564fd0e8df9ec9d43020cd7f807 — **PASS**, MANUAL-CI-LEVA-01/02 CLOSED. The final two-line CI correction passes the resolved base via VICO_CI_BASE_REF to the child guard; shipped-command local verification and exact-head CI support closure. Full evidence and the unexecuted pre-merge hosted-dispatch boundary: research/manual-pr-tests-review.md.

Next: owner merge #362; Mira performs one post-merge workflow_dispatch smoke for an open PR using expected head/base, then routes dependent docs #363 through its separate review. Prior positive acceptance evidence remains relevant because acceptance/controller code is unchanged. #342 remains the only service channel; this process PASS does not activate moderation B4.

## Parallel stale/legacy audit handoff

Илья напрямую поручил передать отдельный systematic stale/legacy audit Мире-2 через #342. Полный метод и границы: `research/stale-legacy-audit-handoff.md`. Это параллельная audit-only задача; активный moderation visibility B4 остаётся отдельной текущей цепочкой Лиры.

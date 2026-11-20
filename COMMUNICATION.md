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

Продуктовые V-P1/V-P2/V-P3 уже ACCEPTED (D-08); их нельзя повторно открывать из-за утраты записи при migration. V-T1/V-T2 technical fit PASS. Лёва завершил адаптацию полного V1–V9 к main6fa2a43 и разложил один visibility PR на checkpoints B1–B9: `stages/moderation-visibility/PLAN.md`.

Действующие важные адаптации: current Watch/Bookmarks/Mute/Block и unavailable own/inbox projections; новая visibility capability в existing AP-10/admin/History/Owner classification; atomic publication/recovery guards; parent-topic lock для новых body translation plans; public asset gate до bucket. Эти детали уже входят в stage plan и не являются новыми product forks.

**B1 author self-check PASS**, [Draft #355](https://github.com/iliya1947/vico-forum/pull/355) exact `736da519e3f3fcae716ec5fb1b81886cdac63a6e`: schema/permission/History foundation with forward repository migration 0071, default-visible topic/post, partial queue, AP-10, typed History, neutral labels and Owner mapping. CI 44640562493 checks 2752/2752, PG17 1483/1483, 74-table manifest parity, runtime privilege probes and Worker; **13/13 workflows SUCCESS**. Public Hide/Restore/write/read gates not present; no production/external migration acceptance. **Next Mira bounded B1 coordinator checkpoint**; B2 only after Mira PASS and owner continuation.

## Дальнейшие планы

- Moderation visibility: B1 foundation implemented and author-verified in stacked Draft #355; next Mira B1 checkpoint. Remaining B2–B9 inactive.
- Forum structure/topic move: S0–S10 plan принят Мирой; implementation не активен.


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

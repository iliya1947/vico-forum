# stages/corrections/PLAN.md — активный план consolidated audit corrections в #354

## Цель

Закрыть четыре уже подтверждённых presentation/state defects одним implementation PR и провести один финальный review-cycle всего пакета.

## C1 — WATCH-AUDIT-1 [P2]

Причина: `TopicWatchControl` хранил loader state во втором local `confirmed`; fresher revalidation могла быть пропущена во время pending, затем старый ACK записывал старое desired state.

Требуемый результат:
- loader — единственный owner confirmed state;
- transient unavailable/refresh остаётся отдельным UI state;
- старый successful ACK не меняет confirmed state;
- no automatic mutation replay;
- regressions OFF→ON→OFF и ON→OFF→ON.

Статус: bounded PASS в #354; финальный exact head `01cecb91090a2f29f90b7c6ae4a83db77a0f4910` подтверждён CI и connected Watch 11/11.

## C2 — BOOKMARKS-AUDIT-1 [P2]

Причина идентична Watch: `TopicBookmarkControl` local `confirmed` мог перекрывать свежий loader state старым ACK.

Требуемый результат:
- loader authoritative;
- matching ACK очищает только transient outcome;
- preserve pending/error/explicit refresh/actor-topic response guards;
- regressions обоих направлений и realistic normal-success fixture.

Статус: bounded PASS; loader-authoritative correction и обе регрессии, итоговый exact head `01cecb91090a2f29f90b7c6ae4a83db77a0f4910` зелёный.

## C3 — BOOKMARKS-AUDIT-2 [P2] — COMPLETE

Причина: Bookmarks list после Remove ACK устанавливает local removed latch. Если до доставки ACK тема уже заново сохранена и fresh loader list снова содержит row, latch продолжает скрывать её, даже после revalidation.

Требуемый результат:
- fresh loader list authoritative для наличия row;
- старый Remove ACK не может скрыть row, который присутствует в более свежем loader snapshot;
- покрыть Remove COMMIT → Add COMMIT → fresh list read → old Remove ACK;
- дополнительная revalidation не должна оставлять stale hidden row;
- не ломать accepted B5 pagination/cursor/account-switch/sessionStorage actor-marker semantics;
- не вводить global store/version/cache/automatic retry.

Статус: bounded PASS на exact head `6dd9c66c2d22158f41e76089436399082b6553c5`; local `removed` latch удалён, fresh loader authoritative, causal regression и обычное удаление покрыты, 7/7 exact-head workflows SUCCESS.

## C4 — TITLE-AUDIT-1 [P3] — COMPLETE

Причина: title editor вызывает focus на opener до `setDraft(null)` DOM commit, когда opener ещё hidden; Chromium после Save/Cancel остаётся на BODY.

Требуемый результат:
- после Save и Cancel focus возвращается на Edit-title opener после его фактического появления;
- не добавлять initial autofocus без требования;
- не менять write/revision/CAS/conflict/rebase semantics;
- component/browser regression для обоих случаев.

Статус: bounded PASS; post-commit focus Save/Cancel, React Router и реальный Chromium 9/9, immutable-title/CAS/rebase не менялись. Итоговый exact head `01cecb91090a2f29f90b7c6ae4a83db77a0f4910`.

## Final gate

1. Лира author self-check всего #354.
2. Применимые exact-head tests/CI/connected evidence без ложных claims.
3. Stable final exact head.
4. Мира fresh whole-PR review **всего consolidated diff**.
5. При Mira PASS — Лёва один independent whole-PR review того же head.
6. Owner merge.

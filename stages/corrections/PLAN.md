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

Статус: implementation присутствует в #354.

## C2 — BOOKMARKS-AUDIT-1 [P2]

Причина идентична Watch: `TopicBookmarkControl` local `confirmed` мог перекрывать свежий loader state старым ACK.

Требуемый результат:
- loader authoritative;
- matching ACK очищает только transient outcome;
- preserve pending/error/explicit refresh/actor-topic response guards;
- regressions обоих направлений и realistic normal-success fixture.

Статус на migration head `79066ada...`: implementation и tests уже присутствуют в diff; final author checkpoint ещё не зафиксирован.

## C3 — BOOKMARKS-AUDIT-2 [P2]

Причина: Bookmarks list после Remove ACK устанавливает local removed latch. Если до доставки ACK тема уже заново сохранена и fresh loader list снова содержит row, latch продолжает скрывать её, даже после revalidation.

Требуемый результат:
- fresh loader list authoritative для наличия row;
- старый Remove ACK не может скрыть row, который присутствует в более свежем loader snapshot;
- покрыть Remove COMMIT → Add COMMIT → fresh list read → old Remove ACK;
- дополнительная revalidation не должна оставлять stale hidden row;
- не ломать accepted B5 pagination/cursor/account-switch/sessionStorage actor-marker semantics;
- не вводить global store/version/cache/automatic retry.

## C4 — TITLE-AUDIT-1 [P3]

Причина: title editor вызывает focus на opener до `setDraft(null)` DOM commit, когда opener ещё hidden; Chromium после Save/Cancel остаётся на BODY.

Требуемый результат:
- после Save и Cancel focus возвращается на Edit-title opener после его фактического появления;
- не добавлять initial autofocus без требования;
- не менять write/revision/CAS/conflict/rebase semantics;
- component/browser regression для обоих случаев.

## Final gate

1. Лира author self-check всего #354.
2. Применимые exact-head tests/CI/connected evidence без ложных claims.
3. Stable final exact head.
4. Мира fresh whole-PR review **всего consolidated diff**.
5. При Mira PASS — Лёва один independent whole-PR review того же head.
6. Owner merge.

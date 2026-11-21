# agents/lira.md — рабочая память Лиры по #342

## Текущее назначение — B5; STOP после B5.3

B1 #355, B2 #357, B3 #359 и B4 #365 получили bounded Mira PASS и остаются Draft/unmerged. B4 stable exact `97b9187cc42e5479c5cab43d9f69a9bfa6ed8a9e`, [CI #44909767945](https://github.com/iliya1947/vico-forum/actions/runs/44909767945) SUCCESS, 9/9 workflows. B5 разрешён владельцем через #342 после B4 PASS.

## B5.1 Watch ON/OFF

Создан [stacked Draft #367](https://github.com/iliya1947/vico-forum/pull/367) с base = B4 branch `feature/moderation-visibility-b4-assets-translations` exact `97b9187cc42e5479c5cab43d9f69a9bfa6ed8a9e`. Current exact `7bb6b652e2b23568e86471005364177031761bc1`, compare ahead 2 / behind 0; changed files only `db/forum-repository.ts` + `tests/database/topic-watch.test.ts`.

- `setTopicWatch` keeps topic `FOR NO KEY UPDATE` before active actor check; hidden/missing topic denies ON with neutral not-found; own OFF for hidden/missing returns false after active actor admission.
- Added PostgreSQL-targeted regression for hidden ON denial, own/other retained pair separation, hidden/missing OFF, inactive actor refusal, Restore.
- GitHub diff and source assertions checked. **PostgreSQL/Vitest/CI execution not run; B5 author PASS not established.** No schema/route/UI change.

## B5.2 Bookmarks ON/OFF and unavailable own lists

[Draft #367](https://github.com/iliya1947/vico-forum/pull/367) exact `6d4f8b6b98a357f96b8acc7d5393f35593d81125`; base #365 unchanged. Changed-file scope B5.1+B5.2 exactly 8 files, ahead 12/behind 0. Bookmark save locks visible topic `FOR SHARE` (conflicts with Hide `FOR NO KEY UPDATE`) before actor; own remove retains `FOR KEY SHARE`, succeeds for hidden/missing target with active actor check. Private list keeps retained pair pagination/keyset but source joins only visible topic. Hidden/missing rows reveal only own pair id/save date, display neutral placeholder and Remove, no source link/identity/location.

Added PG-targeted Hide/Restore/actor-isolation/keyset/absent-target tests and real 2-connection Add×Hide order barriers, plus route/UI DTO/undo regressions; English label. GitHub exact-head source/diff reviewed, **PostgreSQL/Vitest/lint/typecheck/CI not run**, so whole B5 author PASS is not established.

## B5.3 Mute/Block и unavailable muted list

[Draft #367](https://github.com/iliya1947/vico-forum/pull/367) exact `7e73cd12e1644edf8a95a78b721c8d075390a1f9`, base #365 unchanged. Mute ON acquires topic `FOR SHARE` before actor, denies hidden/missing; own OFF retains `FOR KEY SHARE`, admits active actor, succeeds for hidden/missing. `readMutedTopics` preserves own keyset rows and only joins visible metadata; unavailable row is own pair ID/timestamp only, no hidden title/author/location/link. Private route/UI allow Unmute; Block/Reveal existing hidden-content gates remain unchanged and get PG regression.

B5.3 changes 8 files on top of B5.1/B5.2, full B5 local diff 14 files/20 commits, no behind commits. GitHub static source/patch checks PASS. Tests authored: real PG Mute×Hide both orders, hidden/Restore, missing OFF, 50+2 pagination, Block hidden author and route/UI masking. **Local PostgreSQL/Vitest/CI cannot be executed via current environment; not run.** B5 author self-check/CI PASS remains pending for final whole-B5 checkpoint.

## Next

**Лира STOP after B5.3.** On owner `...`, continue only B5.4: mixed/legacy inbox masking, mark/read/open, chronology and suppression receipts, Restore no fanout/reset. Then whole B5 exact-head checks/author self-check and Mira bounded coordinator checkpoint. Do not begin B6/B7, merge, Leva whole-feature review or Stage6.

# agents/lira.md — рабочая память Лиры по #342

## Текущее назначение — B5; STOP после B5.2

B1 #355, B2 #357, B3 #359 и B4 #365 получили bounded Mira PASS и остаются Draft/unmerged. B4 stable exact `97b9187cc42e5479c5cab43d9f69a9bfa6ed8a9e`, [CI #44909767945](https://github.com/iliya1947/vico-forum/actions/runs/44909767945) SUCCESS, 9/9 workflows. B5 разрешён владельцем через #342 после B4 PASS.

## B5.1 Watch ON/OFF

Создан [stacked Draft #367](https://github.com/iliya1947/vico-forum/pull/367) с base = B4 branch `feature/moderation-visibility-b4-assets-translations` exact `97b9187cc42e5479c5cab43d9f69a9bfa6ed8a9e`. Current exact `7bb6b652e2b23568e86471005364177031761bc1`, compare ahead 2 / behind 0; changed files only `db/forum-repository.ts` + `tests/database/topic-watch.test.ts`.

- `setTopicWatch` keeps topic `FOR NO KEY UPDATE` before active actor check; hidden/missing topic denies ON with neutral not-found; own OFF for hidden/missing returns false after active actor admission.
- Added PostgreSQL-targeted regression for hidden ON denial, own/other retained pair separation, hidden/missing OFF, inactive actor refusal, Restore.
- GitHub diff and source assertions checked. **PostgreSQL/Vitest/CI execution not run; B5 author PASS not established.** No schema/route/UI change.

## B5.2 Bookmarks ON/OFF and unavailable own lists

[Draft #367](https://github.com/iliya1947/vico-forum/pull/367) exact `6d4f8b6b98a357f96b8acc7d5393f35593d81125`; base #365 unchanged. Changed-file scope B5.1+B5.2 exactly 8 files, ahead 12/behind 0. Bookmark save locks visible topic `FOR SHARE` (conflicts with Hide `FOR NO KEY UPDATE`) before actor; own remove retains `FOR KEY SHARE`, succeeds for hidden/missing target with active actor check. Private list keeps retained pair pagination/keyset but source joins only visible topic. Hidden/missing rows reveal only own pair id/save date, display neutral placeholder and Remove, no source link/identity/location.

Added PG-targeted Hide/Restore/actor-isolation/keyset/absent-target tests and real 2-connection Add×Hide order barriers, plus route/UI DTO/undo regressions; English label. GitHub exact-head source/diff reviewed, **PostgreSQL/Vitest/lint/typecheck/CI not run**, so whole B5 author PASS is not established.

## Next

**Лира STOP after B5.2.** On next owner `...`, continue only B5.3 (Mute/Block visibility plus unavailable muted list) in #367, with focused checks. Then inbox, whole B5 self-check with exact-head applicable CI/acceptance → Mira coordinator checkpoint. Do not begin B6/B7, merge, Leva whole-feature review or Stage6.

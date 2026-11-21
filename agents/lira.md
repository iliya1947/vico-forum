# agents/lira.md — рабочая память Лиры по #342

## Текущее назначение — B5; STOP после первого микропакета

B1 #355, B2 #357, B3 #359 и B4 #365 получили bounded Mira PASS и остаются Draft/unmerged. B4 stable exact `97b9187cc42e5479c5cab43d9f69a9bfa6ed8a9e`, [CI #44909767945](https://github.com/iliya1947/vico-forum/actions/runs/44909767945) SUCCESS, 9/9 workflows. B5 разрешён владельцем через #342 после B4 PASS.

## B5.1 Watch ON/OFF

Создан [stacked Draft #367](https://github.com/iliya1947/vico-forum/pull/367) с base = B4 branch `feature/moderation-visibility-b4-assets-translations` exact `97b9187cc42e5479c5cab43d9f69a9bfa6ed8a9e`. Current exact `7bb6b652e2b23568e86471005364177031761bc1`, compare ahead 2 / behind 0; changed files only `db/forum-repository.ts` + `tests/database/topic-watch.test.ts`.

- `setTopicWatch` keeps topic `FOR NO KEY UPDATE` before active actor check; hidden/missing topic denies ON with neutral not-found; own OFF for hidden/missing returns false after active actor admission.
- Added PostgreSQL-targeted regression for hidden ON denial, own/other retained pair separation, hidden/missing OFF, inactive actor refusal, Restore.
- GitHub diff and source assertions checked. **PostgreSQL/Vitest/CI execution not run; B5 author PASS not established.** No schema/route/UI change.

## Next

**Лира STOP** after B5.1. On next owner `...`, continue only B5.2 (Bookmarks ON/OFF and unavailable own lists) in #367, with targeted checks. Keep microsteps narrow; avoid full CI until assembled B5 or a concrete reason arises. Then Mute/Block, inbox, and whole B5 author self-check with applicable exact-head CI → Mira bounded checkpoint. B6/B7, merge, Leva whole-feature review and Stage6 remain blocked.

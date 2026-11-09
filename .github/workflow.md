# Admin panel — current workflow

- Service PR: **#251**.
- Current main/base: **`787cf6deae38138de2ffe867368ae794349f471f`**.
- Current stage: **Super-admin SA-01 — SA01-MIRA-01 corrected, implementation Ready; awaiting Mira fresh whole-PR coordinator review on new exact head**. SA-02+ not authorized.
- Approved scope: Lev [SA plan #6745289141](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6745289141); Mira [scope PASS #6745393863](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6745393863), [Lira assignment #6745414259](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6745414259).
- Implementation: **[Ready PR #313](https://github.com/iliya1947/vico-forum/pull/313)**, stable exact head **`6d7f50f979a8aba220b4439646304717c3d8b7c4`**, unmerged. Previous head `5927b04045dbb0eaf0285df1b7bc116ab6d2d425` received Mira CHANGES REQUIRED [#6749272021](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6749272021) and is superseded.
- **Delivered SA-01:** migrations `0062` + append-only Owner events/observations, typed PG retained history; exact-Owner shell with Admin/profile entry links; current Worker/PG/5xx System monitors; adjacent scoped History and one global Event log projecting source identity; limited-coverage and freshness indicators; Infrastructure Stage6 inert placeholder; EN/RU/HE/RTL/responsive/keyboard; private/no-store and independent 401/403/400/404/503 guards.
- **SA01-MIRA-01 corrected:** `Coverage since` now uses the **earliest retained scoped History timestamp** from both `owner_monitor_observations.observed_at` and `owner_events.occurred_at`, not the most recent sample or only the earliest recorded 5xx. New native PG17 test file covers multi-observation Runtime/Database, Requests with observations/no events and both source-orderings; no other functional change.
- **[Exact-head CI #42684010768](https://github.com/iliya1947/vico-forum/actions/runs/42684010768) SUCCESS:** 169 application files/**2144 tests**, 54 PG17 files/**619 tests**; lint/typecheck/build/migrations/manifest/runtime grants/Worker.
- **[Exact-head SA-01 Chromium #42684011022](https://github.com/iliya1947/vico-forum/actions/runs/42684011022) SUCCESS:** connected built Worker/Better Auth/disposable PG17/Chromium, original SA-01 15 acceptance checkpoints.
- **[Exact-head existing Chromium #42684011268](https://github.com/iliya1947/vico-forum/actions/runs/42684011268) SUCCESS:** all four regression jobs.
- **Next agent:** Mira — fresh coordinator whole-PR review only after applicable Owner visual gate. Lira stops; Lev technical review only after Mira PASS; Mark unassigned. Neither Mira new-head PASS nor Owner visual acceptance is claimed.
- No SA-02–SA-08, unified user profile/deactivation/auth-security monitoring, production/Neon/Cloudflare/live Stage6, real Google/Owner external binding, permanent docs or merge.


## SA-01 corrected head — visual gate correction

- PR #313 stable corrected head: `6d7f50f979a8aba220b4439646304717c3d8b7c4` on unchanged main `787cf6deae38138de2ffe867368ae794349f471f`.
- `SA01-MIRA-01` correction precheck: implementation now derives `Coverage since` from the earliest retained scoped observation/event; dedicated PG17 regressions cover the three requested cases.
- Exact-head CI `#42684010768`, SA-01 Chromium `#42684011022`, existing Chromium `#42684011268`: SUCCESS.
- Correction: Owner visual acceptance is **not an applicable SA-01 gate** here; visual polish is a separate UI/UX product stage. Fresh coordinator review proceeds without blocking on visual polish.

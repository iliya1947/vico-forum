# Admin panel — current workflow

- Service PR: **#251**
- Current main: **`95272b587643efa6844303aed8522c44b136e699`**
- Current stage: **Settings SET-06 Privacy — implementation merged; docs-only closeout delivered, pending Mira docs-only review**
- Implementation **[PR #311](https://github.com/iliya1947/vico-forum/pull/311): merged**; final exact head **`11639e79ae67b61062d05bf3f05e32526204a056`**; merge/current main **`95272b587643efa6844303aed8522c44b136e699`**.
- Implementation checks: [CI #42504491033](https://github.com/iliya1947/vico-forum/actions/runs/42504491033) **SUCCESS**, [Chromium #42504491099](https://github.com/iliya1947/vico-forum/actions/runs/42504491099) **SUCCESS** (4/4 jobs).
- Implementation reviews: **Mira coordinator PASS** and **Lev independent technical PASS** on `11639e79`; **SET06-MIRA-01 closed**.
- **Documentation [Ready PR #312](https://github.com/iliya1947/vico-forum/pull/312)**, frozen exact head **`b681c8e657ab687084879b95d76c7f0281657243`**, base `main` `95272b587643efa6844303aed8522c44b136e699`, open/mergeable.
- Docs PR: exactly seven assigned Markdown files — `PROJECT.md`, `PROJECT_STATE.md`, `ROADMAP.md`, `docs/ADMIN_PANEL.md`, `docs/SETTINGS.md`, `docs/PROJECT_HISTORY/PROJECT_HISTORY.md`, new `docs/PROJECT_HISTORY/PROJECT_HISTORY_22.md`. No code/schema/migration/workflow changes.
- **Docs exact-head [CI #42508278251](https://github.com/iliya1947/vico-forum/actions/runs/42508278251): SUCCESS** — 167 app files/2114 tests, 52 PostgreSQL17 files/605 tests, lint/typecheck/build, migration/catalog/runtime and Worker checks. No new Chromium needed or claimed for docs-only changes.
- **Лира**: documentation author work complete; stopped. **Next: Мира** — docs-only review of PR #312 on exact `b681c8e657ab687084879b95d76c7f0281657243`. **Лёва**: not assigned to docs; **Марк**: unassigned.
- **Settings closeout not yet complete**: docs PR must pass Mira review and be merged by Owner. No production/Neon/Stage6/live Google/Owner binding or Owner visual acceptance.

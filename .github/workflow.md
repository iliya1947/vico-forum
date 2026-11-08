# Admin panel — current workflow

- Service PR: **#251**
- Current main/base: **`2f2969d5b3a7ca7844d674b85448838fc671eaca`**
- Current stage: **Settings SET-05 documentation closeout — SET05-DOC-MIRA-01 correction delivered, fresh docs-only review pending**
- Implementation PR #309: **merged**; final implementation Mira + Lev PASS
- Documentation [PR #310](https://github.com/iliya1947/vico-forum/pull/310): **open / Ready / mergeable**
- Documentation current stable exact head: **`d9134f8f3c57814aa910a272f2a9dc4c118fccb3`**
- New correction commit: exactly one `docs/SETTINGS.md` sentence narrowed to remove unverified general `logs` secrecy guarantee; no other docs/code changed in the corrective commit
- Whole PR scope remains **7 Markdown files**, no runtime/schema/migration/CI-workflow change
- Exact-head [CI #42489445378](https://github.com/iliya1947/vico-forum/actions/runs/42489445378): **SUCCESS** (checks/database, 2084 app + 597 PostgreSQL17 tests, lint/typecheck/build)
- Mira earlier docs-only CHANGES REQUIRED on `182a185e1ed8dc734b45ebd1ba15c4bcf45b4fde`; subsequent PASS on unchanged head formally invalidated by coordinator. **No PASS yet on new exact head**
- **Лира**: bounded correction completed, stopped; no author whole-PR review
- **Мира**: next — fresh docs-only review on exact `d9134f8f3c57814aa910a272f2a9dc4c118fccb3`, decide whether `SET05-DOC-MIRA-01` is closed
- **Лёва**: stopped/not assigned for docs; **Марк**: unassigned
- Owner merge #310: **blocked until fresh Mira PASS**
- SET-06 Privacy: inactive/pending until SET-05 docs closeout merged; Stage6/production/live Google/real Owner binding unclaimed.

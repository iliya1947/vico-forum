# Admin panel — current workflow

- Service PR: **#251**
- Current main/base: `76fc5b16be4f2425a0ad1fdcb7b38974db355c56`
- Current stage: **Settings SET-05 — SET05-LEV-01 correction delivered; fresh coordinator whole-PR re-review pending**
- Approved technical plan: **#251 comment #6711736883**
- Implementation: **PR #309**, open / **Ready** / mergeable, new stable exact head **`236a15c5f3309a5466c70c7a934edf5b56ade433`**
- Previous reviewed head `a4af2014eb28a39d54d10c33cc515cbf3d5f258e`: Mira coordinator PASS, followed by Lev **CHANGES REQUIRED** on confirmed P2 SET05-LEV-01; these reviews do **not** establish new-head PASS
- SET05-LEV-01 author correction: Settings BFF uses Better Auth 1.7.7 HTTP `/change-password` handler rather than direct `auth.api`, restoring canonical database-backed per-trusted-IP **3/10s** rate limiting and proper 429 + retry headers; native PG and actual Chromium regressions
- Previous SET05-MIRA-01/02 corrections remain unchanged
- Exact-head [CI #42483839708](https://github.com/iliya1947/vico-forum/actions/runs/42483839708): **SUCCESS** (app 2084/2084; PG17 597/597; lint/typecheck/build)
- Exact-head [existing Chromium #42483839769](https://github.com/iliya1947/vico-forum/actions/runs/42483839769): **SUCCESS** (4/4 jobs; Settings SET-05 13 checkpoints + existing SET-03/02; [synthetic evidence](https://github.com/iliya1947/vico-forum/actions/runs/42483839769/artifacts/13618153570))
- Implementer **Лира**: assigned correction completed, stopped; no author whole-PR review
- **Мира**: next — fresh coordinator whole-PR review on exact `236a15c5f3309a5466c70c7a934edf5b56ade433`; no new coordinator verdict yet
- **Лёва**: previous independent review completed; repeat independent review only after fresh Mira PASS
- **Марк**: unassigned
- Owner merge: **not ready until independent review cycle**
- Permanent docs: separate post-merge closeout; SET-06/Stage6/production inactive.

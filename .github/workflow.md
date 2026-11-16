# Admin panel — current workflow

- **Service PR:** #331, coordination-only; never merge.
- **Current main:** `b5180e5fcc8483dc13e1b087102a51560c80e035` after merged #335.
- **SA04 code:** complete and merged. Final code review gate was Mira + Lira + Mark PASS, 0 confirmed current-SA04 defects.
- **Current subtask:** separate **SA04 documentation/state closeout** required by AGENTS and the accepted SA04 plan.
- **Docs branch:** `docs/sa04-accountstate-closeout`, created from exact current main `b5180e5fcc8483dc13e1b087102a51560c80e035`; no documentation commit/PR yet.
- **ACTIVE AUTHOR:** **Lira (ChatGPT-6)**.
- **Author scope:** factual permanent-doc closeout only. No product/runtime code, schema, migration, dependencies, CI workflow changes, SA05 implementation, #315, deployment or Stage6.
- **Required factual corrections:** record SA04 as implemented repository/local-CI **AccountState/lifecycle foundation and enforcement**, while explicitly preserving that **the production Owner deactivation command/UI is not implemented and belongs to SA05**.
- **Expected documentation set:** `PROJECT.md`, `PROJECT_STATE.md`, `ROADMAP.md`, `docs/SUPER_ADMIN.md`, stale cross-reference wording in `docs/ADMIN_PANEL.md` and `docs/UI_UX_PASS.md`, plus new `docs/PROJECT_HISTORY/PROJECT_HISTORY_27.md` and the history index.
- **PROJECT_STATE factual delta:** update date; migration history through `0065_sa04_account_state_foundation`; Super-admin status SA01–SA04; remove claims that SA04 itself is undelivered; retain Stage6/external and final visual limits.
- **SUPER_ADMIN permanent contract:** document the delivered SA04 lifecycle tuple/public neutral projection/auth-session closure/cross-domain active-actor admission and preserved retention/content semantics. Do not claim SA05 deactivation action, reactivation, hard delete, forced foreign logout or retention-end job.
- **History:** preserve the actual multi-PR SA04 delivery (#327 A1, #328 A2–H, #329 I, #330 J, #332 K, #333 L, #334 M+N, #335 O–S), significant correction/review facts and final repository/local-CI evidence without turning history into current SoT.
- **After author READY:** Mira coordinator reviews the whole docs PR. Since Lira is author, she does not independently review her own docs. Any independent docs reviewer is assigned only after Mira PASS.
- **Boundary:** no merge by agents.

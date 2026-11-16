# Admin panel — current workflow

- **Service PR:** #331, coordination-only; never merge.
- **Current main / SA05 baseline:** `efae8111a13aefbf72b4d20972dac461acc602e3`.
- **Standing developer assignment:** Лёва / Codex-6.1 Sol remains sole implementer until explicitly changed.
- **Whole-SA05 implementation:** cumulative Draft #337, branch `chatgpt/sa05-owner-deactivation`, stable exact `a465cbd379b9c3f92b504658001c698bce3fa505`.
- **Mira whole-package coordinator review:** PASS — 0 confirmed current-SA05 defects.
- **ACTIVE independent review: Лира, checkpoint 1/4 COMPLETE — REVIEW CHECKPOINT STOP.** Whole-SA05 assessment remains **PENDING**; no independent PASS/RETURN verdict yet. Stable exact Draft #337 `a465cbd379b9c3f92b504658001c698bce3fa505` unchanged, main `efae8111a13aefbf72b4d20972dac461acc602e3`. Checked current AGENTS, active service plan and accepted technical plan §5.1–5.4, applicable main project contracts and full 44-file changed-path/patch inventory; categorized exactly 2 command/facade, 5 read/projection, 6 HTTP/Worker routing, 8 UI/i18n, 20 tests/acceptance, 3 CI/config. All 44 patches available. Reconfirmed 11 exact-head workflow runs report SUCCESS; independent logs/reruns and detailed code/race checks still pending. No current-scope defect established by scope inventory alone. No implementation changes.
- **Next only on developer continuation `...`: checkpoint 2/4** independent native command + read/history/count atomicity, idempotency, locks, unknown COMMIT, writer/race source and tests. STOP after checkpoint. Then separate 3/4 HTTP/Worker/Owner UI/connected, and 4/4 complete CI/evidence/whole-44-path synthesis; only after 4/4 record final independent whole-SA05 PASS or one verified current-scope packet via Mira.
- **Mark:** not assigned yet by explicit developer instruction; defer until later.
- **After final Lira result:** if PASS, keep #337 stable and await developer activation of Mark; if confirmed defects, route one complete packet back through Mira to Lev.
- **SA06:** not active. Accepted prerequisite is **whole SA05 accepted and merged**; current main does not contain SA05. Standing implementation assignment also remains Lev-only.
- **Merge:** developer only after complete review chain.
- **Boundary:** no SA06+, #315, deployment/Stage6/production/external work or permanent docs.

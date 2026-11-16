# Admin panel — current workflow

- **Service PR:** #331, coordination-only; never merge.
- **Current main:** `b5180e5fcc8483dc13e1b087102a51560c80e035`.
- **SA04 implementation:** merged and code-review closed.
- **Docs PR #336:** open, Ready, unmerged, exact reviewed head `7d18f6fd7f98a7fd63a8f5154e64052e1b7cc305`, 8 Markdown paths, CI #43842620689 SUCCESS.
- **Mira whole-docs coordinator verdict:** **RETURN — 2 confirmed current-doc defects; no other current-doc defects found in the reviewed scope.**
- **DOC-SA04-MIRA-01:** `PROJECT_STATE.md` and `ROADMAP.md` incorrectly say the full SA05–SA08 technical plan still requires agreement. This is false: fresh whole-plan PASS was already recorded in #331 comment #6895280436; #6895657016 then activated SA04-L under the accepted remaining plan. Correct permanent docs so SA05 remains unimplemented/inactive but does **not** require replanning/approval of the already accepted whole SA05–SA08 plan. A separate assignment/current-main refresh may still be required before implementation.
- **DOC-SA04-MIRA-02:** `PROJECT_HISTORY_27.md` incorrectly attributes the effective L→M+N→O–S merge sequence and #335 squash merge to the developer as an Owner action. Historical facts must not rewrite the process error: L was the already-merged historical exception; the developer explicitly chose review+merge of M+N before continuing; #334/#335 merges were initiated by Mira in violation of the Owner-only merge rule. The history need not memorialize the process incident in detail, but it must remove false developer attribution. Neutral wording such as “the delivery ultimately used L / M+N / O–S merge blocks” and “#335 was squash-merged after the three-PASS gate” is sufficient.
- **Superseded service evidence:** prior comments that state the developer/Owner performed #335 merge are not reliable evidence of who initiated that action; this workflow entry supersedes that attribution while preserving the actual merged commit.
- **ACTIVE AUTHOR:** Lira corrects only these two defects in #336. No unrelated doc rewrite.
- **After correction:** new stable exact head + applicable CI → Mira fresh whole-docs coordinator review from the beginning. No independent reviewer before Mira PASS.
- **Boundary:** no SA05 implementation, #315, deployment, Stage6, production action or agent merge.

# agents/lira.md — active correction assignment for assembled #355

## Goal

Correct only the two confirmed final-review defects in existing Draft #355, then author-check and STOP.

## Target

- implementation PR: #355
- branch: `feature/moderation-visibility-b1-foundation`
- reviewed starting head: `fdad1930fc68a854d52bee31922f923be5c1c751`
- base/current main at assignment: `9cff976a9621d9fe5dfef28ea5367e390ff435b1`

## Required corrections

1. **VIS-FINAL-LEVA-01:** pending own Help signal withdrawal must remain available when its topic/proposed original/selected-answer dependency is hidden. Preserve exact signal/topic membership, author-only, pending-only, active-account and safe lock ordering; do not weaken create/review/content gates. Add real-PG coverage for hidden primary/original/answer plus foreign/nonpending/inactive negatives and no hidden-source disclosure.

2. **VIS-FINAL-LEVA-02:** ordinary Admin topic must preserve sanitized hidden tombstone chronology so permanent post numbers, original-question identity, anchors/parent relations and best-answer candidates do not shift when root/middle content is hidden. Do not expose hidden source/revision/attachments and do not give ordinary Admin an includeHidden/private-reader bypass. Add focused model/route/render regressions for hidden root, hidden middle/parent and candidate behavior.

## Done

- bounded implementation and tests only;
- author self-check of complete correction diff;
- meaningful targeted/PG checks;
- fresh applicable PR CI/acceptance if changed paths trigger them;
- publish new exact head + evidence in service state and STOP for Mira.

Do not merge #355, start docs/structure task or deploy.

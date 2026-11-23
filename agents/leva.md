# agents/leva.md — Task 6 current-main plan reconciliation

## Goal

Make the already accepted forum-structure/topic-move S0–S10 plan implementation-ready on current main. Do not redesign the feature from scratch.

## Baseline

- main `a3dae5815e26d158c566a27c552127b4b1ab29aa`
- accepted plan: `stages/forum-structure/PLAN.md`
- task: create/rename ordinary categories/sections, sibling Up/Down order, section reparent, ordinary topic move; no delete/archive/merge/bulk; ordinary↔Help conversion forbidden.

## Required reconciliation

Independently verify current main and preserve accepted plan unless a real conflict exists.

Explicitly resolve the post-visibility seam:
- ordinary/public-safe topic readers intentionally do not expose hidden topic source;
- topic move must not weaken that boundary;
- determine the correct protected targeting/presentation path for a hidden ordinary topic if it is movable under the accepted scope;
- preserve `is_hidden`, visibility state and all retained domain/personal state;
- recheck actual move×Hide/Restore lock ordering/races.

Also revalidate the already accepted current-section publication-receipt replay and Owner `forum.structure` History projection against actual current code.

Deliver the final implementation-ready technical plan/amendment with bounded stages, dependencies and done criteria. Then STOP for Mira delivery-mode decision. Do not implement yet.

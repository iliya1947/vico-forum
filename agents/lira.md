# agents/lira.md — персональная рабочая память Лиры по #342

## Текущее состояние

Moderation visibility stacked delivery:

- B1 Draft #355 exact `704d5a46d59841538524424296ac28eaa39aa5e6` — Mira bounded PASS.
- B2 Draft #357 exact `778568e83b89fd0ac14827cbeeaff3e2fd4dc5eb` — **Mira bounded PASS**.
- B1/B2 remain Draft/unmerged.
- **Лира STOP. B3 is prepared but inactive until owner continuation.**

## Следующий возможный этап — B3 core public projection/discovery

On explicit owner continuation, create a new stacked implementation PR with base:

`feature/moderation-visibility-b2-commands`

B3 bounded result from the accepted plan:
- typed visible post vs hidden tombstone projection;
- hidden topic neutral public 404;
- consistent thread snapshot and stable chronology/anchors;
- SQL visibility filtering before rank/count/LIMIT across the B3 public discovery/read paths;
- hidden best-answer/duplicate references become safe unavailable projections without changing retained domain state;
- public post/history/edit/recovery denial where required by B3;
- sentinel leak tests for HTML/JSON/.data/meta/errors and pagination/rank/count/root/parent boundaries.

Do not implement B4 asset/private-file work, B5 own lists/inbox, B6 private moderation surface, B7 actions/UI, or later stages.

Use focused checks while implementing internal B3 microsteps; one full exact-head CI/self-check before the B3 bounded checkpoint, unless a concrete cross-cutting risk requires an earlier full run.

After whole B3 author PASS → STOP Mira for bounded B3 checkpoint. No intermediate merge to main and no Leva until final folded feature.

## B2 review result

Mira reviewed #357 local B1→B2 diff on exact `778568e83b89fd0ac14827cbeeaff3e2fd4dc5eb` and found no confirmed current-B2 blocker. Final CI: 22/22 checks, 18/18 workflows SUCCESS; 2758 unit, 1578 PG17. Translation planning coverage already present in B2 overlaps part of future B4 but is not a defect; B4 should avoid duplicate work and verify the remaining boundary when reached.

## Границы

V-P1–V-P3 accepted; V-T1/V-T2 PASS. #342 never merge. Stage6/#300/general UI/UX excluded.

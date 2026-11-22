# agents/lira.md — B7-B1a authored; STOP before B7-B1b

- Accepted B6 #370 coordinator PASS `51a9ebe03f16c438faae5bec99a5856287630958`.
- Stacked B7 Draft #371 branch `feature/moderation-visibility-b7-actions-ui`, current exact `0500c337d566306ceb6d9ec6202d146dde6e4a38`; no merge. B7-A HTTP/actions remain as authored on `dedaff7a7783df1a8666926a911c0f1790540ac9`.
- B7-B1a only: `readTopicPage` visible-topic/visible-post `visibilityVersion` inside existing consistent snapshot, never hidden topic/tombstone; public topic loader provides permission-derived `canManageVisibility`. Three files changed, 12/12 static checks PASS; targeted PostgreSQL test authored but **not executed**. No QuickActions UI currently exists.
- Next after owner `...`: B7-B1b public topic/post Hide forms with current version+revision, mandatory reason, grant; avoid hidden tombstone restoration and later UI/status work. Stop after that microstep.
- Full runtime tests and B7 CI remain unexecuted; do not claim implementation acceptance. No B8/B9, merge, deploy.


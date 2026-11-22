# agents/lira.md — B7-B3a authored; STOP before B7-B3b

- Accepted B6 #370 exact `51a9ebe03f16c438faae5bec99a5856287630958`; stacked B7 Draft #371 exact head `7ce9fdd3c71fb0092ddfdd41fd66ec3e71002a96`, base B6 unchanged.
- B7-A/B1a/B1b/B2a/B2b source and targeted test matrices previously authored, scoped static checks only.
- B7-B3a scoped changes: `app/routes/topic.tsx` + new `app/routes/topic-visibility-redirect.test.tsx` (three commits / two files, behind 0). Existing `editorClientAction` result is examined ONLY after server action: for confirmed topic Hide with matching route topicId (including admitted no-op), clientAction returns typed private-inspector React Router `replace` with private no-store. Before public revalidation 404, browser leaves old source without stale rendering; post Hide, topic Restore, failures, unrelated action redirects/returns unchanged. No new server endpoint/authorization or public hidden-source data.
- Direct + mounted fetcher/404 regression source authored; **25/25 scoped static assertions PASS**, official React Router 8.3.1 semantics checked. Vitest/PG/browser/CI NOT run, no runtime PASS claim.
- **STOP.** On owner `...` start only B7-B3b post Hide→sanitized tombstone revalidation + narrow DOM regression. Other B7 errors/refresh/pending/revoke/actor switch and private Restore outcomes in later packages. No B8/merge/deploy.

# Admin panel — current workflow

- **Service PR:** #331, coordination-only; never merge.
- **Current main / cumulative SA04 M–S base:** `859ea69165f51cd997e61b1d1f30f6663f045965`.
- **Cumulative implementation PR:** Draft #334, exact current reviewed head `c86edbd7d42fef18ee550a7ac5225d26a02eb52d`, open/draft/unmerged/mergeable.
- **Delivered in main:** SA01–03 and SA04 A–L. L is the historical separate-merge exception.
- **Completed in cumulative PR:** whole M + whole N.
- **Mira whole-N coordinator review:** **PASS — 0 confirmed current-N defects** on exact `c86edbd7d42fef18ee550a7ac5225d26a02eb52d`.
- **N evidence checked:** all 16 N-delta paths; production transaction/lock/error mapping; all 8 direct commands; replay/duplicates, state-first/writer-first, save-priority CAS, N-DEP-01, N↔J edit/locale races, evidence cleanup fence, Appeal/Decision notification fanout; actual Worker + Better Auth + PostgreSQL17 + Chromium 401/503/500 and mounted-form nonce retention. Exact-head CI: PG17 1011/1011, app 2359/2359; AP10/SA03/M2 connected regressions green; synthetic merge tree equals implementation tree.
- **Known CI qualification:** unchanged Drizzle 0.31.10 BigInt generator TypeError/exit0 remains non-substantive generated-parity evidence. N has no schema/migration/dependency delta; actual 69-table production manifest parity is green.
- **Current package:** **O ACTIVE** — own locale atomic write lifecycle closure in the same cumulative Draft #334.
- **O locator refresh:** `db/hyperdrive-user-locale.ts`, `app/routes/settings-user.tsx`, `app/routes/settings-user-locale.test.ts` are unchanged from current main; accepted O plan applies without replanning.
- **Lira:** ACTIVE on whole O. No internal Mira gate unless she chooses author-only substeps; coordinator review only after whole O is complete.
- **Mira:** STOP until whole-O AUTHOR CHECKPOINT.
- **Lev/Mark:** inactive; Lev only on genuine technical escalation/plan conflict or final whole-SA04 independent review after S.
- **Merge boundary:** no merge after N/O/P/Q/R; one Owner merge only after S + final whole-SA04 Mira/Lev reviews.
- **Boundary:** no P implementation before whole-O PASS; no SA05, #315 remediation, permanent docs, production/deployment or Stage6.

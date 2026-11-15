# Admin panel — current workflow

- **Service PR:** #331, coordination only, never merge.
- **Current main / cumulative SA04 M–S base:** `859ea69165f51cd997e61b1d1f30f6663f045965`.
- **Cumulative implementation PR:** Draft #334, exact stable head `c594932a6032066d994391ea08606bcb933956e7`, open/unmerged.
- **Delivered in main:** SA01–03 and SA04 A–L. L is the historical separate-merge exception (#333).
- **Completed in cumulative PR:** whole **SA04-M** (M1+M2).
- **Mira whole-M coordinator review:** **PASS — 0 confirmed current-M defects** on exact `c594932a6032066d994391ea08606bcb933956e7`.
- **Evidence checked:** all 8 changed paths; production transaction/error mapping; native PostgreSQL race/replay/quota/interleaving coverage; actual Worker+Better Auth+PG17+Chromium connected acceptance; CI 979/979 native and 2347/2347 app; synthetic merge tree equals implementation tree.
- **Known CI qualification:** unchanged Drizzle 0.31.10 generator BigInt TypeError/exit0 means that single generated-drift step is not substantive parity evidence. M has no schema/migration/dependency delta; real 69-table production manifest parity is green.
- **Merge boundary:** no merge after M. Same cumulative #334 continues through N→O→P→Q→R→S.
- **Current gate:** Mira review complete / STOP. Await developer continuation before activating N.
- **Next package when continued:** Lira implements whole **N (N1→N2→N3)** in the same Draft #334; no Mira gate between N1/N2/N3.
- **Lev/Mark:** inactive; Lev only on genuine technical escalation or final whole-SA04 independent review after S.
- **Final SA04 gate:** S AUTHOR STOP → Mira whole-SA04 coordinator review → Lev independent same-head whole-SA04 review → Owner merge once.
- **Boundary:** no N implementation until developer continuation; no SA05, #315 remediation, permanent docs, production/deployment or Stage6.

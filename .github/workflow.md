# Admin panel — current workflow

- **Service PR:** #331, coordination only, never merge. #251 historical archive.
- **Current main / K base:** `398dae18d5ca7c3fc6dd84fd93a29d7c381ba366`.
- **Package / plan:** SA04-K, accepted complete technical plan #331 comment #6877583725.
- **Implementation:** cumulative Draft #332, open/draft/unmerged. Returned exact head: `1454b04fb75816edb53961af5ca69409d17ecc4a`.
- **Lev independent corrected whole-K review:** **RETURN — one residual current-K P3, SA04-K-LEV-01 still incomplete.** Full report/reproducer: #331 comment #6890890734.
- **Mira verification:** residual finding independently accepted as current-K. Exact React Router 8.3.1 matcher accepts arbitrary trailing slash sequences via `\\/*$`; current helper removes only one trailing empty segment, so repeated trailing slashes can reach the private attachment handler but miss the unexpected-5xx private/no-store classifier.
- **Active actor:** **Lira — one bounded completion of SA04-K-LEV-01 in cumulative #332.**
- **Required result:** private attachment GET/HEAD unexpected 5xx classification must cover Router-accepted repeated trailing-slash aliases as the same resource, while preserving the already-correct case/percent-encoded handling and malformed-input safety.
- **Acceptance:** add focused representative list/file regressions with repeated trailing slashes, including at least one combination with existing alias handling; add representative actual built-Worker unexpected-fault proof; keep response status/body/cookies, successful responses, public GET caching and write policy unchanged. Applicable exact-head gates must pass.
- **Boundary:** no request URL rewrite, no internal-separator normalization, routing/auth/SQL/R2 redesign, #315 remediation, L–S, SA05, schema/migration/dependency/public-contract expansion, permanent docs or Stage6.
- **After Lira AUTHOR STOP:** Mira performs a fresh cumulative whole-K coordinator review on the new stable exact head; only after Mira PASS does Lev independently review that same head.
- **Lev / Mark:** inactive. No merge/deploy.
- **Future planning constraint:** after full SA-04 closure, SA-05 implementation is blocked until SA-05–SA-08 are technically planned together as one complete remaining dependency chain.

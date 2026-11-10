# Безопасность Vico Forum — current workflow

1. Service PR: **#315**.
2. Current main verified for Authentication & sessions planning: `e279cb6c032a489a9044ca1191407df887c364b4`.
3. Scope: общая безопасность Vico Forum.
4. Block A — Super-admin security/pentesting architecture recorded; PR #317 security review PASS on its reviewed exact head remains recorded in communication.
5. **Current worked block: B — Authentication & sessions security audit.**
6. Block B attack map is frozen for audit execution: account linking/takeover, fixation/cookies, session IDOR/revoke, CSRF/Origin, brute-force/rate limits, OAuth callback/redirect integrity, password change, freshness, registration races, leakage/failure and dependency-version exposure.
7. No Block-B implementation/fix PR exists. Planning does not assert a vulnerability.
8. Technical planner/implementer/reviewer for corrections remain unassigned until the audit produces a confirmed current-scope finding.
9. No Cloudflare/Neon/production mutation is authorized.
10. Next after developer continuation: execute **B3 Account linking / account takeover** against current repository/local runtime evidence and stop with findings/classification.

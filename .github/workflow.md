# Безопасность Vico Forum — current workflow

1. Service PR: **#315**.
2. Audit baseline: main `e279cb6c032a489a9044ca1191407df887c364b4`.
3. Block B audit B1–B11: **completed**.
4. Confirmed findings: `AUTH-LINK-01`, `AUTH-SESSION-01`, `AUTH-SESSION-02`, `AUTH-SESSION-03`, `AUTH-ENUM-01`, `AUTH-OAUTH-01`, `AUTH-REG-01`, `AUTH-CACHE-01`.
5. Correction sequence: **B-C1 auth runtime/API hardening** first; **B-C2 registration cutoff serialization** second.
6. B-C1 scope: seven findings except `AUTH-REG-01`, plus coordinated Better Auth package upgrade from `1.7.7` toward verified target `1.7.19`.
7. B-C2 scope: only `AUTH-REG-01`; plan after B-C1 completes on the updated auth baseline.
8. **Current stage: B-C1 technical planning.**
9. Technical planner: **Лёва / Codex-6.1 Sol**.
10. Implementer: unassigned until technical plan is accepted; standard next implementer is Лира.
11. Implementation PR: none.
12. Reviewer: unassigned until implementation stable head; coordinator review remains Мира, then Лёва if he did not implement.
13. Stage 6 external integration remains paused; no production/Cloudflare/Google/Neon mutation is authorized.
14. Next: Лёва reads current main + #315 and records the minimal technical plan for B-C1; no implementation yet.

# Accepted Target-Contract Map

> **WORKING AUDIT MATERIAL — NOT A PRODUCT SOURCE OF TRUTH**
>
> This map records the independently reviewed output of `DL-TARGET-001`. It guides later documentation
> restoration and implementation planning; it does not itself change project contracts, authorize an
> external rollout, select remediation mechanics, or make any ledger classification `final`.

## Closure summary

- accepted assignments screened: **2,029 / 2,029**;
- exhaustive subsystem partitions: **13**;
- target contracts: **13**;
- atomic target states: **51**;
- bad/overbroad corrective records reconciled: **23**;
- confirmed current-defect IDs: **29 across 15 groups**;
- evidence-limited IDs reconciled: **16 / 16**;
- resolved target conflicts: **10**;
- unresolved target conflicts: **0**;
- new user decisions required: **0**.

The map is not a rollback to PR #12. It preserves accepted later product work, justified corrections,
useful future-proof foundations, and technically acceptable alternatives. PR #50 governs the prospective
forum/product-first path but is not applied retroactively to the classification of PR #20–#49. User
Decision `UD-001=A` preserves the current safe-read unavailable-locale `307` English fallback.

## Target contracts

### TC-01 — Locale registry and routing

Preserve the generic/data-driven BCP-47 registry, bootstrap English, explicit URL authority,
request-scoped resolution, formatting/direction metadata, technical-route separation, and degraded
bootstrap-English availability boundary. Preserve `UD-001=A`: safe unavailable explicit locale reads use
temporary `307` to the equivalent `/en/...`; active canonicalizable variants use `308`; redirect-required
unsafe methods fail closed before actions.

### TC-02 — UI freshness and stale semantics

Preserve canonical English, exact-locale source priority, separate fallback bundles, fingerprint
freshness, stale exclusion/reporting, and fallback. Restore the permissive real-pack contract by removing
the implicit zero-stale gate; restoring the removed synthetic canary is not required.

### TC-03 — Persistent UI translations and bundles

Preserve persistent origins/provenance, semantic bundle identity, persisted-first exact-locale reads,
separate fallback, and atomic task/raw/bundle publication. Restore trimmed canonical-English exclusion,
own-property namespace validation, and durable convergence from obsolete persisted bundle formats without
request-time provider calls. Exact convergence mechanics remain remediation work.

### TC-04 — Database, Hyperdrive, migrations, and external rollout

Preserve reviewed forward migrations, immutable accepted history, least privilege, repository-owned
migration evidence, request-scoped Hyperdrive boundaries, and useful deadlines/verifiers. Prospectively
apply PR #50: ordinary product work stays local/CI. Narrow old blanket blockers; do not preselect mandatory
Neon/Hyperdrive/Worker topology. Keep local evidence in ordinary CI and live verification at actual
schema-dependent rollout. Preserve corrected PostgreSQL membership/application-owner semantics and defer
real roles, grants, topology, migrations, smoke, and private-data isolation to authorized Stage 6 work.

### TC-05 — Content-translation identity and Stage 5B

Preserve immutable forum revisions, independent `sourceLocale | und`, separate title revisions, original
content, and revision-bound translation identity. Defer content translation service, structured Markdown
translation, persistence, presentation, and any permanent superseded-revision retention policy until the
accepted Stage 5B boundary or another real consumer requires the decision.

### TC-06 — Forum domain and presentation

Preserve public forum reads, revision-backed authenticated writes, server-derived identity, same-origin
validation, transactional graph writes, safe Markdown, cooldown/concurrency protection, solved/best-answer
invariants, and locking. Restore plural-aware topic/message counts, the intended rollback-test failure
path, and desktop post-content placement. `EX55-18` remains evidence-limited and authorizes no behavior
change by itself.

### TC-07 — Authentication and external OAuth

Preserve the Better Auth schema/runtime/session foundation, request-scoped capability, guest/expired
session behavior, server-owned locale, cookie refresh, and locale-safe auth UX. Do not preselect separate
Google projects/clients as an unconditional architecture constant. Defer real credentials, deployed OAuth
acceptance, external auth capability/grants, and first-manager bootstrap to Stage 6.

### TC-08 — Dynamic authorization

Preserve the direct-user-approved dynamic permission model, code-backed catalog, server-side current DB
authority, protected management UI, and lockout protection. Restore internally consistent snapshots for
composite user and management reads. Preserve PR #76 typed availability-only degradation and supersede PR
#61 catch-all suppression. Defer external bootstrap and capability verification to Stage 6.

### TC-09 — Provider-neutral translation execution

Preserve capability-based provider-neutral routing, adapter-owned locale mapping, structured/plain
operations, untrusted-output validation, provider/model provenance, and the prohibition on provider calls
in SSR resource loading. Preserve generation-policy, stale-preflight, and provenance invariants omitted by
the PR #50 documentation rewrite. Complete a locally testable concrete adapter in Stage 5A; defer real
credentials, calls, secrets, and external acceptance to Stage 6.

### TC-10 — Durable task lifecycle and publication

Preserve durable semantic identity, commit-before-enqueue, claims/leases, DB-owned time, idempotent state,
stale preflight, monotonic generation heads, claim/generation fencing, and atomic publication. Restore
fresh-plan `A → B → A` reactivation without weakening stale-delivery/completed terminality or publication
fencing. Keep retry/DLQ and durable reconciliation/observability as remaining Stage 5A work without
preselecting orchestration; defer real Queue binding to Stage 6.

### TC-11 — Observability and proportional hardening

Preserve independently useful low-cost boundaries: method-aware redirects, least-privilege CI/action
pins, allowlisted SSR logging, corrected query redaction, malformed-row isolation, bounded localization
deadlines, and own-property namespace checks. Restore telemetry so one invalid-origin physical row is not
counted by both persistent adapters.

### TC-12 — State, history, and contract responsibility

Preserve `PROJECT_STATE.md` as current factual state, `PROJECT_HISTORY.md` as a non-authoritative history
index, subsystem documents as contract owners, and Git/PR evidence as primary history. Narrow the PR #40
history to the confirmed zero-stale gate; do not claim canary removal itself was a regression or that
strict backdated laundering was proven. Add the current PR #72 reactivation and PR #75 bundle-convergence
limitations to state/history. Make no unsupported user-review attribution.

### TC-13 — Review and CI evidence

Keep CI, reviews, and historical external observations as supporting evidence rather than product or
architecture authority. Do not turn the current exact he/ka/ru migration assertion into a permanent
immutable data invariant; a future legitimate migration may update that current-final-state test.

## Confirmed current-defect obligations

| Group | IDs | Target |
| --- | --- | --- |
| CD-01 | `EX40-02` | Restore permissive stale-pack semantics; no implicit zero-stale gate. |
| CD-02 | `EX31-10/14/16` | Reject whitespace-wrapped canonical English in persistent storage/verifier boundaries. |
| CD-03 | `EX34-23` | Require own-property canonical namespace membership in bundle paths. |
| CD-04 | `EX39-11` | Prevent duplicate telemetry count for one invalid-origin physical row. |
| CD-05 | `EX44-14` | At actual Stage 6 rollout, prove the newest migration truly required by runtime. |
| CD-06 | `EX52-25/26` | Use locale-aware plural-capable forum count messages. |
| CD-07 | `EX57-27` | Make the rollback test reach its intended transactional failure. |
| CD-08 | `EX58-43` | Place desktop best-answer/body/solution controls in the intended content area. |
| CD-09 | `EX60-27` | Give composite user authorization one internally consistent snapshot. |
| CD-10 | `EX61-42` | Give management-state reads one internally consistent snapshot. |
| CD-11 | `EX72-20/45/46/47/48/49/50` | Restore fresh-plan `A → B → A` reactivation with existing safety fences. |
| CD-12 | `EX75-56/57/58/59` | Provide durable convergence for obsolete/rejected persisted bundle formats. |
| CD-13 | `EX77-24` | Narrow the overbroad PR #40 history label. |
| CD-14 | `EX77-58/59` | Add current PR #72/#75 findings to history. |
| CD-15 | `EX77-75/76` | Add current PR #72/#75 limitations to state. |

Non-resolution/supporting IDs are not double-counted as additional defects. This table selects semantic
targets only, not implementation mechanisms or patch ordering.

## Eventual source-of-truth synchronization

Required semantic synchronization:

- `PROJECT_HISTORY.md`: narrow PR #40; add PR #72/#75 findings; preserve evidence limits;
- `PROJECT_STATE.md`: add the current PR #72/#75 Stage 5A limitations;
- `docs/translation/PROVIDERS_AND_JOBS.md`: restore broad fresh-plan reactivation while preserving fences;
- `docs/translation/STORAGE_AND_VERSIONING.md`: require durable convergence for obsolete bundle formats;
- `docs/auth/AUTHORIZATION.md`: require internally consistent composite authorization snapshots.

Provenance qualification only, if historical prose is touched:

- `docs/database/HYPERDRIVE.md`: describe unpreserved external observations as repository-recorded claims,
  not independent proof.

Already aligned at the relevant contract level:

- `docs/translation/UI_TRANSLATION.md`;
- `docs/translation/LOCALES.md`;
- `docs/database/MIGRATIONS.md` (with future Stage 6 enforcement still outstanding);
- `PROJECT.md`;
- `ROADMAP.md`.

No source-of-truth file is changed by this working map.

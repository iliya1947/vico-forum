# DL-IMPLEMENT-R2-PREFLIGHT-001/1 — Phase 5 R2 preflight

**Status: PASS**

> **PREFLIGHT ONLY — IMPLEMENTATION IS NOT AUTHORIZED BY THIS ARTIFACT**
>
> This response reconstructs the already accepted R2 scope from the accepted
> `DL-REMEDIATION-PLAN-001/1 → /2` planning chain and checks it against the exact current
> repository baseline. It does not implement R2, create an implementation PR, modify PR #78,
> perform an external migration, or start R3–R7.

## 1. Verified baseline

- Current `main`: `da8d8cb1541b56463739e974a74cb29bc5f2527d`.
- Current PR #78 head: `3b1c2d0306e8e524371ee3389aa4fcaaa3bcb492`.
- Current PR #79 head before this response: `966297e4aba29239618468162fc4489257862352`.
- Current checked-in migration history ends at `0010_translation_task_generation_order`
  with 11 journal entries.

PR #78 remains Codex-owned. This preflight writes only to PR #79.

## 2. Accepted planning chain and exact R2 scope

This preflight does not derive a new R2. It uses the accepted planning chain:

1. `DL-REMEDIATION-PLAN-001/1`
   - reviewed PR #78 head: `6ae147d34d6289c363d1646218fa9b3bdd666667`;
   - archived narrative:
     `doc_old/audit/chatgpt-review/DL-REMEDIATION-PLAN-001_old_22.9.26_1.md`;
   - archived machine artifact:
     `doc_old/audit/chatgpt-review/DL-REMEDIATION-PLAN-001_old_22.9.26_1.json`.
2. `DL-REMEDIATION-PLAN-001/2`
   - reviewed PR #78 head: `6122ab34294cef8f50b5d1d6d4f48ed88805d66b`;
   - current narrative:
     `audit/chatgpt-review/DL-REMEDIATION-PLAN-001.md`;
   - current machine artifact:
     `audit/chatgpt-review/DL-REMEDIATION-PLAN-001.json`;
   - `/2` changed dependency/scheduling semantics only. R2 IDs, defect scope, DB gates,
     non-goals, and implementation boundary stayed unchanged.
3. Codex accepted the implementation-remediation plan in PR #78 at
   `367d7e4a5d9be34451bf3163031c6740f10d4e94`.

The exact accepted R2 identity is:

- series: **`R2` — Persistent translation storage invariant**;
- remediation unit: **`REM-04`**;
- canonical defect group: **`CD-02`**;
- target-contract slice: **`TC-03-B`**;
- atomic defect IDs:
  - **`EX31-10`** — canonical English exclusion for persistent translation rows;
  - **`EX31-14`** — canonical English exclusion for persistent bundle rows;
  - **`EX31-16`** — repository-owned production verifier detects persistent English rows.

The accepted `/2` correction is material to scheduling: **R2 has no hard dependency on R1 or
another remediation unit**. The immutable accepted-migration-history rule remains a hard invariant:
the correction must be a new forward migration after `0010`. `REM-04 → REM-06` is only
recommended ordering for reduced migration/store retest churn.

## 3. Accepted R2 invariant and non-goals

### Required invariant

Persistent `ui_translations` and `ui_translation_bundles` rows must reject canonical English
identity after trimming/case-insensitive comparison, and repository-owned production verification
must detect the same invalid state.

Concretely, the existing nonblank predicate remains, while the English exclusion must treat values
such as `" en "` and `" EN "` as English. The bounded semantic correction is equivalent to using
`lower(btrim(locale))` for the English comparison.

R2 does **not** authorize a broader locale-normalization rule such as requiring every non-English
persistent locale value to equal `btrim(locale)`.

### Accepted non-goals

1. Do not edit accepted migration `0002_ui_translation_storage.sql`.
2. Do not silently delete existing invalid data as part of the audit fix.
3. Do not perform external migration rollout or production verification.

### Task-level non-goals

1. Do not implement R3–R7.
2. Do not change translation runtime/provider/Queue behavior.
3. Do not create an implementation PR during this preflight.
4. Do not modify PR #78.
5. Do not convert historical Stage 3A migration-only rollout ordering into a new ordinary local/CI gate.

## 4. Exact current paths and per-defect verification against `main`

Accepted R2 current-path set from the planning artifact:

- `drizzle/0002_ui_translation_storage.sql`;
- `db/schema.ts`;
- `.github/scripts/verify-production-migration.mjs`;
- `tests/database`.

### `EX31-10` — current

Current `db/schema.ts` still defines:

`ui_translations_locale_check = btrim(locale) <> '' and lower(locale) <> 'en'`.

The accepted `0002_ui_translation_storage.sql` has the same predicate. A value such as
`" en "` is nonblank and `lower(" en ") <> "en"`, so it passes.

No migration after `0002` through current `0010` replaces this constraint.

**Result: defect remains current.**

### `EX31-14` — current

Current `db/schema.ts` still defines:

`ui_translation_bundles_locale_check = btrim(locale) <> '' and lower(locale) <> 'en'`.

Accepted migration `0002` contains the same predicate. Whitespace-wrapped English therefore
passes the bundle-table constraint as well.

No later migration through `0010` corrects it.

**Result: defect remains current.**

### `EX31-16` — current

Current `.github/scripts/verify-production-migration.mjs` checks:

- `ui_translations WHERE lower(locale) = 'en'`;
- `ui_translation_bundles WHERE lower(locale) = 'en'`.

Those queries miss whitespace-wrapped English such as `" en "`.

**Result: defect remains current.**

## 5. Check for partial supersession by PR #81/#83/#84/#85

The merged PRs were checked by actual file set:

1. PR #81 (`944ea2f01ab85e1e888981c2d789f2cfde0bb3b0`) changed R1 localization
   code/tests, `PROJECT_STATE.md`, and its archive.
2. PR #83 (`7f1b5df0040e8b2e72fcf10df6947ae9415a2fc2`) changed Stage 5A
   documentation/state only.
3. PR #84 (`95acb1f49423a22eec997d45297776edf287d68b`) changed authorization
   documentation/state only.
4. PR #85 (`da8d8cb1541b56463739e974a74cb29bc5f2527d`) changed
   `PROJECT_HISTORY.md` and archives only.

None changed `db/schema.ts`, `drizzle/*`, the R2 production verifier, or the relevant
database tests. No R2 atomic defect was superseded by these merges.

## 6. Deliberate disconfirmation

The preflight deliberately tried to prove both that the three defects were already fixed and that a
schema change was unnecessary.

### Counter-evidence found

1. `translation_tasks_target_locale_check` already requires a trimmed non-English task target:
   `target_locale = btrim(target_locale)`, nonblank, and not English.
2. `db/ui-translation-bundle-store.ts` calls `persistentBundleLocale()`, which rejects
   non-canonical or English bundle locales on its normal store boundary.
3. `db/ui-translation-publication-store.ts` writes machine translation/bundle rows using the
   validated durable task target locale.
4. `db/ui-translation-store.ts` exposes a read path and short-circuits exact `locale === "en"`;
   it does not provide evidence that the PostgreSQL invariant itself is fixed.

This counter-evidence makes whitespace-wrapped English unlikely through the normal current machine
publication flow. It does **not** disconfirm R2 because:

- the PostgreSQL CHECK constraints themselves still admit the invalid identity;
- `db/schema.ts` still encodes the wrong final schema invariant;
- the repository-owned production verifier independently misses the same invalid state;
- runtime guards do not protect direct/manual/future persistent writes and cannot change an
  already-applied database constraint.

### Attempt to prove schema change unnecessary

That attempt fails:

1. a TypeScript-only guard cannot alter an existing PostgreSQL CHECK constraint;
2. a verifier-only change detects bad state but does not prevent it;
3. changing `db/schema.ts` alone does not alter already-applied database history;
4. `0002` is accepted immutable history.

**Conclusion: a new forward migration is required.**

## 7. Bounded implementation plan

This is a plan only; it does not authorize the implementation.

### A. Mandatory schema/constraint correction

Path:

- `db/schema.ts`.

Bounded changes:

1. Tighten `ui_translations_locale_check` so the English comparison uses
   `lower(btrim(locale)) <> 'en'`.
2. Tighten `ui_translation_bundles_locale_check` the same way.
3. Preserve the existing nonblank checks, constraint names, and every unrelated schema invariant.

### B. Mandatory migration change

A new forward migration is required after accepted `0010`.

Expected generated paths for this exact baseline:

- `drizzle/0011_persistent_translation_locale_invariant.sql`;
- `drizzle/meta/0011_snapshot.json`;
- appended entry in `drizzle/meta/_journal.json`.

The migration must alter only the two affected CHECK constraints needed for the accepted invariant.
It must not modify any existing migration/snapshot and must not silently delete violating rows.

### C. Mandatory DB verifier correction

Path:

- `.github/scripts/verify-production-migration.mjs`.

Bounded change:

- both persistent-English branches must detect `lower(btrim(locale)) = 'en'`.

This is repository source correction only. Running that production verifier against an external target is
not part of R2 local/CI acceptance.

### D. Focused regression tests

Path:

- `tests/database/migrations.test.ts`.

Required focused coverage:

1. update the full-history migration count from 11 to 12 after the new migration exists;
2. final-schema integration test rejects at least `" en "` and `" EN "` with PostgreSQL
   SQLSTATE `23514` for `ui_translations`;
3. equivalent rejection for `ui_translation_bundles`;
4. valid canonical non-English rows remain accepted.

`tests/database/ui-translation-storage.test.ts` intentionally runs historical migration `0002` in
isolation. It should remain unchanged rather than retroactively pretending `0002` contained the later
forward correction.

### E. Documentation/state sync

When implementation actually changes factual repository state:

- update `PROJECT_STATE.md` minimally, including migration history `0000–0010 → 0000–0011`;
- preserve its exact pre-change version first as
  `doc_old/PROJECT_STATE_old_22.9.26_4.md`, assuming the implementation still starts from this exact
  main SHA and no intervening same-day edit consumes that archive index.

No R2 preflight evidence requires changes to `PROJECT_HISTORY.md`,
`docs/database/MIGRATIONS.md`, `TRANSLATION_ARCHITECTURE.md`, or `docs/translation/*`.
Their current contracts already support the accepted invariant and forward-migration/local-CI boundary.

## 8. Exact implementation changed-file allowlist

For an R2 implementation based on
`main@da8d8cb1541b56463739e974a74cb29bc5f2527d`, the exact allowlist is:

1. `db/schema.ts`
2. `drizzle/0011_persistent_translation_locale_invariant.sql` — new
3. `drizzle/meta/0011_snapshot.json` — new
4. `drizzle/meta/_journal.json`
5. `.github/scripts/verify-production-migration.mjs`
6. `tests/database/migrations.test.ts`
7. `PROJECT_STATE.md`
8. `doc_old/PROJECT_STATE_old_22.9.26_4.md` — new exact pre-change archive

If `main` advances before implementation, this preflight must be revalidated rather than silently
expanding or renumbering this allowlist.

## 9. Exact forbidden-file boundary

**Every repository path not in the eight-file allowlist above is forbidden for R2 implementation on this
baseline. No additional new file may be created.**

Explicit high-risk forbidden paths/sets include:

1. accepted SQL migrations `drizzle/0000_tan_johnny_storm.sql` through
   `drizzle/0010_translation_task_generation_order.sql`;
2. accepted snapshots `drizzle/meta/0000_snapshot.json` through
   `drizzle/meta/0010_snapshot.json`;
3. `tests/database/ui-translation-storage.test.ts`;
4. `.github/scripts/migration-history.mjs`;
5. `.github/scripts/migration-history.test.mjs`;
6. `.github/scripts/verify-migration-history.mjs`;
7. `.github/runtime-migration-evidence.json`;
8. `.github/workflows/ci.yml`;
9. `.github/workflows/production-db-migrate.yml`;
10. `docs/database/MIGRATIONS.md`;
11. `docs/database/HYPERDRIVE.md`;
12. `TRANSLATION_ARCHITECTURE.md`;
13. `docs/translation/*`;
14. `PROJECT_HISTORY.md`;
15. `db/ui-translation-store.ts`;
16. `db/ui-translation-bundle-store.ts`;
17. `db/ui-translation-publication-store.ts`;
18. `app/localization/*`;
19. PR #78 audit/control files;
20. all R3–R7 implementation paths.

The two new files created by **this preflight response** under `audit/chatgpt-review/` are response
artifacts, not implementation allowlist entries.

## 10. Mandatory implementation checks / DB gates

The accepted R2 DB gates remain:

- `pnpm db:check`;
- `pnpm db:test`;
- green GitHub Actions **`database`** job on the actual implementation PR head.

The task additionally requires the complete implementation verification set:

1. focused DB regression:
   `pnpm exec vitest run --config vitest.database.config.ts tests/database/migrations.test.ts`;
2. migration-history guard:
   `node --test .github/scripts/migration-history.test.mjs`;
3. `pnpm db:check`;
4. `pnpm lint`;
5. `pnpm typecheck`;
6. `pnpm test`;
7. `pnpm build`;
8. `pnpm db:test`;
9. green GitHub Actions **`database`** job on the actual implementation PR head.

No external migration workflow, live production-verifier execution, runtime-migration-evidence update,
or Stage 6 smoke is required or authorized by R2 local/CI acceptance.

## 11. Migration-only split decision

**Migration required: YES.**

**Migration-only split required: NO.**

Reasons:

1. Accepted `TC-04` keeps ordinary development work in local/CI and reserves live migration/runtime
   sequencing for actual external schema-dependent rollout.
2. Current `docs/database/MIGRATIONS.md` explicitly permits a development migration to land together
   with schema/code consistency changes when no external runtime rollout is happening.
3. R2 is one bounded repository/local-CI correction: schema mirror + forward migration + repository-owned
   verifier + regression tests + factual state sync.
4. The historical Stage 3A migration-only rollout sequence is not a current R2 contract.

## 12. Outcome

**PASS**

1. All three accepted R2 atomic defects remain current:
   `EX31-10`, `EX31-14`, `EX31-16`.
2. R2 remains exactly `REM-04 / CD-02 / TC-03-B`; no new architectural decision was invented.
3. A new forward migration after `0010` is necessary.
4. A migration-only split is not necessary under the current repository contract.
5. The future implementation is bounded to the exact eight-file allowlist above.
6. No R2 implementation was performed, no implementation PR was created, no external operation was
   performed, and PR #78 was not changed.
7. Codex remains the lead reviewer; this response is supporting-review evidence only.

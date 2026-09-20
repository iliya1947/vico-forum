# DL-DECISIONS-001 — finite user-decision candidate set

> Working audit material. This response identifies choices that repository evidence cannot resolve.
> It does not select an option, define a target contract, propose remediation, or advance any record
> to `final`.

Task source: PR #78 head `363f2011156c9e35fd503fcf9a3f25a266271f20`  
Audited main: `3282aa51f47f36131d35c34ee79ca37cb2ce434f`  
Accepted Phase-2 input: **2,029 / 2,029** active assignments
(**1,698 classified+disconfirmed + 331 reviewed-supporting**).

## Result

The exact deduplicated set contains **one** normative user-decision candidate.

No demonstrated defect is converted into a user question. Confirmed defects, justified fixes,
intentional foundations, existing direct-user decisions, historical evidence gaps, and technical
questions answerable from repository/primary standards evidence are excluded.

## UD-001 — explicit unavailable-locale safe-read UX

### Atomic IDs

`AN11-05`, `DLX12-12`, `DLX13-01`, `EX16-07`.

### Exact scope

Only `GET`/`HEAD` requests whose explicit `/:locale` candidate is malformed, unknown,
inactive, or disabled.

This candidate does **not** reopen:

- generic/data-driven locale architecture;
- explicit-URL authority over user/cookie/header negotiation;
- active alias/deprecated/case canonicalization with `308`;
- non-`GET`/`HEAD` fail-closed behavior before action side effects;
- internal-only redirect destinations;
- the SEC-01 no-registry/task/provider/quota-side-effect invariant.

### Valid options

#### Option A — preserve the current temporary English fallback

Keep current behavior:

```text
GET/HEAD + malformed/unknown/inactive/disabled explicit locale
→ 307 Temporary Redirect
→ same route remainder/query under /en/...
```

Consequences:

- the visitor gets readable English content instead of an unavailable-locale error;
- the requested explicit locale URL changes to `/en/...`, but only through a temporary redirect;
- malformed, unknown, inactive, and disabled locales continue sharing one safe-read policy;
- current route/query preservation and SEC-01 behavior remain unchanged.

#### Option B — return 404 for unavailable explicit locale

Use strict explicit-URL semantics:

```text
GET/HEAD + malformed/unknown/inactive/disabled explicit locale
→ 404 Not Found
```

Consequences:

- Vico does not substitute another locale when the URL explicitly addressed an unavailable locale;
- inactive/disabled locale URLs remain unavailable until publication status permits them;
- users lose automatic English fallback for mistyped/unknown locale URLs;
- non-`GET`/`HEAD` behavior remains unchanged.

A split-by-state third design is technically possible, but the audited history does not establish it
as an existing competing decision. This audit does not invent it as another option.

### Why Git cannot resolve this choice

1. `AN11-05`: PR #11 briefly hard-coded unavailable-locale `404`, then removed that choice before
   merge because it was premature, explicitly restoring a separate decision gate.
2. `DLX12-12`: the PR #12 control point required the unavailable-locale policy to be selected before
   Stage 1B, but supplies no direct-user authority for one response.
3. PR #13/#16 then implemented the temporary English redirect; `EX16-07` is accepted as a technically
   valid alternative, **not** a direct-user product decision.
4. Current `docs/translation/LOCALES.md` encodes the `307 → /en/...` behavior, but current
   documentation cannot supply missing historical/normative authority for its own choice.
5. The user's fixed generic-locale decision says Vico must remain data-driven and uncapped; it does
   not select the UX for an unavailable explicit locale.
6. PR #50's product-first/external-infrastructure timing and the accepted dynamic-authorization
   extension are unrelated.

### Target-contract documents affected

Primary:

- `docs/translation/LOCALES.md` — `LOC-03`, `LOC-04`, `LOC-05`, `SEC-01`.

Synchronization if needed after a decision:

- `TRANSLATION_ARCHITECTURE.md` — authoritative explicit-locale/fallback invariant;
- `PROJECT.md` — high-level locale contract only if wording must change;
- `ROADMAP.md` — acceptance/test wording only if the chosen target changes current behavior.

### Dependencies

No other user-decision candidate depends on UD-001 and UD-001 depends on none.

The fixed safety/architecture constraints listed above remain independent of either option.

## Deliberate disconfirmation

The audit searched the fixed direct-user decisions, R1 classifications, current `PROJECT.md`,
`TRANSLATION_ARCHITECTURE.md`, `docs/translation/LOCALES.md`, `ROADMAP.md`, PR #50 authority,
and the dynamic-authorization decision for a later user/contract choice that already selected
`307` or `404`.

None was found.

The strongest contrary evidence is that current source-of-truth documentation and current runtime
already use the `307 → /en/...` policy. That proves current behavior, not direct-user authority:
its provenance remains the assistant/PR-level Stage 1 choice that followed the restored decision gate.

Therefore UD-001 remains a genuine candidate.

## Removed false candidates

| Screened candidate | Key IDs | Why it does not require the user now |
| --- | --- | --- |
| Strict zero-stale CI vs permissive stale policy | `EX19-03`, `EX40-02`, `EX77-29/30` | The accepted audit already establishes the zero-stale gate as the bad correction and preserves the permissive stale/fallback contract. A stricter future CI policy would be a new later decision, not a prerequisite to restoring the target. |
| Production-first Hyperdrive gate vs product-first development | `EX20-02`, `EX37-03/05/07`, `EX44-13`, `EX50-01/02/24/31` | PR #50 is a direct-user decision that prospectively resolves the current target: local/CI product work first, external integration in Stage 6. |
| Exact future staging/external topology | `EX45-08/11`, `EX50-17/31` | Existing accepted contracts deliberately defer exact topology until Stage 6/current platform requirements. |
| Permanent exact he/ka/ru migration-test state | `EX29-13` | No current migration conflicts with the assertion. This is a future test-maintenance question, not a product/architecture choice required now. |
| Permanent retention of every superseded forum revision | `EX51-22/23` | There is no current per-revision delete consumer and Stage 5B persistence is absent. Immutable revision identity can be preserved without choosing a permanent retention policy now. |
| HTTP mapping for unexpected forum-writer errors | `EX55-18` | Technical failure semantics, not product policy. RFC 9110 distinguishes unexpected server conditions (`500`) from temporary service unavailability (`503`); current authz already uses typed availability rather than asking the user to classify errors. |
| Dynamic authorization product scope | `EX59-01/04/05/07/25/26` | Already a direct user-approved product extension. |
| Generic/data-driven locale architecture | `AN7-01/02`, `DLX12-03`, `EX16-02` | Already a direct user decision. |
| Historical audit/external-evidence gaps | `EX37-02`, `EX45-15..19b/21a`, `EX46-01`, `EX49-20`, `EX77-65` | These concern proof/provenance of past external/audit events, not competing target contracts. |
| PR #77 retrospective labels/attribution | `EX77-29/30/65` | Historical wording uncertainty can be corrected to supported facts without a product/architecture choice. |

Primary external evidence used only for the `EX55-18` false-candidate screen:
RFC 9110 HTTP Semantics §§15.6.1 and 15.6.4
(`https://www.rfc-editor.org/rfc/rfc9110.html`).

## All insufficient-evidence records reconciled

The accepted active assignment set contains exactly **16** `insufficient-evidence` records.

1. **`EX29-13`** — technical/test-policy evidence limit; no user decision now.
2. **`EX37-02`** — historical audit-provenance limit; informational only.
3. **`EX45-15`, `EX45-16`, `EX45-17`, `EX45-18`, `EX45-19a`,
   `EX45-19b`, `EX45-21a`, `EX46-01`, `EX49-20`** — historical external-evidence
   limitations; informational only.
4. **`EX51-22`** — future revision-retention/integrity concern; does not require a current target
   choice because no present consumer forces the policy.
5. **`EX55-18`** — technical failure-semantics concern; primary HTTP semantics and engineering
   boundaries make it inappropriate to ask the user to decide whether unexpected errors are
   temporary service unavailability.
6. **`EX77-29`, `EX77-30`, `EX77-65`** — retrospective wording/attribution limits;
   informational only.

Count: **16 / 16**, no duplicate or omitted evidence-limited record.

## Completeness result

```text
accepted active assignments screened: 2029
valid user-decision candidates:          1
candidate dependencies:                  0
insufficient-evidence rows reconciled:  16 / 16
removed false-candidate groups:         10
options selected by ChatGPT:             0
target contracts drafted:                0
remediation proposed:                    0
```

Finite candidate set: **UD-001 only**.

Codex should independently verify this response before placing any question in
`OPEN_QUESTIONS.md` or asking the user to choose.

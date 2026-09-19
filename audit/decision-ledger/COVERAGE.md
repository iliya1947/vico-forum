# Audit Extraction Coverage

> **WORKING AUDIT MATERIAL — NOT A SOURCE OF TRUTH**
>
> A checked row proves only that decision extraction was performed and reviewed for completeness. It
> does not approve any extracted decision or classification.

## Status definitions

```text
pending                 not yet examined for atomic decisions
extracting              extraction in progress
extracted               candidate decisions recorded; completeness not independently checked
extraction-complete     diff/body/internal commits reviewed and mixed decisions reconciled
outside-scope           explicitly justified; cannot be used merely because a PR seems unimportant
```

For `extraction-complete`, the row must identify its ledger decision IDs or explicitly state that the
change contains no independently meaningful decision. The same category sweep is mandatory for
**every** PR; completeness must not depend on recognizing in advance that a PR is mixed.

Required category sweep:

```text
F  feature/domain
A  architecture/contract
C  corrective/review
D  documentation/state
O  operational/infrastructure
G  gate/process
T  tests/config/workflows
```

Each row must link or include category-sweep evidence recording a result for all seven categories,
including explicit `none` results. PR summaries and pre-existing coverage notes cannot substitute for
the sweep.

## Chronological commit/PR coverage

PR numbers are not chronological in every case. This table follows merged commit order after the
PR #12 baseline and includes post-baseline PR #5 so that no commit is lost merely because its PR
number is lower than the baseline PR number.

| PR | Merge commit | Status | Decision IDs / no-decision evidence | Completeness notes |
| --- | --- | --- | --- | --- |
| #12 baseline | `8010bdc` | extracted | `DLX12-01..12`, `DLX12-13a..b`, `DLX12-14a..b`, `DLX12-15`, `DLX12-16a..d`, `DLX12-17..20`, `DLX-INH-SEC01-01` | PR #12 changes are decomposed; inherited control-point contracts still require the bounded #7–#11 ancestry pass before baseline extraction can be complete. |
| #5 | `b0632c0` | extraction-complete | `DLX5-01..13` | Merged after #12; diff/body/internal commit, category sweep, and implementation-boundary reconciliation reviewed. |
| #13 | `0526b29` | extraction-complete | `DLX13-01..04`; dependency on `DLX-INH-SEC01-01` | Diff/body/internal commits, category sweep, review gap, and inherited no-side-effect relationship reviewed. |
| #14 | `7520605` | extraction-complete | `DLX14-01..03` | Diff/body/internal commits, category sweep, and governing-document conflict reviewed. |
| #15 | `8ea9d32` | extraction-complete | `DLX15-01..02` | Diff/body/internal commit, category sweep, and action-resolution evidence limitation reviewed. |
| #16 | `daff15c` | pending | — | — |
| #17 | `5aa1859` | pending | — | — |
| #18 | `777ef20` | pending | — | — |
| #19 | `5a3c75a` | pending | — | — |
| #20 | `2d0d9e5` | pending | — | — |
| #21 | `c0e2add` | pending | — | — |
| #22 | `92b55cd` | pending | — | — |
| #24 | `87c49c5` | pending | — | Merged before #23. |
| #23 | `4f1a727` | pending | — | — |
| #25 | `d39119a` | pending | — | — |
| #26 | `fccde6b` | pending | — | — |
| #27 | `e734f8f` | pending | — | — |
| #28 | `2eb1186` | pending | — | — |
| #29 | `c31c050` | pending | — | — |
| #30 | `907e082` | pending | — | — |
| #31 | `458db7e` | pending | — | — |
| #32 | `7048478` | pending | — | — |
| #33 | `15e0545` | pending | — | — |
| #34 | `254f4a7` | pending | — | — |
| #35 | `a9556b2` | pending | — | — |
| #36 | `f3a665f` | pending | — | — |
| #37 | `0cdf939` | pending | — | — |
| #38 | `768799c` | pending | — | — |
| #39 | `af2349d` | pending | — | — |
| #40 | `29eccc5` | pending | — | — |
| #41 | `2623040` | pending | — | — |
| #42 | `a127adb` | pending | — | — |
| #43 | `e1fddf9` | pending | — | — |
| #44 | `bdc9c0f` | pending | — | — |
| #45 | `19ec4b5` | pending | — | — |
| #46 | `01ad59a` | pending | — | — |
| #47 | `ebd0160` | pending | — | — |
| #48 | `a52d84f` | pending | — | — |
| #49 | `75faaba` | pending | — | — |
| #50 | `e26d145` | pending | — | — |
| #51 | `d07f81a` | pending | — | — |
| #52 | `8aed969` | pending | — | — |
| #53 | `f9f03fb` | pending | — | — |
| #54 | `9a09a2d` | pending | — | — |
| #55 | `826167b` | pending | — | — |
| #56 | `950133f` | pending | — | — |
| #57 | `a5a77fa` | pending | — | — |
| #58 | `a35c4ce` | pending | — | — |
| #59 | `a22ae0e` | pending | — | — |
| #60 | `b51fb66` | pending | — | — |
| #61 | `a76a102` | pending | — | — |
| #63 | `b238df0` | pending | — | Merged before #62. |
| #62 | `6b10d23` | pending | — | — |
| #64 | `5a85a03` | pending | — | — |
| #65 | `0a9ed91` | pending | — | — |
| #66 | `9c37549` | pending | — | — |
| #67 | `6a476d4` | pending | — | — |
| #68 | `a0215cc` | pending | — | — |
| #69 | `c12550c` | pending | — | — |
| #70 | `d84d888` | pending | — | — |
| #71 | `e3559c3` | pending | — | — |
| #72 | `ba41a0c` | pending | — | — |
| #73 | `1afb0c1` | pending | — | — |
| #74 | `b5d1f68` | pending | — | — |
| #75 | `29f52b9` | pending | — | — |
| #76 | `1c5255a` | pending | — | — |
| #77 | `3282aa5` | pending | — | — |

## Reconciliation gates

- [ ] `git rev-list` after the PR #12 baseline is reconciled to this table.
- [ ] Every PR head/internal commit sequence has been checked for decisions absent from its squash
      merge diff or summary.
- [ ] Every row has a recorded `F/A/C/D/O/G/T` category sweep, including explicit `none` results.
- [ ] Every row is `extraction-complete` or has a reviewed `outside-scope` justification.
- [ ] Every extracted decision ID appears in `LEDGER.md` exactly once as an atomic record.
- [ ] Every ledger record maps back to at least one coverage row and all applicable cross-stage chains.
- [ ] Current code/test/config consumers have been searched for dependencies not explicit in PR text.
- [ ] Known corrective and revert sequences have been reconciled without treating reverted intermediate
      work as current behavior.
- [ ] Every preliminary classification has a recorded disconfirmation pass documenting what could
      make it wrong and what contrary evidence was found.

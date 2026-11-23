# User compact redesign — preservation check

## Result

Новая `USER_INSTRUCTIONS.draft.md`:
- blob: `ef1c0efd10d2e95a5481476d91b336884d7d9c61`
- 35 numbered rules
- 4999 characters
- scope redesign: прежние compact rules 5, 7, 9, 10, 13, 14; остальные смыслы не перерабатывались, только сдвинулись номера из-за split.

Цель этого этапа — убрать подтверждённую structural overload, не выполняя ещё повторный stress-test.

## 52 retained guards → new rules

Ранее подтверждённо DELETE-SAFE: old 17, 29, 44. Сохраняемый набор = 52 guards.

1. old 1 → new 1 — обязательность.
2. old 2 → new 2 — по существу.
3. old 3 → new 3 — no fabrication.
4. old 4 → new 4 — current primary technical source/version.
5. old 5 → new 4 — «Информация не проверена».
6. old 6 → new 4 — no false claims about reading/checking/action; full read to end.
7. old 7 → new 3 — facts/conditions vs assumptions/hypotheses/conclusions.
8. old 8 → new 2 — no invented constraints/permissions/authority.
9. old 9 → new 5 — evidence gate / no hidden premises.
10. old 10 → new 6 — confidence only with new support; uncertainty propagation.
11. old 11 → new 7 — dependent evidence is not independent confirmation.
12. old 12 → new 8 — contradiction check.
13. old 13 → new 9 — no causality from correlation/sequence/coincidence.
14. old 14 → new 9 — no modality strengthening.
15. old 15 → new 3 — unconfirmed ≠ false; not found ≠ absent without sufficient search.
16. old 16 → new 10 — conclusion scope ≤ checked evidence scope.
17. old 18 → new 11 — readiness only by established checked criteria.
18. old 19 → new 10 — source applicability/authority to object/version/state/time/scope.
19. old 20 → new 12 — do not mix incompatible states/versions/times/objects.
20. old 21 → new 13 — invalidate only dependent conclusions/decisions/checks after material change.
21. old 22 → new 14 — previous ChatGPT error not a fact/condition/basis.
22. old 23 → new 14 — another agent's output is not automatically fact.
23. old 24 → new 15 — establish current goal before material conclusion/self-action.
24. old 25 → new 15 — do not substitute symptom/nearest step/local benefit for goal.
25. old 26 → new 16 — compare material interpretations with context.
26. old 27 → new 17 — only material alternatives/consequences.
27. old 28 → new 18 — self-action evidence/goal/scope/permission/consequence gate.
28. old 30 → new 19 — knowledge/work/check/technical ability ≠ decision authority; authority established separately.
29. old 31 → new 19 — do not replace established decision owner.
30. old 32 → new 20 — permission/prohibition/exception scope; no precedent from one-off exception.
31. old 33 → new 21 — newer same-level instruction overrides only conflicting part.
32. old 34 → new 21 — direct unambiguous instruction determines current action.
33. old 35 → new 22 — diagnostic hypothesis allowed only as marked in-scope test, not cause.
34. old 36 → new 22 — recheck only on new grounds.
35. old 37 → new 23 — do not ask what can be established independently.
36. old 38 → new 24 — immaterial uncertainty does not stop progress.
37. old 39 → new 24 — choose immaterial admissible option when choice owner is not fixed.
38. old 40 → new 25 — ask user only for material unresolved uncertainty or their material choice.
39. old 41 → new 26 — stop analysis and act when remaining uncertainty cannot materially change result.
40. old 42 → new 27 — preserve actual precision/uncertainty.
41. old 43 → new 28 — progress-set integrity / overlap / denominator.
42. old 45 → new 29 — comparable baseline/state for progress/regression.
43. old 46 → new 30 — classification applicability/completeness/exclusivity.
44. old 47 → new 30 — no properties inferred from label alone.
45. old 48 → new 31 — no generalization from isolated/limited cases.
46. old 49 → new 31 — general rule requires mechanism + class applicability.
47. old 50 → new 32 — pre-user-action diagnosis; no trial-and-error/offload.
48. old 51 → new 33 — execute unambiguous in-scope instruction without needless questions.
49. old 52 → new 2 — no needless instructions/actions/next steps.
50. old 53 → new 34 — accuracy/verifiability/logic/practical result.
51. old 54 → new 34 — numbered lists.
52. old 55 → new 35 — ellipsis continuation without scope/permission expansion.

Coverage: **52/52**. Missing retained guards: **0**.

## Current 15 rules → new rules

1. current 1 → new 1 — FULL.
2. current 2 → new 2 — FULL.
3. current 3 → new 3 — FULL.
4. current 4 → new 4 — FULL.
5. current 5 → new 4 — FULL.
6. current 6 → new 4 — FULL.
7. current 7 → new 3 — FULL.
8. current 8 → new 5 + 8 — FULL.
9. current 9 → new 15–18 + 23 + 32 — FULL.
10. current 10 → new 33 — FULL.
11. current 11 → new 2 — FULL.
12. current 12 → new 34 — FULL.
13. current 13 → new 14 — FULL.
14. current 14 → new 34 — FULL.
15. current 15 → new 35 — FULL.

Coverage: **15/15 FULL**.

## Structural change

Подтверждённые overloaded groups разбиты так:

- compact 5 → new 5, 6, 7, 8;
- compact 7 → new 10, 11, 12, 13;
- compact 9 → new 15, 16, 17;
- compact 10 → new 18, 19, 20;
- compact 13 → new 23, 24, 25, 26;
- compact 14 → new 27, 28, 29.

Остальные semantic groups не являются предметом этого redesign.

## Verdict for this bounded stage

1. Character limit: **PASS — 4999/5000**.
2. Retained semantic guards: **PASS — 52/52**.
3. Current User coverage: **PASS — 15/15 FULL**.
4. Structural overload targeted by this stage: split completed.
5. Goal-level readiness: **не присваивается на этом этапе** — требуется повтор того же stress matrix.
6. Three-layer consistency: **не перепроверялась на этом этапе**; это следует делать только после stress PASS.

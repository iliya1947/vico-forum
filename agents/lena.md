# agents/lena.md — личная рабочая память Лены

## Текущее назначение

**DOCS-CLOSEOUT correction F-DOCS-01.**

1. PR #398 current reviewed head: `b7b0d9e56e1b733fdc7a7ffd8593fc34150b5143`.
2. Мира coordinator HOLD: `stages/DOCS-CLOSEOUT/COORDINATOR-REVIEW.md`.
3. Исправить только `ROADMAP.md` Stage-6 DNS wording: не задавать SPF/DKIM/DMARC как универсально обязательную тройку; сохранить provider-required/applicable DNS boundary, один active provider и no automatic fallback/retry.
4. Не менять product/runtime implementation, остальные принятые docs semantics или Stage-6 activation state без фактической необходимости этой correction.
5. После correction: author self-check нового docs diff → обновить `stages/DOCS-CLOSEOUT/RESULT.md` с новым exact head → STOP → Мира.
6. Лёву не активировать.

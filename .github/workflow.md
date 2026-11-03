# Complaints — current workflow

- Служебный PR: #254
- План: `COMPLAINTS_IMPLEMENTATION_PLAN.md`
- Этап: **Package 7 — bounded correction P7-SMOKE-01**
- Current main/base: `020cbafe1a1c872773c7e3c41e79c7c7f81eabe8`
- Implementation PR: Draft #280, branch `chatgpt/complaints-package-7`
- Prior reviewed exact head: `cc9f42a8e0944da053fe5bef8cda1cb1113cd492`
- Prior CI #41593385331: SUCCESS attempt1
- Coordinator prior verdict: PASS
- Independent technical verdict Лёвы: CHANGES REQUIRED, one P3 `P7-SMOKE-01`
- Mira independent classification: **CONFIRMED current-scope**
- Accepted unchanged scope: B1/B2/B3 + P7-DOC-01 remain accepted and must not be reworked
- Executor: **Лира — ChatGPT-6**
- Correction: smoke cleanup may remove `.dev.vars` only when this run created it; preserve pre-existing config on EEXIST/early failure; add bounded ownership regression/guard
- No application/schema/permissions/product-contract changes
- After Lira handoff: stable exact head + applicable CI → fresh Mira coordinator whole-PR review → Lyova independent technical review of same head
- Марк: без назначения
- Merge/production/browser/real R2/external actions not performed

# Complaints — current workflow

- Служебный PR: #254
- План: `COMPLAINTS_IMPLEMENTATION_PLAN.md`
- Этап: **Package 6 — bounded corrections in progress**
- Current main/base: `284bee3f5f0899cce1dc751cf4e9ef169739a120`
- Implementation PR: Draft #279, branch `chatgpt/complaints-package-6`
- Previous reviewed head: `9034409524fd0e9df85102680f68ded759705132`
- Current correction head: `0d6bdbb465148875e02663c4c27c56e099a415e4`
- CI #41556613222 on preceding head `19ae09d5ae6d0b4e3dfe64f70d43b6017119166b`: SUCCESS; new exact-head CI pending
- Coordinator verdict on reviewed head: **FAIL**
- Correction executor: **Лира — ChatGPT-6**
- Correction scope only: `P6-RTL-01`, `P6-VERIFY-01`, `P6-VERIFY-02`
- Не расширять correction на Package 7+, unrelated refactor, external rollout или browser/owner-visual work
- Лёва independent review: **не запускать до нового coordinator PASS**
- Следующий шаг: проверить exact-head CI после дополнения registry direction в expanded Appeal context, затем handoff Мире для повторного whole-PR review.

# Complaints — current workflow

- Служебный PR: #254
- План: `COMPLAINTS_IMPLEMENTATION_PLAN.md`
- Этап: **Package 6 — bounded UI corrections in progress**
- Current main/base: `284bee3f5f0899cce1dc751cf4e9ef169739a120`
- Implementation PR: Draft #279, branch `chatgpt/complaints-package-6`
- Last reviewed exact head: `c38b036b2ecb080735e6eaf4fcca5416a7aebc62`
- Exact-head CI #41559889094: SUCCESS, attempt1
- Independent technical review: CHANGES REQUIRED
- Confirmed correction scope: `P6-UI-01`, `P6-UI-02`
- Correction executor: **Лира — ChatGPT-6**
- Scope boundary: presentation/localization/regression tests only unless correction reveals a real lower-layer defect; no schema/domain/permission redesign, Package 7+, browser/owner-visual or external rollout
- Следующий шаг: Лира исправляет оба finding в #279, выполняет applicable checks/CI и фиксирует новый stable exact head/results в #254. После handoff Мира начинает новый coordinator whole-PR cycle; только после PASS Лёва делает новую independent technical whole-PR проверку того же head.

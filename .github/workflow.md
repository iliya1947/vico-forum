# Complaints — current workflow

- Служебный PR: #254
- План: `COMPLAINTS_IMPLEMENTATION_PLAN.md`
- Этап: **Package 6 — implementation**
- Current main/base: `284bee3f5f0899cce1dc751cf4e9ef169739a120`
- Coordinator scope: завершён
- Technical plan: завершён Лёвой и принят Мирой
- Исполнитель: **Лира — ChatGPT-6**
- Implementation PR: Лира создаёт отдельный bounded PR
- Product policy fixed: one pending Appeal; current-outcome eligibility; shared 3-slot Decision limit; all Case participants receive deduplicated Appeal-result notifications
- Implementation scope: effective-outcome transitions, participant submission/result, Complaints group2 Appeals queue, appeal-review workflow, Appeal-result notifications и необходимые forward schema/read-model/wiring изменения
- Existing Packages 1–5 foundation переиспользуется; unrelated refactor не требуется
- Package 7+, unrelated Admin/Signals/Security и production rollout вне scope
- Технический план: [личный файл Лёвы](https://github.com/iliya1947/vico-forum/blob/84d456bcde0f14e28574c9e4c64cfb01accda810/.github/agents/codex-6.1-sol.md#технический-план-package-6--appeals)
- Следующий шаг: Лира реализует Package 6 в отдельном PR, выполняет применимые checks и передаёт stable exact head Мире для coordinator whole-PR review.

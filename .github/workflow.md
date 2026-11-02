# Complaints — current workflow

- Служебный PR: #254
- План: `COMPLAINTS_IMPLEMENTATION_PLAN.md`
- Этап: **Package 6 — author handoff / awaiting coordinator review**
- Current main/base: `284bee3f5f0899cce1dc751cf4e9ef169739a120`
- Coordinator scope: завершён
- Technical plan: завершён Лёвой и принят Мирой
- Исполнитель: **Лира — ChatGPT-6**
- Implementation PR: [Draft #279](https://github.com/iliya1947/vico-forum/pull/279), ветка `chatgpt/complaints-package-6`; author implementation завершена; exact-head CI SUCCESS
- Product policy fixed: one pending Appeal; current-outcome eligibility; shared 3-slot Decision limit; all Case participants receive deduplicated Appeal-result notifications
- Implementation scope: effective-outcome transitions, participant submission/result, Complaints group2 Appeals queue, appeal-review workflow, Appeal-result notifications и необходимые forward schema/read-model/wiring изменения
- Existing Packages 1–5 foundation переиспользуется; unrelated refactor не требуется
- Package 7+, unrelated Admin/Signals/Security и production rollout вне scope
- Технический план: [личный файл Лёвы](https://github.com/iliya1947/vico-forum/blob/84d456bcde0f14e28574c9e4c64cfb01accda810/.github/agents/codex-6.1-sol.md#технический-план-package-6--appeals)
- Следующий шаг: Мира выполняет coordinator whole-PR review stable exact head `9034409524fd0e9df85102680f68ded759705132` в PR #279. CI #41546869959 SUCCESS (checks/database). Авторская source/test проверка выполнена; полноценный Chromium→built Worker→PG browser acceptance не проводился вследствие запрета разработчика Лире использовать браузер. Owner visual acceptance не требовался. До coordinator PASS Лёва не запускает independent review.

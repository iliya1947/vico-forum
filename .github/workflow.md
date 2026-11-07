# Admin panel — current workflow

- Служебный PR: #251; общий план: `ADMIN_PANEL_IMPLEMENTATION_PLAN.md`
- Current main / planning baseline: `bcf02193f82aa0d448444c6943d6ebdcf09f7896`, migrations 0000–0058
- Ordinary Admin Panel AP-01–AP-11 fully closed
- Текущий этап: **owner/authorization redesign Stage 1 — technical plan готов, coordinator review**
- Technical planner: Лёва — назначение выполнено; current reviewer: Мира
- [План #6700603167](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6700603167); полный текст в `.github/agents/codex-6.1-sol.md`
- Fixed scope: удалить AuthorizationLockoutError/countManagers/managers_ever_existed и dedicated veto checks/tests
- Preserve: authz_mutation_lock singleton row/id=1/FOR UPDATE и current authorization/AP-10 mutex/History semantics
- План включает forward0059 + schema/manifest, route/conflict localization, affected test/browser updates и отдельный docs closeout
- Runtime flag/count consumers вне AuthorizationRepository.mutate не выявлены; AP-10 использует mutex независимо
- Implementer не назначен; implementation PR не создан
- Следующий шаг: Мира review плана → после approval назначение Лиры
- Лёва после planning остановился; код/БД/тесты/runtime не менялись
- Owner authority implementation, mutex redesign/removal, Settings, super-admin UI, Stage 6/production вне Stage1
- Марк не назначен

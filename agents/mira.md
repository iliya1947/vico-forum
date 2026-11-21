# agents/Миры.md — личная рабочая память Миры.

- Исполнитель conceptual stage: **Мира-3 (GPT-5.6 Sol)**.
- Service PR: **#369**.
- Первый conceptual stage по UI progress preview — **завершён**.
- Итог: `research/concept.md`, разделы 1–27.
- Реализация не начата; старые implementation PR не трогать.
- Target: production route source/modules/product logic + one resettable deterministic raw state + thin infrastructure adapters.
- Нет второго route table/loaders/actions/views; scenario — review bookmark/raw overlay/fault/setup, а не экран.
- Route parity: Framework route IDs обязаны сохраняться.
- Transport: Static Handler local dispatcher + fetch wrapper; narrow XHR upload adapter; native attachment bytes через presentation URL seam.
- State: base fixture + small raw overlays; concrete identity/session; Owner = trusted exact binding; locale через production registry; viewport вне domain state.
- Empty/authz/error/conflict/pending/success возникают из real causes и production logic.
- Complex SQL ranking/filter/fanout semantics не дублировать; Pages не DB/runtime/security acceptance.
- Determinism: fixed seeded facts, resettable mutable clone, minimal visible-time clock seam.
- Migration: target можно временно строить рядом только внутри implementation branch; published preview не смешивать old/new. Cutover единый, manual product layer удаляется при переключении.
- Сохраняются static Pages/Vite delivery, controller tooling и полезный representative content как raw fixtures.
- После принятия концепции следующий агент — **Лёва (Codex-6.1 Sol)**, который готовит полный technical `PLAN.md`; до owner acceptance Лёву не назначать.
- Подтверждённая route-ID ошибка уже журналирована; новых ошибок в final closeout нет.

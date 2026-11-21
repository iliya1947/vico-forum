# WORKFLOW.md — текущее оперативное состояние задачи.

## Current state

- Задача: переосмысление архитектуры UI progress preview.
- Service workspace создан от main `9cff976a9621d9fe5dfef28ea5367e390ff435b1`; перед финальным conceptual closeout подтверждено, что `main` остаётся на этом exact head.
- Исполнитель концептуального этапа: **Мира-3 (GPT-5.6 Sol)**.
- **Первый conceptual stage завершён.**
- Реализация: **не начиналась и не авторизована**.
- Технический `PLAN.md`: **не сформирован**.
- Изменения старых implementation PR: **не входят в текущую задачу**.
- Цельный результат: `research/concept.md`, разделы 1–27.
- Выбран target: production `app/routes.ts` + production route modules/loaders/actions/components поверх одного resettable deterministic raw-state graph и thin preview infrastructure adapters.
- Browser graph разрывается только на genuinely server-only infrastructure boundary.
- Routing имеет один source of truth; programmable HTTP идёт через generic local Static Handler dispatcher; current XHR upload — через narrow adapter; attachment native bytes — через presentation resource boundary.
- Test state: one canonical base + small raw overlays + capability fault profiles. Scenario не является экраном и не подсовывает готовые View props/actionData.
- Identity выбирает concrete session actor; ownership/roles/grants/Owner binding не переписываются. Locale идёт через production registry/routing; viewport — внешний frame dimension.
- Complex PostgreSQL query semantics не дублируются в browser. Pages остаётся representative visual/product-interaction environment, а не DB/runtime/security acceptance.
- Mutable preview state должен reset к deterministic baseline; visible reference time требует минимальной clock boundary.
- Migration concept: old manual Pages preview остаётся baseline до готовности target runtime; target строится рядом только в implementation branch/workspace; published runtime не должен быть смешанным old/new. Cutover переключает единственную entry и удаляет manual product route/data/presentation layer в том же собранном результате.
- В целевой архитектуре сохраняются Pages/Vite delivery, controller tooling, viewport framing и полезный representative content как raw fixtures/review bookmarks; manual route table, `Preview*Route`, presentation fixtures, hard-coded authority/locale copies и fake route errors удаляются/заменяются.
- Критерии готовности и оставшиеся implementation-only вопросы зафиксированы в разделах 24–26.
- Подтверждённая ошибка с route IDs остаётся записана в `AGENT_ERRORS.md` / `AGENT_LOGIC_ERRORS.md`; новых подтверждённых ошибок в финальном подэтапе не обнаружено.

## Next transition

**STOP — решение разработчика по концепции.**

Если концепция принимается, следующий шаг по действующему `AGENTS.md`: разработчик подключает **Лёву (Codex-6.1 Sol)** к этому же служебному PR `#369`; Лёва читает актуальный контекст и готовит полный технический `PLAN.md` до начала реализации.

До этого не формировать технический plan, не создавать implementation PR и не начинать код.

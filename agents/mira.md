# agents/Миры.md — личная рабочая память Миры.

- Исполнитель текущего этапа: **Мира-3 (GPT-5.6 Sol)**.
- Текущий этап: концептуальное проектирование архитектуры UI progress preview до технического плана.
- Реализация и изменения #322 не авторизованы.
- Перед исследовательским подэтапом проверять актуальный `main` и действующие границы задачи.
- Подэтапы 1–5 закрыли dependency/browser graph/routes/transport/attachments.
- Подэтап 6: deterministic test state + controls — завершён.
- Target state: one canonical raw state graph, small overlays, fault profiles, resettable mutable clone.
- Не переносить current 72-scenario presentation model: scenario не задаёт готовый screen/result.
- Identity control выбирает concrete session actor; role/grants/Owner authority остаются facts production authorization model. Не использовать `allowedIdentities` как замену authz.
- Locale идёт через real locale route/registry; direction не хранится в scenario; viewport — только frame geometry.
- Empty/authz/error/conflict/rate-limit/pending/success states должны получаться из real causes и production loaders/actions.
- Server-persisted state и browser-local preferences разделены.
- Critical limitation: `ForumReader` имеет 44 product-query methods, а их SQL semantics живут в `DrizzleForumRepository`; fake DB не должна становиться вторым repository engine. Pages остаётся representative, DB/query correctness — Worker/PostgreSQL acceptance.
- Browser SQL/PGlite не выбран.
- Deterministic visible time требует минимальной clock seam: category/attention current routes используют wall-clock напрямую.
- Следующий conceptual block: migration from current preview + concept done criteria + handoff questions for Leva technical plan.
- Итог первого этапа должен быть цельным концептуальным документом `research/concept.md`, после чего STOP для решения разработчика.

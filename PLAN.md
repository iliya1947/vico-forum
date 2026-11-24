# План независимого аудита: этапы, зависимости и критерии готовности

A0 — старт: регламент, baseline, рабочее пространство и декомпозиция.
A1 — инвентаризация: дерево исходников, routes/API, schema/migrations, tests, docs, workflows, актуальные параллельные задачи. Сформировать матрицу покрытия и исключений.
A2 — архитектура и runtime: module/dependency boundaries, SSR, Worker ingress, configuration, error/caching boundaries.
A3 — identity, auth/authz и безопасность: session, RBAC, Owner, AccountState, registration, settings, privacy, write admission, abuse, isolation, data exposure.
A4 — forum core: structure, participation, search, solved/Help, profiles, unread/notifications, personal filters, content visibility; cross-domain state invariants.
A5 — Admin, Attention/Complaints, Super-admin: authority, lifecycle, actions, history, telemetry, monitoring и data projections.
A6 — Editor, Markdown, attachments, translations, jobs: revision identity, sanitization, storage/access, fallbacks, idempotency.
A7 — данные и persistence: schema, constraints, transactions, concurrent writes, migrations, query shape/indexes, least-privilege contracts.
A8 — UI/UX: route/navigation, functional states, permissions presentation, responsive, LTR/RTL, localization, accessibility; preview vs connected browser evidence.
A9 — tests, CI, tooling, dependencies: coverage, assertions, negative cases, build/deploy guards, preview fidelity; не дублировать существующие cleanup findings.
A10 — эксплуатация и release readiness: resource usage, failure/recovery paths, configuration, observability, Stage 6/7 gates. Без production mutations; внешние проверки только в разрешённых границах.
A11 — документация, согласованность и повторная сверка: полное чтение current source-of-truth в заявленном объёме, устранение дублей findings, delta main, cross-domain gaps, итоговый отчёт.

A1 уточняет подблоки и матрицу; A2–A10 проверяются по ней с чтением относящихся контрактов до конца. A11 сводит evidence и проверяет полноту. Блок завершён, когда записаны проверенные поверхности, evidence, findings и границы неизвестного; после каждого блока остановка до команды разработчика.

Метод: requirement → implementation (route/service/repository/schema) → tests → доступная runtime evidence; reverse pass от поверхности к контракту. Findings: точное место и SHA, нарушенный контракт, причинная цепочка и влияние, воспроизводимость/evidence, текущий Stage, серьёзность, статус. Гипотезы и незавершённые проверки отдельно. Уже известные задачи сверять, не считать повторно без новых оснований. Green CI не заменяет review; не утверждать выполнение тестов, если проверена только их реализация или история.

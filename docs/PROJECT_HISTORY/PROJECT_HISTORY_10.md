# История проекта — 2026-11-04: Admin Panel AP-08 close/reopen завершён

Датированный implementation/review/merge snapshot. Не является текущим domain contract
и не свидетельствует о production rollout.

- Implementation PR #283 добавил AP-08: persisted `is_closed` / `closure_version`, capability `forum.topic.close`, shared close/reopen Quick actions, significant History, authoritative closed-topic reply admission и сохранение уже открытого reply editor при closure.
- Реализация сохраняет matching committed publication-receipt replay после closure; новые replies сериализуются с close/reopen через тот же topic-row lock и отклоняются в закрытой теме без role/author bypass.
- Coordinator whole-PR review Миры завершён **PASS** на exact head `7b6adbf8c92e1706064cb5845248813668a287d0`; подтверждённых current-scope implementation-дефектов 0.
- Independent technical review Лёвы того же exact head завершён **PASS**; подтверждённых незакрытых current-scope implementation-дефектов 0.
- AP08-MIRA-01: новый in-flight attachment retention test на предыдущем head дважды падал и один раз проходил. Исправление `7b6adbf...` было test-only: тест ждёт инициализированную upload operation и проверяет request/editor operation identity плюс отсутствие abort до и после close/reopen. Runtime implementation не менялся; exact cause старого abort не был установлен, product defect не подтверждён.
- Exact-head CI #41904456264 attempts 1 и 2: **SUCCESS** — `checks` и `database`; application 140/140 files, 1863/1863 tests; PostgreSQL 39/39 suites, 477/477 tests.
- Отдельный authenticated Chromium→Worker→Better Auth→PostgreSQL AP-08 flow не выполнялся. Эта real-browser/runtime цепочка не заявляется проверенной; owner visual acceptance не запрашивался. Для текущего pre-release package этот отдельный run не являлся mandatory merge gate.
- PR #283 merged в `main` 2026-11-04, merge commit `65707c69a7a15b2b594eca88f0a6ad0683f1e23e`.
- Production deployment, external R2/OAuth/provider checks и Stage 6 rollout не выполнялись и из merge AP-08 не следуют.

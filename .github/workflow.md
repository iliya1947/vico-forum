# Admin panel — current workflow

- Служебный PR: #251
- План: `ADMIN_PANEL_IMPLEMENTATION_PLAN.md`
- Текущий этап: AP-09 — coordinator + independent technical PASS; merge владельцем
- Coordinator: Мира; technical reviewer: Лёва; исполнитель: Лира
- Implementation PR: #287 (Ready/open/mergeable, не merged)
- Reviewed stable exact head: `b85c3809befe3a1dcc83fe654dde4cd093f625ba`
- Baseline/main: `2651d2bf7de7212068c54674dca7d90716ea92c3`
- Exact-head CI #41941892340: SUCCESS
- Coordinator whole-PR review: PASS (#6646898897); AP09-MIRA-01..04 закрыты
- Independent whole-PR technical review: [PASS](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6647373214), confirmed open current-scope defects: 0
- AP09-LEVA-01 ОТОЗВАН: прежний repro имел неверный тип timestamptz; actual accepted timestamp without time zone не воспроизводит сдвиг
- Re-evaluation actual migrations 0000–0057 + exact directory/Drizzle profile readers: 9/9 сравнений в 3 session TimeZones PASS; implementation не менялся
- Прежние локальные 37 UI/route + 8 PostgreSQL tests PASS; полный suite повторно не запускался
- Следующий шаг: владелец выполняет merge #287; correction Лире по отозванному finding не нужна
- Lasting docs — отдельный PR после принятой реализации
- Actual authenticated browser/deployed acceptance не выполнялась; обязательный отдельный gate не назначен
- AP-10/blocking/Settings/Stage 6/production вне scope; Марк не назначен

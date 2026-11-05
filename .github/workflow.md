# Admin panel — current workflow

- Служебный PR: #251
- План: `ADMIN_PANEL_IMPLEMENTATION_PLAN.md`
- Текущий этап: AP-09 — independent technical CHANGES REQUIRED; bounded correction через Миру
- Coordinator: Мира; technical reviewer: Лёва; исполнитель: Лира
- Implementation PR: #287 (Draft/open, не merge-ready)
- Reviewed stable exact head: `b85c3809befe3a1dcc83fe654dde4cd093f625ba`
- Baseline/main: `2651d2bf7de7212068c54674dca7d90716ea92c3`
- Exact-head CI #41941892340: SUCCESS
- Coordinator whole-PR review: PASS (#6646898897); AP09-MIRA-01..04 закрыты
- Independent whole-PR technical review: [CHANGES REQUIRED](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6646972798)
- Один confirmed current-scope P2: AP09-LEVA-01 — directory joinedAt форматируется в session TimeZone, но помечается Z; возможен неверный день регистрации относительно detail
- Локально: 37 UI/route + 8 PostgreSQL tests PASS; отдельный PostgreSQL 17 repro подтверждает finding
- Следующий шаг: Мира проверяет finding/repro и передаёт Лире один bounded пакет UTC serialization + native regression; затем новый head/checks и coordinator-first review cycle
- Implementation во время review не менялся; temporary DB/symlink удалены
- Lasting docs — отдельный PR после принятой реализации
- AP-10/blocking/Settings/Stage 6/production вне scope; Марк не назначен

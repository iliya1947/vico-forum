# Complaints — current workflow

- Служебный PR: #254
- План: `COMPLAINTS_IMPLEMENTATION_PLAN.md`
- Этап: Package 5 — author correction по четырём technical-review findings завершена, ожидается новый coordinator whole-PR review
- Координатор: Мира — ChatGPT-5.6 Sol
- Technical reviewer после coordinator PASS: Лёва — Codex-6.1 Sol
- Исполнитель correction: Лира — ChatGPT-6 (handoff завершён)
- Current main: `1ad8a6402111928c0f08e6f15aba624ba18a4426`
- Implementation PR: #277 (`chatgpt/complaints-package-5`), Draft; **stable exact head** `96bb5e82dc7ff7df9e57ce08c182f5c8c49d38fe`
- Independent technical review прежнего head `1af1c6272bf7b46009145488b52a42f89bfd0b2f`: CHANGES REQUIRED (2 P2, 2 P3), 4/4 coordinator-confirmed current-scope
- Исправлены: History timeline positive pages и Next после 50 событий; desktop system notification grid; EN/RU/HE readonly Appeal outcome; bounded strict URL-encoded notifications POST
- Regression coverage: route/normalized pages, memory-router Next navigation >50 events, SSR/system CSS layout, localized Appeal labels, bounded/duplicate/unknown POST
- [Exact-head CI #41513618388](https://github.com/iliya1947/vico-forum/actions/runs/41513618388): **SUCCESS**, 1741/1741 application tests (126 files), 455/455 PostgreSQL tests (36 files), lint/typecheck/builds/migration/schema/Worker smoke PASS
- No browser use by Lira; independent review нового head, owner visual acceptance, production и merge не заявляются
- Следующий шаг: Мира проводит новый coordinator whole-PR review #277 на `96bb5e82dc7ff7df9e57ce08c182f5c8c49d38fe`; после coordinator PASS — independent technical review Лёвы того же exact head. Package 6+ вне scope.

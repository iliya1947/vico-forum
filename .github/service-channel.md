# Complaints — communication

Служебный PR: #254.

## Актуальное состояние

- Complaints Packages1–7 merged в main; current baseline `c8a9edf2a3481e08666c025474bf714553a13ffb`.
- Полные независимые аудиты Лиры и Миры завершены и опубликованы по команде владельца; взаимно подтверждены MIRA-COMPLAINTS-01/02.
- По [техплану Лёвы #6615160621](https://github.com/iliya1947/vico-forum/pull/254#issuecomment-6615160621) Лира завершила один bounded correction package в **#281**, stable exact head `04547d7fd3e09eb1c7d806ecdf8c6b4100cb2089`.
- **Coordinator Мира PASS**: [#6617314577](https://github.com/iliya1947/vico-forum/pull/254#issuecomment-6617314577); **independent technical Лёва PASS**: [verdict](https://github.com/iliya1947/vico-forum/pull/254#issuecomment-6617575518). Оба review относятся к одному head, подтверждённых current-scope defects не осталось.
- PR остаётся draft/open; correction ещё не merged и не deployed.

## Подтверждённый correction result

1. **MIRA-COMPLAINTS-01:** explicit current-project timezone UTC в resolved History, initial/Appeal Result и общем NotificationsView formatter. Locale format styles, serialized timestamps и dateTime сохранены; shared inbox formatter применяется ко всем kinds.
2. **MIRA-COMPLAINTS-02:** удалён повторный JS slice(0,500) после SQL-bounded History excerpt. PostgreSQL left(...,500) сохранён; non-BMP символы полностью доходят до inert React text.

Production delta ограничен тремя presentation sites; всего6 файлов с targeted tests. Schema/domain/permissions, SQL bound/DTO, replay/quota/Appeal/fanout/privacy, migrations/dependencies/CI и unrelated UI не менялись. Existing PROJECT_STATE и профильные contracts остаются точными.

## Подтверждённые проверки и границы

- Exact-head [CI #41731794431](https://github.com/iliya1947/vico-forum/actions/runs/41731794431): checks/database SUCCESS, включая Worker HTTP smoke.
- Независимый локальный review:139/139 targeted application tests,74/74 native PostgreSQL17 complaints-foundation tests, production build PASS.
- Независимый local RED на test-only ancestor690d8f0:12 ожидаемых failures (9 hydration/3 Unicode),2 passes; GREEN исправляет обе причины.
- SSR→hydrateRoot при разных host TZ проверен для EN/RU/HE и всех affected surfaces; native SQL/render fixtures проверяют500 emoji и499 BMP+emoji+tail.
- Полный CI локально повторно не запускался; реальный browser/owner visual acceptance, local Worker smoke, real R2 и production rollout этим independent review не выполнялись. jsdom hydration не является browser acceptance.
- Task-owned PostgreSQL container удалён, temporary symlinks убраны; review checkout clean, unrelated dirty checkout не менялся.

## Назначения и следующий шаг

- **Мира — ChatGPT-5.6 Sol:** coordinator closeout #281 на том же head, сверка service state и подготовка owner merge route.
- **Лира — ChatGPT-6:** implementation завершена; новых corrections не назначено.
- **Лёва — Codex-6.1 Sol:** independent technical review завершён PASS; реализацию при review не менял.
- **Марк — Codex-6 Sol:** без назначения.
- Merge выполняет разработчик; внешнего/production rollout в этой задаче нет.

Оперативное состояние: [workflow.md](./workflow.md).
Утверждённый продуктовый план: [COMPLAINTS_IMPLEMENTATION_PLAN.md](../COMPLAINTS_IMPLEMENTATION_PLAN.md).

# Complaints — communication

Служебный PR: #254.

## Актуальное состояние

- Packages 1–3 завершены и merged в `main`.
- Package 4 находится в Draft [PR #276](https://github.com/iliya1947/vico-forum/pull/276), новый stable exact head `7d64933d47c257267d1fa4c6aec63685e9d27344`, baseline main `6b653e3ec202e649c3ed48ba442d9a5bf5c64d1f`.
- По independent technical review Лёвы на предыдущем head `12d94f308e25f579310b1cf18663697230c10354` найден один current-scope P2, затем подтверждённый Мирой: React Router 8.3.1 Framework single-fetch отправляет targeted `.data?_routes=...`; `reviewPages(request.url)` отвергает внутренний `_routes`, из-за чего Decision 409 reread завершается 400, скрывая Case/draft.
- Лира исправила только эту границу: `app/routes/complaint-review.tsx` читает normalized route argument `url.href` вместо raw `request.url`. React Router исключает framework-owned `.data`, `index`, `_routes` из этого application URL. `reviewPages` и его строгая проверка пользовательских pagination/unknown/duplicate параметров не изменялись.
- `app/complaints/review-http.test.ts`: дополнительная HTTP/loader регрессия с raw Framework-style `.data?_routes=...` и отдельным normalized application URL проверяет успешный protected Case read, private/no-store и сохранение 400 для реальных unknown/duplicate/out-of-range application query. Предыдущие четыре реальные Memory Router/UI регрессии Decision conflict recovery остаются.
- От предыдущего review head изменены **только два файла**: Case route и HTTP test. Schema, domain, permission, public API, Package 5+, production и unrelated refactor не затронуты.
- **Exact-head CI [#41478096937](https://github.com/iliya1947/vico-forum/actions/runs/41478096937) — SUCCESS:** `checks` + `database` SUCCESS, 1727/1727 application tests (120 files), 452/452 PostgreSQL tests (36 files), typecheck/lint/build/preview/migration/schema checks PASS.
- Авторский runtime browser/Worker прогон **не выполнялся**; CI и HTTP/loader test не выдаются за independent built-Worker browser acceptance. Новый coordinator и technical whole-PR review ещё не выполнены.
- Следующий шаг: coordinator whole-PR review Миры на head `7d64933d47c257267d1fa4c6aec63685e9d27344`; после PASS — independent technical review Лёвы того же stable head.

## Назначения

- Мира — ChatGPT-5.6 Sol: следующий coordinator whole-PR reviewer.
- Лира — ChatGPT-6: bounded runtime correction завершена; до новых подтверждённых findings изменений не вносит.
- Лёва — Codex-6.1 Sol: technical reviewer после coordinator PASS.
- Марк — Codex-6 Sol: без текущего назначения.

Оперативное состояние: [workflow.md](./workflow.md).
Утверждённый план: [COMPLAINTS_IMPLEMENTATION_PLAN.md](../COMPLAINTS_IMPLEMENTATION_PLAN.md).

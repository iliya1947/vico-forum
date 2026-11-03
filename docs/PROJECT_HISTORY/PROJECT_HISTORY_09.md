# История проекта — 2026-11-03: Complaints Package 7, author integration checkpoint

Датированный implementation/CI snapshot. Не является текущим domain contract,
подтверждением coordinator/independent review или свидетельством production rollout.

- Основа: Packages 1–6 уже merged в `main` `020cbafe1a1c872773c7e3c41e79c7c7f81eabe8`; утверждённый integration/closeout scope — служебный PR #254.
- Реализация: [Draft PR #280](https://github.com/iliya1947/vico-forum/pull/280), авторская integration-верификация без изменения приложения, schema, migrations, grants или публичных API. P7-DOC-01 обновляет устаревший абзац про Complaints в `docs/auth/AUTHORIZATION.md`.
- B1 — `app/complaints/connected-lifecycle.dbtest.tsx`: реальные route actions/loaders + PostgreSQL 17, submission→Case→Decision→Appeal→History/inbox, отдельные post/title targets, два reporters, operation replay, три Appeal slots, immutable evidence после edit и successor Case.
- B2 — реальные grants/custom role/overrides, независимые Case/Appeal capabilities, отсутствие структурированной reporter/appellant identity без дополнительного права, отзыв/возврат projection, guarded current/retained resources. Успешные attachment bytes проверены с in-memory bucket; реальный R2 не вызывался.
- B3 — независимые totals и ограниченные 25/50-item pages для Appeals, resolved History, timeline и mixed inbox; canonical topic Quick action сохраняет свою permission boundary и отдельную Admin History, не создаёт Complaint sanctions.
- Local HTTP: `scripts/smoke-complaints-local.ts` запускает built Worker на loopback, настоящую регистрацию/session Better Auth и запросы к disposable PostgreSQL `*_test`; проверены submission/Decision/Appeal/History/inbox, fresh permission deny/regrant, 403/404/503 protected resources, EN/RU/HE SSR и `sourceLocale=und → direction=auto`. Google OAuth, live R2, browser и внешняя инфраструктура не использовались.
- [Exact implementation-head CI #41591646928](https://github.com/iliya1947/vico-forum/actions/runs/41591646928): **SUCCESS**, attempt 1, `checks` и `database`, head `3cd46b6583a40db5e48f317d2c798584f9e8eded`. После этого head в PR изменён только документационным closeout; финальную проверку нового head фиксировать отдельно.
- Промежуточные неуспешные smoke-запуски были связаны с fixtures/CI: повторная миграция занятой test schema, несовпадающий DB search path, реальный signup rate limit 429, одноролевая authz-модель и ожидаемый 403 после отзыва permission. Исправлено в тестовом маршруте без ослабления runtime safety/anti-abuse.
- На момент этого snapshot **coordinator whole-PR review Миры и independent technical review Лёвы ещё не проводились**. Merge, real browser/visual acceptance, external OAuth/R2 и production rollout не заявляются.

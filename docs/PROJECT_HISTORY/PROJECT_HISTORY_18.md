# История проекта — 2026-11-08: Settings SET-02

Исторический снимок реализованного SET-02. **Не является source of truth
для текущего поведения.** Постоянные контракты — в
[`SETTINGS.md`](../SETTINGS.md), [`ADMIN_PANEL.md`](../ADMIN_PANEL.md)
и [`AUTHORIZATION.md`](../auth/AUTHORIZATION.md); фактический статус — в
[`PROJECT_STATE.md`](../../PROJECT_STATE.md).

## Утверждённый объём и поставка

- **SET-01** ранее закрепил Owner-only запись для всех шести
  authorization-management intents, сохранив разрешённое read-only чтение
  для non-Owner с `access.authorization.manage`. SET-02 продолжил эту
  политику, не вводя deputy delegation.
- **SET-02** добавил защищённый `/:locale/settings` entry,
  Owner-only `/:locale/settings/forum`, Settings shell и повторное
  использование существующих Roles & permissions forms с canonical
  `/:locale/admin/authorization` writer (без второго writer).
- Реализованы независимые флаги **регистрации новых** Google/email-password
  пользователей. Миграция `0060` добавила singleton
  `forum_registration_settings`, два открытых по умолчанию флага,
  CAS version и `settings.registrationChanged` в существующую атомарную
  Admin History. Проверка нового пользователя действует на реальном
  Better Auth create-user lifecycle; вход существующего пользователя
  и явное связывание Google не отключаются.
- Owner-only управление, same-origin/allowlist, `409` stale/no-op,
  private/no-store, защита от fail-open при PG outage, safe OAuth
  callback, сохранение verified-email no-implicit-linking, EN/RU/HE,
  RTL и responsive были частью bounded acceptance.
- SET-03–SET-06 не реализованы и не назначены в этом snapshot.
  Production, реальная Google-конфигурация и Owner binding,
  Stage 6 rollout и owner visual acceptance не выполнялись.

## Проверенная реализация и корректировки

- Implementation [PR #302](https://github.com/iliya1947/vico-forum/pull/302),
  финальный exact head `07d805d98ee77f9584f9609772ce2d33b9a8e63f`,
  merge в `main` 2026-11-08:
  `a86cea918a3f2665399e861d8e01ece8a1d80104`.
- Два замечания координатора `SET02-MIRA-01/02` были закрыты в
  implementation-cycle. Независимая проверка Лёвы затем выявила
  `SET02-LEV-01`: Better Auth 1.7.7 мог скрывать первичную ошибку чтения
  registration-policy как cause-less `403 validation_failed`.
  Исправление ограничилось request-local сохранением исходной ошибки
  в `app/auth/auth.server.ts` и соответствующими PostgreSQL регрессиями
  в `tests/database/auth-runtime.test.ts`. Классифицированная
  недоступность теперь даёт no-store `503`; неверный singleton/схема
  остаются unexpected, намеренное закрытие — method-specific denial.
- Мира провела повторную coordinator whole-PR проверку финального
  exact head: **PASS, 0 подтверждённых current-scope дефектов**
  ([запись](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6715734813)).
- Лёва повторно провёл независимый technical whole-PR review того же
  exact head: **PASS, 0 подтверждённых current-scope дефектов**
  ([запись](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6715843589)).
  Все `SET02-MIRA-01/02` и `SET02-LEV-01` закрыты.
- Exact-head [CI #42434044474](https://github.com/iliya1947/vico-forum/actions/runs/42434044474)
  — **SUCCESS**: checks/database, 159/159 application suites,
  2017/2017 app tests, 49/49 PostgreSQL 17 suites,
  586/586 native DB tests, lint/typecheck/build, migration/schema
  parity и local Worker HTTP smoke.
- Exact-head [Chromium #42434044476](https://github.com/iliya1947/vico-forum/actions/runs/42434044476)
  — **SUCCESS**: settings_browser, history_browser и browser;
  local built Worker + Better Auth + PostgreSQL, включая private/
  authorization, регистрационные флаги и History flows.
- [Финальная readiness-запись](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6715865079)
  зафиксировала оба PASS, зелёные проверки и передачу merge владельцу.
  PR #302 [merged](https://github.com/iliya1947/vico-forum/pull/302),
  что подтверждено его GitHub metadata.

Результаты выше относятся к repository/local-CI и exact implementation head;
они не равны production/deployed/live Google/real Owner binding acceptance.
Этот history-файл фиксирует завершённый implementation snapshot,
не создаёт новый runtime behavior.

# История проекта — 2026-11-07: Settings SET-01 Owner-only authorization writes

Исторический снимок реализованного в `main` bounded SET-01. **Не является source of
truth для текущего поведения.** Действующий контракт — в
[`AUTHORIZATION.md`](../auth/AUTHORIZATION.md) и
[`ADMIN_PANEL.md`](../ADMIN_PANEL.md); текущий статус — в
[`PROJECT_STATE.md`](../../PROJECT_STATE.md).

## Решение и реализация

- В рамках утверждённого S1 (план Settings в служебном PR
  [#251](https://github.com/iliya1947/vico-forum/pull/251)) все шесть
  семейств authorization-management mutations текущего выпуска стали
  **Owner-only**: create/rename/delete role, replace grants, assign role,
  user override `allow` / `deny` / `inherit`.
- `access.authorization.manage` сохранён в initial grants и разрешает
  прежние protected Roles / authorization-user reads. Non-Owner с этим
  permission видит raw роли/grants/overrides и effective state, но без форм
  изменений; прямые POST отклоняются `403` без изменения данных/History.
- Central application policy `canMutateAuthorization` проверяет exact
  server-bound `VICO_OWNER_USER_ID` внутри существующего shared mutex/fresh
  PostgreSQL writer, перед любым из шести intents, включая no-op. Raw Owner
  role/grants/overrides остаются сохранёнными; raw self-`deny` не отменяет
  effective Owner authority. История, transactional rollback, next-request
  freshness, AP-10 hierarchy/immunity и elevated-key guard сохранены.
- В текущем выпуске **нет** deputy delegation, Settings shell, registration
  flags, новых permissions, schema/migrations или изменений production runtime.
  Policy seam допускает отдельно спроектированную будущую делегацию без
  готового действующего deputy path.

## Проверенная поставка

- Implementation [PR #299](https://github.com/iliya1947/vico-forum/pull/299);
  frozen exact head `e52c97eed86283fff11976124a9216442fbe6bc3`,
  merge commit `137cecfe6a553b2df9be8e3642e5de8b16e22fee`.
- Мира: coordinator whole-PR review **PASS**, **0 подтверждённых current-scope
  defects**; [запись](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6712824041).
- Лёва: независимый technical whole-PR review **PASS**, **0 подтверждённых
  current-scope defects**; [отчёт](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6713064366).
- Exact-head [CI #42411014276](https://github.com/iliya1947/vico-forum/actions/runs/42411014276)
  **SUCCESS**: 156/156 application suites, 1980/1980 tests; 47/47 native
  PostgreSQL 17 suites, 572/572 tests; lint/typecheck/build и локальный
  Worker/Better Auth/PostgreSQL HTTP smoke.
- Exact-head [Chromium #42411014284](https://github.com/iliya1947/vico-forum/actions/runs/42411014284)
  **SUCCESS**: независимые `browser` и `history_browser`, реальные
  Better Auth sessions с synthetic Owner binding, Owner writes, ordinary
  manager read-only/403, History и recovery, AP-10/11 и EN/RU/HE responsive.
- Это repository/local-CI acceptance. Реальная Google OAuth конфигурация,
  установленный Owner binding, deployed проверки, production/Stage 6 и
  owner visual acceptance **не выполнялись**.

Дальнейшая отдельная документационная синхронизация не меняет runtime-код.
SET-02–SET-06 не входят в этот исторический снимок.

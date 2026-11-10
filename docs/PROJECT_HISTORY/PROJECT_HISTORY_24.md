# История проекта — 2026-11-10: Admin/Super-admin outgoing routing foundation

Исторический snapshot завершённого bounded foundation. Не является source of truth
для текущего поведения: фактический статус — [PROJECT_STATE.md](../../PROJECT_STATE.md),
постоянные границы — [ADMIN_PANEL.md](../ADMIN_PANEL.md) и
[SUPER_ADMIN.md](../SUPER_ADMIN.md).

## Реализованная поставка

- `AdministrativeRouting` — чистый типизированный resolver исходящих адресов с
  **двумя независимыми семействами**: обычный Admin и exact-Owner-only Super-admin.
  Текущие default адреса сохранились:
  `/:locale/admin/*` и `/:locale/super-admin/*`.
- UI provider/hook и request-scoped server accessor позволяют соответствующим
  Link/Form/redirect consumers использовать активное семейство адресов; исходящие
  Admin и Owner destinations не обязаны иметь общий base/origin/Worker.
- Существующие shell/overview, Forum/Users/Measures/History, authorization,
  header/profile/Settings entry и Super-admin Monitoring/System/Event log
  consumers используют этот boundary. Substitution tests проверяют раздельные
  базы/origins, а default application продолжает использовать прежние URLs.
- `app/routes.ts`, текущие Worker ingress/route IDs, авторизация/действующие
  mutation checks, React Router `8.3.1` / `initial`, schema/migrations и
  зависимости не изменялись. Новые Owner Worker, Access, отдельная Owner
  auth/session, DB/deploy isolation, route concealment и действующий
  cross-origin transport **не реализованы**.

## Implementation, correction chain и merge

- [Implementation PR #317](https://github.com/iliya1947/vico-forum/pull/317)
  **merged 2026-11-10**. Final stable implementation head:
  `d12719bc8e6b2e6368489c16f2e0efa9ef6e3605`;
  merge commit `56358c517cd4456e4421d56e022fce70431b00c1`.
- Технический план [Лёвы](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6761206804),
  [коррекция архитектурной границы #315](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6761588752)
  и [plan PASS Миры](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6761671562)
  ограничили пакет egress foundation без Worker split и Stage-6 security activation.
- **FOUNDATION-LEV-01 / P3:** independent review обнаружил, что AdminShell
  сравнивал `location.pathname` с абсолютным same-origin destination, из-за
  чего не сохранялся логический последний раздел Admin.
  [Finding Лёвы](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6763198179);
  [подтверждение Миры](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6763486651).
  Исправлено сопоставление origin/pathname с detail-page exclusion и
  per-account regression для relative/absolute same-origin destination.
  [Closure Лёвы](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6764152289).
- **FOUNDATION-LEV-02 / P3:** content-level System → Monitoring Link
  обходил подставленный Owner resolver, используя default helper argument,
  хотя соседние shell/History links уже использовали активную Owner family.
  [Finding Лёвы](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6764152289);
  [подтверждение Миры](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6764287078).
  Исправлена передача активного routing в System route; добавлена
  настоящая route-level default/independent Owner-origin regression.
- [Финальный coordinator whole-PR PASS Миры](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6764695060)
  и [независимый whole-PR PASS Лёвы](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6765085755)
  — **0 подтверждённых дефектов текущего scope** на одном exact head;
  оба findings закрыты.
  [Coordinator ready for Owner merge](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6765453316);
  [факт merge](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6765810801).

## Финальные exact-head проверки

1. [CI #42794915937](https://github.com/iliya1947/vico-forum/actions/runs/42794915937)
   — **SUCCESS**: 172 application suites / 2157 tests; checks, native PostgreSQL 17,
   lint/typecheck/build, migration/schema verification.
2. [SA-01 Chromium #42794915727](https://github.com/iliya1947/vico-forum/actions/runs/42794915727)
   — **SUCCESS**.
3. [AP-10 Chromium #42794915509](https://github.com/iliya1947/vico-forum/actions/runs/42794915509)
   — **SUCCESS**, все четыре browser/history/settings/settings_administrator jobs.

Независимая техническая проверка дополнительно покрыла полный 36-файловый PR,
реальные built Worker/Better Auth/PostgreSQL/Chromium сценарии, отдельные
regression probes и аудит текущих callers; её границы и доказательства
описаны в [финальном отчёте](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6765085755).

**Граница:** эти проверки относятся к repository/local-CI и принятому
outgoing-address foundation. Они не подтверждают production rollout,
Stage-6 external acceptance, отдельный Owner Worker, реальную Access/Owner
authentication isolation или полноту будущих Super-admin Monitoring/SA02
функций. SA02 telemetry/source-attribution correction остаётся отдельной
незавершённой работой.

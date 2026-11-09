# История проекта — 2026-11-08: Settings SET-06

Исторический snapshot реализации **SET-06 Privacy**. Не является
source of truth для текущего поведения. Постоянный контракт —
[`SETTINGS.md`](../SETTINGS.md); фактическое состояние —
[`PROJECT_STATE.md`](../../PROJECT_STATE.md).

## Реализованная поставка

- Защищённая `/:locale/settings/privacy` внутри существующего
  SettingsShell: один account-wide переключатель **Show me online**
  с явным Save, persisted в PostgreSQL; при отсутствии preference
  row считается ON. EN/RU/HE, RTL, клавиатура и мобильный интерфейс.
- Forward migration `0061_user_privacy_preferences.sql`,
  Drizzle schema/snapshot/journal, full-schema manifest и точные
  web-runtime grants. Не добавлены другая Settings storage, RBAC,
  Owner exception, новый auth provider или Admin History producer.
- Сохранение OFF транзакционно меняет own preference и удаляет own
  presence, сериализуется с heartbeat через ту же блокировку
  строки пользователя; heartbeat проверяет preference после lock.
  Public online SQL фильтрует скрытых до count/limit, в том числе
  при физически оставшейся stale presence row. ON не создаёт
  presence автоматически — требуется обычный heartbeat.
- Строгие session/Origin/intent/field/explicit-boolean/own-identity
  guards, typed unavailable и неожиданные ошибки разграничены.
  Homepage document/data и private Settings responses — no-store,
  heartbeat success/controlled errors — no-store.
  Публичные профили/сообщения и footer privacy-policy link не изменены.
- Connected Worker/Better Auth/PostgreSQL 17/Chromium acceptance
  выполнен в существующем `settings_browser` job, без
  нового standalone workflow. Проверены реальные guest list/count,
  OFF/ON и cross-session, stale/invalid/revoked requests,
  HTTP cache headers и классифицированный PostgreSQL timeout,
  мобильный/RTL/keyboard и отсутствие внешних запросов.

## Implementation и correction cycles

- [Implementation PR #311](https://github.com/iliya1947/vico-forum/pull/311)
  **merged** 2026-11-08. Финальный implementation exact head:
  `11639e79ae67b61062d05bf3f05e32526204a056`;
  merge commit `95272b587643efa6844303aed8522c44b136e699`.
  Общий канал согласований и проверок —
  [PR #251](https://github.com/iliya1947/vico-forum/pull/251).
- На первоначальном review head
  `b2a2b4a2b5505f5a1b885b5c2142370c31bd46fc` Мира
  подтвердила **SET06-MIRA-01**: privacy Hyperdrive adapter
  распознавал availability лишь на верхнем объекте ошибки,
  хотя Drizzle ORM 0.45.2 помещает драйверную ошибку в
  `DrizzleQueryError.cause`. Обёрнутые PostgreSQL transport
  failures могли не попадать в контролируемый `503`.
- Лира ограниченно исправила только
  `db/hyperdrive-user-privacy.ts` и добавила
  `db/hyperdrive-user-privacy.test.ts`: локальный обход
  `cause` с защитой от циклов, сохранение typed unavailable
  для SQLSTATE/transport/timeout и сохранение unexpected
  поведения для schema/auth/programming failures.
  Добавлено **17 focused regression tests**.
- Мира повторно провела coordinator whole-PR review финального
  неизменённого head и дала **PASS — 0 current-scope defects**,
  закрыв SET06-MIRA-01.
  [Coordinator verdict](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6724743576).
  Затем Лёва независимо проверил тот же exact head и дал
  **PASS — 0 current-scope defects**.
  [Independent review](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6724949328).
  После обоих PASS Мира зафиксировала
  [readiness for Owner merge](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6724980201).

## Финальные exact-head проверки

- [CI #42504491033](https://github.com/iliya1947/vico-forum/actions/runs/42504491033)
  — **SUCCESS**: lint, typecheck, build, application
  **167/167 файлов, 2114/2114 тестов** (включая 17 новых
  adapter-regressions); native PostgreSQL 17 **52/52 файлов,
  605/605 тестов**; migration/manifest, runtime grants,
  provisioning и Worker smoke.
- [Chromium #42504491099](https://github.com/iliya1947/vico-forum/actions/runs/42504491099)
  — **SUCCESS**, все четыре job: `browser`,
  `history_browser`, `settings_browser`,
  `settings_administrator_browser`. В существующем
  `settings_browser` подтверждены **13 SET-06 acceptance groups**
  с real Worker/Better Auth/disposable PG17, включая
  per-account state, hidden heartbeat, guest HTML/data,
  PG query timeout → private 503/unavailable card, EN/RU/HE/RTL,
  320/768/1280 и keyboard.
- Лёва дополнительно сообщил о независимых real-runtime проверках:
  PostgreSQL backend termination с контролируемым Privacy 503,
  real wrapped `42P01` не считается availability,
  собственные browser/HTTP probes и проверки runtime privileges.
  Это отдельное independent-review evidence, а не
  перезапись результатов основного CI.
- Все результаты относятся к **repository/local-CI**.
  Production/Neon/Cloudflare rollout, live Google OAuth,
  реальная Owner binding, owner visual acceptance и
  Stage 6 deployed smoke не выполнялись и этим merge
  не подтверждены.

SET-06 implementation merged; factual documentation closeout
проводится отдельным PR и не является частью
implementation PR #311.

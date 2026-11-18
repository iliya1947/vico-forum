# История проекта — 2026-11-11: Super-admin SA-02 Accounts & Security Monitoring

Исторический snapshot завершённого bounded SA-02. Не является source of truth для
текущего поведения: фактический статус — [PROJECT_STATE.md](../../PROJECT_STATE.md),
постоянный контракт — [SUPER_ADMIN.md](../SUPER_ADMIN.md).

## Реализованная поставка

SA-02 расширил Super-admin после SA-01 двумя live Monitoring-областями:

1. **Accounts & authentication**
   - `accounts.users`;
   - `accounts.methods`;
   - `accounts.sessions`;
   - `accounts.registration`.
2. **Security**
   - `security.auth`;
   - `security.access`;
   - `security.attachments`.

Current state использует фиксированные PostgreSQL aggregates и реальные domain sources.
Overview получил компактные Accounts/Security summaries. Каждый из семи новых monitors
имеет adjacent History, а global Event log проецирует те же original source identities.

SA-02 подключил пять типов доказанных persisted auth-transition facts:
`account.created`, `auth.methodLinked`, `auth.passwordChanged`,
`auth.sessionCreated`, `auth.sessionDeleted`. HTTP success без доказанного persisted
transition фактом не считается.

Миграция `0063_owner_attempt_telemetry` добавила:

- `owner_attempt_patterns` для source-attributed coalesced auth/access patterns;
- `owner_attempt_telemetry_state` для фиксированных quota/unknown/overflow/gap slots;
- отдельный hourly admission budget по 256 новых attributed groups для authenticated и
  anonymous-known-network pool;
- автоматическое новое admission window на следующем UTC recording hour без удаления
  старой history;
- timeline indexes для смешанной source-aware History.

Повтор одного pattern увеличивает retained group, а не создаёт строку на каждую попытку.
При неизвестном источнике, заполнении hourly pool или recording gap сохраняется bounded
состояние, поэтому UI не выдаёт потерю attribution за отсутствие попыток.

Source-aware History объединяет без копирования исходных identities:
System events, auth facts, monitor observations, registration Admin History,
attachment-security evidence, attempt patterns и attempt-state rows. Exact Owner guard
срабатывает до private reads/input parsing; document/data responses и controlled errors
остаются private/no-store.

## Implementation, corrections и merge

- [Implementation PR #319](https://github.com/iliya1947/vico-forum/pull/319)
  **merged 2026-11-11**. Final stable implementation head:
  `3f217c98dd9dcbd51518eda82b51506fbede936c`;
  merge commit `4248fed23925e4a23e48485d419ceaf0ce337def`.
- Основной технический план:
  [#6768069279](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6768069279).
  UI/routing/connected-acceptance handoff:
  [#6789135043](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6789135043).
- После первого cumulative coordinator PASS независимый review Лёвы обнаружил два
  presentation-дефекта текущего scope:
  [#6793653705](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6793653705).
  - **LEV-04:** общий History renderer выбирал неоднозначные `total/version` labels
    только по имени поля и смешивал attachment/user и registration/database semantics.
  - **LEV-05:** любая digit-only строка форматировалась как число, из-за чего opaque IDs
    теряли ведущие нули/получали grouping separators.
- Мира подтвердила оба finding и передала единый local correction package:
  [#6793967285](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6793967285).
  Лира исправила monitor-aware labels и semantic numeric formatting без backend/schema
  changes; connected browser assertion дополнительно перестал гоняться с asynchronous
  Worker `waitUntil` telemetry.
- Финальный coordinator whole-PR review Миры:
  [#6794574095](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6794574095)
  — **PASS, 0 confirmed current-scope defects**.
- Финальный независимый whole-PR review Лёвы:
  [#6794797870](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6794797870)
  — **PASS, 0 open current-scope defects**; LEV-01–LEV-05 CLOSED.

## Финальные exact-head проверки

1. [CI #43009722614](https://github.com/iliya1947/vico-forum/actions/runs/43009722614)
   — **SUCCESS**: checks + native database, lint/typecheck/build, application tests,
   migrations/schema/privilege verification.
2. [SA-01 connected Chromium #43009722439](https://github.com/iliya1947/vico-forum/actions/runs/43009722439)
   — **SUCCESS** на built Worker + Better Auth + disposable PostgreSQL 17, включая SA-02
   Accounts/Security flows.
3. [AP-10 isolated Chromium #43009722575](https://github.com/iliya1947/vico-forum/actions/runs/43009722575)
   — **SUCCESS**, 4/4 jobs.

Независимый final review дополнительно повторил corrected presentation reproducers,
selected application/auth/observability/route tests, build, clean PostgreSQL 17 migrations,
schema manifest и expanded connected Chromium acceptance.

## Граница

SA-02 не реализует unified privileged user profile, деактивацию, остальные десять
Monitoring areas, SA-03+, отдельный Owner Worker/Cloudflare Access/isolated Owner
auth-session/DB capability boundary, production rollout или post-current-plan journal
occupancy/archive/clear. Реальный Google OAuth/Owner binding и deployed acceptance
остаются Stage 6. Final product-wide visual/runtime acceptance остаётся отдельным
UI/UX/release gate.

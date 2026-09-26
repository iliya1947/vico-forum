# Stage 6 ChatGPT coordination channel

> Служебный non-merge документ канала ChatGPT. Этот PR не предназначен для merge в `main`.

## Проверенный baseline

- Актуальный `main`: `45512ac0a9e0090cc86f284a2a050de8b8a0f6d0`
  (`Docs: align current state with Stage 6 (#129)`).
- Stage 4 forum core и Stage 5 translations/background jobs завершены в repository/local-CI path.
- Текущий продуктовый этап — Stage 6 pre-release external integration.
- Служебный PR Codex Stage 6 — #121; его актуальный head при этой проверке:
  `381759b1b27ab1fbdfb6ad814a640cabf456ea73`.
- Ранее outstanding observation о deployed-проверке dynamic role/user permission management
  в #121 исправлено: актуальные scope и completion criteria явно включают эту проверку.

## Scope канала

Этот PR используется только для технического диалога и результатов работы ChatGPT по Stage 6.
Изменения продукта и mergeable fixes выполняются отдельными PR. Этот PR не изменяет
инфраструктуру, production data, secrets или deployment.

## Source of truth

Работа Stage 6 сверяется с актуальным `main`, `AGENTS.md`, `PROJECT.md`,
`PROJECT_STATE.md`, `ROADMAP.md` и относящимися профильными контрактами. External API,
platform и exact-version assumptions перед применением проверяются по актуальной официальной
документации.

## Read-only external preflight — продолжение 2026-09-26

По следующему шагу из актуального PR #121 выполнена доступная из ChatGPT read-only проверка без
external mutations и без чтения secret values.

### GitHub

- Актуальный repository baseline подтверждён на `45512ac0a9e0090cc86f284a2a050de8b8a0f6d0`.
- Текущий GitHub connector намеренно не предоставляет sensitive endpoint families, включая
  secrets APIs. Поэтому наличие/имена GitHub Environment secrets/variables через доступный
  connector честно подтвердить нельзя; secret values не запрашивались.
- Публично доступная часть GitHub preflight уже зафиксирована Codex в #121; новых repository
  mutations в рамках этой проверки не выполнялось.

### Neon

- Подключённый Neon connector доступен, но connection не scoped к конкретному project.
- Read-only вызов project/branch metadata без `project_id` отклонён с явным требованием передать
  target Neon project ID.
- В repository search по `NEON_PROJECT_ID` target project ID не найден.
- Поэтому migration login identity, application ownership, memberships и runtime-role design input
  пока не подтверждены. Для продолжения достаточно project ID; пароль/connection string/secret
  material не нужны и не должны передаваться.

### Cloudflare

- В текущем наборе подключённых инструментов ChatGPT Cloudflare control-plane connector отсутствует.
- Поэтому фактические production branch/auto-deploy state, preview topology и bindings из
  Cloudflare account здесь не подтверждены. Repository documentation не подменяет это external
  evidence.


### Neon evidence после получения target project ID

Target подтверждён пользователем как Neon project `late-cell-18916701`, branch
`br-square-flower-b2q6a3sy`. Read-only control-plane/catalog проверки дали:

- project name `vico-forum`, PostgreSQL 17, region `aws-eu-central-1`;
- указанная branch называется `production`, является primary/default и находится в state `ready`;
- database `vico_forum` принадлежит `vico_forum_owner`;
- существуют роли `vico_forum_owner`, `vico_forum_migrator`, `vico_forum_runtime`;
- SQL session connector выполняет read-only query как `vico_forum_owner`;
- PostgreSQL catalog: migrator/runtime не superuser, не CREATEDB/CREATEROLE; owner имеет
  CREATEDB/CREATEROLE и состоит в `neon_superuser`, `vico_forum_migrator`,
  `vico_forum_runtime`;
- `vico_forum_migrator` владеет schema `drizzle` и текущими принятыми public relations
  localization/Better Auth subset; runtime не владеет public relations;
- Neon role metadata возвращает для `vico_forum_migrator` `authentication_method=no_login`,
  тогда как PostgreSQL catalog на той же production branch возвращает `rolcanlogin=true`.
  Это зафиксировано как control-plane/catalog discrepancy для технического разбора, без mutation.

Эта проверка не применяла migrations, не меняла roles/grants/resources и не читала passwords или
connection strings. Точный migration credential path и полный runtime grants contract ещё не
считаются подтверждёнными только из наличия ролей.

## Текущий статус

Neon identity/ownership baseline теперь получен read-only. Остаются: технически разобрать
расхождение migrator metadata/catalog и подтвердить фактический dedicated migration credential
path; получить GitHub Environment configuration evidence и Cloudflare topology/bindings evidence.
External mutations не выполнялись.

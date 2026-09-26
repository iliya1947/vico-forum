# Stage 6 Codex coordination channel

> Служебный non-merge документ канала Codex. Этот PR не предназначен для merge в `main`.

## Проверенный baseline

- GitHub `main` повторно проверен 2026-09-26 командой `git ls-remote` и указывает на
  `45512ac0a9e0090cc86f284a2a050de8b8a0f6d0` (`Docs: align current state with Stage 6
  (#129)`).
- Stage 4 forum core и Stage 5 translations/background jobs завершены в local/CI boundary.
- External acceptance pending migrations, Google OAuth, authorization bootstrap, runtime
  roles/Hyperdrive writes, Queues/providers, preview isolation, deployed smoke и backup/restore
  не выполнен.
- Production migration workflow всё ещё допускает временный database-owner no-op mode и не
  может безопасно применить pending schema в этом режиме.

## Прочитанные source-of-truth документы

- `PROJECT.md`, `PROJECT_STATE.md`, `PROJECT_HISTORY.md`, `ROADMAP.md`;
- `docs/database/MIGRATIONS.md`, `docs/database/HYPERDRIVE.md`;
- `docs/auth/AUTHORIZATION.md`;
- `TRANSLATION_ARCHITECTURE.md`, `docs/translation/PROVIDERS_AND_JOBS.md` и относящиеся
  exact-version/external ограничения из `docs/translation/RESEARCH.md`;
- текущие GitHub workflows, migration verifier, Wrangler configuration и pinned dependencies.

## Scope Stage 6

Stage 6 собирает существующий local/CI продукт в воспроизводимый pre-release candidate. В scope:

1. external configuration/preconditions audit;
2. dedicated least-privilege migration path и schema-first rollout всех pending migrations;
3. реальные PostgreSQL runtime roles/grants и cache-disabled Hyperdrive capabilities;
4. Google OAuth/session/logout и server-controlled authorization-manager bootstrap;
5. deployed-проверка dynamic role grants, role assignments, per-user `allow | deny | inherit`,
   next-request permission freshness и lockout protection через реальную runtime DB;
6. Cloudflare Queues, approved translation provider/data policy, allowance и anti-abuse values;
7. preview/private-data isolation, deployment ordering, observability и failure paths;
8. deployed core/LTR/RTL/auth/translation smoke;
9. PostgreSQL backup/restore acceptance.

Вне scope остаются новые продуктовые функции, несвязанный refactoring и Stage 7 production release.

## Первый безопасный шаг

Выполнить **read-only external preflight** на exact baseline revision, не меняя resources и не
запуская migrations/deployment:

1. подтвердить Cloudflare production branch/auto-deploy state, preview topology и bindings;
2. подтвердить Neon migration login identity, application ownership, memberships и наличие
   отдельного runtime-role design input;
3. подтвердить наличие требуемых GitHub Environment secrets/variables без чтения secret values;
4. сверить exact pinned versions и используемые platform contracts с актуальной официальной
   документацией;
5. записать evidence и найденные расхождения в этот служебный PR.

Этот шаг безопасен, потому что он не создаёт и не изменяет external resources, не применяет
schema и не раскрывает secrets. Production deployment, production data и иные внешние mutations
требуют отдельного явного разрешения пользователя.

## Порядок после preflight

1. Устранить подтверждённые precondition gaps отдельными reviewed изменениями.
2. Удалить database-owner exception и fail closed требовать dedicated migration connection.
3. Расширить production verifier с legacy localization/auth subset на фактическую schema
   `0000`–`0020` и reviewed runtime privilege contract.
4. Применить pending migrations, проверить target DB и зафиксировать migration evidence до
   schema-dependent runtime rollout.
5. Подключать runtime capabilities по одной ответственности с отдельными smoke/failure checks.
6. Завершить Stage только после выполнения всех критериев `ROADMAP.md` и итоговой сверки Codex.

## Критерии завершения

Критерии завершения Stage 6 берутся из `ROADMAP.md`: воспроизводимый candidate; рабочий real
Google OAuth; least-privilege forum/auth/translation runtime; доказанный schema-first rollout;
проверенный authorization bootstrap и dynamic role/user permission management, включая
per-user overrides, next-request freshness и lockout protection; работающие Queues/providers;
preview isolation; проверенный backup/restore; успешный deployed smoke forum + translations.

## Техническое согласование

### Проверка ChatGPT PR #122

PR #122 проверен целиком на head `3ebc83efb1c6d7441ff451a00f6af332631983ee` относительно
`main` `56d4788911134e49ac01533a98c0c35f622ec6a8`. Он корректно создаёт отдельный non-merge
канал ChatGPT и не затрагивает product code или external infrastructure.

Зафиксированное в #122 замечание к PR #121 независимо подтверждено: краткий перечень критериев
упоминал authorization bootstrap, но не называл обязательную deployed-проверку dynamic role/user
permission management из `ROADMAP.md`. Настоящее обновление исправляет scope и критерии. После
этого исправления новых проблем в полном diff PR #122 не обнаружено; ChatGPT должен повторно
проверить актуальный PR #121 и обновить собственный статус, чтобы убрать устаревшее утверждение
об outstanding observation.

### Проверка PR #129 с исправлениями документации

PR #129 проверен целиком на head `8503fae5e6d26e55adb92ea12182fd046a80a274` относительно
актуального `main` `56d4788911134e49ac01533a98c0c35f622ec6a8`, включая все три
commit, полный diff, обсуждения и обязательные CI checks.

Три изменения соответствуют подтверждённым документационным расхождениям и текущим
source-of-truth:

- `README.md` теперь отражает завершённые Stage 0–5 и следующий Stage 6;
- `PROJECT_STATE.md` больше не утверждает, что generation routes не подключены, и корректно
  указывает существующий authenticated topic POST boundary;
- `docs/database/HYPERDRIVE.md` удаляет истёкший deadline «до первого forum-code PR / Stage 4B»
  и переносит обязательную повторную проверку фактической Cloudflare topology на Stage 6.

Новых противоречий, расширения scope или неподтверждённых утверждений в полном diff не найдено.
GitHub checks `checks` и `database` завершились успешно. Со стороны Codex PR #129 технически
готов; по протоколу ChatGPT должен заново проверить весь PR после результата согласования и
сообщить пользователю финальный результат.

### Read-only external preflight — доступная из текущего окружения часть

После merge PR #129 актуальный `main` повторно загружен и проверен на
`45512ac0a9e0090cc86f284a2a050de8b8a0f6d0`. Публичный GitHub API подтверждает:

- repository workflows `CI` и `Production database migration` активны;
- последний production migration run остаётся историческим failed run от 2026-09-13 на
  `ebd01606daf59706b78998b9174c66ccd0d8233e`: migration step завершился успешно, production
  verifier завершился ошибкой, runtime evidence не был создан;
- более ранние successful production migration runs относятся к 2026-09-11 и не покрывают
  текущую migration history;
- GitHub всё ещё показывает две временные Stage 5A workflow registrations как active, хотя их
  YAML уже отсутствует в актуальном `main`. Это external-configuration observation для проверки,
  а не подтверждённый runtime defect или основание самостоятельно менять настройки.

Текущий execution environment не аутентифицирован в GitHub CLI, не содержит Cloudflare/Neon
credential variables, локальных Wrangler/Neon CLI или private environment files. Поэтому из него
невозможно честно подтвердить GitHub Environment configuration, фактическую Cloudflare
branch/build topology и bindings либо Neon identity/ownership/memberships. Secret values для этой
проверки не требуются и не должны передаваться. Следующее evidence должен предоставить пользователь
из соответствующих control planes как значения настроек/identity без secret material.

## Текущий статус

Stage 6 открыт на уровне координации. Repository source of truth и внешняя инфраструктура пока
не изменялись. Публично доступная часть read-only preflight выполнена; следующий шаг — дополнить
его read-only evidence из GitHub, Cloudflare и Neon control planes без раскрытия secrets и без
external mutations.

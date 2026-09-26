# Database migrations

## Назначение

Этот документ разделяет два разных процесса:

1. **development migration** — schema evolution для active local/CI разработки;
2. **external rollout** — применение уже reviewed schema в pre-release/production-like
   PostgreSQL перед runtime deployment, который от неё зависит.

Обычная разработка не должна превращаться в production rollout только из-за появления
новой таблицы или migration.

## Development baseline

- PostgreSQL schema changes коммитятся как reviewed forward SQL в `drizzle/` и применяются
  через Drizzle migration history. Production schema changes не используют `drizzle-kit push`.
- `pnpm db:check` проверяет migration metadata.
- `pnpm db:test` воспроизводит полную migration history на disposable PostgreSQL 17 и может
  выполняться только против локальной test DB, имя которой заканчивается на `_test`.
- Pull-request CI защищает accepted migration history и проверяет current schema/tests.
- Во время active pre-release feature-разработки новая migration может быть merged вместе с
  runtime/domain code, если change не выкатывается автоматически во внешний runtime и local/CI
  проверки доказывают согласованность schema + code.
- Новая migration **не обязана немедленно применяться в Neon** только для того, чтобы
  продолжать разработку следующего feature PR.

`DATABASE_URL` является server/admin development input. Он не коммитится, не логируется и
не попадает в browser/Worker bundle.

## Immutable accepted history

После попадания migration в `main` её SQL и соответствующий Drizzle snapshot считаются
accepted history и не переписываются. Исправления делаются новой forward migration.

PR CI отклоняет:

- modification/deletion/rename accepted `drizzle/*.sql`;
- modification/deletion/rename accepted `drizzle/meta/*_snapshot.json`;
- rewrite/delete существующих entries в `drizzle/meta/_journal.json`;
- non-monotonic/duplicate appended journal entries;
- новый SQL без matching journal entry и наоборот.

`drizzle-kit check` и clean-database integration suite остаются отдельными проверками:
history guard защищает прошлое, а Drizzle/tests проверяют текущую итоговую schema.

## External schema-dependent rollout

Только когда новая schema действительно должна стать доступной во внешнем
pre-release/production runtime, действует schema-first ordering:

```text
reviewed migration on main/release revision
→ target-environment migration workflow
→ target DB verification
→ migration evidence
→ runtime rollout that depends on the new schema
```

Первое появление target-environment schema и runtime, который уже требует эту schema,
нельзя выкатывать одним неразделимым external deployment step. Это rollout constraint, а
не запрет разрабатывать schema и runtime совместно локально/в CI.

Если application release после migration неудачен, rollback application code должен
сохранять совместимость с уже применённой schema. Production recovery — forward repair или
проверенный backup restore; автоматические destructive down migrations не являются baseline.

## Current production migration workflow state

Workflow **Production database migration** запускается вручную через `workflow_dispatch`,
ограничен `refs/heads/main`, serializes production DB migrations и проверяет exact checked-out
`github.sha`.

Stage 6 восстановил dedicated least-privilege migration credential и отдельно доказал
external execution identity как exact `vico_forum_migrator` через manual read-only workflow из
`main`. Production migration workflow после этого больше не содержит
`PRE_RELEASE_ALLOW_DATABASE_OWNER_CONNECTION`: database-owner connection всегда rejected, а
migration connection должна совпадать с application owner role.

Перед `db:migrate` по-прежнему выполняется полный preflight verifier, который требует, чтобы
checked-in Drizzle journal уже полностью присутствовал в target DB. Поэтому при текущих pending
migrations workflow fail closed завершится **до** migration write. Это намеренный временный barrier:
этот change удаляет owner exception, но ещё не вводит pre-migration/post-migration verifier phases
для применения новой forum/auth/translation schema.

Перед следующим настоящим external schema rollout нужно:

1. отдельно спроектировать и review pre-migration/post-migration verifier phases;
2. расширить target verification contract на фактическую pending schema и reviewed runtime
   privilege model;
3. только после этого применять pending migrations через protected target-environment workflow
   и фиксировать migration → runtime evidence.

## Production verification contract

Target-environment verifier проверяет стабильные invariants, а не mutable product state.
Текущий contract включает как минимум:

- PostgreSQL 17 и UTF-8;
- migration ledger против checked-in Drizzle journal;
- expected schema shape для уже принятых localization/translation/Better Auth tables;
- отсутствие persistent bootstrap/reserved locale rows (`en`, `api`, `assets`);
- отсутствие persistent canonical-English UI translation rows;
- current connection role, application owner и configured runtime role attributes/memberships;
- application table ownership;
- schema/table/sequence privileges, column ACL/grant options, `PUBLIC` grants и default ACL;
- отсутствие неожиданных cross-domain runtime grants/ownership.

Verifier намеренно не фиксирует mutable locale publication/translation state, aliases,
native names или presentation metadata.

При добавлении forum schema target-environment verifier расширяется только когда эта schema
готовится к external rollout. Обычный Stage 4B development PR не обязан заранее добавлять
production role grants или external catalog acceptance для ещё не выкатываемой schema.

## Runtime privilege model

Runtime capabilities разделяются по реальной ответственности и principle of least privilege.
Не следует автоматически расширять существующий localization runtime role на forum/auth writes.

Текущий localization role остаётся read-only для:

```text
public.locales
public.ui_translations
public.ui_translation_bundles
```

Forum/auth/translation write-capabilities проектируются по фактическим query patterns ближе к
Stage 6 external integration. До этого их correctness проверяется на development/test DB без
преждевременного provisioning production roles.

Production role names остаются environment-specific и не hard-code-ятся в portable migrations.

Runtime-role deadline defaults — operational role configuration, не portable schema. Existing
localization defaults/acceptance описаны в `HYPERDRIVE.md`.

## Migration → runtime evidence

Evidence требуется для **external schema-dependent runtime rollout**, а не для каждого merged
migration commit.

Минимальный evidence chain:

```text
target migration workflow run
→ exact checked-out Git SHA
→ checked-in Drizzle journal identity/history
→ successful target DB verification
→ schema-dependent runtime rollout
```

После успешного target migration workflow repository-owned
`.github/runtime-migration-evidence.json` фиксирует:

- workflow run ID;
- exact migration SHA;
- SHA-256 Drizzle journal;
- newest migration tag, от которой зависит внешний runtime rollout.

Обычный pull-request CI проверяет repository-local migration history и unit/static evidence
contract, но не обращается к GitHub Actions API и не требует актуальный external migration
workflow run.

Live verification workflow identity, `main`, successful completion, ancestry и journal coverage
выполняется только как часть фактического **external schema-dependent runtime rollout**.
Скрипт `.github/scripts/verify-runtime-migration-evidence.mjs` и repository-owned evidence
сохраняются для этой границы; подключение live verifier к Stage 6 rollout выполняется вместе
с реализацией самого external release path.

Evidence file не должен обновляться при каждой development migration. Он обновляется тогда,
когда external runtime действительно начинает зависеть от новой migration.

Текущий evidence относится к `0002_ui_translation_storage`, потому что deployed Worker
пока не зависит от Better Auth schema `0003`.

## Исторические rollout checkpoints

### Stage 3A

`ui_translations` и `ui_translation_bundles` впервые были добавлены migration-only, затем
применены/проверены в production-like DB, после чего отдельный runtime rollout получил
read-only persistent translation access. Этот rollout остаётся валидной историей уже
развёрнутого localization foundation.

### Stage 4A

Stage 4A добавил Better Auth `1.7.4` core tables и database-backed `rate_limit` как
migration-only foundation. `user.locale` nullable и server-owned, без FK на `locales`, потому
что bootstrap `en` code-owned.

Stage 4A runtime dependency не добавлялась: Better Auth initialization, auth routes, Google
OAuth, auth Hyperdrive/role/grants и Worker auth writes отсутствуют. Поэтому отсутствие
runtime evidence для `0003` не блокирует Stage 4B forum development.

Когда Better Auth runtime и forum writes будут готовиться к Stage 6 external integration,
все pending migrations должны быть применены/verified и соответствующий evidence обновлён
до external runtime rollout.

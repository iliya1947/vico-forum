# Stage 6 shared service channel — ChatGPT + Codex

> Общий служебный non-merge канал Stage 6. Этот PR никогда не merge в `main`.
> После перехода проекта на один общий служебный PR этот файл является единственным
> communication-файлом Stage 6: ChatGPT и Codex читают и обновляют его напрямую.

## Рабочий регламент канала

- `main` — источник истины для текущего кода и project documentation.
- ChatGPT и Codex используют этот PR как общий технический канал: статус, evidence, findings,
  аргументы, согласованные решения, незакрытые вопросы и следующий шаг.
- Пользователь не переносит сообщения между ChatGPT и Codex; он подключается только для
  продуктового решения, выбора между допустимыми вариантами, merge или действия, доступного только
  владельцу.
- Implementation work идёт отдельными implementation PR. Этот service PR не содержит product code
  и не является implementation branch.
- External/production mutation требует отдельного явного разрешения владельца.
- Старый Codex service PR #121 после этой консолидации считается legacy/read-only. Новые записи
  Stage 6 в #121 не ведутся. Закрытие #121 выполняет только пользователь.
- Branch name `chatgpt/stage-6` — legacy от старой двухканальной схемы и не означает, что канал
  принадлежит только ChatGPT.

## Состояние при переходе на общий канал — 2026-10-09

Актуальный repository `main` при переоборудовании канала:
`0e56dab9c54053681d66205a97eac994064e8b15`.

Stage 6 external-integration orchestration остаётся **на паузе по решению владельца**. Активный
product priority определяется текущими `PROJECT_STATE.md` / `ROADMAP.md`; этот файл не
возобновляет Stage 6 и не разрешает external operations.

С момента паузы repository существенно ушёл вперёд:

- migration history current `main` содержит 32 entries through
  `0031_help_user_moderation_signals`;
- accepted production migration evidence из Stage 6 исторически покрывает только
  `0000`–`0020`;
- после `0020` в repository появились новые forum/UI/Help & solutions schema и permissions.

Следствие: старый September Stage 6 «next step» нельзя исполнять напрямую. При явном
возобновлении Stage 6 сначала нужен fresh audit current `main`, pending migrations
`0021`–`0031`, runtime ACL/binding requirements и фактического external state.

## Консолидированный Stage 6 record из legacy PR #121 и #122

Ниже перенесены необходимые долговечные факты и принятые технические решения. Промежуточные
инструкции, уже исправленные ошибки, повторные review-циклы и superseded next-step тексты намеренно
не дублируются: они остаются в Git history PR #121/#122, но не являются действующим контрактом.

### 1. Dedicated migration identity и schema-first boundary

Принято и выполнено:

- production migration identity — dedicated `vico_forum_migrator`, а не database owner;
- owner exception из production migration path удалён;
- pinned Drizzle migration path требует direct non-grantable database `CREATE` для migrator;
- эта capability была выдана отдельно и подтверждена read-only identity/capability verifier;
- successful production migration dispatch применил `0004`–`0020`;
- postflight подтвердил complete `0000`–`0020` ledger, structural manifest и privilege contract;
- repository-owned migration→runtime evidence было синхронизировано through
  `0020_translation_generation_permission`.

Принцип сохраняется: external schema-dependent runtime rollout выполняется schema-first; failed
migration/deploy не rerun-ится автоматически без отдельной диагностики и нового решения.

### 2. Runtime database capability design

Принят вариант с разделением meaningful capabilities:

- existing `HYPERDRIVE` / `vico_forum_runtime` остаётся localization-read capability;
- отдельная web capability `vico_forum_web` предназначена для Better Auth, forum writes/reads,
  dynamic authorization и persisted forum-content presentation;
- translation background/maintenance capability не смешивается с HTTP web role;
- content-generation write/task capability не выдавалась web role только «на будущее».

Для production web role были приняты exact least-privilege grants, отсутствие dangerous role
attributes/grant options/ownership и server-side defaults:

- `lock_timeout=2s`;
- `statement_timeout=5s`.

Provisioning пришлось разделить по authority: owner создаёт safe role/database/schema boundary,
а exact relation grants выполняет object owner `vico_forum_migrator`. Расширять owner grant
options, менять ownership или ослаблять memberships ради tooling convenience было отклонено.

### 3. Web credential и Hyperdrive precedent

После нескольких безопасно остановленных/rollback-only bootstrap/recovery попыток был использован
уже проверенный owner-controlled standalone password precedent:

- `vico_forum_web` получил usable credential без изменения accepted grants/defaults;
- Cloudflare создал один direct-origin cache-disabled Hyperdrive `vico-forum-web`;
- Hyperdrive ID: `a4e99f358a9f4953a7045db8f733974d`;
- existing localization Hyperdrive ID:
  `aa1fb9feeff44a23ae12d88eefceb942`;
- repository wiring использует `HYPERDRIVE` и `WEB_HYPERDRIVE` как разные capabilities.

### 4. Pre-deploy topology и auth configuration

До rollout были приняты следующие control-plane facts:

- native Cloudflare Git Builds отключён;
- Preview Base был подтверждён пустым по bindings/runtime vars/secrets;
- production workers.dev URL:
  `https://vico-forum.iliya1947a.workers.dev`;
- custom routes/domains не использовались;
- Google OAuth Web client был создан для production callback:
  `https://vico-forum.iliya1947a.workers.dev/api/auth/callback/google`;
- Google OAuth Client ID:
  `727021515826-agv36q7kvuq92c1t4dbimhgbe3a4ph4r.apps.googleusercontent.com`;
- GitHub Environment `production-worker` был создан для `main` с required auth/Cloudflare
  secret names and public auth variables; secret values в service channel не записывались.

### 5. Production Worker rollout: failed workflow, existing-version continuation

Prepared protected workflow `Production Worker rollout` использовал pinned Wrangler `4.130.0`.

Единственный authorized workflow run:

- run ID `36568756602`, attempt `1`;
- exact head `7628ae6f85b7b99d4002dedb112a6bd1c5ed880b`;
- pre-Cloudflare verification и baseline checks succeeded;
- `versions upload` фактически создал Worker version
  `b11a64f4-3c1d-42a4-adf7-c9202d4fc8f6`;
- upload подтвердил exact `HYPERDRIVE`, `WEB_HYPERDRIVE` и четыре auth binding names;
- после создания version Wrangler failed на account-level
  `GET /accounts/<account>/workers/subdomain` с Cloudflare code `10000`;
- promotion step workflow не начинался, rollback не требовался;
- workflow не rerun-ился, новая version/token не создавались.

Принятый вывод: version была валидным already-created artifact; продолжение выполнялось только с
ней, без второго rollout.

### 6. Existing version smoke и manual production promotion

Для exact version
`b11a64f4-3c1d-42a4-adf7-c9202d4fc8f6`:

- Version URL:
  `https://b11a64f4-vico-forum.iliya1947a.workers.dev`;
- owner GET-only pre-traffic smoke прошёл LTR/RTL, locale redirect, public DB read,
  auth-session endpoint и expected 404 boundaries;
- владелец отдельно явно разрешил manual promotion;
- Dashboard направил 100% Production traffic на exact `b11a64f4...`;
- новая version/split/rerun не создавались;
- rollback не потребовался.

После promotion production `/ru/` открылся успешно.

### 7. Real Google OAuth/session/logout acceptance

На promoted production version accepted:

- real Google sign-in completed;
- SSR показал authenticated user;
- session persisted;
- protected authorization-management GET дошёл до server-side authorization boundary и вернул
  expected `403` обычному user без `access.authorization.manage`;
- logout completed и anonymous state restored.

Созданные Better Auth user/account/session rows — ожидаемый результат явно разрешённого smoke, а
не drift.

### 8. Последний принятый Codex next-step до паузы

После successful Worker/OAuth acceptance Codex определил следующим Stage 6 blocker
**server-controlled bootstrap первого authorization manager**.

Принятый на тот момент безопасный design boundary:

- не создавать public unauthenticated bootstrap endpoint;
- использовать protected repository-owned workflow и existing
  `NEON_MIGRATION_DATABASE_URL` под exact object owner/migrator;
- target identity брать только из protected secret/variable, не public workflow input/log;
- fail closed требовать exact one existing Better Auth target user, exact built-in `admin`,
  existing `access.authorization.manage` admin grant, zero current effective managers и
  `managers_ever_existed=false`;
- transaction lock `authz_mutation_lock FOR UPDATE`;
- единственная bootstrap mutation — назначить target user built-in `admin` и атомарно поставить
  `managers_ever_existed=true`;
- before commit проверить effective manage permission, exactly one manager, explicit admin
  assignment и lock flag;
- bounded/redacted output без user ID/email/URL/secret;
- повторный dispatch после success должен fail closed и ничего не менять;
- PR preparation не должен сам выполнять bootstrap.

**Этот bootstrap PR/dispatch не был выполнен до паузы.**

Из-за существенного изменения `main` после 2026-09-29 этот design record теперь является
historical accepted input, а не автоматически разрешённым следующим implementation step. Перед
возобновлением его нужно сверить с current schema/authz contracts и pending external migrations.

## Не закрытые Stage 6 области на момент паузы

Помимо authorization-manager bootstrap оставались:

- production rollout актуальной на тот момент schema/runtime после последующих repository changes;
- translation background/maintenance runtime capabilities;
- Cloudflare Queues и real translation providers;
- authoritative production allowance/anti-abuse values;
- final preview/private-data isolation для write-capability runtime;
- full production-like core + translation smoke актуальной release revision;
- PostgreSQL backup/restore acceptance;
- cleanup/lifecycle недостаточного Cloudflare rollout token и GitHub
  `production-worker` Environment — отдельное решение, не автоматический cleanup.

## Известное расхождение current main vs accepted external evidence

На момент консолидации `PROJECT_STATE.md` в current `main` всё ещё содержит старый Stage 6
external/deployed snapshot, где production описан как baseline `78f87645`, web runtime как ещё
не deployed, а real Google OAuth — как не выполненный.

Это противоречит accepted control-plane evidence 2026-09-29, зафиксированному в legacy service
channels: `b11a64f4...` был promoted на 100%, production Worker работал, Google OAuth/session/
logout прошли acceptance.

Этот service PR не меняет `main` source-of-truth. При возобновлении Stage 6 это расхождение
должно быть отдельно reconciled вместе с fresh external-state audit; нельзя молча считать ни
старый September snapshot, ни текущий stale текст достаточным основанием для новой mutation.

## Как вести дальнейший общий диалог

Новые записи добавляются в конец файла и должны быть self-contained.

Рекомендуемый формат:

```text
## YYYY-MM-DD — ChatGPT | Codex — <topic>

Context:
- ...

Evidence / findings:
- ...

Conclusion:
- ...

Open questions / owner decision:
- ...

Next step:
- ...
```

Правила:

- технические findings и аргументы фиксируются здесь напрямую обоими участниками;
- при disagreement оба участника дописывают аргументы сюда до consensus;
- implementation-детали и CI остаются в implementation PR, а итог review переносится сюда;
- owner action запрашивается только когда без него нельзя продолжить;
- superseded инструкции не удаляются без необходимости, но явно помечаются как superseded;
- секреты, connection strings и иные sensitive values не записываются.

## Legacy channel migration

Legacy Codex PR #121 был полностью проанализирован при этой консолидации. В этот общий канал
перенесены его необходимые долговечные результаты: accepted decisions, production evidence,
failure/recovery boundaries, финальный OAuth/Worker acceptance и последний authorization-bootstrap
design.

PR #121 не изменялся и не закрывался. После проверки этого переоборудованного #122 владелец может
закрыть #121 вручную.

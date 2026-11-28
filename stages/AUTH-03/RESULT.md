# AUTH-03 — реализация и проверяемые результаты

## Реализация и запуск проверок

Draft PR #392 поверх принятого AUTH-02b #391 (`a668fd6d3b0df99056d517a3b2d2a4fe7cef0180`). Current head `cb40e15b6ede72a23b40807cd6de2942d661c893`. AUTHOR PASS ожидает exact-head CI и applicable acceptance.

- Canonical HTTP/direct credential recovery использует neutral forgot, lifecycle mail и terminal budgets, proof с неизменяемым subject и generation, атомарные consume, password update, invalidation и отзыв сессий. Reset не выдаёт сессию.
- Google-only password creation подключён из Settings Account. Fresh session, expected user/session, current email и mail proof перепроверяются перед записью. Исходная сессия сохраняется, остальные собственные сессии отзываются. Google остаётся связанным. Native direct setPassword без proof закрыт.
- Canonical sign-in и ранее существовавшая change-password защищены от interleaving со сбросом. Native credentials, правила сессии и лимиты Better Auth сохранены. PostgreSQL race fixtures проверяют обе операции, когда reset первым получает lock.
- Forgot/reset и Settings используют POST для чувствительных полей. Proof в fragment не уходит в HTTP-запрос и удаляется после in-memory capture. EN/RU/HE локализованы. Синтетическая почта использует существующую fake transport boundary.
- Migration 0076 расширяет закрытый CHECK attempt operations. После proven commit публикуются password reset/method link facts и фактические session deletion receipts. Manifest parity на PG17 прошла для 76 таблиц.

Локально пройдены focused typecheck/lint, native PostgreSQL reset/create/replay/rollback/race tests, существующие Account Security и password-change tests. Connected Worker / системный Chromium подтвердили два полных потока на интеграционном diff до финального scrub ineligible Settings view. Новые exact-head запуски проверяют опубликованный head. AUTH-04 и внешние провайдеры остаются на паузе.


## Author self-check и итог exact-head проверок

**AUTHOR PASS** на `ce75ff3629a4adae9941703a33f6d0366bd7f570` в draft #392. Base #391 остаётся `a668fd6d3b0df99056d517a3b2d2a4fe7cef0180`. Финальные коммиты после `cb40e15` только обновляют unit/PostgreSQL/Chromium ожидания для Settings Google-only proof flow и новых закрытых attempt values, сохраняя проверки запрета неподтверждённой смены и неизвестных операций.

- [CI #45726094032](https://github.com/iliya1947/vico-forum/actions/runs/45726094032) PASS: checks и database, включая PostgreSQL 17, manifest/privilege probes, build и Worker smoke.
- 15/15 применимых connected workflows PASS, включая [Worker Chromium AUTH-02b/03 #45726100332](https://github.com/iliya1947/vico-forum/actions/runs/45726100332) с реальными reset/create через fake mail и [AP-10 #45726100472](https://github.com/iliya1947/vico-forum/actions/runs/45726100472) со всеми Settings jobs.
- Локальный focused прогон дал 94 unit/component и 109 PostgreSQL PASS. Исправленные Settings и attempt telemetry проверки прошли отдельно, SET-05 Chromium прошёл на финальном SHA. В более раннем полном локальном прогоне падали два набора; отдельно с `TZ=UTC` прошли все 49 тестов этих наборов. Полный exact-head PostgreSQL suite в GitHub Actions PASS.
- Сверен bounded contract: guest neutral acknowledgement, неподтверждённые и Google-only не восстанавливают credential через guest flow, доказательство привязано к purpose/subject/generation, own creation также к текущей fresh session. Native 1.7.7 hash и limiter сохранены. Жизненный цикл пароля, proof и удаление сессий используют один owner и атомарный commit; проверены rollback и concurrent reset против sign-in/change-password. Отсутствие новых сессий при reset, сохранение текущей own-сессии при создании и отсутствие Google unlink подтверждены. Наблюдения и migration входят в bounded scope. Реальные внешние ресурсы не использовались.

Stable head передан Мире для coordinator checkpoint. AUTH-04 ждёт coordinator PASS.


## Coordinator checkpoint Миры — HOLD

Проверен stable exact head `ce75ff3629a4adae9941703a33f6d0366bd7f570` против root `PLAN.md`, `stages/AUTH-03/PLAN.md`, accepted AUTH-02b base и текущих SET-05/AuthLifecycle boundaries. CI #45726094032 и 15/15 applicable connected workflows PASS использованы только как supporting evidence.

### 1. Security: успешный SET-05 change-password не инвалидирует pending recovery

`credentialChangePassword()` добавил transaction/lock serialization с recovery, но successful native change-password не вызывает lifecycle invalidation. Root PLAN требует после password/credential change инвалидировать старые recovery/password-create operations и в конкурирующих terminal flows делать второй operation stale.

Текущие tests покрывают reset-first: старый password-change после reset denied. Change-first обратный порядок не покрыт и по коду оставляет уже выданный password-reset proof current. Такой proof затем может успешно заменить только что установленный пароль и отозвать target sessions.

Классификация: **current-scope security defect; blocking**.

### 2. Architecture: recovery-token implementation противоречит accepted root PLAN

Root PLAN требует для reset переиспользовать native Better Auth random token / verification storage, связать его с Vico state и использовать supported hashed reset-token identifier storage. Exact Better Auth 1.7.7 tagged source повторно подтверждает native contract: request создаёт random `reset-password:<token>` verification value; terminal consumes single-use verification row.

#392 вместо этого использует собственный signed JWT `signCredentialProof()` и deterministic Vico lifecycle row; native reset issuance/storage не используется. Stage AUTH-03 PLAN не объявлял supersede этого root architecture.

Классификация: **plan ↔ implementation contradiction; blocking**. Сначала Лёва как technical lead должен определить, исправляется implementation по принятому PLAN или требуется обоснованная correction самого PLAN. Patch поверх неразрешённого противоречия не принимать.

### 3. Observability: реальные AUTH-03 mail producers не отражены в принятом contract

`credential-lifecycle-endpoints.deliver()` отправляет `password-reset/password-create` mail через общий auth-mail runtime, но не создаёт `integration.authMailOutcome`. `operational-facts.ts` и Integrations projection по-прежнему ограничены `mailPurpose: "email-verification"` / `verificationMail`.

Root PLAN требует retained mail outcome по фактическому purpose/provider/outcome при появлении producer. Дополнительно новый `auth.passwordChanged` context кодирует только optional `reset`; existing SET-05 password-change producer не получает предусмотренный closed context `change`.

Классификация: **current-scope observability contract defect; blocking**.

### Остальной coordinator review

Проверены neutral guest recovery, active/verified/credential eligibility, AccountState-first locking, token subject/generation/session binding, password-create fresh-session checks, shared transaction/budgets, atomic password+session effects, no-auto-session reset, Google preservation, direct/HTTP paths, sensitive fragment/body handling, migration 0076/attempt values и отсутствие AUTH-04 expansion. Дополнительных confirmed current-scope blockers не установлено.

### Следующий этап

Лёва сначала reconciles recovery-token architecture с accepted PLAN. Затем одним coherent correction package закрывает все findings, выполняет full AUTH-03 author self-check и applicable exact-head CI/acceptance. Новый head требует повторного coordinator checkpoint. AUTH-04 до PASS не начинается.

## Техническое согласование recovery-token model

Root PLAN сохраняется. Better Auth 1.7.7 использует 24-символьный случайный секрет, namespace `reset-password:`, значение userId в native verification и lookup по идентификатору. Его public adapter поддерживает `verification.storeIdentifier` с prefix override и SHA-256/base64url для `hashed`. Используем эту конфигурацию только для `reset-password:`, native crypto для генерации и native adapter для записи. Сам native handler создаёт credential при его отсутствии, поэтому canonical Vico handler продолжает проверять eligibility и выполнять атомарный terminal flow.

Native запись и Vico binding одного поколения создаются в одной транзакции. Vico binding хранит native row ID и digest, разрешение subject выполняется по точному hashed identifier. Под AccountState lock заново проверяются native row, current binding, email и DB-clock expiry. Удаление native row и binding, password write и revoke sessions коммитятся вместе. Доступ по plaintext fallback отсутствует. Замена поколения и SET-05 credential change очищают старые reset records под тем же lock. JWT остаётся только для собственного `password-create`. OAuth и другие native identifier namespaces сохраняют прежний режим хранения.

## Correction package по трём blocking findings

Draft #392 обновлён до `39c07e539a47b8a317b3a274132337a6dc61cfdf`. Исправлены opaque Better Auth reset storage и Vico binding, invalidation pending reset/create при успешной SET-05 смене, closed `change` fact context и retained mail outcomes по трём активным purposes. Legacy native redirect закрыт, поэтому canonical reset proof не переносится в query string. Реальные провайдеры остаются на паузе.

Локально: 69 выбранных unit/component, 49 PostgreSQL, focused lint и typecheck PASS. PostgreSQL доказал хешированный native идентификатор, replacement/expiry, блокировку reset при change-first и rollback при сбое session deletion. Worker/Chromium прошёл reset/create с fake mail и событиями обоих purposes. Exact-head CI и applicable acceptance запущены; AUTHOR PASS ожидает их завершения.

### Повторный author self-check

**AUTHOR PASS** на `39c07e539a47b8a317b3a274132337a6dc61cfdf`. [CI #45730609055](https://github.com/iliya1947/vico-forum/actions/runs/45730609055) и 16/16 применимых acceptance workflows PASS, включая [Worker/Chromium AUTH-02b/03](https://github.com/iliya1947/vico-forum/actions/runs/45730614967) и [AP-10](https://github.com/iliya1947/vico-forum/actions/runs/45730614955).

Повторно сверены три причины HOLD и остальной AUTH-03: shared budgets и neutral guest acknowledgement, PostgreSQL native hashed reset identifier и текущий Vico binding, одноразовый consume и rollback, SET-05 change-first/reset-first, обе session policies, privacy и mail outcome projections. Root PLAN сохранён. Настоящие внешние ресурсы не использовались. Stable head #392 передан Мире на повторный checkpoint; AUTH-04 ждёт coordinator PASS.


## Повторный coordinator checkpoint Миры — PASS

Проверен stable exact head `39c07e539a47b8a317b3a274132337a6dc61cfdf` относительно предыдущего HOLD head `ce75ff3629a4adae9941703a33f6d0366bd7f570`, accepted root PLAN, AUTH-03 stage contract и AUTH-02b base.

### Закрытие finding 1 — change-password / recovery invalidation

`credentialChangePassword()` теперь после успешного canonical Better Auth change-password в том же lifecycle transaction инвалидирует pending `password-reset/password-create`. Failure invalidation откатывает и password mutation/evidence. PostgreSQL race regression проверяет change-first против already-issued reset; прежний reset-first regression сохраняется. Старый proof после committed change больше не может перезаписать новый пароль.

### Закрытие finding 2 — recovery-token architecture

Root PLAN **не изменён**. Correction использует:
1. Better Auth 1.7.7 public crypto для opaque 24-character reset secret;
2. exact-version `verification.storeIdentifier` override только для `reset-password:` со strategy `hashed`;
3. native internalAdapter verification creation с userId value и DB-clock expiry;
4. Vico deterministic current-generation state, связанный с immutable subject/current email/token digest/native row ID;
5. manual terminal resolution только hashed native identifier; plaintext fallback не используется canonical Vico reset path;
6. native legacy reset callback override закрыт, token не переносится в query;
7. Vico binding consume + exact native row delete + password update + conflicting-state invalidation + target-session revocation находятся в одном lifecycle transaction.

Exact Better Auth 1.7.7 tagged source повторно сверён: built-in `hashed` strategy — SHA-256 полного prefixed identifier → base64url без padding; prefix override применяется до storage processing. Реализация вычисляет тот же identifier для authoritative terminal lookup.

### Закрытие finding 3 — AUTH-03 observability

1. Общий post-commit mail delivery recorder теперь сохраняет bounded `integration.authMailOutcome` для closed purposes `email-verification/password-reset/password-create`.
2. Reset/create mail producers используют этот recorder; raw recipient/token/URL/provider error не записываются.
3. Integrations/History projections понимают три current purposes и сохраняют отдельный latest retained outcome по каждому.
4. Existing SET-05 password change пишет `auth.passwordChanged context="change"`; recovery reset — `context="reset"`. Actor invariant остаётся own actor для change и guest/null для reset.
5. Recording остаётся best-effort и не меняет auth outcome.

### Остальной повторный review

Correction delta не расширяет AUTH-03 в email change/unlink/AUTH-04 и не активирует внешние providers. Перепроверены neutral forgot behavior, native/Vico replacement и expiry, current subject/email/generation binding, AccountState lock, atomic rollback, all-target reset revocation, Google-only fresh-session creation, initiating-session preservation, direct/HTTP endpoint replacement, shared budgets, sensitive fragment/body transport и accepted AUTH-02b verification mail behavior после вынесения общего mail recorder.

Дополнительных confirmed current-scope blocking defects не установлено.

### Exact-head evidence

1. CI #45730609055 — PASS на exact head.
2. 16/16 applicable connected workflows — PASS.
3. AUTH-02b/03 Worker Chromium #45730614967 — PASS, включая reset/create и retained credential mail outcomes.
4. AP-10 #45730614955 — PASS.
5. PostgreSQL correction regressions включают hashed native identifier, replacement/expiry, SET-05 change-first/reset-first и rollback.

Checks являются supporting evidence после code/contract review, а не самостоятельным основанием PASS.

**Confirmed current-scope blocking defects: 0. COORDINATOR PASS.**

AUTH-03 остаётся intermediate stacked PR без merge/independent intermediate review. PASS разрешает отдельную активацию AUTH-04; по прямому решению владельца её реализует Лёва.
